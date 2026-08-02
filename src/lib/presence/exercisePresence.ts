import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const HEARTBEAT_MS = 15000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activeCount = 0;

async function push(busy: boolean): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc('set_in_exercise', { p_busy: busy });
  } catch {
    /* ignore */
  }
}

/** Mark user as currently playing an exercise (heartbeat). */
export function startExercisePresence(): void {
  if (typeof window === 'undefined') return;
  activeCount += 1;
  if (activeCount > 1) return;
  void push(true);
  heartbeatTimer = setInterval(() => {
    void push(true);
  }, HEARTBEAT_MS);

  const onUnload = () => {
    void push(false);
  };
  window.addEventListener('pagehide', onUnload);
  window.addEventListener('beforeunload', onUnload);
}

/** Clear in-exercise flag when leaving play phase. */
export function stopExercisePresence(): void {
  if (typeof window === 'undefined') return;
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  void push(false);
}

export async function amIInExercise(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('user_presence')
      .select('in_exercise')
      .eq('user_id', user.id)
      .maybeSingle();
    return Boolean(data?.in_exercise);
  } catch {
    return false;
  }
}
