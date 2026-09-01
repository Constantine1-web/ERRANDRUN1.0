-- Add delivery PIN and photo URLs
ALTER TABLE public.errands 
ADD COLUMN IF NOT EXISTS delivery_pin TEXT,
ADD COLUMN IF NOT EXISTS dropoff_photo_url TEXT,
ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;

-- Update the check constraint for status to include 'disputed'
-- Postgres requires dropping and recreating check constraints
ALTER TABLE public.errands DROP CONSTRAINT IF EXISTS errands_status_check;
ALTER TABLE public.errands ADD CONSTRAINT errands_status_check 
CHECK (status IN ('payment_pending', 'unassigned', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed'));

-- Set default value for new columns if necessary (though NULL is fine for PIN until assigned)
