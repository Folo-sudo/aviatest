import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type BugStatus = 'envoye' | 'en_cours' | 'corrige';

export type BugReport = {
  id: string;
  user_id: string;
  email: string;
  body: string;
  exercise_id: string;
  status: BugStatus;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
};

export type Missive = {
  id: string;
  user_id: string;
  email: string;
  body: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  in_agora?: boolean;
  agora_published_at?: string | null;
};

export const BUG_STATUS_LABEL: Record<BugStatus, string> = {
  envoye: 'Envoye',
  en_cours: 'En cours de traitement',
  corrige: 'Corrige',
};

export const BUG_STATUS_COLOR: Record<BugStatus, { bg: string; text: string }> = {
  envoye: { bg: '#dbeafe', text: '#1d4ed8' },
  en_cours: { bg: '#ffedd5', text: '#c2410c' },
  corrige: { bg: '#dcfce7', text: '#15803d' },
};

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

export async function submitBug(body: string, exerciseId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('submit_bug_report', {
    p_body: body,
    p_exercise_id: exerciseId || 'autre',
  });
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

export async function listMyBugs(): Promise<BugReport[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as BugReport[];
}

export async function listMyMissives(): Promise<Missive[]> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('missives')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Missive[];
}

export async function listBugsAdmin(): Promise<BugReport[]> {
  return listMyBugs();
}

export async function listMissivesAdmin(): Promise<Missive[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('missives')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Missive[];
}

export async function adminSetBugStatus(
  id: string,
  status: BugStatus,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_set_bug_status', {
    p_id: id,
    p_status: status,
  });
  if (error) throw error;
}

export async function adminReplyBug(id: string, reply: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_reply_bug', {
    p_id: id,
    p_reply: reply,
  });
  if (error) throw error;
}

export async function adminReplyMissive(
  id: string,
  reply: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_reply_missive', {
    p_id: id,
    p_reply: reply,
  });
  if (error) throw error;
}
