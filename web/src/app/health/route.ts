import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "app/types/supabase";

export async function GET(request: Request) {
  const cookieStore = cookies();

  // Capture cookie set/remove operations so we can apply them on the response
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

  const access = cookieStore.get("sb-access-token");
  const refresh = cookieStore.get("sb-refresh-token");

  let userEmail: string | null = null;
  let userId: string | null = null;
  let error: string | null = null;

  try {
    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr) error = uerr.message;
    userEmail = user?.email ?? null;
    userId = user?.id ?? null;
  } catch (e: any) {
    error = e?.message || String(e);
  }

  const payload = {
    ok: true,
    url: new URL(request.url).pathname,
    env: {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    cookiesPresent: {
      accessToken: Boolean(access?.value),
      refreshToken: Boolean(refresh?.value),
    },
    authenticated: Boolean(userId),
    user: userId ? { id: userId, email: userEmail } : null,
    error,
  };

  const res = NextResponse.json(payload, { status: 200 });

  // Apply any cookie updates resulting from token refresh
  for (const op of ops) {
    if (op.type === "set") {
      res.cookies.set({ name: op.name, value: op.value!, ...op.options });
    } else if (op.type === "remove") {
      res.cookies.set({ name: op.name, value: "", ...op.options });
    }
  }

  return res;
}

