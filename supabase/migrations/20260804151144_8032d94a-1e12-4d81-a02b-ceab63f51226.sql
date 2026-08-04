DROP VIEW IF EXISTS public.drivers_public;

CREATE OR REPLACE FUNCTION public.list_drivers_public()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  status text,
  vehicle_id uuid,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.first_name, d.last_name, d.status, d.vehicle_id, d.user_id
  FROM public.drivers d
$$;

REVOKE EXECUTE ON FUNCTION public.list_drivers_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_drivers_public() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_travel_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_driver_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_driver_named(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;