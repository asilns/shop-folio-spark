import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
}

export default function AdminProtectedRoute({ 
  children, 
  requiredRole 
}: AdminProtectedRouteProps) {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin-login" replace />;
  }

  // Check role permissions
  if (requiredRole) {
    const roleHierarchy = {
      'VIEWER': 1,
      'ADMIN': 2,
      'SUPER_ADMIN': 3
    };

    const userRoleLevel = roleHierarchy[admin.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return <Navigate to="/admin-panel" replace />;
    }
  }

  return <>{children}</>;
}