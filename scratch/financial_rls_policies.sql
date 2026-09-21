-- Enable RLS
ALTER TABLE public.financial_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_incidents ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own financial operations
CREATE POLICY "Users can view their own financial operations"
ON public.financial_operations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view everything (assuming you have an admin check function, or you can rely on service role)
-- The Next.js API uses the service_role key, which bypasses RLS entirely.
-- We don't need policies for journal_entries, provider_events, settings, or incidents 
-- because they are only accessed via RPCs (SECURITY DEFINER) or the backend service role.
