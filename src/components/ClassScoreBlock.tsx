'use client';

import { Badge } from '@/components/ui/badge';
import { CLASS_COLORS, scoreToClass } from '@/lib/core/classes';

export function ClassHistogram({ value }: { value: number }) {
  return (
    <div className="flex items-end justify-center gap-1 h-24" aria-hidden>
      {CLASS_COLORS.map((color, i) => {
        const cls = i + 1;
        return (
          <div
            key={cls}
            className="w-7 sm:w-8 rounded-t transition-opacity"
            style={{
              height: `${20 + cls * 8}px`,
              backgroundColor: color,
              opacity: cls === value ? 1 : 0.22,
            }}
            title={`Classe ${cls}`}
          />
        );
      })}
    </div>
  );
}

export function ClassScoreBlock({
  exerciseId,
  percent,
  detail,
}: {
  exerciseId: string;
  percent: number;
  detail?: string;
}) {
  const cls = scoreToClass(percent, exerciseId);
  const shown = Number.isInteger(percent) ? String(Math.round(percent)) : percent.toFixed(1);

  return (
    <div className="space-y-4 text-center">
      <Badge className="text-lg px-4 py-1">Classe {cls}</Badge>
      <ClassHistogram value={cls} />
      <div>
        <p className="text-5xl font-bold text-[#37322f]">{shown}%</p>
        {detail ? <p className="mt-1 text-[#605a57]">{detail}</p> : null}
      </div>
    </div>
  );
}
