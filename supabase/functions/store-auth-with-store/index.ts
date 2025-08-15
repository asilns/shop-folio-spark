import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and password required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Authenticate user and get store information
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_store_user', {
        p_username: username,
        p_password: password
      });

    if (authError || !authResult || authResult.length === 0) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = authResult[0];

    // Get store information if user has a store assigned
    let storeInfo = null;
    if (user.user_id) {
      const { data: userData, error: userError } = await supabase
        .from('managed_users')
        .select(`
          store_id,
          stores (
            id,
            store_name,
            store_slug
          )
        `)
        .eq('id', user.user_id)
        .single();

      if (!userError && userData?.stores) {
        storeInfo = userData.stores;
      }
    }

    // Return user data with store information
    const responseData = {
      success: true,
      user: {
        id: user.user_id,
        store_name: user.store_name,
        username: user.username,
        pin: user.pin,
        subscription_date: user.subscription_date,
        subscription_expiry: user.subscription_expiry,
        last_login: user.last_login,
        store_id: storeInfo?.id || null,
        store_slug: storeInfo?.store_slug || null
      }
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Store auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});