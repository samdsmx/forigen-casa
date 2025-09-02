
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Status = "checking" | "authed" | "unauthenticated";

const withTimeout = async <T,>(p: Promise<T>, ms = 8000): Promise<T> => {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)) as Promise<T>,
  ]);
};

export default function Protected({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession());
        if (!active) return;
        if (error || !data.session) {
          setStatus("unauthenticated");
          router.replace("/login");
        } else {
          setStatus("authed");
        }
      } catch (err) {
        console.error("[Protected] Error checking session", err);
        if (!active) return;
        setStatus("unauthenticated");
        router.replace("/login");
      }
    };
    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
