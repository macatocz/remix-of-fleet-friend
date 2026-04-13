
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  driver_name TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'čeká',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read reservations" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "Allow public insert reservations" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reservations" ON public.reservations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reservations" ON public.reservations FOR DELETE USING (true);

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
