'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClassScoreBlock } from '@/components/ClassScoreBlock';
import { ArrowLeft, Play, RotateCcw, Home, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

type Phase = 'menu' | 'playing' | 'results';
type AngleMode = 'clock' | 'unsigned';

interface AngleQuestion {
  handA: number;
  handO: number;
  answer: number;
  lengthA: number;
  lengthO: number;
  clockRotation: number;
  clockReversed: boolean;
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
const TOTAL_UNSIGNED = 100;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function degToPoint(deg: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function generateAngles(): AngleQuestion[] {
  const questions: AngleQuestion[] = [];
  for (let i = 0; i < TOTAL_ANGLES; i++) {
    const handA = randInt(0, 35) * 10;
    const clockRotation = randInt(0, 35) * 10;
    const clockReversed = Math.random() < 0.5;

    // Signed angle (-280 to +280, step 10, excluding -10..10)
    let answer = 0;
    while (Math.abs(answer) < 15) {
      answer = randInt(-28, 28) * 10;
    }

    // handO from handA and answer using clock's positive direction
    let handO: number;
    if (clockReversed) {
      handO = ((handA + answer) % 360 + 360) % 360;
    } else {
      handO = ((handA - answer) % 360 + 360) % 360;
    }

    questions.push({
      handA,
      handO,
      answer,
      lengthA: 0.38,
      lengthO: 0.38,
      clockRotation,
      clockReversed,
    });
  }
  return questions;
}

function generateUnsignedAngles(): AngleQuestion[] {
  const questions: AngleQuestion[] = [];
  for (let i = 0; i < TOTAL_UNSIGNED; i++) {
    const handA = randInt(0, 35) * 10;
    const answer = randInt(1, 17) * 10;
    const direction = Math.random() < 0.5 ? 1 : -1;
    const handO = ((handA + direction * answer) % 360 + 360) % 360;
    questions.push({
      handA,
      handO,
      answer,
      // Comme scripts/fiche_angles_local.py : traits de longueurs independantes
      lengthA: 0.22 + Math.random() * 0.26,
      lengthO: 0.22 + Math.random() * 0.26,
      clockRotation: 0,
      clockReversed: false,
    });
  }
  return questions;
}

function unsignedError(userAngle: number, answer: number): number {
  const normalized = ((userAngle % 360) + 360) % 360;
  const complement = (360 - answer) % 360;
  return Math.min(Math.abs(normalized - answer), Math.abs(normalized - complement));
}

function formatUnsignedExpected(answer: number): string {
  return `${answer} ou ${(360 - answer) % 360}`;
}

// ============================================================================
// SVG: Clock dial reference (shows positive direction)
// ============================================================================

function ClockDial({ rotation, reversed }: { rotation: number; reversed: boolean }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const tickLen = size * 0.06;
  const labelR = r + size * 0.12;

  const positions = [
    { num: 12, baseDeg: 90 },
    { num: 3, baseDeg: reversed ? 180 : 0 },
    { num: 6, baseDeg: 270 },
    { num: 9, baseDeg: reversed ? 0 : 180 },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[120px] mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E293B" strokeWidth="2.5" />
      {positions.map(({ num, baseDeg }) => {
        const deg = baseDeg + rotation;
        const inner = degToPoint(deg, cx, cy, r - 2);
        const outer = degToPoint(deg, cx, cy, r + tickLen);
        const label = degToPoint(deg, cx, cy, labelR);
        const textRotation = -deg + 90;
        return (
          <g key={num}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#1E293B" strokeWidth="2.5" />
            <text x={label.x} y={label.y} fontSize={num === 12 ? '14' : '16'} fontWeight="bold"
              fill="#1E293B" textAnchor="middle" dominantBaseline="central"
              transform={`rotate(${textRotation}, ${label.x}, ${label.y})`}>{num}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// SVG: Two-hand angle display (responsive)
// ============================================================================

function AngleDisplay({
  handA,
  handO,
  lengthA = 0.38,
  lengthO = 0.38,
  colored = false,
}: {
  handA: number;
  handO: number;
  lengthA?: number;
  lengthO?: number;
  colored?: boolean;
}) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const labelOff = size * 0.06;
  const strokeA = colored ? '#2563EB' : '#1E293B';
  const strokeO = colored ? '#DC2626' : '#1E293B';

  const ptA = degToPoint(handA, cx, cy, size * lengthA);
  const ptO = degToPoint(handO, cx, cy, size * lengthO);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#E2E8F0" />
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke={strokeA} strokeWidth="4" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke={strokeO} strokeWidth="4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#1E293B" />
      <text
        x={ptA.x + (ptA.x >= cx ? labelOff : -labelOff)}
        y={ptA.y + (ptA.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#2563EB" textAnchor="middle"
      >A</text>
      <circle cx={ptA.x} cy={ptA.y} r="5" fill="#2563EB" />
      <text
        x={ptO.x + (ptO.x >= cx ? labelOff : -labelOff)}
        y={ptO.y + (ptO.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#DC2626" textAnchor="middle"
      >O</text>
      <circle cx={ptO.x} cy={ptO.y} r="5" fill="#DC2626" />
    </svg>
  );
}

// ============================================================================
// SVG: Trig circle correction (responsive)
// 0 degrees on the circle is aligned with the O hand direction
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

  // Rotation offset: 0 degrees on the trig circle = direction of hand O
  const offset = handO;

  const majorAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  const ptA = degToPoint(handA, cx, cy, handLen);
  const ptO = degToPoint(handO, cx, cy, handLen);

  // Arc from A to O
  const arcA = degToPoint(handA, cx, cy, r * 0.6);
  const arcO = degToPoint(handO, cx, cy, r * 0.6);
  const absAnswer = Math.abs(answer);
  const largeArc = absAnswer > 180 ? 1 : 0;
  const arcPath = `M ${arcA.x} ${arcA.y} A ${r * 0.6} ${r * 0.6} 0 ${largeArc} 0 ${arcO.x} ${arcO.y}`;

  const midAngle = handA + (handO - handA) / 2;
  const labelPt = degToPoint(midAngle, cx, cy, r * 0.35);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="12" fill="#F8FAFC" />
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

      {/* Correct answer arc (blue dashed) */}
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

      <circle cx={cx} cy={cy} r="4" fill="#1E293B" />

      {/* Answer label */}
      <text x={labelPt.x} y={labelPt.y + 5} fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle">
        {answer >= 0 ? '+' : ''}{answer}{'\u00B0'}
      </text>
    </svg>
  );
}

// (AngleSlider removed — replaced by text input)

// ============================================================================
// Main Component
// ============================================================================

export default function FicheAngleMobile() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<AngleMode>('clock');

  const [angles, setAngles] = useState<AngleQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [results, setResults] = useState<AngleResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const startFiche = useCallback((nextMode: AngleMode) => {
    setMode(nextMode);
    setAngles(nextMode === 'unsigned' ? generateUnsignedAngles() : generateAngles());
    setCurrentIdx(0);
    setUserInput('');
    setShowCorrection(false);
    setResults([]);
    setPhase('playing');
  }, []);

  // Focus input when question changes
  useEffect(() => {
    if (phase === 'playing' && !showCorrection) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase, currentIdx, showCorrection]);

  const submitAngle = useCallback(() => {
    const parsed = parseInt(userInput, 10);
    if (isNaN(parsed)) return;
    const snapped = Math.round(parsed / 10) * 10;
    const q = angles[currentIdx];
    const error =
      mode === 'unsigned'
        ? unsignedError(snapped, q.answer)
        : Math.abs(snapped - q.answer);
    setResults(prev => [...prev, { question: q, userAngle: snapped, error }]);
    setShowCorrection(true);
  }, [angles, currentIdx, userInput, mode]);

  const nextAngle = useCallback(() => {
    if (currentIdx + 1 >= angles.length) { setPhase('results'); return; }
    setCurrentIdx(currentIdx + 1);
    setUserInput('');
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
                Choisissez le type d&apos;entrainement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="lg"
                className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
                onClick={() => startFiche('clock')}
              >
                <span className="flex items-center font-semibold">
                  <Play className="mr-2 h-5 w-5 shrink-0" /> Cadran (actuelle)
                </span>
                <span className="font-normal text-xs opacity-90">
                  30 angles signes avec cadran horloge
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
                onClick={() => startFiche('unsigned')}
              >
                <span className="font-semibold">Angle non oriente</span>
                <span className="font-normal text-xs text-[#605a57]">
                  100 angles, x et 360 - x acceptes (app Python)
                </span>
              </Button>
              <Button variant="ghost" size="lg" className="w-full h-12" onClick={() => router.push('/telephone')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Retour
              </Button>
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
    const percent = results.length > 0 ? Math.round((close / results.length) * 100) : 0;

    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: '#fbfaf9' }}>
        <div className="max-w-md mx-auto pt-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Résultats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClassScoreBlock
                exerciseId={'fiche-angles'}
                percent={percent}
                detail={`${close} / ${results.length} a 10° ou moins`}
              />
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
                <p className="font-semibold text-[#37322f] text-sm">Detail :</p>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {results.map((r, i) => (
                    <div key={i} className="bg-[#f7f5f3] rounded px-3 py-2 text-sm flex justify-between items-center">
                      <span className="text-[#605a57]">#{i + 1}</span>
                      <span className="font-mono text-[#605a57]">
                        {mode === 'unsigned'
                          ? `${formatUnsignedExpected(r.question.answer)}\u00B0 \u2192 ${r.userAngle}\u00B0`
                          : `${r.question.answer >= 0 ? '+' : ''}${r.question.answer}\u00B0 \u2192 ${r.userAngle >= 0 ? '+' : ''}${r.userAngle}\u00B0`}
                      </span>
                      <span className={`font-semibold ${r.error === 0 ? 'text-green-600' : r.error <= 10 ? 'text-blue-600' : r.error <= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                        {r.error === 0 ? '\u2713' : `\u0394${r.error}\u00B0`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full h-12" onClick={() => startFiche(mode)}>
                  <RotateCcw className="mr-2 h-5 w-5" /> Recommencer
                </Button>
                <Button variant="outline" size="lg" className="w-full h-12" onClick={() => setPhase('menu')}>
                  Changer de mode
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
              {currentIdx + 1} / {angles.length}
            </Badge>
            <Badge variant={lastResult.error === 0 ? 'default' : lastResult.error <= 10 ? 'secondary' : 'destructive'}>
              {lastResult.error === 0 ? '\u2713 Parfait !' : `Erreur : ${lastResult.error}\u00B0`}
            </Badge>
          </div>

          <Card className="mb-3">
            <CardContent className="pt-4 pb-3">
              {mode === 'unsigned' ? (
                <AngleDisplay
                  handA={currentQ.handA}
                  handO={currentQ.handO}
                  lengthA={currentQ.lengthA}
                  lengthO={currentQ.lengthO}
                  colored
                />
              ) : (
                <TrigCircle
                  handA={currentQ.handA}
                  handO={currentQ.handO}
                  answer={currentQ.answer}
                  userAngle={lastResult.userAngle}
                />
              )}
              <div className="flex flex-col items-center gap-1 mt-3 text-sm">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-[#605a57]">A</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-[#605a57]">O</span>
                  </div>
                </div>
                <p className="text-[#37322f] font-semibold">
                  {mode === 'unsigned'
                    ? `Bonnes reponses : ${formatUnsignedExpected(currentQ.answer)}\u00B0`
                    : `A\u2192O = ${currentQ.answer >= 0 ? '+' : ''}${currentQ.answer}\u00B0`}
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
            {currentIdx + 1} / {angles.length}
          </Badge>
        </div>

        <Card className="mb-3">
          <CardContent className="pt-3 pb-2">
            <p className="text-center text-sm text-[#605a57] mb-2">
              {mode === 'unsigned' ? (
                <>
                  Angle non oriente entre <span className="text-blue-600 font-bold">A</span> et{' '}
                  <span className="text-red-600 font-bold">O</span>
                  <span className="block mt-1 text-xs">Les deux sens sont acceptes : x et 360 - x</span>
                </>
              ) : (
                <>
                  Angle de <span className="text-blue-600 font-bold">A</span> vers{' '}
                  <span className="text-red-600 font-bold">O</span> (sens positif du cadran)
                </>
              )}
            </p>
            {mode === 'unsigned' ? (
              <AngleDisplay
                handA={currentQ.handA}
                handO={currentQ.handO}
                lengthA={currentQ.lengthA}
                lengthO={currentQ.lengthO}
                colored
              />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <AngleDisplay handA={currentQ.handA} handO={currentQ.handO} />
                <ClockDial rotation={currentQ.clockRotation} reversed={currentQ.clockReversed} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 mb-3">
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            step={10}
            placeholder="Angle (ex: 130 ou -40)"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAngle();
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const cur = parseInt(userInput, 10);
                const base = Number.isNaN(cur) ? 0 : cur;
                const next = Math.round((base + (e.key === 'ArrowUp' ? 10 : -10)) / 10) * 10;
                setUserInput(String(next));
              }
            }}
            className="text-center text-lg font-mono h-14 flex-1"
          />
          <Button size="lg" className="h-14 px-6" onClick={submitAngle} disabled={userInput.trim() === ''}>
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
