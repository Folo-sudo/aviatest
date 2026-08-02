'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Scorer } from '@/lib/core/Scorer';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
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

interface Tick { value: number; label: string }
interface Zone { from: number; to: number; color: string }
interface GaugeConfig {
  id: InstrumentId;
  label: string;
  unit: string;
  min: number; max: number;
  startAngle: number; endAngle: number; // math convention: 0=right, CCW+
  ticks: Tick[];
  minorStep: number; // 0 = no minor ticks
  zones: Zone[];
  format: (v: number) => string;
  gen: () => number;
  offset: () => number;
}
interface BoardState { values: Record<InstrumentId, number>; active: Set<InstrumentId> }
interface ColumnOptions { options: string[]; correct: string }

/* ================================================================
   Geometry helpers
   ================================================================ */
function v2a(v: number, mn: number, mx: number, sa: number, ea: number) {
  const f = Math.max(0, Math.min(1, (v - mn) / (mx - mn)));
  // Sweep goes from sa to ea in the clockwise-visual direction (decreasing math angle)
  return sa - f * (sa - ea);
}
function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = deg * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, r: number, sa: number, ea: number) {
  const s = pt(cx, cy, r, sa), e = pt(cx, cy, r, ea);
  let sweep = sa - ea;
  if (sweep < 0) sweep += 360;
  if (sweep > 359.9) sweep = 359.9;
  const large = sweep > 180 ? 1 : 0;
  // sweep-flag=1 (CW in SVG screen coords) matches our gauge direction
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/* ================================================================
   Gauge configurations — matching the photo exactly
   ================================================================ */
const rI = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const rF = (a: number, b: number, d: number) => Math.round((Math.random() * (b - a) + a) * 10 ** d) / 10 ** d;
const pm = () => Math.random() < 0.5 ? 1 : -1;

// Standard 270° sweep: 7 o'clock (225°) to 5 o'clock (-45°)
const S270 = 225, E270 = -45;
// ~240° sweep for fuel: 7 o'clock (210°) to 11 o'clock (150°)
// Actually fuel in the photo goes from ~7:00 to ~11:00 CW through bottom = ~240°
const S_FUEL = 210, E_FUEL = -30;

const CFGS: GaugeConfig[] = [
  // ─── FUEL ───
  // Photo: 0, 1/4, 1/2, 3/4, 1 — red zone at bottom (0 to ~1/4), rest unmarked
  // Sweep ~270° standard
  {
    id: 'fuel', label: 'Fuel', unit: '', min: 0, max: 1,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: 0, label: '0' },
      { value: 0.25, label: '1/4' },
      { value: 0.5, label: '1/2' },
      { value: 0.75, label: '3/4' },
      { value: 1, label: '1' },
    ],
    minorStep: 0.05,
    zones: [
      { from: 0, to: 0.25, color: '#dc2626' }, // red — low fuel
    ],
    format: v => v.toFixed(2),
    gen: () => rF(0, 1, 2),
    offset: () => rF(0.03, 0.18, 2) * pm(),
  },

  // ─── T° HUILE ───
  // Oil temperature 40–130°C. Ticks every 10°. Photo shows numbers at each major tick.
  // Zones: blue cold (40-60), green normal (60-100), yellow (100-120), red (120-130)
  {
    id: 'temp-huile', label: 'T\u00b0 Huile', unit: '\u00b0C', min: 40, max: 130,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: 40, label: '40' }, { value: 50, label: '50' },
      { value: 60, label: '60' }, { value: 70, label: '70' },
      { value: 80, label: '80' }, { value: 90, label: '90' },
      { value: 100, label: '100' }, { value: 110, label: '110' },
      { value: 120, label: '120' }, { value: 130, label: '130' },
    ],
    minorStep: 5,
    zones: [
      { from: 40, to: 60, color: '#2563eb' },  // blue cold
      { from: 60, to: 100, color: '#16a34a' },  // green normal
      { from: 100, to: 120, color: '#ca8a04' }, // yellow warm
      { from: 120, to: 130, color: '#dc2626' }, // red hot
    ],
    format: v => Math.round(v).toString(),
    gen: () => rI(40, 130),
    offset: () => rI(3, 20) * pm(),
  },

  // ─── VITESSE ───
  // Photo: 0, 40, 80, 120, 160, 200, 240 km/h. Minor ticks every 10 km/h.
  // Green 0-120, yellow 120-200, red 200-240
  {
    id: 'vitesse', label: 'Vitesse', unit: 'km/h', min: 0, max: 240,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: 0, label: '0' }, { value: 40, label: '40' },
      { value: 80, label: '80' }, { value: 120, label: '120' },
      { value: 160, label: '160' }, { value: 200, label: '200' },
      { value: 240, label: '240' },
    ],
    minorStep: 10,
    zones: [
      { from: 0, to: 120, color: '#16a34a' },   // green
      { from: 120, to: 200, color: '#ca8a04' },  // yellow
      { from: 200, to: 240, color: '#dc2626' },  // red
    ],
    format: v => Math.round(v).toString(),
    gen: () => rI(0, 240),
    offset: () => rI(5, 30) * pm(),
  },

  // ─── T° EAU ───
  // Photo: 40, 50, 60, 70, 80, 90, 100, 110, 120, 130 °C. Same zones as huile.
  {
    id: 'temp-eau', label: 'T\u00b0 Eau', unit: '\u00b0C', min: 40, max: 130,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: 40, label: '40' }, { value: 50, label: '50' },
      { value: 60, label: '60' }, { value: 70, label: '70' },
      { value: 80, label: '80' }, { value: 90, label: '90' },
      { value: 100, label: '100' }, { value: 110, label: '110' },
      { value: 120, label: '120' }, { value: 130, label: '130' },
    ],
    minorStep: 5,
    zones: [
      { from: 40, to: 60, color: '#2563eb' },
      { from: 60, to: 100, color: '#16a34a' },
      { from: 100, to: 120, color: '#ca8a04' },
      { from: 120, to: 130, color: '#dc2626' },
    ],
    format: v => Math.round(v).toString(),
    gen: () => rI(40, 130),
    offset: () => rI(3, 20) * pm(),
  },

  // ─── P PNEU PSI ───
  // Photo: outer ring 0, 110, 220 psi. Minor ticks every ~10 psi.
  // Red at low (<30) and high (>200), green middle
  {
    id: 'pression-pneu', label: 'P pneu', unit: 'psi', min: 0, max: 220,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: 0, label: '0' },
      { value: 20, label: '' }, { value: 40, label: '' },
      { value: 60, label: '' }, { value: 80, label: '' },
      { value: 110, label: '110' },
      { value: 140, label: '' }, { value: 160, label: '' },
      { value: 180, label: '' }, { value: 200, label: '' },
      { value: 220, label: '220' },
    ],
    minorStep: 10,
    zones: [
      { from: 0, to: 30, color: '#dc2626' },
      { from: 30, to: 190, color: '#16a34a' },
      { from: 190, to: 220, color: '#dc2626' },
    ],
    format: v => Math.round(v).toString(),
    gen: () => rI(0, 220),
    offset: () => rI(5, 25) * pm(),
  },

  // ─── P TURBO ───
  // Photo: -1, -0.5, 0, 0.5, 1, 1.5, 2 bar. Turbo icon.
  // Yellow 0-1, orange 1-1.5, red 1.5-2
  {
    id: 'pression-turbo', label: 'P turbo', unit: 'bar', min: -1, max: 2,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: -1, label: '-1' },
      { value: -0.5, label: '' },
      { value: 0, label: '0' },
      { value: 0.5, label: '0.5' },
      { value: 1, label: '1' },
      { value: 1.5, label: '1.5' },
      { value: 2, label: '2' },
    ],
    minorStep: 0.1,
    zones: [
      { from: -1, to: 0, color: '#2563eb' },
      { from: 0, to: 1, color: '#ca8a04' },
      { from: 1, to: 1.5, color: '#ea580c' },
      { from: 1.5, to: 2, color: '#dc2626' },
    ],
    format: v => v.toFixed(2),
    gen: () => rF(-1, 2, 2),
    offset: () => rF(0.05, 0.35, 2) * pm(),
  },

  // ─── HORLOGE ───
  // Handled separately (ClockGauge)
  {
    id: 'horloge', label: 'Horloge', unit: '', min: 0, max: 1440,
    startAngle: 0, endAngle: 0, ticks: [], minorStep: 0, zones: [],
    format: v => {
      const h = Math.floor(v / 60), m = Math.round(v % 60);
      return `${h}h${m.toString().padStart(2, '0')}`;
    },
    gen: () => rI(0, 23) * 60 + rI(0, 59),
    offset: () => {
      const r = Math.random();
      if (r < 0.3) return rI(1, 3) * 60 * pm();
      if (r < 0.7) return rI(5, 25) * pm();
      return (rI(1, 2) * 60 + rI(5, 20)) * pm();
    },
  },

  // ─── COMPTE-TOURS ───
  // Photo: 5, 10, 15, 20, 25, 30, 35 (×100). "tr/min×100"
  // Green 0-25, yellow 25-30, red 30-35
  {
    id: 'compte-tours', label: 'Compte-tours', unit: 'tr/min\u00d7100', min: 0, max: 35,
    startAngle: S270, endAngle: E270,
    ticks: [
      { value: 0, label: '0' },
      { value: 5, label: '5' }, { value: 10, label: '10' },
      { value: 15, label: '15' }, { value: 20, label: '20' },
      { value: 25, label: '25' }, { value: 30, label: '30' },
      { value: 35, label: '35' },
    ],
    minorStep: 1,
    zones: [
      { from: 0, to: 25, color: '#16a34a' },
      { from: 25, to: 30, color: '#ca8a04' },
      { from: 30, to: 35, color: '#dc2626' },
    ],
    format: v => Math.round(v).toString(),
    gen: () => rI(0, 35),
    offset: () => rI(1, 5) * pm(),
  },
];

const CMAP = Object.fromEntries(CFGS.map(c => [c.id, c])) as Record<InstrumentId, GaugeConfig>;
const ALL: InstrumentId[] = CFGS.map(c => c.id);

/* ================================================================
   ArcGauge — renders all non-clock gauges
   ================================================================ */
function ArcGauge({ cfg, value }: { cfg: GaugeConfig; value: number }) {
  const cx = 100, cy = 108, R = 74;
  const { min, max, startAngle: SA, endAngle: EA } = cfg;
  const cv = Math.max(min, Math.min(max, value));
  const na = v2a(cv, min, max, SA, EA);
  const np = pt(cx, cy, R - 20, na);

  // Generate minor tick values
  const minorVals: number[] = [];
  if (cfg.minorStep > 0) {
    const majorSet = new Set(cfg.ticks.map(t => Math.round(t.value * 1000)));
    for (let v = min; v <= max + cfg.minorStep * 0.01; v += cfg.minorStep) {
      const rounded = Math.round(v * 1000);
      if (!majorSet.has(rounded)) {
        minorVals.push(v);
      }
    }
  }

  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto">
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={R + 5} fill="#f1f5f9" stroke="#1e293b" strokeWidth={2.5} />

      {/* Zone arcs — thick colored band on outer edge */}
      {cfg.zones.map((z, i) => {
        const za = v2a(Math.max(z.from, min), min, max, SA, EA);
        const zb = v2a(Math.min(z.to, max), min, max, SA, EA);
        return (
          <path
            key={i}
            d={arcPath(cx, cy, R, za, zb)}
            fill="none"
            stroke={z.color}
            strokeWidth={12}
            strokeLinecap="butt"
            opacity={0.9}
          />
        );
      })}

      {/* Minor ticks */}
      {minorVals.map((v, i) => {
        const a = v2a(v, min, max, SA, EA);
        const p1 = pt(cx, cy, R - 6, a);
        const p2 = pt(cx, cy, R - 1, a);
        return <line key={`m${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#64748b" strokeWidth={1} />;
      })}

      {/* Major ticks + labels */}
      {cfg.ticks.map((t, i) => {
        const a = v2a(t.value, min, max, SA, EA);
        const p1 = pt(cx, cy, R - 14, a);
        const p2 = pt(cx, cy, R - 1, a);
        const lp = pt(cx, cy, R - 26, a);
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#0f172a" strokeWidth={2} />
            {t.label && (
              <text
                x={lp.x} y={lp.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={t.label.length > 3 ? 8 : t.label.length > 2 ? 9.5 : 11}
                fill="#0f172a" fontWeight="bold" fontFamily="Inter, Arial, sans-serif"
              >
                {t.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Needle — always visible (inactive gauges sit at 0, not grayed out) */}
      <line x1={cx} y1={cy} x2={np.x} y2={np.y} stroke="#1e40af" strokeWidth={2.5} strokeLinecap="round" />
      {(() => {
        const tail = pt(cx, cy, 10, na + 180);
        return <line x1={cx} y1={cy} x2={tail.x} y2={tail.y} stroke="#1e40af" strokeWidth={2.5} strokeLinecap="round" />;
      })()}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={5} fill="#0f172a" />

      {/* Unit label inside gauge */}
      {cfg.unit && (
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={8.5} fill="#475569" fontFamily="Inter, Arial, sans-serif">
          {cfg.unit}
        </text>
      )}

      {/* Gauge title below */}
      <text x={cx} y={206} textAnchor="middle" fontSize={11} fill="#1e293b" fontWeight="bold" fontFamily="Inter, Arial, sans-serif">
        {cfg.label}
      </text>
    </svg>
  );
}

/* ================================================================
   ClockGauge — analog clock with hour/minute hands
   ================================================================ */
function ClockGauge({ mod }: { mod: number }) {
  const cx = 100, cy = 108, R = 74;
  const h = Math.floor(mod / 60), m = mod % 60, h12 = h % 12;
  const ha = 90 - (h12 + m / 60) * 30;
  const ma = 90 - m * 6;
  const hp = pt(cx, cy, R * 0.45, ha);
  const mp = pt(cx, cy, R * 0.65, ma);

  const mainMarks = [
    { n: '12', a: 90 }, { n: '1', a: 60 }, { n: '2', a: 30 },
    { n: '3', a: 0 }, { n: '4', a: -30 }, { n: '5', a: -60 },
    { n: '6', a: -90 }, { n: '7', a: -120 }, { n: '8', a: -150 },
    { n: '9', a: 180 }, { n: '10', a: 150 }, { n: '11', a: 120 },
  ];

  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto">
      <circle cx={cx} cy={cy} r={R + 5} fill="#f1f5f9" stroke="#1e293b" strokeWidth={2.5} />

      {/* Minute dots */}
      {Array.from({ length: 60 }, (_, i) => {
        if (i % 5 === 0) return null;
        const a = 90 - i * 6;
        const p = pt(cx, cy, R - 3, a);
        return <circle key={`d${i}`} cx={p.x} cy={p.y} r={1} fill="#94a3b8" />;
      })}

      {/* Hour marks + numbers */}
      {mainMarks.map(({ n, a }) => {
        const ti = pt(cx, cy, R - 8, a);
        const to = pt(cx, cy, R - 1, a);
        const lp = pt(cx, cy, R - 20, a);
        const isMajor = ['12', '3', '6', '9'].includes(n);
        return (
          <g key={n}>
            <line x1={ti.x} y1={ti.y} x2={to.x} y2={to.y} stroke="#0f172a" strokeWidth={isMajor ? 2.5 : 1.5} />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={isMajor ? 14 : 10} fill="#0f172a"
              fontWeight={isMajor ? 'bold' : 'normal'}
              fontFamily="Inter, Arial, sans-serif"
            >
              {n}
            </text>
          </g>
        );
      })}

      {/* Hour hand */}
      <line x1={cx} y1={cy} x2={hp.x} y2={hp.y} stroke="#0f172a" strokeWidth={4.5} strokeLinecap="round" />
      {/* Minute hand */}
      <line x1={cx} y1={cy} x2={mp.x} y2={mp.y} stroke="#1e40af" strokeWidth={2.5} strokeLinecap="round" />

      <circle cx={cx} cy={cy} r={5} fill="#0f172a" />

      {/* AM/PM indicator */}
      <text x={cx} y={cy + 25} textAnchor="middle" fontSize={11} fill="#475569" fontWeight="bold" fontFamily="Inter, Arial, sans-serif">
        {h < 12 ? 'AM' : 'PM'}
      </text>

      <text x={cx} y={206} textAnchor="middle" fontSize={11} fill="#1e293b" fontWeight="bold" fontFamily="Inter, Arial, sans-serif">
        Horloge
      </text>
    </svg>
  );
}

/* ================================================================
   Board & column options
   ================================================================ */
function makeBoard(): BoardState {
  const nOff = rI(2, 3);
  const shuf = [...ALL].sort(() => Math.random() - 0.5);
  const offSet = new Set(shuf.slice(0, nOff));
  const active = new Set(ALL.filter(id => !offSet.has(id)));
  const values = {} as Record<InstrumentId, number>;
  for (const c of CFGS) values[c.id] = active.has(c.id) ? c.gen() : 0;
  return { values, active };
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Per-column options (Pilotest: pick one cell per column, not a whole row). */
function makeColumnOptions(board: BoardState): Record<InstrumentId, ColumnOptions> {
  const out = {} as Record<InstrumentId, ColumnOptions>;
  for (const c of CFGS) {
    if (!board.active.has(c.id)) {
      out[c.id] = { options: Array(6).fill('0'), correct: '0' };
      continue;
    }
    const correct = c.format(board.values[c.id]);
    const opts = new Set<string>([correct]);
    let tries = 0;
    while (opts.size < 6 && tries < 100) {
      tries++;
      let wv = board.values[c.id] + c.offset() * (tries % 3 === 0 ? 2 : 1);
      if (c.id === 'horloge') wv = ((wv % 1440) + 1440) % 1440;
      else wv = Math.max(c.min, Math.min(c.max, wv));
      opts.add(c.format(wv));
    }
    while (opts.size < 6) {
      opts.add(c.format(Math.max(c.min, Math.min(c.max, board.values[c.id] + opts.size))));
    }
    out[c.id] = { options: shuffleInPlace([...opts]), correct };
  }
  return out;
}

/* ================================================================
   Gauge dispatcher
   ================================================================ */
function Gauge({ id, value }: { id: InstrumentId; value: number }) {
  if (id === 'horloge') return <ClockGauge mod={value} />;
  return <ArcGauge cfg={CMAP[id]} value={value} />;
}

/* ================================================================
   Main Component
   ================================================================ */
export function CompteurTest() {
  const router = useRouter();
  const [gs, setGs] = useState<GameState>('menu');
  const [settings, setSettings] = useState({ numQuestions: 20, totalTime: 600 });
  const [scorer] = useState(() => new Scorer());
  const [qNum, setQNum] = useState(0);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [columns, setColumns] = useState<Record<InstrumentId, ColumnOptions> | null>(null);
  /** Selected value per active instrument column */
  const [selection, setSelection] = useState<Partial<Record<InstrumentId, string>>>({});
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const perfSavedRef = useRef(false);

  const nextQ = useCallback(() => {
    const b = makeBoard();
    setBoard(b);
    setColumns(makeColumnOptions(b));
    setSelection({});
    setAnswered(false);
    setLastCorrect(false);
  }, []);

  const startGame = useCallback(() => {
    scorer.reset();
    perfSavedRef.current = false;
    setQNum(0);
    setTimeLeft(settings.totalTime);
    setGs('playing');
    nextQ();
  }, [scorer, settings, nextQ]);

  useEffect(() => {
    if (gs !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { setGs('results'); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gs]);

  const pickCell = useCallback((id: InstrumentId, value: string) => {
    if (answered || !board || !columns) return;
    if (!board.active.has(id)) return;

    setSelection(prev => {
      const next = { ...prev, [id]: value };
      const activeIds = [...board.active];
      if (activeIds.every(aid => next[aid] != null)) {
        const ok = activeIds.every(aid => next[aid] === columns[aid].correct);
        setAnswered(true);
        setLastCorrect(ok);
        scorer.recordAnswer(ok);
      }
      return next;
    });
  }, [answered, board, columns, scorer]);

  const advance = useCallback(() => {
    const n = qNum + 1;
    if (n >= settings.numQuestions) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGs('results');
      return;
    }
    setQNum(n);
    nextQ();
  }, [qNum, settings.numQuestions, nextQ]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  /* ─── MENU ─── */
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
              <p>8 compteurs cockpit sont affiches. Pour chaque colonne active, choisissez la case qui correspond a la valeur reelle. Les compteurs a 0 ne sont pas evalues (pas besoin de les lire). Selectionnez une valeur par colonne active.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}><Play className="mr-2 h-5 w-5" />Jouer</Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGs('settings')}><Settings className="mr-2 h-5 w-5" />Parametres</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-5 w-5" />Retour</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── SETTINGS ─── */
  if (gs === 'settings') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader><CardTitle>Parametres</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nombre de planches : {settings.numQuestions}</Label>
              <Slider value={[settings.numQuestions]} onValueChange={([v]) => setSettings(s => ({ ...s, numQuestions: v }))} min={5} max={40} step={5} className="mt-2" />
            </div>
            <div>
              <Label>Temps total : {Math.floor(settings.totalTime / 60)} min</Label>
              <Slider value={[settings.totalTime]} onValueChange={([v]) => setSettings(s => ({ ...s, totalTime: v }))} min={120} max={900} step={60} className="mt-2" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setGs('menu')}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── RESULTS ─── */
  if (gs === 'results') {
    const d = scorer.toJSON();
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('compteurs', d.correct, settings.numQuestions);
    }
    const perfEntries = loadEntries('compteurs');
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
            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="compteurs" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}><RotateCcw className="mr-2 h-5 w-5" />Rejouer</Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGs('menu')}><ArrowLeft className="mr-2 h-5 w-5" />Menu</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}><Home className="mr-2 h-5 w-5" />Accueil</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── PLAYING ─── */
  if (!board || !columns) return null;
  const tPct = timeLeft / settings.totalTime;
  const tColor = tPct > 0.5 ? 'bg-green-500' : tPct > 0.2 ? 'bg-amber-500' : 'bg-red-500';
  const optionCount = columns[CFGS[0].id]?.options.length ?? 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-mono text-slate-600">{qNum + 1} / {settings.numQuestions}</span>
          <span className="text-sm font-mono text-slate-600">Score : {scorer.getCorrect()} / {scorer.getTotal()}</span>
          <span className={`text-sm font-mono font-bold ${tPct <= 0.2 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(timeLeft)}</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full mb-3 overflow-hidden">
          <div className={`h-full ${tColor} transition-all duration-1000`} style={{ width: `${tPct * 100}%` }} />
        </div>

        {/* Gauge grid — 4×2 ; inactive stay fully visible at 0 */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-3">
          {ALL.map(id => (
            <div key={id} className="flex justify-center">
              <Gauge id={id} value={board.values[id]} />
            </div>
          ))}
        </div>

        {/* Answer table — one clickable cell per column (not whole row) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-1.5 sm:p-2 text-center text-slate-400 w-8">#</th>
                {CFGS.map(c => (
                  <th key={c.id} className="p-1.5 sm:p-2 text-center font-semibold whitespace-nowrap text-slate-700">
                    {c.label}
                    {!board.active.has(c.id) && (
                      <span className="block text-[10px] font-normal text-slate-400">non evalue</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: optionCount }, (_, rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-100">
                  <td className="p-1.5 sm:p-2 text-center font-mono text-slate-400">{rowIdx + 1}</td>
                  {CFGS.map(c => {
                    const col = columns[c.id];
                    const value = col.options[rowIdx];
                    const active = board.active.has(c.id);
                    const selected = selection[c.id] === value;
                    const isCorrectValue = value === col.correct;

                    let cls = 'p-1.5 sm:p-2 text-center font-mono whitespace-nowrap text-slate-700';
                    if (!active) {
                      cls += ' text-slate-500';
                    } else if (!answered) {
                      cls += selected
                        ? ' bg-blue-100 ring-2 ring-inset ring-blue-400 cursor-pointer'
                        : ' cursor-pointer hover:bg-blue-50';
                    } else if (isCorrectValue) {
                      cls += ' bg-green-100 font-semibold text-green-800';
                    } else if (selected) {
                      cls += ' bg-red-100 text-red-800';
                    } else {
                      cls += ' text-slate-500';
                    }

                    return (
                      <td
                        key={c.id}
                        className={cls}
                        onClick={() => active && pickCell(c.id, value)}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Feedback + Next */}
        {answered && (
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm">
              {lastCorrect
                ? <span className="text-green-600 font-bold">Correct !</span>
                : <span className="text-red-600 font-bold">Incorrect — les cases vertes indiquent les bonnes valeurs</span>}
            </div>
            <Button onClick={advance}>Suivant <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompteurTest;
