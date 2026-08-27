'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Helpers
// ============================================================================

function degToPoint(deg: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// ============================================================================
// SVG: Angle visualizer with A/O hands
// ============================================================================

function AngleVisualizer({
  angle,
  rotation,
  showCircle,
  size = 320,
}: {
  angle: number;
  rotation: number;
  showCircle: boolean;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const handLen = r * 0.92;
  const tickR = size * 0.40;
  const labelR = size * 0.46;
  const labelOff = size * 0.05;

  const majorAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  const normAngle = ((angle % 360) + 360) % 360;

  // Hand A starts at `rotation`, hand O is at `rotation + angle`
  const handADeg = rotation;
  const handODeg = rotation + normAngle;

  const ptA = degToPoint(handADeg, cx, cy, handLen);
  const ptO = degToPoint(handODeg, cx, cy, handLen);

  // Arc from A to O
  const arcR = r * 0.55;
  const arcStart = degToPoint(handADeg, cx, cy, arcR);
  const arcEnd = degToPoint(handODeg, cx, cy, arcR);
  const largeArc = normAngle > 180 ? 1 : 0;
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`;

  // Sector fill
  const sectorPath = `M ${cx} ${cy} L ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y} Z`;

  // Label at midpoint of arc
  const midAngle = handADeg + normAngle / 2;
  const labelPt = degToPoint(midAngle, cx, cy, arcR * 0.65);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="16" fill="#E2E8F0" />

      {/* Trig circle (toggleable) */}
      {showCircle && (
        <>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Axes */}
          <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#94A3B8" strokeWidth="1" />
          <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#94A3B8" strokeWidth="1" />

          {/* Tick marks and labels */}
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
        </>
      )}

      {/* Hand A (blue) */}
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />
      <text
        x={ptA.x + (ptA.x >= cx ? labelOff : -labelOff)}
        y={ptA.y + (ptA.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#2563EB" textAnchor="middle"
      >A</text>

      {/* Hand O (red) */}
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
      <text
        x={ptO.x + (ptO.x >= cx ? labelOff : -labelOff)}
        y={ptO.y + (ptO.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="18" fontWeight="bold" fill="#DC2626" textAnchor="middle"
      >O</text>

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="5" fill="#1E293B" />


    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GlossaireAngleTest() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('0');
  const [angle, setAngle] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [rotationInput, setRotationInput] = useState('0');
  const [showCircle, setShowCircle] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((val: string) => {
    setInputValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setAngle(parsed);
    }
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setAngle(val);
    setInputValue(String(val));
  }, []);

  const handleRotationChange = useCallback((val: string) => {
    setRotationInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setRotation(parsed);
    }
  }, []);

  const handleRotationSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setRotation(val);
    setRotationInput(String(val));
  }, []);

  const randomizeRotation = useCallback(() => {
    const r = Math.floor(Math.random() * 36) * 10;
    setRotation(r);
    setRotationInput(String(r));
  }, []);

  const presets = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbfaf9] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-3xl font-bold">Glossaire Angles</CardTitle>
          <CardDescription className="text-base mt-1">
            Tapez un angle et visualisez-le
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Angle input */}
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="number"
              min={0}
              max={360}
              step={10}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const next = Math.min(360, angle + 10);
                  setAngle(next);
                  setInputValue(String(next));
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = Math.max(0, angle - 10);
                  setAngle(next);
                  setInputValue(String(next));
                }
              }}
              className="text-center text-2xl font-mono h-14 flex-1"
              placeholder="0 - 360"
            />
            <span className="text-2xl text-slate-400 font-bold">{'\u00B0'}</span>
          </div>

          {/* Angle slider */}
          <input
            type="range"
            min={0}
            max={360}
            step={10}
            value={((angle % 360) + 360) % 360}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          {/* Toggle circle + rotation controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={showCircle ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCircle(!showCircle)}
            >
              {showCircle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showCircle ? 'Masquer cercle' : 'Afficher cercle'}
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={randomizeRotation}
            >
              <RotateCcw className="h-4 w-4" /> Pivoter
            </Button>
          </div>

          {/* Rotation control */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#605a57] whitespace-nowrap">Rotation :</span>
            <input
              type="range"
              min={0}
              max={350}
              step={10}
              value={((rotation % 360) + 360) % 360}
              onChange={handleRotationSlider}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
            />
            <Input
              type="number"
              min={0}
              max={350}
              step={10}
              value={rotationInput}
              onChange={(e) => handleRotationChange(e.target.value)}
              className="w-16 text-center text-sm font-mono h-8 px-1"
            />
            <span className="text-sm text-slate-400">{'\u00B0'}</span>
          </div>

          {/* Visualizer */}
          <AngleVisualizer angle={angle} rotation={rotation} showCircle={showCircle} />

          {/* Preset buttons */}
          <div>
            <p className="text-xs text-[#605a57] mb-2 text-center">Angles remarquables</p>
            <div className="grid grid-cols-8 gap-1.5">
              {presets.map(a => (
                <button
                  key={a}
                  onClick={() => { setAngle(a); setInputValue(String(a)); }}
                  className={`text-xs font-mono py-1.5 px-1 rounded transition-colors ${
                    ((angle % 360) + 360) % 360 === a
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-[#605a57] hover:bg-slate-200'
                  }`}
                >
                  {a}{'\u00B0'}
                </button>
              ))}
            </div>
          </div>

          {/* Back button */}
          <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-5 w-5" /> Retour
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
