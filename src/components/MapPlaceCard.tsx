import React, { useMemo, useRef, useState } from 'react';
import {
  BUILTIN_SCENES,
  commentTimeAgo,
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
import { getProfile } from '../lib/mapSocial';

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photoIx, setPhotoIx] = useState(0);
  const [text, setText] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyTo, setReplyTo] = useState<PlaceComment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const gallery = useMemo(() => {
    const userPhotos = place.photos || [];
    const snap = mapSnapshotUrl(place.lat, place.lng);
    if (!userPhotos.length) return [snap];
    return [...userPhotos, snap];
  }, [place.photos, place.lat, place.lng]);

  const allComments = place.comments || [];
  const roots = useMemo(() => {
    return allComments
      .filter((c) => !c.parentId)
      .sort((a, b) => {
        const lb = (b.likes || []).length - (a.likes || []).length;
        if (lb !== 0) return lb;
        return b.createdAt - a.createdAt;
      });
  }, [allComments]);

  const repliesByParent = useMemo(() => {
    const map: Record<string, PlaceComment[]> = {};
    for (const c of allComments) {
      if (!c.parentId) continue;
      (map[c.parentId] ||= []).push(c);
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => a.createdAt - b.createdAt);
    }
    return map;
  }, [allComments]);

  const commentCount = placeCommentCount(place);
  const authorAvatar =
    author?.id ? getProfile(author.id)?.avatarUrl || null : null;

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
      parentId: replyTo?.id || null,
    };

    const photos = [...(place.photos || []), ...pendingPhotos].slice(0, 24);
    onUpdate({
      ...place,
      photos,
      comments: [comment, ...(place.comments || [])],
    });
    if (replyTo) {
      setExpandedReplies((prev) => ({ ...prev, [replyTo.id]: true }));
    }
    setText('');
    setPendingPhotos([]);
    setReplyTo(null);
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

  function startReply(c: PlaceComment) {
    if (!author?.id) {
      setError('Sign in to reply.');
      return;
    }
    // Instagram: replies hang under the root comment, with @mention
    const root =
      c.parentId ? allComments.find((x) => x.id === c.parentId) || c : c;
    setReplyTo(root);
    setText(`@${c.name} `);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function avatarFor(c: PlaceComment) {
    const url = c.authorId ? getProfile(c.authorId)?.avatarUrl : null;
    const initial = (c.name || '?').slice(0, 1).toUpperCase();
    if (url) {
      return (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <span className="grid h-full w-full place-items-center text-[11px] font-semibold text-[rgba(235,228,218,0.7)]">
        {initial}
      </span>
    );
  }

  function CommentRow({ c, depth = 0 }: { c: PlaceComment; depth?: number }) {
    const liked = author?.id ? (c.likes || []).includes(author.id) : false;
    const likeCount = (c.likes || []).length;
    const kids = repliesByParent[c.id] || [];
    const showKids = expandedReplies[c.id] ?? kids.length > 0;
    return (
      <div className={depth ? 'mt-3' : ''}>
        <div className="flex gap-2.5">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#2a2520] ring-1 ring-[rgba(235,228,218,0.1)]">
            {avatarFor(c)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-[rgba(235,228,218,0.88)]">
              <span className="font-semibold text-[#ebe4da]">{c.name}</span>{' '}
              {c.text}
            </p>
            {c.photos?.length ? (
              <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
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
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-[rgba(235,228,218,0.4)]">
              <span>{commentTimeAgo(c.createdAt)}</span>
              {likeCount > 0 ? (
                <span>
                  {likeCount} like{likeCount === 1 ? '' : 's'}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => startReply(c)}
                className="hover:text-[rgba(235,228,218,0.75)]"
              >
                Reply
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleLike(c.id)}
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center self-start"
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} />
          </button>
        </div>

        {kids.length && depth === 0 ? (
          <div className="ml-[42px] mt-2">
            {!showKids ? (
              <button
                type="button"
                onClick={() => setExpandedReplies((p) => ({ ...p, [c.id]: true }))}
                className="flex items-center gap-2 text-[11px] font-medium text-[rgba(235,228,218,0.4)]"
              >
                <span className="h-px w-6 bg-[rgba(235,228,218,0.25)]" />
                View replies ({kids.length})
              </button>
            ) : (
              <>
                {kids.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedReplies((p) => ({ ...p, [c.id]: false }))}
                    className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[rgba(235,228,218,0.4)]"
                  >
                    <span className="h-px w-6 bg-[rgba(235,228,218,0.25)]" />
                    Hide replies
                  </button>
                ) : null}
                {kids.map((r) => (
                  <CommentRow key={r.id} c={r} depth={1} />
                ))}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
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
            ▲ Upvote · {place.votes}
          </button>
          <button
            type="button"
            onClick={() => onVote(-1)}
            className="h-9 flex-1 rounded-full border border-[rgba(235,228,218,0.14)] text-[13px] font-medium text-[rgba(235,228,218,0.85)]"
          >
            ▼ Downvote
          </button>
          <button
            type="button"
            onClick={() => void sharePlace()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(235,228,218,0.14)] text-[rgba(235,228,218,0.7)]"
            aria-label={copied ? 'Link copied' : 'Share'}
            title={copied ? 'Copied' : 'Share'}
          >
            {copied ? (
              <span className="text-[11px] font-semibold text-[#6fce7e]">✓</span>
            ) : (
              <ShareIcon />
            )}
          </button>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[rgba(235,228,218,0.85)]">
          {place.review}
        </p>

        <div className="mt-5 border-t border-[rgba(235,228,218,0.1)] pt-4">
          <div className="mb-3 text-[13px] font-semibold text-[#ebe4da]">
            Comments
            {commentCount ? (
              <span className="ml-1.5 font-normal text-[rgba(235,228,218,0.4)]">{commentCount}</span>
            ) : null}
          </div>

          <div className="mb-4 space-y-4">
            {roots.length ? (
              roots.map((c) => <CommentRow key={c.id} c={c} />)
            ) : (
              <p className="py-2 text-center text-[13px] text-[rgba(235,228,218,0.4)]">
                No comments yet.
              </p>
            )}
          </div>

          {replyTo ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#161311] px-2.5 py-1.5 text-[11px] text-[rgba(235,228,218,0.55)]">
              <span>
                Replying to <span className="font-semibold text-[#ebe4da]">@{replyTo.name}</span>
              </span>
              <button
                type="button"
                className="text-[rgba(235,228,218,0.45)] hover:text-[#ebe4da]"
                onClick={() => {
                  setReplyTo(null);
                  setText('');
                }}
              >
                Cancel
              </button>
            </div>
          ) : null}

          {pendingPhotos.length ? (
            <div className="mb-2 flex gap-1.5 overflow-x-auto">
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

          {error ? <p className="mb-2 text-[12px] text-[#e8a090]">{error}</p> : null}

          <div className="flex items-center gap-2.5 border-t border-[rgba(235,228,218,0.08)] pt-3">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#2a2520] ring-1 ring-[rgba(235,228,218,0.1)]">
              {authorAvatar ? (
                <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-[11px] font-semibold text-[rgba(235,228,218,0.55)]">
                  {(author?.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-[#161311] px-3.5 py-2 ring-1 ring-[rgba(235,228,218,0.1)]">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                placeholder={
                  author?.id
                    ? replyTo
                      ? `Reply to ${replyTo.name}…`
                      : 'Add a comment…'
                    : 'Sign in to comment'
                }
                disabled={!author?.id}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[rgba(235,228,218,0.35)] disabled:opacity-50"
              />
              <label
                className={`shrink-0 text-[16px] leading-none ${author?.id ? 'cursor-pointer text-[rgba(235,228,218,0.45)]' : 'cursor-not-allowed opacity-30'}`}
                title="Add photo"
              >
                ⊕
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
                className="shrink-0 text-[13px] font-semibold disabled:opacity-30"
                style={{ color: scene.color || BUILTIN_SCENES[0].color }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="18" cy="5" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="19" r="2.4" />
      <path d="M8.2 13.2l7.5 4.2M15.7 6.6l-7.5 4.2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#e8843a" aria-hidden>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(235,228,218,0.45)"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
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
