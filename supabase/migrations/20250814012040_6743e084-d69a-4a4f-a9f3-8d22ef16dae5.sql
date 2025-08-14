-- Create order_statuses table for configurable order statuses
CREATE TABLE public.order_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-800',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_statuses ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to order_statuses" 
ON public.order_statuses 
FOR ALL 
USING (true);

-- Insert default order statuses
INSERT INTO public.order_statuses (name, display_name, color, sort_order) VALUES
('pending', 'Pending', 'bg-yellow-100 text-yellow-800', 1),
('confirmed', 'Confirmed', 'bg-blue-100 text-blue-800', 2),
('processing', 'Processing', 'bg-purple-100 text-purple-800', 3),
('shipped', 'Shipped', 'bg-green-100 text-green-800', 4),
('delivered', 'Delivered', 'bg-emerald-100 text-emerald-800', 5),
('cancelled', 'Cancelled', 'bg-red-100 text-red-800', 6);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_order_statuses_updated_at
BEFORE UPDATE ON public.order_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();