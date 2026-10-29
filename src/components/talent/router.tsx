import React, { useEffect, useState } from 'react';

/** Clarvy serves at site root. Legacy `/talent/*` URLs still resolve. */
export const BASE = '';
const LEGACY_BASE = '/talent';

export function currentPath(): string {
  let p = window.location.pathname.replace(/\/+$/, '') || '/';
  if (p === LEGACY_BASE || p.startsWith(`${LEGACY_BASE}/`)) {
    p = p.slice(LEGACY_BASE.length) || '/';
  }
  return p.startsWith('/') ? p : `/${p}`;
}

export function currentHash(): string {
  return window.location.hash.replace(/^#/, '');
}

const listeners = new Set<() => void>();

function scrollRoot(top: number, behavior: ScrollBehavior = 'auto') {
  window.scrollTo({ top, behavior });
  document.querySelector('.tb-root')?.scrollTo({ top, behavior });
}

function toHref(path: string, hash = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const basePath = clean === '/' ? '/' : `${BASE}${clean}`;
  return hash ? `${basePath}#${hash}` : basePath;
}

/** Smooth-scroll to an in-page section, accounting for sticky nav. */
export function scrollToHash(hash: string, behavior: ScrollBehavior = 'smooth') {
  const id = hash.replace(/^#/, '');
  if (!id) {
    scrollRoot(0, behavior);
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  const root = document.querySelector('.tb-root') as HTMLElement | null;
  const nav = document.querySelector('.db-nav-wrap') as HTMLElement | null;
  const offset = (nav?.offsetHeight ?? 52) + 12;
  if (root) {
    const rootTop = root.getBoundingClientRect().top;
    const y = el.getBoundingClientRect().top - rootTop + root.scrollTop - offset;
    root.scrollTo({ top: Math.max(0, y), behavior });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior });
  }
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const [pathPart, hashPart] = to.split('#');
  const path = pathPart || '/';
  const hash = hashPart || '';
  const fullPath = toHref(path);
  const full = hash ? `${fullPath}#${hash}` : fullPath;
  const samePath =
    (window.location.pathname.replace(/\/+$/, '') || '/') === (fullPath.replace(/\/+$/, '') || '/');

  if (samePath && hash) {
    if (opts.replace) window.history.replaceState(null, '', full);
    else window.history.pushState(null, '', full);
    listeners.forEach((l) => l());
    requestAnimationFrame(() => scrollToHash(hash, 'smooth'));
    return;
  }

  if (samePath && !hash) {
    scrollRoot(0);
    return;
  }

  if (opts.replace) window.history.replaceState(null, '', full);
  else window.history.pushState(null, '', full);
  listeners.forEach((l) => l());

  if (hash) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToHash(hash, 'smooth'));
    });
  } else {
    scrollRoot(0);
  }
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const sync = () => setPath(currentPath());
    listeners.add(sync);
    window.addEventListener('popstate', sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  return path;
}

export function Link({
  to,
  children,
  className,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const [pathPart, hashPart] = to.split('#');
  const path = pathPart || '/';
  const href = toHref(path, hashPart || '');
  return (
    <a
      {...rest}
      href={href}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
