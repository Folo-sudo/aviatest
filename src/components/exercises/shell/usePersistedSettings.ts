'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/** Load settings from localStorage without writing defaults on the first tick. */
export function usePersistedSettings<T extends object>(
  key: string,
  defaults: T,
): [T, Dispatch<SetStateAction<T>>] {
  const readyRef = useRef(false);
  const [settings, setSettings] = useState<T>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => {
      readyRef.current = true;
    }, 0);
    return () => window.clearTimeout(t);
    // defaults is a stable module-level object in callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!readyRef.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [key, settings]);

  return [settings, setSettings];
}
