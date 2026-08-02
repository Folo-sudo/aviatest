'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Search,
  User,
  UserPlus,
  Swords,
} from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { CrossedSwordsIcon } from '@/components/icons/CrossedSwordsIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchMyProfile,
  searchPublicPseudos,
  setProgressionVisibility,
  syncAllLocalProgressToCloud,
  syncPseudoFromProfile,
  type ProgressionVisibility,
  type UserProfile,
} from '@/lib/account/profile';
import {
  listFriendRequests,
  listFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  type Friend,
  type FriendRequest,
} from '@/lib/friends/api';
import {
  listMyDuels,
  rematchDuel,
  type Duel,
} from '@/lib/duels/api';
import { EXERCISES } from '@/lib/data/exercises';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
  cardBg: '#ffffff',
  shadow: '0 8px 24px rgba(55, 50, 47, 0.08)',
};

const VISIBILITY_OPTIONS: {
  value: ProgressionVisibility;
  label: string;
  hint: string;
}[] = [
  {
    value: 'public',
    label: 'Tout le monde',
    hint: 'N importe qui peut voir ta progression.',
  },
  {
    value: 'friends',
    label: 'Amis seulement',
    hint: 'Seuls tes amis acceptes peuvent la voir.',
  },
  {
    value: 'private',
    label: 'Personne',
    hint: 'Progression invisible pour les autres.',
  },
];

function exerciseTitle(id: string): string {
  return EXERCISES.find((e) => e.id === id)?.title || id;
}

function CompteContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [friendPseudo, setFriendPseudo] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  const reloadSocial = useCallback(async () => {
    const [f, r, d] = await Promise.all([
      listFriends(),
      listFriendRequests(),
      listMyDuels(),
    ]);
    setFriends(f);
    setRequests(r);
    setDuels(d);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await syncPseudoFromProfile();
        const p = await fetchMyProfile();
        setProfile(p);
        setMyId(p?.id ?? null);
        await reloadSocial();
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadSocial]);

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

  const setVisibility = async (next: ProgressionVisibility) => {
    if (!profile) return;
    setBusy(true);
    setMessage(null);
    try {
      await setProgressionVisibility(next);
      if (next === 'public' || next === 'friends') {
        await syncAllLocalProgressToCloud();
      }
      setProfile({
        ...profile,
        progression_visibility: next,
        progression_public: next === 'public',
      });
      setMessage('Confidentialite mise a jour.');
    } catch {
      setMessage('Impossible de mettre a jour la confidentialite.');
    } finally {
      setBusy(false);
    }
  };

  const onSendFriend = async () => {
    const pseudo = friendPseudo.trim();
    if (!pseudo) return;
    setBusy(true);
    setMessage(null);
    try {
      await sendFriendRequest(pseudo);
      setFriendPseudo('');
      setMessage('Demande envoyee.');
      await reloadSocial();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'not_found') setMessage('Pseudo introuvable.');
      else if (msg === 'cannot_friend_self') setMessage('Tu ne peux pas t ajouter toi-meme.');
      else if (msg === 'already_friends') setMessage('Deja amis.');
      else if (msg === 'already_pending') setMessage('Demande deja en cours.');
      else setMessage('Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  const onRematch = async (duelId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await rematchDuel(duelId);
      setMessage('Revanche proposee — en attente d acceptation.');
      await reloadSocial();
    } catch {
      setMessage('Revanche impossible (amis requis).');
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

  const incoming = requests.filter((r) => r.direction === 'incoming');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');
  const completedDuels = duels.filter((d) => d.status === 'completed');

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

              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: styles.text }}>
                  Visibilite de la progression
                </p>
                <div className="space-y-2">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={busy}
                      onClick={() => void setVisibility(opt.value)}
                      className="w-full text-left rounded-lg px-3 py-2.5 border transition-colors"
                      style={{
                        borderColor:
                          profile.progression_visibility === opt.value
                            ? styles.text
                            : styles.border,
                        backgroundColor:
                          profile.progression_visibility === opt.value
                            ? '#f3f2f1'
                            : styles.cardBg,
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: styles.text }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: styles.textMuted }}>
                        {opt.hint}
                      </p>
                    </button>
                  ))}
                </div>
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
            <UserPlus className="h-4 w-4" style={{ color: styles.text }} />
            <h2 className="font-semibold" style={{ color: styles.text }}>
              Amis
            </h2>
          </div>
          <div className="flex gap-2">
            <Input
              value={friendPseudo}
              onChange={(e) => setFriendPseudo(e.target.value)}
              placeholder="Pseudo a ajouter..."
              maxLength={24}
            />
            <Button
              type="button"
              disabled={busy || !friendPseudo.trim()}
              onClick={() => void onSendFriend()}
              style={{ backgroundColor: styles.text, color: styles.background }}
            >
              Inviter
            </Button>
          </div>

          {incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase" style={{ color: styles.textMuted }}>
                Demandes recues
              </p>
              {incoming.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: '#fbfaf9', border: `1px solid ${styles.border}` }}
                >
                  <span className="text-sm" style={{ color: styles.text }}>
                    {r.other_username}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void respondFriendRequest(r.id, true).then(reloadSocial)
                      }
                      style={{ backgroundColor: styles.text, color: styles.background }}
                    >
                      Accepter
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void respondFriendRequest(r.id, false).then(reloadSocial)
                      }
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase" style={{ color: styles.textMuted }}>
                Demandes envoyees
              </p>
              {outgoing.map((r) => (
                <p key={r.id} className="text-sm" style={{ color: styles.textMuted }}>
                  {r.other_username} — en attente
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase" style={{ color: styles.textMuted }}>
              Mes amis ({friends.length})
            </p>
            {friends.length === 0 && (
              <p className="text-sm" style={{ color: styles.textMuted }}>
                Aucun ami pour le moment.
              </p>
            )}
            {friends.map((f) => (
              <div
                key={f.user_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: '#fbfaf9', border: `1px solid ${styles.border}` }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: styles.text }}>
                    {f.username}
                  </p>
                  <p className="text-xs" style={{ color: styles.textMuted }}>
                    {f.in_exercise ? 'En train de faire un test' : 'Disponible'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className="text-red-700 border-red-200"
                  onClick={() =>
                    void removeFriend(f.user_id).then(reloadSocial)
                  }
                >
                  Retirer
                </Button>
              </div>
            ))}
          </div>
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
            <CrossedSwordsIcon size={20} />
            <h2 className="font-semibold" style={{ color: styles.text }}>
              Duels
            </h2>
          </div>
          <p className="text-sm" style={{ color: styles.textMuted }}>
            Victoires :{' '}
            <span className="font-semibold" style={{ color: styles.text }}>
              {profile?.duel_wins ?? 0}
            </span>
            {' · '}
            <Link href="/stadium?tab=duels" className="underline">
              Stadium Duels
            </Link>
          </p>

          {completedDuels.length === 0 && (
            <p className="text-sm" style={{ color: styles.textMuted }}>
              Aucun duel termine.
            </p>
          )}

          <div className="space-y-3">
            {completedDuels.map((d) => {
              const otherName =
                myId === d.challenger_id
                  ? d.opponent_username
                  : d.challenger_username;
              const myScore =
                myId === d.challenger_id ? d.challenger_score : d.opponent_score;
              const theirScore =
                myId === d.challenger_id ? d.opponent_score : d.challenger_score;
              const result =
                !d.winner_id
                  ? 'Match nul'
                  : d.winner_id === myId
                    ? 'Victoire'
                    : 'Defaite';
              return (
                <article
                  key={d.id}
                  className="rounded-lg px-3 py-3 space-y-2"
                  style={{ backgroundColor: '#fbfaf9', border: `1px solid ${styles.border}` }}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: styles.text }}>
                      vs {otherName || '—'} · {exerciseTitle(d.exercise_id)}
                    </p>
                    <span className="text-xs font-semibold" style={{ color: styles.textMuted }}>
                      {result}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: styles.textMuted }}>
                    Toi {myScore?.score_pct ?? '—'}% · Adversaire{' '}
                    {theirScore?.score_pct ?? '—'}%
                    {d.completed_at
                      ? ` · ${new Date(d.completed_at).toLocaleString('fr-FR')}`
                      : ''}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: styles.textMuted }}>
                    Reglages : {d.settings_hash.slice(0, 12)}…
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onRematch(d.id)}
                  >
                    <Swords className="h-3.5 w-3.5 mr-1" />
                    Revanche
                  </Button>
                </article>
              );
            })}
          </div>
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
            Recherche un pseudo (public ou ami selon sa confidentialite).
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
