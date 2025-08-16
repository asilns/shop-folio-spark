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

console.log("Starting store-settings-update function");

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

    const body = await req.json();
    const { language, default_currency, logo_url } = body;
    
    console.log("Update payload:", { language, default_currency, logo_url });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (language !== undefined) updateData.language = language;
    if (default_currency !== undefined) updateData.default_currency = default_currency;
    if (logo_url !== undefined) updateData.logo_url = logo_url;

    console.log("Updating settings with:", updateData);

    const { data, error } = await supabase
      .from("store_settings")
      .update(updateData)
      .eq("store_id", storeId)
      .select("store_id, language, default_currency, logo_url, updated_at")
      .single();

    if (error) {
      console.error("Error updating settings:", error);
      throw error;
    }

    console.log("Settings updated successfully:", data);
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