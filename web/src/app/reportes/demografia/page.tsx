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
const COLORS_BAR = ["#D4651F", "#4f46e5", "#16a34a", "#eab308", "#dc2626", "#64748b"];
const CHART_TEXT = "#6b7280";

type Filters = { desde: string; hasta: string; sedeId: string; programaId: string; benefactorId: string };
type DemoRow = { categoria: string; valor: string; cantidad: number };

export default function DemografiaPage() {
  const [filters, setFilters] = useState<Filters>({ desde: "", hasta: "", sedeId: "", programaId: "", benefactorId: "" });
  const [loading, setLoading] = useState(true);
  const [sexoData, setSexoData] = useState<{ name: string; value: number }[]>([]);
  const [escolaridadData, setEscolaridadData] = useState<{ name: string; value: number }[]>([]);
  const [indigenaData, setIndigenaData] = useState<{ name: string; value: number }[]>([]);
  const [migranteData, setMigranteData] = useState<{ name: string; value: number }[]>([]);
  const [tableData, setTableData] = useState<DemoRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Get beneficiario IDs matching filters
    let benIds: Set<string> | null = null;

    if (filters.sedeId) {
      let bsQ = supabase.from("beneficiario_sede").select("beneficiario_id").eq("sede_id", filters.sedeId);
      const { data: bsRows } = await bsQ;
      benIds = new Set((bsRows || []).map((r: any) => r.beneficiario_id));
    }

    if (filters.programaId || filters.desde || filters.hasta) {
      // Get actividad IDs matching programa/date filters
      let actQ = supabase.from("actividad").select("id");
      if (filters.programaId) actQ = actQ.eq("programa_id", filters.programaId);
      if (filters.desde) actQ = actQ.gte("fecha", filters.desde);
      if (filters.hasta) actQ = actQ.lte("fecha", filters.hasta);
      const { data: actRows } = await actQ;
      const actIds = (actRows || []).map((a: any) => a.id);

      if (actIds.length > 0) {
        let allBenIds: string[] = [];
        for (let i = 0; i < actIds.length; i += 200) {
          const batch = actIds.slice(i, i + 200);
          const { data } = await supabase.from("asistencia").select("beneficiario_id").in("actividad_id", batch);
          allBenIds = allBenIds.concat((data || []).map((r: any) => r.beneficiario_id));
        }
        const progBenIds = new Set(allBenIds);
        benIds = benIds ? new Set([...benIds].filter(id => progBenIds.has(id))) : progBenIds;
      } else {
        benIds = benIds || new Set();
      }
    }

    // Fetch beneficiarios
    let benQ = supabase.from("beneficiario").select("id, sexo, escolaridad, poblacion_indigena, condicion_migrante");
    const { data: benRows } = await benQ;
    let filtered = (benRows || []) as any[];
    if (benIds) {
      filtered = filtered.filter(b => benIds!.has(b.id));
    }

    // Process demographics
    const countBy = (arr: any[], field: string) => {
      const map = new Map<string, number>();
      for (const r of arr) {
        const v = r[field] || "Sin dato";
        map.set(v, (map.get(v) || 0) + 1);
      }
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    };

    const sexo = countBy(filtered, "sexo");
    const escolaridad = countBy(filtered, "escolaridad");
    const indigena = countBy(filtered, "poblacion_indigena");
    const migrante = countBy(filtered, "condicion_migrante");

    setSexoData(sexo);
    setEscolaridadData(escolaridad.sort((a, b) => b.value - a.value));
    setIndigenaData(indigena);
    setMigranteData(migrante);

    // Build summary table
    const rows: DemoRow[] = [];
    for (const s of sexo) rows.push({ categoria: "Sexo", valor: s.name, cantidad: s.value });
    for (const s of escolaridad) rows.push({ categoria: "Escolaridad", valor: s.name, cantidad: s.value });
    for (const s of indigena) rows.push({ categoria: "Población indígena", valor: s.name, cantidad: s.value });
    for (const s of migrante) rows.push({ categoria: "Condición migrante", valor: s.name, cantidad: s.value });
    setTableData(rows);

    setLoading(false);
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tableData), "Demografia");
    XLSX.writeFile(wb, "demografia.xlsx");
  };

  return (
    <Protected>
      <Role allow={["admin", "supervisor_central"]}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Link href="/reportes" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">← Volver a reportes</Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">Demografía</h1>
              <p className="text-gray-600 dark:text-gray-400">Distribución demográfica de beneficiarios</p>
            </div>
            <ExportButtons onExportExcel={exportExcel} pdfTargetId="report-content" />
          </div>

          <ReportFilters filters={filters} onChange={setFilters} />

          <div id="report-content" className="space-y-6">
            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Distribución por sexo">
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

              <ChartCard title="Distribución por escolaridad">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : escolaridadData.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={escolaridadData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Población indígena">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : indigenaData.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={indigenaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <YAxis tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Condición migrante">
                {loading ? (
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ) : migranteData.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-12">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={migranteData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <YAxis tick={{ fill: CHART_TEXT, fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#eab308" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Summary table */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resumen demográfico</h3>
              </div>
              {loading ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">Cargando datos...</div>
              ) : tableData.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">Sin datos de beneficiarios.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tableData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.categoria}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.valor}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.cantidad.toLocaleString()}</td>
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
