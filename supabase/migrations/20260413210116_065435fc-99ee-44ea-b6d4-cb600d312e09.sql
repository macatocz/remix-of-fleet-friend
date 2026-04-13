
ALTER TABLE public.reservations
  ADD COLUMN time_from TIME DEFAULT '08:00',
  ADD COLUMN time_to TIME DEFAULT '17:00';
