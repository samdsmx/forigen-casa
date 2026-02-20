"use client";
import { useEffect, useState, useMemo } from "react";
import Protected from "../../components/Protected";
import Role from "../../components/Role";
import { Field, Select } from "../../components/Forms";
import { supabase } from "../../lib/supabaseClient";

type EstadoRow = { estado: string; actividades: number; beneficiarios: number; asistencias: number };
type MunicipioRow = { municipio: string; actividades: number; beneficiarios: number; asistencias: number };
type ProcedenciaRow = { estado: string; municipio: string; beneficiarios: number };

export default function CoberturaPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"actividades" | "procedencia">("actividades");

  // Filters
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sedes, setSedes] = useState<{ value: string; label: string }[]>([]);
  const [filterSedeId, setFilterSedeId] = useState("");

  // Data
  const [estadoData, setEstadoData] = useState<EstadoRow[]>([]);
  const [expandedEstado, setExpandedEstado] = useState<string | null>(null);
  const [municipioData, setMunicipioData] = useState<MunicipioRow[]>([]);
  const [municipioLoading, setMunicipioLoading] = useState(false);
  const [procedenciaData, setProcedenciaData] = useState<ProcedenciaRow[]>([]);

  useEffect(() => {
    supabase.from("sede").select("id,nombre").then(({ data }) => {
      setSedes((data || []).map((s: any) => ({ value: s.id, label: s.nombre })));
    });
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Coverage by estado (activities)
    let actQuery = supabase
      .from("actividad")
      .select("id, estado_clave, sede_id, cat_estado:estado_clave(nombre)");
    if (desde) actQuery = actQuery.gte("fecha", desde);
    if (hasta) actQuery = actQuery.lte("fecha", hasta);
    if (filterSedeId) actQuery = actQuery.eq("sede_id", filterSedeId);

    const { data: acts } = await actQuery;

    // Group activities by estado
    const estadoMap = new Map<string, { nombre: string; actIds: Set<string> }>();
    for (const a of (acts || []) as any[]) {
      const nombre = a.cat_estado?.nombre;
      if (!nombre) continue;
      if (!estadoMap.has(nombre)) estadoMap.set(nombre, { nombre, actIds: new Set() });
      estadoMap.get(nombre)!.actIds.add(a.id);
    }

    // Get attendance counts
    const actIds = (acts || []).map((a: any) => a.id);
    let asistencias: any[] = [];
    if (actIds.length > 0) {
      // Batch in groups of 200 to avoid URL length limits
      for (let i = 0; i < actIds.length; i += 200) {
        const batch = actIds.slice(i, i + 200);
        const { data } = await supabase
          .from("asistencia")
          .select("actividad_id, beneficiario_id")
          .in("actividad_id", batch);
        asistencias = asistencias.concat(data || []);
      }
    }

    // Map asistencias to estados
    const actToEstado = new Map<string, string>();
    for (const a of (acts || []) as any[]) {
      const nombre = a.cat_estado?.nombre;
      if (nombre) actToEstado.set(a.id, nombre);
    }

    const estadoStats = new Map<string, { actividades: number; benefSet: Set<string>; asistencias: number }>();
    for (const [nombre] of estadoMap) {
      estadoStats.set(nombre, { actividades: estadoMap.get(nombre)!.actIds.size, benefSet: new Set(), asistencias: 0 });
    }
    for (const asi of asistencias) {
      const est = actToEstado.get(asi.actividad_id);
      if (est && estadoStats.has(est)) {
        const s = estadoStats.get(est)!;
        s.benefSet.add(asi.beneficiario_id);
        s.asistencias++;
      }
    }

    const rows: EstadoRow[] = [];
    for (const [nombre, s] of estadoStats) {
      rows.push({ estado: nombre, actividades: s.actividades, beneficiarios: s.benefSet.size, asistencias: s.asistencias });
    }
    rows.sort((a, b) => b.actividades - a.actividades);
    setEstadoData(rows);

    // Procedencia (beneficiarios)
    const { data: benefs } = await supabase
      .from("beneficiario")
      .select("id, estado_clave, municipio_id, cat_estado:estado_clave(nombre), cat_municipio:municipio_id(nombre)")
      .not("estado_clave", "is", null);

    const procMap = new Map<string, { estado: string; municipio: string; count: number }>();
    for (const b of (benefs || []) as any[]) {
      const estado = b.cat_estado?.nombre || "Sin estado";
      const municipio = b.cat_municipio?.nombre || "Sin municipio";
      const key = `${estado}|${municipio}`;
      if (!procMap.has(key)) procMap.set(key, { estado, municipio, count: 0 });
      procMap.get(key)!.count++;
    }
    const procRows: ProcedenciaRow[] = [];
    for (const [, v] of procMap) {
      procRows.push({ estado: v.estado, municipio: v.municipio, beneficiarios: v.count });
    }
    procRows.sort((a, b) => b.beneficiarios - a.beneficiarios);
    setProcedenciaData(procRows);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [desde, hasta, filterSedeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMunicipios = async (estadoNombre: string) => {
    if (expandedEstado === estadoNombre) {
      setExpandedEstado(null);
      return;
    }
    setExpandedEstado(estadoNombre);
    setMunicipioLoading(true);

    // Find estado clave
    const { data: est } = await supabase.from("cat_estado").select("clave").eq("nombre", estadoNombre).single();
    if (!est) { setMunicipioLoading(false); return; }
    const estadoClave = (est as any).clave as string;

    let actQuery = supabase
      .from("actividad")
      .select("id, municipio_id, cat_municipio:municipio_id(nombre)")
      .eq("estado_clave", estadoClave);
    if (desde) actQuery = actQuery.gte("fecha", desde);
    if (hasta) actQuery = actQuery.lte("fecha", hasta);
    if (filterSedeId) actQuery = actQuery.eq("sede_id", filterSedeId);

    const { data: acts } = await actQuery;

    const munMap = new Map<string, { nombre: string; actIds: Set<string> }>();
    for (const a of (acts || []) as any[]) {
      const nombre = a.cat_municipio?.nombre;
      if (!nombre) continue;
      if (!munMap.has(nombre)) munMap.set(nombre, { nombre, actIds: new Set() });
      munMap.get(nombre)!.actIds.add(a.id);
    }

    const actIds = (acts || []).map((a: any) => a.id);
    let asistencias: any[] = [];
    if (actIds.length > 0) {
      for (let i = 0; i < actIds.length; i += 200) {
        const batch = actIds.slice(i, i + 200);
        const { data } = await supabase.from("asistencia").select("actividad_id, beneficiario_id").in("actividad_id", batch);
        asistencias = asistencias.concat(data || []);
      }
    }

    const actToMun = new Map<string, string>();
    for (const a of (acts || []) as any[]) {
      const nombre = a.cat_municipio?.nombre;
      if (nombre) actToMun.set(a.id, nombre);
    }

    const munStats = new Map<string, { actividades: number; benefSet: Set<string>; asistencias: number }>();
    for (const [nombre, m] of munMap) {
      munStats.set(nombre, { actividades: m.actIds.size, benefSet: new Set(), asistencias: 0 });
    }
    for (const asi of asistencias) {
      const mun = actToMun.get(asi.actividad_id);
      if (mun && munStats.has(mun)) {
        const s = munStats.get(mun)!;
        s.benefSet.add(asi.beneficiario_id);
        s.asistencias++;
      }
    }

    const rows: MunicipioRow[] = [];
    for (const [nombre, s] of munStats) {
      rows.push({ municipio: nombre, actividades: s.actividades, beneficiarios: s.benefSet.size, asistencias: s.asistencias });
    }
    rows.sort((a, b) => b.actividades - a.actividades);
    setMunicipioData(rows);
    setMunicipioLoading(false);
  };

  const totals = useMemo(() => ({
    estados: estadoData.length,
    actividades: estadoData.reduce((s, r) => s + r.actividades, 0),
    beneficiarios: estadoData.reduce((s, r) => s + r.beneficiarios, 0),
    asistencias: estadoData.reduce((s, r) => s + r.asistencias, 0),
  }), [estadoData]);

  const procTotals = useMemo(() => ({
    estados: new Set(procedenciaData.map((r) => r.estado)).size,
    municipios: procedenciaData.length,
    beneficiarios: procedenciaData.reduce((s, r) => s + r.beneficiarios, 0),
  }), [procedenciaData]);

  return (
    <Protected>
      <Role allow={["admin", "supervisor_central"]}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Cobertura Geográfica</h1>
            <p className="text-gray-600 dark:text-gray-400">Reportes de cobertura territorial de actividades y procedencia de beneficiarios</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "actividades" ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => setTab("actividades")}
            >
              📍 Actividades por ubicación
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "procedencia" ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => setTab("procedencia")}
            >
              🏠 Procedencia de beneficiarios
            </button>
          </div>

          {tab === "actividades" && (
            <>
              {/* Filters */}
              <div className="card">
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Desde" type="date" value={desde} onChange={(e) => setDesde((e.target as HTMLInputElement).value)} />
                    <Field label="Hasta" type="date" value={hasta} onChange={(e) => setHasta((e.target as HTMLInputElement).value)} />
                    <Select
                      label="Sede"
                      options={[{ value: "", label: "Todas" }, ...sedes]}
                      value={filterSedeId}
                      onChange={(e) => setFilterSedeId((e.target as HTMLSelectElement).value)}
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{totals.estados}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Estados</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{totals.actividades}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Actividades</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{totals.beneficiarios}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Beneficiarios únicos</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{totals.asistencias}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Asistencias</div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="card p-6 text-center text-gray-500 dark:text-gray-400">Cargando datos...</div>
              ) : estadoData.length === 0 ? (
                <div className="card p-6 text-center text-gray-500 dark:text-gray-400">No hay actividades con ubicación geográfica registrada.</div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actividades</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Beneficiarios</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asistencias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {estadoData.map((row) => (
                        <>
                          <tr
                            key={row.estado}
                            className="hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => loadMunicipios(row.estado)}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <span className="text-xs text-gray-400 dark:text-gray-500">{expandedEstado === row.estado ? "▼" : "▶"}</span>
                              {row.estado}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.actividades}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.beneficiarios}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.asistencias}</td>
                          </tr>
                          {expandedEstado === row.estado && (
                            <tr key={`${row.estado}-detail`}>
                              <td colSpan={4} className="px-8 py-2 bg-gray-50 dark:bg-gray-900/50">
                                {municipioLoading ? (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Cargando municipios...</div>
                                ) : municipioData.length === 0 ? (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Sin desglose por municipio</div>
                                ) : (
                                  <table className="min-w-full">
                                    <thead>
                                      <tr>
                                        <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Municipio</th>
                                        <th className="px-3 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actividades</th>
                                        <th className="px-3 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Beneficiarios</th>
                                        <th className="px-3 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Asistencias</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {municipioData.map((mr) => (
                                        <tr key={mr.municipio} className="hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700">
                                          <td className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">{mr.municipio}</td>
                                          <td className="px-3 py-1 text-sm text-right text-gray-700 dark:text-gray-300">{mr.actividades}</td>
                                          <td className="px-3 py-1 text-sm text-right text-gray-700 dark:text-gray-300">{mr.beneficiarios}</td>
                                          <td className="px-3 py-1 text-sm text-right text-gray-700 dark:text-gray-300">{mr.asistencias}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "procedencia" && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{procTotals.estados}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Estados</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{procTotals.municipios}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Municipios</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{procTotals.beneficiarios}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Beneficiarios con procedencia</div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="card p-6 text-center text-gray-500 dark:text-gray-400">Cargando datos...</div>
              ) : procedenciaData.length === 0 ? (
                <div className="card p-6 text-center text-gray-500 dark:text-gray-400">No hay beneficiarios con procedencia geográfica registrada.</div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Municipio</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Beneficiarios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {procedenciaData.map((row) => (
                        <tr key={`${row.estado}-${row.municipio}`} className="hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.estado}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.municipio}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.beneficiarios}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </Role>
    </Protected>
  );
}
