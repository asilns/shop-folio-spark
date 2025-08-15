export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || 'store';
}

export function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export interface StoreResolution {
  store_id: string;
  current_slug: string;
  needs_redirect: boolean;
}

export async function resolveStoreSlug(supabase: any, slug: string): Promise<StoreResolution | null> {
  const { data, error } = await supabase.rpc('resolve_store_by_slug', { slug_input: slug });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return data[0];
}