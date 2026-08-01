import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function getBugCount(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('bug_report_count');
  if (error) throw error;
  return Number(data) || 0;
}

export async function getMissiveCount(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('missive_count');
  if (error) throw error;
  return Number(data) || 0;
}

export async function submitBug(body: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('submit_bug_report', { p_body: body });
  if (error) {
    if (/bug_limit_reached/i.test(error.message)) throw new Error('bug_limit_reached');
    if (/body_too_short/i.test(error.message)) throw new Error('body_too_short');
    throw error;
  }
}

export async function submitMissive(body: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('submit_missive', { p_body: body });
  if (error) {
    if (/missive_limit_reached/i.test(error.message)) throw new Error('missive_limit_reached');
    if (/body_too_short/i.test(error.message)) throw new Error('body_too_short');
    throw error;
  }
}

export type FeedbackRow = {
  id: string;
  user_id: string;
  email: string;
  body: string;
  created_at: string;
};

export async function listBugsAdmin(): Promise<FeedbackRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FeedbackRow[];
}

export async function listMissivesAdmin(): Promise<FeedbackRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('missives')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FeedbackRow[];
}
