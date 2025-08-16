import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function StoreLoginPage() {
  const [store, setStore] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user } = useStoreAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/store');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!store || !username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(store, username, password);
      
      if (result.error) {
        setError(result.error.message);
      } else if (result.user && result.redirectInfo) {
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });

        // Use the redirect info from the authentication result
        const { current_slug, needs_redirect } = result.redirectInfo;
        
        if (needs_redirect) {
          // If needs redirect, go to the current slug (handles slug history)
          navigate(`/store/${current_slug}/dashboard`, { replace: true });
        } else {
          // Normal navigation to the store dashboard
          navigate(`/store/${current_slug}/dashboard`);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Store Login</CardTitle>
          <CardDescription className="text-center">
            Enter your store and user credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="store">Store</Label>
              <Input
                id="store"
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Enter store name"
                required
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </Button>

            <div className="text-center">
              <Button variant="link" className="text-sm" onClick={() => navigate('/admin-login')}>
                Admin Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}