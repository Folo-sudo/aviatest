'use client';

import Link from 'next/link';
import { ArrowLeft, Smartphone, Calculator, Target, TriangleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mobileExercises = [
  {
    slug: 'calcul-mental',
    title: 'Calcul Mental',
    description: 'Chaine d\'additions et soustractions avec multiplication optionnelle',
    icon: Calculator,
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  {
    slug: 'calcul-mental-2',
    title: 'Calcul Mental 2',
    description: 'Estimez le resultat et trouvez le plus petit intervalle',
    icon: Target,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  {
    slug: 'calcul-mental-3',
    title: 'Calcul Mental 3',
    description: 'Systemes de 3 equations lineaires par substitution',
    icon: Calculator,
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  {
    slug: 'fiche-angles',
    title: 'Fiche Angles',
    description: 'Estimez l\'angle entre deux aiguilles sur un cercle',
    icon: TriangleRight,
    color: '#D97706',
    bgColor: '#FFFBEB',
  },
];

export default function TelephonePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#fbfaf9' }}>
      {/* Header */}
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

      {/* Content */}
      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#37322f' }}>
              Exercices Mobile
            </h1>
            <p className="text-sm" style={{ color: '#605a57' }}>
              Versions optimisees pour votre telephone
            </p>
          </div>

          <div className="space-y-3">
            {mobileExercises.map((exercise) => {
              const Icon = exercise.icon;
              return (
                <Link key={exercise.slug} href={`/telephone/${exercise.slug}`}>
                  <Card className="mb-3 hover:scale-[1.01] transition-transform cursor-pointer" style={{ borderLeft: `4px solid ${exercise.color}` }}>
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
                          Mobile
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
