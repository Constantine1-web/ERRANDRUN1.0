-- Phase G: Communications & Notification Engine Migration
-- Contains the Outbox table, Notification tracking, Guest Recipients, and Atomic Triggers

-- 1. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
    transactional_email_enabled BOOLEAN DEFAULT TRUE, -- Hardcoded to TRUE in engine, but stored for completeness
    transactional_in_app_enabled BOOLEAN DEFAULT TRUE,
    optional_email_enabled BOOLEAN DEFAULT TRUE,
    optional_in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GUEST RECIPIENTS
CREATE TABLE IF NOT EXISTS public.guest_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    errand_id UUID REFERENCES public.errands(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tracking_token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. NOTIFICATION OUTBOX (Durable Event Queue)
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    event_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    recipient_user_id UUID REFERENCES public.profiles(id),
    guest_recipient_id UUID REFERENCES public.guest_recipients(id),
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, RETRYING, DEAD_LETTER
    attempts INT DEFAULT 0,
    available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_retry_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(255),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_outbox_status_available ON public.notification_outbox(status, available_at);
CREATE INDEX idx_outbox_aggregate ON public.notification_outbox(aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_recipient ON public.notification_outbox(recipient_user_id);

-- 4. NOTIFICATIONS (In-App Source of Truth)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_user_id UUID REFERENCES public.profiles(id) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'INFORMATIONAL',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    action_url VARCHAR(255),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);

-- 5. DELIVERY LOGS
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    outbox_event_id UUID REFERENCES public.notification_outbox(event_id),
    recipient_user_id UUID REFERENCES public.profiles(id),
    guest_recipient_id UUID REFERENCES public.guest_recipients(id),
    channel VARCHAR(50) NOT NULL, -- EMAIL, IN_APP
    provider VARCHAR(50),
    status VARCHAR(50) NOT NULL, -- QUEUED, PROCESSING, SENT, DELIVERED, FAILED, RETRYING, SKIPPED
    provider_reference VARCHAR(255),
    failure_reason TEXT,
    attempts INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Ensure we don't send the exact same event+channel to the same recipient twice
CREATE UNIQUE INDEX idx_delivery_logs_idempotency ON public.delivery_logs(outbox_event_id, channel, recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_delivery_logs_idempotency_guest ON public.delivery_logs(outbox_event_id, channel, guest_recipient_id) WHERE guest_recipient_id IS NOT NULL;

-- 6. RPC FOR ATOMIC WORKER CLAIMS (Concurrency safe FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION claim_outbox_events(batch_size INT, worker_id VARCHAR, lease_interval INTERVAL)
RETURNS SETOF public.notification_outbox AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT event_id FROM public.notification_outbox
        WHERE status IN ('PENDING', 'RETRYING')
          AND (available_at <= NOW())
          AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT batch_size
    )
    UPDATE public.notification_outbox
    SET status = 'PROCESSING',
        locked_at = NOW(),
        locked_by = worker_id,
        lease_expires_at = NOW() + lease_interval,
        attempts = attempts + 1
    WHERE event_id IN (SELECT event_id FROM claimed)
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 7. ATOMIC DATABASE TRIGGERS FOR OUTBOX
-- Ensures 100% atomicity between authoritative state change and outbox event creation.

-- A) Errand State Changes
CREATE OR REPLACE FUNCTION trigger_errand_outbox()
RETURNS trigger AS $$
DECLARE
    idemp_key VARCHAR;
BEGIN
    IF NEW.status != OLD.status THEN
        idemp_key := 'errand_' || NEW.id || '_' || NEW.status || '_' || EXTRACT(EPOCH FROM NOW())::text;
        
        -- ACCEPTED
        IF NEW.status = 'accepted' THEN
            INSERT INTO public.notification_outbox (event_type, aggregate_type, aggregate_id, recipient_user_id, event_payload, idempotency_key)
            VALUES ('ERRAND_ACCEPTED', 'errand', NEW.id, NEW.requester_id, jsonb_build_object('errand_id', NEW.id, 'runner_id', NEW.runner_id, 'title', NEW.title), idemp_key);
            
            -- Revoke guest token if cancelled/failed/completed
        ELSIF NEW.status IN ('completed', 'cancelled', 'failed') THEN
            UPDATE public.guest_recipients SET is_revoked = TRUE WHERE errand_id = NEW.id;
            
            IF NEW.status = 'completed' THEN
                INSERT INTO public.notification_outbox (event_type, aggregate_type, aggregate_id, recipient_user_id, event_payload, idempotency_key)
                VALUES ('ERRAND_COMPLETED', 'errand', NEW.id, NEW.requester_id, jsonb_build_object('errand_id', NEW.id, 'runner_id', NEW.runner_id, 'title', NEW.title), idemp_key);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_errand_insert_outbox()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.notification_outbox (event_type, aggregate_type, aggregate_id, recipient_user_id, event_payload, idempotency_key)
    VALUES ('ERRAND_CREATED', 'errand', NEW.id, NEW.requester_id, jsonb_build_object('errand_id', NEW.id, 'title', NEW.title), 'errand_created_' || NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_errand_insert ON public.errands;
CREATE TRIGGER on_errand_insert
    AFTER INSERT ON public.errands
    FOR EACH ROW
    EXECUTE FUNCTION trigger_errand_insert_outbox();

DROP TRIGGER IF EXISTS on_errand_status_change ON public.errands;
CREATE TRIGGER on_errand_status_change
    AFTER UPDATE OF status ON public.errands
    FOR EACH ROW
    EXECUTE FUNCTION trigger_errand_outbox();

-- B) Guest Recipient Created RPC (Replaces trigger to allow passing raw_token to outbox)
CREATE OR REPLACE FUNCTION insert_guest_and_outbox(
    p_errand_id UUID, 
    p_name VARCHAR, 
    p_email VARCHAR, 
    p_phone VARCHAR, 
    p_raw_token VARCHAR, 
    p_hash VARCHAR, 
    p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE 
    v_guest_id UUID;
BEGIN
    INSERT INTO public.guest_recipients (errand_id, name, email, phone, tracking_token_hash, expires_at)
    VALUES (p_errand_id, p_name, p_email, p_phone, p_hash, p_expires_at)
    RETURNING id INTO v_guest_id;
    
    INSERT INTO public.notification_outbox (event_type, aggregate_type, aggregate_id, guest_recipient_id, event_payload, idempotency_key)
    VALUES ('GUEST_TRACKING_CREATED', 'errand', p_errand_id, v_guest_id, jsonb_build_object('errand_id', p_errand_id, 'guest_name', p_name, 'raw_token', p_raw_token), 'guest_created_' || v_guest_id);
    
    RETURN v_guest_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_guest_created ON public.guest_recipients;

-- 8. ROW LEVEL SECURITY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = recipient_user_id);
    
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = recipient_user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own preferences"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Rest of the tables are accessed server-side only via Service Role (Admin client)
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_recipients ENABLE ROW LEVEL SECURITY;
