-- Create the missing resolve_store_by_slug RPC function
CREATE OR REPLACE FUNCTION public.resolve_store_by_slug(slug_input text)
RETURNS TABLE (
  store_id uuid,
  current_slug text,
  needs_redirect boolean
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- First try to find by current slug
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.store_slug as current_slug,
    false as needs_redirect
  FROM public.stores s
  WHERE s.store_slug = slug_input
    AND s.is_active = true
  LIMIT 1;
  
  -- If not found, check if it's a historical slug
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      s.id as store_id,
      s.store_slug as current_slug,
      true as needs_redirect
    FROM public.stores s
    INNER JOIN public.store_slug_history h ON s.id = h.store_id
    WHERE h.old_slug = slug_input
      AND s.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.resolve_store_by_slug(text) TO anon, authenticated;