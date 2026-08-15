'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Binary,
  BookOpen,
  Box,
  Boxes,
  Brain,
  BrainCircuit,
  Brackets,
  Calculator,
  Car,
  Circle,
  Clock,
  Compass,
  Cuboid,
  Gauge,
  Gamepad2,
  Inbox,
  Landmark,
  Languages,
  LayoutGrid,
  Library,
  LogOut,
  Plane,
  RotateCcw,
  Route,
  Search,
  Shapes,
  Smartphone,
  Star,
  Target,
  Trophy,
  User,
  Variable,
  X,
} from 'lucide-react';
import { BoxingGlovesIcon } from '@/components/icons/BoxingGlovesIcon';
import { LatecoerePlaneIcon } from '@/components/icons/LatecoerePlaneIcon';
import { FichesIcon } from '@/components/icons/FichesIcon';
import {
  EXERCISES,
  EXERCISE_TYPES,
  getAllCompetitions,
  getDifficultyLabel,
  getExerciseUrl,
  getExercisesByCompetition,
  type Competition,
  type ExerciseConfig,
  type ExerciseType,
} from '@/lib/data/exercises';
import { getPseudo } from '@/lib/core/PerformanceTracker';
import { syncPseudoFromProfile } from '@/lib/account/profile';
import AuthGate from '@/components/AuthGate';
import { clearGuestMode, isGuestMode } from '@/lib/auth/guest';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';
import { useSiteTexts } from '@/lib/site-texts/useSiteTexts';

const homeStyles = {
  colors: {
    background: '#fbfaf9',
    backgroundWarm: '#f6efe4',
    text: '#37322f',
    textMuted: '#605a57',
    border: '#e0dedb',
    cardBg: '#ffffff',
    stadiumStart: '#f59e0b',
    stadiumEnd: '#b45309',
    agoraStart: '#3f7f79',
    agoraEnd: '#244e4a',
    boiteStart: '#ebe4db',
    boiteEnd: '#d4c7b8',
  },
  shadows: {
    soft: '0 10px 30px rgba(55, 50, 47, 0.08)',
    stadium: '0 18px 44px rgba(180, 83, 9, 0.22)',
  },
};

const iconMap: Record<string, React.ReactNode> = {
  Clock: <Clock className="h-5 w-5" />,
  Binary: <Binary className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Shapes: <Shapes className="h-5 w-5" />,
  Circle: <Circle className="h-5 w-5" />,
  Brain: <Brain className="h-5 w-5" />,
  BrainCircuit: <BrainCircuit className="h-5 w-5" />,
  RotateCcw: <RotateCcw className="h-5 w-5" />,
  Gamepad2: <Gamepad2 className="h-5 w-5" />,
  Plane: <Plane className="h-5 w-5" />,
  Boxes: <Boxes className="h-5 w-5" />,
  Box: <Box className="h-5 w-5" />,
  LayoutGrid: <LayoutGrid className="h-5 w-5" />,
  Cuboid: <Cuboid className="h-5 w-5" />,
  Calculator: <Calculator className="h-5 w-5" />,
  Library: <Library className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Languages: <Languages className="h-5 w-5" />,
  Car: <Car className="h-5 w-5" />,
  Route: <Route className="h-5 w-5" />,
  X: <X className="h-5 w-5" />,
  Variable: <Variable className="h-5 w-5" />,
  Gauge: <Gauge className="h-5 w-5" />,
  Brackets: <Brackets className="h-5 w-5" />,
  Compass: <Compass className="h-5 w-5" />,
  Search: <Search className="h-5 w-5" />,
  BoxingGloves: <BoxingGlovesIcon accent="red" className="h-8 w-10" />,
  BoxingGlovesBlue: <BoxingGlovesIcon accent="blue" className="h-8 w-10" />,
};

const trainingLanes: Array<{
  id: string;
  title: string;
  types: ExerciseType[];
  accent: string;
  accentBg: string;
}> = [
  {
    id: 'speed-attention',
    title: 'Attention & vitesse',
    types: ['attention', 'psychomoteur'],
    accent: '#0ea5e9',
    accentBg: '#e0f2fe',
  },
  {
    id: 'spatial-cockpit',
    title: 'Spatial & cockpit',
    types: ['spatiale'],
    accent: '#d97706',
    accentBg: '#fffbeb',
  },
  {
    id: 'logic-maths',
    title: 'Calcul & logique',
    types: ['numerique', 'intellectuel'],
    accent: '#7c3aed',
    accentBg: '#f5f3ff',
  },
  {
    id: 'memory-multitask',
    title: 'Memoire & multitache',
    types: ['memorisation'],
    accent: '#e11d48',
    accentBg: '#fff1f2',
  },
  {
    id: 'language-comprehension',
    title: 'Verbal & anglais',
    types: ['verbal', 'anglais'],
    accent: '#0f766e',
    accentBg: '#ecfeff',
  },
];

function getExerciseIcon(iconName: string): React.ReactNode {
  return iconMap[iconName] || <Circle className="h-5 w-5" />;
}

function summarizeDifficulty(exercises: ExerciseConfig[]): string {
  const difficultCount = exercises.filter((exercise) => exercise.difficulty === 'difficile').length;
  const easyCount = exercises.filter((exercise) => exercise.difficulty === 'facile').length;

  if (difficultCount >= Math.ceil(exercises.length / 2)) {
    return 'Niveau exigeant';
  }

  if (easyCount >= Math.ceil(exercises.length / 2)) {
    return 'Bon pour demarrer';
  }

  return 'Progression equilibree';
}

function buildLaneExercises(types: ExerciseType[], readyExercises: ExerciseConfig[]): ExerciseConfig[] {
  const seen = new Set<string>();
  const collected: ExerciseConfig[] = [];

  readyExercises.forEach((exercise) => {
    if (exercise.types.some((type) => types.includes(type)) && !seen.has(exercise.id)) {
      seen.add(exercise.id);
      collected.push(exercise);
    }
  });

  return collected;
}

/** Order used for the bottom "Tous les tests" scatter — follows competence flow. */
const ALL_TESTS_TYPE_ORDER: ExerciseType[] = [
  'attention',
  'psychomoteur',
  'spatiale',
  'numerique',
  'intellectuel',
  'memorisation',
  'verbal',
  'anglais',
];

function groupExercisesForAllTests(
  readyExercises: ExerciseConfig[],
): Array<{ type: ExerciseType; exercises: ExerciseConfig[] }> {
  const byType = new Map<ExerciseType, ExerciseConfig[]>();
  for (const exercise of readyExercises) {
    const type = exercise.primaryType;
    const list = byType.get(type) ?? [];
    list.push(exercise);
    byType.set(type, list);
  }
  for (const list of byType.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }
  return ALL_TESTS_TYPE_ORDER.filter((type) => (byType.get(type)?.length ?? 0) > 0).map((type) => ({
    type,
    exercises: byType.get(type)!,
  }));
}

function CompetitionHeroCard({
  competition,
  exerciseCount,
}: {
  competition: Competition;
  exerciseCount: number;
}) {
  return (
    <Link href={`/concours/${competition.slug}`} className="block h-full">
      <article
        className="flex h-full flex-col rounded-[22px] p-4 transition-transform hover:scale-[1.01] md:p-5"
        style={{
          background:
            competition.id === 'psy0'
              ? 'linear-gradient(145deg, #fffaf0 0%, #fdf1d5 100%)'
              : competition.id === 'psy1'
                ? 'linear-gradient(145deg, #f8f6ff 0%, #ebe7ff 100%)'
                : 'linear-gradient(145deg, #f3fbff 0%, #dff4ff 100%)',
          border: `1px solid ${homeStyles.colors.border}`,
          boxShadow: homeStyles.shadows.soft,
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.2em]"
              style={{ color: homeStyles.colors.textMuted }}
            >
              {competition.organization}
            </p>
            <h3
              className="mt-1.5 text-lg font-semibold md:text-xl"
              style={{ color: homeStyles.colors.text }}
            >
              {competition.name}
            </h3>
          </div>
          <div
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: '#ffffff',
              color: homeStyles.colors.text,
              border: `1px solid ${homeStyles.colors.border}`,
            }}
          >
            {exerciseCount} tests
          </div>
        </div>
        <p
          className="mb-4 line-clamp-3 text-sm leading-snug"
          style={{ color: homeStyles.colors.textMuted }}
        >
          {competition.description}
        </p>
        <div
          className="mt-auto flex items-center justify-between text-sm font-medium"
          style={{ color: homeStyles.colors.text }}
        >
          <span>Voir</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </article>
    </Link>
  );
}

function LaneCard({
  title,
  exercises,
  accent,
  accentBg,
  types,
}: {
  title: string;
  exercises: ExerciseConfig[];
  accent: string;
  accentBg: string;
  types: ExerciseType[];
}) {
  const featured = exercises.slice(0, 5);
  const categoryHref = `/exercices?types=${types.join(',')}`;

  return (
    <article
      className="rounded-[24px] p-5"
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${homeStyles.colors.border}`,
        boxShadow: homeStyles.shadows.soft,
      }}
    >
      <Link href={categoryHref} className="mb-4 block transition-opacity hover:opacity-85">
        <div
          className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: accentBg, color: accent }}
        >
          {exercises.length} exercices
        </div>
        <h3 className="mt-3 text-xl font-semibold" style={{ color: homeStyles.colors.text }}>
          {title}
        </h3>
      </Link>
      <div
        className="mb-4 flex items-center justify-between text-xs"
        style={{ color: homeStyles.colors.textMuted }}
      >
        <span>{summarizeDifficulty(exercises)}</span>
        <span>
          ~
          {Math.round(
            exercises.reduce((sum, exercise) => sum + exercise.estimatedDuration, 0) /
              Math.max(exercises.length, 1)
          )}{' '}
          min / test
        </span>
      </div>
      <div className="space-y-2">
        {featured.map((exercise) => (
          <Link
            key={exercise.id}
            href={getExerciseUrl(exercise)}
            target="_blank"
            className="flex items-center justify-between rounded-2xl px-3 py-3 transition-colors"
            style={{ backgroundColor: accentBg, color: homeStyles.colors.text }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2" style={{ backgroundColor: '#ffffff', color: accent }}>
                {getExerciseIcon(exercise.iconName)}
              </div>
              <div>
                <p className="text-sm font-medium">{exercise.title}</p>
                <p className="text-xs" style={{ color: homeStyles.colors.textMuted }}>
                  {getDifficultyLabel(exercise.difficulty)}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: accent }} />
          </Link>
        ))}
      </div>
    </article>
  );
}

function HomeContent() {
  const { t } = useSiteTexts();
  const txt = (key: string) => {
    const value = t(key).trim();
    return value.length > 0 ? value : null;
  };
  const [pseudo, setPseudoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const competitions = getAllCompetitions();
  const readyExercises = useMemo(() => EXERCISES.filter((exercise) => exercise.ready), []);

  const psy0 = competitions.find((c) => c.id === 'psy0');
  const psy1 = competitions.find((c) => c.id === 'psy1');
  const enac = competitions.find((c) => c.id === 'enac-epl');

  useEffect(() => {
    void (async () => {
      if (isGuestMode()) {
        setPseudoState(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const name = await syncPseudoFromProfile();
      setPseudoState(name || getPseudo());
      try {
        const { data } = await getSupabaseBrowserClient().auth.getUser();
        setIsAdmin(data.user?.email === ADMIN_EMAIL);
      } catch {
        setIsAdmin(false);
      }
      setLoading(false);
    })();
  }, []);

  const laneData = useMemo(
    () =>
      trainingLanes.map((lane) => ({
        ...lane,
        exercises: buildLaneExercises(lane.types, readyExercises),
      })),
    [readyExercises]
  );

  const allTestsGroups = useMemo(
    () => groupExercisesForAllTests(readyExercises),
    [readyExercises]
  );

  const handleLogout = async () => {
    if (isGuestMode()) {
      clearGuestMode();
      window.location.href = '/';
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // AuthGate will show login if session is gone / misconfigured
    }
  };

  if (loading) return null;

  const navLinkClass =
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-80';

  const stadiumBody = txt('home.stadium.body');
  const agoraBody = txt('home.agora.body');
  const aeroBody = txt('home.aeropostale.body');
  const lanesTitle = txt('home.lanes.title') || 'Par competence';
  const lanesBody = txt('home.lanes.body');
  const footerBlurb = txt('home.footer.blurb');
  const cadetsLabel = txt('home.concours.cadets_label') || 'Cadets Air France';

  return (
    <main className="min-h-screen" style={{ backgroundColor: homeStyles.colors.background }}>
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{
          backgroundColor: 'rgba(251, 250, 249, 0.92)',
          borderBottom: `1px solid ${homeStyles.colors.border}`,
        }}
      >
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="rounded-2xl p-2 shrink-0"
                style={{ backgroundColor: '#fff3e0', color: homeStyles.colors.text }}
              >
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight" style={{ color: homeStyles.colors.text }}>
                  AviaTest
                </p>
                <p
                  className="text-[11px] tracking-[0.16em] uppercase truncate"
                  style={{ color: homeStyles.colors.textMuted }}
                >
                  Tests psychotechniques pilote
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              <Link
                href="/stadium"
                className={`${navLinkClass} text-white`}
                style={{
                  background: `linear-gradient(135deg, ${homeStyles.colors.stadiumStart} 0%, ${homeStyles.colors.stadiumEnd} 100%)`,
                  boxShadow: homeStyles.shadows.stadium,
                }}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stadium</span>
              </Link>
              <Link
                href="/agora"
                className={`${navLinkClass} text-white`}
                style={{
                  background: `linear-gradient(135deg, ${homeStyles.colors.agoraStart} 0%, ${homeStyles.colors.agoraEnd} 100%)`,
                }}
              >
                <Landmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Agora</span>
              </Link>
              <Link
                href="/fiches"
                className={navLinkClass}
                style={{
                  backgroundColor: '#ffffff',
                  color: homeStyles.colors.text,
                  border: `1px solid ${homeStyles.colors.border}`,
                }}
                title="Fiches d entrainement"
              >
                <FichesIcon className="h-4 w-5" />
                <span className="hidden sm:inline">Fiches</span>
              </Link>
              <Link
                href="/compte"
                className={navLinkClass}
                style={{
                  backgroundColor: '#ffffff',
                  color: homeStyles.colors.text,
                  border: `1px solid ${homeStyles.colors.border}`,
                }}
              >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[7rem] truncate">
                  {isGuestMode() ? 'Invité' : pseudo || 'Profil'}
                </span>
              </Link>
              <Link
                href="/telephone"
                className={navLinkClass}
                style={{
                  backgroundColor: '#ffffff',
                  color: homeStyles.colors.text,
                  border: `1px solid ${homeStyles.colors.border}`,
                }}
                title="Mode telephone"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Telephone</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={navLinkClass}
                  style={{ backgroundColor: '#fff3e0', color: '#9a3412', border: '1px solid #fdba74' }}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link
                href="/notice"
                className="ml-0.5 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: homeStyles.colors.textMuted }}
                title="Notice"
              >
                Notice
              </Link>
              <button
                onClick={handleLogout}
                className="ml-0.5 inline-flex items-center justify-center rounded-full p-2 transition-opacity hover:opacity-70"
                style={{ color: homeStyles.colors.textMuted }}
                title={isGuestMode() ? 'Quitter le mode invité' : 'Se deconnecter'}
                aria-label={isGuestMode() ? 'Quitter le mode invité' : 'Se deconnecter'}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Acces rapides : Stadium | Agora + Aeropostale */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(245, 158, 11, 0.16), transparent 38%), radial-gradient(circle at top right, rgba(63, 127, 121, 0.12), transparent 34%), linear-gradient(180deg, #fbfaf9 0%, #f6efe4 100%)',
          }}
        />
        <div className="relative container mx-auto px-4 py-8 md:py-10">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <Link href="/stadium" className="block h-full min-h-[220px] lg:min-h-[280px]">
              <div
                className="flex h-full flex-col justify-between rounded-[28px] p-6 text-white transition-transform hover:scale-[1.01] md:p-7"
                style={{
                  background: `linear-gradient(140deg, ${homeStyles.colors.stadiumStart} 0%, #d97706 45%, ${homeStyles.colors.stadiumEnd} 100%)`,
                  boxShadow: homeStyles.shadows.stadium,
                }}
              >
                <div>
                  <div className="flex items-center justify-end">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold">{t('home.stadium.title')}</h2>
                  {stadiumBody && (
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/88 md:text-base">
                      {stadiumBody}
                    </p>
                  )}
                </div>
              </div>
            </Link>

            <div className="grid h-full min-h-[220px] grid-rows-[1.55fr_1fr] gap-4 lg:min-h-[280px]">
              <Link href="/agora" className="block min-h-0">
                <div
                  className="flex h-full flex-col justify-between rounded-[26px] p-5 text-white transition-transform hover:scale-[1.01] md:p-6"
                  style={{
                    background: `linear-gradient(140deg, ${homeStyles.colors.agoraStart} 0%, ${homeStyles.colors.agoraEnd} 100%)`,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold md:text-2xl">{t('home.agora.title')}</h3>
                      <Landmark className="h-5 w-5" />
                    </div>
                    {agoraBody && (
                      <p className="mt-2 text-sm leading-relaxed text-white/85 md:text-base">
                        {agoraBody}
                      </p>
                    )}
                  </div>
                </div>
              </Link>

              <Link href="/boite" className="block min-h-0">
                <div
                  className="flex h-full flex-col justify-between rounded-[26px] p-5 transition-transform hover:scale-[1.01] md:p-6"
                  style={{
                    background: `linear-gradient(140deg, ${homeStyles.colors.boiteStart} 0%, ${homeStyles.colors.boiteEnd} 100%)`,
                    color: homeStyles.colors.text,
                    border: `1px solid ${homeStyles.colors.border}`,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold md:text-xl">{t('home.aeropostale.title')}</h3>
                      <LatecoerePlaneIcon className="h-6 w-9" />
                    </div>
                    {aeroBody && (
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                        {aeroBody}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Concours : 3 colonnes — PSY0 + PSY1 (Cadets AF) | ENAC */}
      <section id="concours" className="container mx-auto px-4 pb-10 pt-6 md:pb-12 md:pt-8">
        <div className="mb-4 flex justify-end">
          <Link
            href="#tous-les-tests"
            className="text-sm underline-offset-4 transition-opacity hover:opacity-70 hover:underline"
            style={{ color: homeStyles.colors.textMuted }}
          >
            Tous les tests
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-5">
          {(psy0 || psy1) && (
            <div
              className="flex flex-col rounded-[28px] p-3 sm:p-4 lg:col-span-2"
              style={{
                backgroundColor: 'rgba(255, 248, 237, 0.75)',
                border: `1px solid ${homeStyles.colors.border}`,
              }}
            >
              <p
                className="mb-3 px-1 text-xs uppercase tracking-[0.2em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                {cadetsLabel}
              </p>
              <div className="grid flex-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {psy0 && (
                  <CompetitionHeroCard
                    competition={psy0}
                    exerciseCount={getExercisesByCompetition('psy0').length}
                  />
                )}
                {psy1 && (
                  <CompetitionHeroCard
                    competition={psy1}
                    exerciseCount={getExercisesByCompetition('psy1').length}
                  />
                )}
              </div>
            </div>
          )}

          {enac && (
            <div className="flex min-h-0 flex-col">
              <p
                className="mb-3 px-1 text-xs uppercase tracking-[0.2em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                {enac.organization}
              </p>
              <div className="flex-1">
                <CompetitionHeroCard
                  competition={enac}
                  exerciseCount={getExercisesByCompetition('enac-epl').length}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="parcours" className="container mx-auto px-4 py-10 md:py-12">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
            {lanesTitle}
          </h2>
          {lanesBody && (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
              {lanesBody}
            </p>
          )}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {laneData.map((lane) => (
            <LaneCard
              key={lane.id}
              title={lane.title}
              exercises={lane.exercises}
              accent={lane.accent}
              accentBg={lane.accentBg}
              types={lane.types}
            />
          ))}
        </div>
      </section>

      <section id="tous-les-tests" className="container mx-auto px-4 pb-12 pt-2 md:pb-14">
        <div className="mb-6 flex items-end justify-between gap-3">
          <h2 className="text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
            Tous les tests
          </h2>
          <span className="text-sm" style={{ color: homeStyles.colors.textMuted }}>
            {readyExercises.length}
          </span>
        </div>

        <div className="space-y-8">
          {allTestsGroups.map(({ type, exercises }) => {
            const typeConfig = EXERCISE_TYPES[type];
            return (
              <div key={type}>
                <p
                  className="mb-3 text-xs font-medium uppercase tracking-[0.18em]"
                  style={{ color: typeConfig.color }}
                >
                  {typeConfig.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {exercises.map((exercise) => (
                    <Link
                      key={exercise.id}
                      href={getExerciseUrl(exercise)}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-transform hover:scale-[1.02]"
                      style={{
                        backgroundColor: typeConfig.bgColor,
                        color: homeStyles.colors.text,
                        border: `1px solid ${homeStyles.colors.border}`,
                      }}
                      title={exercise.description}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: '#ffffff', color: typeConfig.color }}
                      >
                        {getExerciseIcon(exercise.iconName)}
                      </span>
                      <span className="font-medium leading-tight">{exercise.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="pb-10 pt-6" style={{ borderTop: `1px solid ${homeStyles.colors.border}` }}>
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: homeStyles.colors.text }} />
                <span className="font-semibold" style={{ color: homeStyles.colors.text }}>
                  AviaTest
                </span>
              </div>
              {footerBlurb && (
                <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                  {footerBlurb}
                </p>
              )}
            </div>
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                Acces rapides
              </h3>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href="#tous-les-tests" style={{ color: homeStyles.colors.textMuted }}>
                  Tous les tests
                </Link>
                <Link href="/notice" style={{ color: homeStyles.colors.textMuted }}>
                  Notice
                </Link>
                <Link href="/stadium" style={{ color: homeStyles.colors.text }}>
                  Stadium
                </Link>
                <Link href="/agora" style={{ color: homeStyles.colors.text }}>
                  Agora
                </Link>
                <Link href="/fiches" style={{ color: homeStyles.colors.text }}>
                  Fiches
                </Link>
                <Link href="/boite" style={{ color: homeStyles.colors.text }}>
                  Aeropostale
                </Link>
                <Link href="/compte" style={{ color: homeStyles.colors.text }}>
                  Profil
                </Link>
                <Link href="/telephone" style={{ color: homeStyles.colors.text }}>
                  Telephone
                </Link>
              </div>
            </div>
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                Competences
              </h3>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                {trainingLanes.map((lane) => (
                  <Link
                    key={lane.id}
                    href={`/exercices?types=${lane.types.join(',')}`}
                    style={{ color: homeStyles.colors.text }}
                    className="transition-opacity hover:opacity-70"
                  >
                    {lane.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}
