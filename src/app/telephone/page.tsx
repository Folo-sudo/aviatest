'use client';

import Link from 'next/link';
import { ArrowLeft, Smartphone, Target, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EXERCISES } from '@/lib/data/exercises';
import {
  getExerciseMobileProfile,
  hasDedicatedMobileVariant,
} from '@/lib/exercises/mobile';

const mobileExercises = EXERCISES.filter((exercise) => exercise.ready).map((exercise) => {
  const mobileProfile = getExerciseMobileProfile(exercise.slug);

  return {
    slug: exercise.slug,
    title: exercise.title,
    description: mobileProfile.note,
    dedicated: hasDedicatedMobileVariant(exercise.slug),
    icon: mobileProfile.experience === 'dedicated'
      ? Smartphone
      : mobileProfile.experience === 'responsive'
        ? Target
        : X,
    color: mobileProfile.experience === 'dedicated'
      ? '#2563EB'
      : mobileProfile.experience === 'responsive'
        ? '#0891B2'
        : '#D97706',
    bgColor: mobileProfile.experience === 'dedicated'
      ? '#EFF6FF'
      : mobileProfile.experience === 'responsive'
        ? '#ECFEFF'
        : '#FFFBEB',
    badgeLabel: mobileProfile.experience === 'dedicated'
      ? 'Optimise mobile'
      : mobileProfile.experience === 'responsive'
        ? 'Compatible'
        : 'A optimiser',
  };
});

export default function TelephonePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#fbfaf9' }}>
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: '#fbfaf9',
          borderBottom: '1px solid #e0dedb',
        }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" style={{ color: '#37322f' }} />
              <span className="text-lg font-semibold" style={{ color: '#37322f' }}>
                Mode Telephone
              </span>
            </div>
            <Link
              href="/"
              className="text-sm flex items-center gap-1 hover:opacity-80"
              style={{ color: '#605a57' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <section
            className="mb-8 rounded-[28px] border p-6 shadow-[0_10px_30px_rgba(55,50,47,0.08)]"
            style={{ background: 'linear-gradient(180deg, #fffaf3 0%, #ffffff 100%)', borderColor: '#e0dedb' }}
          >
            <h1 className="text-3xl font-bold mb-3" style={{ color: '#37322f' }}>
              Version telephone
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: '#605a57' }}>
              Cette page n&apos;est plus une simple liste mobile. Elle sert de tableau de bord ergonomique : tu vois immédiatement quels tests sont deja optimises, simplement compatibles, ou encore a repenser.
            </p>
          </section>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] bg-white p-5 shadow-[0_8px_26px_rgba(55,50,47,0.08)]" style={{ border: '1px solid #e0dedb' }}>
              <p className="text-sm font-medium" style={{ color: '#37322f' }}>Optimises mobile</p>
              <p className="mt-2 text-3xl font-semibold" style={{ color: '#2563EB' }}>
                {mobileExercises.filter((exercise) => exercise.badgeLabel === 'Optimise mobile').length}
              </p>
            </div>
            <div className="rounded-[22px] bg-white p-5 shadow-[0_8px_26px_rgba(55,50,47,0.08)]" style={{ border: '1px solid #e0dedb' }}>
              <p className="text-sm font-medium" style={{ color: '#37322f' }}>Compatibles</p>
              <p className="mt-2 text-3xl font-semibold" style={{ color: '#0891B2' }}>
                {mobileExercises.filter((exercise) => exercise.badgeLabel === 'Compatible').length}
              </p>
            </div>
            <div className="rounded-[22px] bg-white p-5 shadow-[0_8px_26px_rgba(55,50,47,0.08)]" style={{ border: '1px solid #e0dedb' }}>
              <p className="text-sm font-medium" style={{ color: '#37322f' }}>A optimiser</p>
              <p className="mt-2 text-3xl font-semibold" style={{ color: '#D97706' }}>
                {mobileExercises.filter((exercise) => exercise.badgeLabel === 'A optimiser').length}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {mobileExercises.map((exercise) => {
              const Icon = exercise.icon;
              return (
                <Link key={exercise.slug} href={`/telephone/${exercise.slug}`} target="_blank">
                  <Card className="h-full hover:scale-[1.01] transition-transform cursor-pointer" style={{ borderLeft: `4px solid ${exercise.color}`, boxShadow: '0 8px 24px rgba(55,50,47,0.08)' }}>
                    <CardContent className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg shrink-0"
                          style={{ backgroundColor: exercise.bgColor, color: exercise.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold" style={{ color: '#37322f' }}>
                            {exercise.title}
                          </h3>
                          <p className="text-sm mt-0.5" style={{ color: '#605a57' }}>
                            {exercise.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs" style={{ backgroundColor: '#e0dedb', color: '#37322f' }}>
                          {exercise.badgeLabel}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
