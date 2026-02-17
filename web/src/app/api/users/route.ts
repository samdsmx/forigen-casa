import { NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabaseServer";
import type { Tables, TablesInsert, TablesUpdate } from "app/types/supabase";

export async function GET() {
  const { data: { users }, error } = await supabaseServer.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: appUsers, error: appError } = await supabaseServer
    .from("app_user")
    .select("auth_user_id, role, is_active, sede:sede_id(id,nombre)");
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

  type SedeMini = Pick<Tables<'sede'>, 'id' | 'nombre'>;
  type AppUserRow = Pick<Tables<'app_user'>, 'auth_user_id' | 'role' | 'is_active'> & {
    sede: SedeMini[] | SedeMini | null;
  };
  const typed = (appUsers || []) as AppUserRow[];
  const result = users.map(u => {
    const app = typed.find(a => a.auth_user_id === u.id);
    const sedeObj = Array.isArray(app?.sede) ? app?.sede?.[0] : app?.sede || null;
    return {
      id: u.id,
      email: u.email,
      role: app?.role ?? null,
      sede_id: sedeObj?.id ?? null,
      sede: sedeObj?.nombre ?? null,
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

  const insertPayload: TablesInsert<'app_user'> = { auth_user_id: userId, role, sede_id: sede_id || null } as TablesInsert<'app_user'>;
  const { error: insertError } = await supabaseServer
    .from("app_user")
    .insert(insertPayload);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ id: userId });
}

export async function PATCH(request: Request) {
  const { auth_user_id, role, sede_id, is_active } = await request.json();
  const updates: Partial<TablesUpdate<'app_user'>> = {};
  if (typeof role !== "undefined") (updates as any).role = role;
  if (typeof sede_id !== "undefined") (updates as any).sede_id = sede_id;
  if (typeof is_active !== "undefined") (updates as any).is_active = is_active;

  const { error } = await supabaseServer
    .from("app_user")
    .update(updates)
    .eq("auth_user_id", auth_user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const { auth_user_id, password } = await request.json();
  if (!auth_user_id || !password) {
    return NextResponse.json({ error: "Se requiere auth_user_id y password" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }
  const { error } = await supabaseServer.auth.admin.updateUserById(auth_user_id, { password });
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
