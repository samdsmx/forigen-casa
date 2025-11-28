"use client";
import { supabase } from "./supabaseClient";

// Ensures the browser client has a valid session. If not, fetch from SSR and set it.
export async function ensureClientSession(): Promise<boolean> {
  try {
    // Get server-truth user to detect mismatches or expired client sessions
    const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
    // if (!meRes.ok) return false; // Let's not fail the whole app if this fails
    const me = await meRes.json().catch(() => null);
    const targetHasUser = Boolean(me?.user);

    const { data: { session } } = await supabase.auth.getSession();
    const clientHasUser = Boolean(session?.user);
    const sameUser = clientHasUser && targetHasUser && session!.user!.email === me.user.email;

    // If client has no user, or user mismatch, or token likely expired, hydrate from SSR
    if (!clientHasUser || !sameUser) {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      if (!data?.access_token || !data?.refresh_token) return false;
      const { data: setData, error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return Boolean(setData?.session?.user) && !error;
    }

    return true;
  } catch (e) {
    return false;
  }
}
