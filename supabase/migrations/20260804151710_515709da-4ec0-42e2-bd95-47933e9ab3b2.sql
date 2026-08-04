CREATE OR REPLACE FUNCTION public.list_users_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  roles text[],
  last_sign_in_at timestamptz,
  confirmed boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.first_name,
    p.last_name,
    COALESCE(
      (SELECT array_agg(r.role::text ORDER BY r.role::text)
         FROM public.user_roles r WHERE r.user_id = u.id),
      ARRAY[]::text[]
    ),
    u.last_sign_in_at,
    (u.email_confirmed_at IS NOT NULL),
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_admin() TO authenticated;