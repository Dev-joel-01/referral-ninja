-- Withdrawal cooldown enforcement
-- Prevent users from creating more than one withdrawal request within 6 hours.

CREATE OR REPLACE FUNCTION public.enforce_withdrawal_cooldown()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.withdrawals
    WHERE user_id = NEW.user_id
      AND requested_at >= NOW() - INTERVAL '6 hours'
  ) THEN
    RAISE EXCEPTION 'You can only request a withdrawal once every 6 hours.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawal_cooldown_trigger ON public.withdrawals;
CREATE TRIGGER withdrawal_cooldown_trigger
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.enforce_withdrawal_cooldown();
