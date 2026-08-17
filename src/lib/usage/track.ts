import {
  getExerciseById,
  getExerciseBySlug,
} from '@/lib/data/exercises';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export type UsageEvent = 'open' | 'start' | 'complete';
export type UsageVariant = 'desktop' | 'mobile';

const START_CLICK_RE =
  /Commencer|Rejouer|Recommencer|\bJouer\b|Cadran \(actuelle\)|Angle non oriente/i;

const lastSent = new Map<string, number>();
const DEBOUNCE_MS = 1500;

function resolveExerciseId(key: string): string | null {
  const raw = key.trim().toLowerCase();
  if (!raw) return null;
  const bySlug = getExerciseBySlug(raw);
  if (bySlug) return bySlug.id;
  const byId = getExerciseById(raw);
  if (byId) return byId.id;
  if (raw === 'm-back') {
    const mem = getExerciseById('memory-back') || getExerciseBySlug('memory-back');
    if (mem) return mem.id;
  }
  return null;
}

export function trackExerciseUsage(
  key: string,
  event: UsageEvent,
  variant: UsageVariant = 'desktop',
): void {
  if (typeof window === 'undefined') return;
  if (!isSupabaseConfigured()) return;
  const exerciseId = resolveExerciseId(key);
  if (!exerciseId) return;

  const stampKey = `${exerciseId}:${event}:${variant}`;
  const now = Date.now();
  const prev = lastSent.get(stampKey) ?? 0;
  if (now - prev < DEBOUNCE_MS) return;
  lastSent.set(stampKey, now);

  void import('@/lib/supabase/client')
    .then(({ getSupabaseBrowserClient }) => {
      const supabase = getSupabaseBrowserClient();
      return supabase.rpc('record_exercise_usage', {
        p_exercise_id: exerciseId,
        p_event: event,
        p_variant: variant,
      });
    })
    .catch(() => {
      /* ignore */
    });
}

function buttonLooksLikeStart(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  const btn = el.closest('button, [role="button"]');
  if (!btn) return false;
  const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text || /Retour|Accueil|Changer de mode/i.test(text)) return false;
  return START_CLICK_RE.test(text);
}

export function attachExerciseStartListener(
  slug: string,
  variant: UsageVariant,
): () => void {
  const onClick = (e: MouseEvent) => {
    if (buttonLooksLikeStart(e.target)) {
      trackExerciseUsage(slug, 'start', variant);
    }
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
