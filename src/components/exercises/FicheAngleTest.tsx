'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  angleDeg: number; // 0-359, trig convention (0=right, CCW)
}

interface AngleResult {
  question: AngleQuestion;
  userAngle: number;
  error: number; // absolute error in degrees (shortest arc)
}

// ============================================================================
// Helpers
// ============================================================================

const TOTAL_ANGLES = 30;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate angles at multiples of 5° for cleaner values */
function generateAngles(): AngleQuestion[] {
  const angles: AngleQuestion[] = [];
  for (let i = 0; i < TOTAL_ANGLES; i++) {
    angles.push({ angleDeg: randInt(0, 71) * 5 }); // 0 to 355 in steps of 5
  }
  return angles;
}

/** Shortest angular distance */
function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/** Convert degrees (trig convention) to SVG coords on a circle */
function degToPoint(deg: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad), // SVG y is inverted
  };
}

// ============================================================================
// SVG Components
// ============================================================================

/** Angle display: line from A to O */
function AngleDisplay({ angleDeg, size = 220 }: { angleDeg: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const lineLen = size * 0.38;
  const labelOffset = size * 0.07;

  // A is at center, O is at the end of the line
  const endPt = degToPoint(angleDeg, cx, cy, lineLen);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#E2E8F0" />
      {/* Line from A to O */}
      <line
        x1={cx} y1={cy}
        x2={endPt.x} y2={endPt.y}
        stroke="#1E293B" strokeWidth="3" strokeLinecap="round"
      />
      {/* A label at center */}
      <text
        x={cx - labelOffset} y={cy + labelOffset * 1.8}
        fontSize="18" fontWeight="bold" fill="#1E293B" textAnchor="middle"
      >
        A
      </text>
      {/* O label at end */}
      <text
        x={endPt.x + (endPt.x > cx ? labelOffset : -labelOffset)}
        y={endPt.y + (endPt.y > cy ? labelOffset * 1.5 : -labelOffset * 0.5)}
        fontSize="18" fontWeight="bold" fill="#1E293B" textAnchor="middle"
      >
        O
      </text>
      {/* Small dot at A */}
      <circle cx={cx} cy={cy} r="4" fill="#1E293B" />
      {/* Small dot at O */}
      <circle cx={endPt.x} cy={endPt.y} r="4" fill="#1E293B" />
    </svg>
  );
}

/** Trig circle with angle highlighted */
function TrigCircle({
  angleDeg,
  userAngle,
  size = 280,
}: {
  angleDeg: number;
  userAngle?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const tickR = size * 0.38;
  const labelR = size * 0.44;

  // Major angles to label
  const majorAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  // Arc path for the angle
  const arcEnd = degToPoint(angleDeg, cx, cy, r);
  const arcStart = degToPoint(0, cx, cy, r);
  const largeArc = angleDeg > 180 ? 1 : 0;

  // SVG arc: we go counter-clockwise in trig, but SVG arcs go clockwise by default
  // So sweep-flag=0 for CCW
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`;

  // Arrow at end of angle
  const arrowPt = degToPoint(angleDeg, cx, cy, r * 0.85);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Background */}
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#F8FAFC" />

      {/* Grid circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* Axes */}
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#94A3B8" strokeWidth="1" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#94A3B8" strokeWidth="1" />

      {/* Tick marks and labels */}
      {majorAngles.map(deg => {
        const tickInner = degToPoint(deg, cx, cy, r - 4);
        const tickOuter = degToPoint(deg, cx, cy, tickR);
        const labelPt = degToPoint(deg, cx, cy, labelR);
        const isMajor = deg % 90 === 0;
        return (
          <g key={deg}>
            <line
              x1={tickInner.x} y1={tickInner.y}
              x2={tickOuter.x} y2={tickOuter.y}
              stroke={isMajor ? '#475569' : '#94A3B8'}
              strokeWidth={isMajor ? 2 : 1}
            />
            <text
              x={labelPt.x} y={labelPt.y + 4}
              fontSize={isMajor ? '12' : '9'}
              fontWeight={isMajor ? 'bold' : 'normal'}
              fill="#475569"
              textAnchor="middle"
            >
              {deg}{'\u00B0'}
            </text>
          </g>
        );
      })}

      {/* Correct angle arc */}
      {angleDeg > 0 && (
        <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="6 3" />
      )}

      {/* Correct angle line */}
      <line
        x1={cx} y1={cy}
        x2={arcEnd.x} y2={arcEnd.y}
        stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"
      />

      {/* User angle line (if provided) */}
      {userAngle !== undefined && (
        <>
          {(() => {
            const userEnd = degToPoint(userAngle, cx, cy, r);
            return (
              <line
                x1={cx} y1={cy}
                x2={userEnd.x} y2={userEnd.y}
                stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"
              />
            );
          })()}
        </>
      )}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="3" fill="#1E293B" />

      {/* Angle label */}
      {(() => {
        const labelAngle = angleDeg / 2;
        const lpt = degToPoint(labelAngle, cx, cy, r * 0.55);
        return (
          <text
            x={lpt.x} y={lpt.y + 5}
            fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle"
          >
            {angleDeg}{'\u00B0'}
          </text>
        );
      })()}

      {/* 0° reference line (positive x-axis) */}
      <line
        x1={cx} y1={cy}
        x2={cx + r} y2={cy}
        stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// Circular Slider (touch-friendly angle input)
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
    const y = -(clientY - rect.top - cy); // invert Y for trig
    let deg = Math.round((Math.atan2(y, x) * 180) / Math.PI);
    if (deg < 0) deg += 360;
    // Snap to 5°
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

  // Arc for visual feedback
  const arcEnd = degToPoint(value, cx, cy, r);
  const arcStart = degToPoint(0, cx, cy, r);
  const largeArc = value > 180 ? 1 : 0;
  const arcPath = value > 0
    ? `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`
    : '';

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto cursor-pointer touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r} fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />

      {/* Quadrant lines */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#E2E8F0" strokeWidth="1" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#E2E8F0" strokeWidth="1" />

      {/* Degree marks */}
      {[0, 90, 180, 270].map(deg => {
        const pt = degToPoint(deg, cx, cy, r + 16);
        return (
          <text key={deg} x={pt.x} y={pt.y + 4} fontSize="12" fontWeight="bold" fill="#64748B" textAnchor="middle">
            {deg}{'\u00B0'}
          </text>
        );
      })}

      {/* Selected arc */}
      {arcPath && (
        <path d={arcPath} fill="none" stroke="#F59E0B" strokeWidth="4" opacity="0.6" />
      )}

      {/* Selected line */}
      <line
        x1={cx} y1={cy}
        x2={arcEnd.x} y2={arcEnd.y}
        stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"
      />

      {/* Handle */}
      <circle
        cx={handlePt.x} cy={handlePt.y} r="14"
        fill="#F59E0B" stroke="white" strokeWidth="3"
        className="drop-shadow-md"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="4" fill="#475569" />

      {/* Value display */}
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
    const error = angleDiff(userAngle, q.angleDeg);
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

  // ---- MENU ----
  if (phase === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Fiche Angles</CardTitle>
            <CardDescription className="text-base mt-2">
              Estimez 30 angles sur le cercle trigonometrique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
              <p><strong>30 angles</strong> a estimer.</p>
              <p>Chaque angle montre une direction de A vers O.</p>
              <p>Utilisez le <strong>cercle interactif</strong> pour indiquer l&apos;angle (convention trigonometrique : 0{'\u00B0'} = droite, sens anti-horaire).</p>
              <p>Apres chaque reponse, la <strong>correction</strong> s&apos;affiche avec le cercle trigo.</p>
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

  // ---- RESULTS ----
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
                <p className="text-xs text-green-700">Parfaits (0{'\u00B0'})</p>
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
                      {r.question.angleDeg}{'\u00B0'} {'\u2192'} {r.userAngle}{'\u00B0'}
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
  const currentAngle = angles[currentIdx];

  if (showCorrection) {
    const lastResult = results[results.length - 1];
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-base px-3 py-1">
              {currentIdx + 1} / {TOTAL_ANGLES}
            </Badge>
            <Badge
              variant={lastResult.error === 0 ? 'default' : lastResult.error <= 10 ? 'secondary' : 'destructive'}
            >
              {lastResult.error === 0 ? '\u2713 Parfait !' : `Erreur : ${lastResult.error}\u00B0`}
            </Badge>
          </div>

          {/* Trig circle correction */}
          <Card className="mb-4">
            <CardContent className="pt-4 pb-3">
              <TrigCircle angleDeg={currentAngle.angleDeg} userAngle={lastResult.userAngle} />
              <div className="flex justify-center gap-6 mt-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-slate-600">Correct : {currentAngle.angleDeg}{'\u00B0'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  <span className="text-slate-600">Vous : {lastResult.userAngle}{'\u00B0'}</span>
                </div>
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
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx + 1} / {TOTAL_ANGLES}
          </Badge>
        </div>

        {/* Angle display */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <p className="text-center text-sm text-slate-500 mb-2">Quel est cet angle ?</p>
            <AngleDisplay angleDeg={currentAngle.angleDeg} />
          </CardContent>
        </Card>

        {/* Angle slider */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <p className="text-center text-sm text-slate-500 mb-2">Placez l&apos;angle sur le cercle</p>
            <AngleSlider value={userAngle} onChange={setUserAngle} />
            {/* Fine-tune buttons */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                variant="outline" size="sm"
                onClick={() => setUserAngle((userAngle - 5 + 360) % 360)}
              >
                <ChevronLeft className="h-4 w-4" /> 5{'\u00B0'}
              </Button>
              <span className="text-lg font-bold text-slate-700 min-w-[60px] text-center">
                {userAngle}{'\u00B0'}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setUserAngle((userAngle + 5) % 360)}
              >
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
