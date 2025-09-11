"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Counts = {
  programa: number;
  actividad: number;
  beneficiario: number;
  asistencia: number;
  sede: number;
};

export default function DebugPage() {
  const [clientUser, setClientUser] = useState<string | null>(null);
  const [clientUrl, setClientUrl] = useState<string | null>(null);
  const [clientCounts, setClientCounts] = useState<Counts | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<Record<string, string>>({});
  const [serverCounts, setServerCounts] = useState<Counts | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        setClientUser(sess.session?.user?.email ?? null);
        // Env var is baked at build time; expose for debug
        setClientUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? null);

        // Prefer counting via Supabase client to ensure proper headers/token
        const toCount = async (table: keyof Counts) => {
          const { count, error } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true });
          if (error) {
            setClientDetails(prev => ({ ...prev, [table]: `${error.code || ''} ${error.message}`.trim() }));
            return 0;
          }
          return count || 0;
        };

        const [p, a, b, as, s] = await Promise.all([
          toCount('programa'),
          toCount('actividad'),
          toCount('beneficiario'),
          toCount('asistencia'),
          toCount('sede'),
        ]);
        setClientCounts({ programa: p, actividad: a, beneficiario: b, asistencia: as, sede: s });
      } catch (e: any) {
        setClientError(e?.message || String(e));
      }

      try {
        const res = await fetch('/api/debug/counts', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'server counts failed');
        setServerCounts(data.serverCounts);
      } catch (e: any) {
        setServerError(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>Debug Supabase</h1>
      <div>
        <div><b>Client user:</b> {clientUser || 'null'}</div>
        <div><b>NEXT_PUBLIC_SUPABASE_URL:</b> {clientUrl || 'null'}</div>
      </div>
      <hr />
      <div>
        <h2>Client counts (REST)</h2>
        {clientError && <div style={{ color: 'red' }}>Error: {clientError}</div>}
        {clientCounts && (
          <>
            <pre>{JSON.stringify(clientCounts, null, 2)}</pre>
            {Object.keys(clientDetails).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>Detalles</div>
                <pre>{JSON.stringify(clientDetails, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
      <hr />
      <div>
        <h2>Server counts (supabaseServer)</h2>
        {serverError && <div style={{ color: 'red' }}>Error: {serverError}</div>}
        {serverCounts && (
          <pre>{JSON.stringify(serverCounts, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
