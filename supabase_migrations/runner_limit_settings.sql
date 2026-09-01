-- Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access to platform_settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Insert default runner limit
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('runner_limit', '{"max_active_runners": 50, "dynamic_ratio_enabled": true, "users_per_runner": 5}')
ON CONFLICT (setting_key) DO NOTHING;
