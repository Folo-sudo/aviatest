/** Local guest browsing mode — no Supabase session, no progression saves. */

const GUEST_KEY = 'aviatest-guest';

export function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

export function enterGuestMode(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(GUEST_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearGuestMode(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}

/** Leave guest mode and reload so AuthGate shows the login screen. */
export function exitGuestToLogin(): void {
  clearGuestMode();
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}
