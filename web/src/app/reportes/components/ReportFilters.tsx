"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Field, Select } from "../../components/Forms";

interface Filters {
  desde: string;
  hasta: string;
  sedeId: string;
  programaId: string;
}

interface ReportFiltersProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  showPrograma?: boolean;
}

export default function ReportFilters({ filters, onChange, showPrograma = true }: ReportFiltersProps) {
  const [sedes, setSedes] = useState<{value:string;label:string}[]>([]);
  const [programas, setProgramas] = useState<{value:string;label:string}[]>([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("sede").select("id,nombre").order("nombre");
      setSedes(((s as any[]) || []).map(x => ({ value: x.id, label: x.nombre })));
      if (showPrograma) {
        const { data: p } = await supabase.from("programa").select("id,nombre").order("nombre");
        setProgramas(((p as any[]) || []).map(x => ({ value: x.id, label: x.nombre })));
      }
    })();
  }, [showPrograma]);

  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Desde" type="date" value={filters.desde} onChange={(e) => onChange({ ...filters, desde: e.target.value })} />
        <Field label="Hasta" type="date" value={filters.hasta} onChange={(e) => onChange({ ...filters, hasta: e.target.value })} />
        <Select label="Sede" options={[{ value: "", label: "Todas" }, ...sedes]} value={filters.sedeId} onChange={(e) => onChange({ ...filters, sedeId: e.target.value })} />
        {showPrograma && (
          <Select label="Programa" options={[{ value: "", label: "Todos" }, ...programas]} value={filters.programaId} onChange={(e) => onChange({ ...filters, programaId: e.target.value })} />
        )}
      </div>
    </div>
  );
}
