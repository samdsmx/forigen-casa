import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Visible en consola del navegador en runtime si faltan variables
  console.error("[Supabase] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Singleton del cliente del navegador
let browserClient: ReturnType<typeof createBrowserClient> | null = null;
export const supabase = (() => {
  if (!browserClient) {
    browserClient = createBrowserClient(url!, anon!);
  }
  return browserClient;
})();
