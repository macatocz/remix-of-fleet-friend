
ALTER TABLE public.vehicles ADD COLUMN spravce_id uuid REFERENCES public.drivers(id);

-- Spárovat existující textová jména správců s řidiči
UPDATE vehicles v SET spravce_id = d.id
FROM drivers d
WHERE v.spravce IS NOT NULL
  AND v.spravce = d.first_name || ' ' || d.last_name;
