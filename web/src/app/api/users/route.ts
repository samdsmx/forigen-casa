import { NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer";

export async function GET() {
  const { data: { users }, error } = await supabaseServer.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: appUsers, error: appError } = await supabaseServer
    .from("app_user")
    .select("auth_user_id, role, is_active, sede:sede_id(nombre)");
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

  const result = users.map(u => {
    const app = (appUsers as any[])?.find(a => a.auth_user_id === u.id);
    return {
      id: u.id,
      email: u.email,
      role: app?.role ?? null,
      sede: app?.sede?.[0]?.nombre ?? null,
      is_active: app?.is_active ?? false
    };
  });

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const { auth_user_id, is_active } = await request.json();
  const { error } = await supabaseServer
    .from("app_user")
    .update({ is_active })
    .eq("auth_user_id", auth_user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
