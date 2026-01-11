'use client';

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
} from 'lucide-react';
import {
  EXERCISES,
  EXERCISE_TYPES,
  getAllCompetitions,
  getDifficultyLabel,
  type ExerciseConfig,
} from '@/lib/data/exercises';

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

  // Build exercise URL - handle m-back special case
  let exerciseUrl = `/exercices/${exercise.slug}`;
  if (exercise.id === 'm2-back') {
    exerciseUrl = '/exercices/m-back?n=2';
  } else if (exercise.id === 'm3-back') {
    exerciseUrl = '/exercices/m-back?n=3';
  }

  return (
    <Link href={exerciseUrl}>
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

export default function Home() {
  const competitions = getAllCompetitions();
  const readyExercises = EXERCISES.filter((e) => e.ready);

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
                PsychoTech
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

      {/* Exercises Grid */}
      <section id="exercices" className="container mx-auto px-4 py-16">
        <div className="mb-10">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: homeStyles.colors.text }}
          >
            Tous les exercices
          </h2>
          <p style={{ color: homeStyles.colors.textMuted }}>
            {readyExercises.length} tests couvrant les competences evaluees lors
            des selections
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
                  PsychoTech Training
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
                {Object.values(EXERCISE_TYPES)
                  .slice(0, 5)
                  .map((type) => (
                    <li
                      key={type.id}
                      className="text-sm"
                      style={{ color: homeStyles.colors.textMuted }}
                    >
                      {type.label}
                    </li>
                  ))}
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
