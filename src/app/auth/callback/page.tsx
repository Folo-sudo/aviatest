'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { mapAuthError } from '@/lib/auth/messages';
import { syncPseudoFromProfile } from '@/lib/account/profile';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
};

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const code = searchParams.get('code');
        const errorDescription =
          searchParams.get('error_description') || searchParams.get('error');

        if (errorDescription) {
          if (!cancelled) setError(mapAuthError(errorDescription));
          return;
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) setError(mapAuthError(exchangeError.message));
            return;
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            if (!cancelled) {
              setError('Session introuvable. Réessaie la connexion Google.');
            }
            return;
          }
        }

        await syncPseudoFromProfile();
        if (!cancelled) router.replace('/');
      } catch (err) {
        const message = err instanceof Error ? err.message : undefined;
        if (!cancelled) setError(mapAuthError(message));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: styles.background }}
    >
      <div className="max-w-md text-center space-y-3">
        {error ? (
          <>
            <h1 className="text-xl font-semibold" style={{ color: styles.text }}>
              Connexion interrompue
            </h1>
            <p className="text-sm" style={{ color: styles.textMuted }}>
              {error}
            </p>
            <button
              type="button"
              className="text-sm font-medium underline underline-offset-4"
              style={{ color: styles.text }}
              onClick={() => router.replace('/')}
            >
              Retour à l’accueil
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Connexion Google en cours…
          </p>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center"
          style={{ backgroundColor: styles.background }}
        >
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Connexion Google en cours…
          </p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
