CREATE TABLE public.service_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  type TEXT NOT NULL,
  interval_km INTEGER,
  interval_months INTEGER,
  last_done_km INTEGER,
  last_done_date DATE,
  next_due_km INTEGER,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read service_plans"
ON public.service_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert service_plans"
ON public.service_plans FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update service_plans"
ON public.service_plans FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete service_plans"
ON public.service_plans FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_service_plans_vehicle ON public.service_plans(vehicle_id);

CREATE TRIGGER update_service_plans_updated_at
BEFORE UPDATE ON public.service_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();