
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  ico text,
  dic text,
  address text,
  city text,
  zip text,
  email text,
  phone text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read company_settings" ON public.company_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert company_settings" ON public.company_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update company_settings" ON public.company_settings FOR UPDATE TO public USING (true);

CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert app_settings" ON public.app_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update app_settings" ON public.app_settings FOR UPDATE TO public USING (true);

INSERT INTO public.company_settings (name) VALUES ('');

INSERT INTO public.app_settings (key, value) VALUES 
  ('date_format', 'dd.MM.yyyy'),
  ('currency', 'CZK'),
  ('notifications_email', 'true'),
  ('notifications_stk', 'true'),
  ('notifications_insurance', 'true'),
  ('notifications_leasing', 'true'),
  ('stk_warning_days', '30'),
  ('insurance_warning_days', '30'),
  ('leasing_warning_days', '60');
