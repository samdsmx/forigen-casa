
"use client";

export default function Protected({ children }: { children: React.ReactNode }) {
  // Middleware del servidor ya protege. En cliente no redirigimos ni bloqueamos.
  return <>{children}</>;
}
