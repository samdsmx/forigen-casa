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
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const COLORS_PIE = ["#D4651F", "#4f46e5", "#64748b"];
const COLORS_BAR = ["#D4651F", "#4f46e5", "#16a34a", "#eab308", "#dc2626"];
const CHART_TEXT = "#6b7280";

type Filters = { desde: string; hasta: string; sedeId: string; programaId: string };

export default function ResumenPage() {
  const [filters, setFilters] = useState<Filters>({ desde: "", hasta: "", sedeId: "", programaId: "" });
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ beneficiarios: 0, asistencias: 0, actividades: 0, programas: 0 });
  const [asistMes, setAsistMes] = useState<{ mes: string; total: number }[]>([]);
  const [sexoData, setSexoData] = useState<{ name: string; value: number }[]>([]);
  const [topProgramas, setTopProgramas] = useState<{ nombre: string; total: number }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    // KPI: total beneficiarios
    const benQ = supabase.from("beneficiario").select("id", { count: "exact", head: true });
    const { count: totalBen } = await benQ;

    // KPI: total asistencias (filtered)
    let asiCountQ = supabase.from("asistencia").select("id", { count: "exact", head: true });
    if (filters.sedeId) asiCountQ = asiCountQ.eq("sede_id", filters.sedeId);
    if (filters.desde) asiCountQ = asiCountQ.gte("created_at", filters.desde);
    if (filters.hasta) asiCountQ = asiCountQ.lte("created_at", filters.hasta + "T23:59:59");
    const { count: totalAsi } = await asiCountQ;

    // KPI: total actividades (filtered)
    let actCountQ = supabase.from("actividad").select("id", { count: "exact", head: true });
    if (filters.sedeId) actCountQ = actCountQ.eq("sede_id", filters.sedeId);
    if (filters.programaId) actCountQ = actCountQ.eq("programa_id", filters.programaId);
    if (filters.desde) actCountQ = actCountQ.gte("fecha", filters.desde);
    if (filters.hasta) actCountQ = actCountQ.lte("fecha", filters.hasta);
    const { count: totalAct } = await actCountQ;

    // KPI: programas activos
    const { count: totalProg } = await supabase
      .from("programa").select("id", { count: "exact", head: true }).eq("estado", "activo");

    setKpis({
      beneficiarios: totalBen ?? 0,
      asistencias: totalAsi ?? 0,
      actividades: totalAct ?? 0,
      programas: totalProg ?? 0,
    });

    // Asistencias por mes (last 12 months)
    let asiQ = supabase.from("asistencia").select("created_at");
    if (filters.sedeId) asiQ = asiQ.eq("sede_id", filters.sedeId);
    if (filters.desde) asiQ = asiQ.gte("created_at", filters.desde);
    if (filters.hasta) asiQ = asiQ.lte("created_at", filters.hasta + "T23:59:59");
    const { data: asiRows } = await asiQ;

    const mesMap = new Map<string, number>();
    for (const r of (asiRows || []) as any[]) {
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      mesMap.set(key, (mesMap.get(key) || 0) + 1);
    }
    const sortedMes = Array.from(mesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mes, total]) => ({ mes, total }));
    setAsistMes(sortedMes);

    // Beneficiarios por sexo
    const { data: benRows } = await supabase.from("beneficiario").select("sexo");
    const sexoMap = new Map<string, number>();
    for (const r of (benRows || []) as any[]) {
      const s = r.sexo || "Sin dato";
      sexoMap.set(s, (sexoMap.get(s) || 0) + 1);
    }
    setSexoData(Array.from(sexoMap.entries()).map(([name, value]) => ({ name, value })));

    // Top 5 programas por asistencias
    let actForTop = supabase.from("actividad").select("id, programa_id, programa:programa_id(nombre)");
    if (filters.sedeId) actForTop = actForTop.eq("sede_id", filters.sedeId);
    if (filters.programaId) actForTop = actForTop.eq("programa_id", filters.programaId);
    if (filters.desde) actForTop = actForTop.gte("fecha", filters.desde);
    if (filters.hasta) actForTop = actForTop.lte("fecha", filters.hasta);
    const { data: actRows } = await actForTop;

    const actIdToPrograma = new Map<string, string>();
    for (const a of (actRows || []) as any[]) {
      actIdToPrograma.set(a.id, a.programa?.nombre || "Sin programa");
    }

    let topAsiQ = supabase.from("asistencia").select("actividad_id");
    if (filters.sedeId) topAsiQ = topAsiQ.eq("sede_id", filters.sedeId);
    if (filters.desde) topAsiQ = topAsiQ.gte("created_at", filters.desde);
    if (filters.hasta) topAsiQ = topAsiQ.lte("created_at", filters.hasta + "T23:59:59");
    const { data: topAsiRows } = await topAsiQ;

    const progCount = new Map<string, number>();
    for (const r of (topAsiRows || []) as any[]) {
      const nombre = actIdToPrograma.get(r.actividad_id);
      if (!nombre) continue;
      progCount.set(nombre, (progCount.get(nombre) || 0) + 1);
    }
    const top5 = Array.from(progCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nombre, total]) => ({ nombre, total }));
    setTopProgramas(top5);

    setLoading(false);
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([kpis]), "KPIs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(asistMes), "Asistencias_Mes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sexoData), "Sexo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topProgramas), "Top_Programas");
    XLSX.writeFile(wb, "resumen_general.xlsx");
  };

  return (
    <Protected>
      <Role allow={["admin", "supervisor_central"]}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Link href="/reportes" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">← Volver a reportes</Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">Resumen General</h1>
            </div>
            <ExportButtons onExportExcel={exportExcel} pdfTargetId="report-content" />
          </div>

          <ReportFilters filters={filters} onChange={setFilters} />

          <div id="report-content" className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Beneficiarios", value: kpis.beneficiarios, color: "text-brand-600" },
                { label: "Asistencias", value: kpis.asistencias, color: "text-indigo-600" },
                { label: "Actividades", value: kpis.actividades, color: "text-green-600" },
                { label: "Programas activos", value: kpis.programas, color: "text-yellow-600" },
              ].map(k => (
                <div key={k.label} className="card p-4 text-center">
                  {loading ? (
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto w-16" />
                  ) : (
                    <div className={`text-2xl font-bold ${k.color}`}>{k.value.toLocaleString()}</div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Asistencias por mes */}
            <ChartCard title="Asistencias por mes (últimos 12 meses)">
              {loading ? (
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ) : asistMes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos de asistencia</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={asistMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                    <YAxis tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#D4651F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Beneficiarios por sexo */}
              <ChartCard title="Beneficiarios por sexo">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : sexoData.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={sexoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {sexoData.map((_, i) => (
                          <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Top 5 programas */}
              <ChartCard title="Top 5 programas por asistencias">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : topProgramas.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProgramas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <YAxis dataKey="nombre" type="category" width={140} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {topProgramas.map((_, i) => (
                          <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </div>
        </div>
      </Role>
    </Protected>
  );
}
