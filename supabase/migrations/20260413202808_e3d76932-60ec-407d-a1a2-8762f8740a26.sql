
ALTER TABLE public.vehicles
  ADD COLUMN typ_vlastnictvi TEXT DEFAULT 'majetek',
  ADD COLUMN leasingova_spolecnost TEXT,
  ADD COLUMN doba_leasingu TEXT,
  ADD COLUMN najezd_za_rok TEXT,
  ADD COLUMN mesicni_splatka TEXT,
  ADD COLUMN datum_zahajeni_leasingu TEXT,
  ADD COLUMN datum_ukonceni_leasingu TEXT,
  ADD COLUMN cislo_smlouvy_leasing TEXT;
