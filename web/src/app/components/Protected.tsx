
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function Protected({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(true);
  const router = useRouter();

  const handleLoginRedirect = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Protected] Session check timed out');
        setChecking(false);
        setHasSession(false);
      }
    }, 5000); // 5s timeout fallback

    console.log('[Protected] Checking session...');

    // Listener for auth state changes (faster than getSession sometimes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log(`[Protected] Auth change: ${event}`, !!session);

      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeout);
        setHasSession(true);
        setChecking(false);
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        setHasSession(false);
        setChecking(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        console.log('[Protected] Session check result:', !!data.session);
        // Only update if we are still checking (listener hasn't already resolved it)
        setHasSession(Boolean(data.session));
      })
      .catch((err) => {
        console.error('[Protected] Session check error:', err);
        if (mounted) setHasSession(false);
      })
      .finally(() => {
        if (mounted) {
          clearTimeout(timeout);
          setChecking(false);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner text-primary" aria-label="Cargando" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-lg w-full shadow-lg">
          <div className="card-body text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-2xl">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900">Sesión no disponible</h2>
            <p className="text-gray-600">Tu sesión expiró o fue cerrada. Vuelve a iniciar sesión para continuar.</p>
            <div className="pt-2">
              <button className="btn btn-primary" onClick={handleLoginRedirect}>
                Volver a iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
