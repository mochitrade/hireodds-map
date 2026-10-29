import { isSupabaseConfigured, supabase } from '../../supabaseClient';

export type ClarvyWaitlistRole = 'student' | 'firm' | 'unknown';

/** Persist a Clarvy waitlist email. Returns null on success, error message otherwise. */
export async function joinClarvyWaitlist(
  emailRaw: string,
  opts: { role?: ClarvyWaitlistRole; source?: string } = {},
): Promise<string | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  if (!isSupabaseConfigured) {
    return 'Waitlist is temporarily unavailable. Email us directly.';
  }

  const role = opts.role ?? 'unknown';
  const source = opts.source ?? 'site';

  const { error } = await supabase.from('clarvy_waitlist').insert({ email, role, source });

  if (error) {
    // Already on the list
    if (error.code === '23505') return null;
    console.error('[clarvy waitlist]', error);
    return 'Could not join the waitlist. Try again in a moment.';
  }
  return null;
}
