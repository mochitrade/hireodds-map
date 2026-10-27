import React, { useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getProfile,
  normalizeUsername,
  upsertProfile,
  usernameAvailability,
} from '../lib/mapSocial';

const MAX_AVATAR = 120_000;

async function fileToAvatar(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const bitmap = await createImageBitmap(file);
  const max = 512;
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
  let q = 0.78;
  let out = canvas.toDataURL('image/jpeg', q);
  while (out.length > MAX_AVATAR && q > 0.4) {
    q -= 0.1;
    out = canvas.toDataURL('image/jpeg', q);
  }
  return out.length > MAX_AVATAR * 1.3 ? null : out;
}

export function MapProfileSetup({
  user,
  onDone,
}: {
  user: User;
  onDone: () => void;
}) {
  const existing = getProfile(user.id);
  const googleAvatar =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined;
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [username, setUsername] = useState(
    () => existing?.username || normalizeUsername(user.email?.split('@')[0] || ''),
  );
  const [avatar, setAvatar] = useState<string | null>(
    () => existing?.avatarUrl || googleAvatar || null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const check = useMemo(
    () => usernameAvailability(username, user.id),
    [username, user.id],
  );

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const url = await fileToAvatar(file);
      if (!url) setErr('Couldn’t use that photo — try a smaller one.');
      else setAvatar(url);
    } catch {
      setErr('Couldn’t read that photo.');
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function save() {
    setErr('');
    if (!check.ok) {
      setErr(check.reason || 'Pick another username');
      return;
    }
    if (!avatar) {
      setErr('Add a profile picture');
      return;
    }
    const u = normalizeUsername(username);
    upsertProfile({
      userId: user.id,
      email: user.email || '',
      username: u,
      displayName: u,
      avatarUrl: avatar,
      createdAt: existing?.createdAt || Date.now(),
      setupComplete: true,
    });
    onDone();
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-[800] flex items-end justify-center bg-black/55 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:items-center sm:pb-10">
      <div className="w-full max-w-sm overflow-hidden rounded-[22px] bg-[#1c1815] text-[#ebe4da] shadow-2xl ring-1 ring-[rgba(235,228,218,0.12)]">
        <div className="px-5 pb-2 pt-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[rgba(235,228,218,0.45)]">
            Welcome
          </div>
          <h2 className="mt-1 text-[24px] leading-tight" style={{ fontFamily: 'var(--map-serif)' }}>
            Set up your profile
          </h2>
          <p className="mt-1.5 text-[13px] text-[rgba(235,228,218,0.55)]">
            Pick a username and photo. That’s it.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-[#161311] ring-2 ring-[rgba(235,228,218,0.14)]"
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[13px] text-[rgba(235,228,218,0.45)]">Add photo</span>
            )}
            <span className="absolute bottom-1 right-1 rounded-full bg-[#e8843a] px-2 py-0.5 text-[10px] font-semibold text-[#161311]">
              Edit
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPick(e.target.files)}
          />
          {googleAvatar && avatar !== googleAvatar ? (
            <button
              type="button"
              className="text-[12px] text-[rgba(235,228,218,0.45)] underline-offset-2 hover:underline"
              onClick={() => setAvatar(googleAvatar)}
            >
              Use Google photo
            </button>
          ) : null}
        </div>

        <div className="px-5 pb-5">
          <label className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-[rgba(235,228,218,0.4)]">
            Username
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-[rgba(235,228,218,0.12)] bg-[#161311] px-3 py-2.5">
            <span className="text-[15px] text-[rgba(235,228,218,0.35)]">@</span>
            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))
              }
              placeholder="yourname"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[rgba(235,228,218,0.3)]"
            />
          </div>
          <p
            className={`mt-2 text-[12px] ${
              !username.trim()
                ? 'text-[rgba(235,228,218,0.4)]'
                : check.ok
                  ? 'text-[#6fce7e]'
                  : 'text-[#e8a090]'
            }`}
          >
            {!username.trim()
              ? 'Letters, numbers, underscore · min 3'
              : check.ok
                ? `@${normalizeUsername(username)} is available`
                : check.reason}
          </p>
          {err ? <p className="mt-1 text-[12px] text-[#e8a090]">{err}</p> : null}

          <button
            type="button"
            disabled={busy || !check.ok || !avatar}
            onClick={save}
            className="mt-5 h-11 w-full rounded-full text-[14px] font-medium text-[#161311] disabled:opacity-40"
            style={{ background: 'var(--map-orange, #e8843a)' }}
          >
            {busy ? '…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
