import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreUser {
  id: string;
  store_name: string;
  username: string;
  pin: string;
  subscription_date: string;
  subscription_expiry: string;
  last_login: string | null;
  store_id?: string;
}

interface StoreAuthContextType {
  user: StoreUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any; user?: StoreUser }>;
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

  const signIn = async (username: string, password: string) => {
    try {
      // Try the new store auth function first
      const { data, error } = await supabase.functions.invoke('store-auth-with-store', {
        body: { username, password }
      });

      if (error) {
        console.error('Store auth error:', error);
        return { error: { message: 'Authentication failed' } };
      }

      if (data?.success && data?.user) {
        const userWithStore = { ...data.user };
        setUser(userWithStore);
        localStorage.setItem('store_auth_session', JSON.stringify(userWithStore));
        return { error: null, user: userWithStore };
      } else {
        return { error: { message: 'Invalid credentials' } };
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