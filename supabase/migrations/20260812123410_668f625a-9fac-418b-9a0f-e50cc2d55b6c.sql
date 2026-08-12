DROP POLICY IF EXISTS read_authenticated ON public.key_handovers;
CREATE POLICY key_handovers_read_scoped ON public.key_handovers
FOR SELECT TO authenticated
USING (
  private.is_staff()
  OR created_by = auth.uid()
  OR from_user_id = auth.uid()
  OR to_user_id = auth.uid()
  OR private.can_access_vehicle(vehicle_id)
);

DROP POLICY IF EXISTS read_authenticated ON public.vehicle_checklists;
CREATE POLICY vehicle_checklists_read_scoped ON public.vehicle_checklists
FOR SELECT TO authenticated
USING (
  private.is_staff()
  OR user_id = auth.uid()
  OR private.can_access_vehicle(vehicle_id)
);