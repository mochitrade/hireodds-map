import { universitySeedPlaces } from '../data/universityCampuses';

export type SceneId = string;

export type SceneDef = {
  id: SceneId;
  label: string;
  color: string;
  builtin?: boolean;
};

export type PlaceComment = {
  id: string;
  name: string;
  text: string;
  photos: string[];
  createdAt: number;
  authorId?: string;
  /** User ids who liked this comment */
  likes?: string[];
  /** Parent comment id for Instagram-style replies */
  parentId?: string | null;
};

export type ScenePlace = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  city: string;
  address: string;
  scene: SceneId;
  /** Original pin blurb */
  review: string;
  votes: number;
  createdAt: number;
  /** How many times the share link was copied */
  shares?: number;
  /** Gallery — review photos auto-append here */
  photos?: string[];
  comments?: PlaceComment[];
  authorId?: string;
  authorName?: string;
};

export function normalizePlace(p: ScenePlace): ScenePlace {
  const photos = Array.isArray(p.photos) ? p.photos.filter(Boolean) : [];
  return {
    ...p,
    shares: typeof p.shares === 'number' ? p.shares : 0,
    photos: photos.length ? photos : defaultPlacePhotos(p.lat, p.lng),
    comments: Array.isArray(p.comments) ? p.comments : [],
  };
}

/** Deep link that opens the map focused on this pin. */
export function placeShareUrl(placeId: string): string {
  if (typeof window === 'undefined') return `/?place=${encodeURIComponent(placeId)}`;
  const url = new URL(window.location.origin + '/');
  url.searchParams.set('place', placeId);
  return url.toString();
}

export function placeCommentCount(p: ScenePlace): number {
  return (p.comments || []).length;
}

/** Relative time like Instagram (1m, 2h, 3d). */
export function commentTimeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s || 1}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Sort: upvotes first, then discussion activity. */
export function sortPlacesByBuzz(places: ScenePlace[]): ScenePlace[] {
  return [...places].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return placeCommentCount(b) - placeCommentCount(a);
  });
}

export function mapSnapshotUrl(lat: number, lng: number): string {
  // Satellite cover of the exact spot
  const d = 0.0035;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return (
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=640,360&format=jpg&f=image`
  );
}

export function mapStreetUrl(lat: number, lng: number): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=640x360&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
}

export function defaultPlacePhotos(lat: number, lng: number): string[] {
  return [mapSnapshotUrl(lat, lng), mapStreetUrl(lat, lng)];
}

export function newCommentId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** ~one street segment when first dropped. */
export const BASE_RADIUS_M = 32;
/** Roughly “an inch” of map growth per upvote at street zoom. */
export const RADIUS_PER_VOTE_M = 12;
export const MAX_RADIUS_M = 220;
/** Same-scene pins within this distance collapse into one. */
export const MERGE_DISTANCE_M = 90;

const PLACES_KEY = 'hireodds.scene-map.v5';
const SCENES_KEY = 'hireodds.scene-map.scenes.v1';
const PIN_DAY_KEY = 'hireodds.scene-map.pin-day';

export const BUILTIN_SCENES: SceneDef[] = [
  { id: 'finance-bros', label: 'Finance Bros', color: '#e8843a', builtin: true },
  { id: 'wall-street', label: 'Wall Street', color: '#d45a2a', builtin: true },
  { id: 'consulting', label: 'Consulting', color: '#8a9aab', builtin: true },
  { id: 'startup-founders', label: 'Startup Founders', color: '#2f8f86', builtin: true },
  { id: 'tech-bros', label: 'Tech Bros', color: '#4a7c9b', builtin: true },
  { id: 'nepo-babies', label: 'Nepo Babies', color: '#c9a227', builtin: true },
  { id: 'media-kids', label: 'Media Kids', color: '#c45c5c', builtin: true },
  { id: 'art-scene', label: 'Art Scene', color: '#6b8f71', builtin: true },
  { id: 'party-animals', label: 'Party Animals', color: '#e05a8c', builtin: true },
  { id: 'frat-bros', label: 'Frat Bros', color: '#c4a35a', builtin: true },
  { id: 'douches', label: 'Douches', color: '#7a6a5a', builtin: true },
  { id: 'stem-kids', label: 'STEM Kids', color: '#5a8f9b', builtin: true },
  { id: 'athletes', label: 'Athletes', color: '#c45a3a', builtin: true },
  { id: 'try-hards', label: 'Try-Hards', color: '#6a7a8a', builtin: true },
  { id: 'hipsters', label: 'Hipsters', color: '#8a7a5a', builtin: true },
  { id: 'pre-med', label: 'Pre-Med', color: '#5a9b7a', builtin: true },
];

const SCENE_COLORS = [
  '#e8843a',
  '#d45a2a',
  '#8a9aab',
  '#2f8f86',
  '#4a7c9b',
  '#c9a227',
  '#c45c5c',
  '#6b8f71',
  '#b08968',
  '#9b6b4a',
  '#5c8a6e',
  '#a67c52',
  '#7a8f9b',
  '#c48a5a',
];

const BLOCKED =
  /\b(fuck|shit|asshole|bitch|cunt|dick|pussy|nigger|nigga|faggot|retard|rape|rapist|porn|porno|xxx|nude|nudes|naked|sex|sexy|hentai|onlyfans|nsfw|slut|whore|pedo|paedo|kill\s*yourself|kys)\b/i;

export function isCleanText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (BLOCKED.test(t)) return false;
  // crude nudity / sexual solicitation cues
  if (/\b(send\s*nudes?|dick\s*pic|boob|cock|cum)\b/i.test(t)) return false;
  return true;
}

export function slugifyScene(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `scene-${Date.now().toString(36)}`;
}

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export function influenceRadiusM(votes: number): number {
  const v = Math.max(0, votes);
  return Math.min(MAX_RADIUS_M, BASE_RADIUS_M + v * RADIUS_PER_VOTE_M);
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function hasPinnedToday(): boolean {
  try {
    return localStorage.getItem(PIN_DAY_KEY) === dayKey();
  } catch {
    return false;
  }
}

export function markPinnedToday() {
  localStorage.setItem(PIN_DAY_KEY, dayKey());
}

export function loadCustomScenes(): SceneDef[] {
  try {
    const raw = localStorage.getItem(SCENES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SceneDef[];
    return Array.isArray(parsed) ? parsed.filter((s) => s?.id && s?.label && s?.color) : [];
  } catch {
    return [];
  }
}

export function saveCustomScenes(scenes: SceneDef[]) {
  localStorage.setItem(SCENES_KEY, JSON.stringify(scenes.filter((s) => !s.builtin)));
}

export function allScenes(custom: SceneDef[]): SceneDef[] {
  const ids = new Set(BUILTIN_SCENES.map((s) => s.id));
  return [...BUILTIN_SCENES, ...custom.filter((s) => !ids.has(s.id))];
}

export function sceneMap(custom: SceneDef[]): Record<string, SceneDef> {
  return Object.fromEntries(allScenes(custom).map((s) => [s.id, s]));
}

export function nextSceneColor(existing: SceneDef[]): string {
  const used = new Set(existing.map((s) => s.color.toLowerCase()));
  for (const c of SCENE_COLORS) {
    if (!used.has(c.toLowerCase())) return c;
  }
  const hue = (existing.length * 47) % 360;
  return `hsl(${hue} 42% 52%)`;
}

export const SEED_PLACES: ScenePlace[] = [
  {
    id: 'seed-nyc-fi',
    lat: 40.7069,
    lng: -74.0113,
    title: 'Battery Park Flex Zone',
    city: 'New York',
    address: 'Financial District, NYC',
    scene: 'finance-bros',
    review: 'Patagonia vests as far as the eye can see. Someone said "alpha" unironically.',
    votes: 12,
    createdAt: 1,
  },
  {
    id: 'seed-nyc-ws',
    lat: 40.7075,
    lng: -74.0105,
    title: 'The Sacred Bull',
    city: 'New York',
    address: 'Wall St, NYC',
    scene: 'wall-street',
    review: 'Tourists pose with the bull. The locals pose with their bonuses.',
    votes: 9,
    createdAt: 2,
  },
  {
    id: 'seed-midtown-consult',
    lat: 40.7549,
    lng: -73.984,
    title: 'Slide Deck District',
    city: 'New York',
    address: 'Midtown, NYC',
    scene: 'consulting',
    review: 'Black tote bags, navy blazers, and the phrase "circle back" in the air.',
    votes: 6,
    createdAt: 3,
  },
  {
    id: 'seed-soho-nepo',
    lat: 40.7233,
    lng: -74.003,
    title: 'SoHo Soft Launch',
    city: 'New York',
    address: 'SoHo, NYC',
    scene: 'nepo-babies',
    review: 'Everyone here is "working on a project." The project is being seen.',
    votes: 11,
    createdAt: 4,
  },
  {
    id: 'seed-soho-fi-battle',
    lat: 40.724,
    lng: -74.0022,
    title: 'Prince St Overlap',
    city: 'New York',
    address: 'Prince St, SoHo',
    scene: 'finance-bros',
    review: 'Vest energy leaking into the soft-launch zone. Territory war incoming.',
    votes: 7,
    createdAt: 19,
  },
  {
    id: 'seed-williamsburg-media',
    lat: 40.7181,
    lng: -73.957,
    title: 'Newsletter Alley',
    city: 'New York',
    address: 'Williamsburg, Brooklyn',
    scene: 'media-kids',
    review: 'Cold brew + Substack bio energy. Someone pitched a podcast at the crosswalk.',
    votes: 5,
    createdAt: 5,
  },
  {
    id: 'seed-sf-startup',
    lat: 37.7816,
    lng: -122.404,
    title: 'Mission Street Pitch Loop',
    city: 'San Francisco',
    address: 'SOMA, San Francisco',
    scene: 'startup-founders',
    review: 'Every cafe has a whiteboard. Every whiteboard has a hockey stick.',
    votes: 14,
    createdAt: 6,
  },
  {
    id: 'seed-sf-tech',
    lat: 37.7897,
    lng: -122.3972,
    title: 'Salesforce Shadow',
    city: 'San Francisco',
    address: 'Downtown SF',
    scene: 'tech-bros',
    review: 'Allbirds density critical. Someone asked if you\'re "shipping this week."',
    votes: 8,
    createdAt: 7,
  },
  {
    id: 'seed-palo-alto',
    lat: 37.4419,
    lng: -122.143,
    title: 'University Ave Unicorns',
    city: 'Palo Alto',
    address: 'University Ave, Palo Alto',
    scene: 'startup-founders',
    review: 'Founders who raised before they shipped. The vibe is Series A confidence.',
    votes: 7,
    createdAt: 8,
  },
  {
    id: 'seed-la-nepo',
    lat: 34.0837,
    lng: -118.389,
    title: 'Melrose Soft Power',
    city: 'Los Angeles',
    address: 'West Hollywood, LA',
    scene: 'nepo-babies',
    review: 'Last names as passwords. Everyone\'s dad "knows someone."',
    votes: 10,
    createdAt: 9,
  },
  {
    id: 'seed-la-media',
    lat: 34.0901,
    lng: -118.3617,
    title: 'Writers\' Room Adjacent',
    city: 'Los Angeles',
    address: 'Fairfax, LA',
    scene: 'media-kids',
    review: 'Pitch decks disguised as coffee orders. "It\'s like Succession but for pets."',
    votes: 4,
    createdAt: 10,
  },
  {
    id: 'seed-miami-fi',
    lat: 25.7617,
    lng: -80.1918,
    title: 'Brickell Broker Belt',
    city: 'Miami',
    address: 'Brickell, Miami',
    scene: 'finance-bros',
    review: 'Linen shirts, Rolexes, and "I moved down for the tax situation."',
    votes: 8,
    createdAt: 11,
  },
  {
    id: 'seed-chicago-fi',
    lat: 41.8819,
    lng: -87.6278,
    title: 'LaSalle Street Energy',
    city: 'Chicago',
    address: 'Loop, Chicago',
    scene: 'finance-bros',
    review: 'Midwest nice meets Bloomberg terminal. Winter coats over Patagonia.',
    votes: 5,
    createdAt: 12,
  },
  {
    id: 'seed-london-fi',
    lat: 51.5128,
    lng: -0.0918,
    title: 'The City After Hours',
    city: 'London',
    address: 'Bank, London',
    scene: 'finance-bros',
    review: 'Pints at 5pm sharp. Someone called it "a quick one" and stayed three hours.',
    votes: 7,
    createdAt: 13,
  },
  {
    id: 'seed-london-consult',
    lat: 51.5155,
    lng: -0.1415,
    title: 'Mayfair Slide Zone',
    city: 'London',
    address: 'Mayfair, London',
    scene: 'consulting',
    review: 'Everyone is "in town for a client." The client is vibes.',
    votes: 3,
    createdAt: 14,
  },
  {
    id: 'seed-berlin-art',
    lat: 52.5014,
    lng: 13.4025,
    title: 'Kreuzberg After Dark',
    city: 'Berlin',
    address: 'Kreuzberg, Berlin',
    scene: 'art-scene',
    review: 'Gallery openings that start at midnight. Nobody admits they have a day job.',
    votes: 4,
    createdAt: 15,
  },
  {
    id: 'seed-tokyo-tech',
    lat: 35.6595,
    lng: 139.7004,
    title: 'Shibuya Ship Mode',
    city: 'Tokyo',
    address: 'Shibuya, Tokyo',
    scene: 'tech-bros',
    review: 'Hackathons disguised as dinners. The Wi-Fi password is a manifesto.',
    votes: 3,
    createdAt: 16,
  },
  {
    id: 'seed-dubai-fi',
    lat: 25.2048,
    lng: 55.2708,
    title: 'Marina Flex Corridor',
    city: 'Dubai',
    address: 'Dubai Marina',
    scene: 'finance-bros',
    review: 'Supercars parked like scooters. Someone mentioned "the region" seventeen times.',
    votes: 6,
    createdAt: 17,
  },
  {
    id: 'seed-austin-startup',
    lat: 30.2672,
    lng: -97.7431,
    title: 'Rainey Street Roadmap',
    city: 'Austin',
    address: 'Downtown Austin',
    scene: 'startup-founders',
    review: 'Everyone moved here in 2021 and still says they\'re "building in public."',
    votes: 5,
    createdAt: 18,
  },
];

export function defaultPlaces(): ScenePlace[] {
  return [...SEED_PLACES, ...universitySeedPlaces()];
}

export function loadPlaces(): ScenePlace[] {
  try {
    localStorage.removeItem('hireodds.scene-map.v1');
    localStorage.removeItem('hireodds.scene-map.v2');
    localStorage.removeItem('hireodds.scene-map.v3');
    localStorage.removeItem('hireodds.scene-map.v4');
    const raw = localStorage.getItem(PLACES_KEY);
    if (!raw) return defaultPlaces().map(normalizePlace);
    const parsed = JSON.parse(raw) as ScenePlace[];
    if (!Array.isArray(parsed) || !parsed.length) return defaultPlaces().map(normalizePlace);
    // Drop legacy secondary campus pins / bloated seeds
    const cleaned = parsed.filter((p) => !p.id.endsWith('-secondary'));
    const hasUnis = cleaned.some((p) => p.id.startsWith('uni-'));
    const base = hasUnis ? cleaned : [...cleaned, ...universitySeedPlaces()];
    return base.map(normalizePlace);
  } catch {
    return defaultPlaces().map(normalizePlace);
  }
}

export function savePlaces(places: ScenePlace[]) {
  localStorage.setItem(PLACES_KEY, JSON.stringify(places));
}

export function sceneVoteTotal(places: ScenePlace[], scene: SceneId) {
  return places.filter((p) => p.scene === scene).reduce((n, p) => n + p.votes, 0);
}

export function sceneCount(places: ScenePlace[], scene: SceneId) {
  return places.filter((p) => p.scene === scene).length;
}

export function rankedScenes(scenes: SceneDef[], places: ScenePlace[]): SceneDef[] {
  return [...scenes].sort((a, b) => {
    const vb = sceneVoteTotal(places, b.id) - sceneVoteTotal(places, a.id);
    if (vb !== 0) return vb;
    return sceneCount(places, b.id) - sceneCount(places, a.id);
  });
}

export function newPlaceId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Find nearest same-scene pin within merge distance. */
export function findMergeTarget(
  places: ScenePlace[],
  scene: SceneId,
  lat: number,
  lng: number,
): ScenePlace | null {
  let best: ScenePlace | null = null;
  let bestD = Infinity;
  for (const p of places) {
    if (p.scene !== scene) continue;
    const d = haversineM(lat, lng, p.lat, p.lng);
    if (d <= MERGE_DISTANCE_M && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

/** Merge a new review into an existing pin (vote + weighted center + review append). */
export function mergeIntoPlace(
  existing: ScenePlace,
  incoming: { lat: number; lng: number; title: string; review: string },
): ScenePlace {
  const wOld = Math.max(1, existing.votes);
  const wNew = 1;
  const w = wOld + wNew;
  return {
    ...existing,
    lat: (existing.lat * wOld + incoming.lat * wNew) / w,
    lng: (existing.lng * wOld + incoming.lng * wNew) / w,
    votes: existing.votes + 1,
    review: existing.review.includes(incoming.review)
      ? existing.review
      : `${existing.review}\n\n— also: ${incoming.review}`,
    title: existing.title || incoming.title,
  };
}
