
-- =========================================================================
-- 1) VIEW: switch to security_invoker
-- =========================================================================
DROP VIEW IF EXISTS public.vehicle_key_status CASCADE;
CREATE VIEW public.vehicle_key_status
WITH (security_invoker = true) AS
SELECT v.id AS vehicle_id,
       v.rz,
       v.nahradni_klic,
       (SELECT kh.id FROM public.key_handovers kh
         WHERE kh.vehicle_id = v.id
         ORDER BY kh.created_at DESC LIMIT 1) AS last_handover_id
FROM public.vehicles v;

GRANT SELECT ON public.vehicle_key_status TO authenticated;

-- =========================================================================
-- 2) Helper: driver ownership check by driver_name
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_driver_named(_driver_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
      AND btrim((d.first_name || ' ' || d.last_name)) = btrim(_driver_name)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_driver_named(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_driver_named(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_driver_id(_driver_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid() AND d.id = _driver_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_driver_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_driver_id(uuid) TO authenticated;

-- =========================================================================
-- 3) Drop ALL existing policies in public and revoke anon
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- =========================================================================
-- 4) POLICIES
-- =========================================================================

-- app_settings: read all authenticated, write admin
CREATE POLICY "read_authenticated" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin_ins" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "write_admin_upd" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "write_admin_del" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- company_settings
CREATE POLICY "read_authenticated" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin_ins" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "write_admin_upd" ON public.company_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "write_admin_del" ON public.company_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- currency_rates: read all, write admin/dispatcer
CREATE POLICY "read_authenticated" ON public.currency_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_staff_ins" ON public.currency_rates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "write_staff_upd" ON public.currency_rates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "write_staff_del" ON public.currency_rates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- Catalog tables: read authenticated, write admin/dispatcer
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['vehicles','vehicle_documents','vehicle_mileage','vehicle_vignettes',
                                'document_folders','insurance','inspections','service_plans',
                                'service_records','fuel_cards'])
  LOOP
    EXECUTE format('CREATE POLICY "read_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "write_staff_ins" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer''))', t);
    EXECUTE format('CREATE POLICY "write_staff_upd" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer'')) WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer''))', t);
    EXECUTE format('CREATE POLICY "write_staff_del" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer''))', t);
  END LOOP;
END $$;

-- drivers: read authenticated, write admin/dispatcer + self-update
CREATE POLICY "read_authenticated" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_staff_ins" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "write_staff_upd" ON public.drivers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR user_id = auth.uid());
CREATE POLICY "write_staff_del" ON public.drivers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- reservations: read all authenticated, driver owns by name
CREATE POLICY "read_authenticated" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_named(driver_name));
CREATE POLICY "write_upd" ON public.reservations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_named(driver_name))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_named(driver_name));
CREATE POLICY "write_del" ON public.reservations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_named(driver_name));

-- trip_logs / trip_templates (driver_id references drivers.id)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['trip_logs','trip_templates'])
  LOOP
    EXECUTE format('CREATE POLICY "read_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "write_ins" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer'') OR public.is_driver_id(driver_id))', t);
    EXECUTE format('CREATE POLICY "write_upd" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer'') OR public.is_driver_id(driver_id)) WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer'') OR public.is_driver_id(driver_id))', t);
    EXECUTE format('CREATE POLICY "write_del" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''dispatcer'') OR public.is_driver_id(driver_id))', t);
  END LOOP;
END $$;

-- travel_orders
CREATE POLICY "read_authenticated" ON public.travel_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.travel_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id));
CREATE POLICY "write_upd" ON public.travel_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id));
CREATE POLICY "write_del" ON public.travel_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id));

-- travel_order_legs / meals / expenses: scope via parent travel_order
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['travel_order_legs','travel_order_meals','travel_order_expenses'])
  LOOP
    EXECUTE format('CREATE POLICY "read_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format($f$CREATE POLICY "write_ins" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR EXISTS (SELECT 1 FROM public.travel_orders o WHERE o.id = travel_order_id AND public.is_driver_id(o.driver_id)))$f$, t);
    EXECUTE format($f$CREATE POLICY "write_upd" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR EXISTS (SELECT 1 FROM public.travel_orders o WHERE o.id = travel_order_id AND public.is_driver_id(o.driver_id))) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR EXISTS (SELECT 1 FROM public.travel_orders o WHERE o.id = travel_order_id AND public.is_driver_id(o.driver_id)))$f$, t);
    EXECUTE format($f$CREATE POLICY "write_del" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR EXISTS (SELECT 1 FROM public.travel_orders o WHERE o.id = travel_order_id AND public.is_driver_id(o.driver_id)))$f$, t);
  END LOOP;
END $$;

-- incidents: driver_id nullable
CREATE POLICY "read_authenticated" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id));
CREATE POLICY "write_upd" ON public.incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.is_driver_id(driver_id));
CREATE POLICY "write_del" ON public.incidents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- incident_photos: scope via incident
CREATE POLICY "read_authenticated" ON public.incident_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.incident_photos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND public.is_driver_id(i.driver_id)));
CREATE POLICY "write_upd" ON public.incident_photos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "write_del" ON public.incident_photos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- handover_protocols
CREATE POLICY "read_authenticated" ON public.handover_protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_staff_ins" ON public.handover_protocols FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.has_role(auth.uid(),'ridic'));
CREATE POLICY "write_staff_upd" ON public.handover_protocols FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "write_staff_del" ON public.handover_protocols FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- handover_photos
CREATE POLICY "read_authenticated" ON public.handover_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.handover_photos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR public.has_role(auth.uid(),'ridic'));
CREATE POLICY "write_upd" ON public.handover_photos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "write_del" ON public.handover_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- key_handovers
CREATE POLICY "read_authenticated" ON public.key_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.key_handovers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR created_by = auth.uid());
CREATE POLICY "write_upd" ON public.key_handovers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR created_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR created_by = auth.uid());
CREATE POLICY "write_del" ON public.key_handovers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));

-- vehicle_checklists: user_id owner + staff
CREATE POLICY "read_authenticated" ON public.vehicle_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_ins" ON public.vehicle_checklists FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR user_id = auth.uid());
CREATE POLICY "write_upd" ON public.vehicle_checklists FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR user_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR user_id = auth.uid());
CREATE POLICY "write_del" ON public.vehicle_checklists FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer') OR user_id = auth.uid());

-- notifications: user-scoped
CREATE POLICY "own_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer'));
CREATE POLICY "own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- notification_preferences
CREATE POLICY "own_all" ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- push_subscriptions
CREATE POLICY "own_all" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- profiles
CREATE POLICY "read_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_delete" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: admin-manage, everyone reads own
CREATE POLICY "read_own_or_admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- 5) SECURITY DEFINER trigger functions: revoke execute
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.assign_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_travel_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

-- =========================================================================
-- 6) STORAGE POLICIES
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND policyname ILIKE '%vehicle-documents%' OR policyname ILIKE '%handover-photos%'
           OR policyname ILIKE '%vehicle_documents%' OR policyname ILIKE '%handover_photos%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- vehicle-documents bucket: read for authenticated, write admin/dispatcer
CREATE POLICY "vehicle_docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-documents');
CREATE POLICY "vehicle_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')));
CREATE POLICY "vehicle_docs_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')))
  WITH CHECK (bucket_id = 'vehicle-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')));
CREATE POLICY "vehicle_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-documents' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')));

-- handover-photos: read authenticated, insert authenticated (own uploads), delete admin/dispatcer
CREATE POLICY "handover_photos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'handover-photos');
CREATE POLICY "handover_photos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'handover-photos' AND owner = auth.uid());
CREATE POLICY "handover_photos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'handover-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')))
  WITH CHECK (bucket_id = 'handover-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')));
CREATE POLICY "handover_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'handover-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'dispatcer')));
