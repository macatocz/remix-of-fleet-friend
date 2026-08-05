
-- Bezpečný převod textu na uuid (cesty v úložišti)
CREATE OR REPLACE FUNCTION public.safe_uuid(_val text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN _val::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- Má aktuální uživatel přístup k vozidlu? (staff, přidělený řidič, nebo správce vozu)
CREATE OR REPLACE FUNCTION public.can_access_vehicle(_vehicle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _vehicle_id IS NOT NULL AND (
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.drivers d
      WHERE d.user_id = auth.uid()
        AND (
          d.vehicle_id = _vehicle_id
          OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = _vehicle_id AND v.spravce_id = d.id)
        )
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_access_vehicle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_uuid(text) TO authenticated;

-- Dokumenty vozidla
DROP POLICY IF EXISTS read_authenticated ON public.vehicle_documents;
CREATE POLICY vehicle_documents_read_scoped ON public.vehicle_documents
FOR SELECT TO authenticated
USING (public.can_access_vehicle(vehicle_id));

DROP POLICY IF EXISTS read_authenticated ON public.document_folders;
CREATE POLICY document_folders_read_scoped ON public.document_folders
FOR SELECT TO authenticated
USING (public.can_access_vehicle(vehicle_id));

-- Fotky z předávacích protokolů
DROP POLICY IF EXISTS handover_photos_read_scoped ON public.handover_photos;
CREATE POLICY handover_photos_read_scoped ON public.handover_photos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.handover_protocols h
  WHERE h.id = handover_photos.protocol_id
    AND (public.can_access_vehicle(h.vehicle_id) OR public.is_driver_named(COALESCE(h.driver_name, '')))
));

-- Fotky škod
DROP POLICY IF EXISTS incident_photos_read_scoped ON public.incident_photos;
CREATE POLICY incident_photos_read_scoped ON public.incident_photos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.incidents i
  WHERE i.id = incident_photos.incident_id
    AND (public.can_access_vehicle(i.vehicle_id) OR public.is_driver_id(i.driver_id))
));

-- Úložiště: dokumenty vozidla (cesta <vehicle_id>/soubor)
DROP POLICY IF EXISTS vehicle_docs_read ON storage.objects;
CREATE POLICY vehicle_docs_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-documents'
  AND public.can_access_vehicle(public.safe_uuid((storage.foldername(name))[1]))
);

-- Úložiště: fotky (cesta <vehicle_id>/... nebo incidents/<vehicle_id>/...)
DROP POLICY IF EXISTS handover_photos_read ON storage.objects;
CREATE POLICY handover_photos_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'handover-photos'
  AND (
    owner = auth.uid()
    OR public.can_access_vehicle(
      public.safe_uuid(
        CASE WHEN (storage.foldername(name))[1] = 'incidents'
          THEN (storage.foldername(name))[2]
          ELSE (storage.foldername(name))[1]
        END
      )
    )
  )
);

-- Nahrávání fotek jen k vozidlu, ke kterému má uživatel přístup
DROP POLICY IF EXISTS handover_photos_insert ON storage.objects;
CREATE POLICY handover_photos_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'handover-photos'
  AND owner = auth.uid()
  AND public.can_access_vehicle(
    public.safe_uuid(
      CASE WHEN (storage.foldername(name))[1] = 'incidents'
        THEN (storage.foldername(name))[2]
        ELSE (storage.foldername(name))[1]
      END
    )
  )
);
