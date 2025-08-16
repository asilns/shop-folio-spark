import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v4.14.4/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORE_JWT_SECRET = Deno.env.get("STORE_JWT_SECRET")!;
const ALLOW_ORIGIN = Deno.env.get("ALLOW_ORIGIN") ?? "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-app-token, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

async function verifyAppToken(token: string) {
  const secret = new TextEncoder().encode(STORE_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const sid = (payload as any)?.store_id;
  if (typeof sid !== "string" || !/^\d{8}$/.test(sid)) throw new Error("invalid_store_token");
  return { store_id: sid };
}

console.log("Starting store-settings-update function");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // 1) Supabase gateway auth (the platform validates Bearer <ANON_KEY>)
  const hasAuth = (req.headers.get("authorization") || "").toLowerCase().startsWith("bearer ");
  if (!hasAuth) return j({ error: "missing_authorization_header" }, 401);

  // 2) App token
  const appToken = req.headers.get("x-app-token") ?? "";
  if (!appToken) return j({ error: "missing_app_token" }, 401);

  let storeId: string;
  try {
    storeId = (await verifyAppToken(appToken)).store_id;
    console.log("Verified store ID:", storeId);
  } catch (error) {
    console.error("App token verification failed:", error);
    return j({ error: "invalid_app_token" }, 401);
  }

  const body = await req.json();
  const { language, default_currency, logo_url } = body;
  
  console.log("Update payload:", { language, default_currency, logo_url });

  // 3) Service role client
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Build update object
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (language !== undefined) updateData.language = language;
  if (default_currency !== undefined) updateData.default_currency = default_currency;
  if (logo_url !== undefined) updateData.logo_url = logo_url;

  console.log("Updating settings with:", updateData);

  const { data, error } = await admin
    .from("store_settings")
    .update(updateData)
    .eq("store_id", storeId)
    .select("store_id, language, default_currency, logo_url, updated_at")
    .single();

  if (error) {
    console.error("Error updating settings:", error);
    return j({ error: error.message }, 500);
  }

  console.log("Settings updated successfully:", data);
  return j(data);
});