ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS purpose_type TEXT NOT NULL DEFAULT 'pracovne';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS hlavni_uzivatel TEXT;
CREATE INDEX IF NOT EXISTS idx_reservations_purpose_type ON public.reservations(purpose_type);