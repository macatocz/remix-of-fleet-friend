ALTER TABLE public.incidents ALTER COLUMN vehicle_id DROP NOT NULL;
UPDATE public.incidents SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND vehicle_id NOT IN (SELECT id FROM public.vehicles);
ALTER TABLE public.incidents ADD CONSTRAINT incidents_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;