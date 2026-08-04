-- Helper: staff = admin or dispatcer
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'dispatcer'::app_role)
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ============ DRIVERS ============
DROP POLICY IF EXISTS read_authenticated ON public.drivers;
CREATE POLICY drivers_read_staff_or_self ON public.drivers
FOR SELECT TO authenticated
USING (public.is_staff() OR user_id = auth.uid());

CREATE OR REPLACE VIEW public.drivers_public AS
  SELECT id, first_name, last_name, status, vehicle_id, user_id
  FROM public.drivers;
GRANT SELECT ON public.drivers_public TO authenticated;

-- ============ FUEL CARDS ============
DROP POLICY IF EXISTS read_authenticated ON public.fuel_cards;
DROP POLICY IF EXISTS fuel_cards_read_active_reservation ON public.fuel_cards;
CREATE POLICY fuel_cards_read_staff_or_active_reservation ON public.fuel_cards
FOR SELECT TO authenticated
USING (
  public.is_staff()
  OR EXISTS (
    SELECT 1
    FROM public.reservations r
    JOIN public.drivers d
      ON btrim(d.first_name || ' ' || d.last_name) = btrim(r.driver_name)
    WHERE r.vehicle_id = fuel_cards.vehicle_id
      AND d.user_id = auth.uid()
      AND r.status = 'schválená'
      AND r.date_from <= CURRENT_DATE
      AND r.date_to >= CURRENT_DATE
  )
);

-- ============ PROFILES ============
DROP POLICY IF EXISTS read_authenticated ON public.profiles;
CREATE POLICY profiles_read_own_or_admin ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ TRAVEL ORDERS ============
DROP POLICY IF EXISTS read_authenticated ON public.travel_orders;
CREATE POLICY travel_orders_read_scoped ON public.travel_orders
FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_driver_id(driver_id));

DROP POLICY IF EXISTS read_authenticated ON public.travel_order_legs;
CREATE POLICY travel_order_legs_read_scoped ON public.travel_order_legs
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.travel_orders t
  WHERE t.id = travel_order_legs.travel_order_id
    AND (public.is_staff() OR public.is_driver_id(t.driver_id))
));

DROP POLICY IF EXISTS read_authenticated ON public.travel_order_meals;
CREATE POLICY travel_order_meals_read_scoped ON public.travel_order_meals
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.travel_orders t
  WHERE t.id = travel_order_meals.travel_order_id
    AND (public.is_staff() OR public.is_driver_id(t.driver_id))
));

DROP POLICY IF EXISTS read_authenticated ON public.travel_order_expenses;
CREATE POLICY travel_order_expenses_read_scoped ON public.travel_order_expenses
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.travel_orders t
  WHERE t.id = travel_order_expenses.travel_order_id
    AND (public.is_staff() OR public.is_driver_id(t.driver_id))
));

-- ============ INCIDENTS ============
DROP POLICY IF EXISTS read_authenticated ON public.incidents;
CREATE POLICY incidents_read_scoped ON public.incidents
FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_driver_id(driver_id));

DROP POLICY IF EXISTS read_authenticated ON public.incident_photos;
CREATE POLICY incident_photos_read_scoped ON public.incident_photos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.incidents i
  WHERE i.id = incident_photos.incident_id
    AND (public.is_staff() OR public.is_driver_id(i.driver_id))
));

-- ============ HANDOVER PROTOCOLS ============
DROP POLICY IF EXISTS read_authenticated ON public.handover_protocols;
CREATE POLICY handover_protocols_read_scoped ON public.handover_protocols
FOR SELECT TO authenticated
USING (public.is_staff() OR public.is_driver_named(COALESCE(driver_name, '')));

DROP POLICY IF EXISTS read_authenticated ON public.handover_photos;
CREATE POLICY handover_photos_read_scoped ON public.handover_photos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.handover_protocols h
  WHERE h.id = handover_photos.protocol_id
    AND (public.is_staff() OR public.is_driver_named(COALESCE(h.driver_name, '')))
));

-- ============ Internal trigger functions must not be callable from the API ============
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.assign_first_admin() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.generate_travel_order_number() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated, anon;