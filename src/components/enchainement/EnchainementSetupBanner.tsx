'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ENCHAINEMENT_SETUP_QUERY } from '@/lib/enchainement/session';
import { clickSettingsButton } from '@/lib/enchainement/dom';

export default function EnchainementSetupBanner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const setup = searchParams.get(ENCHAINEMENT_SETUP_QUERY) === '1';

  useEffect(() => {
    if (!setup) return;
    const begin = Date.now();
    const tick = () => {
      if (clickSettingsButton()) return;
      if (Date.now() - begin > 4000) return;
      window.setTimeout(tick, 80);
    };
    tick();
  }, [setup, slug]);

  if (!setup) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(520px,92vw)] -translate-x-1/2 rounded-xl border border-[#e0dedb] bg-white p-4 shadow-[0_8px_24px_rgba(55,50,47,0.08)]">
      <p className="text-sm text-[#37322f]">
        Règle ce test. Les paramètres seront utilisés dans l&apos;enchaînement.
      </p>
      <Link
        href="/enchainement"
        className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-[#e0dedb] bg-white px-4 text-sm font-medium text-[#37322f]"
      >
        Retour à l&apos;enchaînement
      </Link>
    </div>
  );
}
