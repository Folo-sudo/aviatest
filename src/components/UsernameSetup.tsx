'use client';

import { useState } from 'react';
import { Target, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  mapAuthError,
  validateUsername,
} from '@/lib/auth/messages';
import { claimUsername } from '@/lib/account/profile';

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

export default function UsernameSetup({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        return;
      }

      const displayUsername = username.trim();
      const supabase = getSupabaseBrowserClient();
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

      await claimUsername(displayUsername);
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      setError(mapAuthError(message));
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
          <UserPlus className="h-7 w-7" style={{ color: styles.colors.text }} />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Target className="h-6 w-6" style={{ color: styles.colors.text }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: styles.colors.text }}
          >
            Choisis un pseudo
          </h1>
        </div>
        <p
          className="text-sm mb-6 text-center"
          style={{ color: styles.colors.textMuted }}
        >
          Pour la progression et le Stadium.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
            />
            <p className="text-xs" style={{ color: styles.colors.textMuted }}>
              Unique, de 3 à 24 caractères. Lettres, chiffres, _ et -.
            </p>
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
            {busy ? 'Patiente…' : 'Valider mon pseudo'}
          </Button>
        </form>
      </div>
    </main>
  );
}
