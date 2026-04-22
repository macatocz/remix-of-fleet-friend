
-- Travel orders main table
CREATE TABLE public.travel_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'koncept',
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  purpose TEXT,
  date_from DATE NOT NULL,
  time_from TIME DEFAULT '08:00',
  date_to DATE NOT NULL,
  time_to TIME DEFAULT '17:00',
  place_from TEXT,
  place_to TEXT,
  transport_mode JSONB NOT NULL DEFAULT '["sluzebni"]'::jsonb,
  advance_payment NUMERIC DEFAULT 0,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.travel_order_legs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  travel_order_id UUID NOT NULL REFERENCES public.travel_orders(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_from TIME,
  time_to TIME,
  place_from TEXT,
  place_to TEXT,
  km INTEGER DEFAULT 0,
  transport TEXT DEFAULT 'sluzebni',
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.travel_order_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  travel_order_id UUID NOT NULL REFERENCES public.travel_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CZK',
  receipt_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.travel_order_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  travel_order_id UUID NOT NULL REFERENCES public.travel_orders(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT 'CZ',
  rate NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_travel_orders_driver ON public.travel_orders(driver_id);
CREATE INDEX idx_travel_orders_vehicle ON public.travel_orders(vehicle_id);
CREATE INDEX idx_travel_orders_date ON public.travel_orders(date_from);
CREATE INDEX idx_travel_order_legs_order ON public.travel_order_legs(travel_order_id);
CREATE INDEX idx_travel_order_expenses_order ON public.travel_order_expenses(travel_order_id);
CREATE INDEX idx_travel_order_meals_order ON public.travel_order_meals(travel_order_id);

-- Enable RLS
ALTER TABLE public.travel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_order_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_order_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_order_meals ENABLE ROW LEVEL SECURITY;

-- Policies (auth users full CRUD, jako service_records)
CREATE POLICY "Authenticated read travel_orders" ON public.travel_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert travel_orders" ON public.travel_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update travel_orders" ON public.travel_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete travel_orders" ON public.travel_orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read travel_order_legs" ON public.travel_order_legs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert travel_order_legs" ON public.travel_order_legs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update travel_order_legs" ON public.travel_order_legs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete travel_order_legs" ON public.travel_order_legs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read travel_order_expenses" ON public.travel_order_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert travel_order_expenses" ON public.travel_order_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update travel_order_expenses" ON public.travel_order_expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete travel_order_expenses" ON public.travel_order_expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read travel_order_meals" ON public.travel_order_meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert travel_order_meals" ON public.travel_order_meals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update travel_order_meals" ON public.travel_order_meals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete travel_order_meals" ON public.travel_order_meals FOR DELETE TO authenticated USING (true);

-- Updated at triggers
CREATE TRIGGER travel_orders_updated_at BEFORE UPDATE ON public.travel_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate číslo CP-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_travel_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _next_num INT;
BEGIN
  IF NEW.number IS NOT NULL AND NEW.number != '' THEN
    RETURN NEW;
  END IF;
  _year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(number, '-', 3) AS INT)), 0) + 1
    INTO _next_num
    FROM public.travel_orders
   WHERE number LIKE 'CP-' || _year || '-%';
  NEW.number := 'CP-' || _year || '-' || lpad(_next_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER travel_orders_set_number BEFORE INSERT ON public.travel_orders FOR EACH ROW EXECUTE FUNCTION public.generate_travel_order_number();

-- Default sazby do app_settings
INSERT INTO public.app_settings (key, value) VALUES
  ('travel.km_rate_personal', '5.85'),
  ('travel.km_rate_average_fuel', '36.10'),
  ('travel.meal_rates_cz', '{"5_12":166,"12_18":252,"18_plus":396}')
ON CONFLICT DO NOTHING;
