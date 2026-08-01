'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Trophy, ArrowLeft, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { EXERCISES } from '@/lib/data/exercises';
import {
  listCompetitions,
  listTopScoresGrouped,
  type Competition,
  type CompetitionScore,
} from '@/lib/stadium/competitions';
import { setActiveCompetitionId } from '@/lib/stadium/settingsKeys';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
  gold: '#c9a227',
  goldSoft: '#f5e6b8',
  silver: '#9aa0a6',
  bronze: '#b87333',
};

function GoldenLaurel({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center justify-center px-7 py-1">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 200 56"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M28 48c-10-8-16-18-14-28 8-4 18-2 26 6M28 48c8-2 16-10 20-20"
          stroke={styles.gold}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M22 22c4 2 8 8 8 14M18 30c5 1 10 6 11 12"
          stroke={styles.gold}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M172 48c10-8 16-18 14-28-8-4-18-2-26 6M172 48c-8-2-16-10-20-20"
          stroke={styles.gold}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M178 22c-4 2-8 8-8 14M182 30c-5 1-10 6-11 12"
          stroke={styles.gold}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="100" cy="8" r="3" fill={styles.gold} />
        <path
          d="M88 10c4-6 8-8 12-8s8 2 12 8"
          stroke={styles.gold}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative font-semibold tracking-wide"
        style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          color: styles.gold,
          textShadow: `0 0 12px ${styles.goldSoft}`,
        }}
      >
        {children}
      </span>
    </span>
  );
}

function ScoreLine({
  rank,
  score,
}: {
  rank: number;
  score: CompetitionScore;
}) {
  return (
    <li
      className="flex items-center justify-between text-sm py-1.5"
      style={{ color: styles.text }}
    >
      <span>
        <span className="mr-2 tabular-nums" style={{ color: styles.textMuted }}>
          #{rank}
        </span>
        {score.pseudo}
      </span>
      <span className="font-medium">
        {score.score_pct}%{' '}
        <span className="text-xs font-normal" style={{ color: styles.textMuted }}>
          ({score.correct}/{score.total})
        </span>
      </span>
    </li>
  );
}

function CompetitionPodium({ scores }: { scores: CompetitionScore[] }) {
  const [open, setOpen] = useState(false);
  const first = scores[0];
  const second = scores[1];
  const third = scores[2];
  const rest = scores.slice(3);

  if (scores.length === 0) {
    return (
      <p className="text-sm" style={{ color: styles.textMuted }}>
        Pas encore de scores.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-center gap-3 sm:gap-5 pt-2 pb-1">
        {/* 2nd */}
        <div className="flex w-[28%] max-w-[120px] flex-col items-center gap-2">
          <p
            className="text-center text-xs sm:text-sm font-medium truncate w-full"
            style={{ color: second ? styles.silver : styles.textMuted }}
            title={second?.pseudo}
          >
            {second?.pseudo || '—'}
          </p>
          {second && (
            <p className="text-[10px] tabular-nums" style={{ color: styles.textMuted }}>
              {second.score_pct}%
            </p>
          )}
          <div
            className="w-full rounded-t-md flex items-start justify-center pt-2 text-sm font-bold"
            style={{
              height: 56,
              backgroundColor: second ? '#e8eaed' : '#f3f2f1',
              color: styles.silver,
            }}
          >
            2
          </div>
        </div>

        {/* 1st */}
        <div className="flex w-[34%] max-w-[150px] flex-col items-center gap-2">
          {first ? (
            <GoldenLaurel>{first.pseudo}</GoldenLaurel>
          ) : (
            <p className="text-sm" style={{ color: styles.textMuted }}>
              —
            </p>
          )}
          {first && (
            <p className="text-xs tabular-nums font-medium" style={{ color: styles.gold }}>
              {first.score_pct}%
            </p>
          )}
          <div
            className="w-full rounded-t-md flex items-start justify-center pt-2 text-base font-bold"
            style={{
              height: 84,
              background: first
                ? `linear-gradient(180deg, ${styles.goldSoft} 0%, #e8d48b 100%)`
                : '#f3f2f1',
              color: styles.gold,
              boxShadow: first ? `0 0 0 1px ${styles.gold}33` : undefined,
            }}
          >
            1
          </div>
        </div>

        {/* 3rd */}
        <div className="flex w-[28%] max-w-[120px] flex-col items-center gap-2">
          <p
            className="text-center text-xs sm:text-sm font-medium truncate w-full"
            style={{ color: third ? styles.bronze : styles.textMuted }}
            title={third?.pseudo}
          >
            {third?.pseudo || '—'}
          </p>
          {third && (
            <p className="text-[10px] tabular-nums" style={{ color: styles.textMuted }}>
              {third.score_pct}%
            </p>
          )}
          <div
            className="w-full rounded-t-md flex items-start justify-center pt-2 text-sm font-bold"
            style={{
              height: 40,
              backgroundColor: third ? '#f0e0d0' : '#f3f2f1',
              color: styles.bronze,
            }}
          >
            3
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" /> Masquer le classement
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" /> Classement
              </>
            )}
          </Button>
          {open && (
            <ol
              className="mt-3 rounded-lg px-3 py-2 space-y-0.5"
              style={{
                border: `1px solid ${styles.border}`,
                backgroundColor: '#fbfaf9',
              }}
            >
              {rest.map((s, i) => (
                <ScoreLine key={s.id} rank={i + 4} score={s} />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function StadiumContent() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [scores, setScores] = useState<Record<string, CompetitionScore[]>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const readyExercises = EXERCISES.filter((e) => e.ready);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const list = await listCompetitions();
      setCompetitions(list);
      const grouped = await listTopScoresGrouped(list.map((c) => c.id));
      setScores(grouped);
    } catch {
      setError(
        'Impossible de charger le Stadium. Execute supabase/schema-stadium.sql si besoin.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const exerciseTitle = (id: string) =>
    EXERCISES.find((e) => e.id === id)?.title || id;

  const exerciseSlug = (id: string) =>
    EXERCISES.find((e) => e.id === id)?.slug || id;

  const myRank = (competitionId: string): number | null => {
    if (!userId) return null;
    const list = scores[competitionId] || [];
    const idx = list.findIndex((s) => s.user_id === userId);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: styles.background }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: styles.background, borderColor: styles.border }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Accueil
              </Button>
            </Link>
            <Trophy className="h-5 w-5" style={{ color: styles.text }} />
            <h1 className="text-lg font-bold" style={{ color: styles.text }}>
              Stadium
            </h1>
          </div>
          <Button
            size="sm"
            onClick={() => setCreating((v) => !v)}
            style={{ backgroundColor: styles.text, color: styles.background }}
          >
            <Plus className="h-4 w-4 mr-1" /> Ouvrir une competition
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Classements publics par competition. Une competition = un test + des
          reglages precis. Impossible d&apos;ouvrir un doublon avec les memes
          parametres.
        </p>

        {creating && (
          <section
            className="rounded-xl p-5"
            style={{
              backgroundColor: styles.cardBg,
              border: `1px solid ${styles.border}`,
              boxShadow: styles.shadow,
            }}
          >
            <h2 className="font-semibold mb-3" style={{ color: styles.text }}>
              Choisir un test
            </h2>
            <p className="text-sm mb-4" style={{ color: styles.textMuted }}>
              Tu seras envoye sur le test : regle les Parametres, puis clique
              &quot;Ouvrir la competition&quot;.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {readyExercises.map((ex) => (
                <Link
                  key={ex.id}
                  href={`/exercices/${ex.slug}?stadiumCreate=1`}
                  onClick={() => setActiveCompetitionId(null)}
                  className="rounded-lg px-4 py-3 text-sm font-medium transition-transform hover:scale-[1.01]"
                  style={{
                    backgroundColor: styles.cardBg,
                    border: `1px solid ${styles.border}`,
                    color: styles.text,
                    boxShadow: styles.shadow,
                  }}
                >
                  {ex.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Chargement...
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && competitions.length === 0 && (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Aucune competition pour le moment. Ouvre-en une !
          </p>
        )}

        <div className="space-y-4">
          {competitions.map((c) => {
            const top = scores[c.id] || [];
            const rank = myRank(c.id);
            return (
              <article
                key={c.id}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold" style={{ color: styles.text }}>
                      {exerciseTitle(c.exercise_id)}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: styles.textMuted }}>
                      Hash reglages : {c.settings_hash.slice(0, 10)}…
                    </p>
                  </div>
                  <Link
                    href={`/exercices/${exerciseSlug(c.exercise_id)}?competitionId=${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setActiveCompetitionId(c.id)}
                  >
                    <Button
                      size="sm"
                      style={{ backgroundColor: styles.text, color: styles.background }}
                    >
                      Jouer
                    </Button>
                  </Link>
                </div>

                <div
                  className="mb-4 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: '#fbfaf9',
                    border: `1px solid ${styles.border}`,
                  }}
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: styles.textMuted }}
                  >
                    Mon rang
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: rank ? styles.text : styles.textMuted }}
                  >
                    {rank ? `#${rank}` : 'Pas encore joue'}
                  </span>
                </div>

                <CompetitionPodium scores={top} />
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function StadiumPage() {
  return (
    <AuthGate>
      <StadiumContent />
    </AuthGate>
  );
}
