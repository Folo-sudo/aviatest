'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Play, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';

type GameState = 'menu' | 'settings' | 'playing' | 'results';

interface GameSettings {
  numSeries: number;
  flashDuration: number;
  examMode: boolean;
}

interface WordItem {
  word: string;
  themeId: string;
}

interface BoxState {
  capacity: number;
  slots: (string | null)[];
  themeId: string | null;
}

interface SeriesState {
  boxes: BoxState[];
  wordQueue: WordItem[];
  themeMapping: Record<string, number>;
  currentWordIndex: number;
}

const SETTINGS_KEY = 'aviatest-boites-mots-settings';
const EXERCISE_ID = 'boites-mots';
const DEFAULT_SETTINGS: GameSettings = { numSeries: 5, flashDuration: 1.5, examMode: false };

const THEME_PACKS: Record<string, string[]> = {
  'Races de chiens': [
    'BEAGLE', 'BOXER', 'CANICHE', 'DALMATIEN', 'DOBERMAN', 'LABRADOR',
    'TERRIER', 'ROTTWEILER', 'BERGER', 'BULLDOG', 'COLLEY', 'DOGUE',
  ],
  'Ustensiles de cuisine': [
    'FOURCHETTE', 'CUILLERE', 'COUTEAU', 'POELE', 'CASSEROLE', 'SALADIER',
    'FOUET', 'LOUCHE', 'PLAT', 'VERSEUSE', 'RAPPE', 'PASSOIRE',
  ],
  'Arbres': [
    'CHENE', 'HETRE', 'SAPIN', 'ERABLE', 'BOULEAU', 'TILLEUL',
    'ORME', 'PEUPLIER', 'OLIVIER', 'PALMIER', 'CYPRES', 'NOYER',
  ],
  'Villes': [
    'PARIS', 'LYON', 'MARSEILLE', 'TOULOUSE', 'NICE', 'NANTES',
    'BORDEAUX', 'LILLE', 'RENNES', 'STRASBOURG', 'DIJON', 'TOURS',
  ],
  'Sports': [
    'FOOTBALL', 'TENNIS', 'RUGBY', 'NATATION', 'BOXE', 'CYCLISME',
    'SKI', 'GOLF', 'JUDO', 'EQUITATION', 'HOCKEY', 'ESCALADE',
  ],
  'Fruits': [
    'POMME', 'POIRE', 'BANANE', 'CERISE', 'FRAISE', 'ORANGE',
    'CITRON', 'RAISIN', 'PECHE', 'ABRICOT', 'KIWI', 'MANGUE',
  ],
  'Metiers': [
    'MEDECIN', 'AVOCAT', 'BOULANGER', 'PILOTE', 'INFIRMIER', 'MACON',
    'PLOMBIER', 'MENUISIER', 'COIFFEUR', 'FARMACIEN', 'JUGE', 'ARCHITECTE',
  ],
  'Animaux marins': [
    'BALEINE', 'DAUPHIN', 'REQUIN', 'MEDUSE', 'PIEUVRE', 'CRABE',
    'HOMARD', 'PHOQUE', 'MORSE', 'RAIE', 'THON', 'SARDINE',
  ],
  'Instruments': [
    'PIANO', 'GUITARE', 'VIOLON', 'FLUTE', 'TROMPETTE', 'BATTERIE',
    'CLARINETTE', 'HARPE', 'SAXOPHONE', 'ACCORDEON', 'TAMBOUR', 'COR',
  ],
};

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: GameSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleWords(themeId: string, count: number): string[] {
  const pool = THEME_PACKS[themeId];
  return shuffle(pool).slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSeries(): SeriesState {
  const numBoxes = randomInt(3, 4);
  const themeNames = shuffle(Object.keys(THEME_PACKS)).slice(0, numBoxes);

  const boxes: BoxState[] = themeNames.map(() => {
    const capacity = randomInt(4, 6);
    return {
      capacity,
      slots: Array(capacity).fill(null),
      themeId: null,
    };
  });

  const wordQueue: WordItem[] = [];
  themeNames.forEach((themeId, i) => {
    const words = sampleWords(themeId, boxes[i].capacity);
    words.forEach(word => wordQueue.push({ word, themeId }));
  });

  return {
    boxes,
    wordQueue: shuffle(wordQueue),
    themeMapping: {},
    currentWordIndex: 0,
  };
}

function getNextEmptySlot(box: BoxState): number {
  return box.slots.findIndex(s => s === null);
}

export default function BoitesMotsTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [scorer] = useState(() => new Scorer());

  const [seriesIndex, setSeriesIndex] = useState(0);
  const [series, setSeries] = useState<SeriesState | null>(null);
  const [totalErrors, setTotalErrors] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [wordAppearTime, setWordAppearTime] = useState(0);
  const [tick, setTick] = useState(0);

  const perfSavedRef = useRef(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const persistSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const startSeries = useCallback(() => {
    setSeries(generateSeries());
    setSelectedBox(null);
    setWordAppearTime(performance.now());
  }, []);

  const startPlaying = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    setSeriesIndex(0);
    setTotalErrors(0);
    setGameState('playing');
    startSeries();
  }, [scorer, startSeries]);

  const completeSeries = useCallback(() => {
    const next = seriesIndex + 1;
    if (next >= settings.numSeries) {
      setGameState('results');
    } else {
      setSeriesIndex(next);
      startSeries();
    }
  }, [seriesIndex, settings.numSeries, startSeries]);

  const placeWordInBox = useCallback((boxIndex: number) => {
    if (!series) return;
    const current = series.wordQueue[series.currentWordIndex];
    if (!current) return;

    const box = series.boxes[boxIndex];
    const slotIndex = getNextEmptySlot(box);
    if (slotIndex === -1) {
      if (!settings.examMode) {
        setErrorFlash(true);
        setTimeout(() => setErrorFlash(false), 250);
      }
      return;
    }

    const mappedBox = series.themeMapping[current.themeId];
    let isCorrect = false;

    if (mappedBox === undefined) {
      if (box.themeId === null || box.themeId === current.themeId) {
        isCorrect = true;
      }
    } else {
      isCorrect = mappedBox === boxIndex;
    }

    scorer.recordAnswer(isCorrect);

    if (!isCorrect) {
      setTotalErrors(e => e + 1);
      if (!settings.examMode) {
        setErrorFlash(true);
        setTimeout(() => setErrorFlash(false), 250);
      }
      return;
    }

    if (!settings.examMode) {
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 280);
    }

    const newBoxes = series.boxes.map((b, i) => {
      if (i !== boxIndex) return b;
      const newSlots = [...b.slots];
      newSlots[slotIndex] = current.word;
      return {
        ...b,
        slots: newSlots,
        themeId: b.themeId ?? current.themeId,
      };
    });

    const newMapping = { ...series.themeMapping };
    const firstLock = newMapping[current.themeId] === undefined;
    if (firstLock) {
      newMapping[current.themeId] = boxIndex;
    }

    // When a theme is first locked to a box, drop excess upcoming words for
    // that theme so they fit remaining capacity (avoids stranded words).
    let newQueue = series.wordQueue;
    if (firstLock) {
      const remainingSlots =
        newBoxes[boxIndex].slots.filter((s) => s === null).length;
      let keptForTheme = 0;
      newQueue = series.wordQueue.filter((item, idx) => {
        if (idx <= series.currentWordIndex) return true;
        if (item.themeId !== current.themeId) return true;
        if (keptForTheme < remainingSlots) {
          keptForTheme += 1;
          return true;
        }
        return false;
      });
    }

    const nextWordIndex = series.currentWordIndex + 1;
    if (nextWordIndex >= newQueue.length) {
      setSeries({
        ...series,
        boxes: newBoxes,
        wordQueue: newQueue,
        themeMapping: newMapping,
        currentWordIndex: nextWordIndex,
      });
      setTimeout(() => completeSeries(), 400);
    } else {
      setSeries({
        ...series,
        boxes: newBoxes,
        wordQueue: newQueue,
        themeMapping: newMapping,
        currentWordIndex: nextWordIndex,
      });
      setSelectedBox(null);
      setWordAppearTime(performance.now());
    }
  }, [series, scorer, completeSeries, settings.examMode]);

  const handleBoxClick = useCallback((boxIndex: number) => {
    setSelectedBox(boxIndex);
    placeWordInBox(boxIndex);
  }, [placeWordInBox]);

  useEffect(() => {
    if (gameState !== 'playing' || !series) return;
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, [gameState, series]);

  const currentWord = series?.wordQueue[series.currentWordIndex] ?? null;
  const flashElapsed = currentWord ? (performance.now() - wordAppearTime) / 1000 : 0;
  const isFlashing = flashElapsed < settings.flashDuration;
  const wordOpacity = currentWord ? (isFlashing ? 1 : 0.45) : 0;
  void tick;

  if (gameState === 'menu') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Boites a mots</CardTitle>
            <CardDescription className="text-lg">
              Classez les mots par champ lexical dans les bonnes boites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-[#f7f5f3] p-4">
                <p className="text-2xl font-bold text-[#37322f]">{settings.numSeries}</p>
                <p className="text-sm text-[#605a57]">Series</p>
              </div>
              <div className="rounded-lg bg-[#f7f5f3] p-4">
                <p className="text-2xl font-bold text-[#37322f]">3-4</p>
                <p className="text-sm text-[#605a57]">Boites par serie</p>
              </div>
            </div>
            <p className="text-center text-sm text-[#605a57]">
              Le premier mot d&apos;un theme fixe la boite correspondante. Minimisez les erreurs.
            </p>
            {settings.examMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                Mode examen — pas de retour visuel sur les placements
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <Play className="mr-2 h-5 w-5" /> Jouer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}>
                <Settings className="mr-2 h-5 w-5" /> Parametres
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'settings') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
            <CardDescription>Reglages enregistres localement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Nombre de series : {settings.numSeries}</Label>
                <Slider
                  value={[settings.numSeries]}
                  onValueChange={([v]) => persistSettings({ ...settings, numSeries: v })}
                  min={1}
                  max={15}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Duree du flash (s) : {settings.flashDuration.toFixed(1)}</Label>
                <Slider
                  value={[settings.flashDuration]}
                  onValueChange={([v]) => persistSettings({ ...settings, flashDuration: v })}
                  min={1.2}
                  max={1.8}
                  step={0.1}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode examen</Label>
                  <p className="mt-0.5 text-xs text-[#605a57]">Pas de retour visuel sur les placements</p>
                </div>
                <Switch
                  checked={settings.examMode}
                  onCheckedChange={(v) => persistSettings({ ...settings, examMode: v })}
                />
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === 'results') {
    const scoreData = scorer.toJSON();
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult(EXERCISE_ID, scoreData.correct, scoreData.total);
    }
    const perfEntries = loadEntries(EXERCISE_ID);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ClassScoreBlock
              exerciseId={EXERCISE_ID}
              percent={scoreData.score}
              detail={`${scoreData.correct}/${scoreData.total} placements corrects`}
            />
            <p className="text-center text-sm text-slate-400">{totalErrors} erreurs au total</p>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{settings.numSeries}</p>
                <p className="text-sm text-[#605a57]">Series jouees</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{scoreData.maxStreak}</p>
                <p className="text-sm text-[#605a57]">Meilleure serie</p>
              </div>
            </div>
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startPlaying}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('menu')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Menu
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const wordsDone = series?.currentWordIndex ?? 0;
  const wordsTotal = series?.wordQueue.length ?? 0;

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center p-4 transition-colors duration-200 ${
        errorFlash ? 'bg-red-100' : successFlash ? 'bg-green-100' : 'bg-[#e8e8e8]'
      }`}
    >
      <div className="w-full max-w-5xl rounded-xl border border-slate-300 bg-[#f0f0f0] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between text-base font-medium text-[#605a57]">
          <span>Serie {seriesIndex + 1}/{settings.numSeries}</span>
          <span>Mot {Math.min(wordsDone + 1, wordsTotal)}/{wordsTotal}</span>
          <span className={totalErrors > 0 ? 'text-red-600' : ''}>Erreurs : {totalErrors}</span>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {series?.boxes.map((box, boxIndex) => {
            const isSelected = selectedBox === boxIndex;
            const themeLabel = box.themeId ?? (series.themeMapping
              ? Object.entries(series.themeMapping).find(([, idx]) => idx === boxIndex)?.[0]
              : null);

            return (
              <button
                key={boxIndex}
                type="button"
                onClick={() => handleBoxClick(boxIndex)}
                className={`rounded-lg border-2 bg-white p-3 text-left transition-all hover:border-slate-500 hover:shadow-md ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-400'
                }`}
              >
                {themeLabel && (
                  <p className="mb-2 truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {themeLabel}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {box.slots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className={`flex h-9 items-center justify-center rounded border text-sm font-medium ${
                        slot
                          ? 'border-slate-300 bg-slate-100 text-slate-800'
                          : 'border-dashed border-slate-300 bg-[#f7f5f3] text-transparent'
                      }`}
                    >
                      {slot ?? '.'}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-[120px] flex-col items-center justify-center">
          {currentWord ? (
            <p
              className={`text-center font-bold text-slate-800 transition-all duration-300 ${
                isFlashing ? 'scale-110 text-5xl md:text-6xl' : 'scale-100 text-4xl md:text-5xl'
              }`}
              style={{
                opacity: wordOpacity,
                animation: isFlashing ? 'pulse 0.6s ease-in-out' : undefined,
              }}
            >
              {currentWord.word}
            </p>
          ) : (
            <p className="text-lg text-slate-400">Serie terminee</p>
          )}
          {currentWord && !isFlashing && (
            <p className="mt-2 text-xs text-slate-400">Cliquez une boite pour classer le mot</p>
          )}
        </div>
      </div>
    </div>
  );
}
