
-- ===== vehicle_checklists =====
CREATE TABLE public.vehicle_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID,
  driver_name TEXT,
  type TEXT NOT NULL DEFAULT 'pre',
  items JSONB NOT NULL DEFAULT '{}'::jsonb,
  km INTEGER,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_vehicle ON public.vehicle_checklists(vehicle_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_checklists TO authenticated;
GRANT ALL ON public.vehicle_checklists TO service_role;
ALTER TABLE public.vehicle_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read checklists" ON public.vehicle_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert checklists" ON public.vehicle_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update own checklists" ON public.vehicle_checklists FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth delete own checklists" ON public.vehicle_checklists FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ===== key_handovers =====
CREATE TABLE public.key_handovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'take',
  from_user_id UUID,
  to_user_id UUID,
  to_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
CREATE INDEX idx_keys_vehicle ON public.key_handovers(vehicle_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_handovers TO authenticated;
GRANT ALL ON public.key_handovers TO service_role;
ALTER TABLE public.key_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read keys" ON public.key_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert keys" ON public.key_handovers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update own keys" ON public.key_handovers FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth delete own keys" ON public.key_handovers FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));

-- Convenience view: latest key holder per vehicle
CREATE OR REPLACE VIEW public.vehicle_key_status AS
SELECT DISTINCT ON (vehicle_id)
  vehicle_id, action, to_user_id, to_name, from_user_id, note, created_at
FROM public.key_handovers
ORDER BY vehicle_id, created_at DESC;
GRANT SELECT ON public.vehicle_key_status TO authenticated;
