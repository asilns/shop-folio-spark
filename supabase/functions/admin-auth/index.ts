import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminAuthRequest {
  username: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password }: AdminAuthRequest = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and password are required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the secure authentication function
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_admin', {
        input_username: username,
        input_password: password
      });

    console.log('Authentication result:', { success: authResult && authResult.length > 0, authError });

    if (authError || !authResult || authResult.length === 0) {
      console.log('Authentication failed for user:', username);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const admin = authResult[0];
    console.log('Admin authenticated successfully:', admin.username, admin.role);

    // Create a simple session token (in production, use proper JWT)
    const sessionToken = btoa(`${admin.admin_id}:${Date.now()}:${Math.random()}`);
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        admin: {
          id: admin.admin_id,
          username: admin.username,
          role: admin.role,
          email: admin.email
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

  } catch (error: any) {
    console.error('Error in admin-auth function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);