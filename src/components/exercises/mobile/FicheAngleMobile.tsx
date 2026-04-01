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
  handA: number;
  handO: number;
  answer: number;
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
    const handA = randInt(0, 71) * 5;
    const answer = randInt(3, 69) * 5;
    const handO = (handA + answer) % 360;
    questions.push({ handA, handO, answer });
  }
  return questions;
}

// ============================================================================
// SVG: Two-hand angle display (responsive)
// ============================================================================

function AngleDisplay({ handA, handO }: { handA: number; handO: number }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const handLen = size * 0.38;
  const labelOff = size * 0.06;

  const ptA = degToPoint(handA, cx, cy, handLen);
  const ptO = degToPoint(handO, cx, cy, handLen);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#E2E8F0" />
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#1E293B" />
      <text
        x={ptA.x + (ptA.x >= cx ? labelOff : -labelOff)}
        y={ptA.y + (ptA.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#2563EB" textAnchor="middle"
      >A</text>
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />
      <text
        x={ptO.x + (ptO.x >= cx ? labelOff : -labelOff)}
        y={ptO.y + (ptO.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#DC2626" textAnchor="middle"
      >O</text>
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
    </svg>
  );
}

// ============================================================================
// SVG: Trig circle correction (responsive)
// ============================================================================

function TrigCircle({
  handA, handO, answer, userAngle,
}: {
  handA: number; handO: number; answer: number; userAngle: number;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const tickR = size * 0.38;
  const labelR = size * 0.44;
  const handLen = r * 0.92;

  const majorAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  const ptA = degToPoint(handA, cx, cy, handLen);
  const ptO = degToPoint(handO, cx, cy, handLen);

  const arcA = degToPoint(handA, cx, cy, r * 0.6);
  const arcO = degToPoint(handO, cx, cy, r * 0.6);
  const largeArc = answer > 180 ? 1 : 0;
  const arcPath = `M ${arcA.x} ${arcA.y} A ${r * 0.6} ${r * 0.6} 0 ${largeArc} 0 ${arcO.x} ${arcO.y}`;

  const midAngle = (handA + answer / 2) % 360;
  const labelPt = degToPoint(midAngle, cx, cy, r * 0.4);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#F8FAFC" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#94A3B8" strokeWidth="1" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#94A3B8" strokeWidth="1" />

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

      <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="6 3" />

      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />
      <text x={ptA.x + (ptA.x >= cx ? 12 : -12)} y={ptA.y + (ptA.y >= cy ? 14 : -6)}
        fontSize="14" fontWeight="bold" fill="#2563EB" textAnchor="middle">A</text>

      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
      <text x={ptO.x + (ptO.x >= cx ? 12 : -12)} y={ptO.y + (ptO.y >= cy ? 14 : -6)}
        fontSize="14" fontWeight="bold" fill="#DC2626" textAnchor="middle">O</text>

      <circle cx={cx} cy={cy} r="4" fill="#1E293B" />

      <text x={labelPt.x} y={labelPt.y + 5} fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle">
        {answer}{'\u00B0'}
      </text>
    </svg>
  );
}

// ============================================================================
// Circular slider (touch-friendly, responsive)
// ============================================================================

function AngleSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (deg: number) => void;
}) {
  const size = 240;
  const svgRef = useRef<SVGSVGElement>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const handlePt = degToPoint(value, cx, cy, r);

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const x = (clientX - rect.left) * scaleX - cx;
    const y = -((clientY - rect.top) * scaleY - cy);
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
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[280px] mx-auto cursor-pointer touch-none"
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

      <line x1={cx} y1={cy} x2={handlePt.x} y2={handlePt.y}
        stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />

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

export default function FicheAngleMobile() {
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
    if (currentIdx + 1 >= angles.length) { setPhase('results'); return; }
    setCurrentIdx(currentIdx + 1);
    setUserAngle(0);
    setShowCorrection(false);
  }, [currentIdx, angles.length]);

  // ---- MENU ----
  if (phase === 'menu') {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-md mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Fiche Angles</CardTitle>
              <CardDescription className="text-sm mt-1">
                Estimez l&apos;angle entre deux aiguilles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
                <p><strong>30 angles</strong> a estimer.</p>
                <p>Deux aiguilles partent du meme centre.</p>
                <p>Trouvez l&apos;angle de <strong>A vers O</strong> (sens anti-horaire).</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-700">30</p>
                  <p className="text-xs text-slate-500">Angles</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-lg font-bold text-slate-700">5{'\u00B0'}</p>
                  <p className="text-xs text-slate-500">Precision</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full h-12" onClick={startFiche}>
                  <Play className="mr-2 h-5 w-5" /> Commencer
                </Button>
                <Button variant="ghost" size="lg" className="w-full h-12" onClick={() => router.push('/telephone')}>
                  <ArrowLeft className="mr-2 h-5 w-5" /> Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-md mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Resultats</CardTitle>
              <Badge
                variant={avgError <= 10 ? 'default' : avgError <= 25 ? 'secondary' : 'destructive'}
                className="text-base px-3 py-1 mt-2"
              >
                Erreur moy. {avgError}{'\u00B0'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{perfect}</p>
                  <p className="text-xs text-green-700">Parfaits</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{close}</p>
                  <p className="text-xs text-blue-700">{'\u2264'} 10{'\u00B0'}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <p className="text-xl font-bold text-amber-600">{avgError}{'\u00B0'}</p>
                  <p className="text-xs text-amber-700">Erreur moy.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700 text-sm">Detail :</p>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
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

              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full h-12" onClick={startFiche}>
                  <RotateCcw className="mr-2 h-5 w-5" /> Recommencer
                </Button>
                <Button variant="ghost" size="lg" className="w-full h-12" onClick={() => router.push('/telephone')}>
                  <Home className="mr-2 h-5 w-5" /> Accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  const currentQ = angles[currentIdx];

  if (showCorrection) {
    const lastResult = results[results.length - 1];
    return (
      <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-sm px-2 py-1">
              {currentIdx + 1} / {TOTAL_ANGLES}
            </Badge>
            <Badge variant={lastResult.error === 0 ? 'default' : lastResult.error <= 10 ? 'secondary' : 'destructive'}>
              {lastResult.error === 0 ? '\u2713 Parfait !' : `Erreur : ${lastResult.error}\u00B0`}
            </Badge>
          </div>

          <Card className="mb-3">
            <CardContent className="pt-4 pb-3">
              <TrigCircle
                handA={currentQ.handA}
                handO={currentQ.handO}
                answer={currentQ.answer}
                userAngle={lastResult.userAngle}
              />
              <div className="flex flex-col items-center gap-1 mt-3 text-sm">
                <div className="flex gap-4">
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
                  A{'\u2192'}O = {currentQ.answer}{'\u00B0'}
                  {lastResult.error > 0 && (
                    <span className="text-slate-400 font-normal ml-2">(vous : {lastResult.userAngle}{'\u00B0'})</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full h-12" onClick={nextAngle}>
            {currentIdx + 1 >= angles.length ? 'Voir les resultats' : 'Angle suivant'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-sm px-2 py-1">
            {currentIdx + 1} / {TOTAL_ANGLES}
          </Badge>
        </div>

        <Card className="mb-3">
          <CardContent className="pt-3 pb-2">
            <p className="text-center text-sm text-slate-500 mb-2">
              Angle de <span className="text-blue-600 font-bold">A</span> vers <span className="text-red-600 font-bold">O</span> (anti-horaire)
            </p>
            <AngleDisplay handA={currentQ.handA} handO={currentQ.handO} />
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardContent className="pt-3 pb-2">
            <p className="text-center text-xs text-slate-500 mb-1">Indiquez l&apos;angle</p>
            <AngleSlider value={userAngle} onChange={setUserAngle} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button variant="outline" size="sm" className="h-10 px-3"
                onClick={() => setUserAngle((userAngle - 5 + 360) % 360)}>
                <ChevronLeft className="h-4 w-4" /> 5{'\u00B0'}
              </Button>
              <span className="text-lg font-bold text-slate-700 min-w-[60px] text-center">
                {userAngle}{'\u00B0'}
              </span>
              <Button variant="outline" size="sm" className="h-10 px-3"
                onClick={() => setUserAngle((userAngle + 5) % 360)}>
                5{'\u00B0'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full h-12" onClick={submitAngle}>
          Valider
        </Button>
      </div>
    </div>
  );
}
