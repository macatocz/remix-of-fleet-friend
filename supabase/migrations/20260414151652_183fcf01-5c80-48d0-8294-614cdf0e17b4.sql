
-- Update handle_new_user to also link or create a driver record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _driver_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  -- Try to find existing driver by email and link
  SELECT id INTO _driver_id
  FROM public.drivers
  WHERE email = NEW.email AND user_id IS NULL
  LIMIT 1;

  IF _driver_id IS NOT NULL THEN
    UPDATE public.drivers SET user_id = NEW.id WHERE id = _driver_id;
  ELSE
    -- Create new driver from email
    INSERT INTO public.drivers (first_name, last_name, email, user_id, status)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      NEW.id,
      'aktivní'
    );
  END IF;

  RETURN NEW;
END;
$$;
