
"use client";
import { useState } from "react";

export function Field({ label, ...props }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}

export function Select({ label, options, ...props }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" {...props}>
        <option value="">Seleccione…</option>
        {(options||[]).map((o: any)=> <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
