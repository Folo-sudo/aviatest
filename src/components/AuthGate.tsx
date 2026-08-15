'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import AuthForms from '@/components/AuthForms';
import UsernameSetup from '@/components/UsernameSetup';
import DuelInviteHost from '@/components/DuelInviteHost';
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from '@/lib/supabase/client';
import { fetchMyProfile } from '@/lib/account/profile';
import {
  clearGuestMode,
  enterGuestMode,
  isGuestMode,
} from '@/lib/auth/guest';

const styles = {
  background: '#fbfaf9',
  text: '#37322f',
  textMuted: '#605a57',
};

export default function AuthGate({
  children,
  requireAccount = false,
}: {
  children: ReactNode;
  /** If true, guests must log in (compte, progression, admin…). */
  requireAccount?: boolean;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [guest, setGuest] = useState(false);
  const [guestChecked, setGuestChecked] = useState(false);

  useEffect(() => {
    setGuest(isGuestMode());
    setGuestChecked(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConfigError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const refreshProfileGate = async (next: Session | null) => {
      if (!next) {
        if (!cancelled) {
          setNeedsUsername(false);
          setProfileLoading(false);
        }
        return;
      }
      // Real session wins over guest
      clearGuestMode();
      if (!cancelled) {
        setGuest(false);
        setProfileLoading(true);
      }
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        if (!profile) {
          await new Promise((r) => setTimeout(r, 400));
          const again = await fetchMyProfile();
          if (cancelled) return;
          setNeedsUsername(Boolean(again?.username_pending));
        } else {
          setNeedsUsername(Boolean(profile.username_pending));
        }
      } catch {
        if (!cancelled) setNeedsUsername(false);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
      void refreshProfileGate(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      void refreshProfileGate(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading || !guestChecked || (session && profileLoading)) {
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
            (voir supabase/env.example), puis exécute supabase/schema.sql dans
            le SQL Editor Supabase.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    if (guest && !requireAccount) {
      return <>{children}</>;
    }
    return (
      <AuthForms
        onSuccess={() => {
          /* session via onAuthStateChange */
        }}
        onContinueAsGuest={
          requireAccount
            ? undefined
            : () => {
                enterGuestMode();
                setGuest(true);
              }
        }
      />
    );
  }

  if (needsUsername) {
    return (
      <UsernameSetup
        onDone={() => {
          setNeedsUsername(false);
        }}
      />
    );
  }

  return (
    <>
      {children}
      <DuelInviteHost />
    </>
  );
}
