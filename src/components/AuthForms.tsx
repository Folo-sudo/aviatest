'use client';

import { useState } from 'react';
import { Lock, Target, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  mapAuthError,
  normalizeUsername,
  validateUsername,
} from '@/lib/auth/messages';
import { syncPseudoFromProfile } from '@/lib/account/profile';

const styles = {
  colors: {
    background: '#fbfaf9',
    text: '#37322f',
    textMuted: '#605a57',
    border: '#e0dedb',
    cardBg: '#ffffff',
  },
  shadows: {
    card: '0 8px 24px rgba(55, 50, 47, 0.08)',
  },
};

type Mode = 'login' | 'signup';

export default function AuthForms({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) {
        setError(mapAuthError(oauthError.message));
        setBusy(false);
      }
      // On success the browser redirects away
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      if (message?.includes('Missing NEXT_PUBLIC_SUPABASE')) {
        setError(
          'Supabase n’est pas configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
      } else {
        setError(mapAuthError(message));
      }
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === 'signup') {
        const usernameError = validateUsername(username);
        if (usernameError) {
          setError(usernameError);
          return;
        }

        const displayUsername = username.trim();
        const { data: available, error: checkError } = await supabase.rpc(
          'is_username_available',
          { candidate: displayUsername },
        );

        if (checkError) {
          setError(mapAuthError(checkError.message));
          return;
        }
        if (available === false) {
          setError("Ce nom d’utilisateur est déjà pris");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: displayUsername,
              username_normalized: normalizeUsername(displayUsername),
            },
          },
        });

        if (signUpError) {
          setError(mapAuthError(signUpError.message));
          return;
        }

        if (!data.session || !data.user) {
          setError(
            'Compte créé. Confirme ton e-mail puis reconnecte-toi, ou désactive la confirmation e-mail dans Supabase.',
          );
          setMode('login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          setError("Ce nom d’utilisateur est déjà pris");
          return;
        }

        await syncPseudoFromProfile();
        onSuccess();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(mapAuthError(signInError.message));
        return;
      }

      await syncPseudoFromProfile();
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      if (message?.includes('Missing NEXT_PUBLIC_SUPABASE')) {
        setError(
          'Supabase n’est pas configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
      } else {
        setError(mapAuthError(message));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: styles.colors.background }}
    >
      <div
        className="w-full max-w-md mx-4 p-8 rounded-2xl"
        style={{
          backgroundColor: styles.colors.cardBg,
          border: `1px solid ${styles.colors.border}`,
          boxShadow: styles.shadows.card,
        }}
      >
        <div
          className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f0eeeb' }}
        >
          {mode === 'login' ? (
            <Lock className="h-7 w-7" style={{ color: styles.colors.text }} />
          ) : (
            <UserPlus className="h-7 w-7" style={{ color: styles.colors.text }} />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Target className="h-6 w-6" style={{ color: styles.colors.text }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: styles.colors.text }}
          >
            AviaTest
          </h1>
        </div>
        <p
          className="text-sm mb-6 text-center"
          style={{ color: styles.colors.textMuted }}
        >
          {mode === 'login'
            ? 'Connecte-toi pour accéder aux exercices'
            : 'Crée un compte pour commencer à t’entraîner'}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-60"
          style={{
            borderColor: styles.colors.border,
            backgroundColor: styles.colors.cardBg,
            color: styles.colors.text,
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z"
            />
            <path
              fill="#34A853"
              d="M5.3 14.3l-.8.6-2.2 1.7C3.8 19.3 7.6 22 12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-5.9-4.4z"
            />
            <path
              fill="#4A90E2"
              d="M3.1 7.4C2.4 8.8 2 10.3 2 12s.4 3.2 1.1 4.6l3.1-2.4C5.7 13.4 5.5 12.7 5.5 12s.2-1.4.6-2z"
            />
            <path
              fill="#FBBC05"
              d="M12 5.5c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.5 14.7 1.5 12 1.5 7.6 1.5 3.8 4.2 2.3 8.3l3.1 2.4C6.9 7.4 9.2 5.5 12 5.5z"
            />
          </svg>
          Continuer avec Google
        </button>

        {error && (
          <p className="mb-4 text-sm text-red-500 text-center">{error}</p>
        )}

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1" style={{ backgroundColor: styles.colors.border }} />
          <span className="text-xs" style={{ color: styles.colors.textMuted }}>
            ou
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: styles.colors.border }} />
        </div>

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-lg mb-6"
          style={{ backgroundColor: '#f0eeeb' }}
        >
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="rounded-md py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: mode === 'login' ? styles.colors.cardBg : 'transparent',
              color: styles.colors.text,
              boxShadow: mode === 'login' ? styles.shadows.card : 'none',
            }}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className="rounded-md py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: mode === 'signup' ? styles.colors.cardBg : 'transparent',
              color: styles.colors.text,
              boxShadow: mode === 'signup' ? styles.shadows.card : 'none',
            }}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: styles.colors.textMuted }}
              >
                Nom d’utilisateur
              </label>
              <Input
                type="text"
                placeholder="ex. Paul_AF"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                autoComplete="username"
                required
              />
              <p className="text-xs" style={{ color: styles.colors.textMuted }}>
                Unique, lié à ton e-mail. Sert aussi de pseudo (progression / Stadium).
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: styles.colors.textMuted }}
            >
              E-mail
            </label>
            <Input
              type="email"
              placeholder="toi@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: styles.colors.textMuted }}
            >
              Mot de passe
            </label>
            <Input
              type="password"
              placeholder={
                mode === 'signup' ? 'Au moins 12 caractères' : 'Ton mot de passe'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 12 : undefined}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={busy}
            style={{
              backgroundColor: styles.colors.text,
              color: styles.colors.background,
            }}
          >
            {busy
              ? 'Patiente…'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </Button>
        </form>
      </div>
    </main>
  );
}
