import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { resolveStoreSlug } from '@/utils/slugs';
import { OrderDashboard } from '@/components/OrderDashboard';
import { Loader2 } from 'lucide-react';

export default function StoreSlugDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useStoreAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleStoreAccess() {
      if (!slug) {
        setError('Invalid store URL');
        setLoading(false);
        return;
      }

      try {
        // Resolve the slug (could be current or historical)
        const resolution = await resolveStoreSlug(supabase, slug);
        
        if (!resolution) {
          setError('Store not found');
          setLoading(false);
          return;
        }

        // If needs redirect (historical slug), redirect to current slug
        if (resolution.needs_redirect) {
          navigate(`/store/${resolution.current_slug}/dashboard`, { replace: true });
          return;
        }

        // Check if user is authenticated and has access to this store
        if (!authLoading && user) {
          // Verify user belongs to this store
          const { data: userData } = await supabase
            .from('store_users')
            .select('store_id')
            .eq('id', user.id)
            .single();

          if (!userData || userData.store_id !== resolution.store_id) {
            // User doesn't belong to this store, redirect to their own store
            if (userData?.store_id) {
              const { data: userStore } = await supabase
                .from('stores')
                .select('store_slug')
                .eq('id', userData.store_id)
                .single();
              
              if (userStore) {
                navigate(`/store/${userStore.store_slug}/dashboard`, { replace: true });
                return;
              }
            }
            setError('Access denied to this store');
            setLoading(false);
            return;
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error resolving store access:', err);
        setError('Failed to load store');
        setLoading(false);
      }
    }

    if (!authLoading) {
      handleStoreAccess();
    }
  }, [slug, user, authLoading, navigate]);

  // Redirect unauthenticated users to login
  if (!authLoading && !user) {
    navigate('/store-login');
    return null;
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div>Loading store...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate('/store-login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <OrderDashboard storeSlug={slug} />
    </div>
  );
}