import type { SceneDef, ScenePlace, PlaceComment } from './sceneMap';

const PENDING_KEY = 'hireodds.scene-map.pending-scenes.v1';
const NOTIF_KEY = 'hireodds.scene-map.notifs.v1';
const PROFILE_KEY = 'hireodds.scene-map.profiles.v1';

export type PendingScene = SceneDef & {
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedByName: string;
  createdAt: number;
  note?: string;
};

export type MapNotif = {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  kind: 'scene' | 'system' | 'social';
};

export type MapProfile = {
  userId: string;
  displayName: string;
  /** Unique handle, lowercase */
  username?: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: number;
  /** False until user picks username + photo */
  setupComplete?: boolean;
};

/** Comma-separated emails in VITE_MAP_ADMIN_EMAILS. On localhost, any signed-in user can moderate. */
export function isMapAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const raw = (import.meta.env.VITE_MAP_ADMIN_EMAILS as string | undefined) || '';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length) return list.includes(email.toLowerCase());
  try {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function loadPendingScenes(): PendingScene[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingScene[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingScenes(list: PendingScene[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

export function loadNotifs(): MapNotif[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MapNotif[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifs(list: MapNotif[]) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, 80)));
}

export function pushNotif(n: Omit<MapNotif, 'id' | 'createdAt' | 'read'>) {
  const list = loadNotifs();
  list.unshift({
    ...n,
    id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: Date.now(),
    read: false,
  });
  saveNotifs(list);
  return list;
}

export function loadProfiles(): Record<string, MapProfile> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MapProfile>;
  } catch {
    return {};
  }
}

export function saveProfiles(map: Record<string, MapProfile>) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(map));
}

export function upsertProfile(p: MapProfile) {
  const all = loadProfiles();
  all[p.userId] = { ...all[p.userId], ...p };
  saveProfiles(all);
  // Persist to Supabase so username/avatar survive devices + reloads
  void import('./mapCloud')
    .then((m) => m.pushProfileToCloud(all[p.userId]))
    .catch(() => {});
  return all[p.userId];
}

export function getProfile(userId: string): MapProfile | null {
  return loadProfiles()[userId] || null;
}

export function needsProfileSetup(userId: string): boolean {
  const p = getProfile(userId);
  if (!p) return true;
  if (p.setupComplete === true && p.username?.trim() && p.avatarUrl?.trim()) return false;
  if (p.setupComplete === true) return !p.username?.trim() || !p.avatarUrl?.trim();
  // Incomplete or legacy without username — ask once
  return true;
}

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

export function isUsernameTaken(username: string, excludeUserId?: string): boolean {
  const u = normalizeUsername(username);
  if (!u || u.length < 3) return false;
  const all = loadProfiles();
  return Object.values(all).some(
    (p) => p.username && p.username === u && p.userId !== excludeUserId,
  );
}

export function usernameAvailability(username: string, excludeUserId?: string): {
  ok: boolean;
  reason?: string;
} {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, reason: 'Pick a username' };
  if (u.length < 3) return { ok: false, reason: 'At least 3 characters' };
  if (u.length > 24) return { ok: false, reason: 'Keep it under 24 characters' };
  if (!/^[a-z][a-z0-9_]*$/.test(u)) {
    return { ok: false, reason: 'Start with a letter · letters, numbers, _ only' };
  }
  if (isUsernameTaken(u, excludeUserId)) return { ok: false, reason: 'That username is taken' };
  return { ok: true };
}

export type RankedUser = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  karma: number;
  posts: number;
  reviews: number;
  upvotes: number;
  rank: number;
};

export function userKarma(
  userId: string,
  places: (ScenePlace & { authorId?: string })[],
): { karma: number; posts: number; reviews: number; upvotes: number; postsList: ScenePlace[]; reviewsList: { place: ScenePlace; comment: PlaceComment }[] } {
  const postsList = places.filter((p) => p.authorId === userId);
  const reviewsList: { place: ScenePlace; comment: PlaceComment }[] = [];
  for (const p of places) {
    for (const c of p.comments || []) {
      if (c.authorId === userId) {
        reviewsList.push({ place: p, comment: c });
      }
    }
  }
  const upvotes = postsList.reduce((n, p) => n + p.votes, 0);
  const shares = postsList.reduce((n, p) => n + (p.shares || 0), 0);
  const commentLikes = reviewsList.reduce((n, r) => n + (r.comment.likes?.length || 0), 0);
  const karma = upvotes * 2 + reviewsList.length * 3 + commentLikes + shares + postsList.length * 5;
  return { karma, posts: postsList.length, reviews: reviewsList.length, upvotes, postsList, reviewsList };
}

export function leaderboard(places: (ScenePlace & { authorId?: string })[]): RankedUser[] {
  const ids = new Set<string>();
  for (const p of places) {
    if (p.authorId) ids.add(p.authorId);
    for (const c of p.comments || []) {
      const aid = (c as PlaceComment & { authorId?: string }).authorId;
      if (aid) ids.add(aid);
    }
  }
  const profiles = loadProfiles();
  const rows: RankedUser[] = [...ids].map((userId) => {
    const stats = userKarma(userId, places);
    const prof = profiles[userId];
    return {
      userId,
      displayName: prof?.displayName || 'Mapper',
      avatarUrl: prof?.avatarUrl,
      karma: stats.karma,
      posts: stats.posts,
      reviews: stats.reviews,
      upvotes: stats.upvotes,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.karma - a.karma);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}
