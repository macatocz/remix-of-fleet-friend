ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS nazev_vozu TEXT;
CREATE INDEX IF NOT EXISTS idx_vehicles_nazev_vozu ON public.vehicles (nazev_vozu);