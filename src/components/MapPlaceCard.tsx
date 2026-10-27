import React, { useMemo, useRef, useState } from 'react';
import {
  BUILTIN_SCENES,
  influenceRadiusM,
  isCleanText,
  mapSnapshotUrl,
  newCommentId,
  placeCommentCount,
  placeShareUrl,
  type PlaceComment,
  type SceneDef,
  type ScenePlace,
} from '../lib/sceneMap';

const MAX_PHOTO_BYTES = 180_000;

async function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const bitmap = await createImageBitmap(file);
  const max = 960;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let quality = 0.72;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > MAX_PHOTO_BYTES && quality > 0.35) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out.length > MAX_PHOTO_BYTES * 1.4 ? null : out;
}

export type PlaceAuthor = { id: string; name: string } | null | undefined;

/** Shared place body — used by desktop card + mobile sheet */
export function MapPlaceDetail({
  place,
  scene,
  onVote,
  onUpdate,
  author,
  embedded,
}: {
  place: ScenePlace;
  scene: SceneDef;
  onVote: (delta: number) => void;
  onUpdate: (next: ScenePlace) => void;
  author?: PlaceAuthor;
  /** Inside mobile sheet — title lives in the sheet chrome */
  embedded?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photoIx, setPhotoIx] = useState(0);
  const [text, setText] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const gallery = useMemo(() => {
    const userPhotos = place.photos || [];
    const snap = mapSnapshotUrl(place.lat, place.lng);
    if (!userPhotos.length) return [snap];
    return [...userPhotos, snap];
  }, [place.photos, place.lat, place.lng]);

  const comments = [...(place.comments || [])].sort((a, b) => {
    const lb = (b.likes || []).length - (a.likes || []).length;
    if (lb !== 0) return lb;
    return b.createdAt - a.createdAt;
  });
  const commentCount = placeCommentCount(place);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    if (!author?.id) {
      setError('Sign in to attach photos.');
      return;
    }
    setBusy(true);
    setError('');
    const next: string[] = [...pendingPhotos];
    for (const file of Array.from(files).slice(0, 4)) {
      try {
        const url = await fileToDataUrl(file);
        if (url) next.push(url);
        else setError('Photo too large — try a smaller one.');
      } catch {
        setError('Could not read that photo.');
      }
    }
    setPendingPhotos(next.slice(0, 6));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function submitComment() {
    setError('');
    if (!author?.id) {
      setError('Sign in with Google to comment.');
      return;
    }
    if (!isCleanText(text) || !isCleanText(author.name)) {
      setError('Keep it clean — no weird stuff.');
      return;
    }

    const comment: PlaceComment = {
      id: newCommentId(),
      name: author.name.trim().slice(0, 40),
      text: text.trim(),
      photos: pendingPhotos,
      createdAt: Date.now(),
      authorId: author.id,
      likes: [],
    };

    const photos = [...(place.photos || []), ...pendingPhotos].slice(0, 24);
    onUpdate({
      ...place,
      photos,
      comments: [comment, ...(place.comments || [])],
    });
    setText('');
    setPendingPhotos([]);
  }

  function toggleLike(commentId: string) {
    if (!author?.id) {
      setError('Sign in to like comments.');
      return;
    }
    onUpdate({
      ...place,
      comments: (place.comments || []).map((c) => {
        if (c.id !== commentId) return c;
        const likes = [...(c.likes || [])];
        const ix = likes.indexOf(author.id);
        if (ix >= 0) likes.splice(ix, 1);
        else likes.push(author.id);
        return { ...c, likes };
      }),
    });
  }

  async function sharePlace() {
    const link = placeShareUrl(place.id);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    onUpdate({
      ...place,
      shares: (place.shares || 0) + 1,
    });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function addPhotosOnly(files: FileList | null) {
    if (!files?.length) return;
    if (!author?.id) {
      setError('Sign in to add photos.');
      return;
    }
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const url = await fileToDataUrl(file);
      if (url) added.push(url);
    }
    if (added.length) {
      onUpdate({
        ...place,
        photos: [...(place.photos || []), ...added].slice(0, 24),
      });
      setPhotoIx(0);
    }
    setBusy(false);
  }

  return (
    <div>
      <div className={`relative shrink-0 overflow-hidden bg-[#161311] ${embedded ? 'h-36 rounded-xl' : 'h-44 sm:h-52'}`}>
        <img
          src={gallery[Math.min(photoIx, gallery.length - 1)]}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = '0.35';
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, rgba(28,24,21,0.92), transparent 45%), linear-gradient(135deg, ${scene.color}33, transparent 50%)`,
          }}
        />
        {gallery.length > 1 ? (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {gallery.slice(0, 8).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPhotoIx(i)}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i === photoIx ? '#ebe4da' : 'rgba(235,228,218,0.35)' }}
              />
            ))}
          </div>
        ) : null}
        <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-black/55 px-3 py-1 text-[11px] text-[#ebe4da] ring-1 ring-white/15">
          {busy ? '…' : '+ Photo'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void addPhotosOnly(e.target.files)}
          />
        </label>
      </div>

      <div className="pt-3">
        {!embedded ? (
          <>
            <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: scene.color }}>
              {scene.label}
            </div>
            <h2 className="mt-0.5 text-[20px] leading-tight" style={{ fontFamily: 'var(--map-serif)' }}>
              {place.title}
            </h2>
            <p className="mt-1 text-[12px] text-[rgba(235,228,218,0.5)]">
              {place.address} · {place.city}
              {place.authorName ? ` · by ${place.authorName}` : ''}
            </p>
          </>
        ) : (
          <p className="text-[12px] text-[rgba(235,228,218,0.5)]">
            {place.address}
            {place.authorName ? ` · by ${place.authorName}` : ''}
          </p>
        )}
        <p className="mt-1 text-[12px] text-[rgba(235,228,218,0.45)]">
          {place.votes} upvotes · {place.shares || 0} shares · {commentCount} comment
          {commentCount === 1 ? '' : 's'} · ~{Math.round(influenceRadiusM(place.votes))}m
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onVote(1)}
            className="h-9 flex-1 rounded-full text-[13px] font-medium text-[#161311]"
            style={{ background: 'var(--map-orange)' }}
          >
            Upvote · {place.votes}
          </button>
          <button
            type="button"
            onClick={() => void sharePlace()}
            className="h-9 flex-1 rounded-full border border-[rgba(235,228,218,0.14)] text-[13px] font-medium"
          >
            {copied ? 'Copied' : `Share · ${place.shares || 0}`}
          </button>
          <button
            type="button"
            onClick={() => onVote(-1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(235,228,218,0.14)] text-[16px]"
          >
            −
          </button>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[rgba(235,228,218,0.85)]">
          {place.review}
        </p>

        <div className="mt-5 border-t border-[rgba(235,228,218,0.1)] pt-4">
          <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(235,228,218,0.45)]">
            Discussion
          </div>

          <div className="mb-3 space-y-3">
            {comments.length ? (
              comments.map((c) => {
                const liked = author?.id ? (c.likes || []).includes(author.id) : false;
                const likeCount = (c.likes || []).length;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl bg-[#161311]/70 p-3 ring-1 ring-[rgba(235,228,218,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium">{c.name}</span>
                      <span className="text-[10px] text-[rgba(235,228,218,0.35)]">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[rgba(235,228,218,0.8)]">
                      {c.text}
                    </p>
                    {c.photos?.length ? (
                      <div className="mt-2 flex gap-1.5 overflow-x-auto">
                        {c.photos.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            onClick={() => {
                              const ix = (place.photos || []).indexOf(src);
                              if (ix >= 0) setPhotoIx(ix);
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleLike(c.id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ring-1"
                      style={{
                        color: liked ? '#e8843a' : 'rgba(235,228,218,0.55)',
                        borderColor: liked ? 'rgba(232,132,58,0.45)' : 'rgba(235,228,218,0.12)',
                        background: liked ? 'rgba(232,132,58,0.12)' : 'transparent',
                      }}
                    >
                      ▲ {likeCount}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-[13px] text-[rgba(235,228,218,0.45)]">
                No comments yet — start the thread.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[rgba(235,228,218,0.12)] bg-[#161311] p-3">
            {author?.id ? (
              <div className="mb-2 text-[11px] text-[rgba(235,228,218,0.45)]">
                Posting as <span className="text-[#ebe4da]">{author.name}</span>
              </div>
            ) : null}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={author?.id ? 'Join the discussion…' : 'Sign in to comment'}
              rows={3}
              disabled={!author?.id}
              className="w-full resize-none rounded-lg border border-[rgba(235,228,218,0.1)] bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-[rgba(235,228,218,0.35)] disabled:opacity-50"
            />
            {pendingPhotos.length ? (
              <div className="mt-2 flex gap-1.5 overflow-x-auto">
                {pendingPhotos.map((src, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-black text-[10px]"
                      onClick={() => setPendingPhotos((p) => p.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {error ? <p className="mt-1 text-[12px] text-[#e8a090]">{error}</p> : null}
            <div className="mt-2 flex gap-2">
              <label
                className={`flex h-9 flex-1 items-center justify-center rounded-full border border-[rgba(235,228,218,0.14)] text-[12px] ${author?.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
              >
                Add photos
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!author?.id}
                  className="hidden"
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
              </label>
              <button
                type="button"
                onClick={submitComment}
                disabled={!text.trim() || busy || !author?.id}
                className="h-9 flex-[1.4] rounded-full text-[12px] font-medium text-[#161311] disabled:opacity-40"
                style={{ background: scene.color || BUILTIN_SCENES[0].color }}
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapPlaceCard({
  place,
  scene,
  onClose,
  onVote,
  onUpdate,
  author,
}: {
  place: ScenePlace;
  scene: SceneDef;
  onClose: () => void;
  onVote: (delta: number) => void;
  onUpdate: (next: ScenePlace) => void;
  author?: PlaceAuthor;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-5 z-[600] hidden max-h-[min(78dvh,640px)] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl bg-[rgba(28,24,21,0.98)] ring-1 ring-[rgba(235,228,218,0.12)] lg:flex">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-[18px] text-white"
        aria-label="Close"
      >
        ×
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-0">
        <MapPlaceDetail place={place} scene={scene} onVote={onVote} onUpdate={onUpdate} author={author} />
      </div>
    </div>
  );
}
