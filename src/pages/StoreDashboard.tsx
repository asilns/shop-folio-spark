import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useToast } from '@/hooks/use-toast';

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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Store Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Your store details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Store Name:</strong> {user.store_name}</p>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>PIN:</strong> {user.pin}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Start Date:</strong> {new Date(user.subscription_date).toLocaleDateString()}</p>
                <p><strong>Expiry Date:</strong> {new Date(user.subscription_expiry).toLocaleDateString()}</p>
                <p><strong>Status:</strong> 
                  <span className={new Date(user.subscription_expiry) > new Date() ? 'text-green-600' : 'text-red-600'}>
                    {new Date(user.subscription_expiry) > new Date() ? ' Active' : ' Expired'}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Login Activity</CardTitle>
              <CardDescription>Last login information</CardDescription>
            </CardHeader>
            <CardContent>
              <p><strong>Last Login:</strong> {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Your Store Dashboard</CardTitle>
              <CardDescription>Manage your store operations from here</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your store dashboard is ready! You can now start managing your store operations.
                This is where you'll be able to view orders, manage products, and track your business.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}