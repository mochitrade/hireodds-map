import React, { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, setRememberMe } from '../supabaseClient';
import { writeAuthReturnTo, oauthRedirectTo } from '../lib/authReturnTo';
import { signOutAndRedirect } from '../lib/authSignOut';
import {
  loadNotifs,
  saveNotifs,
  upsertProfile,
  getProfile,
  leaderboard,
  userKarma,
  type MapNotif,
} from '../lib/mapSocial';
import { hydrateProfilesFromCloud } from '../lib/mapCloud';
import type { ScenePlace } from '../lib/sceneMap';

export function MapAuthChrome({ places }: { places: ScenePlace[] }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [menu, setMenu] = useState<'none' | 'notifs' | 'profile'>('none');
  const [notifs, setNotifs] = useState<MapNotif[]>(() =>
    typeof window === 'undefined' ? [] : loadNotifs(),
  );
  const [signingIn, setSigningIn] = useState(false);

  const user = session?.user ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
      if (data.session?.user) void ensureProfile(data.session.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next);
      if (next?.user) void ensureProfile(next.user);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function ensureProfile(u: User) {
    // Load cloud profile first so username/avatar survive new devices
    await hydrateProfilesFromCloud();
    const existing = getProfile(u.id);
    if (existing?.setupComplete && existing.username && existing.avatarUrl) {
      if (u.email && u.email !== existing.email) {
        upsertProfile({ ...existing, email: u.email });
      }
      return;
    }
    // Seed a local stub only — do not mark complete until setup modal
    upsertProfile({
      userId: u.id,
      displayName: existing?.displayName || '',
      username: existing?.username,
      email: u.email || '',
      avatarUrl:
        existing?.avatarUrl ||
        u.user_metadata?.avatar_url ||
        u.user_metadata?.picture,
      createdAt: existing?.createdAt || Date.now(),
      setupComplete: existing?.setupComplete === true,
    });
  }

  async function signInGoogle() {
    if (!isSupabaseConfigured) return;
    setSigningIn(true);
    setRememberMe(true);
    writeAuthReturnTo('/');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectTo('/') },
    });
    if (error) {
      setSigningIn(false);
      alert(error.message);
    }
  }

  const unread = useMemo(
    () => (user ? notifs.filter((n) => n.userId === user.id && !n.read).length : 0),
    [notifs, user],
  );

  const board = useMemo(() => leaderboard(places), [places]);
  const myRank = user ? board.find((r) => r.userId === user.id) : null;
  const myStats = user ? userKarma(user.id, places) : null;

  function openNotifs() {
    setMenu((m) => (m === 'notifs' ? 'none' : 'notifs'));
    if (!user) return;
    const next = notifs.map((n) => (n.userId === user.id ? { ...n, read: true } : n));
    setNotifs(next);
    saveNotifs(next);
  }

  if (!ready) return null;

  const profile = user ? getProfile(user.id) : null;
  const avatar =
    profile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    undefined;
  const name =
    profile?.username ||
    profile?.displayName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'You';

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[650] flex items-start gap-2 sm:right-5">
      {!user ? (
        <button
          type="button"
          onClick={() => void signInGoogle()}
          disabled={signingIn || !isSupabaseConfigured}
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full bg-[#ebe4da] px-4 text-[13px] font-medium text-[#161311] disabled:opacity-50"
        >
          <GoogleGlyph />
          {signingIn ? 'Redirecting…' : isSupabaseConfigured ? 'Sign in with Google' : 'Auth not configured'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={openNotifs}
            className="pointer-events-auto relative grid h-10 w-10 place-items-center rounded-full bg-[rgba(28,24,21,0.92)] text-[#ebe4da] ring-1 ring-[rgba(235,228,218,0.14)]"
            title="Notifications"
          >
            <BellIcon />
            {unread ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--map-orange,#e8843a)] px-1 text-[10px] font-semibold text-[#161311]">
                {unread}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setMenu((m) => (m === 'profile' ? 'none' : 'profile'))}
            className="pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-[rgba(28,24,21,0.92)] pl-1.5 pr-3 text-[#ebe4da] ring-1 ring-[rgba(235,228,218,0.14)]"
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e8843a] text-[11px] font-semibold text-[#161311]">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-[100px] truncate text-[12px] sm:inline">@{name}</span>
          </button>
        </>
      )}

      {menu === 'notifs' && user ? (
        <Panel onClose={() => setMenu('none')} title="Notifications">
          {notifs.filter((n) => n.userId === user.id).length === 0 ? (
            <p className="text-[13px] text-[rgba(235,228,218,0.5)]">No notifications yet.</p>
          ) : (
            <ul className="space-y-2">
              {notifs
                .filter((n) => n.userId === user.id)
                .slice(0, 20)
                .map((n) => (
                  <li key={n.id} className="rounded-xl bg-[#161311]/80 p-3 ring-1 ring-[rgba(235,228,218,0.08)]">
                    <div className="text-[13px] font-medium">{n.title}</div>
                    <div className="mt-0.5 text-[12px] text-[rgba(235,228,218,0.6)]">{n.body}</div>
                    <div className="mt-1 text-[10px] text-[rgba(235,228,218,0.35)]">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {menu === 'profile' && user ? (
        <Panel onClose={() => setMenu('none')} title="Profile">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e8843a] text-[20px] font-semibold text-[#161311]">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <div className="text-[18px]" style={{ fontFamily: 'var(--map-serif)' }}>
                @{name}
              </div>
              <div className="mt-1 text-[12px] text-[#e8843a]">
                Rank #{myRank?.rank ?? '—'} · {myStats?.karma ?? 0} karma
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Posts" value={myStats?.posts ?? 0} />
            <Stat label="Comments" value={myStats?.reviews ?? 0} />
            <Stat label="Upvotes" value={myStats?.upvotes ?? 0} />
          </div>

          <div className="mt-4 border-t border-[rgba(235,228,218,0.1)] pt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[rgba(235,228,218,0.45)]">
              Your pins
            </div>
            {myStats?.postsList.length ? (
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {myStats.postsList.map((p) => (
                  <li key={p.id} className="text-[13px]">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-[rgba(235,228,218,0.45)]"> · {p.votes} upvotes</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[rgba(235,228,218,0.45)]">No pins yet — drop one on the map.</p>
            )}
          </div>

          <div className="mt-4 border-t border-[rgba(235,228,218,0.1)] pt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[rgba(235,228,218,0.45)]">
              Leaderboard
            </div>
            <ul className="max-h-36 space-y-1.5 overflow-y-auto">
              {board.slice(0, 8).map((r) => (
                <li key={r.userId} className="flex items-center justify-between text-[12px]">
                  <span>
                    <span className="text-[rgba(235,228,218,0.4)]">#{r.rank}</span> {r.displayName}
                    {r.userId === user.id ? ' (you)' : ''}
                  </span>
                  <span className="text-[#e8843a]">{r.karma}</span>
                </li>
              ))}
              {!board.length ? (
                <li className="text-[12px] text-[rgba(235,228,218,0.45)]">Post to climb the ranks.</li>
              ) : null}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => void signOutAndRedirect('/')}
            className="mt-4 h-9 w-full rounded-full border border-[rgba(235,228,218,0.14)] text-[13px]"
          >
            Sign out
          </button>
        </Panel>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute right-0 top-12 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-[rgba(28,24,21,0.98)] text-[#ebe4da] shadow-2xl ring-1 ring-[rgba(235,228,218,0.12)]">
      <div className="flex items-center justify-between border-b border-[rgba(235,228,218,0.1)] px-4 py-3">
        <div className="text-[14px] font-medium">{title}</div>
        <button type="button" onClick={onClose} className="text-[18px] text-[rgba(235,228,218,0.45)]" aria-label="Close">
          ×
        </button>
      </div>
      <div className="max-h-[min(70dvh,520px)] overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#161311]/80 py-2 ring-1 ring-[rgba(235,228,218,0.08)]">
      <div className="text-[16px] font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-[rgba(235,228,218,0.45)]">{label}</div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1112 0c0 3.5 1.2 5 2 6H4c.8-1 2-2.5 2-6z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Expose session helper for MapPage gates */
export function useMapSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  return session;
}
