-- Referral Ninja Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  legal_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  avatar_url TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  password_reset_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('remote', 'local_intern', 'local_job')),
  website_link TEXT,
  images TEXT[] DEFAULT '{}',
  click_count INTEGER DEFAULT 0,
  posted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Task clicks tracking
CREATE TABLE IF NOT EXISTS public.task_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Mafullu content table
CREATE TABLE IF NOT EXISTS public.mafullu_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by UUID REFERENCES public.profiles(id),
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mafullu purchases
CREATE TABLE IF NOT EXISTS public.mafullu_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.mafullu_content(id) ON DELETE CASCADE,
  amount INTEGER DEFAULT 300,
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, completed
  earned_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('registration', 'mafullu', 'withdrawal')),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  mpesa_receipt TEXT,
  phone_number TEXT,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, rejected
  verification_code TEXT,
  phone_number TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id)
);

-- Password reset tracking
CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reset_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
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

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Tasks policies
CREATE POLICY "Anyone can view active tasks"
  ON public.tasks FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Task clicks policies
CREATE POLICY "Users can view own task clicks"
  ON public.task_clicks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own task clicks"
  ON public.task_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all task clicks"
  ON public.task_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Mafullu content policies
CREATE POLICY "Admins can manage mafullu content"
  ON public.mafullu_content FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

CREATE POLICY "Users can view purchased mafullu content"
  ON public.mafullu_content FOR SELECT
  USING (is_purchased = TRUE AND purchased_by = auth.uid());

-- Mafullu purchases policies
CREATE POLICY "Users can view own purchases"
  ON public.mafullu_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own purchases"
  ON public.mafullu_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.mafullu_purchases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Referrals policies
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Withdrawals policies
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- Password resets policies
CREATE POLICY "Users can view own password resets"
  ON public.password_resets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own password resets"
  ON public.password_resets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own password resets"
  ON public.password_resets FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin logs policies
CREATE POLICY "Admins can view all admin logs"
  ON public.admin_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

CREATE POLICY "Admins can create admin logs"
  ON public.admin_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to increment task click count
CREATE OR REPLACE FUNCTION public.increment_task_clicks(task_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tasks
  SET click_count = click_count + 1
  WHERE id = task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment password reset count
CREATE OR REPLACE FUNCTION public.increment_reset_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET password_reset_count = password_reset_count + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete referral when payment is made
CREATE OR REPLACE FUNCTION public.complete_referral()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND OLD.payment_status = 'pending' THEN
    UPDATE public.referrals
    SET 
      status = 'completed',
      earned_amount = 100,
      completed_at = NOW()
    WHERE referred_id = NEW.user_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to complete referral on payment
CREATE TRIGGER complete_referral_on_payment
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.payment_type = 'registration')
  EXECUTE FUNCTION public.complete_referral();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code TEXT;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate unique referral code with retry logic
  LOOP
    referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = referral_code);
    IF counter > 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 10 attempts';
    END IF;
    counter := counter + 1;
  END LOOP;

  -- Generate unique username with retry logic
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8));
  final_username := base_username;
  counter := 0;

  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
    counter := counter + 1;
    final_username := base_username || '_' || counter;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique username after 100 attempts';
    END IF;
  END LOOP;

  -- Insert profile with validated data
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
    CASE
      WHEN NULLIF(TRIM(NEW.raw_user_meta_data->>'referred_by'), '') IS NOT NULL
      THEN NULLIF(TRIM(NEW.raw_user_meta_data->>'referred_by'), '')::UUID
      ELSE NULL
    END,
    FALSE,
    'pending'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RPC Function: Setup user profile (called after signup)
CREATE OR REPLACE FUNCTION public.setup_user_profile(
  p_user_id UUID,
  p_legal_name TEXT,
  p_username TEXT,
  p_email TEXT,
  p_phone_number TEXT,
  p_referral_code TEXT,
  p_referred_by TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update profile with additional data (already created by trigger)
  UPDATE public.profiles
  SET
    legal_name = COALESCE(NULLIF(TRIM(p_legal_name), ''), legal_name),
    username = COALESCE(NULLIF(TRIM(p_username), ''), username),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    phone_number = COALESCE(NULLIF(TRIM(p_phone_number), ''), phone_number),
    referred_by = CASE
      WHEN p_referred_by IS NOT NULL AND p_referred_by != ''
      THEN p_referred_by::UUID
      ELSE referred_by
    END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create referral record if referred_by is provided
  IF p_referred_by IS NOT NULL AND p_referred_by != '' THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (p_referred_by::UUID, p_user_id, 'pending')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Initiate registration payment
CREATE OR REPLACE FUNCTION public.initiate_registration_payment(
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
  payment_id UUID;
  result JSON;
BEGIN
  -- Validate phone number format
  IF NOT (p_phone_number ~ '^254[0-9]{9}$') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid phone number format. Must be 254XXXXXXXXX'
    );
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Update user avatar
CREATE OR REPLACE FUNCTION public.update_user_avatar(
  p_user_id UUID,
  p_avatar_url TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets (run these in Storage section of Supabase)
-- Note: These need to be created via Supabase Dashboard or API

-- Bucket: avatars
-- Bucket: task-images  
-- Bucket: mafullu-images

-- ============================================
-- DEFAULT ADMIN USER
-- ============================================

-- Create admin user (run this after setting up auth)
-- Note: You'll need to create this user through the Supabase Auth UI or API
-- Email: admin@referralninja.co.ke
-- Password: Admin@Ninja2026!

-- Then run this to make them admin:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'admin@referralninja.co.ke';
