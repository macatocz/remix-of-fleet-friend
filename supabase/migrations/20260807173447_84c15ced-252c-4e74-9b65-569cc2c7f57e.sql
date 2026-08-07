CREATE OR REPLACE FUNCTION private.can_access_vehicle(_vehicle_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT _vehicle_id IS NOT NULL AND (
    private.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND (
          d.vehicle_id = _vehicle_id
          OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = _vehicle_id AND v.spravce_id = d.id)
        )
    )
  )
$function$;