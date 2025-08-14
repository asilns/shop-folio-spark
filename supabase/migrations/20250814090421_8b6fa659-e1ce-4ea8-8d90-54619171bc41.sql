-- Create admin table with roles and email notifications
CREATE TABLE public.admins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN', -- SUPER_ADMIN, ADMIN, VIEWER
    email VARCHAR(255), -- For notifications
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table for managed store accounts
CREATE TABLE public.managed_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    pin CHAR(4) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    subscription_date DATE NOT NULL,
    subscription_expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deleted users table (soft-delete storage for 30 days)
CREATE TABLE public.deleted_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_user_id UUID NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash TEXT NOT NULL,
    pin CHAR(4) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    subscription_date DATE NOT NULL,
    subscription_expiry DATE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_by VARCHAR(50) NOT NULL
);

-- Create audit log table to track all admin actions
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_username VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- CREATE, MODIFY, DELETE, RESTORE, LOGIN
    affected_user VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin permissions
CREATE OR REPLACE FUNCTION public.get_admin_role(admin_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.admins WHERE id = admin_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policies for admins table
CREATE POLICY "Admins can view their own record" ON public.admins
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "SUPER_ADMIN can view all admins" ON public.admins
FOR SELECT USING (public.get_admin_role(auth.uid()) = 'SUPER_ADMIN');

CREATE POLICY "SUPER_ADMIN can update all admins" ON public.admins
FOR UPDATE USING (public.get_admin_role(auth.uid()) = 'SUPER_ADMIN');

CREATE POLICY "SUPER_ADMIN can insert admins" ON public.admins
FOR INSERT WITH CHECK (public.get_admin_role(auth.uid()) = 'SUPER_ADMIN');

-- Create RLS policies for managed_users table
CREATE POLICY "All admin roles can view managed users" ON public.managed_users
FOR SELECT USING (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER'));

CREATE POLICY "SUPER_ADMIN and ADMIN can create users" ON public.managed_users
FOR INSERT WITH CHECK (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "SUPER_ADMIN and ADMIN can update users" ON public.managed_users
FOR UPDATE USING (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "Only SUPER_ADMIN can delete users" ON public.managed_users
FOR DELETE USING (public.get_admin_role(auth.uid()) = 'SUPER_ADMIN');

-- Create RLS policies for deleted_users table
CREATE POLICY "All admin roles can view deleted users" ON public.deleted_users
FOR SELECT USING (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER'));

CREATE POLICY "Only SUPER_ADMIN can insert deleted users" ON public.deleted_users
FOR INSERT WITH CHECK (public.get_admin_role(auth.uid()) = 'SUPER_ADMIN');

-- Create RLS policies for audit_logs table
CREATE POLICY "All admin roles can view audit logs" ON public.audit_logs
FOR SELECT USING (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER'));

CREATE POLICY "All admin roles can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER'));

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_admin_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_updated_at_column();

CREATE TRIGGER update_managed_users_updated_at
BEFORE UPDATE ON public.managed_users
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_updated_at_column();

-- Insert default SUPER_ADMIN account
INSERT INTO public.admins (username, password_hash, role, email)
VALUES ('admin', crypt('admin', gen_salt('bf')), 'SUPER_ADMIN', 'admin@company.com');

-- Create function to handle user deletion (move to deleted_users table)
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_id UUID, admin_username TEXT)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore deleted user
CREATE OR REPLACE FUNCTION public.restore_deleted_user(deleted_user_id UUID, admin_username TEXT)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically purge old deleted users (30 days)
CREATE OR REPLACE FUNCTION public.purge_old_deleted_users()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.deleted_users 
  WHERE deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;