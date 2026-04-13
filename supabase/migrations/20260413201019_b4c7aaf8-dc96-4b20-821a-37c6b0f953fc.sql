
-- Create vehicles table matching Excel structure
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  znacka TEXT, -- Značka (brand + model combined)
  spravce TEXT, -- Správce
  rz TEXT, -- RZ (SPZ)
  vin TEXT,
  vlastnik TEXT, -- Vlastník
  velky_tp TEXT, -- Velký TP
  maly_tp TEXT, -- Malý TP (ANO/NE)
  tankovaci_karty TEXT, -- Tankovací karty + PIN
  stk TEXT, -- STK
  dalnicni_znamka TEXT, -- Dálniční známka
  zelena_karta TEXT, -- Zelená karta
  v_uzivani_od TEXT, -- v užívání od
  v_uzivani_do TEXT, -- v užívání do
  misto_uskladneni_pneu TEXT, -- místo uskladnění pneu
  lekarnicka TEXT, -- lékárnička
  cena_pronajmu TEXT, -- cena pronájmu
  srazka_soukrome TEXT, -- Srážka za užívání pro soukr. účely
  parkovaci_stani TEXT, -- Parkovací stání
  nahradni_klic TEXT, -- náhradní klíč
  poznamky TEXT, -- poznámky
  lokalita TEXT, -- Praha / Liberec
  status TEXT NOT NULL DEFAULT 'aktivní', -- aktivní, v_servisu, vyřazeno
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Public read for now (auth will be added later)
CREATE POLICY "Allow public read vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update vehicles" ON public.vehicles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete vehicles" ON public.vehicles FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
