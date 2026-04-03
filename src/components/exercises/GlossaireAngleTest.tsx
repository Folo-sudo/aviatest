'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Helpers
// ============================================================================

function degToPoint(deg: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// ============================================================================
// SVG: Interactive angle visualizer
// ============================================================================

function AngleVisualizer({ angle, size = 320 }: { angle: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const handLen = r * 0.92;
  const tickR = size * 0.40;
  const labelR = size * 0.46;

  const majorAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  // Normalize angle to 0-360
  const normAngle = ((angle % 360) + 360) % 360;

  const ptHand = degToPoint(normAngle, cx, cy, handLen);
  const ptRef = degToPoint(0, cx, cy, handLen);

  // Arc from 0 to angle
  const arcR = r * 0.55;
  const arcStart = degToPoint(0, cx, cy, arcR);
  const arcEnd = degToPoint(normAngle, cx, cy, arcR);
  const largeArc = normAngle > 180 ? 1 : 0;
  // sweep=0 means CCW in SVG (which is the positive trig direction)
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`;

  // Midpoint for label
  const midAngle = normAngle / 2;
  const labelPt = degToPoint(midAngle, cx, cy, arcR * 0.7);

  // Common trig values
  const rad = (normAngle * Math.PI) / 180;
  const cosVal = Math.cos(rad);
  const sinVal = Math.sin(rad);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        <rect x="0" y="0" width={size} height={size} rx="16" fill="#F8FAFC" />

        {/* Grid circle */}
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

        {/* Filled arc sector (light blue) */}
        {normAngle > 0 && normAngle < 360 && (
          <path
            d={`M ${cx} ${cy} L ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y} Z`}
            fill="rgba(37, 99, 235, 0.08)"
          />
        )}

        {/* Arc line */}
        {normAngle > 0 && normAngle < 360 && (
          <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="6 3" />
        )}

        {/* Reference hand at 0 degrees (grey) */}
        <line x1={cx} y1={cy} x2={ptRef.x} y2={ptRef.y} stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />

        {/* Angle hand (blue) */}
        <line x1={cx} y1={cy} x2={ptHand.x} y2={ptHand.y} stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
        <circle cx={ptHand.x} cy={ptHand.y} r="5" fill="#2563EB" />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="5" fill="#1E293B" />

        {/* Angle value label on arc */}
        {normAngle > 0 && normAngle < 360 && (
          <text x={labelPt.x} y={labelPt.y + 5} fontSize="16" fontWeight="bold" fill="#2563EB" textAnchor="middle">
            {normAngle}{'\u00B0'}
          </text>
        )}

        {/* cos/sin projections (dotted lines) */}
        {normAngle > 0 && normAngle < 360 && (
          <>
            {/* cos projection on x-axis */}
            <line x1={ptHand.x} y1={ptHand.y} x2={ptHand.x} y2={cy}
              stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            <line x1={cx} y1={cy} x2={ptHand.x} y2={cy}
              stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

            {/* sin projection on y-axis */}
            <line x1={ptHand.x} y1={ptHand.y} x2={cx} y2={ptHand.y}
              stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            <line x1={cx} y1={cy} x2={cx} y2={ptHand.y}
              stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>

      {/* Trig values */}
      <div className="flex gap-4 text-sm font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600">cos = <strong>{cosVal.toFixed(3)}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-600">sin = <strong>{sinVal.toFixed(3)}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GlossaireAngleTest() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('0');
  const [angle, setAngle] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

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

  // Quick-access angle buttons
  const presets = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-3xl font-bold">Glossaire Angles</CardTitle>
          <CardDescription className="text-base mt-1">
            Tapez un angle et visualisez-le sur le cercle trigo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Angle input */}
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="number"
              min={0}
              max={360}
              step={1}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const next = Math.min(360, angle + 5);
                  setAngle(next);
                  setInputValue(String(next));
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = Math.max(0, angle - 5);
                  setAngle(next);
                  setInputValue(String(next));
                }
              }}
              className="text-center text-2xl font-mono h-14 flex-1"
              placeholder="0 - 360"
            />
            <span className="text-2xl text-slate-400 font-bold">{'\u00B0'}</span>
          </div>

          {/* Slider */}
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={360}
            step={1}
            value={((angle % 360) + 360) % 360}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          {/* Visualizer */}
          <AngleVisualizer angle={angle} />

          {/* Preset buttons */}
          <div>
            <p className="text-xs text-slate-500 mb-2 text-center">Angles remarquables</p>
            <div className="grid grid-cols-8 gap-1.5">
              {presets.map(a => (
                <button
                  key={a}
                  onClick={() => { setAngle(a); setInputValue(String(a)); }}
                  className={`text-xs font-mono py-1.5 px-1 rounded transition-colors ${
                    ((angle % 360) + 360) % 360 === a
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
