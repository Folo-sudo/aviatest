'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Bug, Mail, MessageSquare } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { EXERCISES } from '@/lib/data/exercises';
import {
  BUG_STATUS_COLOR,
  BUG_STATUS_LABEL,
  getBugCount,
  getMissiveCount,
  listMyBugs,
  listMyMissives,
  submitBug,
  submitMissive,
  type BugReport,
  type BugStatus,
  type Missive,
} from '@/lib/feedback/api';
import { publishMissiveToAgora, unpublishMissiveFromAgora } from '@/lib/agora/api';

const BUG_LIMIT = 10;
const MISSIVE_LIMIT = 2;

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

type Tab = 'beugs' | 'missives';

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

function exerciseLabel(id: string): string {
  if (!id || id === 'autre') return 'Autre';
  return EXERCISES.find((e) => e.id === id)?.title || id;
}

function BeugsPanel() {
  const readyExercises = useMemo(
    () => EXERCISES.filter((e) => e.ready).sort((a, b) => a.title.localeCompare(b.title, 'fr')),
    [],
  );
  const [exerciseId, setExerciseId] = useState('autre');
  const [body, setBody] = useState('');
  const [count, setCount] = useState(0);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const [c, list] = await Promise.all([getBugCount(), listMyBugs()]);
    setCount(c);
    setBugs(list);
  };

  useEffect(() => {
    void reload().catch(() => {
      setCount(0);
      setBugs([]);
    });
  }, []);

  const remaining = Math.max(0, BUG_LIMIT - count);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await submitBug(body, exerciseId);
      setBody('');
      setMessage('Beug envoye. Merci !');
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'bug_limit_reached') setMessage('Limite de 10 beugs atteinte.');
      else if (msg === 'body_too_short') setMessage('Decris le beug (10 caracteres min).');
      else setMessage('Envoi impossible. Verifie Supabase (schema-feedback-v2).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: styles.cardBg,
          border: `1px solid ${styles.border}`,
          boxShadow: styles.shadow,
        }}
      >
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Choisis le test concerne, puis decris le probleme. {remaining} signalement
          {remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''} (max {BUG_LIMIT}).
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: styles.textMuted }}>
              Test concerne
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
              style={{ borderColor: styles.border, color: styles.text }}
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              required
            >
              <option value="autre">Autre (aucun test precis)</option>
              {readyExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full min-h-[140px] rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: styles.border, color: styles.text }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ex. Sur Attention 2, le compteur reste a 0 apres validation..."
            maxLength={4000}
            required
          />
          {message && (
            <p
              className={`text-sm ${message.includes('Merci') ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {message}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || remaining <= 0 || body.trim().length < 10}
            className="w-full"
            style={{ backgroundColor: styles.text, color: styles.background }}
          >
            {busy ? 'Envoi...' : 'Envoyer le beug'}
          </Button>
        </form>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: styles.text }}>
          Mes beugs ({bugs.length})
        </h2>
        <div className="space-y-3">
          {bugs.length === 0 && (
            <p className="text-sm" style={{ color: styles.textMuted }}>
              Aucun beug envoye pour le moment.
            </p>
          )}
          {bugs.map((b) => (
            <article
              key={b.id}
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: styles.cardBg,
                border: `1px solid ${styles.border}`,
                boxShadow: styles.shadow,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs" style={{ color: styles.textMuted }}>
                  {exerciseLabel(b.exercise_id)} ·{' '}
                  {new Date(b.created_at).toLocaleString('fr-FR')}
                </p>
                <StatusBadge status={(b.status as BugStatus) || 'envoye'} />
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                {b.body}
              </p>
              {b.admin_reply && (
                <div
                  className="rounded-lg px-3 py-2 mt-2"
                  style={{ backgroundColor: '#f3f2f1', border: `1px solid ${styles.border}` }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: styles.textMuted }}
                  >
                    Reponse admin
                    {b.admin_reply_at
                      ? ` · ${new Date(b.admin_reply_at).toLocaleString('fr-FR')}`
                      : ''}
                  </p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                    {b.admin_reply}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MissivesPanel() {
  const [body, setBody] = useState('');
  const [count, setCount] = useState(0);
  const [missives, setMissives] = useState<Missive[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const [c, list] = await Promise.all([getMissiveCount(), listMyMissives()]);
    setCount(c);
    setMissives(list);
  };

  useEffect(() => {
    void reload().catch(() => {
      setCount(0);
      setMissives([]);
    });
  }, []);

  const remaining = Math.max(0, MISSIVE_LIMIT - count);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await submitMissive(body);
      setBody('');
      setMessage('Missive envoyee au grand codeur.');
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'missive_limit_reached') setMessage('Limite de 2 missives atteinte.');
      else if (msg === 'body_too_short') setMessage('Ecris un peu plus (10 caracteres min).');
      else setMessage('Envoi impossible. Verifie Supabase (schema-feedback-v2).');
    } finally {
      setBusy(false);
    }
  };

  const onAgoraToggle = async (m: Missive) => {
    setBusyId(m.id);
    setMessage(null);
    try {
      if (m.in_agora) {
        await unpublishMissiveFromAgora(m.id);
        setMessage('Missive retiree de l Agora.');
      } else {
        await publishMissiveToAgora(m.id);
        setMessage('Missive publiee dans l Agora.');
      }
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'already_in_agora') setMessage('Deja dans l Agora.');
      else setMessage('Action Agora impossible. Verifie schema-agora.sql.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: styles.cardBg,
          border: `1px solid ${styles.border}`,
          boxShadow: styles.shadow,
        }}
      >
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Idee, compliment ou plainte diplomatique. {remaining} missive
          {remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} (max {MISSIVE_LIMIT}).
          Tu peux ensuite publier une missive dans l&apos;{' '}
          <Link href="/agora" className="underline">
            Agora
          </Link>{' '}
          pour recueillir des accords.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            className="w-full min-h-[140px] rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: styles.border, color: styles.text }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Cher grand codeur..."
            maxLength={4000}
            required
          />
          {message && (
            <p
              className={`text-sm ${
                message.includes('envoyee') || message.includes('publiee') || message.includes('retiree')
                  ? 'text-emerald-600'
                  : 'text-red-500'
              }`}
            >
              {message}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || remaining <= 0 || body.trim().length < 10}
            className="w-full"
            style={{ backgroundColor: styles.text, color: styles.background }}
          >
            {busy ? 'Envoi...' : 'Envoyer la missive'}
          </Button>
        </form>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: styles.text }}>
          Mes missives ({missives.length})
        </h2>
        <div className="space-y-3">
          {missives.length === 0 && (
            <p className="text-sm" style={{ color: styles.textMuted }}>
              Aucune missive envoyee pour le moment.
            </p>
          )}
          {missives.map((m) => (
            <article
              key={m.id}
              className="rounded-xl p-4 space-y-2"
              style={{
                backgroundColor: styles.cardBg,
                border: `1px solid ${styles.border}`,
                boxShadow: styles.shadow,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs" style={{ color: styles.textMuted }}>
                  {new Date(m.created_at).toLocaleString('fr-FR')}
                  {m.in_agora ? ' · Dans l Agora' : ''}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === m.id}
                  onClick={() => onAgoraToggle(m)}
                >
                  {m.in_agora ? 'Retirer de l Agora' : 'Publier dans l Agora'}
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                {m.body}
              </p>
              {m.admin_reply && (
                <div
                  className="rounded-lg px-3 py-2 mt-2"
                  style={{ backgroundColor: '#f3f2f1', border: `1px solid ${styles.border}` }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: styles.textMuted }}
                  >
                    Reponse admin
                    {m.admin_reply_at
                      ? ` · ${new Date(m.admin_reply_at).toLocaleString('fr-FR')}`
                      : ''}
                  </p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                    {m.admin_reply}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function BoiteContent() {
  const searchParams = useSearchParams();
  const initial =
    searchParams.get('tab') === 'missives' ? 'missives' : ('beugs' as Tab);
  const [tab, setTab] = useState<Tab>(initial);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'missives' ? 'missives' : 'beugs');
  }, [searchParams]);

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
          <MessageSquare className="h-5 w-5" style={{ color: styles.text }} />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Boite
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
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
            onClick={() => setTab('beugs')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'beugs' ? styles.text : 'transparent',
              color: tab === 'beugs' ? styles.background : styles.textMuted,
            }}
          >
            <Bug className="h-4 w-4" /> Beugs
          </button>
          <button
            type="button"
            onClick={() => setTab('missives')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'missives' ? styles.text : 'transparent',
              color: tab === 'missives' ? styles.background : styles.textMuted,
            }}
          >
            <Mail className="h-4 w-4" /> Missives
          </button>
        </div>

        {tab === 'beugs' ? <BeugsPanel /> : <MissivesPanel />}
      </div>
    </main>
  );
}

export default function BoitePage() {
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
        <BoiteContent />
      </Suspense>
    </AuthGate>
  );
}
