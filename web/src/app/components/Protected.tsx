"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/UserContext";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setIsRedirecting(true);
    }
  }, [loading, user]);

  // Safety timeout: if loading takes more than 15 seconds, show error
  useEffect(() => {
    if (!loading) return;
    
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleLoginRedirect = async () => {
    try {
      // Clear any stale session data
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore errors during signout - session might already be invalid
      console.log("Signout error (ignoring):", error);
    } finally {
      // Force navigation to login using window.location to bypass any React Router issues
      window.location.href = "/login";
    }
  };

  // If timeout is reached and still loading, show error
  if (loading && timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-lg w-full shadow-lg">
          <div className="card-body text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 text-2xl">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900">Carga lenta detectada</h2>
            <p className="text-gray-600">
              La aplicación está tardando más de lo esperado. Esto puede deberse a una conexión lenta o problemas temporales.
            </p>
            {error && <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">{error}</p>}
            <div className="pt-2 space-x-3">
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Recargar página
              </button>
              <button className="btn btn-secondary" onClick={handleLoginRedirect}>
                Ir a login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
