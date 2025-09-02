"use client";
import React from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Ocurrió un error</h1>
      <p className="text-gray-600 mb-6">
        {error?.message || "No se pudo cargar la página. Intenta nuevamente."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => reset()} className="btn btn-primary">Reintentar</button>
        <button onClick={() => (window.location.href = "/")} className="btn btn-secondary">Ir al inicio</button>
      </div>
    </div>
  );
}

