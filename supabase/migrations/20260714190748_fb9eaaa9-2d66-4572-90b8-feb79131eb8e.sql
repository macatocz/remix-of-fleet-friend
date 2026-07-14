
ALTER TABLE public.travel_orders
  ADD COLUMN IF NOT EXISTS rejected_by text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE public.travel_orders SET status = 'odeslano' WHERE status = 'zadost_schvalena';
UPDATE public.travel_orders SET status = 'schvaleny' WHERE status = 'schvaleny'; -- noop guard
