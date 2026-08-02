'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  MessageSquare,
  Plane,
  RotateCcw,
  Route,
  Search,
  Shapes,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  Variable,
  X,
} from 'lucide-react';
import {
  EXERCISES,
  EXERCISE_TYPES,
  getAllCompetitions,
  getDifficultyLabel,
  getExerciseUrl,
  getExercisesByCompetition,
  type Competition,
  type CompetitionId,
  type ExerciseConfig,
  type ExerciseType,
} from '@/lib/data/exercises';
import { getPseudo } from '@/lib/core/PerformanceTracker';
import { syncPseudoFromProfile } from '@/lib/account/profile';
import AuthGate from '@/components/AuthGate';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';

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
};

const trainingLanes: Array<{
  id: string;
  title: string;
  description: string;
  types: ExerciseType[];
  accent: string;
  accentBg: string;
}> = [
  {
    id: 'speed-attention',
    title: 'Attention & vitesse',
    description: 'Tout ce qui demande rapidite de lecture, alternance de regles et precision sous pression.',
    types: ['attention', 'psychomoteur'],
    accent: '#0ea5e9',
    accentBg: '#e0f2fe',
  },
  {
    id: 'spatial-cockpit',
    title: 'Spatial & cockpit',
    description: 'Orientation mentale, angles, vision 3D, lecture instrumentale et reperage visuel.',
    types: ['spatiale'],
    accent: '#d97706',
    accentBg: '#fffbeb',
  },
  {
    id: 'logic-maths',
    title: 'Calcul & logique',
    description: 'Calcul mental, estimation, raisonnement abstrait et resolution de contraintes.',
    types: ['numerique', 'intellectuel'],
    accent: '#7c3aed',
    accentBg: '#f5f3ff',
  },
  {
    id: 'memory-multitask',
    title: 'Memoire & multitache',
    description: 'Memoire de travail, double tache et maintien de performance sur plusieurs flux.',
    types: ['memorisation'],
    accent: '#e11d48',
    accentBg: '#fff1f2',
  },
  {
    id: 'language-comprehension',
    title: 'Verbal & anglais',
    description: 'Comprendre vite, trier, classer et raisonner avec des mots ou des QCM linguistiques.',
    types: ['verbal', 'anglais'],
    accent: '#0f766e',
    accentBg: '#ecfeff',
  },
];

function getExerciseIcon(iconName: string): React.ReactNode {
  return iconMap[iconName] || <Circle className="h-5 w-5" />;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function summarizeDifficulty(exercises: ExerciseConfig[]): string {
  const difficultCount = exercises.filter((exercise) => exercise.difficulty === 'difficile').length;
  const easyCount = exercises.filter((exercise) => exercise.difficulty === 'facile').length;

  if (difficultCount >= Math.ceil(exercises.length / 2)) {
    return 'Plutot exigeant';
  }

  if (easyCount >= Math.ceil(exercises.length / 2)) {
    return 'Accessible rapidement';
  }

  return 'Equilibre progressif';
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

function CompetitionHeroCard({
  competition,
  exerciseCount,
  hook,
}: {
  competition: Competition;
  exerciseCount: number;
  hook: string;
}) {
  return (
    <Link href={`/concours/${competition.slug}`} className="block h-full">
      <article
        className="h-full rounded-[28px] p-6 transition-transform hover:scale-[1.01]"
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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em]" style={{ color: homeStyles.colors.textMuted }}>
              {competition.organization}
            </p>
            <h3 className="mt-2 text-2xl font-semibold" style={{ color: homeStyles.colors.text }}>
              {competition.name}
            </h3>
          </div>
          <div
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: '#ffffff',
              color: homeStyles.colors.text,
              border: `1px solid ${homeStyles.colors.border}`,
            }}
          >
            {exerciseCount} tests
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
          {competition.description}
        </p>
        <p className="mb-8 text-sm font-medium" style={{ color: homeStyles.colors.text }}>
          {hook}
        </p>
        <div className="flex items-center justify-between text-sm font-medium" style={{ color: homeStyles.colors.text }}>
          <span>Voir la batterie</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </article>
    </Link>
  );
}

function LaneCard({
  title,
  description,
  exercises,
  accent,
  accentBg,
}: {
  title: string;
  description: string;
  exercises: ExerciseConfig[];
  accent: string;
  accentBg: string;
}) {
  const featured = exercises.slice(0, 5);

  return (
    <article
      className="rounded-[24px] p-5"
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${homeStyles.colors.border}`,
        boxShadow: homeStyles.shadows.soft,
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div
            className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: accentBg, color: accent }}
          >
            {exercises.length} exercices
          </div>
          <h3 className="mt-3 text-xl font-semibold" style={{ color: homeStyles.colors.text }}>
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
            {description}
          </p>
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between text-xs" style={{ color: homeStyles.colors.textMuted }}>
        <span>{summarizeDifficulty(exercises)}</span>
        <span>{Math.round(exercises.reduce((sum, exercise) => sum + exercise.estimatedDuration, 0) / Math.max(exercises.length, 1))} min en moyenne</span>
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
              <div
                className="rounded-xl p-2"
                style={{ backgroundColor: '#ffffff', color: accent }}
              >
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

function ExerciseLibraryCard({ exercise }: { exercise: ExerciseConfig }) {
  const primaryType = EXERCISE_TYPES[exercise.primaryType];

  return (
    <Link href={getExerciseUrl(exercise)} target="_blank" className="block h-full">
      <article
        className="h-full rounded-[22px] p-4 transition-transform hover:scale-[1.015]"
        style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${homeStyles.colors.border}`,
          boxShadow: homeStyles.shadows.soft,
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className="rounded-2xl p-2.5"
            style={{ backgroundColor: primaryType.bgColor, color: primaryType.color }}
          >
            {getExerciseIcon(exercise.iconName)}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium" style={{ color: primaryType.color }}>
              {primaryType.label}
            </p>
            <p className="text-[11px]" style={{ color: homeStyles.colors.textMuted }}>
              {exercise.competitions.length} concours
            </p>
          </div>
        </div>
        <h3 className="mb-2 text-base font-semibold" style={{ color: homeStyles.colors.text }}>
          {exercise.title}
        </h3>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
          {exercise.description}
        </p>
        <div className="flex items-center justify-between text-xs" style={{ color: homeStyles.colors.textMuted }}>
          <span>{getDifficultyLabel(exercise.difficulty)}</span>
          <span>~{exercise.estimatedDuration} min</span>
        </div>
      </article>
    </Link>
  );
}

function HomeContent() {
  const [pseudo, setPseudoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeCompetition, setActiveCompetition] = useState<CompetitionId>('psy0');
  const competitions = getAllCompetitions();
  const readyExercises = useMemo(() => EXERCISES.filter((exercise) => exercise.ready), []);

  useEffect(() => {
    void (async () => {
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

  const competitionExercises = useMemo(
    () => getExercisesByCompetition(activeCompetition),
    [activeCompetition]
  );

  const heroHooks: Record<CompetitionId, string> = {
    psy0: 'Ideal pour cadrer une preparation rapide, avec beaucoup d attention, de spatial et de vitesse.',
    psy1: 'La meilleure entree si tu veux travailler le calcul, la 3D et les doubles taches serieuses.',
    'enac-epl': 'Pour une preparation plus large et equilibree, utile si tu veux couvrir toutes les familles critiques.',
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // AuthGate will show login if session is gone / misconfigured
    }
  };

  if (loading) return null;

  return (
    <main className="min-h-screen" style={{ backgroundColor: homeStyles.colors.background }}>
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{
          backgroundColor: 'rgba(251, 250, 249, 0.92)',
          borderBottom: `1px solid ${homeStyles.colors.border}`,
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="rounded-2xl p-2"
                  style={{ backgroundColor: '#fff3e0', color: homeStyles.colors.text }}
                >
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-semibold" style={{ color: homeStyles.colors.text }}>
                    AviaTest
                  </p>
                  <p className="text-xs tracking-[0.18em] uppercase" style={{ color: homeStyles.colors.textMuted }}>
                    Preparation pilote
                  </p>
                </div>
              </div>
              <Link href="/compte" className="xl:hidden">
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5"
                  style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
                >
                  <User className="mr-1 h-3 w-3" />
                  {pseudo || 'Compte'}
                </Badge>
              </Link>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => scrollToId('concours')}
                className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
              >
                Concours
              </button>
              <button
                onClick={() => scrollToId('parcours')}
                className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
              >
                Familles de tests
              </button>
              <Link
                href="/stadium"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${homeStyles.colors.stadiumStart} 0%, ${homeStyles.colors.stadiumEnd} 100%)`,
                  boxShadow: homeStyles.shadows.stadium,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Stadium
                </span>
              </Link>
              <Link
                href="/agora"
                className="rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${homeStyles.colors.agoraStart} 0%, ${homeStyles.colors.agoraEnd} 100%)`,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Agora
                </span>
              </Link>
              <Link
                href="/boite"
                className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
              >
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Boite
                </span>
              </Link>
              <Link
                href="/telephone"
                className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
              >
                <span className="inline-flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Telephone
                </span>
              </Link>
              <Link
                href="/compte"
                className="hidden rounded-full px-4 py-2 text-sm font-medium xl:inline-flex"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
              >
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {pseudo || 'Compte'}
                </span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: '#fff3e0', color: '#9a3412', border: '1px solid #fdba74' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Admin
                  </span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.textMuted, border: `1px solid ${homeStyles.colors.border}` }}
                title="Se deconnecter"
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sortir
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(245, 158, 11, 0.18), transparent 35%), radial-gradient(circle at top right, rgba(63, 127, 121, 0.14), transparent 32%), linear-gradient(180deg, #fbfaf9 0%, #f6efe4 100%)',
          }}
        />
        <div className="relative container mx-auto grid gap-10 px-4 py-12 md:py-18 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm" style={{ borderColor: '#f2d3a1', backgroundColor: '#fff8ed', color: '#9a3412' }}>
              <Sparkles className="h-4 w-4" />
              Nouveau cap : concours, familles de tests et entrainement competif mieux organises
            </div>
            <h1
              className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl"
              style={{ color: homeStyles.colors.text }}
            >
              Une page d&apos;accueil qui te fait entrer par la bonne porte, pas une simple liste de tests.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed md:text-xl" style={{ color: homeStyles.colors.textMuted }}>
              Commence par ton concours, bifurque par famille d&apos;epreuves, puis accelere avec le Stadium. L&apos;organisation est pensee pour entrainer plus vite, avec moins de friction.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => scrollToId('concours')}
                className="rounded-full px-6"
                style={{ backgroundColor: homeStyles.colors.text, color: homeStyles.colors.background }}
              >
                Choisir mon concours
              </Button>
              <Button
                size="lg"
                onClick={() => scrollToId('parcours')}
                className="rounded-full px-6"
                style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
              >
                Explorer les familles de tests
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { label: 'PSY0', href: '/concours/psy0-cadets-air-france' },
                { label: 'PSY1', href: '/concours/psy1-cadets-air-france' },
                { label: 'ENAC EPL', href: '/concours/psy1-enac-epl' },
                { label: 'Tous les exercices', action: () => scrollToId('bibliotheque') },
                { label: 'Progression', href: '/progression' },
              ].map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm font-medium"
                    style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="rounded-full px-4 py-2 text-sm font-medium"
                    style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>

          <aside className="grid gap-4">
            <div
              className="rounded-[30px] p-6 text-white"
              style={{
                background: `linear-gradient(140deg, ${homeStyles.colors.stadiumStart} 0%, #d97706 45%, ${homeStyles.colors.stadiumEnd} 100%)`,
                boxShadow: homeStyles.shadows.stadium,
              }}
            >
              <div className="flex items-center justify-between">
                <Badge className="border-0 bg-white/15 text-white">Priorite du moment</Badge>
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">Stadium</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                L&apos;espace a mettre au centre : competition, repetition, objectif clair et rythme plus heroique.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/12 px-3 py-3">
                  <p className="text-lg font-semibold">{readyExercises.length}</p>
                  <p className="mt-1 text-white/80">tests</p>
                </div>
                <div className="rounded-2xl bg-white/12 px-3 py-3">
                  <p className="text-lg font-semibold">{competitions.length}</p>
                  <p className="mt-1 text-white/80">concours</p>
                </div>
                <div className="rounded-2xl bg-white/12 px-3 py-3">
                  <p className="text-lg font-semibold">Live</p>
                  <p className="mt-1 text-white/80">entrainement</p>
                </div>
              </div>
              <Link
                href="/stadium"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold"
                style={{ color: '#9a3412' }}
              >
                Entrer dans le Stadium
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Link href="/agora" className="block">
                <div
                  className="rounded-[26px] p-5 transition-transform hover:scale-[1.01]"
                  style={{
                    background: `linear-gradient(140deg, ${homeStyles.colors.agoraStart} 0%, ${homeStyles.colors.agoraEnd} 100%)`,
                    color: '#ffffff',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Agora</h3>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/82">
                    Place utile pour les missives, les retours et les priorites collectives.
                  </p>
                </div>
              </Link>
              <Link href="/boite" className="block">
                <div
                  className="rounded-[26px] p-5 transition-transform hover:scale-[1.01]"
                  style={{
                    background: `linear-gradient(140deg, ${homeStyles.colors.boiteStart} 0%, ${homeStyles.colors.boiteEnd} 100%)`,
                    color: homeStyles.colors.text,
                    border: `1px solid ${homeStyles.colors.border}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Boite</h3>
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                    Espace plus discret pour signaler, proposer, remonter un bug ou laisser une idee.
                  </p>
                </div>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section id="concours" className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em]" style={{ color: homeStyles.colors.textMuted }}>
              Porte d&apos;entree
            </p>
            <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
              Commence par ton concours
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
              Au lieu de plonger dans une liste interminable, tu choisis d&apos;abord la batterie qui te concerne. C&apos;est plus proche de la realite de preparation.
            </p>
          </div>
          <Link href="/concours" className="text-sm font-medium" style={{ color: homeStyles.colors.text }}>
            Voir tous les parcours concours
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {competitions.map((competition) => (
            <CompetitionHeroCard
              key={competition.id}
              competition={competition}
              exerciseCount={getExercisesByCompetition(competition.id).length}
              hook={heroHooks[competition.id]}
            />
          ))}
        </div>
      </section>

      <section id="parcours" className="container mx-auto px-4 py-14">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em]" style={{ color: homeStyles.colors.textMuted }}>
            Deuxieme entree
          </p>
          <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
            Naviguer par familles d&apos;epreuves
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
            Organisation plus utile qu&apos;une simple taxonomie brute : chaque bloc correspond a une sensation de travail concrete. Tu sais plus vite ou aller selon ton besoin du jour.
          </p>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {laneData.map((lane) => (
            <LaneCard
              key={lane.id}
              title={lane.title}
              description={lane.description}
              exercises={lane.exercises}
              accent={lane.accent}
              accentBg={lane.accentBg}
            />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div
          className="rounded-[30px] p-6 md:p-8"
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${homeStyles.colors.border}`,
            boxShadow: homeStyles.shadows.soft,
          }}
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.24em]" style={{ color: homeStyles.colors.textMuted }}>
                Vue batterie
              </p>
              <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
                Voir un concours comme une batterie complete
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                Cette vue est utile quand tu veux simuler un vrai programme d&apos;entrainement. Choisis le concours, puis navigue dans ses exercices les plus pertinents sans te disperser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {competitions.map((competition) => (
                <button
                  key={competition.id}
                  onClick={() => setActiveCompetition(competition.id)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85"
                  style={{
                    backgroundColor: activeCompetition === competition.id ? homeStyles.colors.text : '#ffffff',
                    color: activeCompetition === competition.id ? '#fbfaf9' : homeStyles.colors.text,
                    border: `1px solid ${activeCompetition === competition.id ? homeStyles.colors.text : homeStyles.colors.border}`,
                  }}
                >
                  {competition.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {competitionExercises.slice(0, 8).map((exercise) => (
              <Link
                key={`${activeCompetition}-${exercise.id}`}
                href={getExerciseUrl(exercise)}
                target="_blank"
                className="rounded-[22px] p-4 transition-transform hover:scale-[1.015]"
                style={{ backgroundColor: homeStyles.colors.backgroundWarm }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="rounded-xl p-2"
                    style={{
                      backgroundColor: EXERCISE_TYPES[exercise.primaryType].bgColor,
                      color: EXERCISE_TYPES[exercise.primaryType].color,
                    }}
                  >
                    {getExerciseIcon(exercise.iconName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: homeStyles.colors.text }}>
                      {exercise.title}
                    </p>
                    <p className="text-xs" style={{ color: homeStyles.colors.textMuted }}>
                      {EXERCISE_TYPES[exercise.primaryType].label}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                  {exercise.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="bibliotheque" className="container mx-auto px-4 py-14">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em]" style={{ color: homeStyles.colors.textMuted }}>
              Bibliotheque
            </p>
            <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
              Tous les exercices, mais dans une section secondaire
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
              La liste complete existe toujours, mais elle ne domine plus toute la page. Elle vient apres les meilleures portes d&apos;entree.
            </p>
          </div>
          <div className="rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: '#ffffff', color: homeStyles.colors.text, border: `1px solid ${homeStyles.colors.border}` }}>
            {readyExercises.length} exercices disponibles
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {readyExercises.map((exercise) => (
            <ExerciseLibraryCard key={exercise.id} exercise={exercise} />
          ))}
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
              <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                Plateforme d&apos;entrainement structuree autour des vraies facons d&apos;entrer dans la preparation : concours, familles d&apos;epreuves, repetition et competition.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: homeStyles.colors.textMuted }}>
                Acces rapides
              </h3>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href="/stadium" style={{ color: homeStyles.colors.text }}>Stadium</Link>
                <Link href="/agora" style={{ color: homeStyles.colors.text }}>Agora</Link>
                <Link href="/boite" style={{ color: homeStyles.colors.text }}>Boite</Link>
                <Link href="/concours" style={{ color: homeStyles.colors.text }}>Tous les concours</Link>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: homeStyles.colors.textMuted }}>
                Families clees
              </h3>
              <div className="mt-4 flex flex-col gap-2 text-sm" style={{ color: homeStyles.colors.text }}>
                <span>Attention & vitesse</span>
                <span>Spatial & cockpit</span>
                <span>Calcul & logique</span>
                <span>Memoire & multitache</span>
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
