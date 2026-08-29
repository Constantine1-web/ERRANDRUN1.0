-- ROW LEVEL SECURITY POLICIES

-- PROFILES RLS POLICIES
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RUNNER_APPS RLS POLICIES
CREATE POLICY "Admins can view all runner applications" ON public.runner_apps
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can view their own application" ON public.runner_apps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own runner application" ON public.runner_apps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own runner application" ON public.runner_apps
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- ERRANDS RLS POLICIES
CREATE POLICY "Users can view their own errands" ON public.errands
  FOR SELECT USING (
    auth.uid() = requester_id 
    OR auth.uid() = runner_id
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Users can create errands" ON public.errands
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their errands" ON public.errands
  FOR UPDATE USING (
    auth.uid() = requester_id 
    OR auth.uid() = runner_id
  );

-- ERRAND_TRACKING RLS POLICIES
CREATE POLICY "Users can view tracking for their errands" ON public.errand_tracking
  FOR SELECT USING (
    auth.uid() IN (
      SELECT requester_id FROM public.errands WHERE id = errand_id
      UNION
      SELECT runner_id FROM public.errands WHERE id = errand_id
    )
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Runners can update tracking" ON public.errand_tracking
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT runner_id FROM public.errands WHERE id = errand_id
    )
  );

-- RATINGS RLS POLICIES
CREATE POLICY "Users can view ratings" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can create ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- DISPUTES RLS POLICIES
CREATE POLICY "Users can view their disputes" ON public.disputes
  FOR SELECT USING (
    auth.uid() = initiator_id 
    OR auth.uid() = respondent_id
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = initiator_id);

-- SESSIONS RLS POLICIES
CREATE POLICY "Users can view their own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- PAYMENTS RLS POLICIES
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Users can insert their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- WALLETS RLS POLICIES
CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update wallets" ON public.wallets
  FOR UPDATE USING (true);

-- WALLET_TRANSACTIONS RLS POLICIES
CREATE POLICY "Users can view their wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.wallets WHERE id = wallet_id
    )
  );

CREATE POLICY "System can insert wallet transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (true);

-- USER_INSURANCE RLS POLICIES
CREATE POLICY "Users can view their own insurance" ON public.user_insurance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insurance" ON public.user_insurance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insurance" ON public.user_insurance
  FOR UPDATE USING (auth.uid() = user_id);

-- TASK_MATCHING_PREFERENCES RLS POLICIES
CREATE POLICY "Runners can view their preferences" ON public.task_matching_preferences
  FOR SELECT USING (auth.uid() = runner_id);

CREATE POLICY "Runners can update their preferences" ON public.task_matching_preferences
  FOR UPDATE USING (auth.uid() = runner_id);

-- INSURANCE_PLANS RLS POLICIES
CREATE POLICY "Everyone can view insurance plans" ON public.insurance_plans
  FOR SELECT USING (true);

-- TASK_HISTORY RLS POLICIES
CREATE POLICY "Runners can view their task history" ON public.task_history
  FOR SELECT USING (auth.uid() = runner_id);

CREATE POLICY "System can insert task history" ON public.task_history
  FOR INSERT WITH CHECK (true);
