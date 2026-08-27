'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Play, RotateCcw, Settings } from 'lucide-react';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { loadEntries } from '@/lib/core/PerformanceTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export const EXAM_BANNER_TEXT = 'Mode examen — pas de correction entre les questions';
export const EXAM_HINT_TEXT =
  'Pas de correction entre les questions. Les résultats s’affichent à la fin.';

export function ExerciseFrame({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf9] p-4">
      <Card className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>{children}</Card>
    </div>
  );
}

export type StatItem = { value: ReactNode; label: string };

export function StatTiles({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;
  const cols =
    items.length === 1 ? 'grid-cols-1' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className={`grid gap-3 text-center ${cols}`}>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg bg-[#f7f5f3] p-3 sm:p-4">
          <p className="text-xl font-bold text-[#37322f] sm:text-2xl">{item.value}</p>
          <p className="text-xs text-[#605a57] sm:text-sm">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ExamBanner({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
      {EXAM_BANNER_TEXT}
    </div>
  );
}

export function ExamModeSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label>Mode examen</Label>
        <p className="mt-0.5 text-xs text-[#605a57]">{EXAM_HINT_TEXT}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const shown = format ? format(value) : String(value);
  return (
    <div>
      <Label>
        {label} : {shown}
      </Label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="mt-2"
      />
    </div>
  );
}

export function SettingSwitch({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label>{label}</Label>
        {hint ? <p className="mt-0.5 text-xs text-[#605a57]">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function ExerciseMenu({
  title,
  subtitle,
  stats,
  examMode,
  extraBanners,
  children,
  onPlay,
  onSettings,
  onBack,
  playLabel = 'Jouer',
}: {
  title: string;
  subtitle?: ReactNode;
  stats?: StatItem[];
  examMode?: boolean;
  extraBanners?: ReactNode;
  children?: ReactNode;
  onPlay: () => void;
  onSettings?: () => void;
  onBack?: () => void;
  playLabel?: string;
}) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.push('/'));

  return (
    <ExerciseFrame>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">{title}</CardTitle>
        {subtitle ? (
          <CardDescription className="mt-2 text-base">{subtitle}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {stats && stats.length > 0 ? <StatTiles items={stats} /> : null}
        {children}
        <ExamBanner show={examMode} />
        {extraBanners}
        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={onPlay}>
            <Play className="mr-2 h-5 w-5" /> {playLabel}
          </Button>
          {onSettings ? (
            <Button variant="outline" size="lg" className="w-full" onClick={onSettings}>
              <Settings className="mr-2 h-5 w-5" /> Paramètres
            </Button>
          ) : null}
          <Button variant="ghost" size="lg" className="w-full" onClick={goBack}>
            <ArrowLeft className="mr-2 h-5 w-5" /> Retour
          </Button>
        </div>
      </CardContent>
    </ExerciseFrame>
  );
}

export function ExerciseSettings({
  description,
  children,
  examMode,
  onBack,
}: {
  description?: ReactNode;
  children: ReactNode;
  examMode?: { checked: boolean; onCheckedChange: (v: boolean) => void };
  onBack: () => void;
}) {
  return (
    <ExerciseFrame>
      <CardHeader>
        <CardTitle>Paramètres</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-5">{children}</div>
        {examMode ? (
          <ExamModeSwitch checked={examMode.checked} onCheckedChange={examMode.onCheckedChange} />
        ) : null}
        <Button variant="outline" size="lg" className="w-full" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </CardContent>
    </ExerciseFrame>
  );
}

export function ExerciseResults({
  exerciseId,
  chartId,
  percent,
  detail,
  children,
  extraActions,
  onReplay,
  onMenu,
  onHome,
}: {
  exerciseId: string;
  /** Performance chart key; defaults to exerciseId. Use when class scale ≠ tracker id. */
  chartId?: string;
  percent: number;
  detail?: string;
  children?: ReactNode;
  extraActions?: ReactNode;
  onReplay: () => void;
  onMenu: () => void;
  onHome?: () => void;
}) {
  const router = useRouter();
  const goHome = onHome ?? (() => router.push('/'));
  const perfKey = chartId ?? exerciseId;
  const perfEntries = loadEntries(perfKey);

  return (
    <ExerciseFrame>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">Résultats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ClassScoreBlock exerciseId={exerciseId} percent={percent} detail={detail} />
        {children}
        {perfEntries.length >= 2 ? (
          <div className="border-t pt-4">
            <p className="mb-2 text-center text-sm font-medium text-[#605a57]">Progression</p>
            <div className="flex justify-center">
              <MiniPerformanceChart entries={perfEntries} exerciseId={perfKey} />
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          {extraActions}
          <Button size="lg" className="w-full" onClick={onReplay}>
            <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={onMenu}>
            <ArrowLeft className="mr-2 h-5 w-5" /> Menu
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={goHome}>
            <Home className="mr-2 h-5 w-5" /> Accueil
          </Button>
        </div>
      </CardContent>
    </ExerciseFrame>
  );
}

export function CorrectionBanner({
  outcome,
  expected,
  children,
}: {
  outcome: 'correct' | 'incorrect' | 'timeout' | 'skipped' | null;
  expected?: ReactNode;
  children?: ReactNode;
}) {
  if (!outcome) return null;
  const tone =
    outcome === 'correct'
      ? 'border-green-200 bg-green-50 text-green-800'
      : outcome === 'incorrect'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-[#e0dedb] bg-[#f7f5f3] text-[#37322f]';
  const title =
    outcome === 'correct'
      ? 'Correct'
      : outcome === 'incorrect'
        ? expected != null
          ? <>Incorrect — la bonne réponse était {expected}</>
          : 'Incorrect'
        : outcome === 'skipped'
          ? expected != null
            ? <>Passé — la bonne réponse était {expected}</>
            : 'Passé'
          : expected != null
            ? <>Temps écoulé — la bonne réponse était {expected}</>
            : 'Temps écoulé';
  return (
    <div className={`w-full max-w-lg rounded-xl border px-4 py-3 text-center ${tone}`}>
      <p className="text-base font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function PlayHeader({
  questionLabel,
  timeLeft,
  score,
  timerRatio,
}: {
  questionLabel: string;
  timeLeft?: ReactNode;
  score?: ReactNode;
  timerRatio?: number;
}) {
  const urgent = typeof timerRatio === 'number' && timerRatio <= 0.2;
  return (
    <div className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <p className="text-base font-medium text-[#605a57]">{questionLabel}</p>
        {score != null ? <p className="text-sm text-[#605a57]">{score}</p> : null}
        {timeLeft != null ? (
          <p
            className={`text-sm font-semibold tabular-nums ${
              urgent ? 'text-red-600' : 'text-[#37322f]'
            }`}
          >
            {timeLeft}
          </p>
        ) : null}
      </div>
      {typeof timerRatio === 'number' ? (
        <div className="mx-auto mt-2 h-2 max-w-4xl overflow-hidden rounded-full bg-[#e0dedb]">
          <div
            className="h-full rounded-full transition-all duration-1000 linear"
            style={{
              width: `${Math.max(0, Math.min(100, timerRatio * 100))}%`,
              backgroundColor: urgent ? '#dc2626' : '#37322f',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
