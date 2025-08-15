import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useToast } from '@/hooks/use-toast';

export default function StoreLoginPage() {
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
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error, user } = await signIn(username, password);
      
      if (error) {
        setError('Invalid credentials');
      } else if (user) {
        // Success - get user's store and redirect to their store dashboard
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: userData } = await supabase
          .from('managed_users')
          .select('store_id')
          .eq('id', user.id)
          .single();

        if (userData?.store_id) {
          const { data: storeData } = await supabase
            .from('stores')
            .select('store_slug')
            .eq('id', userData.store_id)
            .single();

          if (storeData) {
            toast({
              title: 'Login successful',
              description: 'Welcome back!',
            });
            navigate(`/store/${storeData.store_slug}/dashboard`);
            return;
          }
        }

        // Fallback to generic store page if no specific store found
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        navigate('/store');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Login error:', error);
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
            Enter your store credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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