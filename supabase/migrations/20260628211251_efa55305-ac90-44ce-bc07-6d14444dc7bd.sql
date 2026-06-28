ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS meal_rates_override JSONB,
  ADD COLUMN IF NOT EXISTS foreign_meal_rates_override JSONB,
  ADD COLUMN IF NOT EXISTS fuel_price_override JSONB,
  ADD COLUMN IF NOT EXISTS km_rate_override JSONB;