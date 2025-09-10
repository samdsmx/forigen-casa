import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "app/types/supabase";

export async function GET() {
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

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const res = NextResponse.json({ user: null }, { status: 200 });
    for (const op of ops) {
      if (op.type === "set") res.cookies.set({ name: op.name, value: op.value!, ...op.options });
      else res.cookies.set({ name: op.name, value: "", ...op.options });
    }
    return res;
  }

  // Derive role and sede using the authenticated context
  const [{ data: roleData }, { data: sedeId }] = await Promise.all([
    supabase.rpc('user_role'),
    supabase.rpc('user_sede_id')
  ] as const);

  let sedeName: string | undefined;
  if (sedeId) {
    const { data: sede } = await supabase
      .from('sede')
      .select('nombre')
      .eq('id', sedeId as string)
      .maybeSingle();
    sedeName = (sede as any)?.nombre as string | undefined;
  }

  const payload = {
    user: {
      email: user.email || undefined,
      role: (roleData as string | null) ?? undefined,
      sede: sedeName,
    }
  };

  const res = NextResponse.json(payload, { status: 200 });
  for (const op of ops) {
    if (op.type === "set") res.cookies.set({ name: op.name, value: op.value!, ...op.options });
    else res.cookies.set({ name: op.name, value: "", ...op.options });
  }
  return res;
}

