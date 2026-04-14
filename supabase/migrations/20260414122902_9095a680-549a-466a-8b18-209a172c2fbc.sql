
CREATE TABLE public.vehicle_mileage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  km INTEGER NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_mileage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read vehicle_mileage" ON public.vehicle_mileage FOR SELECT USING (true);
CREATE POLICY "Allow public insert vehicle_mileage" ON public.vehicle_mileage FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete vehicle_mileage" ON public.vehicle_mileage FOR DELETE USING (true);
CREATE POLICY "Allow public update vehicle_mileage" ON public.vehicle_mileage FOR UPDATE USING (true);

CREATE INDEX idx_vehicle_mileage_vehicle ON public.vehicle_mileage(vehicle_id, recorded_at DESC);
