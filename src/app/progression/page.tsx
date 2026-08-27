'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BarChart3, Trash2, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  EXERCISES,
  type ExerciseConfig,
} from '@/lib/data/exercises';
import {
  getAllExerciseStats,
  getAllExerciseStatsFromMap,
  clearAllPerformanceData,
  migratePerformanceData,
  scoreToStanine,
  getPseudo,
  type ExerciseStats,
} from '@/lib/core/PerformanceTracker';
import PerformanceChart from '@/components/PerformanceChart';
import AuthGate from '@/components/AuthGate';
import {
  fetchCloudEntriesForUser,
  lookupPseudo,
  syncPseudoFromProfile,
} from '@/lib/account/profile';

function stanineBadge(score: number | null, exerciseId?: string) {
  if (score === null) return null;
  const s = scoreToStanine(score, exerciseId);
  let bg: string;
  let text: string;
  if (s >= 7) { bg = '#DBEAFE'; text = '#1E40AF'; }
  else if (s >= 5) { bg = '#DCFCE7'; text = '#166534'; }
  else if (s >= 3) { bg = '#FEF3C7'; text = '#92400E'; }
  else { bg = '#FFE4E6'; text = '#991B1B'; }
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold"
      style={{ backgroundColor: bg, color: text }}
    >
      {s}
    </span>
  );
}

function scoreBadge(score: number | null, exerciseId?: string) {
  if (score === null) {
    return <span className="text-xs text-slate-400">-</span>;
  }
  return stanineBadge(score, exerciseId);
}

export default function ProgressionPage() {
  return (
    <AuthGate requireAccount>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
            Chargement...
          </div>
        }
      >
        <ProgressionContent />
      </Suspense>
    </AuthGate>
  );
}

function ProgressionContent() {
  const searchParams = useSearchParams();
  const viewPseudo = searchParams.get('pseudo')?.trim() || null;

  const [allStats, setAllStats] = useState<ExerciseStats[]>([]);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwn, setIsOwn] = useState(true);
  const [confirmStep, setConfirmStep] = useState(0);

  useEffect(() => {
    (async () => {
      setLoaded(false);
      setError(null);
      try {
        const myPseudo = (await syncPseudoFromProfile()) || getPseudo();

        if (!viewPseudo || (myPseudo && viewPseudo.toLowerCase() === myPseudo.toLowerCase())) {
          setIsOwn(true);
          setPseudo(myPseudo);
          if (myPseudo) {
            migratePerformanceData();
            setAllStats(getAllExerciseStats());
          } else {
            setAllStats([]);
          }
        } else {
          setIsOwn(false);
          const profile = await lookupPseudo(viewPseudo);
          if (!profile) {
            setPseudo(viewPseudo);
            setError('Pseudo introuvable.');
            setAllStats([]);
          } else if (!profile.can_view) {
            setPseudo(profile.username);
            setError('Cette progression est privee.');
            setAllStats([]);
          } else {
            setPseudo(profile.username);
            const map = await fetchCloudEntriesForUser(profile.id);
            setAllStats(getAllExerciseStatsFromMap(map));
          }
        }
      } catch {
        setError('Impossible de charger la progression.');
        setAllStats([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, [viewPseudo]);

  const handleClear = () => {
    clearAllPerformanceData();
    setAllStats([]);
    setConfirmStep(0);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Chargement...
      </div>
    );
  }

  if (isOwn && !pseudo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-500 mb-2">Profil incomplet</p>
            <p className="text-sm text-slate-400 mb-6">
              Ouvre ton compte pour verifier ton pseudo.
            </p>
            <Link href="/compte">
              <Button>Mon compte</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card>
          <CardContent className="py-12 text-center max-w-md">
            <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-500 mb-2">{pseudo}</p>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <div className="flex gap-2 justify-center">
              <Link href="/compte">
                <Button variant="outline">Compte</Button>
              </Link>
              <Link href="/">
                <Button>Accueil</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exercisesWithStats: { config: ExerciseConfig; stats: ExerciseStats }[] = [];
  const statsMap = new Map(allStats.map((s) => [s.exerciseId, s]));

  for (const ex of EXERCISES) {
    if (!ex.ready) continue;
    const stats = statsMap.get(ex.id);
    if (stats) {
      exercisesWithStats.push({ config: ex, stats });
    }
  }

  const exercisesWithoutStats: ExerciseConfig[] = EXERCISES.filter(
    (ex) => ex.ready && !statsMap.has(ex.id) && ex.id !== 'glossaire-angles',
  );

  const totalAttempts = allStats.reduce((s, st) => s + st.totalAttempts, 0);
  const globalAvg =
    allStats.length > 0
      ? Math.round(allStats.reduce((s, st) => s + st.avgScore, 0) / allStats.length)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={isOwn ? '/compte' : '/compte'}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> {isOwn ? 'Compte' : 'Compte'}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-700" />
              <h1 className="text-lg font-bold text-slate-700">
                {isOwn ? 'Progression' : 'Progression publique'}
              </h1>
            </div>
            {pseudo && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{pseudo}</span>
              </div>
            )}
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Accueil
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {exercisesWithStats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-slate-700">{exercisesWithStats.length}</p>
                <p className="text-xs text-slate-500">Exercices pratiques</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-slate-700">{totalAttempts}</p>
                <p className="text-xs text-slate-500">Sessions totales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-slate-700">{globalAvg}%</p>
                <p className="text-xs text-slate-500">Moyenne generale</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-slate-700">{scoreBadge(globalAvg)}</p>
                <p className="text-xs text-slate-500 mt-1">Stanine moyen</p>
              </CardContent>
            </Card>
          </div>
        )}

        {exercisesWithStats.length === 0 && (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-500 mb-2">Aucune donnee de progression</p>
              <p className="text-sm text-slate-400 mb-6">
                {isOwn
                  ? 'Completez des exercices pour voir votre progression ici.'
                  : 'Ce joueur n a pas encore de resultats synchronises.'}
              </p>
              {isOwn && (
                <Link href="/">
                  <Button>Commencer un exercice</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {exercisesWithStats.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Graphiques de progression
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {exercisesWithStats.map(({ config, stats }) => (
                <Card key={config.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <PerformanceChart
                      entries={stats.entries}
                      exerciseId={config.id}
                      width={280}
                      height={150}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 truncate">
                        {config.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {stats.totalAttempts}x
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {exercisesWithStats.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Classes
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Exercice</th>
                        <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs">
                          <div>SESSIONS</div>
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs">
                          <div>MOY. DEPUIS</div>
                          <div className="font-bold text-slate-700">LE DEBUT</div>
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs hidden md:table-cell">
                          <div>MOY. DEPUIS</div>
                          <div className="font-bold text-slate-700">7 JOURS</div>
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs hidden md:table-cell">
                          <div>MOY. DEPUIS</div>
                          <div className="font-bold text-slate-700">3 JOURS</div>
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs">
                          <div>DERNIER</div>
                          <div className="font-bold text-slate-700">RESULTAT</div>
                        </th>
                        <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs hidden md:table-cell">
                          <div>TEMPS MOY.</div>
                          <div className="font-bold text-slate-700">PAR PLANCHE</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {exercisesWithStats.map(({ config, stats }) => {
                        const stanAvg = scoreToStanine(stats.avgScore, config.id);
                        return (
                          <tr key={config.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-700">{config.title}</span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-500">
                              {stats.totalAttempts}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1">
                                {stanineBadge(stats.worstScore, config.id)}
                                <span
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold"
                                  style={{
                                    backgroundColor: stanAvg >= 5 ? '#DCFCE7' : '#FEF3C7',
                                    color: stanAvg >= 5 ? '#166534' : '#92400E',
                                  }}
                                >
                                  {stanAvg}
                                </span>
                                {stanineBadge(stats.bestScore, config.id)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center hidden md:table-cell">
                              {stats.last7DaysAvg !== null
                                ? scoreBadge(stats.last7DaysAvg, config.id)
                                : <span className="text-xs text-slate-400">Pas de resultat<br />sur cette periode</span>}
                            </td>
                            <td className="py-3 px-3 text-center hidden md:table-cell">
                              {stats.last3DaysAvg !== null
                                ? scoreBadge(stats.last3DaysAvg, config.id)
                                : <span className="text-xs text-slate-400">Pas de resultat<br />sur cette periode</span>}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {scoreBadge(stats.lastScore, config.id)}
                            </td>
                            <td className="py-3 px-3 text-center hidden md:table-cell">
                              {stats.avgTimeSec !== null ? (
                                <div>
                                  <span className="font-semibold text-slate-700">{stats.avgTimeSec}s</span>
                                  {stats.lastAvgTimeSec !== null && (
                                    <div className="text-[10px] text-slate-400">dernier : {stats.lastAvgTimeSec}s</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {isOwn && exercisesWithoutStats.length > 0 && exercisesWithStats.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-400 mb-3">
              Exercices non pratiques ({exercisesWithoutStats.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {exercisesWithoutStats.map((ex) => (
                <Badge key={ex.id} variant="outline" className="text-slate-400">
                  {ex.title}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {isOwn && exercisesWithStats.length > 0 && (
          <section className="mt-16 mb-8 border-t border-slate-200 pt-8">
            {confirmStep === 0 && (
              <div className="text-center">
                <button
                  onClick={() => setConfirmStep(1)}
                  className="text-xs text-slate-400 hover:text-slate-500 transition-colors underline underline-offset-2"
                >
                  Reinitialiser les donnees
                </button>
              </div>
            )}
            {confirmStep === 1 && (
              <div className="text-center space-y-3">
                <p className="text-sm text-slate-500">
                  Supprimer toutes les donnees de progression de <strong>{pseudo}</strong> ?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmStep(2)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Oui, continuer
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmStep(0)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
            {confirmStep === 2 && (
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-red-600">
                  Cette action est irreversible. Confirmer la suppression ?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="destructive" size="sm" onClick={handleClear}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer definitivement
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmStep(0)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
