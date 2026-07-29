'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Lock,
  BarChart3,
  User,
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
import {
  getPseudo,
  setPseudo as setStoredPseudo,
  listPseudos,
} from '@/lib/core/PerformanceTracker';

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

const PASSWORD = 'Obelix41';

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      sessionStorage.setItem('aviatest-auth', 'true');
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: homeStyles.colors.background }}
    >
      <div
        className="w-full max-w-md mx-4 p-8 rounded-2xl text-center"
        style={{
          backgroundColor: homeStyles.colors.cardBg,
          border: `1px solid ${homeStyles.colors.border}`,
          boxShadow: homeStyles.shadows.card,
        }}
      >
        <div
          className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f0eeeb' }}
        >
          <Lock className="h-7 w-7" style={{ color: homeStyles.colors.text }} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Target className="h-6 w-6" style={{ color: homeStyles.colors.text }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: homeStyles.colors.text }}
          >
            AviaTest
          </h1>
        </div>
        <p
          className="text-sm mb-8"
          style={{ color: homeStyles.colors.textMuted }}
        >
          Entrez le mot de passe pour acceder aux exercices
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            className="text-center text-lg"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-500">Mot de passe incorrect</p>
          )}
          <Button
            type="submit"
            className="w-full"
            style={{
              backgroundColor: homeStyles.colors.text,
              color: homeStyles.colors.background,
            }}
          >
            Acceder
          </Button>
        </form>
      </div>
    </main>
  );
}

function PseudoGate({ onSelect }: { onSelect: (pseudo: string) => void }) {
  const [name, setName] = useState('');
  const [known, setKnown] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load client-only localStorage data after hydration
    setKnown(listPseudos());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredPseudo(trimmed);
    onSelect(trimmed);
  };

  const selectExisting = (pseudo: string) => {
    setStoredPseudo(pseudo);
    onSelect(pseudo);
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: homeStyles.colors.background }}
    >
      <div
        className="w-full max-w-md mx-4 p-8 rounded-2xl text-center"
        style={{
          backgroundColor: homeStyles.colors.cardBg,
          border: `1px solid ${homeStyles.colors.border}`,
          boxShadow: homeStyles.shadows.card,
        }}
      >
        <div
          className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f0eeeb' }}
        >
          <User className="h-7 w-7" style={{ color: homeStyles.colors.text }} />
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: homeStyles.colors.text }}
        >
          Qui es-tu ?
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: homeStyles.colors.textMuted }}
        >
          Choisis un pseudo pour suivre ta progression
        </p>

        {known.length > 0 && (
          <div className="mb-6">
            <p
              className="text-xs font-medium mb-3"
              style={{ color: homeStyles.colors.textMuted }}
            >
              Pseudos existants
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {known.map((p) => (
                <button
                  key={p}
                  onClick={() => selectExisting(p)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: homeStyles.colors.border,
                    color: homeStyles.colors.text,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ backgroundColor: homeStyles.colors.border }} />
              <span className="text-xs" style={{ color: homeStyles.colors.textMuted }}>ou</span>
              <div className="flex-1 h-px" style={{ backgroundColor: homeStyles.colors.border }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Nouveau pseudo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-center text-lg"
            maxLength={20}
            autoFocus={known.length === 0}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim()}
            style={{
              backgroundColor: homeStyles.colors.text,
              color: homeStyles.colors.background,
            }}
          >
            Continuer
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pseudo, setPseudoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const competitions = getAllCompetitions();
  const readyExercises = EXERCISES.filter((e) => e.ready);
  const exercisesByType = groupExercisesByTypes(readyExercises, EXERCISE_TYPE_ORDER);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load client-only state after hydration
    setAuthenticated(sessionStorage.getItem('aviatest-auth') === 'true');
    setPseudoState(getPseudo());
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />;
  }

  if (!pseudo) {
    return <PseudoGate onSelect={(p) => setPseudoState(p)} />;
  }

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
          <div className="flex items-center justify-between">
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
            <nav className="flex items-center gap-4">
              {competitions.slice(0, 2).map((competition) => (
                <Link
                  key={competition.id}
                  href={`/concours/${competition.slug}`}
                  className="text-sm transition-colors hidden sm:block hover:opacity-80"
                  style={{ color: homeStyles.colors.textMuted }}
                >
                  {competition.name}
                </Link>
              ))}
              <button
                onClick={() => setPseudoState(null)}
                className="flex items-center gap-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: homeStyles.colors.text }}
                title="Changer de pseudo"
              >
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{pseudo}</span>
              </button>
              <Link href="/progression">
                <Badge
                  variant="secondary"
                  className="flex gap-1 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: homeStyles.colors.border,
                    color: homeStyles.colors.text,
                    border: 'none',
                  }}
                >
                  <BarChart3 className="h-3 w-3" />
                  Progression
                </Badge>
              </Link>
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
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: homeStyles.colors.cardBg,
                border: `1px solid ${homeStyles.colors.border}`,
                boxShadow: homeStyles.shadows.card,
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: `1px solid ${homeStyles.colors.border}`,
                  backgroundColor: config.bgColor,
                }}
              >
                <h3
                  className="text-lg font-semibold"
                  style={{ color: config.color }}
                >
                  {config.label}
                </h3>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: homeStyles.colors.cardBg,
                    color: config.color,
                  }}
                >
                  {exercises.length}
                </span>
              </div>
              <ul className="p-4 space-y-1">
                {exercises.map((exercise) => (
                  <li key={`${type}-${exercise.id}`}>
                    <Link
                      href={getExerciseUrl(exercise)}
                      target="_blank"
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:opacity-90"
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
