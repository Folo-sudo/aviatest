'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import {
  NEWS_BANNER_STORAGE_KEY,
  isNewsBannerActive,
  isNewsBannerPlayRoute,
} from '@/lib/newsBanner';

export default function NewsBanner() {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNewsBannerActive() || isNewsBannerPlayRoute(pathname)) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(NEWS_BANNER_STORAGE_KEY) === '1') {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(NEWS_BANNER_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Nouveautés"
      className="relative z-[60] text-[#1c1917]"
      style={{
        background:
          'linear-gradient(105deg, #fde68a 0%, #fdba74 32%, #5eead4 68%, #7dd3fc 100%)',
      }}
    >
      <div className="container mx-auto flex items-start gap-3 px-4 py-2.5 sm:items-center">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309] sm:mt-0" aria-hidden />
        <p className="min-w-0 flex-1 text-sm leading-snug sm:text-[15px]">
          Refonte du test{' '}
          <Link
            href="/exercices/anglais-psy0"
            className="font-semibold underline decoration-[#b45309]/50 underline-offset-2 hover:decoration-[#b45309]"
          >
            anglais PSY0
          </Link>
          , et ajout d&apos;une{' '}
          <Link
            href="/exercices/fiche-culture-aviation"
            className="font-semibold underline decoration-[#b45309]/50 underline-offset-2 hover:decoration-[#b45309]"
          >
            fiche culture aviation AF
          </Link>
          {' '}(flotte, pionniers, aéroports). Tu peux aussi{' '}
          <Link
            href="/enchainement"
            className="font-semibold underline decoration-[#0f766e]/50 underline-offset-2 hover:decoration-[#0f766e]"
          >
            enchaîner plusieurs tests
          </Link>
          {' '}et viser la classe 7 sur ta{' '}
          <Link
            href="/progression"
            className="font-semibold underline decoration-[#0f766e]/50 underline-offset-2 hover:decoration-[#0f766e]"
          >
            Progression
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-[#44403c] hover:bg-white/40"
          aria-label="Masquer l'annonce"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
