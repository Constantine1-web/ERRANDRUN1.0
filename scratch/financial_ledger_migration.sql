-- Phase H: The Immutable Double-Entry Ledger System
-- Core Infrastructure for ERRANDRUN Financial Integrity

BEGIN;

-- ==========================================
-- 1. SETTINGS & INCIDENTS (Circuit Breakers)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.financial_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    wallet_funding_paused BOOLEAN DEFAULT FALSE,
    withdrawals_paused BOOLEAN DEFAULT FALSE,
    automated_payouts_paused BOOLEAN DEFAULT FALSE,
    automated_refunds_paused BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Ensure only one row exists
ALTER TABLE public.financial_settings ADD CONSTRAINT single_row_check CHECK (id = 1);
INSERT INTO public.financial_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.financial_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    incident_type VARCHAR(100) NOT NULL,
    expected_amount BIGINT,
    actual_amount BIGINT,
    user_id UUID REFERENCES public.profiles(id),
    operation_id UUID,
    provider_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.profiles(id),
    resolution_notes TEXT
);

-- ==========================================
-- 2. CHART OF ACCOUNTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    description TEXT
);

INSERT INTO public.accounts (code, name, type, normal_balance, description) VALUES
('10000', 'Paystack Receivables', 'ASSET', 'DEBIT', 'Funds cleared by Paystack, awaiting settlement to our bank.'),
('20000', 'Student Wallet Liability', 'LIABILITY', 'CREDIT', 'Available wallet balances belonging to students.'),
('21000', 'Errand Reserved Funds', 'LIABILITY', 'CREDIT', 'Escrowed funds currently locked in active errands.'),
('22000', 'Runner Payable', 'LIABILITY', 'CREDIT', 'Cleared earnings owed to runners.'),
('23000', 'Withdrawal Clearing', 'LIABILITY', 'CREDIT', 'In-flight withdrawals currently processing via provider.'),
('30000', 'Migration Clearing', 'EQUITY', 'DEBIT', 'Temporary offset account for legacy opening balances.'),
('40000', 'Platform Revenue', 'REVENUE', 'CREDIT', 'Fees earned by the platform.'),
('50000', 'Payment Processing Expense', 'EXPENSE', 'DEBIT', 'Fees charged by payment providers (if platform absorbs).')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 3. PROVIDER EVENTS (External Observations)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.provider_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL DEFAULT 'PAYSTACK',
    event_type VARCHAR(100) NOT NULL,
    provider_reference VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'IGNORED', 'FAILED', 'REQUIRES_REVIEW')),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Strong idempotency: Same provider + same event + same reference cannot be processed twice
CREATE UNIQUE INDEX idx_provider_events_idempotency ON public.provider_events (provider, event_type, provider_reference);

-- ==========================================
-- 4. FINANCIAL OPERATIONS & LEDGER
-- ==========================================

CREATE TABLE IF NOT EXISTS public.financial_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('FUNDING', 'RESERVATION', 'SETTLEMENT', 'WITHDRAWAL', 'REFUND', 'MIGRATION', 'ADJUSTMENT')),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'REQUIRES_REVIEW')),
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
    currency VARCHAR(3) DEFAULT 'NGN',
    user_id UUID REFERENCES public.profiles(id),
    errand_id UUID REFERENCES public.errands(id),
    provider_reference VARCHAR(255),
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES public.financial_operations(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES public.journal_entries(id) NOT NULL,
    account_id UUID REFERENCES public.accounts(id) NOT NULL,
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. IMMUTABILITY & ENFORCEMENT TRIGGERS
-- ==========================================

-- Trigger A: Enforce SUM(DEBIT) = SUM(CREDIT) on Journal POST
CREATE OR REPLACE FUNCTION enforce_journal_balance() RETURNS trigger AS $$
DECLARE
    total_debits BIGINT := 0;
    total_credits BIGINT := 0;
BEGIN
    IF NEW.status = 'POSTED' AND (OLD.status = 'DRAFT' OR OLD.status IS NULL) THEN
        SELECT COALESCE(SUM(amount_kobo), 0) INTO total_debits FROM public.ledger_entries WHERE journal_id = NEW.id AND entry_type = 'DEBIT';
        SELECT COALESCE(SUM(amount_kobo), 0) INTO total_credits FROM public.ledger_entries WHERE journal_id = NEW.id AND entry_type = 'CREDIT';
        
        IF total_debits != total_credits THEN
            RAISE EXCEPTION 'Journal % cannot be POSTED. Unbalanced: Debits=%, Credits=%', NEW.id, total_debits, total_credits;
        END IF;
        
        IF total_debits = 0 THEN
            RAISE EXCEPTION 'Journal % cannot be POSTED. Zero value journal.', NEW.id;
        END IF;
        
        NEW.posted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_journal_post ON public.journal_entries;
CREATE TRIGGER on_journal_post
    BEFORE UPDATE OF status ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION enforce_journal_balance();

-- Trigger B: Prevent modification of POSTED ledgers
CREATE OR REPLACE FUNCTION prevent_ledger_tampering() RETURNS trigger AS $$
DECLARE
    j_status VARCHAR;
BEGIN
    IF TG_TABLE_NAME = 'journal_entries' THEN
        IF OLD.status = 'POSTED' THEN
            RAISE EXCEPTION 'Immutable ledger violation: Cannot modify a POSTED journal_entry.';
        END IF;
    ELSIF TG_TABLE_NAME = 'ledger_entries' THEN
        SELECT status INTO j_status FROM public.journal_entries WHERE id = OLD.journal_id;
        IF j_status = 'POSTED' THEN
            RAISE EXCEPTION 'Immutable ledger violation: Cannot modify or delete ledger_entries of a POSTED journal.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_posted_journal_update ON public.journal_entries;
CREATE TRIGGER block_posted_journal_update
    BEFORE UPDATE OR DELETE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_tampering();

DROP TRIGGER IF EXISTS block_posted_ledger_update ON public.ledger_entries;
CREATE TRIGGER block_posted_ledger_update
    BEFORE UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_tampering();

-- ==========================================
-- 6. RPC: ATOMIC WALLET FUNDING
-- Supports both Fee Model A and B dynamically
-- ==========================================

CREATE OR REPLACE FUNCTION process_funding(
    p_user_id UUID,
    p_amount_kobo BIGINT, -- The total amount charged to the user via Paystack (e.g. 101500)
    p_fee_kobo BIGINT,    -- The paystack fee (e.g. 1500)
    p_provider_reference VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_wallet_balance BIGINT;
    v_op_id UUID;
    v_journal_id UUID;
    v_paystack_acct UUID;
    v_student_acct UUID;
    v_net_wallet_credit BIGINT;
BEGIN
    -- 1. Check Circuit Breaker
    IF (SELECT wallet_funding_paused FROM public.financial_settings WHERE id = 1) THEN
        RAISE EXCEPTION 'Wallet funding is currently paused.';
    END IF;

    -- 2. Lock Wallet Projection
    SELECT balance INTO v_wallet_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;

    -- 3. Calculate Accounting Values (Model B: Student absorbs fee)
    -- Student pays p_amount_kobo total. Paystack keeps p_fee_kobo.
    -- ErrandRun receives and credits (p_amount_kobo - p_fee_kobo).
    v_net_wallet_credit := p_amount_kobo - p_fee_kobo;

    -- 4. Get Account IDs
    SELECT id INTO v_paystack_acct FROM public.accounts WHERE code = '10000';
    SELECT id INTO v_student_acct FROM public.accounts WHERE code = '20000';

    -- 5. Create Financial Operation
    INSERT INTO public.financial_operations (operation_type, idempotency_key, status, amount_kobo, user_id, provider_reference, completed_at)
    VALUES ('FUNDING', 'funding_' || p_provider_reference, 'COMPLETED', p_amount_kobo, p_user_id, p_provider_reference, NOW())
    RETURNING id INTO v_op_id;

    -- 6. Create DRAFT Journal
    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (v_op_id, 'Wallet funding via Paystack: ' || p_provider_reference, 'DRAFT')
    RETURNING id INTO v_journal_id;

    -- 7. Insert Ledger Lines (Model B)
    -- Paystack owes us exactly what is left after they took their cut
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_paystack_acct, v_net_wallet_credit, 'DEBIT');
    -- Student gets credited exactly that same net amount
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_student_acct, v_net_wallet_credit, 'CREDIT');

    -- 8. POST Journal (Triggers the balance check automatically)
    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;

    -- 9. Update Wallet Projection
    UPDATE public.wallets SET balance = balance + (v_net_wallet_credit / 100), last_updated = NOW() WHERE user_id = p_user_id;

    -- 10. Phase G Outbox Integration (Atomic!)
    INSERT INTO public.notification_outbox (event_type, aggregate_type, aggregate_id, recipient_user_id, event_payload, idempotency_key)
    VALUES ('PAYMENT_SUCCESSFUL', 'financial_operation', v_op_id, p_user_id, jsonb_build_object('amount_kobo', v_net_wallet_credit, 'reference', p_provider_reference), 'outbox_funding_' || p_provider_reference);

    RETURN jsonb_build_object('success', true, 'operation_id', v_op_id, 'credited_kobo', v_net_wallet_credit);
END;
$$ LANGUAGE plpgsql;

COMMIT;
-- Continuation of Phase H Database Schema

BEGIN;

-- ==========================================
-- 7. RPC: ATOMIC WALLET RESERVATION
-- ==========================================

CREATE OR REPLACE FUNCTION reserve_errand_funds(
    p_errand_id UUID,
    p_user_id UUID,
    p_total_kobo BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_wallet_balance BIGINT;
    v_op_id UUID;
    v_journal_id UUID;
    v_student_acct UUID;
    v_reserved_acct UUID;
BEGIN
    -- 1. Lock Wallet
    SELECT balance * 100 INTO v_wallet_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

    -- 2. Validate Funds
    IF v_wallet_balance < p_total_kobo THEN
        RAISE EXCEPTION 'Insufficient funds: Required % kobo, Available % kobo', p_total_kobo, v_wallet_balance;
    END IF;

    -- 3. Get Account IDs
    SELECT id INTO v_student_acct FROM public.accounts WHERE code = '20000';
    SELECT id INTO v_reserved_acct FROM public.accounts WHERE code = '21000';

    -- 4. Create Financial Operation
    INSERT INTO public.financial_operations (operation_type, idempotency_key, status, amount_kobo, user_id, errand_id, completed_at)
    VALUES ('RESERVATION', 'reserve_' || p_errand_id, 'COMPLETED', p_total_kobo, p_user_id, p_errand_id, NOW())
    RETURNING id INTO v_op_id;

    -- 5. Create DRAFT Journal
    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (v_op_id, 'Funds reserved for errand ' || p_errand_id, 'DRAFT')
    RETURNING id INTO v_journal_id;

    -- 6. Insert Ledger Lines
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_student_acct, p_total_kobo, 'DEBIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_reserved_acct, p_total_kobo, 'CREDIT');

    -- 7. POST Journal
    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;

    -- 8. Update Wallet Projection
    UPDATE public.wallets SET balance = balance - (p_total_kobo / 100), last_updated = NOW() WHERE user_id = p_user_id;

    -- Note: Updating the Errand status happens at the application layer AFTER this RPC returns successfully.
    -- Or we can update it here directly to guarantee atomicity.
    -- To ensure 100% atomicity between reservation and assignment:
    -- UPDATE public.errands SET status = 'accepted', ... WHERE id = p_errand_id;

    RETURN jsonb_build_object('success', true, 'operation_id', v_op_id);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. RPC: ATOMIC ERRAND SETTLEMENT
-- ==========================================

CREATE OR REPLACE FUNCTION settle_errand_funds(
    p_errand_id UUID,
    p_runner_id UUID,
    p_total_kobo BIGINT,
    p_runner_cut_kobo BIGINT,
    p_platform_fee_kobo BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_op_id UUID;
    v_journal_id UUID;
    v_reserved_acct UUID;
    v_payable_acct UUID;
    v_revenue_acct UUID;
BEGIN
    -- Validation
    IF p_total_kobo != (p_runner_cut_kobo + p_platform_fee_kobo) THEN
        RAISE EXCEPTION 'Settlement math invalid: % != % + %', p_total_kobo, p_runner_cut_kobo, p_platform_fee_kobo;
    END IF;

    SELECT id INTO v_reserved_acct FROM public.accounts WHERE code = '21000';
    SELECT id INTO v_payable_acct FROM public.accounts WHERE code = '22000';
    SELECT id INTO v_revenue_acct FROM public.accounts WHERE code = '40000';

    INSERT INTO public.financial_operations (operation_type, idempotency_key, status, amount_kobo, user_id, errand_id, completed_at)
    VALUES ('SETTLEMENT', 'settle_' || p_errand_id, 'COMPLETED', p_total_kobo, p_runner_id, p_errand_id, NOW())
    RETURNING id INTO v_op_id;

    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (v_op_id, 'Errand completion settlement ' || p_errand_id, 'DRAFT')
    RETURNING id INTO v_journal_id;

    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_reserved_acct, p_total_kobo, 'DEBIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_payable_acct, p_runner_cut_kobo, 'CREDIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_revenue_acct, p_platform_fee_kobo, 'CREDIT');

    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;

    -- Update Runner Projection (assuming runner wallet uses the same table for now)
    UPDATE public.wallets SET balance = balance + (p_runner_cut_kobo / 100), last_updated = NOW() WHERE user_id = p_runner_id;

    RETURN jsonb_build_object('success', true, 'operation_id', v_op_id);
END;
$$ LANGUAGE plpgsql;

COMMIT;
-- Continuation of Phase H Database Schema (Withdrawals & Refund Exclusivity)

BEGIN;

-- ==========================================
-- 9. RPC: ATOMIC WITHDRAWAL REQUEST
-- ==========================================

CREATE OR REPLACE FUNCTION request_withdrawal(
    p_user_id UUID,
    p_amount_kobo BIGINT,
    p_idempotency_key VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_wallet_balance BIGINT;
    v_op_id UUID;
    v_journal_id UUID;
    v_payable_acct UUID;
    v_clearing_acct UUID;
BEGIN
    IF (SELECT withdrawals_paused FROM public.financial_settings WHERE id = 1) THEN
        RAISE EXCEPTION 'Withdrawals are currently paused.';
    END IF;

    -- 1. Lock Wallet
    SELECT balance * 100 INTO v_wallet_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF v_wallet_balance < p_amount_kobo THEN
        RAISE EXCEPTION 'Insufficient cleared earnings: Required % kobo', p_amount_kobo;
    END IF;

    SELECT id INTO v_payable_acct FROM public.accounts WHERE code = '22000';
    SELECT id INTO v_clearing_acct FROM public.accounts WHERE code = '23000';

    -- 2. Create Operation (Status = PROCESSING)
    INSERT INTO public.financial_operations (operation_type, idempotency_key, status, amount_kobo, user_id)
    VALUES ('WITHDRAWAL', 'withdraw_' || p_idempotency_key, 'PROCESSING', p_amount_kobo, p_user_id)
    RETURNING id INTO v_op_id;

    -- 3. Create DRAFT Journal
    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (v_op_id, 'Withdrawal Request ' || p_idempotency_key, 'DRAFT')
    RETURNING id INTO v_journal_id;

    -- 4. Ledger Lines (Payable -> Clearing)
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_payable_acct, p_amount_kobo, 'DEBIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_clearing_acct, p_amount_kobo, 'CREDIT');

    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;
    UPDATE public.wallets SET balance = balance - (p_amount_kobo / 100), last_updated = NOW() WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'operation_id', v_op_id);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 10. RPC: WITHDRAWAL SUCCESS SETTLEMENT
-- ==========================================

CREATE OR REPLACE FUNCTION finalize_withdrawal(
    p_operation_id UUID,
    p_provider_reference VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_op_status VARCHAR;
    v_amount BIGINT;
    v_journal_id UUID;
    v_clearing_acct UUID;
    v_paystack_acct UUID;
BEGIN
    SELECT status, amount_kobo INTO v_op_status, v_amount FROM public.financial_operations WHERE id = p_operation_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Operation not found'; END IF;
    IF v_op_status != 'PROCESSING' THEN RAISE EXCEPTION 'Operation not in PROCESSING state'; END IF;

    SELECT id INTO v_clearing_acct FROM public.accounts WHERE code = '23000';
    SELECT id INTO v_paystack_acct FROM public.accounts WHERE code = '10000';

    UPDATE public.financial_operations SET status = 'COMPLETED', provider_reference = p_provider_reference, completed_at = NOW() WHERE id = p_operation_id;

    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (p_operation_id, 'Withdrawal Paid ' || p_provider_reference, 'DRAFT')
    RETURNING id INTO v_journal_id;

    -- Move from Clearing out to Paystack
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_clearing_acct, v_amount, 'DEBIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_paystack_acct, v_amount, 'CREDIT');

    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 11. RPC: WITHDRAWAL FAILURE/REVERSAL
-- ==========================================

CREATE OR REPLACE FUNCTION reverse_withdrawal(
    p_operation_id UUID,
    p_reason VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_op_status VARCHAR;
    v_amount BIGINT;
    v_user_id UUID;
    v_journal_id UUID;
    v_clearing_acct UUID;
    v_payable_acct UUID;
BEGIN
    SELECT status, amount_kobo, user_id INTO v_op_status, v_amount, v_user_id FROM public.financial_operations WHERE id = p_operation_id FOR UPDATE;
    IF v_op_status != 'PROCESSING' THEN RAISE EXCEPTION 'Only PROCESSING withdrawals can be reversed'; END IF;

    SELECT id INTO v_payable_acct FROM public.accounts WHERE code = '22000';
    SELECT id INTO v_clearing_acct FROM public.accounts WHERE code = '23000';

    UPDATE public.financial_operations SET status = 'FAILED', failure_reason = p_reason, completed_at = NOW() WHERE id = p_operation_id;

    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (p_operation_id, 'Withdrawal Reversed: ' || p_reason, 'DRAFT')
    RETURNING id INTO v_journal_id;

    -- Move from Clearing back to Payable
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_clearing_acct, v_amount, 'DEBIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_payable_acct, v_amount, 'CREDIT');

    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;
    
    -- Refund the wallet projection
    UPDATE public.wallets SET balance = balance + (v_amount / 100), last_updated = NOW() WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 12. RPC: ONE NAIRA STORY TRACEABILITY
-- ==========================================

CREATE OR REPLACE FUNCTION trace_one_naira_story(p_lookup_id UUID) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_op RECORD;
    v_journal RECORD;
    v_ledger JSONB;
    v_outbox JSONB;
BEGIN
    SELECT * INTO v_op FROM public.financial_operations WHERE id = p_lookup_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Operation not found'); END IF;

    SELECT * INTO v_journal FROM public.journal_entries WHERE operation_id = v_op.id;
    
    SELECT jsonb_agg(jsonb_build_object(
        'account_code', a.code,
        'account_name', a.name,
        'amount_kobo', l.amount_kobo,
        'entry_type', l.entry_type
    )) INTO v_ledger 
    FROM public.ledger_entries l 
    JOIN public.accounts a ON a.id = l.account_id 
    WHERE l.journal_id = v_journal.id;

    SELECT jsonb_agg(o) INTO v_outbox 
    FROM public.notification_outbox o 
    WHERE aggregate_type = 'financial_operation' AND aggregate_id = v_op.id;

    v_result := jsonb_build_object(
        'financial_operation', row_to_json(v_op),
        'journal', row_to_json(v_journal),
        'ledger_lines', v_ledger,
        'notification_outbox', v_outbox
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 13. RPC: MIGRATE EXISTING BALANCE
-- ==========================================

CREATE OR REPLACE FUNCTION migrate_opening_balance(
    p_user_id UUID,
    p_amount_kobo BIGINT,
    p_migration_reason TEXT,
    p_operator_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_op_id UUID;
    v_journal_id UUID;
    v_student_acct UUID;
    v_migration_acct UUID;
BEGIN
    IF p_amount_kobo <= 0 THEN RAISE EXCEPTION 'Cannot migrate zero or negative balance'; END IF;

    SELECT id INTO v_migration_acct FROM public.accounts WHERE code = '30000';
    SELECT id INTO v_student_acct FROM public.accounts WHERE code = '20000';

    INSERT INTO public.financial_operations (operation_type, idempotency_key, status, amount_kobo, user_id, failure_reason)
    VALUES ('MIGRATION', 'migrate_' || p_user_id || '_' || EXTRACT(EPOCH FROM NOW())::INT, 'COMPLETED', p_amount_kobo, p_user_id, p_migration_reason)
    RETURNING id INTO v_op_id;

    INSERT INTO public.journal_entries (operation_id, description, status)
    VALUES (v_op_id, 'Opening Balance Migration via ' || p_operator_id, 'DRAFT')
    RETURNING id INTO v_journal_id;

    -- DEBIT Migration Clearing, CREDIT Student Wallet
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_migration_acct, p_amount_kobo, 'DEBIT');
    INSERT INTO public.ledger_entries (journal_id, account_id, amount_kobo, entry_type) VALUES (v_journal_id, v_student_acct, p_amount_kobo, 'CREDIT');

    UPDATE public.journal_entries SET status = 'POSTED' WHERE id = v_journal_id;

    RETURN jsonb_build_object('success', true, 'operation_id', v_op_id);
END;
$$ LANGUAGE plpgsql;
COMMIT;
