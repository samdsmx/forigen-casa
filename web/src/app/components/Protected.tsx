
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Status = "checking" | "authed" | "unauthenticated";

const withTimeout = async <T,>(p: PromiseLike<T>, ms = 8000): Promise<T> => {
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
    // Manejo robusto: esperar INITIAL_SESSION para evitar falsos negativos en refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'INITIAL_SESSION') {
        if (session) {
          setStatus('authed');
        } else {
          setStatus('unauthenticated');
          router.replace('/login');
        }
      }
      if (event === 'SIGNED_IN') {
        setStatus('authed');
      }
      if (event === 'SIGNED_OUT') {
        setStatus('unauthenticated');
        router.replace('/login');
      }
    });

    // Fallback: si por alguna razón no llega INITIAL_SESSION, chequeo puntual sin redirigir inmediato
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setStatus('authed');
    }).catch(() => {});

    return () => {
      active = false;
      subscription.unsubscribe();
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
