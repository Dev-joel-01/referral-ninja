-- Migration: Create table to log cleanup of pending signups
CREATE TABLE IF NOT EXISTS public.pending_signup_cleanup_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT INSERT ON public.pending_signup_cleanup_log TO authenticated;
GRANT SELECT ON public.pending_signup_cleanup_log TO authenticated;
