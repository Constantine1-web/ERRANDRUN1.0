-- Runner financial metrics and profile enrichment migration
-- Idempotent schema updates for Supabase/Postgres

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'requester',
  ADD COLUMN IF NOT EXISTS runner_status text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS total_earned numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE IF EXISTS errands
  ADD COLUMN IF NOT EXISTS runner_fee numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS company_fee numeric(12,2) NOT NULL DEFAULT 0.00;

CREATE OR REPLACE FUNCTION public.fn_calculate_errand_fees()
RETURNS trigger AS $$
BEGIN
  IF NEW.total_fee IS NOT NULL THEN
    NEW.company_fee := ROUND(NEW.total_fee * 0.20, 2);
    NEW.runner_fee := ROUND(NEW.total_fee * 0.80, 2);
  ELSE
    NEW.company_fee := COALESCE(NEW.company_fee, 0.00);
    NEW.runner_fee := COALESCE(NEW.runner_fee, 0.00);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_errand_fees ON errands;
CREATE TRIGGER trg_calculate_errand_fees
BEFORE INSERT OR UPDATE OF total_fee ON errands
FOR EACH ROW
EXECUTE FUNCTION public.fn_calculate_errand_fees();
