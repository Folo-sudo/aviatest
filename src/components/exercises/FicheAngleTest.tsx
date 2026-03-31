'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type Phase = 'menu' | 'playing' | 'results';

interface AngleQuestion {
  handA: number;   // angle of hand A in degrees (trig: 0=right, CCW)
  handO: number;   // angle of hand O
  answer: number;  // angle from A to O, measured CCW (always > 0)
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
    const handA = randInt(0, 71) * 5; // 0-355 step 5
    // Ensure answer is between 15 and 345 (not too small or too close to 360)
    const answer = randInt(3, 69) * 5; // 15-345 step 5
    const handO = (handA + answer) % 360;
    questions.push({ handA, handO, answer });
  }
  return questions;
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

  const majorAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  const ptA = degToPoint(handA, cx, cy, handLen);
  const ptO = degToPoint(handO, cx, cy, handLen);

  // Arc from A to O (CCW) to show the correct angle
  const arcA = degToPoint(handA, cx, cy, r * 0.6);
  const arcO = degToPoint(handO, cx, cy, r * 0.6);
  const largeArc = answer > 180 ? 1 : 0;
  const arcPath = `M ${arcA.x} ${arcA.y} A ${r * 0.6} ${r * 0.6} 0 ${largeArc} 0 ${arcO.x} ${arcO.y}`;

  // Angle label position
  const midAngle = (handA + answer / 2) % 360;
  const labelPt = degToPoint(midAngle, cx, cy, r * 0.4);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#F8FAFC" />

      {/* Grid circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* Axes */}
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#94A3B8" strokeWidth="1" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#94A3B8" strokeWidth="1" />

      {/* Tick marks */}
      {majorAngles.map(deg => {
        const ti = degToPoint(deg, cx, cy, r - 4);
        const to = degToPoint(deg, cx, cy, tickR);
        const lp = degToPoint(deg, cx, cy, labelR);
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

      {/* Arc showing correct angle */}
      <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="6 3" />

      {/* Hand A (blue) */}
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />
      <text x={ptA.x + (ptA.x >= cx ? 12 : -12)} y={ptA.y + (ptA.y >= cy ? 14 : -6)}
        fontSize="14" fontWeight="bold" fill="#2563EB" textAnchor="middle">A</text>

      {/* Hand O (red) */}
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
      <text x={ptO.x + (ptO.x >= cx ? 12 : -12)} y={ptO.y + (ptO.y >= cy ? 14 : -6)}
        fontSize="14" fontWeight="bold" fill="#DC2626" textAnchor="middle">O</text>

      {/* Center */}
      <circle cx={cx} cy={cy} r="4" fill="#1E293B" />

      {/* Angle label */}
      <text x={labelPt.x} y={labelPt.y + 5} fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle">
        {answer}{'\u00B0'}
      </text>
    </svg>
  );
}

// ============================================================================
// Circular slider (touch-friendly)
// ============================================================================

function AngleSlider({
  value,
  onChange,
  size = 240,
}: {
  value: number;
  onChange: (deg: number) => void;
  size?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const handlePt = degToPoint(value, cx, cy, r);

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left - cx;
    const y = -(clientY - rect.top - cy);
    let deg = Math.round((Math.atan2(y, x) * 180) / Math.PI);
    if (deg < 0) deg += 360;
    deg = Math.round(deg / 5) * 5;
    if (deg === 360) deg = 0;
    onChange(deg);
  }, [cx, cy, onChange]);

  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <svg
      ref={svgRef}
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto cursor-pointer touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <circle cx={cx} cy={cy} r={r} fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#E2E8F0" strokeWidth="1" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#E2E8F0" strokeWidth="1" />

      {[0, 90, 180, 270].map(deg => {
        const pt = degToPoint(deg, cx, cy, r + 16);
        return (
          <text key={deg} x={pt.x} y={pt.y + 4} fontSize="12" fontWeight="bold" fill="#64748B" textAnchor="middle">
            {deg}{'\u00B0'}
          </text>
        );
      })}

      {/* Line to handle */}
      <line x1={cx} y1={cy} x2={handlePt.x} y2={handlePt.y}
        stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />

      {/* Handle */}
      <circle cx={handlePt.x} cy={handlePt.y} r="14"
        fill="#F59E0B" stroke="white" strokeWidth="3" className="drop-shadow-md" />

      <circle cx={cx} cy={cy} r="4" fill="#475569" />

      <text x={cx} y={cy + 5} fontSize="20" fontWeight="bold" fill="#1E293B" textAnchor="middle">
        {value}{'\u00B0'}
      </text>
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function FicheAngleTest() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');

  const [angles, setAngles] = useState<AngleQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAngle, setUserAngle] = useState(0);
  const [showCorrection, setShowCorrection] = useState(false);
  const [results, setResults] = useState<AngleResult[]>([]);

  const startFiche = useCallback(() => {
    setAngles(generateAngles());
    setCurrentIdx(0);
    setUserAngle(0);
    setShowCorrection(false);
    setResults([]);
    setPhase('playing');
  }, []);

  const submitAngle = useCallback(() => {
    const q = angles[currentIdx];
    const error = angleDiff(userAngle, q.answer);
    setResults(prev => [...prev, { question: q, userAngle, error }]);
    setShowCorrection(true);
  }, [angles, currentIdx, userAngle]);

  const nextAngle = useCallback(() => {
    if (currentIdx + 1 >= angles.length) {
      setPhase('results');
      return;
    }
    setCurrentIdx(currentIdx + 1);
    setUserAngle(0);
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
              <p>Deux aiguilles partent du meme centre (comme une montre).</p>
              <p>Trouvez l&apos;angle de <strong>A vers O</strong> dans le sens anti-horaire (convention trigo).</p>
              <p>Apres chaque reponse, la correction s&apos;affiche sur le <strong>cercle trigonometrique</strong>.</p>
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
                      {r.question.answer}{'\u00B0'} {'\u2192'} {r.userAngle}{'\u00B0'}
                    </span>
                    <span className={`font-semibold ${r.error === 0 ? 'text-green-600' : r.error <= 10 ? 'text-blue-600' : r.error <= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.error === 0 ? '\u2713' : `\u00B1${r.error}\u00B0`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

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
                  Angle A{'\u2192'}O = {currentQ.answer}{'\u00B0'}
                  {lastResult.error > 0 && (
                    <span className="text-slate-400 font-normal ml-2">(vous : {lastResult.userAngle}{'\u00B0'})</span>
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

        {/* Two-hand angle display */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <p className="text-center text-sm text-slate-500 mb-2">
              Quel est l&apos;angle de <span className="text-blue-600 font-bold">A</span> vers <span className="text-red-600 font-bold">O</span> (sens anti-horaire) ?
            </p>
            <AngleDisplay handA={currentQ.handA} handO={currentQ.handO} />
          </CardContent>
        </Card>

        {/* Circular angle input */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <p className="text-center text-sm text-slate-500 mb-2">Indiquez l&apos;angle</p>
            <AngleSlider value={userAngle} onChange={setUserAngle} />
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button variant="outline" size="sm"
                onClick={() => setUserAngle((userAngle - 5 + 360) % 360)}>
                <ChevronLeft className="h-4 w-4" /> 5{'\u00B0'}
              </Button>
              <span className="text-lg font-bold text-slate-700 min-w-[60px] text-center">
                {userAngle}{'\u00B0'}
              </span>
              <Button variant="outline" size="sm"
                onClick={() => setUserAngle((userAngle + 5) % 360)}>
                5{'\u00B0'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={submitAngle}>
          Valider
        </Button>
      </div>
    </div>
  );
}
