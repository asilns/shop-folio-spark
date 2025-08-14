import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Admin {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
  email?: string;
  created_at: string;
  updated_at: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
  canManageAdmins: boolean;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const canCreate = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';
  const canModify = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';
  const canDelete = admin?.role === 'SUPER_ADMIN';
  const canManageAdmins = admin?.role === 'SUPER_ADMIN';

  const logAuditAction = async (actionType: string, affectedUser?: string, notes?: string) => {
    if (!admin) return;
    
    try {
      await supabase.from('audit_logs').insert({
        admin_username: admin.username,
        action_type: actionType,
        affected_user: affectedUser,
        notes: notes
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  const fetchAdminProfile = async (adminId: string) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', adminId)
        .single();

      if (error) {
        console.error('Error fetching admin profile:', error);
        return null;
      }

      return data as Admin;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
  };

  const refreshAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const adminData = await fetchAdminProfile(session.user.id);
      setAdmin(adminData);
    }
  };

  useEffect(() => {
    // Check for stored admin session
    const checkStoredSession = () => {
      try {
        const storedSession = localStorage.getItem('admin_session');
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          
          // Check if session is still valid (24 hours)
          const isValid = sessionData.session && 
                          sessionData.session.expiresAt > Date.now();
          
          if (isValid) {
            setAdmin(sessionData.admin);
          } else {
            localStorage.removeItem('admin_session');
          }
        }
      } catch (error) {
        console.error('Error checking stored session:', error);
        localStorage.removeItem('admin_session');
      } finally {
        setLoading(false);
      }
    };

    checkStoredSession();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username, password }
      });

      if (error || !data?.success) {
        return { error: { message: 'Invalid username or password' } };
      }

      // Store admin session data in localStorage
      const adminSession = {
        admin: data.admin,
        session: data.session,
        timestamp: Date.now()
      };
      
      localStorage.setItem('admin_session', JSON.stringify(adminSession));
      
      // Set the admin state directly
      setAdmin(data.admin);
      
      // Log the successful login
      await logAuditAction('LOGIN');

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Log the logout action
      if (admin) {
        await logAuditAction('LOGOUT');
      }
      
      // Clear the stored admin session
      localStorage.removeItem('admin_session');
      
      // Clear the admin state
      setAdmin(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    admin,
    loading,
    signIn,
    signOut,
    canCreate,
    canModify,
    canDelete,
    canManageAdmins,
    refreshAdmin,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}