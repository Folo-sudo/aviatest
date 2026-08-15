/** Local guest browsing mode — no Supabase session, no progression saves. */

const GUEST_KEY = 'aviatest-guest';

/**
 * Persist across tabs: exercise links open in target=_blank, and
 * sessionStorage is per-tab (guest flag would be lost on each test).
 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isGuestMode(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    if (s.getItem(GUEST_KEY) === '1') return true;
    // Migrate legacy per-tab flag so an already-open guest session keeps working
    if (sessionStorage.getItem(GUEST_KEY) === '1') {
      s.setItem(GUEST_KEY, '1');
      sessionStorage.removeItem(GUEST_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function enterGuestMode(): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(GUEST_KEY, '1');
    // Drop legacy sessionStorage flag if present
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

export function clearGuestMode(): void {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
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
