import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, setRememberMe, supabase } from '../supabaseClient';
import { writeAuthReturnTo, oauthRedirectTo } from '../lib/authReturnTo';
import { signOutAndRedirect } from '../lib/authSignOut';
import {
  loadNotifs,
  saveNotifs,
  leaderboard,
  userKarma,
  type MapNotif,
} from '../lib/mapSocial';
import type { SceneDef, ScenePlace } from '../lib/sceneMap';
import { sceneCount } from '../lib/sceneMap';
import { getProfile } from '../lib/mapSocial';
import { MapPlaceDetail } from './MapPlaceCard';

type SheetSnap = 'peek' | 'mid' | 'full';

const SNAP: Record<SheetSnap, number> = {
  /** Handle + search row — flush to bottom edge */
  peek: 68,
  mid: 0.5,
  full: 0.9,
};

/** Half-card height when a place is open (Apple Maps–style) */
const PLACE_MID = 0.5;
const PLACE_FULL = 0.9;
const PLACE_MIN = 0.28;

function safeAreaBottom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return px;
}

function snapPx(snap: SheetSnap, vh: number) {
  const v = SNAP[snap];
  if (v < 2) return Math.round(vh * v);
  // Peek content height + home indicator (CSS padding uses the same inset)
  if (snap === 'peek') return v + Math.round(safeAreaBottom());
  return v;
}

function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

export function MapMobileWeather({
  lat,
  lng,
  zoom,
  visible,
}: {
  lat: number;
  lng: number;
  zoom: number;
  visible: boolean;
}) {
  const [temp, setTemp] = useState<number | null>(null);
  const [isDay, setIsDay] = useState(true);
  const lastKey = useRef('');

  useEffect(() => {
    if (!visible || zoom < 14) return;
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (key === lastKey.current && temp !== null) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
            `&current=temperature_2m,is_day&temperature_unit=fahrenheit`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data = (await res.json()) as {
            current?: { temperature_2m?: number; is_day?: number };
          };
          if (cancelled || !data.current) return;
          lastKey.current = key;
          setTemp(Math.round(data.current.temperature_2m ?? 0));
          setIsDay((data.current.is_day ?? 1) === 1);
        } catch {
          /* ignore */
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [lat, lng, zoom, visible, temp]);

  if (!visible || zoom < 14 || temp === null) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[560] lg:hidden">
      <div className="rounded-2xl bg-[rgba(28,24,21,0.72)] px-3 py-2 backdrop-blur-md ring-1 ring-[rgba(235,228,218,0.1)]">
        <div className="text-[11px] font-medium tracking-wide text-[rgba(235,228,218,0.55)]">
          {isDay ? 'Daytime' : 'Nighttime'}
        </div>
        <div className="text-[28px] leading-none tracking-tight text-[#ebe4da]" style={{ fontFamily: 'var(--map-serif)' }}>
          {temp}°
        </div>
      </div>
    </div>
  );
}

export function MapMobileSheet({
  places,
  scenes,
  ranked,
  activeScene,
  onScene,
  onSelectPlace,
  onNewScene,
  user,
  hidden,
  selected,
  selectedScene,
  onClosePlace,
  onVote,
  onUpdatePlace,
}: {
  places: ScenePlace[];
  scenes: SceneDef[];
  ranked: SceneDef[];
  activeScene: string | 'all';
  onScene: (id: string | 'all') => void;
  onSelectPlace: (id: string) => void;
  onNewScene: () => void;
  user: User | null;
  hidden?: boolean;
  selected?: ScenePlace | null;
  selectedScene?: SceneDef | null;
  onClosePlace?: () => void;
  onVote?: (delta: number) => void;
  onUpdatePlace?: (next: ScenePlace) => void;
}) {
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [dragY, setDragY] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<'browse' | 'profile' | 'notifs'>('browse');
  const [signingIn, setSigningIn] = useState(false);
  const [notifs, setNotifs] = useState<MapNotif[]>(() =>
    typeof window === 'undefined' ? [] : loadNotifs(),
  );
  const startY = useRef(0);
  const startH = useRef(0);
  const dragging = useRef(false);
  const dragH = useRef(0);
  const didMove = useRef(false);
  const velocity = useRef(0);
  const lastSample = useRef({ t: 0, h: 0 });
  const lastSnapHaptic = useRef<SheetSnap>('peek');
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const placeMode = Boolean(selected && selectedScene);

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const placeMidPx = Math.round(vh * PLACE_MID);
  const placeFullPx = Math.round(vh * PLACE_FULL);
  const placeMinPx = Math.round(vh * PLACE_MIN);

  const baseH = placeMode
    ? snap === 'full'
      ? placeFullPx
      : placeMidPx
    : snapPx(snap, vh);
  const height = dragY !== null ? dragY : baseH;
  const placeFade =
    placeMode && (dragY !== null ? dragY < vh * 0.78 : snap !== 'full');

  const board = leaderboard(places);
  const myStats = user ? userKarma(user.id, places) : null;
  const myRank = user ? board.find((r) => r.userId === user.id) : null;
  const unread = user ? notifs.filter((n) => n.userId === user.id && !n.read).length : 0;

  const sheetProf = user ? getProfile(user.id) : null;
  const avatar =
    sheetProf?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    undefined;
  const name =
    sheetProf?.username ||
    sheetProf?.displayName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'You';

  const q = query.trim().toLowerCase();
  const results = q
    ? places
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q) ||
            (scenes.find((s) => s.id === p.scene)?.label || '').toLowerCase().includes(q),
        )
        .slice(0, 24)
    : [];

  /**
   * Half drag → mid; one continuous fling / deep pull → full.
   * Matches Apple Maps: distance + velocity decide the stop.
   */
  function resolveSnap(h: number, fromH: number): SheetSnap | 'dismiss' {
    const v = velocity.current; // px/ms, positive = expanding
    const flingUp = v > 1.1;
    const flingDown = v < -1.1;
    const goingUp = h > fromH + 20 || flingUp;
    const goingDown = h < fromH - 20 || flingDown;

    if (placeMode) {
      if (goingDown && (h < (placeMinPx + placeMidPx) / 2 || flingDown)) return 'dismiss';
      if (goingUp) {
        if (flingUp || h > (placeMidPx + placeFullPx) / 2) return 'full';
        return fromH >= placeMidPx - 8 ? 'full' : 'mid';
      }
      if (goingDown) return 'mid';
      return Math.abs(placeFullPx - h) < Math.abs(placeMidPx - h) ? 'full' : 'mid';
    }

    const peekH = snapPx('peek', vh);
    const midH = snapPx('mid', vh);
    const fullH = snapPx('full', vh);
    const range = fullH - peekH;
    const progress = Math.max(0, Math.min(1, (h - peekH) / range));

    if (goingUp) {
      // Already at mid → continue to full; from peek, deep/fast → full else mid
      if (fromH >= midH - 12) return 'full';
      if (flingUp || progress >= 0.68) return 'full';
      if (progress >= 0.22 || h >= midH - 48) return 'mid';
      return 'peek';
    }
    if (goingDown) {
      if (flingDown && fromH > midH) return 'mid';
      if (flingDown && fromH <= midH + 20) return 'peek';
      if (h < (peekH + midH) / 2) return 'peek';
      if (h < (midH + fullH) / 2) return 'mid';
      return 'full';
    }

    const opts: { s: SheetSnap; y: number }[] = [
      { s: 'peek', y: peekH },
      { s: 'mid', y: midH },
      { s: 'full', y: fullH },
    ];
    let best: SheetSnap = 'peek';
    let bestD = Infinity;
    for (const o of opts) {
      const d = Math.abs(o.y - h);
      if (d < bestD) {
        bestD = d;
        best = o.s;
      }
    }
    return best;
  }

  function setSnapWithHaptic(next: SheetSnap) {
    if (next !== lastSnapHaptic.current) {
      haptic(next === 'peek' ? 8 : 14);
      lastSnapHaptic.current = next;
    }
    setSnap(next);
  }

  function beginDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, button, a, select, label')) return;
    dragging.current = true;
    didMove.current = false;
    velocity.current = 0;
    startY.current = e.clientY;
    startH.current = height;
    dragH.current = height;
    lastSample.current = { t: performance.now(), h: height };
    setDragY(height);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onDragMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dy = startY.current - e.clientY;
    if (Math.abs(dy) > 4) didMove.current = true;
    e.preventDefault();
    const minH = placeMode ? placeMinPx : snapPx('peek', vh);
    const maxH = placeMode ? placeFullPx : snapPx('full', vh);
    const next = Math.min(maxH, Math.max(minH, startH.current + dy));
    const now = performance.now();
    const dt = now - lastSample.current.t;
    if (dt > 8) {
      velocity.current = (next - lastSample.current.h) / dt;
      lastSample.current = { t: now, h: next };
    }
    dragH.current = next;
    setDragY(next);
  }

  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    const moved = didMove.current;
    const h = dragH.current;
    const fromH = startH.current;
    if (!moved) {
      setDragY(null);
      return;
    }
    const next = resolveSnap(h, fromH);
    if (next === 'dismiss') {
      haptic(12);
      lastSnapHaptic.current = 'peek';
      setSnap('peek');
      setDragY(null);
      onClosePlace?.();
      setPanel('browse');
      return;
    }
    // Commit snap before clearing drag height so it doesn't flash back to peek
    lastSnapHaptic.current = next;
    haptic(14);
    setSnap(next);
    setDragY(null);
    if (next === 'peek') setPanel('browse');
  }

  function onHandleTap() {
    if (didMove.current) return;
    if (placeMode) {
      setSnapWithHaptic(snap === 'full' ? 'mid' : 'full');
      return;
    }
    if (snap === 'peek') setSnapWithHaptic('mid');
    else if (snap === 'mid') setSnapWithHaptic('full');
    else setSnapWithHaptic('peek');
  }

  // Tap a pin → rise to halfway with place details
  useEffect(() => {
    if (!selected) return;
    setPanel('browse');
    setQuery('');
    setDragY(null);
    haptic(14);
    setSnap('mid');
    lastSnapHaptic.current = 'mid';
  }, [selected?.id]);

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

  function openProfile() {
    haptic(10);
    if (!user) {
      void signInGoogle();
      return;
    }
    setPanel('profile');
    setSnapWithHaptic('mid');
  }

  function openNotifs() {
    haptic(10);
    if (user) {
      const next = loadNotifs().map((n) => (n.userId === user.id ? { ...n, read: true } : n));
      setNotifs(next);
      saveNotifs(next);
    } else {
      setNotifs(loadNotifs());
    }
    setPanel('notifs');
    setSnapWithHaptic('mid');
  }

  useEffect(() => {
    if (hidden) {
      setSnap('peek');
      setDragY(null);
      setPanel('browse');
    }
  }, [hidden]);

  // Closing a place → return to search peek (only when selection clears)
  const prevSelected = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = selected?.id ?? null;
    if (prevSelected.current !== undefined && prevSelected.current && !id) {
      setSnap('peek');
      lastSnapHaptic.current = 'peek';
      setDragY(null);
      setPanel('browse');
    }
    prevSelected.current = id;
  }, [selected?.id]);

  if (hidden) return null;

  const mapProf = user ? getProfile(user.id) : null;
  const author = user
    ? {
        id: user.id,
        name:
          mapProf?.username ||
          mapProf?.displayName ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Mapper',
      }
    : null;

  return (
    <div
      ref={sheetRef}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[620] lg:hidden"
      style={{
        height,
        transition: dragY === null ? 'height 280ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
      }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-t-[22px] bg-[rgba(28,24,21,0.96)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] ring-1 ring-[rgba(235,228,218,0.1)] backdrop-blur-xl">
        {/* Drag handle — primary pull gesture (Apple Maps–style) */}
        <div
          className="flex shrink-0 touch-none flex-col items-center pb-1 pt-1.5"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => beginDrag(e)}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={onHandleTap}
        >
          <div className="h-[4px] w-9 rounded-full bg-[rgba(235,228,218,0.32)]" />
        </div>

        {placeMode && selected && selectedScene ? (
          <div
            className="flex shrink-0 touch-none items-start justify-between gap-3 px-4 pb-1 pt-1"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => beginDrag(e)}
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: selectedScene.color }}>
                {selectedScene.label}
              </div>
              <h2
                className="truncate text-[22px] leading-tight text-[#ebe4da]"
                style={{ fontFamily: 'var(--map-serif)' }}
              >
                {selected.title}
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-[rgba(235,228,218,0.5)]">
                {selected.city}
                {selected.votes ? ` · ${selected.votes} upvotes` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic(8);
                onClosePlace?.();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#161311] text-[18px] text-[rgba(235,228,218,0.65)] ring-1 ring-[rgba(235,228,218,0.12)]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ) : (
          <div
            className="flex shrink-0 items-center gap-2.5 px-3 pt-0.5"
            style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#161311] px-3.5 ring-1 ring-[rgba(235,228,218,0.1)]">
              <SearchIcon />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (snap === 'peek') setSnapWithHaptic('mid');
                  setPanel('browse');
                }}
                onFocus={() => {
                  if (snap === 'peek') setSnapWithHaptic('mid');
                  setPanel('browse');
                }}
                placeholder="Search places & scenes"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[rgba(235,228,218,0.35)]"
              />
              {query ? (
                <button
                  type="button"
                  className="text-[12px] text-[rgba(235,228,218,0.45)]"
                  onClick={() => setQuery('')}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {user ? (
              <button
                type="button"
                onClick={openNotifs}
                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#161311] ring-1 ring-[rgba(235,228,218,0.1)]"
                aria-label="Notifications"
              >
                <BellIcon />
                {unread ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--map-orange)] px-1 text-[10px] font-semibold text-[#161311]">
                    {unread}
                  </span>
                ) : null}
              </button>
            ) : null}

            <button
              type="button"
              onClick={openProfile}
              disabled={signingIn}
              className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#161311] ring-1 ring-[rgba(235,228,218,0.1)]"
              aria-label={user ? 'Profile' : 'Sign in'}
            >
              {user ? (
                avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-[#e8843a] text-[13px] font-semibold text-[#161311]">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )
              ) : (
                <PersonIcon />
              )}
            </button>
          </div>
        )}

        {placeMode && selected && selectedScene && onVote && onUpdatePlace ? (
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <MapPlaceDetail
                place={selected}
                scene={selectedScene}
                onVote={onVote}
                onUpdate={onUpdatePlace}
                author={author}
                embedded
              />
            </div>
            {placeFade ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
                style={{
                  background:
                    'linear-gradient(to top, rgba(28,24,21,0.98) 10%, rgba(28,24,21,0.55) 55%, transparent)',
                }}
              />
            ) : null}
          </div>
        ) : snap !== 'peek' || dragY !== null ? (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {panel === 'browse' ? (
              <>
                {q ? (
                  <div className="space-y-1 pb-4">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[rgba(235,228,218,0.4)]">
                      Results
                    </div>
                    {results.length ? (
                      results.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            haptic(8);
                            onSelectPlace(p.id);
                          }}
                          className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[rgba(235,228,218,0.05)]"
                        >
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: scenes.find((s) => s.id === p.scene)?.color || '#e8843a',
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block text-[15px] font-medium">{p.title}</span>
                            <span className="block text-[12px] text-[rgba(235,228,218,0.45)]">
                              {p.city} · {p.votes} upvotes
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-[13px] text-[rgba(235,228,218,0.45)]">No matches.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[rgba(235,228,218,0.4)]">
                      Scenes
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Chip
                        active={activeScene === 'all'}
                        label={`All (${places.length})`}
                        onClick={() => {
                          haptic(8);
                          onScene('all');
                        }}
                      />
                      {ranked.map((s) => (
                        <Chip
                          key={s.id}
                          active={activeScene === s.id}
                          color={s.color}
                          label={`${s.label} (${sceneCount(places, s.id)})`}
                          onClick={() => {
                            haptic(8);
                            onScene(s.id);
                            setSnapWithHaptic('peek');
                          }}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          haptic(8);
                          onNewScene();
                        }}
                        className="rounded-full px-3 py-1.5 text-[12px] ring-1 ring-[rgba(232,132,58,0.4)]"
                      >
                        + Scene
                      </button>
                    </div>

                    <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[rgba(235,228,218,0.4)]">
                      Nearby buzz
                    </div>
                    <ul className="space-y-1">
                      {[...places]
                        .sort((a, b) => b.votes - a.votes)
                        .slice(0, 12)
                        .map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                haptic(8);
                                onSelectPlace(p.id);
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left hover:bg-[rgba(235,228,218,0.05)]"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[14px] font-medium">{p.title}</span>
                                <span className="text-[11px] text-[rgba(235,228,218,0.4)]">{p.city}</span>
                              </span>
                              <span className="text-[12px] text-[#e8843a]">{p.votes}</span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </>
            ) : null}

            {panel === 'profile' && user ? (
              <div>
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
                  <MiniStat label="Posts" value={myStats?.posts ?? 0} />
                  <MiniStat label="Comments" value={myStats?.reviews ?? 0} />
                  <MiniStat label="Upvotes" value={myStats?.upvotes ?? 0} />
                </div>
                <button
                  type="button"
                  onClick={() => void signOutAndRedirect('/')}
                  className="mt-5 h-10 w-full rounded-full border border-[rgba(235,228,218,0.14)] text-[13px]"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('browse')}
                  className="mt-2 h-9 w-full text-[12px] text-[rgba(235,228,218,0.45)]"
                >
                  Back to browse
                </button>
              </div>
            ) : null}

            {panel === 'notifs' && user ? (
              <div>
                <div className="mb-3 text-[14px] font-medium">Notifications</div>
                {notifs.filter((n) => n.userId === user.id).length === 0 ? (
                  <p className="text-[13px] text-[rgba(235,228,218,0.5)]">No notifications yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {notifs
                      .filter((n) => n.userId === user.id)
                      .slice(0, 20)
                      .map((n) => (
                        <li
                          key={n.id}
                          className="rounded-xl bg-[#161311]/80 p-3 ring-1 ring-[rgba(235,228,218,0.08)]"
                        >
                          <div className="text-[13px] font-medium">{n.title}</div>
                          <div className="mt-0.5 text-[12px] text-[rgba(235,228,218,0.6)]">{n.body}</div>
                        </li>
                      ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setPanel('browse')}
                  className="mt-3 h-9 w-full text-[12px] text-[rgba(235,228,218,0.45)]"
                >
                  Back to browse
                </button>
              </div>
            ) : null}

          </div>
        ) : null}
      </div>
    </div>
  );
}

function Chip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] ring-1 ring-[rgba(235,228,218,0.14)]"
      style={{
        background: active ? `${color || '#e8843a'}33` : 'rgba(22,19,17,0.9)',
      }}
    >
      {color ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /> : null}
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#161311]/80 py-2 ring-1 ring-[rgba(235,228,218,0.08)]">
      <div className="text-[16px] font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-[rgba(235,228,218,0.45)]">{label}</div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-45" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19c1.5-3 4-4.5 6.5-4.5S17 16 18.5 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
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
