'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, ArrowLeft, Plus } from 'lucide-react';
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

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

function StadiumContent() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [scores, setScores] = useState<Record<string, CompetitionScore[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const readyExercises = EXERCISES.filter((e) => e.ready);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
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
                {top.length === 0 ? (
                  <p className="text-sm" style={{ color: styles.textMuted }}>
                    Pas encore de scores.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {top.map((s, i) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between text-sm"
                        style={{ color: styles.text }}
                      >
                        <span>
                          <span className="text-[#605a57] mr-2">#{i + 1}</span>
                          {s.pseudo}
                        </span>
                        <span className="font-medium">
                          {s.score_pct}%{' '}
                          <span className="text-xs font-normal text-[#605a57]">
                            ({s.correct}/{s.total})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
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
