"use client";
import { useEffect, useMemo, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field, Select, FormCard, SearchInput } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";
import type { Tables, TablesInsert, TablesUpdate } from "../types/supabase";

type Beneficiario = Tables<'beneficiario'>;

export default function BeneficiariosPage() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    condicion_migrante: ""
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
      const { data, error } = await supabase
        .from("beneficiario")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBeneficiarios((data as Beneficiario[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar beneficiarios");
      setLoadError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
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
        (b.escolaridad ?? '').toLowerCase().includes(q)
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
      condicion_migrante: ""
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Beneficiarios</h1>
            <p className="text-gray-600">Consulta, agrega y edita beneficiarios</p>
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

                <div className="flex justify-end gap-3">
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
              </form>
            </FormCard>
          </div>
        )}

        {/* Buscador */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nombre, CURP o escolaridad..."
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
                <div className="animate-pulse h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="animate-pulse h-4 bg-gray-200 rounded w-2/3"></div>
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sexo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Nac.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CURP</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escolaridad</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {b.nombre} {b.primer_apellido} {b.segundo_apellido ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{b.sexo}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {b.fecha_nacimiento ? new Date(b.fecha_nacimiento).toLocaleDateString('es-MX') : ''}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{b.curp ?? ''}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{b.escolaridad ?? ''}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <Role allow={["admin", "supervisor_central", "coordinador_sede"]}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(b)}>
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
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No se encontraron beneficiarios' : 'No hay beneficiarios registrados'}
            </h3>
            <p className="text-gray-500 mb-6">
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
      </div>
    </Protected>
  );
}
