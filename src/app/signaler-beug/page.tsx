'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bug } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { getBugCount, submitBug } from '@/lib/feedback/api';

const LIMIT = 10;
const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

function SignalerBeugContent() {
  const [body, setBody] = useState('');
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getBugCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  const remaining = Math.max(0, LIMIT - count);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await submitBug(body);
      setBody('');
      setCount((c) => c + 1);
      setMessage('Beug envoye. Merci !');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'bug_limit_reached') setMessage('Limite de 10 beugs atteinte.');
      else if (msg === 'body_too_short') setMessage('Decris le beug (10 caracteres min).');
      else setMessage('Envoi impossible. Verifie Supabase (schema-stadium).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: styles.background }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: styles.background, borderColor: styles.border }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Accueil
            </Button>
          </Link>
          <Bug className="h-5 w-5" style={{ color: styles.text }} />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Signaler un beug
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div
          className="rounded-xl p-6 space-y-4"
          style={{
            backgroundColor: styles.cardBg,
            border: `1px solid ${styles.border}`,
            boxShadow: styles.shadow,
          }}
        >
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Decris le probleme (page, test, etapes). {remaining} signalement
            {remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''} (max {LIMIT}).
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <textarea
              className="w-full min-h-[160px] rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: styles.border, color: styles.text }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ex. Sur Attention 2, le compteur reste a 0 apres validation..."
              maxLength={4000}
              required
            />
            {message && (
              <p className={`text-sm ${message.includes('Merci') ? 'text-emerald-600' : 'text-red-500'}`}>
                {message}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || remaining <= 0 || body.trim().length < 10}
              className="w-full"
              style={{ backgroundColor: styles.text, color: styles.background }}
            >
              {busy ? 'Envoi...' : 'Envoyer le beug'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function SignalerBeugPage() {
  return (
    <AuthGate>
      <SignalerBeugContent />
    </AuthGate>
  );
}
