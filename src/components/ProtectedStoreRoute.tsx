import React from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ProtectedStoreRouteProps {
  children: JSX.Element;
}

export function ProtectedStoreRoute({ children }: ProtectedStoreRouteProps) {
  const { toast } = useToast();
  const token = localStorage.getItem("store_app_token");
  
  if (!token) {
    // Show toast about expired session
    setTimeout(() => {
      toast({
        title: "Session Required",
        description: "Please sign in to access your store dashboard",
        variant: "destructive",
      });
    }, 100);
    
    return <Navigate to="/store-login" replace />;
  }
  
  return children;
}