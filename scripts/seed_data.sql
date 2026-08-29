-- SEED DATA FOR ERRANDRUN

-- Insert insurance plans
INSERT INTO public.insurance_plans (id, name, description, monthly_premium, coverage_amount, coverage_type, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Basic Coverage', 'Basic liability coverage for runners and users', 500, 50000, 'basic', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Standard Coverage', 'Standard coverage including theft and damage', 1500, 200000, 'standard', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Premium Plus', 'Comprehensive coverage with priority support', 3000, 500000, 'premium', true);

-- Insert default admin profile (you should replace with real auth user ID)
-- This is a placeholder; in production, create admins through your auth system
-- INSERT INTO public.profiles (id, full_name, student_id, phone_number, role, verification_status) VALUES
--   (uuid_nil(), 'Admin User', 'ADMIN001', '+2348000000000', 'admin', 'verified');
