-- 1. Private schema for internal helpers (not exposed via API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Move SECURITY DEFINER helpers out of the exposed public schema
ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
ALTER FUNCTION public.is_staff() SET SCHEMA private;
ALTER FUNCTION public.is_driver_id(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_driver_named(text) SET SCHEMA private;
ALTER FUNCTION public.can_access_vehicle(uuid) SET SCHEMA private;
ALTER FUNCTION public.list_drivers_public() SET SCHEMA private;
ALTER FUNCTION public.list_users_admin() SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_driver_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_driver_named(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_access_vehicle(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.list_drivers_public() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.list_users_admin() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_driver_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_driver_named(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_vehicle(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_drivers_public() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_users_admin() TO authenticated, service_role;

-- keep search_path correct now that they live in `private`
ALTER FUNCTION private.has_role(uuid, app_role) SET search_path = public, private;
ALTER FUNCTION private.is_staff() SET search_path = public, private;
ALTER FUNCTION private.is_driver_id(uuid) SET search_path = public, private;
ALTER FUNCTION private.is_driver_named(text) SET search_path = public, private;
ALTER FUNCTION private.can_access_vehicle(uuid) SET search_path = public, private;
ALTER FUNCTION private.list_drivers_public() SET search_path = public, private;
ALTER FUNCTION private.list_users_admin() SET search_path = public, private;

-- 3. Explicit auth checks inside the internal list functions
CREATE OR REPLACE FUNCTION private.list_drivers_public()
RETURNS TABLE(id uuid, first_name text, last_name text, status text, vehicle_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT d.id, d.first_name, d.last_name, d.status, d.vehicle_id, d.user_id
  FROM public.drivers d
  WHERE auth.uid() IS NOT NULL
$$;

-- 4. Thin SECURITY INVOKER wrappers in public for client RPC use
CREATE OR REPLACE FUNCTION public.list_drivers_public()
RETURNS TABLE(id uuid, first_name text, last_name text, status text, vehicle_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_drivers_public() $$;

CREATE OR REPLACE FUNCTION public.list_users_admin()
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, roles text[], last_sign_in_at timestamptz, confirmed boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_users_admin() $$;

REVOKE ALL ON FUNCTION public.list_drivers_public() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_users_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_drivers_public() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_users_admin() TO authenticated;

-- 5. safe_uuid: not needed by anonymous callers
REVOKE ALL ON FUNCTION public.safe_uuid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safe_uuid(text) TO authenticated, service_role;

-- 6. Views: require an authenticated session, no anonymous access
CREATE OR REPLACE VIEW public.vehicles_basic AS
  SELECT id, nazev_vozu, znacka, rz, status, lokalita, kategorie, spravce, spravce_id,
         hlavni_uzivatel, parkovaci_stani, stk, zelena_karta, dalnicni_znamka,
         created_at, updated_at
  FROM public.vehicles
  WHERE auth.uid() IS NOT NULL;

CREATE OR REPLACE VIEW public.company_public AS
  SELECT id, name, ico, dic, address, city, zip,
         meal_rates_override, foreign_meal_rates_override, fuel_price_override, km_rate_override
  FROM public.company_settings
  WHERE auth.uid() IS NOT NULL;

REVOKE ALL ON public.vehicles_basic FROM anon, PUBLIC;
REVOKE ALL ON public.company_public FROM anon, PUBLIC;
REVOKE ALL ON public.vehicle_key_status FROM anon, PUBLIC;
GRANT SELECT ON public.vehicles_basic TO authenticated;
GRANT SELECT ON public.company_public TO authenticated;
GRANT SELECT ON public.vehicle_key_status TO authenticated;

-- 7. Fuel cards: only during the exact approved reservation window
DROP POLICY IF EXISTS fuel_cards_read_staff_or_active_reservation ON public.fuel_cards;
CREATE POLICY fuel_cards_read_staff_or_active_reservation
ON public.fuel_cards FOR SELECT TO authenticated
USING (
  private.is_staff()
  OR EXISTS (
    SELECT 1
    FROM public.reservations r
    JOIN public.drivers d
      ON btrim(d.first_name || ' ' || d.last_name) = btrim(r.driver_name)
    WHERE r.vehicle_id = fuel_cards.vehicle_id
      AND d.user_id = auth.uid()
      AND r.status = 'schválená'
      AND (timezone('Europe/Prague', now()))
          BETWEEN (r.date_from + COALESCE(r.time_from, '00:00'::time))
          AND (r.date_to + COALESCE(r.time_to, '23:59:59'::time))
  )
);