"use client";
import { useEffect, useMemo, useState } from "react";
import Protected from "../components/Protected";
import { supabase } from "../lib/supabaseClient";
import { SearchInput, Select } from "../components/Forms";
import Link from "next/link";
import { ensureClientSession } from "../lib/clientSession";

interface AsistenciaItem {
  id: string;
  created_at: string | null;
  actividad: {
    id: string;
    fecha: string;
    programa?: { nombre?: string } | null;
  } | null;
  beneficiario: {
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string | null;
  } | null;
}

export default function AsistenciasRecientesPage() {
  const [list, setList] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actividadOptions, setActividadOptions] = useState<{ value: string; label: string }[]>([]);
  const [filterActividadId, setFilterActividadId] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await ensureClientSession();

      const [asistRes, actsRes] = await Promise.all([
        supabase
          .from("asistencia")
          .select("id, created_at, actividad:actividad_id(id, fecha, programa:programa_id(nombre)), beneficiario:beneficiario_id(nombre, primer_apellido, segundo_apellido)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("actividad")
          .select("id, fecha, programa:programa_id(nombre)")
          .order("fecha", { ascending: false })
          .limit(300)
      ]);

      if (asistRes.error) throw asistRes.error;
      if (actsRes.error) throw actsRes.error;

      const acts = (actsRes.data as any[] | null) || [];
      setActividadOptions([
        { value: "", label: "Todas las actividades" },
        ...acts.map(a => ({
          value: a.id as string,
          label: `${new Date(a.fecha).toLocaleDateString('es-MX')} - ${(Array.isArray(a.programa) ? (a.programa as any[])[0]?.nombre : a.programa?.nombre) ?? ''}`.trim()
        }))
      ]);

      setList(((asistRes.data as any[]) || []) as AsistenciaItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar asistencias');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let items = list;
    if (filterActividadId) items = items.filter(x => x.actividad?.id === filterActividadId);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(x => {
        const nombre = `${x.beneficiario?.nombre ?? ''} ${x.beneficiario?.primer_apellido ?? ''} ${x.beneficiario?.segundo_apellido ?? ''}`.toLowerCase();
        const proyecto = (Array.isArray(x.actividad?.programa) ? (x.actividad?.programa as any[])[0]?.nombre : x.actividad?.programa?.nombre) ?? '';
        return nombre.includes(q) || proyecto.toLowerCase().includes(q);
      });
    }
    return items;
  }, [list, filterActividadId, search]);

  const BenefName = ({ b }: { b: AsistenciaItem["beneficiario"] }) => (
    <span>{b ? `${b.nombre} ${b.primer_apellido}${b.segundo_apellido ? ' ' + b.segundo_apellido : ''}` : ''}</span>
  );

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Asistencias registradas</h1>
            <p className="text-gray-600 dark:text-gray-400">Últimos registros, del más reciente al más antiguo</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <SearchInput
                label="Buscar"
                placeholder="Buscar por nombre o proyecto..."
                value={search}
                onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                onClear={() => setSearch("")}
              />
            </div>
            <Select
              label="Actividad"
              value={filterActividadId}
              onChange={(e) => setFilterActividadId((e.target as HTMLSelectElement).value)}
              options={actividadOptions}
            />
          </div>
        </div>

        {loading ? (
          <div className="card">
            <div className="card-body">
              <div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : filtered.length > 0 ? (
          <div className="card">
            <div className="card-body overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Beneficiario</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proyecto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actividad</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((x) => {
                    const proyecto = (Array.isArray(x.actividad?.programa) ? (x.actividad?.programa as any[])[0]?.nombre : x.actividad?.programa?.nombre) ?? '';
                    return (
                      <tr key={x.id} className="hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {x.created_at ? new Date(x.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"><BenefName b={x.beneficiario} /></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{proyecto}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          <Link href={`/asistencia/${x.actividad?.id}`} className="text-brand-700 hover:underline">Ver actividad</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay asistencias registradas</h3>
            <p className="text-gray-500 dark:text-gray-400">Comienza registrando asistencia en una actividad</p>
          </div>
        )}
      </div>
    </Protected>
  );
}
