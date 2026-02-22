"use client";

import { useCallback } from "react";
import { useAuth } from "../context/UserContext";
import { supabase } from "../lib/supabaseClient";
import { useIdleTimeout } from "../hooks/useIdleTimeout";

export default function SessionTimeout() {
  const { user } = useAuth();

  const handleTimeout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/login?reason=idle";
  }, []);

  const { isWarning, remainingSeconds, resetTimer } = useIdleTimeout({
    onTimeout: handleTimeout,
    enabled: !!user,
  });

  if (!isWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full p-6 space-y-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sesión por expirar</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tu sesión se cerrará por inactividad en{" "}
          <span className="font-bold text-yellow-600 dark:text-yellow-400">{remainingSeconds}s</span>
        </p>
        <button
          type="button"
          onClick={resetTimer}
          className="btn btn-primary btn-md w-full"
        >
          Seguir conectado
        </button>
      </div>
    </div>
  );
}
