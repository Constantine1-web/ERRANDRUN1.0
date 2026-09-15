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
