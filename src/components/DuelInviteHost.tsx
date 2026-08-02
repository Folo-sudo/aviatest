'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { EXERCISES } from '@/lib/data/exercises';
import { amIInExercise } from '@/lib/presence/exercisePresence';
import {
  listPendingDuelInvites,
  listMyDuels,
  openDuelTab,
  respondDuel,
  subscribeMyDuels,
  type PendingDuelInvite,
} from '@/lib/duels/api';

const OPENED_KEY = 'aviatest-duel-opened';

function exerciseTitle(id: string): string {
  return EXERCISES.find((e) => e.id === id)?.title || id;
}

function exerciseSlug(id: string): string {
  return EXERCISES.find((e) => e.id === id)?.slug || id;
}

function markOpened(duelId: string): void {
  try {
    const raw = sessionStorage.getItem(OPENED_KEY);
    const set = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    set.add(duelId);
    sessionStorage.setItem(OPENED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function wasOpened(duelId: string): boolean {
  try {
    const raw = sessionStorage.getItem(OPENED_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return list.includes(duelId);
  } catch {
    return false;
  }
}

/**
 * Global: pending duel invites (deferred if in exercise) + open tab when duel goes active.
 */
export default function DuelInviteHost() {
  const [userId, setUserId] = useState<string | null>(null);
  const [invite, setInvite] = useState<PendingDuelInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inExerciseRef = useRef(false);

  const maybeOpenActive = useCallback(async () => {
    try {
      const duels = await listMyDuels();
      for (const d of duels) {
        if (d.status === 'active' && d.launch_at && !wasOpened(d.id)) {
          markOpened(d.id);
          openDuelTab(exerciseSlug(d.exercise_id), d.id);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refreshInvites = useCallback(async () => {
    try {
      const busyNow = await amIInExercise();
      inExerciseRef.current = busyNow;
      if (busyNow) {
        setInvite(null);
        return;
      }
      const list = await listPendingDuelInvites();
      setInvite(list[0] || null);
    } catch {
      /* schema missing */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);
      await refreshInvites();
      await maybeOpenActive();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshInvites, maybeOpenActive]);

  useEffect(() => {
    if (!userId) return;
    const channel = subscribeMyDuels(userId, () => {
      void refreshInvites();
      void maybeOpenActive();
    });
    const poll = window.setInterval(() => {
      void refreshInvites();
      void maybeOpenActive();
    }, 8000);
    return () => {
      void getSupabaseBrowserClient().removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [userId, refreshInvites, maybeOpenActive]);

  const onRespond = async (accept: boolean) => {
    if (!invite) return;
    setBusy(true);
    setMessage(null);
    try {
      const duel = await respondDuel(invite.id, accept);
      setInvite(null);
      if (accept) {
        markOpened(duel.id);
        openDuelTab(exerciseSlug(duel.exercise_id), duel.id);
        setMessage('Duel accepte — nouvel onglet ouvert.');
      }
      await maybeOpenActive();
    } catch {
      setMessage('Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!invite && !message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[min(360px,92vw)] space-y-2">
      {message && (
        <p className="rounded-lg bg-white border border-[#e0dedb] px-3 py-2 text-sm text-[#37322f] shadow-lg">
          {message}
        </p>
      )}
      {invite && (
        <div className="rounded-xl border border-[#e0dedb] bg-white p-4 shadow-xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#605a57]">
            Defi en duel
          </p>
          <p className="text-sm text-[#37322f]">
            <span className="font-semibold">{invite.challenger_username}</span> te
            provoque sur{' '}
            <span className="font-semibold">{exerciseTitle(invite.exercise_id)}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void onRespond(true)}
              style={{ backgroundColor: '#37322f', color: '#fbfaf9' }}
            >
              Accepter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void onRespond(false)}
            >
              Refuser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
