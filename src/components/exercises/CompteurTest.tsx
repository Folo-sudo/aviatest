'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, Settings, RotateCcw, Home, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ================================================================
   Types
   ================================================================ */
type GameState = 'menu' | 'settings' | 'playing' | 'results';
type InstrumentId = 'fuel' | 'temp-huile' | 'vitesse' | 'temp-eau' | 'pression-pneu' | 'pression-turbo' | 'horloge' | 'compte-tours';

interface GaugeConfig {
  id: InstrumentId;
  label: string;
  unit: string;
  min: number; max: number;
  ticks: { value: number; label: string }[];
  zones: { from: number; to: number; color: string }[];
  format: (v: number) => string;
  gen: () => number;
  offset: () => number;
}

interface BoardState { values: Record<InstrumentId, number>; active: Set<InstrumentId> }
interface RowChoice { values: Record<InstrumentId, string>; isCorrect: boolean }

/* ================================================================
   Geometry helpers
   ================================================================ */
const SA = 225, EA = -45;

function v2a(v: number, mn: number, mx: number) {
  return SA - Math.max(0, Math.min(1, (v - mn) / (mx - mn))) * (SA - EA);
}
function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = deg * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function arc(cx: number, cy: number, r: number, sa: number, ea: number) {
  const s = pt(cx, cy, r, sa), e = pt(cx, cy, r, ea);
  let sw = sa - ea; if (sw < 0) sw += 360;
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${sw > 180 ? 1 : 0} 0 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
}

/* ================================================================
   Gauge configurations
   ================================================================ */
const rInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const rFloat = (a: number, b: number, d: number) => Math.round((Math.random() * (b - a) + a) * 10 ** d) / 10 ** d;
const pm = () => Math.random() < 0.5 ? 1 : -1;

const CFGS: GaugeConfig[] = [
  { id: 'fuel', label: 'Fuel', unit: '', min: 0, max: 1,
    ticks: [{ value: 0, label: '0' }, { value: 0.25, label: '1/4' }, { value: 0.5, label: '1/2' }, { value: 0.75, label: '3/4' }, { value: 1, label: '1' }],
    zones: [{ from: 0, to: 0.15, color: '#ef4444' }, { from: 0.15, to: 1, color: '#22c55e' }],
    format: v => v.toFixed(2), gen: () => rFloat(0, 1, 2), offset: () => rFloat(0.03, 0.18, 2) * pm() },
  { id: 'temp-huile', label: 'T\u00b0 Huile', unit: '\u00b0C', min: 40, max: 130,
    ticks: [{ value: 40, label: '40' }, { value: 60, label: '60' }, { value: 80, label: '80' }, { value: 100, label: '100' }, { value: 120, label: '120' }, { value: 130, label: '130' }],
    zones: [{ from: 40, to: 60, color: '#3b82f6' }, { from: 60, to: 100, color: '#22c55e' }, { from: 100, to: 120, color: '#f59e0b' }, { from: 120, to: 130, color: '#ef4444' }],
    format: v => Math.round(v).toString(), gen: () => rInt(40, 130), offset: () => rInt(3, 20) * pm() },
  { id: 'vitesse', label: 'Vitesse', unit: 'km/h', min: 0, max: 240,
    ticks: [{ value: 0, label: '0' }, { value: 40, label: '40' }, { value: 80, label: '80' }, { value: 120, label: '120' }, { value: 160, label: '160' }, { value: 200, label: '200' }, { value: 240, label: '240' }],
    zones: [{ from: 0, to: 100, color: '#22c55e' }, { from: 100, to: 180, color: '#f59e0b' }, { from: 180, to: 240, color: '#ef4444' }],
    format: v => Math.round(v).toString(), gen: () => rInt(0, 240), offset: () => rInt(5, 30) * pm() },
  { id: 'temp-eau', label: 'T\u00b0 Eau', unit: '\u00b0C', min: 40, max: 130,
    ticks: [{ value: 40, label: '40' }, { value: 60, label: '60' }, { value: 80, label: '80' }, { value: 100, label: '100' }, { value: 120, label: '120' }, { value: 130, label: '130' }],
    zones: [{ from: 40, to: 60, color: '#3b82f6' }, { from: 60, to: 100, color: '#22c55e' }, { from: 100, to: 120, color: '#f59e0b' }, { from: 120, to: 130, color: '#ef4444' }],
    format: v => Math.round(v).toString(), gen: () => rInt(40, 130), offset: () => rInt(3, 20) * pm() },
  { id: 'pression-pneu', label: 'P pneu', unit: 'psi', min: 0, max: 220,
    ticks: [{ value: 0, label: '0' }, { value: 55, label: '55' }, { value: 110, label: '110' }, { value: 165, label: '165' }, { value: 220, label: '220' }],
    zones: [{ from: 0, to: 30, color: '#ef4444' }, { from: 30, to: 190, color: '#22c55e' }, { from: 190, to: 220, color: '#ef4444' }],
    format: v => Math.round(v).toString(), gen: () => rInt(0, 220), offset: () => rInt(5, 25) * pm() },
  { id: 'pression-turbo', label: 'P turbo', unit: 'bar', min: -1, max: 2,
    ticks: [{ value: -1, label: '-1' }, { value: -0.5, label: '' }, { value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }, { value: 1.5, label: '1.5' }, { value: 2, label: '2' }],
    zones: [{ from: -1, to: 0, color: '#3b82f6' }, { from: 0, to: 1, color: '#f59e0b' }, { from: 1, to: 1.5, color: '#f97316' }, { from: 1.5, to: 2, color: '#ef4444' }],
    format: v => v.toFixed(2), gen: () => rFloat(-1, 2, 2), offset: () => rFloat(0.05, 0.35, 2) * pm() },
  { id: 'horloge', label: 'Horloge', unit: '', min: 0, max: 1440, ticks: [], zones: [],
    format: v => { const h = Math.floor(v / 60), m = Math.round(v % 60); return `${h}h${m.toString().padStart(2, '0')}`; },
    gen: () => rInt(0, 23) * 60 + rInt(0, 59),
    offset: () => { const r = Math.random(); if (r < 0.3) return rInt(1, 3) * 60 * pm(); if (r < 0.7) return rInt(5, 25) * pm(); return (rInt(1, 2) * 60 + rInt(5, 20)) * pm(); } },
  { id: 'compte-tours', label: 'Compte-tours', unit: 'tr/min\u00d7100', min: 0, max: 35,
    ticks: [{ value: 0, label: '0' }, { value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }, { value: 20, label: '20' }, { value: 25, label: '25' }, { value: 30, label: '30' }, { value: 35, label: '35' }],
    zones: [{ from: 0, to: 25, color: '#22c55e' }, { from: 25, to: 30, color: '#f59e0b' }, { from: 30, to: 35, color: '#ef4444' }],
    format: v => Math.round(v).toString(), gen: () => rInt(0, 35), offset: () => rInt(1, 5) * pm() },
];

const CMAP = Object.fromEntries(CFGS.map(c => [c.id, c])) as Record<InstrumentId, GaugeConfig>;
const ALL: InstrumentId[] = CFGS.map(c => c.id);

/* ================================================================
   Arc Gauge SVG
   ================================================================ */
function ArcGauge({ cfg, value, off }: { cfg: GaugeConfig; value: number; off?: boolean }) {
  const cx = 100, cy = 105, r = 72;
  const cv = Math.max(cfg.min, Math.min(cfg.max, value));
  const na = v2a(cv, cfg.min, cfg.max);
  const np = pt(cx, cy, r - 14, na);

  return (
    <svg viewBox="0 0 200 210" className="w-full h-auto" style={{ opacity: off ? 0.25 : 1 }}>
      <circle cx={cx} cy={cy} r={r + 4} fill="#f8fafc" stroke="#374151" strokeWidth={2.5} />
      <path d={arc(cx, cy, r, SA, EA)} fill="none" stroke="#e5e7eb" strokeWidth={10} strokeLinecap="round" />
      {cfg.zones.map((z, i) => (
        <path key={i} d={arc(cx, cy, r, v2a(Math.max(z.from, cfg.min), cfg.min, cfg.max), v2a(Math.min(z.to, cfg.max), cfg.min, cfg.max))} fill="none" stroke={z.color} strokeWidth={10} />
      ))}
      {cfg.ticks.map((t, i) => {
        const a = v2a(t.value, cfg.min, cfg.max);
        const inn = pt(cx, cy, r - 12, a), out = pt(cx, cy, r - 4, a), lp = pt(cx, cy, r - 26, a);
        return (<g key={i}>
          <line x1={inn.x} y1={inn.y} x2={out.x} y2={out.y} stroke="#374151" strokeWidth={2} />
          {t.label && <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central" fontSize={t.label.length > 3 ? 8.5 : 11} fill="#374151" fontWeight="bold">{t.label}</text>}
        </g>);
      })}
      {!off && <line x1={cx} y1={cy} x2={np.x} y2={np.y} stroke="#1e40af" strokeWidth={2.5} strokeLinecap="round" />}
      <circle cx={cx} cy={cy} r={4.5} fill="#1f2937" />
      {cfg.unit && <text x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fill="#6b7280">{cfg.unit}</text>}
      <text x={cx} y={196} textAnchor="middle" fontSize={11} fill="#374151" fontWeight="bold">{cfg.label}</text>
    </svg>
  );
}

/* ================================================================
   Clock SVG
   ================================================================ */
function ClockGauge({ mod, off }: { mod: number; off?: boolean }) {
  const cx = 100, cy = 105, r = 72;
  const h = Math.floor(mod / 60), m = mod % 60, h12 = h % 12;
  const ha = 90 - (h12 + m / 60) * 30, ma = 90 - m * 6;
  const hp = pt(cx, cy, r * 0.45, ha), mp = pt(cx, cy, r * 0.65, ma);

  const marks = [{ n: '12', a: 90 }, { n: '3', a: 0 }, { n: '6', a: -90 }, { n: '9', a: 180 }];
  return (
    <svg viewBox="0 0 200 210" className="w-full h-auto" style={{ opacity: off ? 0.25 : 1 }}>
      <circle cx={cx} cy={cy} r={r + 4} fill="#f8fafc" stroke="#374151" strokeWidth={2.5} />
      {marks.map(({ n, a }) => {
        const p = pt(cx, cy, r - 18, a), ti = pt(cx, cy, r - 6, a), to2 = pt(cx, cy, r, a);
        return (<g key={n}>
          <line x1={ti.x} y1={ti.y} x2={to2.x} y2={to2.y} stroke="#374151" strokeWidth={2} />
          <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={15} fill="#374151" fontWeight="bold">{n}</text>
        </g>);
      })}
      {Array.from({ length: 12 }, (_, i) => {
        if (i % 3 === 0) return null;
        const a = 90 - i * 30, inn = pt(cx, cy, r - 4, a), out = pt(cx, cy, r, a);
        return <line key={i} x1={inn.x} y1={inn.y} x2={out.x} y2={out.y} stroke="#9ca3af" strokeWidth={1.5} />;
      })}
      {!off && <line x1={cx} y1={cy} x2={hp.x} y2={hp.y} stroke="#1f2937" strokeWidth={4} strokeLinecap="round" />}
      {!off && <line x1={cx} y1={cy} x2={mp.x} y2={mp.y} stroke="#1e40af" strokeWidth={2.5} strokeLinecap="round" />}
      <circle cx={cx} cy={cy} r={4.5} fill="#1f2937" />
      {!off && <text x={cx} y={cy + 25} textAnchor="middle" fontSize={11} fill="#6b7280" fontWeight="bold">{h < 12 ? 'AM' : 'PM'}</text>}
      <text x={cx} y={196} textAnchor="middle" fontSize={11} fill="#374151" fontWeight="bold">Horloge</text>
    </svg>
  );
}

/* ================================================================
   Board & row generation
   ================================================================ */
function makeBoard(): BoardState {
  const nOff = rInt(2, 3);
  const shuf = [...ALL].sort(() => Math.random() - 0.5);
  const offSet = new Set(shuf.slice(0, nOff));
  const active = new Set(ALL.filter(id => !offSet.has(id)));
  const values = {} as Record<InstrumentId, number>;
  for (const c of CFGS) values[c.id] = active.has(c.id) ? c.gen() : 0;
  return { values, active };
}

function makeRows(board: BoardState): RowChoice[] {
  const correct = {} as Record<InstrumentId, string>;
  for (const c of CFGS) correct[c.id] = board.active.has(c.id) ? c.format(board.values[c.id]) : '0';

  const rows: RowChoice[] = [{ values: { ...correct }, isCorrect: true }];
  const actArr = [...board.active];
  let tries = 0;
  while (rows.length < 6 && tries < 60) {
    tries++;
    const wr = { ...correct };
    const nc = Math.min(actArr.length, rInt(1, 3));
    const ids = [...actArr].sort(() => Math.random() - 0.5).slice(0, nc);
    for (const id of ids) {
      const c = CMAP[id];
      let wv = board.values[id] + c.offset();
      if (id === 'horloge') wv = ((wv % 1440) + 1440) % 1440;
      else wv = Math.max(c.min, Math.min(c.max, wv));
      wr[id] = c.format(wv);
    }
    if (!rows.some(r => JSON.stringify(r.values) === JSON.stringify(wr))) {
      rows.push({ values: wr, isCorrect: false });
    }
  }
  // safety fill
  while (rows.length < 6) {
    const wr = { ...correct };
    const id = actArr[rInt(0, actArr.length - 1)];
    const c = CMAP[id];
    let wv = board.values[id] + c.offset() * 2;
    if (id === 'horloge') wv = ((wv % 1440) + 1440) % 1440;
    else wv = Math.max(c.min, Math.min(c.max, wv));
    wr[id] = c.format(wv);
    rows.push({ values: wr, isCorrect: false });
  }
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
}

/* ================================================================
   Gauge dispatcher
   ================================================================ */
function Gauge({ id, value, off }: { id: InstrumentId; value: number; off?: boolean }) {
  if (id === 'horloge') return <ClockGauge mod={value} off={off} />;
  return <ArcGauge cfg={CMAP[id]} value={value} off={off} />;
}

/* ================================================================
   Main component
   ================================================================ */
export function CompteurTest() {
  const router = useRouter();
  const [gs, setGs] = useState<GameState>('menu');
  const [settings, setSettings] = useState({ numQuestions: 20, totalTime: 600 });
  const [scorer] = useState(() => new Scorer());
  const [qNum, setQNum] = useState(0);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [rows, setRows] = useState<RowChoice[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    const b = makeBoard();
    setBoard(b);
    setRows(makeRows(b));
    setSel(null);
    setAnswered(false);
  }, []);

  const start = useCallback(() => {
    scorer.reset();
    setQNum(0);
    setTimeLeft(settings.totalTime);
    setGs('playing');
    next();
  }, [scorer, settings, next]);

  useEffect(() => {
    if (gs !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { setGs('results'); return 0; } return p - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gs]);

  const pick = useCallback((i: number) => {
    if (answered) return;
    setSel(i);
    setAnswered(true);
    scorer.recordAnswer(rows[i].isCorrect);
  }, [answered, rows, scorer]);

  const advance = useCallback(() => {
    const n = qNum + 1;
    if (n >= settings.numQuestions) { if (timerRef.current) clearInterval(timerRef.current); setGs('results'); return; }
    setQNum(n);
    next();
  }, [qNum, settings.numQuestions, next]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  /* ---------- MENU ---------- */
  if (gs === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Test des Compteurs</CardTitle>
            <CardDescription className="text-lg">Lecture de compteurs cockpit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{settings.numQuestions}</p>
                <p className="text-sm text-slate-500">Planches</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{Math.floor(settings.totalTime / 60)} min</p>
                <p className="text-sm text-slate-500">Temps total</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Regles</p>
              <p>8 compteurs cockpit sont affiches. Un tableau de 6 lignes propose des lectures differentes. Identifiez la ligne qui correspond aux valeurs reelles des compteurs. Les colonnes a 0 sont inactives.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={start}><Play className="mr-2 h-5 w-5" />Jouer</Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGs('settings')}><Settings className="mr-2 h-5 w-5" />Parametres</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-5 w-5" />Retour</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- SETTINGS ---------- */
  if (gs === 'settings') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader><CardTitle>Parametres</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nombre de planches: {settings.numQuestions}</Label>
              <Slider value={[settings.numQuestions]} onValueChange={([v]) => setSettings(s => ({ ...s, numQuestions: v }))} min={5} max={40} step={5} className="mt-2" />
            </div>
            <div>
              <Label>Temps total: {Math.floor(settings.totalTime / 60)} min</Label>
              <Slider value={[settings.totalTime]} onValueChange={([v]) => setSettings(s => ({ ...s, totalTime: v }))} min={120} max={900} step={60} className="mt-2" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setGs('menu')}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- RESULTS ---------- */
  if (gs === 'results') {
    const d = scorer.toJSON();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge variant={d.accuracy >= 75 ? 'default' : d.accuracy >= 50 ? 'secondary' : 'destructive'} className="text-lg px-4 py-1">{d.grade}</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-slate-700">{d.score}%</p>
              <p className="text-slate-500">{d.correct} / {d.total} correctes</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{d.correct}</p>
                <p className="text-sm text-green-700">Correctes</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{d.wrong}</p>
                <p className="text-sm text-red-700">Erreurs</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={start}><RotateCcw className="mr-2 h-5 w-5" />Rejouer</Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGs('menu')}><ArrowLeft className="mr-2 h-5 w-5" />Menu</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}><Home className="mr-2 h-5 w-5" />Accueil</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- PLAYING ---------- */
  if (!board) return null;
  const tPct = timeLeft / settings.totalTime;
  const tColor = tPct > 0.5 ? 'bg-green-500' : tPct > 0.2 ? 'bg-amber-500' : 'bg-red-500';

  const correctIdx = rows.findIndex(r => r.isCorrect);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-mono text-slate-600">{qNum + 1} / {settings.numQuestions}</span>
          <span className="text-sm font-mono text-slate-600">Score: {scorer.getCorrect()} / {scorer.getTotal()}</span>
          <span className={`text-sm font-mono font-bold ${tPct <= 0.2 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(timeLeft)}</span>
        </div>
        {/* Timer bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full mb-4 overflow-hidden">
          <div className={`h-full ${tColor} transition-all duration-1000`} style={{ width: `${tPct * 100}%` }} />
        </div>

        {/* Gauges — 4 columns */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
          {ALL.map(id => (
            <div key={id} className="flex justify-center">
              <Gauge id={id} value={board.values[id]} off={!board.active.has(id)} />
            </div>
          ))}
        </div>

        {/* Choice table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 text-center text-slate-400 w-8">#</th>
                {CFGS.map(c => (
                  <th key={c.id} className={`p-2 text-center font-semibold ${board.active.has(c.id) ? 'text-slate-700' : 'text-slate-300'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                let bg = 'hover:bg-slate-50 cursor-pointer';
                if (answered) {
                  if (row.isCorrect) bg = 'bg-green-50 border-l-4 border-l-green-500';
                  else if (i === sel) bg = 'bg-red-50 border-l-4 border-l-red-500';
                  else bg = 'opacity-50';
                }
                return (
                  <tr key={i} className={`border-b border-slate-100 transition-colors ${bg}`} onClick={() => pick(i)}>
                    <td className="p-2 text-center font-mono text-slate-400">{i + 1}</td>
                    {CFGS.map(c => (
                      <td key={c.id} className={`p-2 text-center font-mono ${board.active.has(c.id) ? 'text-slate-700' : 'text-slate-300'}`}>
                        {row.values[c.id]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Feedback & next */}
        {answered && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              {sel !== null && rows[sel].isCorrect
                ? <span className="text-green-600 font-bold">Correct !</span>
                : <span className="text-red-600 font-bold">Incorrect — la bonne reponse etait la ligne {correctIdx + 1}</span>}
            </div>
            <Button onClick={advance}>
              Suivant <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompteurTest;
