CREATE OR REPLACE FUNCTION private.vehicles_basic_rows()
RETURNS TABLE(
  id uuid, nazev_vozu text, znacka text, rz text, status text, lokalita text,
  kategorie text, spravce text, spravce_id uuid, hlavni_uzivatel text,
  parkovaci_stani text, stk text, zelena_karta text, dalnicni_znamka text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT v.id, v.nazev_vozu, v.znacka, v.rz, v.status, v.lokalita, v.kategorie,
         v.spravce, v.spravce_id, v.hlavni_uzivatel, v.parkovaci_stani, v.stk,
         v.zelena_karta, v.dalnicni_znamka, v.created_at, v.updated_at
  FROM public.vehicles v
  WHERE auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION private.company_public_rows()
RETURNS TABLE(
  id uuid, name text, ico text, dic text, address text, city text, zip text,
  meal_rates_override jsonb, foreign_meal_rates_override jsonb,
  fuel_price_override jsonb, km_rate_override jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT c.id, c.name, c.ico, c.dic, c.address, c.city, c.zip,
         c.meal_rates_override, c.foreign_meal_rates_override,
         c.fuel_price_override, c.km_rate_override
  FROM public.company_settings c
  WHERE auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION private.vehicles_basic_rows() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.company_public_rows() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.vehicles_basic_rows() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.company_public_rows() TO authenticated, service_role;

DROP VIEW IF EXISTS public.vehicles_basic;
DROP VIEW IF EXISTS public.company_public;

CREATE VIEW public.vehicles_basic WITH (security_invoker = true) AS
  SELECT * FROM private.vehicles_basic_rows();

CREATE VIEW public.company_public WITH (security_invoker = true) AS
  SELECT * FROM private.company_public_rows();

REVOKE ALL ON public.vehicles_basic FROM anon, PUBLIC;
REVOKE ALL ON public.company_public FROM anon, PUBLIC;
GRANT SELECT ON public.vehicles_basic TO authenticated;
GRANT SELECT ON public.company_public TO authenticated;