'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import AuthGate from '@/components/AuthGate';
import StadiumBanner from '@/components/StadiumBanner';
import StadiumPlayGate from '@/components/StadiumPlayGate';
import DuelBanner from '@/components/DuelBanner';
import DuelPlayGate from '@/components/DuelPlayGate';
import EnchainementPlayGate from '@/components/enchainement/EnchainementPlayGate';
import EnchainementSetupBanner from '@/components/enchainement/EnchainementSetupBanner';
import {
  desktopComponents,
  getComponentLookupKey,
  getPreferredVariant,
  mobileComponents,
  type ExerciseVariant,
} from '@/components/exercises/exerciseRegistry';
import { PhoneLayoutProvider } from '@/components/phone/PhoneLayout';
import {
  startExercisePresence,
  stopExercisePresence,
} from '@/lib/presence/exercisePresence';
import {
  attachExerciseStartListener,
  trackExerciseUsage,
  type UsageVariant,
} from '@/lib/usage/track';

function ExercisePresence({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const createMode =
    searchParams.get('stadiumCreate') === '1' ||
    searchParams.get('duelCreate') === '1';
  const duelId = searchParams.get('duelId');
  const competitionId = searchParams.get('competitionId');

  useEffect(() => {
    if (createMode || duelId || competitionId) return;
    startExercisePresence();
    return () => stopExercisePresence();
  }, [slug, createMode, duelId, competitionId]);

  return null;
}

function ExerciseUsage({
  slug,
  variant,
}: {
  slug: string;
  variant: UsageVariant;
}) {
  const searchParams = useSearchParams();
  const createMode =
    searchParams.get('stadiumCreate') === '1' ||
    searchParams.get('duelCreate') === '1';

  useEffect(() => {
    if (createMode) return;
    trackExerciseUsage(slug, 'open', variant);
    return attachExerciseStartListener(slug, variant);
  }, [slug, variant, createMode]);

  return null;
}
function ExerciseLoader({
  slug,
  variant,
  isPhone,
}: {
  slug: string;
  variant: ExerciseVariant;
  isPhone: boolean;
}) {
  const searchParams = useSearchParams();
  const n = searchParams.get('n');
  const lookupKey = getComponentLookupKey(slug);
  const preferredVariant = getPreferredVariant(slug, variant, isPhone);
  const Component =
    preferredVariant === 'mobile'
      ? mobileComponents[lookupKey] ?? desktopComponents[slug] ?? desktopComponents[lookupKey]
      : desktopComponents[slug] ?? desktopComponents[lookupKey];

  if (!Component) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf9]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#37322f] mb-2">
            Exercice non trouve
          </h1>
          <p className="text-[#605a57]">
            L&apos;exercice demande n&apos;existe pas.
          </p>
        </div>
      </div>
    );
  }

  const phone = isPhone || variant === 'mobile';
  const inner =
    (slug === 'm-back' || slug === 'memory-back') && n ? (
      <Component n={parseInt(n, 10)} />
    ) : (
      <Component />
    );

  return <PhoneLayoutProvider active={phone}>{inner}</PhoneLayoutProvider>;
}

export default function ExerciseClient({
  slug,
  variant = 'auto',
  isPhone = false,
}: {
  slug: string;
  variant?: ExerciseVariant;
  isPhone?: boolean;
}) {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#fbfaf9]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322f] mx-auto mb-4" />
              <p className="text-[#605a57]">Chargement de l&apos;exercice...</p>
            </div>
          </div>
        }
      >
        <ExercisePresence slug={slug} />
        <ExerciseUsage
          slug={slug}
          variant={isPhone || variant === 'mobile' ? 'mobile' : 'desktop'}
        />
        <StadiumBanner slug={slug} />
        <DuelBanner slug={slug} />
        <EnchainementSetupBanner slug={slug} />
        <StadiumPlayGate slug={slug}>
          <EnchainementPlayGate slug={slug}>
            <DuelPlayGate slug={slug}>
              <ExerciseLoader slug={slug} variant={variant} isPhone={isPhone} />
            </DuelPlayGate>
          </EnchainementPlayGate>
        </StadiumPlayGate>
      </Suspense>
    </AuthGate>
  );
}
