'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    description:
      'Pour t entrainer a rester precis quand tout va vite : formes, chiffres, signaux et reactions.',
    types: ['attention', 'psychomoteur'],
    accent: '#0ea5e9',
    accentBg: '#e0f2fe',
  },
  {
    id: 'spatial-cockpit',
    title: 'Spatial & cockpit',
    description:
      'Pour visualiser dans l espace, lire des instruments et te situer mentalement comme en cabine.',
    types: ['spatiale'],
    accent: '#d97706',
    accentBg: '#fffbeb',
  },
  {
    id: 'logic-maths',
    title: 'Calcul & logique',
    description:
      'Pour renforcer le calcul mental, les estimations et le raisonnement sous contrainte de temps.',
    types: ['numerique', 'intellectuel'],
    accent: '#7c3aed',
    accentBg: '#f5f3ff',
  },
  {
    id: 'memory-multitask',
    title: 'Memoire & multitache',
    description:
      'Pour tenir plusieurs informations en tete et enchainer sans perdre le fil.',
    types: ['memorisation'],
    accent: '#e11d48',
    accentBg: '#fff1f2',
  },
  {
    id: 'language-comprehension',
    title: 'Verbal & anglais',
    description:
      'Pour comprendre vite, trier des infos et repondre a des QCM ou consignes en francais / anglais.',
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

function CompetitionHeroCard({
  competition,
  exerciseCount,
  hook,
  compact = false,
}: {
  competition: Competition;
  exerciseCount: number;
  hook: string;
  compact?: boolean;
}) {
  return (
    <Link href={`/concours/${competition.slug}`} className="block h-full">
      <article
        className={`h-full rounded-[24px] transition-transform hover:scale-[1.01] ${compact ? 'p-5' : 'p-6'}`}
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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p
              className="text-xs uppercase tracking-[0.22em]"
              style={{ color: homeStyles.colors.textMuted }}
            >
              {competition.organization}
            </p>
            <h3
              className={`mt-2 font-semibold ${compact ? 'text-xl' : 'text-2xl'}`}
              style={{ color: homeStyles.colors.text }}
            >
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
        <p className="mb-3 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
          {competition.description}
        </p>
        <p className="mb-6 text-sm font-medium" style={{ color: homeStyles.colors.text }}>
          {hook}
        </p>
        <div
          className="flex items-center justify-between text-sm font-medium"
          style={{ color: homeStyles.colors.text }}
        >
          <span>Voir les exercices</span>
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
      <div className="mb-5">
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
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: homeStyles.colors.textMuted }}
        >
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

  const psy0 = competitions.find((c) => c.id === 'psy0');
  const psy1 = competitions.find((c) => c.id === 'psy1');
  const enac = competitions.find((c) => c.id === 'enac-epl');

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
    psy0: 'Parfait pour demarrer : attention, spatial et vitesse.',
    psy1: 'Pour monter en niveau : calcul, 3D et doubles taches.',
    'enac-epl': 'Une preparation large, utile pour couvrir toutes les familles de tests.',
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

  const navLinkClass =
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-80';

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
                href="/compte"
                className={navLinkClass}
                style={{
                  backgroundColor: '#ffffff',
                  color: homeStyles.colors.text,
                  border: `1px solid ${homeStyles.colors.border}`,
                }}
              >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[7rem] truncate">{pseudo || 'Profil'}</span>
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
              <button
                onClick={handleLogout}
                className="ml-0.5 inline-flex items-center justify-center rounded-full p-2 transition-opacity hover:opacity-70"
                style={{ color: homeStyles.colors.textMuted }}
                title="Se deconnecter"
                aria-label="Se deconnecter"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Acces rapides : Stadium | Agora + Boite */}
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
            {/* Stadium — hauteur de reference */}
            <Link href="/stadium" className="block h-full min-h-[280px] lg:min-h-[340px]">
              <div
                className="flex h-full flex-col justify-between rounded-[28px] p-6 text-white md:p-7"
                style={{
                  background: `linear-gradient(140deg, ${homeStyles.colors.stadiumStart} 0%, #d97706 45%, ${homeStyles.colors.stadiumEnd} 100%)`,
                  boxShadow: homeStyles.shadows.stadium,
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="border-0 bg-white/15 text-white">Competition</Badge>
                    <Trophy className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold">Stadium</h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/88 md:text-base">
                    Affronte d autres candidats en temps reel : meme epreuve, meme chrono, classement a la
                    cle. Ideal pour mesurer ta progression.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
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
                      <p className="mt-1 text-white/80">sessions</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#9a3412]">
                    Entrer
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Agora (plus grand) + Boite — meme hauteur que Stadium */}
            <div className="grid h-full min-h-[280px] grid-rows-[1.55fr_1fr] gap-4 lg:min-h-[340px]">
              <Link href="/agora" className="block min-h-0">
                <div
                  className="flex h-full flex-col justify-between rounded-[26px] p-5 text-white md:p-6"
                  style={{
                    background: `linear-gradient(140deg, ${homeStyles.colors.agoraStart} 0%, ${homeStyles.colors.agoraEnd} 100%)`,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold md:text-2xl">Agora</h3>
                      <Landmark className="h-5 w-5" />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/85 md:text-base">
                      Les demandes publiees par la communaute. Donne ton accord aux idees les plus utiles
                      : celles qui ont le plus de votes sont traitees en priorite.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/95">
                    Voir l Agora
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>

              <Link href="/boite" className="block min-h-0">
                <div
                  className="flex h-full flex-col justify-between rounded-[26px] p-5 md:p-6"
                  style={{
                    background: `linear-gradient(140deg, ${homeStyles.colors.boiteStart} 0%, ${homeStyles.colors.boiteEnd} 100%)`,
                    color: homeStyles.colors.text,
                    border: `1px solid ${homeStyles.colors.border}`,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold md:text-xl">Boite</h3>
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                      Signale un bug, envoie une missive ou une idee. Tu peux ensuite publier une missive
                      dans l Agora pour recueillir des accords.
                    </p>
                  </div>
                  <span
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
                    style={{ color: homeStyles.colors.text }}
                  >
                    Ouvrir la Boite
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ca marche */}
      <section className="container mx-auto px-4 pb-4 pt-2">
        <div
          className="rounded-[24px] px-5 py-5 md:px-7 md:py-6"
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${homeStyles.colors.border}`,
            boxShadow: homeStyles.shadows.soft,
          }}
        >
          <h2 className="text-xl font-semibold md:text-2xl" style={{ color: homeStyles.colors.text }}>
            Comment fonctionne AviaTest ?
          </h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Choisis ton concours',
                body: 'PSY0 / PSY1 Cadets Air France, ou ENAC EPL. Chaque parcours regroupe les tests utiles a ta selection.',
              },
              {
                step: '2',
                title: 'Entraine-toi',
                body: 'Lance un exercice, regle le mode examen si tu veux, et suis ta progression dans ton profil.',
              },
              {
                step: '3',
                title: 'Passe en competition',
                body: 'Rejoins le Stadium pour te comparer aux autres, ou utilise l Agora / la Boite pour faire remonter une idee.',
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ backgroundColor: homeStyles.colors.backgroundWarm, color: homeStyles.colors.text }}
                >
                  {item.step}
                </span>
                <div>
                  <p className="font-medium" style={{ color: homeStyles.colors.text }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Concours : Cadets AF regroupes, ENAC separe */}
      <section id="concours" className="container mx-auto px-4 py-10 md:py-12">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.22em]" style={{ color: homeStyles.colors.textMuted }}>
            Concours
          </p>
          <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
            Par ou commencer ?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
            Selectionne le concours que tu prepares. Tu retrouveras ensuite tous les exercices rattaches,
            ranges pour t y entrainer sans te perdre.
          </p>
        </div>

        <div className="space-y-6">
          {(psy0 || psy1) && (
            <div
              className="rounded-[28px] p-4 md:p-5"
              style={{
                backgroundColor: 'rgba(255, 248, 237, 0.65)',
                border: `1px solid ${homeStyles.colors.border}`,
              }}
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
                <div>
                  <p
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{ color: homeStyles.colors.textMuted }}
                  >
                    Cadets Air France
                  </p>
                  <p className="mt-1 text-sm" style={{ color: homeStyles.colors.textMuted }}>
                    Deux etapes du meme parcours de selection — PSY0 puis PSY1.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {psy0 && (
                  <CompetitionHeroCard
                    competition={psy0}
                    exerciseCount={getExercisesByCompetition('psy0').length}
                    hook={heroHooks.psy0}
                    compact
                  />
                )}
                {psy1 && (
                  <CompetitionHeroCard
                    competition={psy1}
                    exerciseCount={getExercisesByCompetition('psy1').length}
                    hook={heroHooks.psy1}
                    compact
                  />
                )}
              </div>
            </div>
          )}

          {enac && (
            <div className="pt-2">
              <p
                className="mb-3 px-1 text-xs uppercase tracking-[0.2em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                Autre concours
              </p>
              <div className="max-w-xl">
                <CompetitionHeroCard
                  competition={enac}
                  exerciseCount={getExercisesByCompetition('enac-epl').length}
                  hook={heroHooks['enac-epl']}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="parcours" className="container mx-auto px-4 py-10 md:py-12">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.22em]" style={{ color: homeStyles.colors.textMuted }}>
            Families de tests
          </p>
          <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
            Entraine une competence precise
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
            Tu preferes cibler un point faible ? Choisis une famille (attention, spatial, calcul...) puis
            lance les exercices proposes.
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

      <section className="container mx-auto px-4 py-8 md:py-10">
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
              <p className="text-sm uppercase tracking-[0.22em]" style={{ color: homeStyles.colors.textMuted }}>
                Batterie d exercices
              </p>
              <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
                Apercu d un concours
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
                Change d onglet pour voir les tests rattaches a chaque selection. Clique sur un exercice
                pour l ouvrir dans un nouvel onglet.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {competitions.map((competition) => (
                <button
                  key={competition.id}
                  onClick={() => setActiveCompetition(competition.id)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85"
                  style={{
                    backgroundColor:
                      activeCompetition === competition.id ? homeStyles.colors.text : '#ffffff',
                    color:
                      activeCompetition === competition.id ? '#fbfaf9' : homeStyles.colors.text,
                    border: `1px solid ${
                      activeCompetition === competition.id
                        ? homeStyles.colors.text
                        : homeStyles.colors.border
                    }`,
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

      <section id="bibliotheque" className="container mx-auto px-4 py-10 md:py-12">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em]" style={{ color: homeStyles.colors.textMuted }}>
              Bibliotheque
            </p>
            <h2 className="mt-2 text-3xl font-semibold" style={{ color: homeStyles.colors.text }}>
              Tous les exercices
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: homeStyles.colors.textMuted }}>
              Liste complete si tu veux chercher un test precis. Sinon, passe plutot par un concours ou
              une famille ci-dessus.
            </p>
          </div>
          <div
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: '#ffffff',
              color: homeStyles.colors.text,
              border: `1px solid ${homeStyles.colors.border}`,
            }}
          >
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
                Entrainement gratuit aux tests psychotechniques pour les selections pilote : Cadets Air
                France (PSY0 / PSY1) et ENAC EPL.
              </p>
            </div>
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                Acces rapides
              </h3>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href="/stadium" style={{ color: homeStyles.colors.text }}>
                  Stadium
                </Link>
                <Link href="/agora" style={{ color: homeStyles.colors.text }}>
                  Agora
                </Link>
                <Link href="/boite" style={{ color: homeStyles.colors.text }}>
                  Boite
                </Link>
                <Link href="/compte" style={{ color: homeStyles.colors.text }}>
                  Profil
                </Link>
                <Link href="/telephone" style={{ color: homeStyles.colors.text }}>
                  Mode telephone
                </Link>
              </div>
            </div>
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: homeStyles.colors.textMuted }}
              >
                Families
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
