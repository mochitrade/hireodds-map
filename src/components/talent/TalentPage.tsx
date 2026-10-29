import React, { useEffect } from 'react';
import { MarketingShell } from './MarketingPages';
import { clearSession } from './session';
import { navigate, useRoute } from './router';
import './talent.css';

const BLOCKED = new Set(['/app', '/onboarding', '/signup']);

/**
 * Public Clarvy site — marketing + waitlist only.
 * Dashboard / demo / Skip onboarding are intentionally unreachable.
 */
export default function TalentPage() {
  const path = useRoute();

  useEffect(() => {
    clearSession();
    try {
      sessionStorage.removeItem('clarvy_session_v1');
      localStorage.removeItem('clarvy.demo');
      localStorage.removeItem('clarvy.role');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (path === '/app' || path.startsWith('/app/') || BLOCKED.has(path)) {
      navigate(path === '/signup' || path.startsWith('/app') ? '/login' : '/', { replace: true });
      return;
    }
    if (path === '/signup/firm') {
      navigate('/book-demo', { replace: true });
    }
  }, [path]);

  const safePath =
    path === '/app' || path.startsWith('/app/') || BLOCKED.has(path)
      ? '/login'
      : path === '/signup/firm'
        ? '/book-demo'
        : path;

  return (
    <div className="tb-root">
      <MarketingShell
        path={safePath}
        session={null}
        onAuth={() => navigate('/login')}
      />
    </div>
  );
}
