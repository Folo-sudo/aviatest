'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONFIRM_WORD = 'SUPPRIMER';

type Props = {
  /** Short label on the trigger button */
  triggerLabel?: string;
  /** Dialog title */
  title: string;
  /** What will be deleted */
  description: string;
  /** Optional preview excerpt of the content */
  preview?: string;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
  className?: string;
};

/**
 * Multi-step admin delete to avoid miss-clicks:
 * 1) Open dialog
 * 2) Explicit "Continuer"
 * 3) Type SUPPRIMER then confirm
 */
export function AdminDangerConfirm({
  triggerLabel = 'Supprimer',
  title,
  description,
  preview,
  disabled,
  onConfirm,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  const close = (force = false) => {
    if (busy && !force) return;
    setOpen(false);
    setStep(1);
    setTyped('');
    setError(null);
  };

  const run = async () => {
    if (typed.trim().toUpperCase() !== CONFIRM_WORD) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setBusy(false);
      close(true);
    } catch {
      setError('Suppression impossible.');
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => {
          setOpen(true);
          setStep(1);
          setTyped('');
          setError(null);
        }}
        className={className || 'text-red-700 border-red-200 hover:bg-red-50'}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        {triggerLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(55, 50, 47, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) close();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl p-5 space-y-4 shadow-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e0dedb',
              color: '#37322f',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-danger-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
                  Etape {step}/2 · irreversible
                </p>
                <h2 id="admin-danger-title" className="text-base font-semibold mt-1">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                disabled={busy}
                onClick={() => close()}
                className="rounded-md p-1 text-[#605a57] hover:bg-[#f3f2f1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm" style={{ color: '#605a57' }}>
              {description}
            </p>

            {preview && (
              <blockquote
                className="text-sm whitespace-pre-wrap rounded-lg px-3 py-2 max-h-28 overflow-y-auto"
                style={{ backgroundColor: '#fbfaf9', border: '1px solid #e0dedb' }}
              >
                {preview.length > 280 ? `${preview.slice(0, 280)}…` : preview}
              </blockquote>
            )}

            {step === 1 && (
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <Button type="button" size="sm" variant="outline" onClick={() => close()}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="bg-red-700 hover:bg-red-800 text-white"
                >
                  Continuer
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 pt-1">
                <label className="block text-sm" style={{ color: '#605a57' }}>
                  Pour confirmer, tape{' '}
                  <code className="font-semibold text-red-700">{CONFIRM_WORD}</code> :
                </label>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={busy}
                  placeholder={CONFIRM_WORD}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: '#e0dedb', color: '#37322f' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void run();
                  }}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setStep(1);
                      setTyped('');
                      setError(null);
                    }}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}
                    onClick={() => void run()}
                    className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
                  >
                    {busy ? 'Suppression…' : 'Confirmer la suppression'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
