
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Role({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setOk(false);
      const { data } = await supabase.from("app_user").select("role").eq("auth_user_id", user.id).single();
      if (data && allow.includes(data.role)) setOk(true);
    })();
  }, [allow]);
  if (!ok) return null;
  return <>{children}</>;
}
