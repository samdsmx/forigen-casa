
import { supabase } from "./supabaseClient";
import type { Tables } from "app/types/supabase";

export async function getUserRole(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("app_user")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();
  const row = data as (Pick<Tables<'app_user'>, 'role'> | null);
  return row?.role ?? null;
}

export async function getUserSedeSlug(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("app_user")
    .select("sede_id, role")
    .eq("auth_user_id", user.id).single();
  const appUser = data as (Pick<Tables<'app_user'>, 'sede_id' | 'role'> | null);
  if (!appUser?.sede_id) return null;
  const { data: sede } = await supabase
    .from("sede")
    .select("slug")
    .eq("id", appUser.sede_id)
    .single();
  const sedeRow = sede as (Pick<Tables<'sede'>, 'slug'> | null);
  return sedeRow?.slug ?? null;
}
