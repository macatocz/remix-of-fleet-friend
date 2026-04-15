
CREATE TABLE public.vehicle_vignettes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  country text NOT NULL,
  valid_until date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_vignettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read vehicle_vignettes" ON public.vehicle_vignettes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicle_vignettes" ON public.vehicle_vignettes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicle_vignettes" ON public.vehicle_vignettes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vehicle_vignettes" ON public.vehicle_vignettes FOR DELETE TO authenticated USING (true);
