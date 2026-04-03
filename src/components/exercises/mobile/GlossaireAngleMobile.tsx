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
// SVG: Angle visualizer (responsive)
// ============================================================================

function AngleVisualizer({ angle }: { angle: number }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const handLen = r * 0.92;
  const tickR = size * 0.40;
  const labelR = size * 0.46;

  const majorAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  const normAngle = ((angle % 360) + 360) % 360;

  const ptHand = degToPoint(normAngle, cx, cy, handLen);
  const ptRef = degToPoint(0, cx, cy, handLen);

  const arcR = r * 0.55;
  const arcStart = degToPoint(0, cx, cy, arcR);
  const arcEnd = degToPoint(normAngle, cx, cy, arcR);
  const largeArc = normAngle > 180 ? 1 : 0;
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`;

  const midAngle = normAngle / 2;
  const labelPt = degToPoint(midAngle, cx, cy, arcR * 0.7);

  const rad = (normAngle * Math.PI) / 180;
  const cosVal = Math.cos(rad);
  const sinVal = Math.sin(rad);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
        <rect x="0" y="0" width={size} height={size} rx="14" fill="#F8FAFC" />

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

        {normAngle > 0 && normAngle < 360 && (
          <path
            d={`M ${cx} ${cy} L ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y} Z`}
            fill="rgba(37, 99, 235, 0.08)"
          />
        )}

        {normAngle > 0 && normAngle < 360 && (
          <path d={arcPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="5 3" />
        )}

        <line x1={cx} y1={cy} x2={ptRef.x} y2={ptRef.y} stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />

        <line x1={cx} y1={cy} x2={ptHand.x} y2={ptHand.y} stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
        <circle cx={ptHand.x} cy={ptHand.y} r="5" fill="#2563EB" />

        <circle cx={cx} cy={cy} r="4" fill="#1E293B" />

        {normAngle > 0 && normAngle < 360 && (
          <text x={labelPt.x} y={labelPt.y + 5} fontSize="15" fontWeight="bold" fill="#2563EB" textAnchor="middle">
            {normAngle}{'\u00B0'}
          </text>
        )}

        {normAngle > 0 && normAngle < 360 && (
          <>
            <line x1={ptHand.x} y1={ptHand.y} x2={ptHand.x} y2={cy}
              stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            <line x1={cx} y1={cy} x2={ptHand.x} y2={cy}
              stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <line x1={ptHand.x} y1={ptHand.y} x2={cx} y2={ptHand.y}
              stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
            <line x1={cx} y1={cy} x2={cx} y2={ptHand.y}
              stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>

      <div className="flex gap-4 text-xs font-mono">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-600">cos = <strong>{cosVal.toFixed(3)}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600">sin = <strong>{sinVal.toFixed(3)}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GlossaireAngleMobile() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('0');
  const [angle, setAngle] = useState(0);
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

  const presets = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

  return (
    <div className="min-h-screen p-3" style={{ backgroundColor: '#fbfaf9' }}>
      <div className="max-w-md mx-auto pt-2">
        <Card>
          <CardHeader className="text-center pb-2 pt-4 px-4">
            <CardTitle className="text-xl font-bold">Glossaire Angles</CardTitle>
            <CardDescription className="text-xs mt-1">
              Tapez un angle et visualisez-le sur le cercle trigo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {/* Input */}
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                min={0}
                max={360}
                step={1}
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
              step={1}
              value={((angle % 360) + 360) % 360}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            {/* Visualizer */}
            <AngleVisualizer angle={angle} />

            {/* Preset buttons */}
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
