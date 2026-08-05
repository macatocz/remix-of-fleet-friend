-- 1) VEHICLES: omezené čtení
DROP POLICY IF EXISTS read_authenticated ON public.vehicles;
CREATE POLICY vehicles_read_scoped ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.is_staff() OR public.can_access_vehicle(id));

CREATE OR REPLACE VIEW public.vehicles_basic AS
  SELECT id, nazev_vozu, znacka, rz, status, lokalita, kategorie,
         spravce, spravce_id, hlavni_uzivatel, parkovaci_stani,
         stk, zelena_karta, dalnicni_znamka, created_at, updated_at
  FROM public.vehicles;
REVOKE ALL ON public.vehicles_basic FROM anon;
GRANT SELECT ON public.vehicles_basic TO authenticated;
GRANT ALL ON public.vehicles_basic TO service_role;

-- 2) COMPANY SETTINGS: kontakty jen pro staff, sazby všem
DROP POLICY IF EXISTS read_authenticated ON public.company_settings;
CREATE POLICY company_settings_read_staff ON public.company_settings
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE OR REPLACE VIEW public.company_public AS
  SELECT id, name, ico, dic, address, city, zip,
         meal_rates_override, foreign_meal_rates_override,
         fuel_price_override, km_rate_override
  FROM public.company_settings;
REVOKE ALL ON public.company_public FROM anon;
GRANT SELECT ON public.company_public TO authenticated;
GRANT ALL ON public.company_public TO service_role;

-- 3) TRIP LOGS: řidič vidí jen své jízdy a jízdy svých vozidel
DROP POLICY IF EXISTS read_authenticated ON public.trip_logs;
CREATE POLICY trip_logs_read_scoped ON public.trip_logs
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR public.is_driver_id(driver_id)
    OR public.can_access_vehicle(vehicle_id)
  );