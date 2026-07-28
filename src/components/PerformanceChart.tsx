'use client';

import { useMemo } from 'react';
import { type PerformanceEntry, scoreToStanine } from '@/lib/core/PerformanceTracker';

// Band colors matching Pilotest style
const BANDS = [
  { min: 1, max: 3, color: '#FFE4E6' }, // rose - faible
  { min: 3, max: 5, color: '#FEF3C7' }, // jaune - moyen-
  { min: 5, max: 7, color: '#DCFCE7' }, // vert clair - moyen+
  { min: 7, max: 9, color: '#DBEAFE' }, // bleu clair - bon
];

// Exercise-specific line colors
const LINE_COLORS: Record<string, string> = {
  'clock-angle': '#8B5CF6',
  'pair-impair': '#EC4899',
  'un-mot-sur-deux': '#F59E0B',
  'shapes-colors': '#10B981',
  'billes': '#EC4899',
  'm2-back': '#0EA5E9',
  'm3-back': '#0EA5E9',
  'mental-rotation': '#F59E0B',
  'calcul-memo': '#EF4444',
  'calcul-mental': '#3B82F6',
  'calcul-mental-2': '#EC4899',
  'calcul-mental-3': '#3B82F6',
  'attention-3': '#8B5CF6',
  'fiche-angles': '#10B981',
  'compteurs': '#6366F1',
  'psychomoteur-psy0': '#10B981',
  airways: '#683B95',
  empilements: '#F59E0B',
  'objets-3d': '#D97706',
  'formes-glissees': '#6366F1',
  'cubes-psy0': '#F59E0B',
  'grilles-calculs': '#3B82F6',
  'boites-mots': '#EC4899',
  'mots-en-etoile': '#DB2777',
  'series-logiques': '#8B5CF6',
  'anglais-psy0': '#0EA5E9',
};

function getLineColor(exerciseId: string): string {
  return LINE_COLORS[exerciseId] || '#6366F1';
}

interface PerformanceChartProps {
  entries: PerformanceEntry[];
  exerciseId: string;
  width?: number;
  height?: number;
}

export default function PerformanceChart({
  entries,
  exerciseId,
  width = 280,
  height = 160,
}: PerformanceChartProps) {
  const padding = { top: 8, right: 12, bottom: 28, left: 20 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const stanineData = useMemo(() =>
    entries.map(e => ({
      date: new Date(e.date),
      stanine: scoreToStanine(e.score),
    })),
    [entries]
  );

  const dateLabels = useMemo(() => {
    if (stanineData.length === 0) return [];
    if (stanineData.length === 1) {
      return [{ x: chartW / 2, label: formatDate(stanineData[0].date) }];
    }
    // Show 3-4 date labels evenly spaced
    const count = Math.min(4, stanineData.length);
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (stanineData.length - 1));
      const x = (idx / (stanineData.length - 1)) * chartW;
      labels.push({ x, label: formatDate(stanineData[idx].date) });
    }
    return labels;
  }, [stanineData, chartW]);

  if (entries.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-slate-400"
        style={{ width, height }}
      >
        Pas encore de donnees
      </div>
    );
  }

  const lineColor = getLineColor(exerciseId);

  // Y axis: stanine 1-9
  const yMin = 1;
  const yMax = 9;
  const toY = (val: number) => chartH - ((val - yMin) / (yMax - yMin)) * chartH;
  const toX = (idx: number) =>
    stanineData.length === 1 ? chartW / 2 : (idx / (stanineData.length - 1)) * chartW;

  // Build path
  const points = stanineData.map((d, i) => ({ x: toX(i), y: toY(d.stanine) }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="block">
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Background bands */}
        {BANDS.map((band, i) => (
          <rect
            key={i}
            x={0}
            y={toY(band.max)}
            width={chartW}
            height={toY(band.min) - toY(band.max)}
            fill={band.color}
          />
        ))}

        {/* Y-axis labels */}
        {[1, 3, 5, 7, 9].map(v => (
          <text
            key={v}
            x={-4}
            y={toY(v) + 3}
            textAnchor="end"
            fontSize={9}
            fill="#94a3b8"
          >
            {v}
          </text>
        ))}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Single point if only one entry */}
        {stanineData.length === 1 && (
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r={4}
            fill="white"
            stroke={lineColor}
            strokeWidth={2}
          />
        )}

        {/* Date labels */}
        {dateLabels.map((dl, i) => (
          <text
            key={i}
            x={dl.x}
            y={chartH + 16}
            textAnchor="middle"
            fontSize={8}
            fill="#94a3b8"
          >
            {dl.label}
          </text>
        ))}
      </g>
    </svg>
  );
}

function formatDate(d: Date): string {
  const months = ['janv.', 'fevr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ============================================================================
// Mini inline chart for results screen
// ============================================================================

interface MiniPerformanceChartProps {
  entries: PerformanceEntry[];
  exerciseId: string;
}

export function MiniPerformanceChart({ entries, exerciseId }: MiniPerformanceChartProps) {
  if (entries.length < 2) return null;

  const last = Math.min(entries.length, 20);
  const recent = entries.slice(-last);
  const lineColor = getLineColor(exerciseId);

  const w = 200;
  const h = 48;
  const pad = 4;
  const cw = w - pad * 2;
  const ch = h - pad * 2;

  const stanines = recent.map(e => scoreToStanine(e.score));

  const toY = (v: number) => ch - ((v - 1) / 8) * ch;
  const toX = (i: number) => (i / (stanines.length - 1)) * cw;

  const pathD = stanines.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(s)}`).join(' ');

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={w} height={h} className="block">
        <g transform={`translate(${pad},${pad})`}>
          {/* Subtle background bands */}
          <rect x={0} y={toY(9)} width={cw} height={toY(7) - toY(9)} fill="#DBEAFE" opacity={0.4} />
          <rect x={0} y={toY(7)} width={cw} height={toY(5) - toY(7)} fill="#DCFCE7" opacity={0.4} />
          <rect x={0} y={toY(5)} width={cw} height={toY(3) - toY(5)} fill="#FEF3C7" opacity={0.4} />
          <rect x={0} y={toY(3)} width={cw} height={toY(1) - toY(3)} fill="#FFE4E6" opacity={0.4} />
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" />
        </g>
      </svg>
      <span className="text-[10px] text-slate-400">{entries.length} session{entries.length > 1 ? 's' : ''}</span>
    </div>
  );
}
