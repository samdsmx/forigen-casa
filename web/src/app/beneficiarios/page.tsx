"use client";
import { useEffect, useMemo, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field, Select, FormCard, SearchInput } from "../components/Forms";
import DeleteConfirm from "../components/DeleteConfirm";
import GeoSelector, { type GeoValue } from "../components/GeoSelector";
import { supabase } from "../lib/supabaseClient";
import { ensureClientSession } from "../lib/clientSession";
import type { Tables, TablesInsert, TablesUpdate } from "../types/supabase";

type Beneficiario = Tables<'beneficiario'>;

export default function BeneficiariosPage() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");

  const [historyBenefId, setHistoryBenefId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{id: string; nombre: string} | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{count: number; loading: boolean}>({count: 0, loading: false});
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<TablesInsert<'beneficiario'>>({
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    fecha_nacimiento: "",
    sexo: "",
    curp: "",
    escolaridad: "",
    lengua_indigena: "",
    poblacion_indigena: "",
    condicion_migrante: "",
    estado_clave: "",
    municipio_id: "",
    codigo_postal: "",
    localidad_colonia: "",
  });

  useEffect(() => {
    let timeout: any;
    (async () => {
      setLoading(true);
      setLoadError(null);
      await loadBeneficiarios();
    })();
    timeout = setTimeout(() => {
      if (loading) {
        setLoadError('La carga tomó demasiado tiempo.');
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const loadBeneficiarios = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadError(null);
      await ensureClientSession();
      const { data, error } = await supabase
        .from("beneficiario")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBeneficiarios((data as Beneficiario[]) || []);
      if (data && data.length > 0) {
        const ids = (data as Beneficiario[]).map(b => b.id);
        const countMap: Record<string, number> = {};
        const { data: counts } = await supabase
          .from('asistencia')
          .select('beneficiario_id')
          .in('beneficiario_id', ids);
        if (counts) {
          for (const row of counts as any[]) {
            countMap[row.beneficiario_id] = (countMap[row.beneficiario_id] || 0) + 1;
          }
        }
        setActivityCounts(countMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar beneficiarios");
      setLoadError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (benefId: string) => {
    setHistoryBenefId(benefId);
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('asistencia')
        .select('id, created_at, actividad:actividad_id(id, fecha, hora_inicio, hora_fin, programa:programa_id(nombre), tipo:tipo_id(nombre), subtipo:subtipo_id(nombre), sede:sede_id(nombre))')
        .eq('beneficiario_id', benefId)
        .order('created_at', { ascending: false });
      setHistory((data as any[]) || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return beneficiarios;
    const q = search.toLowerCase();
    return beneficiarios.filter(b => {
      const nombreCompleto = `${b.nombre} ${b.primer_apellido ?? ''} ${b.segundo_apellido ?? ''}`.toLowerCase();
      return (
        nombreCompleto.includes(q) ||
        (b.curp ?? '').toLowerCase().includes(q) ||
        (b.localidad_colonia ?? '').toLowerCase().includes(q)
      );
    });
  }, [beneficiarios, search]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nombre: "",
      primer_apellido: "",
      segundo_apellido: "",
      fecha_nacimiento: "",
      sexo: "",
      curp: "",
      escolaridad: "",
      lengua_indigena: "",
      poblacion_indigena: "",
      condicion_migrante: "",
      estado_clave: "",
      municipio_id: "",
      codigo_postal: "",
      localidad_colonia: "",
    });
  };

  const onCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const onEdit = (b: Beneficiario) => {
    setEditingId(b.id);
    setFormData({
      nombre: b.nombre,
      primer_apellido: b.primer_apellido,
      segundo_apellido: b.segundo_apellido ?? "",
      fecha_nacimiento: b.fecha_nacimiento,
      sexo: b.sexo,
      curp: b.curp ?? "",
      escolaridad: b.escolaridad ?? "",
      lengua_indigena: b.lengua_indigena ?? "",
      poblacion_indigena: b.poblacion_indigena ?? "",
      condicion_migrante: b.condicion_migrante ?? "",
      estado_clave: b.estado_clave ?? "",
      municipio_id: b.municipio_id ?? "",
      codigo_postal: b.codigo_postal ?? "",
      localidad_colonia: b.localidad_colonia ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const payload: TablesUpdate<'beneficiario'> = {
          ...formData,
        } as any;
        const { error } = await (supabase as any).from('beneficiario').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const payload: TablesInsert<'beneficiario'> = {
          ...formData,
        } as any;
        const { error } = await (supabase as any).from('beneficiario').insert(payload);
        if (error) throw error;
      }

      setShowForm(false);
      resetForm();
      await loadBeneficiarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBeneficiary = async (b: any) => {
    setDeleteTarget({id: b.id, nombre: `${b.nombre} ${b.primer_apellido}`});
    setDeleteInfo({count: 0, loading: true});
    const { count } = await supabase
      .from('asistencia')
      .select('id', { count: 'exact', head: true })
      .eq('beneficiario_id', b.id);
    setDeleteInfo({count: count || 0, loading: false});
  };

  const confirmDeleteBeneficiary = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('beneficiario').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadBeneficiarios();
    } catch (e) {
      alert((e as any)?.message || 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const sexoOptions = [
    { value: "F", label: "Femenino" },
    { value: "M", label: "Masculino" },
    { value: "X", label: "No especifica" },
  ];

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Beneficiarios</h1>
            <p className="text-gray-600 dark:text-gray-400">Consulta, agrega y edita beneficiarios</p>
          </div>

          <Role allow={["admin", "supervisor_central", "coordinador_sede"]}>
            <div className="mt-4 sm:mt-0">
              <button className="btn btn-primary btn-md" onClick={onCreate}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar Beneficiario
              </button>
            </div>
          </Role>
        </div>

        {showForm && (
          <div>
            <FormCard 
              title={editingId ? "Editar beneficiario" : "Nuevo beneficiario"}
              description="Complete los datos del beneficiario"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Nombre(s)" required value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: (e.target as HTMLInputElement).value })}
                  />
                  <Field label="Primer apellido" required value={formData.primer_apellido}
                    onChange={(e) => setFormData({ ...formData, primer_apellido: (e.target as HTMLInputElement).value })}
                  />
                  <Field label="Segundo apellido" value={formData.segundo_apellido || ''}
                    onChange={(e) => setFormData({ ...formData, segundo_apellido: (e.target as HTMLInputElement).value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Fecha de nacimiento" type="date" required value={formData.fecha_nacimiento || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: (e.target as HTMLInputElement).value })}
                  />
                  <Select label="Sexo" required value={formData.sexo || ''}
                    onChange={(e) => setFormData({ ...formData, sexo: (e.target as HTMLSelectElement).value })}
                    options={sexoOptions}
                  />
                  <Field label="CURP" value={formData.curp || ''}
                    onChange={(e) => setFormData({ ...formData, curp: (e.target as HTMLInputElement).value.toUpperCase() })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Escolaridad" value={formData.escolaridad || ''}
                    onChange={(e) => setFormData({ ...formData, escolaridad: (e.target as HTMLInputElement).value })}
                  />
                  <Field label="Lengua indígena" value={formData.lengua_indigena || ''}
                    onChange={(e) => setFormData({ ...formData, lengua_indigena: (e.target as HTMLInputElement).value })}
                  />
                  <Field label="Población indígena" value={formData.poblacion_indigena || ''}
                    onChange={(e) => setFormData({ ...formData, poblacion_indigena: (e.target as HTMLInputElement).value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Condición migrante/refugiada" value={formData.condicion_migrante || ''}
                    onChange={(e) => setFormData({ ...formData, condicion_migrante: (e.target as HTMLInputElement).value })}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Procedencia Geográfica</h3>
                  <GeoSelector
                    value={{
                      estado_clave: (formData.estado_clave as string) || "",
                      municipio_id: (formData.municipio_id as string) || "",
                      codigo_postal: (formData.codigo_postal as string) || "",
                      localidad_colonia: (formData.localidad_colonia as string) || "",
                    }}
                    onChange={(geo) => setFormData({ ...formData, ...geo })}
                  />
                </div>

                <div className="flex justify-between">
                  {editingId && (
                    <Role allow={['admin']}>
                      <button
                        type="button"
                        className="btn btn-danger btn-md"
                        disabled={saving}
                        onClick={() => handleDeleteBeneficiary({id: editingId, nombre: `${formData.nombre} ${formData.primer_apellido}`})}
                      >
                        Eliminar beneficiario
                      </button>
                    </Role>
                  )}
                  <div className="flex justify-end gap-3 ml-auto">
                  <button type="button" className="btn btn-secondary btn-md" onClick={() => { setShowForm(false); }} disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary btn-md relative" disabled={saving}>
                    {saving && (
                      <div className="absolute left-4">
                        <div className="loading-spinner"></div>
                      </div>
                    )}
                    {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Crear beneficiario')}
                  </button>
                  </div>
                </div>
              </form>
            </FormCard>
          </div>
        )}

        {!showForm && (
          <>
        {/* Buscador */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nombre, CURP o ubicación..."
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              onClear={() => setSearch("")}
            />
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <>
            <div className="card">
              <div className="card-body">
                <div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
            {loadError && (
              <div className="mt-4 alert alert-error flex items-center justify-between">
                <span>{loadError}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setAttempt(a => a + 1)}>Reintentar</button>
              </div>
            )}
          </>
        ) : error ? (
          <div className="alert alert-error flex items-center justify-between">
            <span>{error}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setAttempt(a => a + 1)}>Reintentar</button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="card">
            <div className="card-body overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Beneficiario</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sexo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Nac.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CURP</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ubicación</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actividades</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {b.nombre} {b.primer_apellido} {b.segundo_apellido ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{b.sexo}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {b.fecha_nacimiento ? new Date(b.fecha_nacimiento).toLocaleDateString('es-MX') : ''}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{b.curp ?? ''}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {[b.localidad_colonia, b.codigo_postal ? `CP ${b.codigo_postal}` : ''].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline"
                          onClick={() => loadHistory(b.id)}
                        >
                          {activityCounts[b.id] || 0}
                        </button>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <Role allow={["admin", "supervisor_central", "coordinador_sede"]}>
                          <button className="btn btn-secondary btn-sm" title="Editar beneficiario" onClick={() => onEdit(b)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </Role>
                      </td>
                    </tr>
                  ))}
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {search ? 'No se encontraron beneficiarios' : 'No hay beneficiarios registrados'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {search ? 'Ajusta tu búsqueda' : 'Comienza agregando un beneficiario'}
            </p>
            {!search && (
              <Role allow={["admin", "supervisor_central", "coordinador_sede"]}>
                <button className="btn btn-primary btn-md" onClick={onCreate}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Beneficiario
                </button>
              </Role>
            )}
          </div>
        )}
          </>
        )}

        <DeleteConfirm
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteBeneficiary}
          title={`Eliminar beneficiario "${deleteTarget?.nombre}"`}
          message={
            deleteInfo.loading ? "Verificando dependencias..." :
            deleteInfo.count > 0 ? (
              <p>Este beneficiario ha asistido a <strong>{deleteInfo.count} actividad{deleteInfo.count !== 1 ? 'es' : ''}</strong>. Al eliminarlo se quitarán esas asistencias. ¿Deseas continuar?</p>
            ) : (
              <p>¿Estás seguro de que deseas eliminar este beneficiario? Esta acción no se puede deshacer.</p>
            )
          }
          loading={deleting}
        />

        {historyBenefId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setHistoryBenefId(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Historial de participaciones
                  {(() => {
                    const b = beneficiarios.find(x => x.id === historyBenefId);
                    return b ? ` — ${b.nombre} ${b.primer_apellido}` : '';
                  })()}
                </h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHistoryBenefId(null)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {historyLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="loading-spinner"></div>
                    <span className="text-gray-500 dark:text-gray-400">Cargando historial...</span>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tiene participaciones registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {h.actividad?.fecha || '—'}
                            {h.actividad?.hora_inicio ? ` ${h.actividad.hora_inicio}` : ''}
                            {h.actividad?.hora_fin ? ` - ${h.actividad.hora_fin}` : ''}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {h.actividad?.programa?.nombre ? `${h.actividad.programa.nombre}` : ''}
                            {h.actividad?.tipo?.nombre || h.actividad?.subtipo?.nombre ? ` · ${h.actividad?.subtipo?.nombre || h.actividad?.tipo?.nombre}` : ''}
                            {h.actividad?.sede?.nombre ? ` · ${h.actividad.sede.nombre}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
