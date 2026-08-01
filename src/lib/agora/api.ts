import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type AgoraItem = {
  id: string;
  body: string;
  author_username: string;
  vote_count: number;
  created_at: string;
  agora_published_at: string | null;
  my_vote: boolean;
  is_mine: boolean;
};

export async function listAgora(): Promise<AgoraItem[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_agora');
  if (error) throw error;
  return ((data || []) as AgoraItem[]).map((row) => ({
    ...row,
    vote_count: Number(row.vote_count) || 0,
    my_vote: Boolean(row.my_vote),
    is_mine: Boolean(row.is_mine),
  }));
}

export async function myAgoraVoteCount(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('my_agora_vote_count');
  if (error) throw error;
  return Number(data) || 0;
}

export async function publishMissiveToAgora(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('publish_missive_to_agora', { p_id: id });
  if (error) {
    if (/already_in_agora/i.test(error.message)) throw new Error('already_in_agora');
    if (/not_owner/i.test(error.message)) throw new Error('not_owner');
    throw error;
  }
}

export async function unpublishMissiveFromAgora(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('unpublish_missive_from_agora', { p_id: id });
  if (error) throw error;
}

export async function voteAgoraMissive(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('vote_agora_missive', { p_id: id });
  if (error) {
    if (/vote_limit_reached/i.test(error.message)) throw new Error('vote_limit_reached');
    if (/already_voted/i.test(error.message)) throw new Error('already_voted');
    if (/not_in_agora/i.test(error.message)) throw new Error('not_in_agora');
    throw error;
  }
}

export async function unvoteAgoraMissive(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('unvote_agora_missive', { p_id: id });
  if (error) throw error;
}

export async function adminCloseAgoraMissive(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('admin_close_agora_missive', { p_id: id });
  if (error) {
    if (/not_admin/i.test(error.message)) throw new Error('not_admin');
    if (/not_in_agora/i.test(error.message)) throw new Error('not_in_agora');
    throw error;
  }
}
