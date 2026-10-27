import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './mapPage.css';
import {
  BUILTIN_SCENES,
  loadPlaces,
  savePlaces,
  loadCustomScenes,
  saveCustomScenes,
  allScenes,
  sceneMap,
  rankedScenes,
  sceneCount,
  sceneVoteTotal,
  findMergeTarget,
  mergeIntoPlace,
  newPlaceId,
  hasPinnedToday,
  markPinnedToday,
  isCleanText,
  slugifyScene,
  nextSceneColor,
  sortPlacesByBuzz,
  mapSnapshotUrl,
  normalizePlace,
  influenceRadiusM,
  type SceneDef,
  type ScenePlace,
} from '../lib/sceneMap';
import { MapPlaceCard } from './MapPlaceCard';
import { MapAuthChrome, useMapSession } from './MapAuthChrome';
import { MapMobileSheet, MapMobileWeather } from './MapMobileSheet';
import { MapProfileSetup } from './MapProfileSetup';
import { getProfile, needsProfileSetup, pushNotif } from '../lib/mapSocial';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

type DraftPin = { lat: number; lng: number };

function pinIcon(color: string, index: number, active: boolean) {
  const n = String(index + 1).padStart(2, '0');
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div class="map-pin${active ? ' is-active' : ''}" style="background:${color}">${n}</div>`,
  });
}

function dropIcon() {
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div class="map-drop-hint"></div>`,
  });
}

async function reverseLabel(lat: number, lng: number): Promise<{ city: string; address: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('geocode failed');
    const data = (await res.json()) as {
      display_name?: string;
      address?: { city?: string; town?: string; village?: string; state?: string; suburb?: string };
    };
    const a = data.address || {};
    const city = a.city || a.town || a.village || a.state || a.suburb || 'Somewhere';
    const address = (data.display_name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`).split(',').slice(0, 3).join(',');
    return { city, address };
  } catch {
    return { city: 'Somewhere', address: `${lat.toFixed(3)}, ${lng.toFixed(3)}` };
  }
}

function clockParts(now: Date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return {
    date: `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]}, ${now.getFullYear()}`,
    time: `${h12}:${m} ${ampm}`,
  };
}

export function MapPage() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.LayerGroup | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);
  const sceneFlyReady = useRef(false);
  const skipSceneFly = useRef(false);
  const deepLinkDone = useRef(false);

  const [places, setPlaces] = useState<ScenePlace[]>(() =>
    typeof window === 'undefined' ? [] : loadPlaces(),
  );
  const [customScenes, setCustomScenes] = useState<SceneDef[]>(() =>
    typeof window === 'undefined' ? [] : loadCustomScenes(),
  );
  const [activeScene, setActiveScene] = useState<string | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [dropMode, setDropMode] = useState(false);
  const [showMoreScenes, setShowMoreScenes] = useState(false);
  const [creatingScene, setCreatingScene] = useState(false);
  const [newSceneLabel, setNewSceneLabel] = useState('');
  const [sceneError, setSceneError] = useState('');
  const [formError, setFormError] = useState('');
  const [pinLocked, setPinLocked] = useState(() =>
    typeof window === 'undefined' ? false : hasPinnedToday(),
  );
  const [now, setNow] = useState(() => new Date());
  const [form, setForm] = useState({
    title: '',
    review: '',
    scene: 'finance-bros',
  });
  const [geoBusy, setGeoBusy] = useState(false);
  const [mapZoom, setMapZoom] = useState(15);
  const [mapCenter, setMapCenter] = useState({ lat: 40.723, lng: -74.003 });
  const [profileTick, setProfileTick] = useState(0);
  const session = useMapSession();
  const user = session?.user ?? null;
  const showProfileSetup = Boolean(user && needsProfileSetup(user.id));
  void profileTick;

  const scenes = useMemo(() => allScenes(customScenes), [customScenes]);
  const byId = useMemo(() => sceneMap(customScenes), [customScenes]);
  const ranked = useMemo(() => rankedScenes(scenes, places), [scenes, places]);
  const shownScenes = showMoreScenes ? ranked : ranked.slice(0, 10);

  const visible = useMemo(() => {
    const filtered = activeScene === 'all' ? places : places.filter((p) => p.scene === activeScene);
    return sortPlacesByBuzz(filtered);
  }, [places, activeScene]);
  const selected = selectedId ? places.find((p) => p.id === selectedId) || null : null;
  const topPlace = visible[0] || null;
  const clock = clockParts(now);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    savePlaces(places);
  }, [places]);

  useEffect(() => {
    saveCustomScenes(customScenes);
  }, [customScenes]);

  // Sync community scenes from Supabase when available
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('map_scenes')
        .select('id,label,color')
        .limit(200);
      if (cancelled || error || !data?.length) return;
      setCustomScenes((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        for (const row of data as { id: string; label: string; color: string }[]) {
          if (!row?.id || !row.label) continue;
          if (!byId.has(row.id)) {
            byId.set(row.id, { id: row.id, label: row.label, color: row.color || '#e8843a' });
          }
        }
        return [...byId.values()];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, {
      center: [40.723, -74.003],
      zoom: 15,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: false,
    });

    // Esri dark gray only has tiles to z16 — scale them past that so zoom-in doesn't go blank
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 16,
        maxZoom: 19,
      },
    ).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    heatRef.current = L.layerGroup().addTo(map);

    const syncView = () => {
      const c = map.getCenter();
      setMapZoom(map.getZoom());
      setMapCenter({ lat: c.lat, lng: c.lng });
    };
    map.on('zoomend moveend', syncView);
    syncView();

    map.on('click', (e: L.LeafletMouseEvent) => {
      const m = map as L.Map & { __dropMode?: boolean };
      if (m.__dropMode) {
        setDraft({ lat: e.latlng.lat, lng: e.latlng.lng });
        setDropMode(false);
        m.__dropMode = false;
        setSelectedId(null);
        return;
      }
      setSelectedId(null);
    });

    mapRef.current = map;

    const linkId = new URLSearchParams(window.location.search).get('place');
    if (!linkId && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
        },
        () => {
          map.setView([40.723, -74.003], 15);
        },
        { enableHighAccuracy: false, timeout: 5000 },
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Open shared place links: /map?place=<id>
  useEffect(() => {
    if (deepLinkDone.current || !places.length) return;
    const id = new URLSearchParams(window.location.search).get('place');
    if (!id) {
      deepLinkDone.current = true;
      return;
    }
    const hit = places.find((p) => p.id === id);
    if (!hit) {
      deepLinkDone.current = true;
      return;
    }
    deepLinkDone.current = true;
    sceneFlyReady.current = true;
    skipSceneFly.current = true;
    setActiveScene(hit.scene);
    setSelectedId(hit.id);
    const map = mapRef.current;
    if (map) {
      map.flyTo([hit.lat, hit.lng], 16, { duration: 0.9 });
    }
  }, [places]);

  useEffect(() => {
    const map = mapRef.current as (L.Map & { __dropMode?: boolean }) | null;
    if (!map) return;
    map.__dropMode = dropMode;
    map.getContainer().style.cursor = dropMode ? 'crosshair' : '';
  }, [dropMode]);

  // Per-pin street bubbles (grow with votes) + markers
  useEffect(() => {
    const markers = markersRef.current;
    const heat = heatRef.current;
    if (!markers || !heat) return;

    markers.clearLayers();
    heat.clearLayers();

    for (const place of visible) {
      const scene = byId[place.scene] || { color: '#e8843a', label: place.scene, id: place.scene };
      const radius = influenceRadiusM(place.votes);
      L.circle([place.lat, place.lng], {
        radius,
        color: scene.color,
        weight: 1.5,
        opacity: 0.85,
        fillColor: scene.color,
        fillOpacity: 0.22,
      }).addTo(heat);
    }

    visible.forEach((place, i) => {
      const scene = byId[place.scene] || { color: '#e8843a', label: place.scene, id: place.scene };
      const active = selected?.id === place.id;
      const marker = L.marker([place.lat, place.lng], {
        icon: pinIcon(scene.color, i, active),
        riseOnHover: true,
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedId(place.id);
        setDraft(null);
      });
      marker.addTo(markers);
    });
  }, [visible, byId, selected?.id]);

  // Scene filter → jump to (and open) the highest-upvoted place in that scene
  useEffect(() => {
    if (!sceneFlyReady.current) {
      sceneFlyReady.current = true;
      return;
    }
    if (skipSceneFly.current) {
      skipSceneFly.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map || !topPlace) return;
    map.flyTo([topPlace.lat, topPlace.lng], activeScene === 'all' ? 4 : 15, { duration: 0.85 });
    if (activeScene !== 'all') setSelectedId(topPlace.id);
    else setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when scene filter changes
  }, [activeScene]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (draftMarkerRef.current) {
      draftMarkerRef.current.remove();
      draftMarkerRef.current = null;
    }
    if (!draft) return;
    draftMarkerRef.current = L.marker([draft.lat, draft.lng], {
      icon: dropIcon(),
      zIndexOffset: 1000,
    }).addTo(map);
    map.panTo([draft.lat, draft.lng]);
  }, [draft]);

  function locateMe() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 16, { animate: true });
        setGeoBusy(false);
      },
      () => setGeoBusy(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function zoomBy(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  }

  function vote(id: string, delta: number) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, votes: Math.max(0, p.votes + delta) } : p)),
    );
  }

  function requireSignIn(action: string) {
    if (user) return true;
    setFormError(`Sign in with Google to ${action}.`);
    return false;
  }

  function createScene() {
    setSceneError('');
    if (!user) {
      setSceneError('Sign in with Google to create a scene.');
      return;
    }
    const label = newSceneLabel.trim();
    if (!isCleanText(label)) {
      setSceneError('That name isn’t allowed. Keep it clean.');
      return;
    }
    if (label.length > 32) {
      setSceneError('Keep scene names under 32 characters.');
      return;
    }
    let id = slugifyScene(label);
    const existing = allScenes(customScenes);
    if (existing.some((s) => s.id === id || s.label.toLowerCase() === label.toLowerCase())) {
      setSceneError('That scene already exists.');
      return;
    }
    if (existing.some((s) => s.id === id)) {
      id = `${id}-${Date.now().toString(36).slice(-3)}`;
    }
    const scene: SceneDef = {
      id,
      label,
      color: nextSceneColor(existing),
    };
    setCustomScenes((prev) => [...prev, scene]);
    setActiveScene(id);
    if (isSupabaseConfigured) {
      void supabase.from('map_scenes').upsert({
        id: scene.id,
        label: scene.label,
        color: scene.color,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });
    }
    pushNotif({
      userId: user.id,
      title: 'Scene live',
      body: `"${label}" is on the map.`,
      kind: 'scene',
    });
    setNewSceneLabel('');
    setCreatingScene(false);
    setFormError(`“${label}” is live.`);
  }

  async function submitDraft() {
    setFormError('');
    if (!draft) return;
    if (!user) {
      setFormError('Sign in with Google to drop a pin.');
      return;
    }
    if (pinLocked || hasPinnedToday()) {
      setFormError('You already dropped a pin today. Come back tomorrow.');
      setPinLocked(true);
      return;
    }
    if (!isCleanText(form.title) || !isCleanText(form.review)) {
      setFormError('Keep the title and blurb clean — no weird stuff.');
      return;
    }
    if (!byId[form.scene]) {
      setFormError('Pick a scene.');
      return;
    }

    const mergeTarget = findMergeTarget(places, form.scene, draft.lat, draft.lng);
    if (mergeTarget) {
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === mergeTarget.id
            ? mergeIntoPlace(p, {
                lat: draft.lat,
                lng: draft.lng,
                title: form.title.trim(),
                review: form.review.trim(),
              })
            : p,
        ),
      );
      markPinnedToday();
      setPinLocked(true);
      setActiveScene(form.scene);
      setSelectedId(mergeTarget.id);
      setDraft(null);
      setForm({ title: '', review: '', scene: form.scene });
      return;
    }

    const { city, address } = await reverseLabel(draft.lat, draft.lng);
    const prof = getProfile(user.id);
    const authorName =
      prof?.username ||
      prof?.displayName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Mapper';
    const place = normalizePlace({
      id: newPlaceId(),
      lat: draft.lat,
      lng: draft.lng,
      title: form.title.trim(),
      city,
      address,
      scene: form.scene,
      review: form.review.trim(),
      votes: 0,
      createdAt: Date.now(),
      photos: [mapSnapshotUrl(draft.lat, draft.lng)],
      comments: [],
      authorId: user.id,
      authorName,
    });
    setPlaces((prev) => [place, ...prev]);
    markPinnedToday();
    setPinLocked(true);
    setActiveScene(form.scene);
    setSelectedId(place.id);
    setDraft(null);
    setForm({ title: '', review: '', scene: form.scene });
  }

  function startDrop() {
    if (!requireSignIn('drop a pin')) return;
    if (pinLocked || hasPinnedToday()) {
      setFormError('You already dropped a pin today. Come back tomorrow.');
      setPinLocked(true);
      return;
    }
    setFormError('');
    setDropMode((v) => !v);
    setDraft(null);
    setSelectedId(null);
  }

  function startNewScene() {
    if (!requireSignIn('propose a new scene')) return;
    setCreatingScene(true);
    setSceneError('');
  }

  function SceneList() {
    return (
      <>
        <button
          type="button"
          onClick={() => setActiveScene('all')}
          className="pointer-events-auto text-left transition-all"
          style={{
            fontFamily: activeScene === 'all' ? 'var(--map-serif)' : 'var(--map-sans)',
            fontSize: activeScene === 'all' ? 30 : 16,
            opacity: activeScene === 'all' ? 1 : 0.55,
            fontWeight: activeScene === 'all' ? 400 : 500,
            textShadow: '0 2px 18px rgba(0,0,0,0.65)',
          }}
        >
          All scenes
          <span className="ml-2 text-[13px] opacity-60">({places.length})</span>
        </button>
        {shownScenes.map((scene) => {
          const active = activeScene === scene.id;
          const count = sceneCount(places, scene.id);
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => setActiveScene(scene.id)}
              className="pointer-events-auto flex items-baseline gap-2 text-left transition-all"
              style={{
                fontFamily: active ? 'var(--map-serif)' : 'var(--map-sans)',
                fontSize: active ? 28 : 15,
                opacity: active ? 1 : 0.55,
                fontWeight: active ? 400 : 500,
                textShadow: '0 2px 18px rgba(0,0,0,0.65)',
              }}
            >
              <span
                className="mt-[0.4em] inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: scene.color }}
              />
              <span>
                {scene.label}
                <span className="ml-1 text-[12px] opacity-55">({count})</span>
              </span>
            </button>
          );
        })}
        {ranked.length > 10 ? (
          <button
            type="button"
            onClick={() => setShowMoreScenes((v) => !v)}
            className="pointer-events-auto mt-2 text-left text-[13px] text-[rgba(235,228,218,0.55)] underline-offset-2 hover:underline"
          >
            {showMoreScenes ? 'Show less' : `Show more · ${ranked.length - 10} scenes`}
          </button>
        ) : null}
        <button
          type="button"
          onClick={startNewScene}
          className="pointer-events-auto mt-3 text-left text-[13px] font-medium"
          style={{ color: 'var(--map-orange)' }}
        >
          + New scene
        </button>
      </>
    );
  }

  return (
    <div className="map-page">
      <div ref={mapEl} className="absolute inset-0" />

      <div className="hidden lg:contents">
        <MapAuthChrome places={places} />
      </div>

      <MapMobileWeather lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} visible={!draft} />

      <aside className="pointer-events-none absolute bottom-16 left-10 top-16 z-[500] hidden w-[250px] flex-col justify-center gap-1 lg:flex">
        <SceneList />
      </aside>

      {/* Desktop: locate + zoom + pin */}
      <div className="pointer-events-none absolute right-4 top-1/2 z-[500] hidden -translate-y-1/2 flex-col gap-3 lg:flex lg:right-6">
        <button
          type="button"
          onClick={locateMe}
          title="My area"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full"
          style={{ background: 'var(--map-orange)', color: '#161311' }}
        >
          <LocateIcon />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1)}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-[rgba(28,24,21,0.92)] text-[22px] text-[#ebe4da] ring-1 ring-[rgba(235,228,218,0.14)]"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-1)}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-[rgba(28,24,21,0.92)] text-[22px] text-[#ebe4da] ring-1 ring-[rgba(235,228,218,0.14)]"
        >
          −
        </button>
        <button
          type="button"
          onClick={startDrop}
          title={pinLocked ? 'Already pinned today' : 'Drop a pin'}
          className="pointer-events-auto mt-2 grid h-11 w-11 place-items-center rounded-full ring-1"
          style={{
            background: dropMode ? 'var(--map-orange)' : 'rgba(28,24,21,0.92)',
            color: dropMode ? '#161311' : '#ebe4da',
            borderColor: 'rgba(235,228,218,0.14)',
            opacity: pinLocked && !dropMode ? 0.45 : 1,
          }}
        >
          <PinIcon />
        </button>
      </div>

      {/* Mobile: locate + pin only, above search / place sheet */}
      <div
        className="pointer-events-none absolute right-3 z-[610] flex flex-col gap-2.5 transition-[bottom] duration-280 lg:hidden"
        style={{
          bottom: selected
            ? 'calc(52dvh + env(safe-area-inset-bottom))'
            : 'calc(6.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          onClick={locateMe}
          title="My location"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full shadow-lg"
          style={{ background: 'var(--map-orange)', color: '#161311' }}
        >
          <LocateIcon />
        </button>
        <button
          type="button"
          onClick={startDrop}
          title={pinLocked ? 'Already pinned today' : 'Drop a pin'}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full shadow-lg ring-1"
          style={{
            background: dropMode ? 'var(--map-orange)' : 'rgba(28,24,21,0.94)',
            color: dropMode ? '#161311' : '#ebe4da',
            borderColor: 'rgba(235,228,218,0.14)',
            opacity: pinLocked && !dropMode ? 0.45 : 1,
          }}
        >
          <PinIcon />
        </button>
      </div>

      <MapMobileSheet
        places={places}
        scenes={scenes}
        ranked={ranked}
        activeScene={activeScene}
        user={user}
        hidden={Boolean(draft)}
        selected={selected}
        selectedScene={selected ? byId[selected.scene] || BUILTIN_SCENES[0] : null}
        onClosePlace={() => setSelectedId(null)}
        onVote={(delta) => {
          if (selected) vote(selected.id, delta);
        }}
        onUpdatePlace={(next) => {
          setPlaces((prev) => prev.map((p) => (p.id === next.id ? normalizePlace(next) : p)));
        }}
        onScene={setActiveScene}
        onSelectPlace={(id) => {
          const hit = places.find((p) => p.id === id);
          if (!hit) return;
          setSelectedId(id);
          mapRef.current?.flyTo([hit.lat, hit.lng], Math.max(mapRef.current.getZoom(), 15), {
            duration: 0.7,
          });
        }}
        onNewScene={startNewScene}
      />

      {dropMode ? (
        <div className="pointer-events-none absolute left-1/2 top-[max(1.25rem,env(safe-area-inset-top))] z-[600] -translate-x-1/2 rounded-full bg-[rgba(28,24,21,0.92)] px-4 py-2 text-[13px] text-[#ebe4da] ring-1 ring-[rgba(232,132,58,0.45)]">
          Tap a street to claim it · 1 pin / day
        </div>
      ) : null}

      {formError && !draft && !selected ? (
        <div className="pointer-events-none absolute left-1/2 top-[max(1.25rem,env(safe-area-inset-top))] z-[600] max-w-[min(90vw,22rem)] -translate-x-1/2 rounded-full bg-[rgba(28,24,21,0.95)] px-4 py-2 text-center text-[13px] text-[#e8a090] ring-1 ring-[rgba(232,132,58,0.35)]">
          {formError}
        </div>
      ) : null}

      {/* Date / time — desktop only */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden text-[12px] text-[rgba(235,228,218,0.55)] lg:block lg:left-5">
        <div>
          {clock.date} / {clock.time}
          {geoBusy ? ' · locating…' : ''}
        </div>
        {pinLocked ? <div className="mt-0.5 text-[11px] text-[rgba(232,132,58,0.75)]">pin used today</div> : null}
      </div>

      {selected && !draft ? (
        <MapPlaceCard
          place={selected}
          scene={byId[selected.scene] || BUILTIN_SCENES[0]}
          onClose={() => setSelectedId(null)}
          onVote={(delta) => vote(selected.id, delta)}
          author={
            user
              ? {
                  id: user.id,
                  name:
                    getProfile(user.id)?.username ||
                    getProfile(user.id)?.displayName ||
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] ||
                    'Mapper',
                }
              : null
          }
          onUpdate={(next) => {
            setPlaces((prev) => prev.map((p) => (p.id === next.id ? normalizePlace(next) : p)));
          }}
        />
      ) : null}

      {/* Compose card only while dropping */}
      {draft ? (
        <div className="pointer-events-auto absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[630] w-auto overflow-hidden rounded-2xl bg-[rgba(28,24,21,0.97)] p-4 ring-1 ring-[rgba(235,228,218,0.12)] sm:inset-x-auto sm:right-5 sm:bottom-4 sm:w-[min(340px,calc(100vw-1.5rem))]">
          <div className="mb-3 text-[11px] uppercase tracking-[0.16em] text-[rgba(235,228,218,0.45)]">
            Claim this street
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Name this spot"
            className="mb-2 w-full rounded-xl border border-[rgba(235,228,218,0.12)] bg-[#161311] px-3 py-2 text-[14px] outline-none placeholder:text-[rgba(235,228,218,0.35)]"
          />
          <select
            value={form.scene}
            onChange={(e) => setForm((f) => ({ ...f, scene: e.target.value }))}
            className="mb-2 w-full rounded-xl border border-[rgba(235,228,218,0.12)] bg-[#161311] px-3 py-2 text-[14px] outline-none"
          >
            {ranked.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <textarea
            value={form.review}
            onChange={(e) => setForm((f) => ({ ...f, review: e.target.value }))}
            placeholder="What’s the vibe here…"
            rows={3}
            className="mb-2 w-full resize-none rounded-xl border border-[rgba(235,228,218,0.12)] bg-[#161311] px-3 py-2 text-[14px] outline-none placeholder:text-[rgba(235,228,218,0.35)]"
          />
          {formError ? <p className="mb-2 text-[12px] text-[#e8a090]">{formError}</p> : null}
          <p className="mb-3 text-[11px] text-[rgba(235,228,218,0.45)]">
            Same scene within ~90m merges. Nearby different scenes battle for the block.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="h-10 flex-1 rounded-full border border-[rgba(235,228,218,0.14)] text-[13px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitDraft()}
              disabled={!form.title.trim() || !form.review.trim()}
              className="h-10 flex-1 rounded-full text-[13px] font-medium text-[#161311] disabled:opacity-40"
              style={{ background: (byId[form.scene] || BUILTIN_SCENES[0]).color }}
            >
              Pin it
            </button>
          </div>
        </div>
      ) : null}

      {showProfileSetup && user ? (
        <MapProfileSetup user={user} onDone={() => setProfileTick((n) => n + 1)} />
      ) : null}

      {creatingScene ? (
        <div className="pointer-events-auto absolute inset-0 z-[700] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1c1815] p-5 ring-1 ring-[rgba(235,228,218,0.14)]">
            <div className="text-[18px]" style={{ fontFamily: 'var(--map-serif)' }}>
              New scene
            </div>
            <p className="mt-1 text-[12px] text-[rgba(235,228,218,0.5)]">
              Keep it clean. It goes live on the map right away.
            </p>
            <input
              value={newSceneLabel}
              onChange={(e) => setNewSceneLabel(e.target.value)}
              placeholder="e.g. Yacht Kids"
              className="mt-4 w-full rounded-xl border border-[rgba(235,228,218,0.12)] bg-[#161311] px-3 py-2 text-[14px] outline-none"
              autoFocus
            />
            {sceneError ? <p className="mt-2 text-[12px] text-[#e8a090]">{sceneError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreatingScene(false);
                  setNewSceneLabel('');
                  setSceneError('');
                }}
                className="h-10 flex-1 rounded-full border border-[rgba(235,228,218,0.14)] text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createScene}
                disabled={!newSceneLabel.trim()}
                className="h-10 flex-1 rounded-full text-[13px] font-medium text-[#161311] disabled:opacity-40"
                style={{ background: 'var(--map-orange)' }}
              >
                Create scene
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[rgba(235,228,218,0.4)]">
              Top {Math.min(10, ranked.length)} scenes by votes show first
              {ranked.length ? ` · leader: ${ranked[0]?.label} (${sceneVoteTotal(places, ranked[0].id)})` : ''}.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s7-5.2 7-12a7 7 0 10-14 0c0 6.8 7 12 7 12z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}
