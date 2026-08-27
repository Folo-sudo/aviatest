'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Play, Settings, X } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  COMPETITIONS,
  EXERCISE_TYPES,
  getAllCompetitions,
  getExerciseById,
  type CompetitionId,
} from '@/lib/data/exercises';
import { readExerciseSettings } from '@/lib/stadium/settingsKeys';
import {
  buildSession,
  catalogAll,
  catalogByCompetition,
  playUrl,
  readDraft,
  setupUrl,
  summarizeSettings,
  writeDraft,
  writeSession,
} from '@/lib/enchainement/session';

export default function EnchainementClient() {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [forceExam, setForceExam] = useState(true);
  const [filter, setFilter] = useState<CompetitionId | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const draft = readDraft();
    setIds(draft.ids);
    setForceExam(draft.forceExam);
  }, []);

  const persist = (nextIds: string[], nextExam = forceExam) => {
    setIds(nextIds);
    writeDraft({ ids: nextIds, forceExam: nextExam });
  };

  const catalog = useMemo(() => {
    const base = filter === 'all' ? catalogAll() : catalogByCompetition(filter);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        EXERCISE_TYPES[e.primaryType].label.toLowerCase().includes(q),
    );
  }, [filter, query]);

  const queue = ids
    .map((id) => getExerciseById(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const add = (id: string) => persist([...ids, id]);
  const remove = (index: number) => persist(ids.filter((_, i) => i !== index));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...ids];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    persist(next);
  };

  const addCompetition = (competitionId: CompetitionId) => {
    const extra = catalogByCompetition(competitionId)
      .map((e) => e.id)
      .filter((id) => !ids.includes(id));
    persist([...ids, ...extra]);
  };

  const launch = () => {
    const session = buildSession(ids, forceExam);
    if (!session) return;
    writeSession(session);
    writeDraft({ ids, forceExam });
    router.push(playUrl(session));
  };

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#fbfaf9]">
        <div className="container mx-auto px-4 py-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#605a57] hover:text-[#37322f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>

          <section className="rounded-[30px] border border-[#e0dedb] bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] p-8 shadow-[0_12px_34px_rgba(55,50,47,0.08)]">
            <p className="text-xs uppercase tracking-[0.26em] text-[#605a57]">Simulation</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-[#37322f] md:text-5xl">
              Enchaînement
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#605a57]">
              Choisis plusieurs tests, règle chacun comme tu veux, puis lance le parcours : ils
              s&apos;enchaînent sans menu ni pause, pour te familiariser avec le rythme d&apos;un
              examen.
            </p>
            <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-[#e0dedb] bg-white px-4 py-3">
              <div>
                <Label>Mode examen sur tout le parcours</Label>
                <p className="mt-0.5 text-xs text-[#605a57]">
                  Pas de correction entre les questions, quand le test le permet. Tes réglages
                  (durée, nombre de questions…) restent ceux de chaque test.
                </p>
              </div>
              <Switch
                checked={forceExam}
                onCheckedChange={(v) => {
                  setForceExam(v);
                  writeDraft({ ids, forceExam: v });
                }}
              />
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[24px] border border-[#e0dedb] bg-white p-5 shadow-[0_8px_24px_rgba(55,50,47,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#37322f]">Tests</h2>
                <div className="flex flex-wrap gap-2">
                  {getAllCompetitions().map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addCompetition(c.id)}
                      className="rounded-full border border-[#e0dedb] px-3 py-1 text-xs text-[#37322f] hover:bg-[#f7f5f3]"
                    >
                      Ajouter {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-full px-3 py-1 text-xs ${
                    filter === 'all' ? 'bg-[#37322f] text-white' : 'border border-[#e0dedb] text-[#605a57]'
                  }`}
                >
                  Tous
                </button>
                {(Object.keys(COMPETITIONS) as CompetitionId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      filter === id ? 'bg-[#37322f] text-white' : 'border border-[#e0dedb] text-[#605a57]'
                    }`}
                  >
                    {COMPETITIONS[id].name}
                  </button>
                ))}
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un test"
                className="mt-4 w-full rounded-xl border border-[#e0dedb] bg-[#fbfaf9] px-3 py-2 text-sm text-[#37322f] outline-none focus:border-[#cfcac4]"
              />
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
                {catalog.map((exercise) => {
                  const type = EXERCISE_TYPES[exercise.primaryType];
                  return (
                    <li key={exercise.id}>
                      <button
                        type="button"
                        onClick={() => add(exercise.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e0dedb] px-3 py-2.5 text-left hover:bg-[#f7f5f3]"
                      >
                        <span>
                          <span className="block text-sm font-medium text-[#37322f]">{exercise.title}</span>
                          <span className="text-xs text-[#605a57]">{type.label}</span>
                        </span>
                        <span className="text-xs text-[#605a57]">Ajouter</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-[24px] border border-[#e0dedb] bg-white p-5 shadow-[0_8px_24px_rgba(55,50,47,0.06)]">
              <h2 className="text-lg font-semibold text-[#37322f]">Parcours</h2>
              <p className="mt-1 text-sm text-[#605a57]">
                {queue.length === 0
                  ? 'Ajoute au moins un test.'
                  : `${queue.length} test${queue.length > 1 ? 's' : ''} · dans cet ordre`}
              </p>
              <ol className="mt-4 space-y-3">
                {queue.map((exercise, index) => (
                  <li
                    key={`${exercise.id}-${index}`}
                    className="rounded-xl border border-[#e0dedb] bg-[#fbfaf9] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[#37322f]">
                          {index + 1}. {exercise.title}
                        </p>
                        <p className="mt-1 text-xs text-[#605a57]">
                          {summarizeSettings(readExerciseSettings(exercise.id))}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded-md p-1 text-[#605a57] hover:bg-white"
                        aria-label="Retirer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          writeDraft({ ids, forceExam });
                          router.push(setupUrl(exercise));
                        }}
                      >
                        <Settings className="mr-1 h-3.5 w-3.5" />
                        Régler
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === queue.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
              <Button
                className="sticky bottom-4 mt-6 w-full"
                size="lg"
                disabled={queue.length === 0}
                onClick={launch}
              >
                <Play className="mr-2 h-5 w-5" />
                Lancer l&apos;enchaînement
              </Button>
            </section>
          </div>
        </div>
      </main>
    </AuthGate>
  );
}
