"use client";
import { useEffect, useState } from 'react';

type Version = {
  sha: string | null;
  short: string | null;
  branch: string | null;
  message: string | null;
  vercelUrl: string | null;
};

export default function BuildVersion() {
  const [v, setV] = useState<Version | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setV(data);
        }
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  if (!v?.short) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50 text-[11px] px-2 py-1 rounded-md bg-gray-800 text-gray-100 shadow-md opacity-80 hover:opacity-100">
      <span title={v.message || ''}>build {v.short}</span>
      {v.branch ? <span className="ml-1 text-gray-400">[{v.branch}]</span> : null}
    </div>
  );
}

