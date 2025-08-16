import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v4.14.4/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORE_JWT_SECRET = Deno.env.get("STORE_JWT_SECRET")!;
const ALLOW_ORIGIN = Deno.env.get("ALLOW_ORIGIN") ?? "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-app-token",
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

console.log("Starting store-settings-get function");

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

  // 3) Service role client
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 4) Get or init store_settings row for this store
  const { data: existing, error: selErr } = await admin
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  if (selErr) {
    console.error("Error selecting settings:", selErr);
    return j({ error: selErr.message }, 500);
  }
  
  if (existing) {
    console.log("Returning existing settings:", existing);
    return j(existing);
  }

  console.log("Creating default settings for store:", storeId);
  const { data: created, error: insErr } = await admin
    .from("store_settings")
    .insert([{ store_id: storeId }])
    .select()
    .single();

  if (insErr) {
    console.error("Error creating settings:", insErr);
    return j({ error: insErr.message }, 500);
  }
  
  console.log("Created settings:", created);
  return j(created);
});