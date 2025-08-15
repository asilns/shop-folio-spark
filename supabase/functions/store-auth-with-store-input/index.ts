// Enhanced store authentication function that handles store name/slug input
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StoreLoginRequest {
  store: string;
  username: string;
  password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let body: StoreLoginRequest;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { store, username, password } = body;

    if (!store || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Store, username, and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Attempting authentication for:', { store, username });

    // Call the store authentication function
    const { data, error } = await supabase.rpc('authenticate_store_user_with_store', {
      p_store_input: store,
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('Store auth function error:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication failed'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!data || data.length === 0) {
      console.log('No matching user found for store/username combination');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid credentials or store not found'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userData = data[0];
    console.log('Authentication successful for user:', userData.username);

    // Return success response with user data and redirect info
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userData.user_id,
          store_name: userData.store_name,
          username: userData.username,
          pin: userData.pin,
          role: userData.role,
          subscription_date: userData.subscription_date,
          subscription_expiry: userData.subscription_expiry,
          last_login: userData.last_login,
          store_id: userData.store_id
        },
        store: {
          current_slug: userData.current_slug,
          needs_redirect: userData.needs_redirect
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});