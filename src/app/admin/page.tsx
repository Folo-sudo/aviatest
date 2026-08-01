'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';
import { EXERCISES } from '@/lib/data/exercises';
import {
  BUG_STATUS_COLOR,
  BUG_STATUS_LABEL,
  adminReplyBug,
  adminReplyMissive,
  adminSetBugStatus,
  listBugsAdmin,
  listMissivesAdmin,
  type BugReport,
  type BugStatus,
  type Missive,
} from '@/lib/feedback/api';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

const STATUSES: BugStatus[] = ['envoye', 'en_cours', 'corrige'];

function exerciseLabel(id: string): string {
  if (!id || id === 'autre') return 'Autre';
  return EXERCISES.find((e) => e.id === id)?.title || id;
}

function StatusBadge({ status }: { status: BugStatus }) {
  const c = BUG_STATUS_COLOR[status] || BUG_STATUS_COLOR.envoye;
  return (
    <span
      className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {BUG_STATUS_LABEL[status] || status}
    </span>
  );
}

function AdminContent() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [missives, setMissives] = useState<Missive[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const [b, m] = await Promise.all([listBugsAdmin(), listMissivesAdmin()]);
    setBugs(b);
    setMissives(m);
  };

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || user.email !== ADMIN_EMAIL) {
          router.replace('/');
          return;
        }
        setAllowed(true);
        await reload();
      } catch {
        setError('Chargement admin impossible.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const setStatus = async (id: string, status: BugStatus) => {
    setBusyId(id);
    try {
      await adminSetBugStatus(id, status);
      setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch {
      setError('Maj statut impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const sendBugReply = async (id: string) => {
    const reply = (replyDrafts[id] || '').trim();
    if (!reply) return;
    setBusyId(id);
    try {
      await adminReplyBug(id, reply);
      setReplyDrafts((d) => ({ ...d, [id]: '' }));
      await reload();
    } catch {
      setError('Reponse beug impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const sendMissiveReply = async (id: string) => {
    const reply = (replyDrafts[id] || '').trim();
    if (!reply) return;
    setBusyId(id);
    try {
      await adminReplyMissive(id, reply);
      setReplyDrafts((d) => ({ ...d, [id]: '' }));
      await reload();
    } catch {
      setError('Reponse missive impossible.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ backgroundColor: styles.background, color: styles.textMuted }}
      >
        Verification...
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="min-h-screen" style={{ backgroundColor: styles.background }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: styles.background, borderColor: styles.border }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Accueil
            </Button>
          </Link>
          <Inbox className="h-5 w-5" style={{ color: styles.text }} />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Boite admin
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8 max-w-3xl">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: styles.text }}>
            Beugs ({bugs.length})
          </h2>
          <div className="space-y-3">
            {bugs.length === 0 && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                Aucun beug.
              </p>
            )}
            {bugs.map((b) => (
              <article
                key={b.id}
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs" style={{ color: styles.textMuted }}>
                    {b.email} · {exerciseLabel(b.exercise_id)} ·{' '}
                    {new Date(b.created_at).toLocaleString('fr-FR')}
                  </p>
                  <StatusBadge status={(b.status as BugStatus) || 'envoye'} />
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                  {b.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={b.status === s ? 'default' : 'outline'}
                      disabled={busyId === b.id}
                      onClick={() => setStatus(b.id, s)}
                      style={
                        b.status === s
                          ? {
                              backgroundColor: BUG_STATUS_COLOR[s].text,
                              color: '#fff',
                            }
                          : undefined
                      }
                    >
                      {BUG_STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
                {b.admin_reply && (
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: '#f3f2f1', border: `1px solid ${styles.border}` }}
                  >
                    <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: styles.textMuted }}>
                      Reponse actuelle
                    </p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                      {b.admin_reply}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <textarea
                    className="w-full min-h-[72px] rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: styles.border, color: styles.text }}
                    placeholder="Repondre a l'utilisateur..."
                    value={replyDrafts[b.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({ ...d, [b.id]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === b.id || !(replyDrafts[b.id] || '').trim()}
                    onClick={() => sendBugReply(b.id)}
                    style={{ backgroundColor: styles.text, color: styles.background }}
                  >
                    Envoyer la reponse
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: styles.text }}>
            Missives ({missives.length})
          </h2>
          <div className="space-y-3">
            {missives.length === 0 && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                Aucune missive.
              </p>
            )}
            {missives.map((m) => (
              <article
                key={m.id}
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <p className="text-xs" style={{ color: styles.textMuted }}>
                  {m.email} · {new Date(m.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                  {m.body}
                </p>
                {m.admin_reply && (
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: '#f3f2f1', border: `1px solid ${styles.border}` }}
                  >
                    <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: styles.textMuted }}>
                      Reponse actuelle
                    </p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                      {m.admin_reply}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <textarea
                    className="w-full min-h-[72px] rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: styles.border, color: styles.text }}
                    placeholder="Repondre a l'utilisateur..."
                    value={replyDrafts[m.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({ ...d, [m.id]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === m.id || !(replyDrafts[m.id] || '').trim()}
                    onClick={() => sendMissiveReply(m.id)}
                    style={{ backgroundColor: styles.text, color: styles.background }}
                  >
                    Envoyer la reponse
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminContent />
    </AuthGate>
  );
}
