'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Binary,
  BookOpen,
  Shapes,
  Circle,
  Brain,
  RotateCcw,
  Target,
  Plane,
  ChevronDown,
  ChevronRight,
  Smartphone,
  User,
  LogOut,
  Trophy,
  MessageSquare,
  Landmark,
  Inbox,
  Gamepad2,
  Boxes,
  Box,
  LayoutGrid,
  Cuboid,
  Calculator,
  Library,
  Star,
  Languages,
  Car,
  Route,
} from 'lucide-react';
import {
  EXERCISES,
  EXERCISE_TYPES,
  EXERCISE_TYPE_ORDER,
  getAllCompetitions,
  getDifficultyLabel,
  groupExercisesByTypes,
  getExerciseUrl,
  type ExerciseConfig,
} from '@/lib/data/exercises';
import { getPseudo } from '@/lib/core/PerformanceTracker';
import { syncPseudoFromProfile } from '@/lib/account/profile';
import AuthGate from '@/components/AuthGate';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';

// ============================================================================
// Design System - Warm Cream/Beige Palette
// ============================================================================

const homeStyles = {
  colors: {
    background: '#fbfaf9',
    text: '#37322f',
    textMuted: '#605a57',
    border: '#e0dedb',
    cardBg: '#ffffff',
  },
  shadows: {
    card: '0 8px 24px rgba(55, 50, 47, 0.08)',
  },
};

// Map icon names to components
const iconMap: Record<string, React.ReactNode> = {
  Clock: <Clock className="h-6 w-6" />,
  Binary: <Binary className="h-6 w-6" />,
  BookOpen: <BookOpen className="h-6 w-6" />,
  Shapes: <Shapes className="h-6 w-6" />,
  Circle: <Circle className="h-6 w-6" />,
  Brain: <Brain className="h-6 w-6" />,
  RotateCcw: <RotateCcw className="h-6 w-6" />,
  Gamepad2: <Gamepad2 className="h-6 w-6" />,
  Plane: <Plane className="h-6 w-6" />,
  Boxes: <Boxes className="h-6 w-6" />,
  Box: <Box className="h-6 w-6" />,
  LayoutGrid: <LayoutGrid className="h-6 w-6" />,
  Cuboid: <Cuboid className="h-6 w-6" />,
  Calculator: <Calculator className="h-6 w-6" />,
  Library: <Library className="h-6 w-6" />,
  Star: <Star className="h-6 w-6" />,
  Languages: <Languages className="h-6 w-6" />,
  Car: <Car className="h-6 w-6" />,
  Route: <Route className="h-6 w-6" />,
};

function getExerciseIcon(iconName: string): React.ReactNode {
  return iconMap[iconName] || <Circle className="h-6 w-6" />;
}

function scrollToExercises() {
  document.getElementById('exercices')?.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// Exercise Card Component
// ============================================================================

function ExerciseCard({ exercise }: { exercise: ExerciseConfig }) {
  const primaryTypeConfig = EXERCISE_TYPES[exercise.primaryType];
  const exerciseUrl = getExerciseUrl(exercise);

  return (
    <Link href={exerciseUrl} target="_blank">
      <div
        className="h-full cursor-pointer transition-transform hover:scale-[1.02]"
        style={{
          boxShadow: homeStyles.shadows.card,
        }}
      >
        <div
          className="h-full rounded-xl overflow-hidden"
          style={{
            backgroundColor: homeStyles.colors.cardBg,
            border: `1px solid ${homeStyles.colors.border}`,
            borderLeft: `4px solid ${primaryTypeConfig.color}`,
          }}
        >
          <div className="p-5">
            {/* Icon with colored background */}
            <div className="flex items-start justify-between mb-4">
              <div
                className="p-2.5 rounded-lg"
                style={{
                  backgroundColor: primaryTypeConfig.bgColor,
                  color: primaryTypeConfig.color,
                }}
              >
                {getExerciseIcon(exercise.iconName)}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: primaryTypeConfig.color }}
                >
                  {primaryTypeConfig.label}
                </span>
                {exercise.types.length > 1 && (
                  <span
                    className="text-[10px]"
                    style={{ color: homeStyles.colors.textMuted }}
                  >
                    +{exercise.types.length - 1} autre{exercise.types.length > 2 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h3
              className="text-base font-semibold mb-2"
              style={{ color: homeStyles.colors.text }}
            >
              {exercise.title}
            </h3>

            {/* Description */}
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: homeStyles.colors.textMuted }}
            >
              {exercise.description}
            </p>

            {/* Difficulty */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ color: homeStyles.colors.textMuted }}
              >
                {getDifficultyLabel(exercise.difficulty)}
              </span>
              <span
                className="text-xs"
                style={{ color: homeStyles.colors.textMuted }}
              >
                ~{exercise.estimatedDuration} min
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Competition Card Component
// ============================================================================

function CompetitionCard({
  name,
  fullName,
  slug,
  exerciseCount,
}: {
  name: string;
  fullName: string;
  slug: string;
  exerciseCount: number;
}) {
  return (
    <Link href={`/concours/${slug}`}>
      <div
        className="p-6 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
        style={{
          backgroundColor: homeStyles.colors.cardBg,
          border: `1px solid ${homeStyles.colors.border}`,
          boxShadow: homeStyles.shadows.card,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-lg font-semibold mb-1"
              style={{ color: homeStyles.colors.text }}
            >
              {name}
            </h3>
            <p
              className="text-sm"
              style={{ color: homeStyles.colors.textMuted }}
            >
              {fullName}
            </p>
            <p
              className="text-xs mt-2"
              style={{ color: homeStyles.colors.textMuted }}
            >
              {exerciseCount} exercices disponibles
            </p>
          </div>
          <ChevronRight
            className="h-5 w-5"
            style={{ color: homeStyles.colors.textMuted }}
          />
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function HomeContent() {
  const [pseudo, setPseudoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const competitions = getAllCompetitions();
  const readyExercises = EXERCISES.filter((e) => e.ready);
  const exercisesByType = groupExercisesByTypes(readyExercises, EXERCISE_TYPE_ORDER);

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
    <main
      className="min-h-screen"
      style={{ backgroundColor: homeStyles.colors.background }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: homeStyles.colors.background,
          borderBottom: `1px solid ${homeStyles.colors.border}`,
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Target
                className="h-7 w-7"
                style={{ color: homeStyles.colors.text }}
              />
              <span
                className="text-xl font-semibold"
                style={{ color: homeStyles.colors.text }}
              >
                AviaTest
              </span>
            </div>
            <nav className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
              <Link
                href="/stadium"
                className="flex items-center gap-1 text-sm hover:opacity-80"
                style={{ color: homeStyles.colors.textMuted }}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stadium</span>
              </Link>
              <Link
                href="/agora"
                className="flex items-center gap-1 text-sm hover:opacity-80"
                style={{ color: homeStyles.colors.textMuted }}
              >
                <Landmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Agora</span>
              </Link>
              <Link
                href="/boite"
                className="flex items-center gap-1 text-sm hover:opacity-80"
                style={{ color: homeStyles.colors.textMuted }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Boite</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-sm hover:opacity-80"
                  style={{ color: homeStyles.colors.text }}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              {competitions.slice(0, 2).map((competition) => (
                <Link
                  key={competition.id}
                  href={`/concours/${competition.slug}`}
                  className="text-sm transition-colors hidden lg:block hover:opacity-80"
                  style={{ color: homeStyles.colors.textMuted }}
                >
                  {competition.name}
                </Link>
              ))}
              <Link
                href="/compte"
                className="flex items-center gap-1 text-sm hover:opacity-80"
                style={{ color: homeStyles.colors.text }}
              >
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{pseudo || 'Compte'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: homeStyles.colors.textMuted }}
                title="Se deconnecter"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deconnexion</span>
              </button>
              <Link href="/telephone">
                <Badge
                  variant="secondary"
                  className="flex gap-1 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: homeStyles.colors.border,
                    color: homeStyles.colors.text,
                    border: 'none',
                  }}
                >
                  <Smartphone className="h-3 w-3" />
                  Telephone
                </Badge>
              </Link>
              <Link href="/concours">
                <Badge
                  variant="secondary"
                  className="hidden md:flex gap-1 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: homeStyles.colors.border,
                    color: homeStyles.colors.text,
                    border: 'none',
                  }}
                >
                  <Plane className="h-3 w-3" />
                  Tous les concours
                </Badge>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1
            className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ color: homeStyles.colors.text }}
          >
            Reussissez vos tests psychotechniques pilote
          </h1>
          <p
            className="text-xl mb-8"
            style={{ color: homeStyles.colors.textMuted }}
          >
            Preparez-vous aux selections ENAC EPL, Cadets Air France et
            compagnies aeriennes avec nos exercices d&apos;entrainement gratuits.
          </p>
          <Button
            size="lg"
            onClick={scrollToExercises}
            className="gap-2"
            style={{
              backgroundColor: homeStyles.colors.text,
              color: homeStyles.colors.background,
              border: 'none',
            }}
          >
            Commencer l&apos;entrainement
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Competitions Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: homeStyles.colors.text }}
          >
            Preparez votre concours
          </h2>
          <p style={{ color: homeStyles.colors.textMuted }}>
            Exercices adaptes a chaque selection
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {competitions.map((competition) => {
            const exerciseCount = EXERCISES.filter(
              (e) => e.competitions.includes(competition.id) && e.ready
            ).length;
            return (
              <CompetitionCard
                key={competition.id}
                name={competition.name}
                fullName={competition.fullName}
                slug={competition.slug}
                exerciseCount={exerciseCount}
              />
            );
          })}
        </div>
      </section>

      {/* Exercises by aptitude (Pilotest-style) */}
      <section id="exercices" className="container mx-auto px-4 py-16">
        <div className="mb-10">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: homeStyles.colors.text }}
          >
            Tous les exercices
          </h2>
          <p style={{ color: homeStyles.colors.textMuted }}>
            Classes par aptitude, comme sur les batteries de selection :{' '}
            {readyExercises.length} tests disponibles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
          {exercisesByType.map(({ type, config, exercises }) => (
            <div
              key={type}
              className="h-full rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: homeStyles.colors.cardBg,
                border: `1px solid ${homeStyles.colors.border}`,
                borderLeft: `4px solid ${config.color}`,
                boxShadow: homeStyles.shadows.card,
              }}
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: homeStyles.colors.text }}
                  >
                    {config.label}
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: homeStyles.colors.textMuted }}
                  >
                    {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-2 py-1 rounded"
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
              </div>
              <ul
                className="px-4 pb-4 space-y-1"
                style={{ borderTop: `1px solid ${homeStyles.colors.border}` }}
              >
                {exercises.map((exercise) => (
                  <li key={`${type}-${exercise.id}`}>
                    <Link
                      href={getExerciseUrl(exercise)}
                      target="_blank"
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                      style={{ color: homeStyles.colors.text }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = config.bgColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span className="font-medium">{exercise.title}</span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0"
                        style={{ color: homeStyles.colors.textMuted }}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: homeStyles.colors.text }}
          >
            Detail des exercices
          </h3>
          <p style={{ color: homeStyles.colors.textMuted }}>
            Fiches completes avec difficulte et duree estimee
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {readyExercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8"
        style={{ borderTop: `1px solid ${homeStyles.colors.border}` }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target
                  className="h-5 w-5"
                  style={{ color: homeStyles.colors.text }}
                />
                <span
                  className="font-semibold"
                  style={{ color: homeStyles.colors.text }}
                >
                  AviaTest
                </span>
              </div>
              <p
                className="text-sm"
                style={{ color: homeStyles.colors.textMuted }}
              >
                Preparation gratuite aux tests psychotechniques pour selections
                pilote de ligne
              </p>
            </div>

            {/* Concours */}
            <div>
              <h4
                className="font-semibold mb-3"
                style={{ color: homeStyles.colors.text }}
              >
                Concours
              </h4>
              <ul className="space-y-2">
                {competitions.map((competition) => (
                  <li key={competition.id}>
                    <Link
                      href={`/concours/${competition.slug}`}
                      className="text-sm hover:underline"
                      style={{ color: homeStyles.colors.textMuted }}
                    >
                      {competition.fullName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Types */}
            <div>
              <h4
                className="font-semibold mb-3"
                style={{ color: homeStyles.colors.text }}
              >
                Types de tests
              </h4>
              <ul className="space-y-2">
                {EXERCISE_TYPE_ORDER.map((typeId) => {
                  const type = EXERCISE_TYPES[typeId];
                  return (
                    <li
                      key={type.id}
                      className="text-sm"
                      style={{ color: homeStyles.colors.textMuted }}
                    >
                      {type.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div
            className="text-center text-xs pt-6"
            style={{
              borderTop: `1px solid ${homeStyles.colors.border}`,
              color: homeStyles.colors.textMuted,
            }}
          >
            <p>ENAC EPL · Cadets Air France · PSY0 · PSY1</p>
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
