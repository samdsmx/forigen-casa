"use client";
import { supabase } from "./supabaseClient";

// Ensures the browser client has a valid session. If not, fetch from SSR and set it.
export async function ensureClientSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const clientHasUser = Boolean(session?.user);

    // Get server-truth user to detect mismatches or expired client sessions
    // We use a timeout to prevent the UI from hanging if the server is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    let me = null;
    try {
      const meRes = await fetch('/api/auth/me?basic=true', {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      me = await meRes.json().catch(() => null);
    } catch (e) {
      // If server check fails or times out, but we have a client session,
      // we'll assume the client session is valid for now to unblock the UI.
      // Ideally we would want to retry in background, but preventing the hang is priority.
      if (clientHasUser) return true;
      return false;
    }

    const targetHasUser = Boolean(me?.user);
    const sameUser = clientHasUser && targetHasUser && session!.user!.email === me.user.email;

    // If client has no user, or user mismatch, or token likely expired, hydrate from SSR
    if (!clientHasUser || !sameUser) {
      // If we are here, it means either:
      // 1. Client has no session
      // 2. Server says we have a different user (mismatch)
      // 3. Server says we have no user (targetHasUser is false)

      // If server says no user, but client has user, it means session is invalid on server.
      // We should probably sign out or refresh.

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
