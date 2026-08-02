import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type SiteTextRow = {
  key: string;
  value: string;
  updated_at: string;
};

export async function listSiteTexts(): Promise<SiteTextRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_site_texts');
  if (error) throw error;
  return ((data || []) as SiteTextRow[]).map((row) => ({
    key: row.key,
    value: row.value ?? '',
    updated_at: row.updated_at,
  }));
}

export async function upsertSiteText(key: string, value: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('upsert_site_text', {
    p_key: key,
    p_value: value,
  });
  if (error) {
    if (/not_admin/i.test(error.message)) throw new Error('not_admin');
    throw error;
  }
}
