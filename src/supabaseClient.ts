import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

/**
 * Set these in `.env.local`:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=sb_publishable_...   (or legacy eyJ anon JWT)
 *
 * Never put sb_secret_ / service_role keys in VITE_* vars.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const supabaseUrl = url.replace(/\/+$/, '');
export const supabaseAnonKey = anon;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const REMEMBER_ME_KEY = 'hireodds_remember_me';

export function readRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function memoryStorage(): SupportedStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function activeBrowserStorage(): Storage {
  try {
    return readRememberMe() ? window.localStorage : window.sessionStorage;
  } catch {
    return window.localStorage;
  }
}

const rememberAwareStorage: SupportedStorage =
  typeof window === 'undefined'
    ? memoryStorage()
    : {
        getItem: (key) => {
          try {
            return activeBrowserStorage().getItem(key) ?? window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            const store = activeBrowserStorage();
            store.setItem(key, value);
            const other = store === window.localStorage ? window.sessionStorage : window.localStorage;
            other.removeItem(key);
          } catch {
            /* ignore */
          }
        },
        removeItem: (key) => {
          try {
            window.localStorage.removeItem(key);
            window.sessionStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        },
      };

function createPlaceholderClient(): SupabaseClient {
  return createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: rememberAwareStorage,
      },
    })
  : createPlaceholderClient();
