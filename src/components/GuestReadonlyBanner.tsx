'use client';

import { Button } from '@/components/ui/button';
import { exitGuestToLogin, isGuestMode } from '@/lib/auth/guest';

/**
 * Banner for Stadium / Agora / Aeropostale when browsing as guest:
 * page is visible, all participation is blocked.
 */
export function GuestReadonlyBanner({
  context = 'cette zone',
}: {
  context?: string;
}) {
  if (!isGuestMode()) return null;

  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      style={{
        backgroundColor: '#fff7ed',
        borderColor: '#fed7aa',
        color: '#9a3412',
      }}
    >
      <p className="text-sm">
        Mode invité : tu peux consulter {context} (classements, missives…),
        mais aucune participation n&apos;est possible (jouer, voter, envoyer…).
      </p>
      <Button
        type="button"
        size="sm"
        onClick={exitGuestToLogin}
        style={{ backgroundColor: '#9a3412', color: '#fff7ed' }}
      >
        Se connecter
      </Button>
    </div>
  );
}

/** Soft-disable wrapper for interactive blocks in guest mode. */
export function GuestActionsLock({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (!isGuestMode()) return <>{children}</>;
  return (
    <div
      className={`relative ${className}`}
      aria-disabled="true"
    >
      <div className="pointer-events-none select-none opacity-45">{children}</div>
      <div className="absolute inset-0 z-10 cursor-not-allowed" aria-hidden />
    </div>
  );
}
