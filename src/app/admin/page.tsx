'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import { getExerciseById } from '@/lib/data/exercises';
import { listExerciseUsage, type ExerciseUsageRow } from '@/lib/usage/api';
import AuthGate from '@/components/AuthGate';
import { AdminDangerConfirm } from '@/components/admin/AdminDangerConfirm';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';
import { EXERCISES } from '@/lib/data/exercises';
import {
  BUG_STATUS_COLOR,
  BUG_STATUS_LABEL,
  adminDeleteMissive,
  adminReplyBug,
  adminReplyMissive,
  adminSetBugStatus,
  listBugsAdmin,
  listMissivesAdmin,
  type BugReport,
  type BugStatus,
  type Missive,
} from '@/lib/feedback/api';
import { adminDeleteNotam, listNotams, type NotamItem } from '@/lib/notam/api';
import { listSiteTexts, upsertSiteText } from '@/lib/site-texts/api';
import { SITE_TEXT_DEFAULTS, SITE_TEXT_GROUPS } from '@/lib/site-texts/defaults';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

const STATUSES: BugStatus[] = ['envoye', 'en_cours', 'corrige'];

type AdminTab = 'beugs' | 'missives' | 'notam' | 'textes' | 'usage';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'beugs', label: 'Beugs' },
  { id: 'missives', label: 'Missives' },
  { id: 'notam', label: 'NOTAM' },
  { id: 'textes', label: 'Textes' },
  { id: 'usage', label: 'Usage tests' },
];

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
  const [tab, setTab] = useState<AdminTab>('beugs');
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [missives, setMissives] = useState<Missive[]>([]);
  const [notams, setNotams] = useState<NotamItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const [b, m, n] = await Promise.all([
      listBugsAdmin(),
      listMissivesAdmin(),
      listNotams(),
    ]);
    setBugs(b);
    setMissives(m);
    setNotams(n);
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

  const deleteMissive = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await adminDeleteMissive(id);
      await reload();
    } catch {
      setError('Suppression missive impossible.');
      throw new Error('delete_failed');
    } finally {
      setBusyId(null);
    }
  };

  const deleteNotam = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await adminDeleteNotam(id);
      await reload();
    } catch {
      setError('Suppression NOTAM impossible.');
      throw new Error('delete_failed');
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
            Aeropostale admin
          </h1>
        </div>
        <div className="container mx-auto px-4 pb-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="rounded-full px-3 py-1 text-sm font-medium"
              style={
                tab === t.id
                  ? { backgroundColor: styles.text, color: styles.background }
                  : { backgroundColor: '#fff', color: styles.text, border: `1px solid ${styles.border}` }
              }
            >
              {t.label}
              {t.id === 'beugs' ? ` (${bugs.length})` : ''}
              {t.id === 'missives' ? ` (${missives.length})` : ''}
              {t.id === 'notam' ? ` (${notams.length})` : ''}
            </button>
          ))}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8 max-w-3xl">
        {error && <p className="text-sm text-red-500">{error}</p>}

        {tab === 'usage' && <UsageSection onError={setError} />}

        {tab === 'textes' && <SiteTextsSection onError={setError} />}

        {tab === 'beugs' && (
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
        )}

        {tab === 'missives' && (
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
                  {m.in_agora ? ' · Dans l Agora' : ''}
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === m.id || !(replyDrafts[m.id] || '').trim()}
                      onClick={() => sendMissiveReply(m.id)}
                      style={{ backgroundColor: styles.text, color: styles.background }}
                    >
                      Envoyer la reponse
                    </Button>
                    <AdminDangerConfirm
                      title="Supprimer cette missive ?"
                      description="Suppression definitive (Agora + Aeropostale). Irreversible."
                      preview={m.body}
                      disabled={busyId === m.id}
                      onConfirm={() => deleteMissive(m.id)}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        )}

        {tab === 'notam' && (
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: styles.text }}>
            NOTAM ({notams.length})
          </h2>
          <div className="space-y-3">
            {notams.length === 0 && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                Aucun NOTAM.
              </p>
            )}
            {notams.map((n) => (
              <article
                key={n.id}
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                  opacity: n.closed_at ? 0.75 : 1,
                }}
              >
                <p className="text-xs" style={{ color: styles.textMuted }}>
                  {n.author_username} · {new Date(n.created_at).toLocaleString('fr-FR')}
                  {n.closed_at ? ' · Clos' : ''} · score {n.score} · {n.replies.length} reponse
                  {n.replies.length === 1 ? '' : 's'}
                </p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                  {n.body}
                </p>
                <AdminDangerConfirm
                  title="Supprimer ce NOTAM ?"
                  description="Suppression definitive du NOTAM, reponses et votes."
                  preview={n.body}
                  disabled={busyId === n.id}
                  onConfirm={() => deleteNotam(n.id)}
                />
              </article>
            ))}
          </div>
        </section>
        )}
      </div>
    </main>
  );
}

function pct(part: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((part / total) * 100)} %`;
}

function UsageSection({ onError }: { onError: (msg: string | null) => void }) {
  const [rows, setRows] = useState<ExerciseUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listExerciseUsage();
        data.sort((a, b) => b.starts - a.starts || b.opens - a.opens);
        setRows(data);
      } catch {
        onError('Usage : execute supabase/schema-exercise-usage.sql dans l editeur SQL.');
      } finally {
        setLoading(false);
      }
    })();
  }, [onError]);

  const titleOf = (id: string) => getExerciseById(id)?.title || id;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: styles.text }}>
          Usage des tests
        </h2>
        <p className="mt-1 text-sm" style={{ color: styles.textMuted }}>
          Compteurs anonymes (pas de cookie, pas d identite). Volumes, pas de visiteurs
          uniques. Journee = fuseau Paris.
        </p>
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Chargement...
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Aucun hit pour l instant. Ouvre un exercice puis clique Commencer / Jouer.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: styles.border }}>
          <table className="w-full text-sm" style={{ color: styles.text }}>
            <thead>
              <tr className="text-left text-xs" style={{ color: styles.textMuted, backgroundColor: '#f3f2f1' }}>
                <th className="px-3 py-2 font-medium">Test</th>
                <th className="px-3 py-2 font-medium text-right">Ouverts</th>
                <th className="px-3 py-2 font-medium text-right">Parties</th>
                <th className="px-3 py-2 font-medium text-right">Finis</th>
                <th className="px-3 py-2 font-medium text-right">Taux fin</th>
                <th className="px-3 py-2 font-medium text-right">7 j</th>
                <th className="px-3 py-2 font-medium text-right">Mobile</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.exercise_id} className="border-t" style={{ borderColor: styles.border }}>
                  <td className="px-3 py-2">{titleOf(r.exercise_id)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.opens}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{r.starts}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.completes}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(r.completes, r.starts)}</td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: styles.textMuted }}>
                    {r.starts_7d} parties
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums" style={{ color: styles.textMuted }}>
                    {r.starts_mobile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SiteTextsSection({ onError }: { onError: (msg: string | null) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listSiteTexts();
        const map: Record<string, string> = {};
        rows.forEach((r) => {
          map[r.key] = r.value;
        });
        setSaved(map);
        setDrafts({ ...SITE_TEXT_DEFAULTS, ...map });
      } catch {
        setDrafts({ ...SITE_TEXT_DEFAULTS });
        onError('Textes : schema-notam-and-texts.sql manquant ?');
      } finally {
        setLoading(false);
      }
    })();
  }, [onError]);

  const save = async (key: string) => {
    setBusyKey(key);
    setOkMsg(null);
    onError(null);
    try {
      const value = drafts[key] ?? '';
      await upsertSiteText(key, value);
      setSaved((s) => ({ ...s, [key]: value }));
      setOkMsg(`Enregistre : ${key}`);
    } catch {
      onError('Enregistrement texte impossible.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: styles.text }}>
          Textes du site
        </h2>
        <p className="mt-1 text-sm" style={{ color: styles.textMuted }}>
          Modifie les textes vitrine. Champ vide + enregistre = garde le fallback code au prochain
          chargement si tu mets une valeur ; pour revenir au defaut, colle le texte par defaut puis
          enregistre (ou laisse le fallback en ne mettant rien d utile — les valeurs vides sont
          ignorees cote lecteur).
        </p>
        {okMsg && <p className="mt-2 text-sm text-emerald-600">{okMsg}</p>}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Chargement des textes...
        </p>
      ) : (
        SITE_TEXT_GROUPS.map((group) => (
          <div key={group.id} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: styles.textMuted }}>
              {group.label}
            </h3>
            {group.keys.map((key) => (
              <article
                key={key}
                className="rounded-xl p-4 space-y-2"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-xs" style={{ color: styles.textMuted }}>
                    {key}
                  </code>
                  {saved[key] !== undefined && saved[key] !== '' && (
                    <span className="text-[11px] text-emerald-700">Personnalise</span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: styles.textMuted }}>
                  Defaut : {SITE_TEXT_DEFAULTS[key]}
                </p>
                <textarea
                  className="w-full min-h-[72px] rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: styles.border, color: styles.text }}
                  value={drafts[key] ?? SITE_TEXT_DEFAULTS[key] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busyKey === key}
                  onClick={() => save(key)}
                  style={{ backgroundColor: styles.text, color: styles.background }}
                >
                  {busyKey === key ? '...' : 'Enregistrer'}
                </Button>
              </article>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

export default function AdminPage() {
  return (
    <AuthGate requireAccount>
      <AdminContent />
    </AuthGate>
  );
}
