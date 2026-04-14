
CREATE TABLE public.trip_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME WITHOUT TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  description TEXT,
  purpose TEXT,
  route_from TEXT,
  route_to TEXT,
  km_start INTEGER,
  km_end INTEGER,
  km_total INTEGER GENERATED ALWAYS AS (CASE WHEN km_end IS NOT NULL AND km_start IS NOT NULL THEN km_end - km_start ELSE NULL END) STORED,
  fuel_quantity NUMERIC(10,4),
  fuel_price NUMERIC(10,2),
  other_quantity NUMERIC(10,4),
  other_price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trip_logs" ON public.trip_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert trip_logs" ON public.trip_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update trip_logs" ON public.trip_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete trip_logs" ON public.trip_logs FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_trip_logs_updated_at
  BEFORE UPDATE ON public.trip_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
