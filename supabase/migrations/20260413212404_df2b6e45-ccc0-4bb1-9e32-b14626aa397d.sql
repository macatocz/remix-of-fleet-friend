CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  department TEXT,
  notes TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aktivní',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Allow public insert drivers" ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update drivers" ON public.drivers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete drivers" ON public.drivers FOR DELETE USING (true);

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();