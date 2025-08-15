-- Add WhatsApp messaging settings to app_settings table
-- First, let's check if we need to create the app_settings table or update it

-- Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to app_settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Create policy for authenticated write access  
CREATE POLICY "Allow authenticated write access to app_settings"
ON public.app_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default WhatsApp messaging settings
INSERT INTO public.app_settings (key, value) VALUES
  ('whatsapp_enabled', 'false'),
  ('default_country_code', '+974'),
  ('whatsapp_template', 'مرحبا {{name}}،
طلبك رقم {{order_number}} حالته: {{order_status}}.
المجموع: {{total}}
تاريخ الطلب: {{date}}
شكراً لتسوقك معنا 🌟'),
  ('date_format', 'DD/MM/YYYY')
ON CONFLICT (key) DO NOTHING;

-- Create trigger for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_settings_updated_at();