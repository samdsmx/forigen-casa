"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/UserContext";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      // Small delay to prevent flash if user is being restored
      setIsRedirecting(true);
    }
  }, [loading, user]);

  const handleLoginRedirect = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner text-primary" aria-label="Cargando" />
      </div>
    );
  }

  if (!user) {
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
