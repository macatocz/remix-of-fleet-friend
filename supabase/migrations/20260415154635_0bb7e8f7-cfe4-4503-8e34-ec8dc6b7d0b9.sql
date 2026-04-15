
CREATE TABLE public.fuel_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  card_number text,
  pin text,
  owner_name text,
  status text NOT NULL DEFAULT 'aktivní',
  valid_until date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fuel_cards" ON public.fuel_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fuel_cards" ON public.fuel_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fuel_cards" ON public.fuel_cards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fuel_cards" ON public.fuel_cards FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_fuel_cards_updated_at BEFORE UPDATE ON public.fuel_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
