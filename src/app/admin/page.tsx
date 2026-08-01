'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL } from '@/lib/stadium/settingsKeys';
import {
  listBugsAdmin,
  listMissivesAdmin,
  type FeedbackRow,
} from '@/lib/feedback/api';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

function AdminContent() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<FeedbackRow[]>([]);
  const [missives, setMissives] = useState<FeedbackRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || user.email !== ADMIN_EMAIL) {
          router.replace('/');
          return;
        }
        setAllowed(true);
        const [b, m] = await Promise.all([listBugsAdmin(), listMissivesAdmin()]);
        setBugs(b);
        setMissives(m);
      } catch {
        setError('Chargement admin impossible.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ backgroundColor: styles.background, color: styles.textMuted }}
      >
        Verification...
      </div>
    );
  }

  if (!allowed) return null;

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
          <Inbox className="h-5 w-5" style={{ color: styles.text }} />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Boite admin
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: styles.text }}>
            Beugs ({bugs.length})
          </h2>
          <div className="space-y-3">
            {bugs.length === 0 && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                Aucun beug.
              </p>
            )}
            {bugs.map((b) => (
              <article
                key={b.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <p className="text-xs mb-2" style={{ color: styles.textMuted }}>
                  {b.email} · {new Date(b.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                  {b.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: styles.text }}>
            Missives ({missives.length})
          </h2>
          <div className="space-y-3">
            {missives.length === 0 && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                Aucune missive.
              </p>
            )}
            {missives.map((m) => (
              <article
                key={m.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: styles.cardBg,
                  border: `1px solid ${styles.border}`,
                  boxShadow: styles.shadow,
                }}
              >
                <p className="text-xs mb-2" style={{ color: styles.textMuted }}>
                  {m.email} · {new Date(m.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: styles.text }}>
                  {m.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminContent />
    </AuthGate>
  );
}
