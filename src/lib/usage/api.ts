import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type ExerciseUsageRow = {
  exercise_id: string;
  opens: number;
  starts: number;
  completes: number;
  opens_7d: number;
  starts_7d: number;
  completes_7d: number;
  opens_mobile: number;
  starts_mobile: number;
  completes_mobile: number;
};

export async function listExerciseUsage(): Promise<ExerciseUsageRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_exercise_usage');
  if (error) {
    if (/not_admin/i.test(error.message)) throw new Error('not_admin');
    throw error;
  }
  return ((data || []) as ExerciseUsageRow[]).map((r) => ({
    exercise_id: r.exercise_id,
    opens: Number(r.opens) || 0,
    starts: Number(r.starts) || 0,
    completes: Number(r.completes) || 0,
    opens_7d: Number(r.opens_7d) || 0,
    starts_7d: Number(r.starts_7d) || 0,
    completes_7d: Number(r.completes_7d) || 0,
    opens_mobile: Number(r.opens_mobile) || 0,
    starts_mobile: Number(r.starts_mobile) || 0,
    completes_mobile: Number(r.completes_mobile) || 0,
  }));
}
