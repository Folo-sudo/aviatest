import { Metadata } from 'next';
import Link from 'next/link';
import {
  EXERCISE_TYPES,
  getAllCompetitions,
  getExercisesByCompetition,
} from '@/lib/data/exercises';
import StructuredData from '@/components/seo/StructuredData';
import { generateBreadcrumbStructuredData } from '@/lib/seo/structured-data';
import { ArrowLeft, ArrowRight, Trophy } from 'lucide-react';

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
          <nav className="mb-8 flex items-center gap-2 text-sm text-[#605a57]">
            <Link href="/" className="hover:underline">Accueil</Link>
            <span>/</span>
            <span className="text-[#37322f]">Concours</span>
          </nav>

          <section className="rounded-[30px] border border-[#e0dedb] bg-[linear-gradient(180deg,#fffaf3_0%,#f6efe4_100%)] p-8 shadow-[0_12px_34px_rgba(55,50,47,0.08)]">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#37322f] md:text-5xl">
              Concours
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/stadium"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#b45309_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(180,83,9,0.24)]"
              >
                <Trophy className="h-4 w-4" />
                Stadium
              </Link>
              <Link
                href="/exercices"
                className="inline-flex items-center gap-2 rounded-full border border-[#e0dedb] bg-white px-5 py-3 text-sm font-medium text-[#37322f]"
              >
                Tous les exercices
              </Link>
            </div>
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-3">
            {competitions.map((competition) => {
              const exercises = getExercisesByCompetition(competition.id);
              const types = [...new Set(exercises.flatMap((exercise) => exercise.types))].slice(0, 4);

              return (
                <Link key={competition.id} href={`/concours/${competition.slug}`} className="block h-full">
                  <article
                    className="h-full rounded-[28px] border border-[#e0dedb] bg-white p-6 transition-transform hover:scale-[1.012]"
                    style={{
                      boxShadow: '0 10px 30px rgba(55,50,47,0.08)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[#605a57]">
                          {competition.organization}
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold text-[#37322f]">
                          {competition.name}
                        </h2>
                        <p className="mt-1 text-sm text-[#605a57]">{competition.fullName}</p>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 text-[#605a57]" />
                    </div>

                    <p className="mt-5 text-sm leading-relaxed text-[#605a57]">
                      {competition.description}
                    </p>

                    <div className="mt-6 rounded-2xl bg-[#f8f5f2] px-4 py-4">
                      <p className="text-2xl font-semibold text-[#37322f]">{exercises.length}</p>
                      <p className="mt-1 text-xs text-[#605a57]">exercices</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {types.map((type) => {
                        const config = EXERCISE_TYPES[type];
                        return (
                          <span
                            key={type}
                            className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                            }}
                          >
                            {config.label}
                          </span>
                        );
                      })}
                    </div>
                  </article>
                </Link>
              );
            })}
          </section>

          <section className="mt-12 rounded-[28px] border border-[#e0dedb] bg-white p-6 shadow-[0_10px_30px_rgba(55,50,47,0.08)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#37322f]">Comment utiliser cette page</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#605a57]">
                  Choisis ton concours, entre dans sa batterie, puis travaille soit les blocs les plus critiques, soit le Stadium pour faire monter la repetition et la competitivite.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#37322f]"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour accueil
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
