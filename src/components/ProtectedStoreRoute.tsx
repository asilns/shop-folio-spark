import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedStoreRouteProps {
  children: JSX.Element;
}

export function ProtectedStoreRoute({ children }: ProtectedStoreRouteProps) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem("store_app_token");
    setHasToken(!!token);
  }, []);
  
  // Show loading state while checking token
  if (hasToken === null) {
    return <div>Loading...</div>;
  }
  
  if (!hasToken) {
    return <Navigate to="/store-login" replace />;
  }
  
  return children;
}