
-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', false);

-- RLS policies for vehicle documents
CREATE POLICY "Anyone can view vehicle documents" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-documents');
CREATE POLICY "Anyone can upload vehicle documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle-documents');
CREATE POLICY "Anyone can delete vehicle documents" ON storage.objects FOR DELETE USING (bucket_id = 'vehicle-documents');

-- Table to track document metadata per vehicle
CREATE TABLE public.vehicle_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  category TEXT DEFAULT 'ostatní',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read vehicle_documents" ON public.vehicle_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert vehicle_documents" ON public.vehicle_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete vehicle_documents" ON public.vehicle_documents FOR DELETE USING (true);
