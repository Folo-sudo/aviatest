'use client';

import { useCallback, useEffect, useState } from 'react';
import { SITE_TEXT_DEFAULTS } from '@/lib/site-texts/defaults';
import { listSiteTexts } from '@/lib/site-texts/api';

export function useSiteTexts() {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listSiteTexts();
        if (cancelled) return;
        const map: Record<string, string> = {};
        rows.forEach((row) => {
          if (row.value.trim()) map[row.key] = row.value;
        });
        setOverrides(map);
      } catch {
        // Fallbacks only if schema not applied yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      if (overrides[key]) return overrides[key];
      if (fallback !== undefined) return fallback;
      return SITE_TEXT_DEFAULTS[key] ?? key;
    },
    [overrides],
  );

  return { t, loading, overrides };
}
