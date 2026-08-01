'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Search, User } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchMyProfile,
  searchPublicPseudos,
  setProgressionPublic,
  syncAllLocalProgressToCloud,
  syncPseudoFromProfile,
  type UserProfile,
} from '@/lib/account/profile';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

function CompteContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await syncPseudoFromProfile();
        const p = await fetchMyProfile();
        setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchPublicPseudos(query)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const togglePublic = async (next: boolean) => {
    if (!profile) return;
    setBusy(true);
    setMessage(null);
    try {
      await setProgressionPublic(next);
      if (next) {
        await syncAllLocalProgressToCloud();
      }
      setProfile({ ...profile, progression_public: next });
      setMessage(
        next
          ? 'Progression publique : les autres peuvent te rechercher.'
          : 'Progression privee.',
      );
    } catch {
      setMessage('Impossible de mettre a jour la confidentialite.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ backgroundColor: styles.background, color: styles.textMuted }}
      >
        Chargement...
      </div>
    );
  }

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
          <User className="h-5 w-5" style={{ color: styles.text }} />
          <h1 className="text-lg font-bold" style={{ color: styles.text }}>
            Compte
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-xl space-y-6">
        <section
          className="rounded-xl p-6 space-y-4"
          style={{
            backgroundColor: styles.cardBg,
            border: `1px solid ${styles.border}`,
            boxShadow: styles.shadow,
          }}
        >
          {!profile ? (
            <p className="text-sm text-red-500">Profil introuvable.</p>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: styles.textMuted }}>
                  Pseudo
                </p>
                <p className="text-lg font-semibold" style={{ color: styles.text }}>
                  {profile.username}
                </p>
                <p className="text-xs mt-1" style={{ color: styles.textMuted }}>
                  Unique et lie a ton email (un email = un pseudo).
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: styles.textMuted }}>
                  Email
                </p>
                <p className="text-sm" style={{ color: styles.text }}>
                  {profile.email || '—'}
                </p>
              </div>

              <div
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-3"
                style={{ backgroundColor: '#fbfaf9', border: `1px solid ${styles.border}` }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: styles.text }}>
                    Progression publique
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: styles.textMuted }}>
                    Si active, les autres peuvent voir ta progression via la recherche.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => togglePublic(!profile.progression_public)}
                  className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                  style={{
                    backgroundColor: profile.progression_public ? '#37322f' : '#e0dedb',
                  }}
                  aria-pressed={profile.progression_public}
                >
                  <span
                    className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform"
                    style={{
                      left: profile.progression_public ? '22px' : '2px',
                    }}
                  />
                </button>
              </div>

              {message && (
                <p className="text-sm" style={{ color: styles.textMuted }}>
                  {message}
                </p>
              )}

              <Link href="/progression">
                <Button
                  className="w-full"
                  style={{ backgroundColor: styles.text, color: styles.background }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" /> Ma progression
                </Button>
              </Link>
            </>
          )}
        </section>

        <section
          className="rounded-xl p-6 space-y-4"
          style={{
            backgroundColor: styles.cardBg,
            border: `1px solid ${styles.border}`,
            boxShadow: styles.shadow,
          }}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" style={{ color: styles.text }} />
            <h2 className="font-semibold" style={{ color: styles.text }}>
              Progression d&apos;un autre
            </h2>
          </div>
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Recherche un pseudo. Seules les progressions publiques sont listées ;
            un pseudo prive renvoie un message d&apos;indisponibilite.
          </p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pseudo..."
            maxLength={24}
          />
          {suggestions.length > 0 && (
            <ul className="rounded-lg border overflow-hidden" style={{ borderColor: styles.border }}>
              {suggestions.map((name) => (
                <li key={name}>
                  <Link
                    href={`/progression?pseudo=${encodeURIComponent(name)}`}
                    className="block px-3 py-2 text-sm hover:bg-[#f3f2f1]"
                    style={{ color: styles.text }}
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              if (!q) return;
              window.location.href = `/progression?pseudo=${encodeURIComponent(q)}`;
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={!query.trim()}
            >
              Voir la progression
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ComptePage() {
  return (
    <AuthGate>
      <CompteContent />
    </AuthGate>
  );
}
