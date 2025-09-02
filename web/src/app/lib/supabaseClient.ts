import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "app/types/supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Visible en consola del navegador en runtime si faltan variables
  console.error("[Supabase] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Singleton del cliente del navegador tipado con nuestra BD
let browserClient: SupabaseClient<Database> | null = null;
export const supabase = (() => {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url!, anon!);
  }
  return browserClient;
})();
