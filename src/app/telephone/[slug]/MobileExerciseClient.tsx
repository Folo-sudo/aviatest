import ExerciseClient from '@/app/exercices/[slug]/ExerciseClient';

export default function MobileExerciseClient({ slug }: { slug: string }) {
  return <ExerciseClient slug={slug} variant="mobile" isPhone />;
}
