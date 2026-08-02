import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type Friend = {
  user_id: string;
  username: string;
  in_exercise: boolean;
  friendship_id: string;
  since: string;
};

export type FriendRequest = {
  id: string;
  direction: 'incoming' | 'outgoing';
  other_user_id: string;
  other_username: string;
  status: string;
  created_at: string;
};

export async function listFriends(): Promise<Friend[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_friends');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    user_id: String(row.user_id),
    username: String(row.username || ''),
    in_exercise: Boolean(row.in_exercise),
    friendship_id: String(row.friendship_id),
    since: String(row.since || ''),
  }));
}

export async function listFriendRequests(): Promise<FriendRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_friend_requests');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    direction: row.direction === 'outgoing' ? 'outgoing' : 'incoming',
    other_user_id: String(row.other_user_id),
    other_username: String(row.other_username || ''),
    status: String(row.status || ''),
    created_at: String(row.created_at || ''),
  }));
}

export async function sendFriendRequest(pseudo: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('send_friend_request', {
    p_pseudo: pseudo.trim(),
  });
  if (error) {
    const m = error.message || '';
    if (/not_found/i.test(m)) throw new Error('not_found');
    if (/cannot_friend_self/i.test(m)) throw new Error('cannot_friend_self');
    if (/already_friends/i.test(m)) throw new Error('already_friends');
    if (/already_pending/i.test(m)) throw new Error('already_pending');
    throw error;
  }
}

export async function respondFriendRequest(
  id: string,
  accept: boolean,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('respond_friend_request', {
    p_id: id,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function removeFriend(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('remove_friend', {
    p_user_id: userId,
  });
  if (error) throw error;
}
