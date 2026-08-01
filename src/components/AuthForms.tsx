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
          setError('Ce nom d utilisateur est deja pris');
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
            'Compte cree. Confirme ton email puis reconnecte-toi, ou desactive la confirmation email dans Supabase.',
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
          setError('Ce nom d utilisateur est deja pris');
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
          'Supabase n est pas configure. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.',
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
            ? 'Connecte-toi pour acceder aux exercices'
            : 'Cree un compte pour commencer a t entrainer'}
        </p>

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
            Creer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: styles.colors.textMuted }}
              >
                Nom d utilisateur
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
                Unique, lie a ton email. Sert aussi de pseudo (progression / Stadium).
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: styles.colors.textMuted }}
            >
              Email
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
              placeholder="Au moins 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

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
              ? 'Patiente...'
              : mode === 'login'
                ? 'Se connecter'
                : 'Creer mon compte'}
          </Button>
        </form>
      </div>
    </main>
  );
}
