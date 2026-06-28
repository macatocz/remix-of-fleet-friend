CREATE POLICY "Drivers can view fuel cards of their active reservation vehicle"
ON public.fuel_cards
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reservations r
    JOIN public.drivers d
      ON btrim(d.first_name || ' ' || d.last_name) = btrim(r.driver_name)
    WHERE r.vehicle_id = fuel_cards.vehicle_id
      AND d.user_id = auth.uid()
      AND r.status = 'schváleno'
      AND r.date_from <= CURRENT_DATE
      AND r.date_to >= CURRENT_DATE
  )
);