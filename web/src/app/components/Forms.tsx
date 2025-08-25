"use client";

import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";

export interface Option {
  value: string;
  label: string;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, ...props }: FieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: Option[];
}

export function Select({ label, options = [], ...props }: SelectProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" {...props}>
        <option value="">Seleccione…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
