CREATE OR REPLACE FUNCTION public.safe_uuid(_val text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN _val::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;