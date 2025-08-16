import React, { createContext, useContext, useEffect, useState } from 'react';

interface StoreSessionContextType {
  storeToken: string | null;
  storeId: string | null;
  storeSlug: string | null;
  refresh: () => void;
  logout: () => void;
}

const StoreSessionContext = createContext<StoreSessionContextType | undefined>(undefined);

export function StoreSessionProvider({ children }: { children: React.ReactNode }) {
  const [storeToken, setStoreToken] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  const refresh = () => {
    setStoreToken(localStorage.getItem("store_app_token"));
    setStoreId(localStorage.getItem("store_id"));
    setStoreSlug(localStorage.getItem("store_slug"));
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = () => {
    localStorage.removeItem("store_app_token");
    localStorage.removeItem("store_id");
    localStorage.removeItem("store_slug");
    localStorage.removeItem("store_auth_session"); // Clear legacy session too
    setStoreToken(null);
    setStoreId(null);
    setStoreSlug(null);
  };

  const value = {
    storeToken,
    storeId,
    storeSlug,
    refresh,
    logout,
  };

  return (
    <StoreSessionContext.Provider value={value}>
      {children}
    </StoreSessionContext.Provider>
  );
}

export function useStoreSession() {
  const context = useContext(StoreSessionContext);
  if (context === undefined) {
    throw new Error('useStoreSession must be used within a StoreSessionProvider');
  }
  return context;
}