import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type NotamReply = {
  id: string;
  body: string;
  author_username: string;
  score: number;
  my_vote: number;
  is_mine: boolean;
  created_at: string;
};

export type NotamItem = {
  id: string;
  body: string;
  author_username: string;
  score: number;
  my_vote: number;
  is_mine: boolean;
  created_at: string;
  closed_at: string | null;
  replies: NotamReply[];
};

export type MyNotam = {
  id: string;
  body: string;
  score: number;
  created_at: string;
  closed_at: string | null;
  reply_count: number;
};

function mapReply(raw: Record<string, unknown>): NotamReply {
  return {
    id: String(raw.id),
    body: String(raw.body || ''),
    author_username: String(raw.author_username || 'Anonyme'),
    score: Number(raw.score) || 0,
    my_vote: Number(raw.my_vote) || 0,
    is_mine: Boolean(raw.is_mine),
    created_at: String(raw.created_at || ''),
  };
}

export async function listNotams(): Promise<NotamItem[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_notams');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    body: String(row.body || ''),
    author_username: String(row.author_username || 'Anonyme'),
    score: Number(row.score) || 0,
    my_vote: Number(row.my_vote) || 0,
    is_mine: Boolean(row.is_mine),
    created_at: String(row.created_at || ''),
    closed_at: row.closed_at ? String(row.closed_at) : null,
    replies: Array.isArray(row.replies)
      ? (row.replies as Record<string, unknown>[]).map(mapReply)
      : [],
  }));
}

export async function listMyNotams(): Promise<MyNotam[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_my_notams');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    body: String(row.body || ''),
    score: Number(row.score) || 0,
    created_at: String(row.created_at || ''),
    closed_at: row.closed_at ? String(row.closed_at) : null,
    reply_count: Number(row.reply_count) || 0,
  }));
}

export async function submitNotam(body: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('submit_notam', { p_body: body });
  if (error) {
    if (/body_too_short/i.test(error.message)) throw new Error('body_too_short');
    throw error;
  }
}

export async function replyNotam(notamId: string, body: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('reply_notam', {
    p_notam_id: notamId,
    p_body: body,
  });
  if (error) {
    if (/body_too_short/i.test(error.message)) throw new Error('body_too_short');
    if (/notam_closed/i.test(error.message)) throw new Error('notam_closed');
    if (/not_found/i.test(error.message)) throw new Error('not_found');
    throw error;
  }
}

export async function voteNotamTarget(
  targetType: 'notam' | 'reply',
  targetId: string,
  value: 1 | -1,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('vote_notam_target', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_value: value,
  });
  if (error) throw error;
}

export async function adminCloseNotam(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_close_notam', { p_id: id });
  if (error) {
    if (/not_admin/i.test(error.message)) throw new Error('not_admin');
    throw error;
  }
}

export async function adminDeleteNotam(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_delete_notam', { p_id: id });
  if (error) {
    if (/not_admin/i.test(error.message)) throw new Error('not_admin');
    if (/not_found/i.test(error.message)) throw new Error('not_found');
    throw error;
  }
}
