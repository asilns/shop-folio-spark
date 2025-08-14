-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('company-logos', 'company-logos', true, 409600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

-- Create RLS policies for logo uploads
CREATE POLICY "Anyone can view logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can upload logos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = 'logos');

CREATE POLICY "Anyone can update logos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can delete logos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'company-logos');

-- Add logo_url field to invoice_settings table
ALTER TABLE public.invoice_settings 
ADD COLUMN logo_url TEXT;