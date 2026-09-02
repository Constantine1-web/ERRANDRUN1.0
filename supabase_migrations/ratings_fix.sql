ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS categories JSONB;
ALTER TABLE public.ratings ADD CONSTRAINT unique_errand_rater UNIQUE (errand_id, rater_id);
