-- Add strikes column to profiles for the warning system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strikes INTEGER DEFAULT 0;
