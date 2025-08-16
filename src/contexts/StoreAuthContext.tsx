import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreUser {
  id: string;
  store_name: string;
  username: string;
  pin: string;
  role: 'STORE_ADMIN' | 'DATA_ENTRY' | 'VIEWER';
  subscription_date: string;
  subscription_expiry: string;
  last_login: string | null;
  store_id: string; // This is now the 8-digit store ID
  store_id_8digit: string; // Keep for compatibility
}

interface StoreAuthContextType {
  user: StoreUser | null;
  loading: boolean;
  signIn: (store: string, username: string, password: string) => Promise<{ error: any; user?: StoreUser; redirectInfo?: { current_slug: string; needs_redirect: boolean } }>;
  signOut: () => void;
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

export function StoreAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const sessionData = localStorage.getItem('store_auth_session');
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('store_auth_session');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (store: string, username: string, password: string) => {
    try {
      // Use the store auth function
      const { data, error } = await supabase.functions.invoke('store-auth-8digit', {
        body: { store, username, password }
      });

      if (error) {
        console.error('Store auth error:', error);
        return { error: { message: 'Authentication failed' } };
      }

      if (data?.success && data?.user) {
        // Map the user data to use 8-digit store_id consistently
        const userWithStore = { 
          ...data.user,
          store_id: data.user.store_id_8digit, // Use 8-digit store ID as primary store_id
          store_id_8digit: data.user.store_id_8digit // Keep for compatibility
        };
        setUser(userWithStore);
        localStorage.setItem('store_auth_session', JSON.stringify(userWithStore));
        return { 
          error: null, 
          user: userWithStore,
          redirectInfo: data.store
        };
      } else {
        // Handle specific error cases
        if (data?.errorCode === 'STORE_DEACTIVATED') {
          return { error: { message: 'This store is deactivated. Please contact the administrator.' } };
        }
        return { error: { message: data?.error || 'Invalid credentials' } };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: { message: 'Authentication failed' } };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('store_auth_session');
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <StoreAuthContext.Provider value={value}>{children}</StoreAuthContext.Provider>;
}

export function useStoreAuth() {
  const context = useContext(StoreAuthContext);
  if (context === undefined) {
    throw new Error('useStoreAuth must be used within a StoreAuthProvider');
  }
  return context;
}