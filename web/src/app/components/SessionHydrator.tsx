"use client";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SessionHydrator() {
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!active) return;
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.access_token && data?.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
        }
      } catch {}
    })();
    return () => { active = false; };
  }, []);
  return null;
}

