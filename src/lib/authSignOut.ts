import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { clearAuthReturnTo } from './authReturnTo';

/** Remove leftover Supabase auth keys if signOut did not finish cleanly. */
function clearSupabaseAuthStorage() {
  const scrub = (store: Storage) => {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key) continue;
        if (key.startsWith('sb-') || key.includes('supabase.auth')) toRemove.push(key);
      }
      for (const key of toRemove) store.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  scrub(localStorage);
  scrub(sessionStorage);
}

/**
 * Fully clear the Supabase session, then navigate.
 * Must await signOut before leaving the page — otherwise localStorage still
 * has tokens and /auth will bounce the user back into the app as if signed in.
 */
export async function signOutAndRedirect(to: string = '/') {
  clearAuthReturnTo();
  if (isSupabaseConfigured) {
    try {
      // Prefer local scope so logout succeeds even if the network call fails.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* ignore — still clear storage + redirect */
    }
    clearSupabaseAuthStorage();
  }
  // Hard navigation so App remounts with a clean session check.
  window.location.assign(to);
}
