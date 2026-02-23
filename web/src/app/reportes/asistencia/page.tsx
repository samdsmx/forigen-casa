"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Protected from "../../components/Protected";
import Role from "../../components/Role";
import ChartCard from "../components/ChartCard";
import ExportButtons from "../components/ExportButtons";
import ReportFilters from "../components/ReportFilters";
import { supabase } from "../../lib/supabaseClient";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

const COLORS_BAR = ["#D4651F", "#4f46e5", "#16a34a", "#eab308", "#dc2626", "#64748b"];
const CHART_TEXT = "#6b7280";

type Filters = { desde: string; hasta: string; sedeId: string; programaId: string; benefactorId: string };

export default function AsistenciaPage() {
  const [filters, setFilters] = useState<Filters>({ desde: "", hasta: "", sedeId: "", programaId: "", benefactorId: "" });
  const [loading, setLoading] = useState(true);
  const [tendencia, setTendencia] = useState<{ mes: string; total: number }[]>([]);
  const [tipoData, setTipoData] = useState<{ name: string; value: number }[]>([]);
  const [sedeData, setSedeData] = useState<{ name: string; value: number }[]>([]);
  const [topFacilitadores, setTopFacilitadores] = useState<{ email: string; total: number }[]>([]);
  const [ocupacion, setOcupacion] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Fetch actividades with joins
    let actQ = supabase.from("actividad").select(
      "id, fecha, tipo_id, sede_id, facilitador_id, cupo, tipo:tipo_id(nombre), sede:sede_id(nombre)"
    );
    if (filters.sedeId) actQ = actQ.eq("sede_id", filters.sedeId);
    if (filters.programaId) actQ = actQ.eq("programa_id", filters.programaId);
    if (filters.desde) actQ = actQ.gte("fecha", filters.desde);
    if (filters.hasta) actQ = actQ.lte("fecha", filters.hasta);
    const { data: actRows } = await actQ;
    const acts = (actRows || []) as any[];

    // Fetch asistencias
    const actIds = acts.map(a => a.id);
    let allAsi: any[] = [];
    for (let i = 0; i < actIds.length; i += 200) {
      const batch = actIds.slice(i, i + 200);
      const { data } = await supabase.from("asistencia").select("actividad_id, created_at").in("actividad_id", batch);
      allAsi = allAsi.concat(data || []);
    }

    // Build maps
    const actMap = new Map<string, any>();
    for (const a of acts) actMap.set(a.id, a);

    // 1. Tendencia por mes
    const mesMap = new Map<string, number>();
    for (const r of allAsi) {
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      mesMap.set(key, (mesMap.get(key) || 0) + 1);
    }
    setTendencia(
      Array.from(mesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([mes, total]) => ({ mes, total }))
    );

    // 2. Asistencias por tipo de actividad
    const tipoMap = new Map<string, number>();
    for (const r of allAsi) {
      const act = actMap.get(r.actividad_id);
      const nombre = act?.tipo?.nombre || "Sin tipo";
      tipoMap.set(nombre, (tipoMap.get(nombre) || 0) + 1);
    }
    setTipoData(
      Array.from(tipoMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }))
    );

    // 3. Asistencias por sede
    const sedeMap = new Map<string, number>();
    for (const r of allAsi) {
      const act = actMap.get(r.actividad_id);
      const nombre = act?.sede?.nombre || "Sin sede";
      sedeMap.set(nombre, (sedeMap.get(nombre) || 0) + 1);
    }
    setSedeData(
      Array.from(sedeMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }))
    );

    // 4. Top 10 facilitadores por asistencias
    const facMap = new Map<string, number>();
    for (const r of allAsi) {
      const act = actMap.get(r.actividad_id);
      const facId = act?.facilitador_id;
      if (!facId) continue;
      facMap.set(facId, (facMap.get(facId) || 0) + 1);
    }
    const topFacIds = Array.from(facMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Resolve facilitador emails via /api/users
    let userMap = new Map<string, string>();
    try {
      const resp = await fetch("/api/users");
      const users = (await resp.json()) as any[];
      for (const u of users) userMap.set(u.id, u.email || u.id);
    } catch { /* fallback to IDs */ }

    setTopFacilitadores(
      topFacIds.map(([id, total]) => ({
        email: userMap.get(id) || id.slice(0, 8) + "…",
        total,
      }))
    );

    // 5. Tasa de ocupación promedio
    let totalCupo = 0;
    let totalAsistencias = 0;
    let actsConCupo = 0;
    const asiPerAct = new Map<string, number>();
    for (const r of allAsi) {
      asiPerAct.set(r.actividad_id, (asiPerAct.get(r.actividad_id) || 0) + 1);
    }
    for (const a of acts) {
      if (a.cupo && a.cupo > 0) {
        totalCupo += a.cupo;
        totalAsistencias += asiPerAct.get(a.id) || 0;
        actsConCupo++;
      }
    }
    setOcupacion(totalCupo > 0 ? Math.round((totalAsistencias / totalCupo) * 100) : null);

    setLoading(false);
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tendencia), "Tendencia_Mes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tipoData), "Por_Tipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sedeData), "Por_Sede");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topFacilitadores), "Top_Facilitadores");
    XLSX.writeFile(wb, "asistencia_reporte.xlsx");
  };

  return (
    <Protected>
      <Role allow={["admin", "supervisor_central"]}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Link href="/reportes" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">← Volver a reportes</Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">Actividades y Asistencia</h1>
              <p className="text-gray-600 dark:text-gray-400">Tendencias, desglose por tipo, sede y facilitador</p>
            </div>
            <ExportButtons onExportExcel={exportExcel} pdfTargetId="report-content" />
          </div>

          <ReportFilters filters={filters} onChange={setFilters} />

          <div id="report-content" className="space-y-6">
            {/* Ocupación KPI */}
            <div className="card p-4 flex items-center gap-4">
              <div className="text-3xl">📈</div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tasa de ocupación promedio (asistencias / cupo)</div>
                {loading ? (
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                ) : ocupacion !== null ? (
                  <div className="text-2xl font-bold text-brand-600">{ocupacion}%</div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sin actividades con cupo definido</div>
                )}
              </div>
            </div>

            {/* Tendencia por mes */}
            <ChartCard title="Asistencias por mes (tendencia)">
              {loading ? (
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ) : tendencia.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos de asistencia</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tendencia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                    <YAxis tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#D4651F" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Por tipo */}
              <ChartCard title="Asistencias por tipo de actividad">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : tipoData.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tipoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {tipoData.map((_, i) => (
                          <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Por sede */}
              <ChartCard title="Asistencias por sede">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : sedeData.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sedeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Top facilitadores table */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top 10 facilitadores por asistencias registradas</h3>
              </div>
              {loading ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">Cargando datos...</div>
              ) : topFacilitadores.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">Sin datos de facilitadores.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Facilitador</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asistencias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {topFacilitadores.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.email}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </Role>
    </Protected>
  );
}
