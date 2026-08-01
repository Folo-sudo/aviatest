'use client';

import AuthGate from '@/components/AuthGate';

export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
