import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORE_JWT_SECRET = Deno.env.get("STORE_JWT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log("Starting store-settings-get function");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Verifying token...");
    
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(STORE_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const payload = await verify(token, key);
    const storeId = String(payload.store_id || "");
    
    console.log("Store ID from token:", storeId);
    
    if (!/^\d{8}$/.test(storeId)) {
      throw new Error("Invalid store_id format");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // First try to get existing settings
    let { data, error } = await supabase
      .from("store_settings")
      .select("store_id, language, default_currency, logo_url, updated_at")
      .eq("store_id", storeId)
      .maybeSingle();

    // If no settings exist, create default ones
    if (!data && !error) {
      console.log("Creating default settings for store:", storeId);
      const { data: insertData, error: insertError } = await supabase
        .from("store_settings")
        .insert({
          store_id: storeId,
          language: "en",
          default_currency: "USD"
        })
        .select("store_id, language, default_currency, logo_url, updated_at")
        .single();

      if (insertError) {
        console.error("Error creating settings:", insertError);
        throw insertError;
      }
      data = insertData;
    }

    if (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }

    console.log("Returning settings:", data);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});