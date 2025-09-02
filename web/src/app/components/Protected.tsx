
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Protected({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) router.push("/login");
        else setReady(true);
      } catch (err) {
        console.error("[Protected] Error checking session", err);
        router.push("/login");
      } finally {
        setReady(true);
      }
    };
    checkSession();
  }, [router]);
  if (!ready) return null;
  return <>{children}</>;
}
