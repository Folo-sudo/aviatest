'use client';

import { Suspense } from 'react';
import MBackTest from '@/components/exercises/MBackTest';

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">Chargement...</div>
    </div>
  );
}

export default function MBackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MBackTest />
    </Suspense>
  );
}
