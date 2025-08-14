-- Fix security definer functions by setting search_path

-- Update get_admin_role function
CREATE OR REPLACE FUNCTION public.get_admin_role(admin_id UUID)
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.admins WHERE id = admin_id;
$$;

-- Update update_admin_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_admin_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update soft_delete_user function
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_id UUID, admin_username TEXT)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_record public.managed_users%ROWTYPE;
BEGIN
  -- Get the user record
  SELECT * INTO user_record FROM public.managed_users WHERE id = user_id;
  
  IF user_record.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Insert into deleted_users table
  INSERT INTO public.deleted_users (
    original_user_id, store_name, username, password_hash, pin,
    last_login, subscription_date, subscription_expiry, deleted_by
  ) VALUES (
    user_record.id, user_record.store_name, user_record.username, 
    user_record.password_hash, user_record.pin, user_record.last_login,
    user_record.subscription_date, user_record.subscription_expiry, admin_username
  );
  
  -- Delete from managed_users table
  DELETE FROM public.managed_users WHERE id = user_id;
  
  -- Log the action
  INSERT INTO public.audit_logs (admin_username, action_type, affected_user, notes)
  VALUES (admin_username, 'DELETE', user_record.username, 'User soft deleted');
END;
$$;

-- Update restore_deleted_user function
CREATE OR REPLACE FUNCTION public.restore_deleted_user(deleted_user_id UUID, admin_username TEXT)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_record public.deleted_users%ROWTYPE;
BEGIN
  -- Get the deleted user record
  SELECT * INTO deleted_record FROM public.deleted_users WHERE id = deleted_user_id;
  
  IF deleted_record.id IS NULL THEN
    RAISE EXCEPTION 'Deleted user not found';
  END IF;
  
  -- Check if username is still available
  IF EXISTS (SELECT 1 FROM public.managed_users WHERE username = deleted_record.username) THEN
    RAISE EXCEPTION 'Username already exists, cannot restore';
  END IF;
  
  -- Insert back into managed_users table
  INSERT INTO public.managed_users (
    store_name, username, password_hash, pin, last_login,
    subscription_date, subscription_expiry
  ) VALUES (
    deleted_record.store_name, deleted_record.username, deleted_record.password_hash,
    deleted_record.pin, deleted_record.last_login, deleted_record.subscription_date,
    deleted_record.subscription_expiry
  );
  
  -- Remove from deleted_users table
  DELETE FROM public.deleted_users WHERE id = deleted_user_id;
  
  -- Log the action
  INSERT INTO public.audit_logs (admin_username, action_type, affected_user, notes)
  VALUES (admin_username, 'RESTORE', deleted_record.username, 'User restored from deletion');
END;
$$;

-- Update purge_old_deleted_users function
CREATE OR REPLACE FUNCTION public.purge_old_deleted_users()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.deleted_users 
  WHERE deleted_at < NOW() - INTERVAL '30 days';
END;
$$;