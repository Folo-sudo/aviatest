import { describe, expect, it } from 'vitest';
import {
  EXERCISES,
  getExerciseById,
  getExerciseBySlug,
  getExerciseUrl,
} from '@/lib/data/exercises';

describe('exercise registry', () => {
  it('has unique ids and slugs', () => {
    const ids = EXERCISES.map((e) => e.id);
    const slugs = EXERCISES.map((e) => e.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('resolves every ready exercise by slug and id', () => {
    for (const exercise of EXERCISES.filter((e) => e.ready)) {
      expect(getExerciseBySlug(exercise.slug)?.id).toBe(exercise.id);
      expect(getExerciseById(exercise.id)?.slug).toBe(exercise.slug);
      expect(getExerciseUrl(exercise)).toBe(`/exercices/${exercise.slug}`);
    }
  });
});
