import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStoreRequest {
  storeName: string;
  storeSlug: string;
  users: {
    admin: {
      username: string;
      password: string;
      pin?: string;
    };
    dataEntry?: {
      username?: string;
      password?: string;
      pin?: string;
    };
    viewer?: {
      username?: string;
      password?: string;
      pin?: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeName, storeSlug, users }: CreateStoreRequest = await req.json();

    console.log('🏪 CREATE STORE REQUEST:', { storeName, storeSlug, userRoles: Object.keys(users) });

    if (!storeName || !users.admin?.username || !users.admin?.password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Store name, admin username, and admin password are required' 
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate 8-digit store ID
    const { data: storeIdData, error: storeIdError } = await supabase
      .rpc('next_store_id');

    if (storeIdError) {
      console.error('❌ STORE ID GENERATION ERROR:', storeIdError);
      throw storeIdError;
    }

    const storeId8Digit = storeIdData;
    console.log('🆔 GENERATED STORE ID:', storeId8Digit);

    // Create the store
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .insert({
        store_name: storeName.trim(),
        store_slug: storeSlug.trim(),
        store_id_8digit: storeId8Digit,
        is_active: true
      })
      .select()
      .single();

    if (storeError) {
      console.error('❌ STORE CREATE ERROR:', storeError);
      throw storeError;
    }

    console.log('✅ STORE CREATED:', storeData);

    const createdUsers = [];

    // Create admin user (required)
    const { data: adminUser, error: adminError } = await supabase
      .from('store_users')
      .insert({
        store_id: storeData.store_id,
        username: users.admin.username.trim(),
        password_hash: users.admin.password, // Will be hashed by trigger
        role: 'STORE_ADMIN',
        pin: users.admin.pin || null
      })
      .select()
      .single();

    if (adminError) {
      console.error('❌ ADMIN USER CREATE ERROR:', adminError);
      // Cleanup: delete the store if user creation fails
      await supabase.from('stores').delete().eq('id', storeData.id);
      throw adminError;
    }

    createdUsers.push({ ...adminUser, password: '[HIDDEN]' });
    console.log('✅ ADMIN USER CREATED:', adminUser.username);

    // Create data entry user (optional)
    if (users.dataEntry?.username && users.dataEntry?.password) {
      const { data: dataEntryUser, error: dataEntryError } = await supabase
        .from('store_users')
        .insert({
          store_id: storeData.store_id,
          username: users.dataEntry.username.trim(),
          password_hash: users.dataEntry.password, // Will be hashed by trigger
          role: 'DATA_ENTRY',
          pin: users.dataEntry.pin || null
        })
        .select()
        .single();

      if (dataEntryError) {
        console.error('❌ DATA ENTRY USER CREATE ERROR:', dataEntryError);
      } else {
        createdUsers.push({ ...dataEntryUser, password: '[HIDDEN]' });
        console.log('✅ DATA ENTRY USER CREATED:', dataEntryUser.username);
      }
    }

    // Create viewer user (optional)
    if (users.viewer?.username && users.viewer?.password) {
      const { data: viewerUser, error: viewerError } = await supabase
        .from('store_users')
        .insert({
          store_id: storeData.store_id,
          username: users.viewer.username.trim(),
          password_hash: users.viewer.password, // Will be hashed by trigger
          role: 'VIEWER',
          pin: users.viewer.pin || null
        })
        .select()
        .single();

      if (viewerError) {
        console.error('❌ VIEWER USER CREATE ERROR:', viewerError);
      } else {
        createdUsers.push({ ...viewerUser, password: '[HIDDEN]' });
        console.log('✅ VIEWER USER CREATED:', viewerUser.username);
      }
    }

    // Seed default settings for the store
    try {
      await supabase.rpc('seed_default_settings_for_store', {
        p_store_id: storeData.store_id
      });
      console.log('✅ DEFAULT SETTINGS SEEDED');
    } catch (seedError) {
      console.warn('⚠️ SETTINGS SEED WARNING:', seedError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        store: {
          ...storeData,
          store_id_8digit: storeId8Digit
        },
        users: createdUsers
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('❌ CREATE STORE ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create store' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);