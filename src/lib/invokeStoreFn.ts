import { supabase } from '@/integrations/supabase/client';

export async function invokeStoreFn<T = any>(
  name: string, 
  opts?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: any;
  }
) {
  const token = localStorage.getItem("store_app_token");
  if (!token) {
    throw new Error("No store token found");
  }

  return supabase.functions.invoke<T>(name, {
    method: opts?.method ?? "POST",
    headers: { 
      "x-app-token": token, 
      ...(opts?.headers ?? {}) 
    },
    body: opts?.body ?? {},
  });
}