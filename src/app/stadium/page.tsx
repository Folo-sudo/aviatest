'use client';

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Trophy, ArrowLeft, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { AdminDangerConfirm } from '@/components/admin/AdminDangerConfirm';
import { BoxingGlovesIcon } from '@/components/icons/BoxingGlovesIcon';
import { CrossedSwordsIcon } from '@/components/icons/CrossedSwordsIcon';
import { Button } from '@/components/ui/button';
import { EXERCISES } from '@/lib/data/exercises';
import {
  adminDeleteCompetition,
  ensureSpecialCompetitions,
  isSpecialStadiumExercise,
  listCompetitions,
  listTopScoresGrouped,
  sortCompetitionsForDisplay,
  type Competition,
  type CompetitionScore,
} from '@/lib/stadium/competitions';
import { ADMIN_EMAIL, setActiveCompetitionId } from '@/lib/stadium/settingsKeys';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { listFriends, type Friend } from '@/lib/friends/api';
import {
  cancelDuel,
  listMyDuels,
  openDuelTab,
  respondDuel,
  type Duel,
} from '@/lib/duels/api';

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
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'duels' ? 'duels' : 'competitions';
  const [tab, setTab] = useState<'competitions' | 'duels'>(initialTab);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [scores, setScores] = useState<Record<string, CompetitionScore[]>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Duels
  const [friends, setFriends] = useState<Friend[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [duelCreating, setDuelCreating] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [duelMsg, setDuelMsg] = useState<string | null>(null);

  /** User-creatable tests only — specials (Sparing…) are excluded. */
  const creatableExercises = useMemo(
    () =>
      EXERCISES.filter((e) => e.ready && !isSpecialStadiumExercise(e.id)).sort(
        (a, b) => a.title.localeCompare(b.title, 'fr'),
      ),
    [],
  );

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setIsAdmin(user?.email === ADMIN_EMAIL);
      if (user) {
        await ensureSpecialCompetitions();
      }
      const list = sortCompetitionsForDisplay(await listCompetitions());
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

  const reloadDuels = async () => {
    try {
      const [f, d] = await Promise.all([listFriends(), listMyDuels()]);
      setFriends(f);
      setDuels(d);
    } catch {
      setDuelMsg('Duels indisponibles — execute schema-friends-duels.sql.');
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (tab === 'duels') void reloadDuels();
  }, [tab]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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

  const onDeleteCompetition = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await adminDeleteCompetition(id);
      await reload();
    } catch {
      setError('Suppression competition impossible.');
      throw new Error('delete_failed');
    } finally {
      setBusyId(null);
    }
  };

  const activeDuels = duels.filter(
    (d) => d.status === 'pending' || d.status === 'active',
  );
  const recentDuels = duels.filter((d) => d.status === 'completed').slice(0, 8);

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
          {tab === 'competitions' ? (
            <Button
              size="sm"
              onClick={() => setCreating((v) => !v)}
              style={{ backgroundColor: styles.text, color: styles.background }}
            >
              <Plus className="h-4 w-4 mr-1" /> Ouvrir une competition
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setDuelCreating((v) => !v)}
              style={{ backgroundColor: styles.text, color: styles.background }}
            >
              <Plus className="h-4 w-4 mr-1" /> Provoquer en duel
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 'competitions' ? 'default' : 'outline'}
            onClick={() => setTab('competitions')}
            style={
              tab === 'competitions'
                ? { backgroundColor: styles.text, color: styles.background }
                : undefined
            }
          >
            <Trophy className="h-3.5 w-3.5 mr-1" />
            Competitions
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'duels' ? 'default' : 'outline'}
            onClick={() => setTab('duels')}
            style={
              tab === 'duels'
                ? { backgroundColor: styles.text, color: styles.background }
                : undefined
            }
          >
            <CrossedSwordsIcon size={16} className="mr-1" />
            Duels
          </Button>
        </div>

        {tab === 'competitions' && (
          <>
            <p className="text-sm" style={{ color: styles.textMuted }}>
              Classements publics par competition. Une competition = un test + des
              reglages precis. Impossible d&apos;ouvrir un doublon avec les memes
              parametres. Les competitions speciales (Sparing Multiplication / Sparing +-)
              sont deja la — on ne les cree pas.
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
                  {creatableExercises.map((ex) => (
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
                const isSpecial = isSpecialStadiumExercise(c.exercise_id);
                const isBleu = c.exercise_id === 'sparing-bleu';

                const cardBody = (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-semibold" style={{ color: styles.text }}>
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {exerciseTitle(c.exercise_id)}
                            {isSpecial && (
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wide ${
                                  isBleu ? 'text-sky-700' : 'text-rose-700'
                                }`}
                              >
                                Special
                              </span>
                            )}
                          </span>
                        </h3>
                        <p className="text-xs mt-1" style={{ color: styles.textMuted }}>
                          {isSpecial
                            ? isBleu
                              ? 'Competition permanente — abc ± cde'
                              : 'Competition permanente — ab × cd'
                            : `Hash reglages : ${c.settings_hash.slice(0, 10)}…`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/exercices/${exerciseSlug(c.exercise_id)}?competitionId=${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setActiveCompetitionId(c.id)}
                        >
                          <Button
                            size="sm"
                            style={{
                              backgroundColor: styles.text,
                              color: styles.background,
                            }}
                          >
                            Jouer
                          </Button>
                        </Link>
                        {isAdmin && (
                          <AdminDangerConfirm
                            title="Supprimer cette competition ?"
                            description="Suppression definitive de la competition Stadium et de tous ses scores."
                            preview={`${exerciseTitle(c.exercise_id)} · ${c.settings_hash.slice(0, 10)}…`}
                            disabled={busyId === c.id}
                            onConfirm={() => onDeleteCompetition(c.id)}
                          />
                        )}
                      </div>
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
                  </>
                );

                if (isSpecial) {
                  return (
                    <article
                      key={c.id}
                      className="overflow-hidden rounded-xl"
                      style={{
                        backgroundColor: '#ffffff',
                        border: isBleu ? '1px solid #bae6fd' : '1px solid #fecdd3',
                        boxShadow: styles.shadow,
                      }}
                    >
                      <div className="flex min-h-[240px] items-stretch">
                        <div
                          className={`relative w-[132px] shrink-0 self-stretch sm:w-[160px] ${
                            isBleu ? 'bg-sky-50' : 'bg-rose-50'
                          }`}
                        >
                          <BoxingGlovesIcon
                            accent={isBleu ? 'blue' : 'red'}
                            className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1 p-5">{cardBody}</div>
                      </div>
                    </article>
                  );
                }

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
                    {cardBody}
                  </article>
                );
              })}
            </div>
          </>
        )}

        {tab === 'duels' && (
          <>
            <p className="text-sm" style={{ color: styles.textMuted }}>
              Defie un ami : meme test et reglages pour vous deux. Apres
              acceptation, un nouvel onglet s ouvre chez les deux joueurs. Le
              meilleur pourcentage gagne.
            </p>
            {duelMsg && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                {duelMsg}
              </p>
            )}

            {duelCreating && (
              <section
                className="rounded-xl p-5 space-y-4"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <h2 className="font-semibold" style={{ color: styles.text }}>
                  1. Choisir un ami
                </h2>
                {friends.length === 0 ? (
                  <p className="text-sm" style={{ color: styles.textMuted }}>
                    Aucun ami.{' '}
                    <Link href="/compte" className="underline">
                      Ajoute-en dans Compte
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {friends.map((f) => (
                      <Button
                        key={f.user_id}
                        type="button"
                        size="sm"
                        variant={selectedFriend === f.user_id ? 'default' : 'outline'}
                        onClick={() => setSelectedFriend(f.user_id)}
                        style={
                          selectedFriend === f.user_id
                            ? { backgroundColor: styles.text, color: styles.background }
                            : undefined
                        }
                      >
                        {f.username}
                        {f.in_exercise ? ' (en test)' : ''}
                      </Button>
                    ))}
                  </div>
                )}

                {selectedFriend && (
                  <>
                    <h2 className="font-semibold" style={{ color: styles.text }}>
                      2. Choisir un test
                    </h2>
                    <p className="text-sm" style={{ color: styles.textMuted }}>
                      Tu regleras les parametres sur la page du test, puis tu
                      enverras le defi.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {creatableExercises.map((ex) => (
                        <Link
                          key={ex.id}
                          href={`/exercices/${ex.slug}?duelCreate=1&opponentId=${selectedFriend}`}
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
                  </>
                )}
              </section>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: styles.textMuted }}>
                En cours ({activeDuels.length})
              </h2>
              {activeDuels.length === 0 && (
                <p className="text-sm" style={{ color: styles.textMuted }}>
                  Aucun duel actif.
                </p>
              )}
              {activeDuels.map((d) => {
                const other =
                  userId === d.challenger_id
                    ? d.opponent_username
                    : d.challenger_username;
                const iAmOpponent = userId === d.opponent_id;
                return (
                  <article
                    key={d.id}
                    className="rounded-xl p-4 space-y-2"
                    style={{
                      backgroundColor: styles.cardBg,
                      border: `1px solid ${styles.border}`,
                      boxShadow: styles.shadow,
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: styles.text }}>
                      vs {other} · {exerciseTitle(d.exercise_id)}
                    </p>
                    <p className="text-xs" style={{ color: styles.textMuted }}>
                      {d.status === 'pending' &&
                        (iAmOpponent
                          ? 'Invitation recue'
                          : d.opponent_in_exercise
                            ? 'En attente — adversaire en test'
                            : 'En attente d acceptation')}
                      {d.status === 'active' && 'Duel en cours'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {d.status === 'pending' && iAmOpponent && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              void respondDuel(d.id, true).then((updated) => {
                                openDuelTab(exerciseSlug(updated.exercise_id), updated.id);
                                void reloadDuels();
                              })
                            }
                            style={{ backgroundColor: styles.text, color: styles.background }}
                          >
                            Accepter
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void respondDuel(d.id, false).then(reloadDuels)
                            }
                          >
                            Refuser
                          </Button>
                        </>
                      )}
                      {d.status === 'pending' && !iAmOpponent && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void cancelDuel(d.id).then(reloadDuels)}
                        >
                          Annuler
                        </Button>
                      )}
                      {d.status === 'active' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openDuelTab(exerciseSlug(d.exercise_id), d.id)}
                          style={{ backgroundColor: styles.text, color: styles.background }}
                        >
                          Rejoindre
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: styles.textMuted }}>
                Recents
              </h2>
              {recentDuels.length === 0 && (
                <p className="text-sm" style={{ color: styles.textMuted }}>
                  Pas encore de duel termine.
                </p>
              )}
              {recentDuels.map((d) => {
                const other =
                  userId === d.challenger_id
                    ? d.opponent_username
                    : d.challenger_username;
                const result = !d.winner_id
                  ? 'Nul'
                  : d.winner_id === userId
                    ? 'Victoire'
                    : 'Defaite';
                return (
                  <p key={d.id} className="text-sm" style={{ color: styles.textMuted }}>
                    vs {other} · {exerciseTitle(d.exercise_id)} · {result}
                  </p>
                );
              })}
              <Link href="/compte" className="text-sm underline" style={{ color: styles.text }}>
                Historique complet et revanches dans Compte
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function StadiumPage() {
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
        <StadiumContent />
      </Suspense>
    </AuthGate>
  );
}
