'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type Phase = 'menu' | 'playing' | 'results';

interface AngleQuestion {
  handA: number;        // angle of hand A in degrees (trig: 0=right, CCW)
  handO: number;        // angle of hand O
  answer: number;       // signed angle from A to O in the clock's positive direction
  clockRotation: number; // rotation offset of the clock dial
  clockReversed: boolean; // whether the clock is reversed (positive = CCW instead of CW)
}

interface AngleResult {
  question: AngleQuestion;
  userAngle: number;
  error: number;
}

// ============================================================================
// Helpers
// ============================================================================

const TOTAL_ANGLES = 30;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function degToPoint(deg: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function generateAngles(): AngleQuestion[] {
  const questions: AngleQuestion[] = [];
  for (let i = 0; i < TOTAL_ANGLES; i++) {
    const handA = randInt(0, 35) * 10; // 0-350 step 10
    const clockRotation = randInt(0, 35) * 10;
    const clockReversed = Math.random() < 0.5;

    // Generate a signed angle (-280 to +280, step 10, excluding -10..10)
    let answer = 0;
    while (Math.abs(answer) < 15) {
      answer = randInt(-28, 28) * 10; // -280 to +280
    }

    // Calculate handO from handA and answer using the clock's positive direction
    // Normal clock (not reversed): positive = CW = decreasing trig angle
    // Reversed clock: positive = CCW = increasing trig angle
    let handO: number;
    if (clockReversed) {
      // Positive = CCW (increasing trig angle)
      handO = ((handA + answer) % 360 + 360) % 360;
    } else {
      // Positive = CW (decreasing trig angle)
      handO = ((handA - answer) % 360 + 360) % 360;
    }

    questions.push({ handA, handO, answer, clockRotation, clockReversed });
  }
  return questions;
}

// ============================================================================
// SVG: Clock dial reference (shows positive direction)
// ============================================================================

function ClockDial({
  rotation,
  reversed,
  size = 160,
}: {
  rotation: number;
  reversed: boolean;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const tickLen = size * 0.06;
  const labelR = r + size * 0.12;

  // Clock positions: 12, 3, 6, 9 in trig degrees
  // On a normal clock: 12=top(90), 3=right(0), 6=bottom(270), 9=left(180)
  // If reversed: 3 and 9 swap → 3=left(180), 9=right(0)
  const positions = [
    { num: 12, baseDeg: 90 },
    { num: 3, baseDeg: reversed ? 180 : 0 },
    { num: 6, baseDeg: 270 },
    { num: 9, baseDeg: reversed ? 0 : 180 },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[160px] mx-auto">
      {/* Circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E293B" strokeWidth="2.5" />

      {/* Tick marks and numbers */}
      {positions.map(({ num, baseDeg }) => {
        const deg = baseDeg + rotation;
        const inner = degToPoint(deg, cx, cy, r - 2);
        const outer = degToPoint(deg, cx, cy, r + tickLen);
        const label = degToPoint(deg, cx, cy, labelR);

        // Rotate the number text to be tangent to the circle
        const textRotation = -deg + 90; // so numbers read outward

        return (
          <g key={num}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="#1E293B" strokeWidth="2.5" />
            <text
              x={label.x} y={label.y}
              fontSize={num === 12 ? '16' : '18'}
              fontWeight="bold"
              fill="#1E293B"
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${textRotation}, ${label.x}, ${label.y})`}
            >
              {num}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// SVG: Two-hand angle display (like a clock)
// ============================================================================

function AngleDisplay({ handA, handO, size = 240 }: { handA: number; handO: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const handLen = size * 0.38;
  const labelOff = size * 0.06;

  const ptA = degToPoint(handA, cx, cy, handLen);
  const ptO = degToPoint(handO, cx, cy, handLen);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#E2E8F0" />

      {/* Hand A */}
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      {/* Hand O */}
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="5" fill="#1E293B" />

      {/* Label A */}
      <text
        x={ptA.x + (ptA.x >= cx ? labelOff : -labelOff)}
        y={ptA.y + (ptA.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#2563EB" textAnchor="middle"
      >A</text>
      {/* Dot at A */}
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />

      {/* Label O */}
      <text
        x={ptO.x + (ptO.x >= cx ? labelOff : -labelOff)}
        y={ptO.y + (ptO.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#DC2626" textAnchor="middle"
      >O</text>
      {/* Dot at O */}
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
    </svg>
  );
}

// ============================================================================
// SVG: Trig circle correction
// ============================================================================

function TrigCircle({
  handA,
  handO,
  answer,
  userAngle,
  size = 280,
}: {
  handA: number;
  handO: number;
  answer: number;
  userAngle: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const tickR = size * 0.38;
  const labelR = size * 0.44;
  const handLen = r * 0.92;

  // Rotation offset: 0 degrees on the trig circle = direction of hand O
  const offset = handO;

  const majorAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  const ptA = degToPoint(handA, cx, cy, handLen);
  const ptO = degToPoint(handO, cx, cy, handLen);

  // Arc from A to O — correct answer
  const arcA = degToPoint(handA, cx, cy, r * 0.6);
  const arcO = degToPoint(handO, cx, cy, r * 0.6);
  // For the arc direction: we draw from A to O. SVG arc sweep-flag 0 = CCW in SVG coords (= CW in trig)
  const absAnswer = Math.abs(answer);
  const largeArc = absAnswer > 180 ? 1 : 0;
  const arcPath = `M ${arcA.x} ${arcA.y} A ${r * 0.6} ${r * 0.6} 0 ${largeArc} 0 ${arcO.x} ${arcO.y}`;

  // Angle label position (midpoint of the arc)
  const midAngle = handA + (handO - handA) / 2;
  const labelPt = degToPoint(midAngle, cx, cy, r * 0.35);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#F8FAFC" />

      {/* Grid circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* Axes aligned with O direction */}
      {(() => {
        const ax1 = degToPoint(offset, cx, cy, r + 10);
        const ax2 = degToPoint(offset + 180, cx, cy, r + 10);
        const ay1 = degToPoint(offset + 90, cx, cy, r + 10);
        const ay2 = degToPoint(offset + 270, cx, cy, r + 10);
        return (
          <>
            <line x1={ax2.x} y1={ax2.y} x2={ax1.x} y2={ax1.y} stroke="#94A3B8" strokeWidth="1" />
            <line x1={ay2.x} y1={ay2.y} x2={ay1.x} y2={ay1.y} stroke="#94A3B8" strokeWidth="1" />
          </>
        );
      })()}

      {/* Tick marks and labels — rotated so 0 aligns with O */}
      {majorAngles.map(deg => {
        const screenDeg = (deg + offset) % 360;
        const ti = degToPoint(screenDeg, cx, cy, r - 4);
        const to = degToPoint(screenDeg, cx, cy, tickR);
        const lp = degToPoint(screenDeg, cx, cy, labelR);
        const major = deg % 90 === 0;
        return (
          <g key={deg}>
            <line x1={ti.x} y1={ti.y} x2={to.x} y2={to.y}
              stroke={major ? '#475569' : '#94A3B8'} strokeWidth={major ? 2 : 1} />
            <text x={lp.x} y={lp.y + 4} fontSize={major ? '12' : '9'}
              fontWeight={major ? 'bold' : 'normal'} fill="#475569" textAnchor="middle">
              {deg}{'\u00B0'}
            </text>
          </g>
        );
      })}

      {/* Arc showing correct angle (blue dashed) */}
      <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="6 3" />

      {/* Hand A (blue) */}
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />
      <text x={ptA.x + (ptA.x >= cx ? 12 : -12)} y={ptA.y + (ptA.y >= cy ? 14 : -6)}
        fontSize="14" fontWeight="bold" fill="#2563EB" textAnchor="middle">A</text>

      {/* Hand O (red) — aligned with 0 on the trig circle */}
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
      <text x={ptO.x + (ptO.x >= cx ? 12 : -12)} y={ptO.y + (ptO.y >= cy ? 14 : -6)}
        fontSize="14" fontWeight="bold" fill="#DC2626" textAnchor="middle">O (0{'\u00B0'})</text>

      {/* Center */}
      <circle cx={cx} cy={cy} r="4" fill="#1E293B" />

      {/* Angle label */}
      <text x={labelPt.x} y={labelPt.y + 5} fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle">
        {answer >= 0 ? '+' : ''}{answer}{'\u00B0'}
      </text>
    </svg>
  );
}

// ============================================================================
// Circular slider (touch-friendly)
// ============================================================================

// (AngleSlider removed — replaced by text input)

// ============================================================================
// Main Component
// ============================================================================

export default function FicheAngleTest() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');

  const [angles, setAngles] = useState<AngleQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [results, setResults] = useState<AngleResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const perfSavedRef = useRef(false);

  // Focus input when question changes
  useEffect(() => {
    if (phase === 'playing' && !showCorrection) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase, currentIdx, showCorrection]);

  const startFiche = useCallback(() => {
    perfSavedRef.current = false;
    setAngles(generateAngles());
    setCurrentIdx(0);
    setUserInput('');
    setShowCorrection(false);
    setResults([]);
    setPhase('playing');
  }, []);

  const submitAngle = useCallback(() => {
    const parsed = parseInt(userInput, 10);
    if (isNaN(parsed)) return;
    // Snap to nearest multiple of 10
    const snapped = Math.round(parsed / 10) * 10;
    const q = angles[currentIdx];
    const error = Math.abs(snapped - q.answer);
    setResults(prev => [...prev, { question: q, userAngle: snapped, error }]);
    setShowCorrection(true);
  }, [angles, currentIdx, userInput]);

  const nextAngle = useCallback(() => {
    if (currentIdx + 1 >= angles.length) {
      setPhase('results');
      return;
    }
    setCurrentIdx(currentIdx + 1);
    setUserInput('');
    setShowCorrection(false);
  }, [currentIdx, angles.length]);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (phase === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Fiche Angles</CardTitle>
            <CardDescription className="text-base mt-2">
              Estimez l&apos;angle entre deux aiguilles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p><strong>30 angles</strong> a estimer.</p>
              <p>Deux aiguilles partent du meme centre.</p>
              <p>Un <strong>cadran horloge</strong> indique le sens positif (lire les chiffres 3{'\u2192'}6{'\u2192'}9{'\u2192'}12 dans l&apos;ordre croissant).</p>
              <p>Trouvez l&apos;angle de <strong>A vers O</strong> dans le sens positif du cadran.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">30</p>
                <p className="text-xs text-slate-500">Angles</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xl font-bold text-slate-700">5{'\u00B0'}</p>
                <p className="text-xs text-slate-500">Precision</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startFiche}>
                <Play className="mr-2 h-5 w-5" /> Commencer
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

  if (phase === 'results') {
    const avgError = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.error, 0) / results.length)
      : 0;
    const perfect = results.filter(r => r.error === 0).length;
    const close = results.filter(r => r.error <= 10).length;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult('fiche-angles', close, results.length);
    }
    const perfEntries = loadEntries('fiche-angles');

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge
              variant={avgError <= 10 ? 'default' : avgError <= 25 ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-1 mt-2"
            >
              Erreur moy. {avgError}{'\u00B0'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{perfect}</p>
                <p className="text-xs text-green-700">Parfaits</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{close}</p>
                <p className="text-xs text-blue-700">{'\u2264'} 10{'\u00B0'}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{avgError}{'\u00B0'}</p>
                <p className="text-xs text-amber-700">Erreur moy.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-700 text-sm">Detail :</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {results.map((r, i) => (
                  <div key={i} className="bg-slate-50 rounded px-3 py-2 text-sm flex justify-between items-center">
                    <span className="text-slate-500">#{i + 1}</span>
                    <span className="font-mono text-slate-600">
                      {r.question.answer >= 0 ? '+' : ''}{r.question.answer}{'\u00B0'} {'\u2192'} {r.userAngle >= 0 ? '+' : ''}{r.userAngle}{'\u00B0'}
                    </span>
                    <span className={`font-semibold ${r.error === 0 ? 'text-green-600' : r.error <= 10 ? 'text-blue-600' : r.error <= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.error === 0 ? '\u2713' : `\u0394${r.error}\u00B0`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {perfEntries.length >= 2 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-500 mb-2 text-center">Progression</p>
                <div className="flex justify-center">
                  <MiniPerformanceChart entries={perfEntries} exerciseId="fiche-angles" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startFiche}>
                <RotateCcw className="mr-2 h-5 w-5" /> Recommencer
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

  // ---- PLAYING ----
  const currentQ = angles[currentIdx];

  if (showCorrection) {
    const lastResult = results[results.length - 1];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-base px-3 py-1">
              {currentIdx + 1} / {TOTAL_ANGLES}
            </Badge>
            <Badge variant={lastResult.error === 0 ? 'default' : lastResult.error <= 10 ? 'secondary' : 'destructive'}>
              {lastResult.error === 0 ? '\u2713 Parfait !' : `Erreur : ${lastResult.error}\u00B0`}
            </Badge>
          </div>

          <Card className="mb-4">
            <CardContent className="pt-4 pb-3">
              <TrigCircle
                handA={currentQ.handA}
                handO={currentQ.handO}
                answer={currentQ.answer}
                userAngle={lastResult.userAngle}
              />
              <div className="flex flex-col items-center gap-2 mt-3 text-sm">
                <div className="flex gap-6">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-slate-600">A ({currentQ.handA}{'\u00B0'})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-slate-600">O ({currentQ.handO}{'\u00B0'})</span>
                  </div>
                </div>
                <p className="text-slate-700 font-semibold">
                  Angle A{'\u2192'}O = {currentQ.answer >= 0 ? '+' : ''}{currentQ.answer}{'\u00B0'}
                  {lastResult.error > 0 && (
                    <span className="text-slate-400 font-normal ml-2">(vous : {lastResult.userAngle >= 0 ? '+' : ''}{lastResult.userAngle}{'\u00B0'})</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={nextAngle}>
            {currentIdx + 1 >= angles.length ? 'Voir les resultats' : 'Angle suivant'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx + 1} / {TOTAL_ANGLES}
          </Badge>
        </div>

        {/* Angle display + clock dial */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <p className="text-center text-sm text-slate-500 mb-3">
              Angle de <span className="text-blue-600 font-bold">A</span> vers <span className="text-red-600 font-bold">O</span> dans le sens positif du cadran
            </p>
            <div className="flex items-center justify-center gap-4">
              <AngleDisplay handA={currentQ.handA} handO={currentQ.handO} />
              <ClockDial rotation={currentQ.clockRotation} reversed={currentQ.clockReversed} />
            </div>
          </CardContent>
        </Card>

        {/* Angle input bar */}
        <div className="flex items-center gap-3 mb-4">
          <Input
            ref={inputRef}
            type="number"
            step={10}
            placeholder="Angle (ex: 130 ou -40)"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAngle()}
            className="text-center text-lg font-mono h-12 flex-1"
          />
          <Button size="lg" className="h-12" onClick={submitAngle} disabled={userInput.trim() === ''}>
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
