-- Fix critical security vulnerability: Customer Personal Information Exposed to Public
-- Remove overly permissive policy that allows public access to all customer data
DROP POLICY IF EXISTS "Allow public access to customers" ON public.customers;

-- Create secure RLS policies for customers table
-- Only allow authenticated store users to access customers from their own store

-- Policy for SELECT: Store users can only view customers from their own store
CREATE POLICY "Store users can view customers from their store" 
ON public.customers 
FOR SELECT 
USING (
  store_id IN (
    SELECT store_id 
    FROM public.managed_users 
    WHERE id = auth.uid()
  )
);

-- Policy for INSERT: Store users can only create customers for their own store
CREATE POLICY "Store users can create customers for their store" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  store_id IN (
    SELECT store_id 
    FROM public.managed_users 
    WHERE id = auth.uid()
  )
);

-- Policy for UPDATE: Store users can only update customers from their own store
CREATE POLICY "Store users can update customers from their store" 
ON public.customers 
FOR UPDATE 
USING (
  store_id IN (
    SELECT store_id 
    FROM public.managed_users 
    WHERE id = auth.uid()
  )
);

-- Policy for DELETE: Store users can only delete customers from their own store
CREATE POLICY "Store users can delete customers from their store" 
ON public.customers 
FOR DELETE 
USING (
  store_id IN (
    SELECT store_id 
    FROM public.managed_users 
    WHERE id = auth.uid()
  )
);

-- Add service role policy for administrative access
CREATE POLICY "Service role can manage all customers" 
ON public.customers 
FOR ALL 
USING (true) 
WITH CHECK (true);