'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Landmark, Megaphone, ThumbsUp } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { AdminDangerConfirm } from '@/components/admin/AdminDangerConfirm';
import { GuestReadonlyBanner } from '@/components/GuestReadonlyBanner';
import { Button } from '@/components/ui/button';
import { NotamScoreVotes } from '@/components/notam/NotamScoreVotes';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isGuestMode } from '@/lib/auth/guest';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';
import {
  adminCloseAgoraMissive,
  adminDeleteMissive,
  listAgora,
  myAgoraVoteCount,
  unvoteAgoraMissive,
  voteAgoraMissive,
  type AgoraItem,
} from '@/lib/agora/api';
import {
  adminCloseNotam,
  adminDeleteNotam,
  listNotams,
  replyNotam,
  type NotamItem,
} from '@/lib/notam/api';
import { useSiteTexts } from '@/lib/site-texts/useSiteTexts';

const VOTE_LIMIT = 3;
const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

type AgoraTab = 'missives' | 'notam';

function MissivesSection({
  isAdmin,
  message,
  setMessage,
}: {
  isAdmin: boolean;
  message: string | null;
  setMessage: (m: string | null) => void;
}) {
  const { t } = useSiteTexts();
  const [items, setItems] = useState<AgoraItem[]>([]);
  const [votesUsed, setVotesUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    if (isGuestMode()) {
      try {
        const list = await listAgora();
        setItems(list);
      } catch {
        setItems([]);
      }
      setVotesUsed(VOTE_LIMIT); // aucun vote restant en invité
      return;
    }
    const [list, count] = await Promise.all([listAgora(), myAgoraVoteCount()]);
    setItems(list);
    setVotesUsed(count);
  };

  useEffect(() => {
    void reload()
      .catch(() => setMessage('Impossible de charger les missives. Verifie schema-agora.sql.'))
      .finally(() => setLoading(false));
  }, [setMessage]);

  const remaining = Math.max(0, VOTE_LIMIT - votesUsed);

  const onVote = async (id: string, currentlyVoted: boolean) => {
    if (isGuestMode()) return;
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
    if (
      !window.confirm(
        'Retirer cette missive de l Agora ? Les accords seront liberes (la missive reste dans Aeropostale).',
      )
    ) {
      return;
    }
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

  const onAdminDelete = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await adminDeleteMissive(id);
      setMessage('Missive supprimee.');
      await reload();
    } catch {
      setMessage('Suppression missive impossible.');
      throw new Error('delete_failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {t('agora.intro').trim() ? (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            {t('agora.intro')}
          </p>
        ) : (
          <span />
        )}
        {!isGuestMode() && (
          <p className="text-sm shrink-0" style={{ color: styles.textMuted }}>
            Accords :{' '}
            <span className="font-semibold" style={{ color: styles.text }}>
              {remaining}/{VOTE_LIMIT}
            </span>
          </p>
        )}
      </div>

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
              <p className="text-xs" style={{ color: styles.textMuted }}>
                #{index + 1} · {item.author_username}
                {item.is_mine ? ' (toi)' : ''}
                {item.agora_published_at
                  ? ` · ${new Date(item.agora_published_at).toLocaleString('fr-FR')}`
                  : ''}
              </p>
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
              {!isGuestMode() && (
                <Button
                  type="button"
                  size="sm"
                  variant={item.my_vote ? 'default' : 'outline'}
                  disabled={
                    busyId === item.id || (!item.my_vote && remaining <= 0)
                  }
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
              )}

              {isAdmin && !isGuestMode() && (
                <>
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
                  <AdminDangerConfirm
                    title="Supprimer cette missive ?"
                    description="Suppression definitive : retiree de l Agora et d Aeropostale. Les accords sont liberes."
                    preview={item.body}
                    disabled={busyId === item.id}
                    onConfirm={() => onAdminDelete(item.id)}
                  />
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function NotamSection({
  isAdmin,
  message,
  setMessage,
}: {
  isAdmin: boolean;
  message: string | null;
  setMessage: (m: string | null) => void;
}) {
  const { t } = useSiteTexts();
  const [items, setItems] = useState<NotamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    if (isGuestMode()) {
      try {
        const list = await listNotams();
        setItems(list.filter((n) => !n.closed_at));
      } catch {
        setItems([]);
      }
      return;
    }
    const list = await listNotams();
    setItems(list.filter((n) => !n.closed_at || isAdmin || n.is_mine));
  };

  useEffect(() => {
    void reload()
      .catch(() => setMessage('Impossible de charger les NOTAM. Verifie schema-notam-and-texts.sql.'))
      .finally(() => setLoading(false));
  }, [setMessage]);

  const onReply = async (notamId: string) => {
    if (isGuestMode()) return;
    const body = (replyDrafts[notamId] || '').trim();
    if (body.length < 2) return;
    setBusyId(notamId);
    setMessage(null);
    try {
      await replyNotam(notamId, body);
      setReplyDrafts((d) => ({ ...d, [notamId]: '' }));
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'notam_closed') setMessage('Ce NOTAM est clos.');
      else setMessage('Reponse impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const onClose = async (id: string) => {
    if (
      !window.confirm(
        'Fermer ce NOTAM ? Plus de nouvelles reponses (le fil reste visible).',
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      await adminCloseNotam(id);
      setMessage('NOTAM clos.');
      await reload();
    } catch {
      setMessage('Cloture impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    try {
      await adminDeleteNotam(id);
      setMessage('NOTAM supprime.');
      await reload();
    } catch {
      setMessage('Suppression NOTAM impossible.');
      throw new Error('delete_failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: styles.textMuted }}>
        {t('agora.notam.intro').trim() ? <>{t('agora.notam.intro')}{' '}</> : null}
        {!isGuestMode() && (
          <Link href="/boite?tab=notam" className="underline">
            Poser un NOTAM
          </Link>
        )}
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

      {!loading && items.filter((n) => !n.closed_at).length === 0 && (
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Aucun NOTAM ouvert pour le moment.
        </p>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl p-5 space-y-4"
            style={{
              backgroundColor: styles.cardBg,
              border: `1px solid ${styles.border}`,
              boxShadow: styles.shadow,
              opacity: item.closed_at ? 0.72 : 1,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs" style={{ color: styles.textMuted }}>
                {item.author_username}
                {item.is_mine ? ' (toi)' : ''}
                {` · ${new Date(item.created_at).toLocaleString('fr-FR')}`}
                {item.closed_at ? ' · Clos' : ''}
              </p>
              <NotamScoreVotes
                targetType="notam"
                targetId={item.id}
                score={item.score}
                myVote={item.my_vote}
                disabled={Boolean(item.closed_at)}
                readOnly={isGuestMode()}
                onChanged={reload}
              />
            </div>

            <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
              {item.body}
            </p>

            {isAdmin && !isGuestMode() && (
              <div className="flex flex-wrap gap-2">
                {!item.closed_at && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => onClose(item.id)}
                    className="text-emerald-700 border-emerald-200"
                  >
                    Fermer le NOTAM
                  </Button>
                )}
                <AdminDangerConfirm
                  title="Supprimer ce NOTAM ?"
                  description="Suppression definitive du NOTAM, de toutes ses reponses et des votes associes."
                  preview={item.body}
                  disabled={busyId === item.id}
                  onConfirm={() => onDelete(item.id)}
                />
              </div>
            )}

            <div className="space-y-3 border-t pt-3" style={{ borderColor: styles.border }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: styles.textMuted }}>
                Reponses ({item.replies.length})
              </p>

              {item.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-lg p-3 space-y-2"
                  style={{ backgroundColor: '#f6efe4' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs" style={{ color: styles.textMuted }}>
                      {reply.author_username}
                      {reply.is_mine ? ' (toi)' : ''}
                      {` · ${new Date(reply.created_at).toLocaleString('fr-FR')}`}
                    </p>
                    <NotamScoreVotes
                      targetType="reply"
                      targetId={reply.id}
                      score={reply.score}
                      myVote={reply.my_vote}
                      disabled={Boolean(item.closed_at)}
                      readOnly={isGuestMode()}
                      onChanged={reload}
                    />
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                    {reply.body}
                  </p>
                </div>
              ))}

              {!item.closed_at && !isGuestMode() && (
                <div className="space-y-2">
                  <textarea
                    value={replyDrafts[item.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Ta reponse..."
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{ borderColor: styles.border, color: styles.text }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      busyId === item.id || (replyDrafts[item.id] || '').trim().length < 2
                    }
                    onClick={() => onReply(item.id)}
                    style={{ backgroundColor: styles.text, color: styles.background }}
                  >
                    Repondre
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AgoraContent() {
  const searchParams = useSearchParams();
  const initial: AgoraTab = searchParams.get('tab') === 'notam' ? 'notam' : 'missives';
  const [tab, setTab] = useState<AgoraTab>(initial);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'notam' ? 'notam' : 'missives');
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAdmin(user?.email === ADMIN_EMAIL);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

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
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <GuestReadonlyBanner context="l'Agora" />

        <div
          className="flex rounded-xl p-1 gap-1"
          style={{
            backgroundColor: styles.cardBg,
            border: `1px solid ${styles.border}`,
            boxShadow: styles.shadow,
          }}
        >
          <button
            type="button"
            onClick={() => setTab('missives')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: tab === 'missives' ? styles.text : 'transparent',
              color: tab === 'missives' ? styles.background : styles.textMuted,
            }}
          >
            <ThumbsUp className="h-4 w-4" /> Missives
          </button>
          <button
            type="button"
            onClick={() => setTab('notam')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: tab === 'notam' ? styles.text : 'transparent',
              color: tab === 'notam' ? styles.background : styles.textMuted,
            }}
          >
            <Megaphone className="h-4 w-4" /> NOTAM
          </button>
        </div>

        {tab === 'missives' ? (
          <MissivesSection isAdmin={isAdmin} message={message} setMessage={setMessage} />
        ) : (
          <NotamSection isAdmin={isAdmin} message={message} setMessage={setMessage} />
        )}
      </div>
    </main>
  );
}

export default function AgoraPage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div
            className="min-h-screen flex items-center justify-center text-sm"
            style={{ backgroundColor: styles.background, color: styles.textMuted }}
          >
            Chargement...
          </div>
        }
      >
        <AgoraContent />
      </Suspense>
    </AuthGate>
  );
}
