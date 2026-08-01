/**
 * Freeze game timers during Stadium countdown so the test can pre-start
 * invisibly without burning the chrono, then resume seamlessly on reveal.
 */

let held = false;
let patched = false;

type TimerHandler = (...args: unknown[]) => void;

type DeferredTimeout = {
  id: number;
  handler: TimerHandler;
  args: unknown[];
  delay: number;
  createdAt: number;
};

let fakeId = 1_000_000_000;
const deferredTimeouts = new Map<number, DeferredTimeout>();
const deferredTimeoutNative = new Map<number, number>();
const deferredRafs = new Map<number, FrameRequestCallback>();

let origTimeout: typeof setTimeout =
  typeof window !== 'undefined'
    ? window.setTimeout.bind(window)
    : (((fn: TimerHandler) => 0) as unknown as typeof setTimeout);
let origClearTimeout: typeof clearTimeout =
  typeof window !== 'undefined'
    ? window.clearTimeout.bind(window)
    : (((_id?: number) => {}) as unknown as typeof clearTimeout);
let origRaf: typeof requestAnimationFrame =
  typeof window !== 'undefined'
    ? window.requestAnimationFrame.bind(window)
    : (((_cb: FrameRequestCallback) => 0) as unknown as typeof requestAnimationFrame);
let origCancelRaf: typeof cancelAnimationFrame =
  typeof window !== 'undefined'
    ? window.cancelAnimationFrame.bind(window)
    : (((_id: number) => {}) as unknown as typeof cancelAnimationFrame);

/** Always schedules on the real timer (ignores stadium hold). */
export function nativeSetTimeout(
  handler: TimerHandler,
  ms?: number,
): ReturnType<typeof setTimeout> {
  ensureStadiumTimerPatch();
  return origTimeout(handler, ms ?? 0) as ReturnType<typeof setTimeout>;
}

export function nativeClearTimeout(id: ReturnType<typeof setTimeout>): void {
  ensureStadiumTimerPatch();
  origClearTimeout(id);
}

export function isStadiumHeld(): boolean {
  return held;
}

export function setStadiumHold(value: boolean): void {
  ensureStadiumTimerPatch();
  const was = held;
  held = value;
  if (typeof document !== 'undefined') {
    if (value) document.documentElement.dataset.stadiumHold = '1';
    else delete document.documentElement.dataset.stadiumHold;
  }
  if (was && !value) {
    flushDeferred();
  }
}

function flushDeferred(): void {
  const timeouts = Array.from(deferredTimeouts.values());
  deferredTimeouts.clear();
  for (const entry of timeouts) {
    const elapsed = Date.now() - entry.createdAt;
    const remaining = Math.max(0, entry.delay - elapsed);
    const nativeId = origTimeout(() => {
      deferredTimeoutNative.delete(entry.id);
      if (!held) entry.handler(...entry.args);
    }, remaining) as unknown as number;
    deferredTimeoutNative.set(entry.id, nativeId);
  }

  const rafs = Array.from(deferredRafs.values());
  deferredRafs.clear();
  for (const cb of rafs) {
    origRaf(cb);
  }
}

export function ensureStadiumTimerPatch(): void {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const origInterval = window.setInterval.bind(window);
  origTimeout = window.setTimeout.bind(window);
  origClearTimeout = window.clearTimeout.bind(window);
  origRaf = window.requestAnimationFrame.bind(window);
  origCancelRaf = window.cancelAnimationFrame.bind(window);

  window.setInterval = ((handler: TimerHandler | string, ms?: number, ...args: unknown[]) => {
    if (typeof handler !== 'function') {
      return origInterval(handler, ms, ...args);
    }
    return origInterval(() => {
      if (held) return;
      handler(...args);
    }, ms);
  }) as typeof setInterval;

  window.setTimeout = ((handler: TimerHandler | string, ms?: number, ...args: unknown[]) => {
    if (typeof handler !== 'function') {
      return origTimeout(handler, ms, ...args);
    }
    const delay = ms ?? 0;
    if (!held) {
      return origTimeout(() => handler(...args), delay);
    }
    const id = fakeId++;
    deferredTimeouts.set(id, {
      id,
      handler,
      args,
      delay,
      createdAt: Date.now(),
    });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  window.clearTimeout = ((id?: number) => {
    if (id != null && deferredTimeouts.has(id)) {
      deferredTimeouts.delete(id);
      return;
    }
    if (id != null && deferredTimeoutNative.has(id)) {
      origClearTimeout(deferredTimeoutNative.get(id));
      deferredTimeoutNative.delete(id);
      return;
    }
    origClearTimeout(id);
  }) as typeof clearTimeout;

  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    if (!held) return origRaf(cb);
    const id = fakeId++;
    deferredRafs.set(id, cb);
    return id;
  }) as typeof requestAnimationFrame;

  window.cancelAnimationFrame = ((id: number) => {
    if (deferredRafs.has(id)) {
      deferredRafs.delete(id);
      return;
    }
    origCancelRaf(id);
  }) as typeof cancelAnimationFrame;
}
