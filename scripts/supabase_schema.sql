-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Core Identity)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'runner', 'admin')) DEFAULT 'user',
  avatar_url TEXT,
  bio TEXT,
  verification_status TEXT CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')) DEFAULT 'unverified',
  rating NUMERIC(3, 2) DEFAULT 0.0,
  total_ratings INTEGER DEFAULT 0,
  total_errands INTEGER DEFAULT 0,
  insurance_plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 2. RUNNER APPLICATIONS TABLE (Verification & Onboarding)
CREATE TABLE IF NOT EXISTS public.runner_apps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  reg_number TEXT NOT NULL,
  campus_record_checked BOOLEAN DEFAULT FALSE NOT NULL,
  transport_method TEXT CHECK (transport_method IN ('foot', 'bicycle', 'shuttle', 'motorcycle')) NOT NULL,
  availability_schedule JSONB NOT NULL,
  document_proof_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 3. INSURANCE PLANS TABLE
CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_premium NUMERIC(10, 2) NOT NULL,
  coverage_amount NUMERIC(12, 2) NOT NULL,
  coverage_type TEXT CHECK (coverage_type IN ('basic', 'standard', 'premium')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 4. USER INSURANCE TABLE
CREATE TABLE IF NOT EXISTS public.user_insurance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  insurance_plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE RESTRICT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended', 'expired')) DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  premium_paid NUMERIC(10, 2) NOT NULL,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  claims_filed INTEGER DEFAULT 0,
  claims_approved INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, insurance_plan_id)
);

-- 5. ERRANDS TABLE (Core Transaction Lifecycle)
CREATE TABLE IF NOT EXISTS public.errands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  runner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('academic', 'food_delivery', 'campus_errand', 'personal', 'custom')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  pickup_coordinates JSONB,
  delivery_coordinates JSONB,
  base_fee NUMERIC(10, 2) NOT NULL,
  distance_surcharge NUMERIC(10, 2) DEFAULT 0.0,
  queue_complexity_fee NUMERIC(10, 2) DEFAULT 0.0,
  weather_surge NUMERIC(10, 2) DEFAULT 0.0,
  urgency_multiplier NUMERIC(3, 2) DEFAULT 1.00,
  total_fee NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL,
  runner_amount NUMERIC(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('payment_pending', 'unassigned', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed')) DEFAULT 'unassigned' NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  delivery_pin TEXT,
  dropoff_photo_url TEXT,
  pickup_photo_url TEXT,
  estimated_completion_time TIMESTAMP WITH TIME ZONE,
  actual_completion_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 6. ERRAND TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.errand_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  errand_id UUID REFERENCES public.errands(id) ON DELETE CASCADE NOT NULL,
  status_update TEXT NOT NULL,
  current_location JSONB,
  runner_notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(errand_id, timestamp)
);

-- 7. RATINGS & REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  errand_id UUID REFERENCES public.errands(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  ratee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  categories JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(errand_id, rater_id)
);

-- 8. DISPUTES TABLE
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  errand_id UUID REFERENCES public.errands(id) ON DELETE CASCADE NOT NULL,
  initiator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  respondent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'under_review', 'resolved', 'closed')) DEFAULT 'open',
  resolution_type TEXT CHECK (resolution_type IN ('refund', 'partial_refund', 'no_action', 'compensation')),
  resolution_amount NUMERIC(10, 2),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 9. SESSIONS LOG TABLE (Performance & Analytics)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL,
  logout_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 10. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  errand_id UUID REFERENCES public.errands(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('paystack', 'wallet', 'bank_transfer')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  reference TEXT UNIQUE,
  paystack_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 11. WALLET TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance NUMERIC(12, 2) DEFAULT 0.0,
  total_earned NUMERIC(12, 2) DEFAULT 0.0,
  total_spent NUMERIC(12, 2) DEFAULT 0.0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 12. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  balance_after NUMERIC(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 13. TASK MATCHING PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.task_matching_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  runner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  preferred_categories TEXT[],
  max_distance_km NUMERIC(5, 2),
  preferred_time_slots JSONB,
  acceptance_rate NUMERIC(3, 2),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  UNIQUE(runner_id)
);

-- 14. TASK HISTORY TABLE (Smart Matching)
CREATE TABLE IF NOT EXISTS public.task_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  runner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  errand_id UUID REFERENCES public.errands(id) ON DELETE CASCADE NOT NULL,
  completion_time_minutes INTEGER,
  rating_received NUMERIC(3, 2),
  acceptance_status TEXT CHECK (acceptance_status IN ('accepted', 'declined', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_runner_apps_status ON public.runner_apps(status);
CREATE INDEX IF NOT EXISTS idx_errands_requester_id ON public.errands(requester_id);
CREATE INDEX IF NOT EXISTS idx_errands_runner_id ON public.errands(runner_id);
CREATE INDEX IF NOT EXISTS idx_errands_status ON public.errands(status);
CREATE INDEX IF NOT EXISTS idx_errands_created_at ON public.errands(created_at);
CREATE INDEX IF NOT EXISTS idx_errand_tracking_errand_id ON public.errand_tracking(errand_id);
CREATE INDEX IF NOT EXISTS idx_ratings_errand_id ON public.ratings(errand_id);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id ON public.ratings(ratee_id);
CREATE INDEX IF NOT EXISTS idx_disputes_errand_id ON public.disputes(errand_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_insurance_user_id ON public.user_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insurance_status ON public.user_insurance(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runner_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;


-- 15. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to platform_settings" ON public.platform_settings FOR SELECT USING (true);

INSERT INTO public.platform_settings (setting_key, setting_value) VALUES ('runner_limit', '{"max_active_runners": 50, "dynamic_ratio_enabled": true, "users_per_runner": 5}') ON CONFLICT (setting_key) DO NOTHING;

