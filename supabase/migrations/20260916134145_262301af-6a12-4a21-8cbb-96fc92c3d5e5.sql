drop policy if exists handover_photos_insert on storage.objects;
create policy handover_photos_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'handover-photos'
  and owner = auth.uid()
  and (
    private.can_access_vehicle(
      case when (storage.foldername(name))[1] = 'incidents'
           then public.safe_uuid((storage.foldername(name))[2])
           else public.safe_uuid((storage.foldername(name))[1]) end)
    or (
      (storage.foldername(name))[1] = 'incidents'
      and exists (
        select 1 from public.incidents i
        where i.vehicle_id = public.safe_uuid((storage.foldername(name))[2])
          and private.is_driver_id(i.driver_id))
    )
  )
);

drop policy if exists handover_photos_read on storage.objects;
create policy handover_photos_read on storage.objects for select to authenticated
using (
  bucket_id = 'handover-photos'
  and (
    owner = auth.uid()
    or private.can_access_vehicle(
      case when (storage.foldername(name))[1] = 'incidents'
           then public.safe_uuid((storage.foldername(name))[2])
           else public.safe_uuid((storage.foldername(name))[1]) end)
    or (
      (storage.foldername(name))[1] = 'incidents'
      and exists (
        select 1 from public.incidents i
        where i.vehicle_id = public.safe_uuid((storage.foldername(name))[2])
          and private.is_driver_id(i.driver_id))
    )
  )
);