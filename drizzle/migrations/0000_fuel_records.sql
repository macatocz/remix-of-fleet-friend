CREATE TABLE public.fuel_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  fueled_at timestamptz NOT NULL DEFAULT now(),
  location text,
  lat double precision,
  lng double precision,
  liters numeric,
  total_price numeric,
  km integer,
  document_id uuid REFERENCES public.vehicle_documents(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_records TO authenticated;
GRANT ALL ON public.fuel_records TO service_role;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY fuel_read ON public.fuel_records FOR SELECT TO authenticated
  USING (private.can_access_vehicle(vehicle_id));
CREATE POLICY fuel_insert ON public.fuel_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.can_access_vehicle(vehicle_id));
CREATE POLICY fuel_staff_upd ON public.fuel_records FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'dispatcer'))
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'dispatcer'));
CREATE POLICY fuel_delete ON public.fuel_records FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'dispatcer')
    OR (user_id = auth.uid() AND created_at::date = now()::date));

-- Drivers: receipts only
CREATE POLICY receipt_doc_insert ON public.vehicle_documents FOR INSERT TO authenticated
  WITH CHECK (category = 'Účtenky – tankování' AND private.can_access_vehicle(vehicle_id));
CREATE POLICY receipt_folder_insert ON public.document_folders FOR INSERT TO authenticated
  WITH CHECK (name = 'Účtenky – tankování' AND private.can_access_vehicle(vehicle_id));
CREATE POLICY receipt_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-documents'
    AND (storage.foldername(name))[2] = 'uctenky'
    AND private.can_access_vehicle(public.safe_uuid((storage.foldername(name))[1])));
CREATE POLICY mileage_driver_insert ON public.vehicle_mileage FOR INSERT TO authenticated
  WITH CHECK (private.can_access_vehicle(vehicle_id));