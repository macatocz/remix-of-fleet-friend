-- Rozšíření travel_orders
ALTER TABLE public.travel_orders
  ADD COLUMN IF NOT EXISTS co_travelers text,
  ADD COLUMN IF NOT EXISTS currency_rate_date date,
  ADD COLUMN IF NOT EXISTS currency_rate_eur_czk numeric,
  ADD COLUMN IF NOT EXISTS requested_by text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_approved_by text,
  ADD COLUMN IF NOT EXISTS request_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_submitted_by text,
  ADD COLUMN IF NOT EXISTS report_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_approved_by text,
  ADD COLUMN IF NOT EXISTS report_approved_at timestamptz;

-- Rozšíření travel_order_legs
ALTER TABLE public.travel_order_legs
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'CZ',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Prague';

-- Rozšíření travel_order_meals
ALTER TABLE public.travel_order_meals
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'CZK',
  ADD COLUMN IF NOT EXISTS pocket_money_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pocket_money_amount numeric NOT NULL DEFAULT 0;

-- Nová tabulka kurzů
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  currency text NOT NULL,
  rate_to_czk numeric NOT NULL,
  source text NOT NULL DEFAULT 'CNB',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, currency)
);

ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read currency_rates"
  ON public.currency_rates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert currency_rates"
  ON public.currency_rates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update currency_rates"
  ON public.currency_rates FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_currency_rates_date_currency ON public.currency_rates (date, currency);