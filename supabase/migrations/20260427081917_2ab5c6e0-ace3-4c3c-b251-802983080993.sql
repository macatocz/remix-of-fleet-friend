CREATE TABLE public.trip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NULL,
  driver_id uuid NULL,
  label text NOT NULL,
  route_from text,
  route_to text,
  km_total integer,
  purpose text,
  description text,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read trip_templates" ON public.trip_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert trip_templates" ON public.trip_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update trip_templates" ON public.trip_templates
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete trip_templates" ON public.trip_templates
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_trip_templates_updated_at
  BEFORE UPDATE ON public.trip_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trip_templates_vehicle ON public.trip_templates(vehicle_id);
CREATE INDEX idx_trip_templates_driver ON public.trip_templates(driver_id);