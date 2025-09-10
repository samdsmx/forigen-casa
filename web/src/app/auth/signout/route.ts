import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "app/types/supabase";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  type CookieOp = { type: "set" | "remove"; name: string; value?: string; options?: any };
  const ops: CookieOp[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          ops.push({ type: "set", name, value, options: { path: "/", sameSite: "lax", secure: true, ...options } });
        },
        remove(name, options) {
          ops.push({ type: "remove", name, options: { path: "/", maxAge: 0, ...options } });
        },
      },
    }
  );

  await supabase.auth.signOut();

  const target = new URL(request.url);
  target.pathname = "/login";
  target.search = "";
  const res = NextResponse.redirect(target);
  for (const op of ops) {
    if (op.type === "set") res.cookies.set({ name: op.name, value: op.value!, ...op.options });
    else res.cookies.set({ name: op.name, value: "", ...op.options });
  }
  return res;
}
