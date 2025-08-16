import { supabase } from '@/integrations/supabase/client';

export function storeFrom(table: string, storeId: string) {
  return supabase.from(table).select("*").eq("store_id", storeId);
}

export function storeInsert(table: string, storeId: string, row: Record<string, any>) {
  return supabase.from(table).insert([{ ...row, store_id: storeId }]).select().single();
}

export function storeUpdate(table: string, storeId: string, pk: string, id: string, data: Record<string, any>) {
  return supabase.from(table).update(data).eq(pk, id).eq("store_id", storeId).select().single();
}

export function storeDelete(table: string, storeId: string, pk: string, id: string) {
  return supabase.from(table).delete().eq(pk, id).eq("store_id", storeId);
}

export function storeSelect(table: string, storeId: string, columns = "*") {
  return supabase.from(table).select(columns).eq("store_id", storeId);
}

export function validateStoreId(storeId: string | null | undefined): string {
  if (!storeId || !/^\d{8}$/.test(storeId)) {
    throw new Error("Invalid store_id in session");
  }
  return storeId;
}