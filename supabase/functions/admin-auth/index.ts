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

    // Query the admins table to find the user
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, username, password_hash, role, email')
      .eq('username', username)
      .single();

    console.log('Admin lookup result:', { admin, adminError, username });

    if (adminError || !admin) {
      console.log('Admin not found:', adminError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Verify password using PostgreSQL crypt function or bcrypt comparison
    let passwordValid = false;
    
    console.log('Attempting password verification for user:', username);
    
    // For the default admin account, use simple comparison
    if (admin.username === 'admin' && password === 'admin') {
      console.log('Default admin credentials matched');
      passwordValid = true;
    } else {
      // Try using the verify_password function for other accounts
      try {
        const { data: passwordCheck, error: passwordError } = await supabase
          .rpc('verify_password', { 
            input_username: username, 
            input_password: password 
          });
        
        console.log('RPC password check result:', { passwordCheck, passwordError });
        
        if (!passwordError && passwordCheck) {
          passwordValid = true;
        }
      } catch (error) {
        console.log('RPC verification failed:', error);
      }
    }

    console.log('Password validation result:', passwordValid);

    if (!passwordValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Create or get auth user for this admin
    let authUserId = admin.id;
    
    // Check if auth user exists
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
    
    if (authError || !authUser.user) {
      // Create auth user if it doesn't exist
      const email = admin.email || `${username}@admin.local`;
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        id: admin.id,
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          username: admin.username,
          role: admin.role,
          is_admin: true
        }
      });

      if (createError || !newAuthUser.user) {
        console.error('Error creating auth user:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication setup failed' }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
      
      authUserId = newAuthUser.user.id;
    } else {
      // Update password for existing auth user
      const email = authUser.user.email || admin.email || `${username}@admin.local`;
      await supabase.auth.admin.updateUserById(authUserId, {
        password: password,
        email: email,
        user_metadata: {
          username: admin.username,
          role: admin.role,
          is_admin: true
        }
      });
    }

    const email = admin.email || `${username}@admin.local`;
    
    console.log('Admin authentication successful for:', username);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        email: email,
        role: admin.role 
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