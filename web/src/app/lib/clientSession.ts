"use client";
import { supabase } from "./supabaseClient";

// Ensures the browser client has a valid session. If not, fetch from SSR and set it.
export async function ensureClientSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && session?.user) return true;
    // Try to hydrate from server cookies
    const res = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (!data?.access_token || !data?.refresh_token) return false;
    const { data: setData, error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return Boolean(setData?.session?.user) && !error;
  } catch {
    return false;
  }
}

