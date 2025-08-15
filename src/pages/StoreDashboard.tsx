import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useToast } from '@/hooks/use-toast';
import { OrderDashboard } from '@/components/OrderDashboard';

export default function StoreDashboard() {
  const { user, signOut } = useStoreAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = () => {
    signOut();
    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out',
    });
    navigate('/store-login');
  };

  if (!user) {
    navigate('/store-login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
      <OrderDashboard />
    </div>
  );
}