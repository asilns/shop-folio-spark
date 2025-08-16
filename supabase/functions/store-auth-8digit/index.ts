import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoreAuthRequest {
  store: string;
  username: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 FUNCTION CALLED - Method:', req.method);
  console.log('🔑 AUTH HEADER:', req.headers.get('Authorization') ? 'Present' : 'Missing');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    const { store, username, password }: StoreAuthRequest = await req.json();

    console.log('🔍 LOGIN ATTEMPT:', { store, username });

    if (!store || !username || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Store, username, and password are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ MISSING ENV VARS:', { supabaseUrl: !!supabaseUrl, serviceKey: !!supabaseServiceKey });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the simple authentication function temporarily
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_store_user_simple', {
        p_store_input: store,
        p_username: username,
        p_password: password
      });

    console.log('🔍 AUTH RESULT:', { success: authResult && authResult.length > 0, authError });

    if (authError) {
      console.log('❌ AUTHENTICATION FAILED:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials',
          details: authError.message 
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (!authResult || authResult.length === 0) {
      console.log('❌ NO AUTH RESULT');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const userAuth = authResult[0];
    console.log('🔍 USER AUTH RESULT:', { error_code: userAuth.error_code, store_name: userAuth.store_name });

    // Check for specific error conditions
    if (userAuth.error_code === 'STORE_DEACTIVATED') {
      console.log('🚫 STORE DEACTIVATED:', userAuth.store_name);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This store is deactivated. Please contact the administrator.',
          errorCode: 'STORE_DEACTIVATED'
        }),
        { 
          status: 423, // Locked
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (userAuth.error_code === 'INVALID_CREDENTIALS') {
      console.log('❌ INVALID CREDENTIALS');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (userAuth.error_code === 'SUCCESS') {
      console.log('✅ LOGIN SUCCESS:', {
        store: userAuth.store_name,
        username: userAuth.username,
        role: userAuth.role,
        storeId8Digit: userAuth.store_id_8digit,
        redirectUrl: `/store/${userAuth.current_slug}`
      });

      // Create session token with 8-digit store ID
      const sessionToken = btoa(`${userAuth.user_id}:${userAuth.store_id_8digit}:${Date.now()}:${Math.random()}`);
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: userAuth.user_id,
            store_name: userAuth.store_name,
            username: userAuth.username,
            pin: userAuth.pin,
            role: userAuth.role,
            subscription_date: userAuth.subscription_date,
            subscription_expiry: userAuth.subscription_expiry,
            last_login: userAuth.last_login,
            store_id: userAuth.store_id,
            store_id_8digit: userAuth.store_id_8digit
          },
          store: {
            current_slug: userAuth.current_slug,
            needs_redirect: userAuth.needs_redirect,
            store_id_8digit: userAuth.store_id_8digit
          },
          session: {
            token: sessionToken,
            expiresAt: expiresAt
          }
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Fallback for unexpected error codes
    console.log('❓ UNEXPECTED ERROR CODE:', userAuth.error_code);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Authentication failed',
        details: `Unexpected error code: ${userAuth.error_code}`
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('❌ STORE AUTH ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);