import {
  getAllReadyExercises,
  getExerciseById,
  getExerciseBySlug,
  getExercisesByCompetition,
  type CompetitionId,
  type ExerciseConfig,
} from '@/lib/data/exercises';
import {
  EXERCISE_SETTINGS_KEYS,
  readExerciseSettings,
  writeExerciseSettings,
} from '@/lib/stadium/settingsKeys';
import { loadEntries } from '@/lib/core/PerformanceTracker';
import { scoreToClass } from '@/lib/core/classes';

export const ENCHAINEMENT_QUERY = 'enchainement';
export const ENCHAINEMENT_SETUP_QUERY = 'enchainementSetup';
export const SESSION_KEY = 'aviatest-enchainement-session';
export const DRAFT_KEY = 'aviatest-enchainement-draft';

export interface EnchainementStepResult {
  percent: number | null;
  classNum: number | null;
}

export interface EnchainementStep {
  slug: string;
  id: string;
  title: string;
  settings: Record<string, unknown>;
  previousRaw: string | null;
  result?: EnchainementStepResult;
}

export interface EnchainementSession {
  steps: EnchainementStep[];
  index: number;
  forceExam: boolean;
}

export interface EnchainementDraft {
  ids: string[];
  forceExam: boolean;
}

export function withExamMode(
  exerciseId: string,
  settings: Record<string, unknown>,
  forceExam: boolean,
): Record<string, unknown> {
  if (!forceExam) return { ...settings };
  const next: Record<string, unknown> = { ...settings, examMode: true };
  if (exerciseId === 'clock-angle' || 'showFeedback' in settings) {
    next.showFeedback = false;
  }
  if (exerciseId === 'mental-rotation' || 'showCorrections' in settings) {
    next.showCorrections = false;
  }
  if (exerciseId === 'memory-back' || 'showAnswer' in settings) {
    next.showAnswer = false;
  }
  return next;
}

export function summarizeSettings(settings: Record<string, unknown>): string {
  const bits: string[] = [];
  if (settings.examMode === true || settings.showFeedback === false || settings.showCorrections === false || settings.showAnswer === false) {
    bits.push('Examen');
  }
  const questions =
    settings.totalQuestions ?? settings.numQuestions ?? settings.numSequences ?? settings.numSeries;
  if (typeof questions === 'number') bits.push(`${questions} question${questions > 1 ? 's' : ''}`);
  const perQ = settings.timePerQuestionSec ?? settings.timePerQuestion;
  if (typeof perQ === 'number') bits.push(`${perQ}s / question`);
  const total = settings.timeLimitSec;
  if (typeof total === 'number' && total > 0) {
    bits.push(`${Math.round(total / 60)} min`);
  }
  return bits.length > 0 ? bits.join(' · ') : 'Réglages par défaut';
}

export function readDraft(): EnchainementDraft {
  if (typeof window === 'undefined') return { ids: [], forceExam: true };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ids: [], forceExam: true };
    const parsed = JSON.parse(raw) as Partial<EnchainementDraft>;
    const ids = Array.isArray(parsed.ids)
      ? parsed.ids.filter((id): id is string => typeof id === 'string')
      : [];
    return { ids, forceExam: parsed.forceExam !== false };
  } catch {
    return { ids: [], forceExam: true };
  }
}

export function writeDraft(draft: EnchainementDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function readSession(): EnchainementSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EnchainementSession;
    if (!parsed?.steps?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: EnchainementSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

function previousRawFor(exerciseId: string): string | null {
  const key = EXERCISE_SETTINGS_KEYS[exerciseId];
  if (!key || typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export function restoreStepSettings(step: EnchainementStep): void {
  const key = EXERCISE_SETTINGS_KEYS[step.id];
  if (!key || typeof window === 'undefined') return;
  try {
    if (step.previousRaw == null) localStorage.removeItem(key);
    else localStorage.setItem(key, step.previousRaw);
  } catch {
    /* ignore */
  }
}

export function restoreAllSettings(session: EnchainementSession): void {
  for (const step of session.steps) restoreStepSettings(step);
}

export function buildSession(ids: string[], forceExam: boolean): EnchainementSession | null {
  const steps: EnchainementStep[] = [];
  for (const id of ids) {
    const exercise = getExerciseById(id) ?? getExerciseBySlug(id);
    if (!exercise?.ready) continue;
    const previousRaw = previousRawFor(exercise.id);
    const settings = withExamMode(exercise.id, readExerciseSettings(exercise.id), forceExam);
    steps.push({
      slug: exercise.slug,
      id: exercise.id,
      title: exercise.title,
      settings,
      previousRaw,
    });
  }
  if (steps.length === 0) return null;
  return { steps, index: 0, forceExam };
}

export function applyCurrentSettings(session: EnchainementSession): void {
  const step = session.steps[session.index];
  if (!step) return;
  writeExerciseSettings(step.id, step.settings);
}

export function playUrl(session: EnchainementSession, index = session.index): string {
  const step = session.steps[index];
  if (!step) return '/enchainement/bilan';
  return `/exercices/${step.slug}?${ENCHAINEMENT_QUERY}=1&step=${index}`;
}

export function setupUrl(exercise: ExerciseConfig): string {
  return `/exercices/${exercise.slug}?${ENCHAINEMENT_SETUP_QUERY}=1`;
}

export function recordStepResult(
  session: EnchainementSession,
  result: EnchainementStepResult,
): EnchainementSession {
  const steps = session.steps.map((step, i) =>
    i === session.index ? { ...step, result } : step,
  );
  return { ...session, steps };
}

export function advanceSession(session: EnchainementSession): EnchainementSession {
  return { ...session, index: session.index + 1 };
}

export function isFinished(session: EnchainementSession): boolean {
  return session.index >= session.steps.length;
}

export function fillMissingResults(session: EnchainementSession): EnchainementSession {
  const steps = session.steps.map((step) => {
    if (step.result?.percent != null) return step;
    const entries = loadEntries(step.id);
    const last = entries[entries.length - 1];
    if (!last) return step;
    return {
      ...step,
      result: {
        percent: last.score,
        classNum: scoreToClass(last.score, step.id),
      },
    };
  });
  return { ...session, steps };
}

export function catalogByCompetition(competitionId: CompetitionId): ExerciseConfig[] {
  return getExercisesByCompetition(competitionId);
}

export function catalogAll(): ExerciseConfig[] {
  return getAllReadyExercises();
}
