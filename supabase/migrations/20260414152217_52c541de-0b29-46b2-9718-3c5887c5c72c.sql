
-- Service records
CREATE TABLE public.service_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'dokončeno',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read service_records" ON public.service_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert service_records" ON public.service_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update service_records" ON public.service_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete service_records" ON public.service_records FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inspections (STK/emise)
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'STK',
  date DATE NOT NULL,
  valid_until DATE NOT NULL,
  result TEXT DEFAULT 'platná',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inspections" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inspections" ON public.inspections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete inspections" ON public.inspections FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insurance
CREATE TABLE public.insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  insurer TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'POV',
  policy_number TEXT,
  valid_from DATE,
  valid_until DATE NOT NULL,
  annual_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read insurance" ON public.insurance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert insurance" ON public.insurance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update insurance" ON public.insurance FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete insurance" ON public.insurance FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_insurance_updated_at BEFORE UPDATE ON public.insurance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
