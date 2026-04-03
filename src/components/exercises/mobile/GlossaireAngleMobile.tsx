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
// SVG: Angle visualizer with A/O hands (responsive)
// ============================================================================

function AngleVisualizer({
  angle,
  rotation,
  showCircle,
}: {
  angle: number;
  rotation: number;
  showCircle: boolean;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const handLen = r * 0.92;
  const tickR = size * 0.40;
  const labelR = size * 0.46;
  const labelOff = size * 0.05;

  const majorAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  const normAngle = ((angle % 360) + 360) % 360;

  const handADeg = rotation;
  const handODeg = rotation + normAngle;

  const ptA = degToPoint(handADeg, cx, cy, handLen);
  const ptO = degToPoint(handODeg, cx, cy, handLen);

  const arcR = r * 0.55;
  const arcStart = degToPoint(handADeg, cx, cy, arcR);
  const arcEnd = degToPoint(handODeg, cx, cy, arcR);
  const largeArc = normAngle > 180 ? 1 : 0;
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`;
  const sectorPath = `M ${cx} ${cy} L ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y} Z`;

  const midAngle = handADeg + normAngle / 2;
  const labelPt = degToPoint(midAngle, cx, cy, arcR * 0.65);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      <rect x="0" y="0" width={size} height={size} rx="14" fill="#E2E8F0" />

      {showCircle && (
        <>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="#94A3B8" strokeWidth="1" />
          <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="#94A3B8" strokeWidth="1" />
          {majorAngles.map(deg => {
            const ti = degToPoint(deg, cx, cy, r - 3);
            const to = degToPoint(deg, cx, cy, tickR);
            const lp = degToPoint(deg, cx, cy, labelR);
            const major = deg % 90 === 0;
            return (
              <g key={deg}>
                <line x1={ti.x} y1={ti.y} x2={to.x} y2={to.y}
                  stroke={major ? '#475569' : '#94A3B8'} strokeWidth={major ? 2 : 1} />
                <text x={lp.x} y={lp.y + 4} fontSize={major ? '11' : '8'}
                  fontWeight={major ? 'bold' : 'normal'} fill="#475569" textAnchor="middle">
                  {deg}{'\u00B0'}
                </text>
              </g>
            );
          })}
        </>
      )}

      {normAngle > 0 && normAngle < 360 && (
        <path d={sectorPath} fill="rgba(37, 99, 235, 0.08)" />
      )}

      {normAngle > 0 && normAngle < 360 && (
        <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="5 3" />
      )}

      {/* Hand A (blue) */}
      <line x1={cx} y1={cy} x2={ptA.x} y2={ptA.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx={ptA.x} cy={ptA.y} r="4" fill="#2563EB" />
      <text
        x={ptA.x + (ptA.x >= cx ? labelOff : -labelOff)}
        y={ptA.y + (ptA.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle"
      >A</text>

      {/* Hand O (red) */}
      <line x1={cx} y1={cy} x2={ptO.x} y2={ptO.y} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx={ptO.x} cy={ptO.y} r="4" fill="#DC2626" />
      <text
        x={ptO.x + (ptO.x >= cx ? labelOff : -labelOff)}
        y={ptO.y + (ptO.y >= cy ? labelOff * 2.2 : -labelOff * 0.6)}
        fontSize="16" fontWeight="bold" fill="#DC2626" textAnchor="middle"
      >O</text>

      <circle cx={cx} cy={cy} r="4" fill="#1E293B" />

      {normAngle > 0 && normAngle < 360 && (
        <text x={labelPt.x} y={labelPt.y + 5} fontSize="15" fontWeight="bold" fill="#2563EB" textAnchor="middle">
          {normAngle}{'\u00B0'}
        </text>
      )}
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GlossaireAngleMobile() {
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
    if (!isNaN(parsed)) setAngle(parsed);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setAngle(val);
    setInputValue(String(val));
  }, []);

  const handleRotationSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setRotation(val);
    setRotationInput(String(val));
  }, []);

  const randomizeRotation = useCallback(() => {
    const r = Math.floor(Math.random() * 72) * 5;
    setRotation(r);
    setRotationInput(String(r));
  }, []);

  const presets = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
      <div className="max-w-md mx-auto pt-2">
        <Card>
          <CardHeader className="text-center pb-2 pt-4 px-4">
            <CardTitle className="text-xl font-bold">Glossaire Angles</CardTitle>
            <CardDescription className="text-xs mt-1">
              Tapez un angle et visualisez-le
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {/* Input */}
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                min={0}
                max={360}
                step={5}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="text-center text-xl font-mono h-12 flex-1"
                placeholder="0 - 360"
              />
              <span className="text-xl text-slate-400 font-bold">{'\u00B0'}</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={((angle % 360) + 360) % 360}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            {/* Toggle circle + random rotation */}
            <div className="flex items-center gap-2">
              <Button
                variant={showCircle ? 'default' : 'outline'}
                size="sm"
                className="gap-1 text-xs h-8"
                onClick={() => setShowCircle(!showCircle)}
              >
                {showCircle ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showCircle ? 'Masquer' : 'Afficher'}
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-8"
                onClick={randomizeRotation}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Pivoter
              </Button>
            </div>

            {/* Rotation slider */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Rot :</span>
              <input
                type="range"
                min={0}
                max={355}
                step={5}
                value={((rotation % 360) + 360) % 360}
                onChange={handleRotationSlider}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
              />
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={355}
                step={5}
                value={rotationInput}
                onChange={(e) => {
                  setRotationInput(e.target.value);
                  const p = parseFloat(e.target.value);
                  if (!isNaN(p)) setRotation(p);
                }}
                className="w-14 text-center text-xs font-mono h-7 px-1"
              />
              <span className="text-xs text-slate-400">{'\u00B0'}</span>
            </div>

            {/* Visualizer */}
            <AngleVisualizer angle={angle} rotation={rotation} showCircle={showCircle} />

            {/* Presets */}
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 text-center">Angles remarquables</p>
              <div className="grid grid-cols-8 gap-1">
                {presets.map(a => (
                  <button
                    key={a}
                    onClick={() => { setAngle(a); setInputValue(String(a)); }}
                    className={`text-[10px] font-mono py-1.5 rounded transition-colors ${
                      ((angle % 360) + 360) % 360 === a
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                    }`}
                  >
                    {a}{'\u00B0'}
                  </button>
                ))}
              </div>
            </div>

            {/* Back */}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
