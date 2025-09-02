"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Tables } from "app/types/supabase";

export default function Role({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setOk(false);
      // Primero intenta via RPC para evitar fricción con RLS
      let role: string | null = null;
      try {
        const rp: any = await supabase.rpc('user_role');
        if (!rp.error && rp.data) role = rp.data as string;
      } catch {}
      if (!role) {
        // Fallback a tabla
        const q = await supabase
          .from("app_user")
          .select("role")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (!q.error && q.data) role = (q.data as Pick<Tables<'app_user'>, 'role'>).role;
      }
      if (role && allow.includes(role)) setOk(true);
    })();
  }, [allow]);
  if (!ok) return null;
  return <>{children}</>;
}
