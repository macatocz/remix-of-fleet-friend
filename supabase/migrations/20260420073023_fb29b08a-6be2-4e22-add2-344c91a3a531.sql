
-- Handover protocols
CREATE TABLE public.handover_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  reservation_id UUID,
  type TEXT NOT NULL DEFAULT 'predani', -- predani | prevzeti
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  driver_name TEXT,
  handover_by TEXT,
  km INTEGER,
  fuel_percent INTEGER,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.handover_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read handover_protocols" ON public.handover_protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert handover_protocols" ON public.handover_protocols FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update handover_protocols" ON public.handover_protocols FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete handover_protocols" ON public.handover_protocols FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_handover_protocols_updated_at
BEFORE UPDATE ON public.handover_protocols
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handover photos
CREATE TABLE public.handover_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID NOT NULL REFERENCES public.handover_protocols(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.handover_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read handover_photos" ON public.handover_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert handover_photos" ON public.handover_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update handover_photos" ON public.handover_photos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete handover_photos" ON public.handover_photos FOR DELETE TO authenticated USING (true);

-- Incidents (škody)
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  reservation_id UUID,
  driver_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  description TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'nahlaseno', -- nahlaseno | v_reseni | uzavreno
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update incidents" ON public.incidents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete incidents" ON public.incidents FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Incident photos
CREATE TABLE public.incident_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read incident_photos" ON public.incident_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert incident_photos" ON public.incident_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update incident_photos" ON public.incident_photos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete incident_photos" ON public.incident_photos FOR DELETE TO authenticated USING (true);

-- Storage bucket pro fotky
INSERT INTO storage.buckets (id, name, public) VALUES ('handover-photos', 'handover-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read handover-photos bucket" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'handover-photos');

CREATE POLICY "Authenticated upload handover-photos bucket" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'handover-photos');

CREATE POLICY "Authenticated update handover-photos bucket" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'handover-photos');

CREATE POLICY "Authenticated delete handover-photos bucket" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'handover-photos');
