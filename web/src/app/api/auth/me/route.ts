import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "app/types/supabase";

export async function GET(request: Request) {
  const start = Date.now();
  console.log('[API/auth/me] Start');
  const cookieStore = await cookies();
  const { searchParams } = new URL(request.url);
  const basic = searchParams.get('basic') === 'true';

  type CookieOp = { type: "set" | "remove"; name: string; value?: string; options?: any };
  const ops: CookieOp[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          ops.push({ type: "set", name, value, options: { path: "/", sameSite: "lax", secure: true, ...options } });
        },
        remove(name: string, options: any) {
          ops.push({ type: "remove", name, options: { path: "/", maxAge: 0, ...options } });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.log('[API/auth/me] No user or error', error);
    const res = NextResponse.json({ user: null }, { status: 200 });
    for (const op of ops) {
      if (op.type === "set") res.cookies.set({ name: op.name, value: op.value!, ...op.options });
      else res.cookies.set({ name: op.name, value: "", ...op.options });
    }
    return res;
  }

  if (basic) {
    console.log('[API/auth/me] Basic info returned');
    const res = NextResponse.json({
      user: {
        email: user.email || undefined,
      }
    }, { status: 200 });
    for (const op of ops) {
      if (op.type === "set") res.cookies.set({ name: op.name, value: op.value!, ...op.options });
      else res.cookies.set({ name: op.name, value: "", ...op.options });
    }
    return res;
  }

  // Derive role and sede using the authenticated context
  console.log('[API/auth/me] Fetching role/sede RPCs...');
  const t1 = Date.now();
  const [roleResult, sedeIdResult] = await Promise.all([
    supabase.rpc('user_role'),
    supabase.rpc('user_sede_id')
  ]);
  console.log(`[API/auth/me] RPCs took ${Date.now() - t1}ms`);

  if (roleResult.error) console.error('[API/auth/me] user_role error', roleResult.error);
  if (sedeIdResult.error) console.error('[API/auth/me] user_sede_id error', sedeIdResult.error);

  const roleData = roleResult.error ? null : roleResult.data;
  const sedeId = sedeIdResult.error ? null : sedeIdResult.data;

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

  console.log(`[API/auth/me] Finished in ${Date.now() - start}ms`);
  const res = NextResponse.json(payload, { status: 200 });
  for (const op of ops) {
    if (op.type === "set") res.cookies.set({ name: op.name, value: op.value!, ...op.options });
    else res.cookies.set({ name: op.name, value: "", ...op.options });
  }
  return res;
}

