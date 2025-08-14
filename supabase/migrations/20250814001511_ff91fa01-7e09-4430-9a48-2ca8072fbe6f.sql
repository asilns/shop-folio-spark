-- Create invoice settings table
CREATE TABLE public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'Your Company',
  phone_number TEXT,
  facebook_account TEXT,
  instagram_account TEXT,
  snapchat_account TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since this is a single-tenant app)
CREATE POLICY "Allow public access to invoice_settings" 
ON public.invoice_settings 
FOR ALL 
USING (true);

-- Insert default settings
INSERT INTO public.invoice_settings (company_name, phone_number, facebook_account, instagram_account, snapchat_account, city, country)
VALUES ('Your Company', '974 55110219', '', '', '', 'Doha', 'Qatar');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();