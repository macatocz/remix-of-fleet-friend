
-- Table for custom document folders per vehicle
CREATE TABLE public.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, name)
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read document_folders" ON public.document_folders FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert document_folders" ON public.document_folders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update document_folders" ON public.document_folders FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete document_folders" ON public.document_folders FOR DELETE TO public USING (true);

-- Add UPDATE policy to vehicle_documents so we can move docs between folders
CREATE POLICY "Allow public update vehicle_documents" ON public.vehicle_documents FOR UPDATE TO public USING (true);

-- Seed default folders for all existing vehicles
INSERT INTO public.document_folders (vehicle_id, name, sort_order)
SELECT v.id, f.name, f.sort_order
FROM public.vehicles v
CROSS JOIN (VALUES
  ('Technický průkaz', 0),
  ('Pojistná smlouva', 1),
  ('Zelená karta', 2),
  ('STK protokol', 3),
  ('Servisní záznam', 4),
  ('Faktura', 5),
  ('Předávací protokol', 6),
  ('Ostatní', 7)
) AS f(name, sort_order);
