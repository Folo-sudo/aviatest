import { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllCompetitions,
  getExercisesByCompetition,
  EXERCISE_TYPES,
} from '@/lib/data/exercises';
import StructuredData from '@/components/seo/StructuredData';
import { generateBreadcrumbStructuredData } from '@/lib/seo/structured-data';
import { ChevronRight, Plane } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aviatest.fr';

export const metadata: Metadata = {
  title: 'Concours Pilote - PSY0, PSY1, ENAC EPL',
  description:
    'Preparez les concours pilote de ligne : PSY0 et PSY1 Cadets Air France, ENAC EPL. Exercices d\'entrainement gratuits pour chaque selection.',
  keywords: [
    'concours pilote',
    'PSY0 cadets air france',
    'PSY1 cadets air france',
    'ENAC EPL',
    'selection pilote de ligne',
  ],
  alternates: {
    canonical: `${BASE_URL}/concours`,
  },
  openGraph: {
    title: 'Concours Pilote - PSY0, PSY1, ENAC EPL',
    description:
      'Preparez les concours pilote de ligne avec nos exercices d\'entrainement gratuits.',
    url: `${BASE_URL}/concours`,
  },
};

export default function ConcoursPage() {
  const competitions = getAllCompetitions();

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Accueil', url: BASE_URL },
    { name: 'Concours', url: `${BASE_URL}/concours` },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-[#605a57]">
            <Link href="/" className="hover:underline">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#37322f]">Concours</span>
          </nav>

          <div className="flex items-center gap-3 mb-4">
            <Plane className="h-8 w-8 text-[#37322f]" />
            <h1 className="text-3xl font-bold text-[#37322f]">
              Concours Pilote de Ligne
            </h1>
          </div>
          <p className="text-[#605a57] mb-12 max-w-2xl">
            Selectionnez votre concours pour acceder aux exercices
            d&apos;entrainement adaptes a chaque selection.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {competitions.map((competition) => {
              const exercises = getExercisesByCompetition(competition.id);

              // Get unique types for this competition
              const types = [
                ...new Set(exercises.flatMap((e) => e.types)),
              ].slice(0, 4);

              return (
                <Link key={competition.id} href={`/concours/${competition.slug}`}>
                  <article className="h-full bg-white rounded-xl border border-[#e0dedb] hover:shadow-xl transition-all hover:scale-[1.02] overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-[#e0dedb]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#605a57]">
                          {competition.organization}
                        </span>
                        <ChevronRight className="h-5 w-5 text-[#605a57]" />
                      </div>
                      <h2 className="text-2xl font-bold text-[#37322f] mb-1">
                        {competition.name}
                      </h2>
                      <p className="text-sm text-[#605a57]">
                        {competition.fullName}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <p className="text-sm text-[#605a57] mb-4">
                        {competition.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <span className="block text-2xl font-bold text-[#37322f]">
                            {exercises.length}
                          </span>
                          <span className="text-xs text-[#605a57]">exercices</span>
                        </div>
                        <div className="h-8 w-px bg-[#e0dedb]" />
                        <div className="text-center">
                          <span className="block text-2xl font-bold text-[#37322f]">
                            {types.length}
                          </span>
                          <span className="text-xs text-[#605a57]">categories</span>
                        </div>
                      </div>

                      {/* Types */}
                      <div className="flex flex-wrap gap-2">
                        {types.map((type) => {
                          const typeConfig = EXERCISE_TYPES[type];
                          return (
                            <span
                              key={type}
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                backgroundColor: typeConfig.bgColor,
                                color: typeConfig.color,
                              }}
                            >
                              {typeConfig.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
