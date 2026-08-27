'use client';

import type { PointerEvent, ReactNode } from 'react';

export type PhoneDir = 'up' | 'down' | 'left' | 'right';

const DIR_TO_ARROW: Record<PhoneDir, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

function bindHold(onDown: () => void, onUp: () => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onDown();
    },
    onPointerUp: onUp,
    onPointerCancel: onUp,
  };
}

const padBtn =
  'flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold shadow-sm ring-1 transition select-none touch-none';

export function PhoneDpad({
  held,
  onHold,
}: {
  held: PhoneDir | null;
  onHold: (dir: PhoneDir | null) => void;
}) {
  const cell = (dir: PhoneDir, label: string) => (
    <button
      type="button"
      aria-label={label}
      className={`${padBtn} ${
        held === dir
          ? 'bg-[#37322f] text-white ring-[#37322f]'
          : 'bg-white text-[#37322f] ring-[#e0dedb]'
      }`}
      {...bindHold(
        () => onHold(dir),
        () => onHold(null),
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="grid w-[11.5rem] grid-cols-3 justify-items-center gap-1.5">
      <span />
      {cell('up', '↑')}
      <span />
      {cell('left', '←')}
      <span className="h-14 w-14" />
      {cell('right', '→')}
      <span />
      {cell('down', '↓')}
      <span />
    </div>
  );
}

export function phoneDirToArrowKey(dir: PhoneDir): string {
  return DIR_TO_ARROW[dir];
}

export function PhoneHoldButton({
  label,
  active,
  onHold,
  className = '',
}: {
  label: ReactNode;
  active?: boolean;
  onHold: (down: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${padBtn} ${
        active ? 'bg-[#37322f] text-white ring-[#37322f]' : 'bg-white text-[#37322f] ring-[#e0dedb]'
      } ${className}`}
      {...bindHold(
        () => onHold(true),
        () => onHold(false),
      )}
    >
      {label}
    </button>
  );
}

export function PhoneNumpad({
  onDigit,
  onBackspace,
  onSubmit,
  onMinus,
  submitLabel = 'Valider',
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onMinus?: () => void;
  submitLabel?: string;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
  const keyCls =
    'flex h-12 items-center justify-center rounded-xl bg-white text-lg font-semibold text-[#37322f] shadow-sm ring-1 ring-[#e0dedb]';

  return (
    <div className="mx-auto w-full max-w-xs space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button key={k} type="button" className={keyCls} onClick={() => onDigit(k)}>
            {k}
          </button>
        ))}
        {onMinus ? (
          <button type="button" className={keyCls} onClick={onMinus}>
            −
          </button>
        ) : (
          <span />
        )}
        <button type="button" className={keyCls} onClick={() => onDigit('0')}>
          0
        </button>
        <button type="button" className={keyCls} onClick={onBackspace} aria-label="Effacer">
          ⌫
        </button>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#37322f] text-base font-semibold text-white shadow-sm"
      >
        {submitLabel}
      </button>
    </div>
  );
}
