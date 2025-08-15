-- Insert default WhatsApp messaging settings (only if they don't exist)
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