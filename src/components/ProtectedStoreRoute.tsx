import React from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ProtectedStoreRouteProps {
  children: JSX.Element;
}

export function ProtectedStoreRoute({ children }: ProtectedStoreRouteProps) {
  const token = localStorage.getItem("store_app_token");
  
  if (!token) {
    return <Navigate to="/store-login" replace />;
  }
  
  return children;
}