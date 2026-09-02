-- Add Bank Details to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(100);

-- Create Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    errand_id UUID REFERENCES public.errands(id) ON DELETE CASCADE,
    rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ratee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for Ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings" 
ON public.ratings FOR SELECT 
USING (true);

CREATE POLICY "Users can create ratings for their errands" 
ON public.ratings FOR INSERT 
WITH CHECK (auth.uid() = rater_id);
