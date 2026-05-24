-- ============================================
-- Referral Ninja Database Schema - FIXED VERSION
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  legal_name TEXT NOT NULL DEFAULT 'New User',
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  phone_number TEXT NOT NULL DEFAULT '254700000000',
  avatar_url TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  password_reset_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on email allowing NULL values
CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles(email) WHERE email IS NOT NULL;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('remote', 'local_intern', 'local_job')),
  website_link TEXT,
  images TEXT[] DEFAULT '{}',
  click_count INTEGER DEFAULT 0,
  posted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Task clicks tracking
CREATE TABLE public.task_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Mafullu content table
CREATE TABLE public.mafullu_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mafullu purchases
CREATE TABLE public.mafullu_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.mafullu_content(id) ON DELETE CASCADE,
  amount INTEGER DEFAULT 300,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals tracking
CREATE TABLE public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  earned_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id)
);

-- Payments table
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('registration', 'mafullu', 'withdrawal')),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  mpesa_receipt TEXT,
  phone_number TEXT,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE public.withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  verification_code TEXT,
  phone_number TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Password reset tracking
CREATE TABLE public.password_resets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reset_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE public.admin_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_tasks_is_active ON public.tasks(is_active);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX idx_task_clicks_user_id ON public.task_clicks(user_id);
CREATE INDEX idx_task_clicks_task_id ON public.task_clicks(task_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_payment_type ON public.payments(payment_type);
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_password_resets_user_id ON public.password_resets(user_id);
CREATE INDEX idx_password_resets_expires_at ON public.password_resets(expires_at);
CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX idx_mafullu_purchases_user_id ON public.mafullu_purchases(user_id);
CREATE INDEX idx_mafullu_purchases_content_id ON public.mafullu_purchases(content_id);
CREATE INDEX idx_mafullu_content_created_at ON public.mafullu_content(created_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mafullu_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mafullu_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Admin helper function - checks current user's admin flag
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT is_admin INTO result
  FROM public.profiles
  WHERE id = p_user_id;
  RETURN COALESCE(result, FALSE);
END;
$$;

-- Authentication requirement helper function
CREATE OR REPLACE FUNCTION public.require_authenticated_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: RPC requires authenticated user';
  END IF;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete all profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- TASKS POLICIES
DROP POLICY IF EXISTS "Anyone can view active tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can increment task clicks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

CREATE POLICY "Anyone can view active tasks"
  ON public.tasks FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Authenticated users can increment task clicks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_active = TRUE)
  WITH CHECK (is_active = TRUE);

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- TASK CLICKS POLICIES
DROP POLICY IF EXISTS "Users can view own task clicks" ON public.task_clicks;
DROP POLICY IF EXISTS "Users can create own task clicks" ON public.task_clicks;
DROP POLICY IF EXISTS "Admins can view all task clicks" ON public.task_clicks;
DROP POLICY IF EXISTS "Admins can delete task clicks" ON public.task_clicks;

CREATE POLICY "Users can view own task clicks"
  ON public.task_clicks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own task clicks"
  ON public.task_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all task clicks"
  ON public.task_clicks FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete task clicks"
  ON public.task_clicks FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- MAFULLU CONTENT POLICIES
DROP POLICY IF EXISTS "Anyone can view available mafullu content" ON public.mafullu_content;
DROP POLICY IF EXISTS "Users can view purchased mafullu content" ON public.mafullu_content;
DROP POLICY IF EXISTS "Admins can view all mafullu content" ON public.mafullu_content;
DROP POLICY IF EXISTS "Admins can insert mafullu content" ON public.mafullu_content;
DROP POLICY IF EXISTS "Admins can update mafullu content" ON public.mafullu_content;
DROP POLICY IF EXISTS "Admins can delete mafullu content" ON public.mafullu_content;

CREATE POLICY "Anyone can view available mafullu content"
  ON public.mafullu_content FOR SELECT
  USING (is_purchased = FALSE);

CREATE POLICY "Users can view purchased mafullu content"
  ON public.mafullu_content FOR SELECT
  USING (is_purchased = TRUE AND purchased_by = auth.uid());

CREATE POLICY "Admins can view all mafullu content"
  ON public.mafullu_content FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert mafullu content"
  ON public.mafullu_content FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update mafullu content"
  ON public.mafullu_content FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete mafullu content"
  ON public.mafullu_content FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- MAFULLU PURCHASES POLICIES
DROP POLICY IF EXISTS "Users can view own purchases" ON public.mafullu_purchases;
DROP POLICY IF EXISTS "Users can create own purchases" ON public.mafullu_purchases;
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.mafullu_purchases;
DROP POLICY IF EXISTS "Admins can delete purchases" ON public.mafullu_purchases;

CREATE POLICY "Users can view own purchases"
  ON public.mafullu_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own purchases"
  ON public.mafullu_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.mafullu_purchases FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete purchases"
  ON public.mafullu_purchases FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- REFERRALS POLICIES
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- WITHDRAWALS POLICIES
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can create own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Admins can delete withdrawals" ON public.withdrawals;

CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete withdrawals"
  ON public.withdrawals FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- PASSWORD RESETS POLICIES
DROP POLICY IF EXISTS "Users can view own password resets" ON public.password_resets;
DROP POLICY IF EXISTS "Users can create own password resets" ON public.password_resets;
DROP POLICY IF EXISTS "Users can update own password resets" ON public.password_resets;

CREATE POLICY "Users can view own password resets"
  ON public.password_resets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own password resets"
  ON public.password_resets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own password resets"
  ON public.password_resets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ADMIN LOGS POLICIES
DROP POLICY IF EXISTS "Admins can view all admin logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create admin logs" ON public.admin_logs;

CREATE POLICY "Admins can view all admin logs"
  ON public.admin_logs FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can create admin logs"
  ON public.admin_logs FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

-- ============================================
-- VIEWS
-- ============================================

-- View for user statistics (used in Dashboard, Referrals, Admin pages)
CREATE OR REPLACE VIEW public.user_stats_view
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.username,
  p.email,
  p.avatar_url,
  p.payment_status,
  p.joined_at,
  COUNT(DISTINCT r.id) as referral_count,
  COALESCE(SUM(r.earned_amount), 0) as total_earned,
  COUNT(DISTINCT tc.id) as task_clicks_count
FROM public.profiles p
LEFT JOIN public.referrals r ON p.id = r.referrer_id AND r.status = 'completed'
LEFT JOIN public.task_clicks tc ON p.id = tc.user_id
GROUP BY p.id, p.username, p.email, p.avatar_url, p.payment_status, p.joined_at;

ALTER VIEW public.user_stats_view SET (security_barrier = true);

-- Note: RLS policies on underlying tables (profiles, referrals, task_clicks)
-- will automatically apply when querying through this view

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to increment task click count
CREATE OR REPLACE FUNCTION public.increment_task_clicks(task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.require_authenticated_user();

  UPDATE public.tasks
  SET click_count = click_count + 1
  WHERE id = task_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_task_clicks(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_task_clicks(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_task_clicks(uuid) TO authenticated;

-- Function to increment password reset count
CREATE OR REPLACE FUNCTION public.increment_reset_count(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.require_authenticated_user();

  IF auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Unauthorized: reset count updates require matching user';
  END IF;

  UPDATE public.profiles
  SET password_reset_count = password_reset_count + 1
  WHERE id = user_id;
END;
$$;

-- Function to complete referral when payment is made
CREATE OR REPLACE FUNCTION public.complete_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.referrals
    SET 
      status = 'completed',
      earned_amount = 100,
      completed_at = NOW()
    WHERE referred_id = NEW.user_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_referral() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_referral() FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_referral() FROM authenticated;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  referral_code TEXT;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
  insert_attempts INTEGER := 0;
BEGIN
  -- Generate unique referral code with retry logic
  LOOP
    referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.referral_code = referral_code);
    counter := counter + 1;
    IF counter > 20 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 20 attempts';
    END IF;
  END LOOP;

  -- Generate unique username with retry logic
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8));
  final_username := base_username;
  counter := 0;

  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
    counter := counter + 1;
    final_username := base_username || '_' || counter;
    IF counter > 200 THEN
      RAISE EXCEPTION 'Could not generate unique username after 200 attempts';
    END IF;
  END LOOP;

  -- Insert profile with validated data
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id,
        legal_name,
        username,
        email,
        phone_number,
        referral_code,
        referred_by,
        is_admin,
        payment_status
      )
      VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'legal_name'), ''), 'New User'),
        final_username,
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''), '254700000000'),
        referral_code,
        (
          SELECT id
          FROM public.profiles
          WHERE referral_code = NULLIF(TRIM(NEW.raw_user_meta_data->>'referred_by'), '')
          LIMIT 1
        ),
        FALSE,
        'pending'
      );
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        insert_attempts := insert_attempts + 1;
        IF insert_attempts > 10 THEN
          final_username := base_username || '_' || uuid_generate_v4()::TEXT;
        ELSE
          final_username := base_username || '_' || insert_attempts;
        END IF;
        referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || NEW.id::TEXT || insert_attempts::TEXT) FROM 1 FOR 8));
    END;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating profile for new user: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- RPC Function: Setup user profile
CREATE OR REPLACE FUNCTION public.setup_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_phone_number TEXT,
  p_username TEXT,
  p_legal_name TEXT,
  p_referral_code TEXT,
  p_referred_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result JSON;
  referrer_id UUID;
BEGIN
  PERFORM public.require_authenticated_user();

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: profile updates require matching user'
    );
  END IF;

  -- Resolve referral code to referrer UUID if needed
  IF p_referred_by IS NOT NULL AND p_referred_by != '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = p_referred_by
    LIMIT 1;

    IF referrer_id IS NULL THEN
      BEGIN
        referrer_id := p_referred_by::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
        referrer_id := NULL;
      END;
    END IF;
  END IF;

  -- Update profile with additional data (already created by trigger)
  UPDATE public.profiles
  SET
    legal_name = COALESCE(NULLIF(TRIM(p_legal_name), ''), legal_name),
    username = COALESCE(NULLIF(TRIM(p_username), ''), username),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    phone_number = COALESCE(NULLIF(TRIM(p_phone_number), ''), phone_number),
    referral_code = COALESCE(NULLIF(TRIM(p_referral_code), ''), referral_code),
    referred_by = COALESCE(referrer_id, referred_by),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create referral record if referred_by is provided
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (referrer_id, p_user_id, 'pending')
    ON CONFLICT (referred_id) DO NOTHING;
  END IF;

  result := json_build_object(
    'success', true,
    'message', 'Profile setup completed',
    'user_id', p_user_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id
    );
    RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.setup_user_profile(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_user_profile(uuid, text, text, text, text, text, text) TO authenticated;

-- RPC Function: Initiate registration payment
CREATE OR REPLACE FUNCTION public.initiate_registration_payment(
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  payment_id UUID;
  result JSON;
  referral_code TEXT;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  PERFORM public.require_authenticated_user();

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: registration payment requires matching user'
    );
  END IF;

  -- Validate phone number format first
  IF NOT (p_phone_number ~ '^254[0-9]{9}$') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid phone number format. Must be 254XXXXXXXXX'
    );
  END IF;

  -- Ensure a profile row exists for the user_id to satisfy FK constraints
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    -- Generate a unique referral code
    LOOP
      referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || p_user_id::TEXT) FROM 1 FOR 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.referral_code = referral_code);
      counter := counter + 1;
      IF counter > 20 THEN
        referral_code := UPPER(SUBSTRING(MD5(NOW()::TEXT || p_user_id::TEXT || counter::TEXT) FROM 1 FOR 8));
        EXIT;
      END IF;
    END LOOP;

    -- Generate a base username and ensure uniqueness
    base_username := 'user_' || SUBSTRING(p_user_id::TEXT FROM 1 FOR 8);
    final_username := base_username;
    counter := 0;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
      counter := counter + 1;
      final_username := base_username || '_' || counter;
      IF counter > 200 THEN
        final_username := base_username || '_' || uuid_generate_v4()::TEXT;
        EXIT;
      END IF;
    END LOOP;

    BEGIN
      INSERT INTO public.profiles (
        id,
        legal_name,
        username,
        email,
        phone_number,
        referral_code,
        payment_status,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        'New User',
        final_username,
        NULL,
        COALESCE(NULLIF(TRIM(p_phone_number), ''), '254700000000'),
        referral_code,
        'pending',
        NOW(),
        NOW()
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  -- Check if user already has a pending/completed registration payment
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE user_id = p_user_id
    AND payment_type = 'registration'
    AND status IN ('pending', 'completed')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Registration payment already exists'
    );
  END IF;

  -- Create payment record
  INSERT INTO public.payments (
    user_id,
    payment_type,
    amount,
    status,
    phone_number
  )
  VALUES (
    p_user_id,
    'registration',
    200,
    'pending',
    p_phone_number
  )
  RETURNING id INTO payment_id;

  result := json_build_object(
    'success', true,
    'payment_id', payment_id,
    'amount', 200,
    'message', 'Registration payment initiated'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.initiate_registration_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initiate_registration_payment(uuid, text) TO authenticated;

-- RPC Function: Update user avatar
CREATE OR REPLACE FUNCTION public.update_user_avatar(
  p_user_id UUID,
  p_avatar_url TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result JSON;
BEGIN
  PERFORM public.require_authenticated_user();

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: avatar updates require matching user'
    );
  END IF;

  UPDATE public.profiles
  SET
    avatar_url = p_avatar_url,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  result := json_build_object(
    'success', true,
    'message', 'Avatar updated successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_user_avatar(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_avatar(uuid, text) TO authenticated;

-- RPC Function: Mark Mafullu content as purchased
CREATE OR REPLACE FUNCTION public.mark_mafullu_purchased(p_content_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result JSON;
BEGIN
  PERFORM public.require_authenticated_user();

  UPDATE public.mafullu_content
  SET
    is_purchased = TRUE,
    purchased_by = auth.uid(),
    purchased_at = NOW()
  WHERE id = p_content_id
    AND is_purchased = FALSE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Content unavailable or already purchased'
    );
  END IF;

  result := json_build_object(
    'success', true,
    'message', 'Mafullu content purchased successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_mafullu_purchased(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_mafullu_purchased(uuid) TO authenticated;

-- Profile update guard: prevent non-admins from mutating privileged fields
CREATE OR REPLACE FUNCTION public.enforce_profile_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: profile updates require authentication';
  END IF;

  IF NOT public.is_admin_user(auth.uid()) THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin OR
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.payment_verified_at IS DISTINCT FROM OLD.payment_verified_at OR
       NEW.referral_code IS DISTINCT FROM OLD.referral_code OR
       NEW.referred_by IS DISTINCT FROM OLD.referred_by OR
       NEW.joined_at IS DISTINCT FROM OLD.joined_at OR
       NEW.password_reset_count IS DISTINCT FROM OLD.password_reset_count OR
       NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Unauthorized profile field update';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_update_guard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_update_guard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_update_guard() FROM authenticated;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to create profiles for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Guard profile updates so non-admins cannot change privileged fields
DROP TRIGGER IF EXISTS enforce_profile_update_guard ON public.profiles;
CREATE TRIGGER enforce_profile_update_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_guard();

-- Trigger to complete referral on payment
CREATE TRIGGER complete_referral_on_payment
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.payment_type = 'registration')
  EXECUTE FUNCTION public.complete_referral();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- These buckets are required by the app and are recreated idempotently
-- when the migration is applied in the SQL editor.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES
    (uuid_generate_v4(), 'avatars', TRUE),
    (uuid_generate_v4(), 'task-images', TRUE),
    (uuid_generate_v4(), 'mafullu-images', TRUE)
  ON CONFLICT (name) DO NOTHING;
END $$;

-- ============================================
-- STORAGE BUCKET POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload task images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload mafullu images" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

CREATE POLICY "Admins can upload task images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-images'
    AND owner = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can upload mafullu images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mafullu-images'
    AND owner = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = TRUE
    )
  );

-- ============================================
-- SEED DATA (Optional)
-- ============================================
-- Uncomment to add sample data after creating admin user

-- INSERT INTO public.tasks (title, description, task_type, website_link, is_active)
-- VALUES 
--   ('Sample Remote Job', 'This is a sample remote job listing', 'remote', 'https://example.com', TRUE),
--   ('Sample Internship', 'This is a sample internship opportunity', 'local_intern', 'https://example.com', TRUE),
--   ('Sample Local Job', 'This is a sample local job listing', 'local_job', 'https://example.com', TRUE);

-- ============================================
-- END OF SCHEMA
-- ============================================
