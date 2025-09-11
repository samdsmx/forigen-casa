import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "app/types/supabase";

// Prefer build-time env, but fall back to runtime injected globals to handle stale chunks
const runtimeEnv = (typeof window !== 'undefined' && (window as any).__PUB_ENV) || {};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || runtimeEnv.SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeEnv.SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Visible en consola del navegador en runtime si faltan variables
  console.error("[Supabase] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (build/runtime)");
}

// Derive a stable storage key to avoid collisions with legacy keys
let storageKey: string | undefined = undefined;
try {
  if (url) {
    const ref = new URL(url).hostname.split(".")[0];
    storageKey = `sb-${ref}-auth-token`;
  }
} catch {}

// Cliente del navegador tipado con nuestra BD (no-null)
export const supabase = createBrowserClient<Database>(url!, anon!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey,
  },
});
