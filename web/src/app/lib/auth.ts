
import { supabase } from "./supabaseClient";

export async function getUserRole(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("app_user").select("role").eq("auth_user_id", user.id).single();
  return data?.role ?? null;
}

export async function getUserSedeSlug(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("app_user")
    .select("sede_id, role")
    .eq("auth_user_id", user.id).single();
  if (!data?.sede_id) return null;
  const { data: sede } = await supabase.from("sede").select("slug").eq("id", data.sede_id).single();
  return sede?.slug ?? null;
}
