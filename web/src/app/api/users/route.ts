import { NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer";

export async function GET() {
  const { data: { users }, error } = await supabaseServer.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: appUsers, error: appError } = await supabaseServer
    .from("app_user")
    .select("auth_user_id, role, is_active, sede:sede_id(id,nombre)");
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

  const result = users.map(u => {
    const app = (appUsers as any[])?.find(a => a.auth_user_id === u.id);
    return {
      id: u.id,
      email: u.email,
      role: app?.role ?? null,
      sede_id: app?.sede?.[0]?.id ?? null,
      sede: app?.sede?.[0]?.nombre ?? null,
      is_active: app?.is_active ?? false
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { email, password, role, sede_id } = await request.json();
  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const userId = data.user?.id;
  if (!userId) return NextResponse.json({ error: "No se pudo crear usuario" }, { status: 500 });

  const { error: insertError } = await supabaseServer
    .from("app_user")
    .insert({ auth_user_id: userId, role, sede_id: sede_id || null });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ id: userId });
}

export async function PATCH(request: Request) {
  const { auth_user_id, role, sede_id, is_active } = await request.json();
  const updates: Record<string, any> = {};
  if (typeof role !== "undefined") updates.role = role;
  if (typeof sede_id !== "undefined") updates.sede_id = sede_id;
  if (typeof is_active !== "undefined") updates.is_active = is_active;

  const { error } = await supabaseServer
    .from("app_user")
    .update(updates)
    .eq("auth_user_id", auth_user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { auth_user_id } = await request.json();
  const { error: appError } = await supabaseServer
    .from("app_user")
    .delete()
    .eq("auth_user_id", auth_user_id);
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

  const { error: authError } = await supabaseServer.auth.admin.deleteUser(auth_user_id);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
