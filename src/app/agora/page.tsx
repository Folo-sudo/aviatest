'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, ThumbsUp } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';
import {
  adminCloseAgoraMissive,
  listAgora,
  myAgoraVoteCount,
  unvoteAgoraMissive,
  voteAgoraMissive,
  type AgoraItem,
} from '@/lib/agora/api';

const VOTE_LIMIT = 3;
const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

function AgoraContent() {
  const [items, setItems] = useState<AgoraItem[]>([]);
  const [votesUsed, setVotesUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const [list, count] = await Promise.all([listAgora(), myAgoraVoteCount()]);
    setItems(list);
    setVotesUsed(count);
  };

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAdmin(user?.email === ADMIN_EMAIL);
        await reload();
      } catch {
        setMessage('Impossible de charger l Agora. Verifie schema-agora.sql.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const remaining = Math.max(0, VOTE_LIMIT - votesUsed);

  const onVote = async (id: string, currentlyVoted: boolean) => {
    setBusyId(id);
    setMessage(null);
    try {
      if (currentlyVoted) await unvoteAgoraMissive(id);
      else await voteAgoraMissive(id);
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'vote_limit_reached') {
        setMessage('Tu as deja donne ton accord a 3 missives.');
      } else {
        setMessage('Vote impossible.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const onAdminClose = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await adminCloseAgoraMissive(id);
      setMessage('Missive retiree de l Agora — votes liberes.');
      await reload();
    } catch {
      setMessage('Cloture admin impossible.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: styles.background }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: styles.background, borderColor: styles.border }}
      >
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Accueil
              </Button>
            </Link>
            <Landmark className="h-5 w-5" style={{ color: styles.text }} />
            <h1 className="text-lg font-bold" style={{ color: styles.text }}>
              Agora
            </h1>
          </div>
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Accords restants :{' '}
            <span className="font-semibold" style={{ color: styles.text }}>
              {remaining}/{VOTE_LIMIT}
            </span>
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Les missives publiees ici recueillent des accords (max {VOTE_LIMIT} par personne).
          Plus une missive a d&apos;accords, plus elle est urgente pour l&apos;admin.
          Publie les tiennes depuis l&apos;onglet Missives de la{' '}
          <Link href="/boite?tab=missives" className="underline">
            Boite
          </Link>
          .
        </p>

        {message && (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            {message}
          </p>
        )}

        {loading && (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Chargement...
          </p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Aucune missive dans l Agora pour le moment.
          </p>
        )}

        <div className="space-y-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="rounded-xl p-5 space-y-3"
              style={{
                backgroundColor: styles.cardBg,
                border: `1px solid ${styles.border}`,
                boxShadow: styles.shadow,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs" style={{ color: styles.textMuted }}>
                    #{index + 1} · {item.author_username}
                    {item.is_mine ? ' (toi)' : ''}
                    {item.agora_published_at
                      ? ` · ${new Date(item.agora_published_at).toLocaleString('fr-FR')}`
                      : ''}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#f3f2f1', color: styles.text }}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {item.vote_count}
                </span>
              </div>

              <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                {item.body}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={item.my_vote ? 'default' : 'outline'}
                  disabled={busyId === item.id || (!item.my_vote && remaining <= 0)}
                  onClick={() => onVote(item.id, item.my_vote)}
                  style={
                    item.my_vote
                      ? { backgroundColor: styles.text, color: styles.background }
                      : undefined
                  }
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                  {item.my_vote ? 'Retirer mon accord' : 'Donner mon accord'}
                </Button>

                {isAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => onAdminClose(item.id)}
                    className="text-emerald-700 border-emerald-200"
                  >
                    Marquer comme repondue
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function AgoraPage() {
  return (
    <AuthGate>
      <AgoraContent />
    </AuthGate>
  );
}
