/** Persist where auth should return after login. */
const KEY = 'hireodds_auth_return_to';

export function writeAuthReturnTo(path: string) {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* ignore */
  }
}

export function readAuthReturnTo(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearAuthReturnTo() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Supabase OAuth redirect — land back on the map. */
export function oauthRedirectTo(fallbackPath = '/'): string {
  const origin =
    typeof window === 'undefined'
      ? 'http://localhost:3010'
      : window.location.origin.replace(/\/$/, '');
  let path = fallbackPath;
  try {
    const ret = sessionStorage.getItem(KEY);
    if (ret && ret.startsWith('/') && !ret.startsWith('//')) {
      path = ret.split('?')[0] || fallbackPath;
    }
  } catch {
    /* ignore */
  }
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
