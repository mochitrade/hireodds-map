import { isSupabaseConfigured, supabase } from '../supabaseClient';
import type { SceneDef, ScenePlace } from './sceneMap';
import { normalizePlace } from './sceneMap';
import {
  loadProfiles,
  saveProfiles,
  type MapProfile,
} from './mapSocial';

/** Pull all map profiles into local cache (usernames/avatars for comments). */
export async function hydrateProfilesFromCloud(): Promise<Record<string, MapProfile>> {
  const local = loadProfiles();
  if (!isSupabaseConfigured) return local;
  try {
    const { data, error } = await supabase
      .from('map_profiles')
      .select(
        'user_id,email,username,display_name,avatar_url,bio,setup_complete,created_at,updated_at',
      )
      .limit(2000);
    if (error || !data) return local;
    const merged = { ...local };
    for (const row of data) {
      const userId = row.user_id as string;
      if (!userId) continue;
      const remote: MapProfile = {
        userId,
        email: (row.email as string) || '',
        username: (row.username as string) || undefined,
        displayName: (row.display_name as string) || (row.username as string) || '',
        avatarUrl: (row.avatar_url as string) || undefined,
        bio: (row.bio as string) || undefined,
        setupComplete: Boolean(row.setup_complete),
        createdAt: row.created_at ? Date.parse(row.created_at as string) || Date.now() : Date.now(),
      };
      const prev = merged[userId];
      // Prefer complete remote profiles; keep local if newer incomplete edits mid-session
      if (!prev || remote.setupComplete || !prev.setupComplete) {
        merged[userId] = { ...prev, ...remote };
      }
    }
    saveProfiles(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function pushProfileToCloud(p: MapProfile): Promise<void> {
  if (!isSupabaseConfigured || !p.userId) return;
  try {
    // Never clobber a completed cloud profile with an incomplete stub
    if (!p.setupComplete) {
      const { data } = await supabase
        .from('map_profiles')
        .select('setup_complete')
        .eq('user_id', p.userId)
        .maybeSingle();
      if (data?.setup_complete) return;
    }
    await supabase.from('map_profiles').upsert(
      {
        user_id: p.userId,
        email: p.email || '',
        username: p.username || null,
        display_name: p.displayName || p.username || '',
        avatar_url: p.avatarUrl || null,
        bio: p.bio || null,
        setup_complete: Boolean(p.setupComplete),
        updated_at: new Date().toISOString(),
        created_at: new Date(p.createdAt || Date.now()).toISOString(),
      },
      { onConflict: 'user_id' },
    );
  } catch {
    /* offline / RLS — local still saved */
  }
}

export async function fetchCloudPlaces(): Promise<ScenePlace[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('map_places')
      .select('id,payload,updated_at')
      .limit(5000);
    if (error || !data) return null;
    return data
      .map((row) => {
        const payload = row.payload as ScenePlace;
        if (!payload || typeof payload !== 'object') return null;
        return normalizePlace({ ...payload, id: (row.id as string) || payload.id });
      })
      .filter(Boolean) as ScenePlace[];
  } catch {
    return null;
  }
}

/** Merge local + cloud places. Cloud wins on newer activity (comments/votes/shares). */
export function mergePlaces(local: ScenePlace[], cloud: ScenePlace[]): ScenePlace[] {
  const byId = new Map<string, ScenePlace>();
  for (const p of local) byId.set(p.id, p);
  for (const c of cloud) {
    const prev = byId.get(c.id);
    if (!prev) {
      byId.set(c.id, c);
      continue;
    }
    const prevActivity =
      (prev.comments?.length || 0) + (prev.votes || 0) + (prev.shares || 0) + (prev.photos?.length || 0);
    const cloudActivity =
      (c.comments?.length || 0) + (c.votes || 0) + (c.shares || 0) + (c.photos?.length || 0);
    if (cloudActivity >= prevActivity || (c.createdAt || 0) >= (prev.createdAt || 0)) {
      // Prefer richer comment threads
      const comments =
        (c.comments?.length || 0) >= (prev.comments?.length || 0) ? c.comments : prev.comments;
      byId.set(c.id, normalizePlace({ ...prev, ...c, comments: comments || [] }));
    }
  }
  return [...byId.values()];
}

export async function pushPlacesToCloud(places: ScenePlace[]): Promise<void> {
  if (!isSupabaseConfigured || !places.length) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return; // anon can read; writes need auth

    // Upsert in chunks — skip huge photo data-URLs over ~400kb total payload tip
    const rows = places.map((p) => ({
      id: p.id,
      payload: p,
      author_id: p.authorId || null,
      updated_at: new Date().toISOString(),
    }));
    const chunk = 40;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      await supabase.from('map_places').upsert(slice, { onConflict: 'id' });
    }
  } catch {
    /* ignore */
  }
}

export async function pushPlaceToCloud(place: ScenePlace): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('map_places').upsert(
      {
        id: place.id,
        payload: place,
        author_id: place.authorId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch {
    /* ignore */
  }
}

export async function fetchCloudScenes(): Promise<SceneDef[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('map_scenes').select('id,label,color').limit(500);
    if (error || !data) return null;
    return data
      .filter((r) => r.id && r.label)
      .map((r) => ({
        id: r.id as string,
        label: r.label as string,
        color: (r.color as string) || '#e8843a',
      }));
  } catch {
    return null;
  }
}

export async function pushSceneToCloud(
  scene: SceneDef,
  createdBy?: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('map_scenes').upsert({
      id: scene.id,
      label: scene.label,
      color: scene.color,
      created_by: createdBy || session.user.id,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}
