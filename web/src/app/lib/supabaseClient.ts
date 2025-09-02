import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "app/types/supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Visible en consola del navegador en runtime si faltan variables
  console.error("[Supabase] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Cliente del navegador tipado con nuestra BD (no-null)
export const supabase = createBrowserClient<Database>(url!, anon!);
