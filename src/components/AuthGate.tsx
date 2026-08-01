'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import AuthForms from '@/components/AuthForms';
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from '@/lib/supabase/client';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
};

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- env check after mount
      setConfigError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: styles.background }}
      >
        <p className="text-sm" style={{ color: styles.textMuted }}>
          Chargement...
        </p>
      </div>
    );
  }

  if (configError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: styles.background }}
      >
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold" style={{ color: styles.text }}>
            Configuration requise
          </h1>
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
            (voir supabase/env.example), puis execute supabase/schema.sql dans
            le SQL Editor Supabase.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthForms onSuccess={() => {/* session via onAuthStateChange */}} />;
  }

  return <>{children}</>;
}
