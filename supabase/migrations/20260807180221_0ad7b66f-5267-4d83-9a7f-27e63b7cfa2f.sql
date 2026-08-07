CREATE OR REPLACE FUNCTION private.has_active_reservation_for_vehicle(_vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservations r
    JOIN public.drivers d
      ON btrim(lower(d.first_name || ' ' || d.last_name)) = btrim(lower(r.driver_name))
    WHERE r.vehicle_id = _vehicle_id
      AND d.user_id = auth.uid()
      AND auth.uid() IS NOT NULL
      AND r.status = 'schváleno'
      AND now() >= ((r.date_from + COALESCE(r.time_from, '00:00:00'::time)) AT TIME ZONE 'Europe/Prague')
      AND now() <  (((r.date_to + COALESCE(r.time_to, '23:59:59'::time)) AT TIME ZONE 'Europe/Prague') + interval '1 second')
  );
$$;

REVOKE ALL ON FUNCTION private.has_active_reservation_for_vehicle(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_active_reservation_for_vehicle(uuid) TO authenticated;

DROP POLICY IF EXISTS fuel_cards_read_staff_or_active_reservation ON public.fuel_cards;

CREATE POLICY fuel_cards_read_staff_or_active_reservation
ON public.fuel_cards
FOR SELECT
TO authenticated
USING (
  private.is_staff()
  OR private.has_active_reservation_for_vehicle(vehicle_id)
);