CREATE OR REPLACE FUNCTION private.has_active_reservation_for_vehicle(_vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservations r
    JOIN public.drivers d
      ON btrim(lower(d.first_name || ' ' || d.last_name)) = btrim(lower(r.driver_name))
    WHERE r.vehicle_id = _vehicle_id
      AND d.user_id = auth.uid()
      AND auth.uid() IS NOT NULL
      AND r.status = 'schváleno'
      AND now() < (((r.date_to + COALESCE(r.time_to, '23:59:59'::time)) AT TIME ZONE 'Europe/Prague') + interval '1 second')
  );
$function$;