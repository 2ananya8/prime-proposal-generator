-- Auto-provision profiles for first-time @primeinfoserv.com Microsoft SSO sign-ins.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, must_change_password)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_prime_sso_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  result public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NULL OR split_part(user_email, '@', 2) <> 'primeinfoserv.com' THEN
    RAISE EXCEPTION 'Auto-provision is only available for @primeinfoserv.com accounts';
  END IF;

  INSERT INTO public.profiles (id, email, role, must_change_password)
  VALUES (uid, user_email, 'user', false)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO result FROM public.profiles WHERE id = uid;
  IF result IS NULL THEN
    RAISE EXCEPTION 'Could not create profile';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_prime_sso_profile() TO authenticated;
