"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field, Select, Textarea, FormCard, SearchInput } from "../components/Forms";
import type { Tables, TablesInsert } from "../types/supabase";

interface Programa {
  id: string;
  nombre: string;
  objetivo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  metas_clave: string | null;
  estado: string;
  sede: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
  tema: {
    id: string;
    nombre: string;
  } | null;
  poblacion_grupo: {
    id: string;
    nombre: string;
  } | null;
  benefactor: {
    id: string;
    nombre: string;
  } | null;
  _count?: {
    actividades: number;
  };
  created_at: string | null;
}

interface FormData {
  nombre: string;
  objetivo: string;
  sede_id: string;
  tema_id: string;
  poblacion_grupo_id: string;
  benefactor_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  metas_clave: string;
  estado: string;
}

export default function ProyectosPage() {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [filteredProgramas, setFilteredProgramas] = useState<Programa[]>([]);
  const [sedes, setSedes] = useState<{ value: string; label: string }[]>([]);
  const [temas, setTemas] = useState<{ value: string; label: string }[]>([]);
  const [poblacionGrupos, setPoblacionGrupos] = useState<{ value: string; label: string }[]>([]);
  const [benefactores, setBenefactores] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    objetivo: "",
    sede_id: "",
    tema_id: "",
    poblacion_grupo_id: "",
    benefactor_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    metas_clave: "",
    estado: "activo"
  });

  useEffect(() => {
    let timeout: any;
    (async () => {
      setLoading(true);
      setLoadError(null);
      await loadData();
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

  // Inicializa filtro desde querystring (estado=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
      const estado = params.get('estado');
      if (estado) setFilterEstado(estado);
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    filterProgramas();
  }, [programas, searchTerm, filterEstado]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadError(null);

      // Load dropdowns data
      const [sedesRes, temasRes, poblacionRes, benefactoresRes] = await Promise.all([
        supabase.from("sede").select("id, nombre, slug"),
        supabase.from("tema").select("id, nombre"),
        supabase.from("poblacion_grupo").select("id, nombre"),
        (supabase as any).from("benefactor").select("id, nombre")
      ]);

      if (sedesRes.data) {
        const s = sedesRes.data as Pick<Tables<'sede'>, 'id' | 'nombre' | 'slug'>[];
        setSedes(s.map(s => ({ value: s.id, label: s.nombre })));
      }
      if (temasRes.data) {
        const t = temasRes.data as Pick<Tables<'tema'>, 'id' | 'nombre'>[];
        setTemas(t.map(t => ({ value: t.id, label: t.nombre })));
      }
      if (poblacionRes.data) {
        const p = poblacionRes.data as Pick<Tables<'poblacion_grupo'>, 'id' | 'nombre'>[];
        setPoblacionGrupos(p.map(p => ({ value: p.id, label: p.nombre })));
      }
      if (benefactoresRes.data) {
        setBenefactores((benefactoresRes.data as any[]).map((b: any) => ({ value: b.id, label: b.nombre })));
      }

      // Load programas with relations
      const { data, error } = await (supabase as any)
        .from("programa")
        .select(`
          *,
          sede:sede_id(id, nombre, slug),
          tema:tema_id(id, nombre),
          poblacion_grupo:poblacion_grupo_id(id, nombre),
          benefactor:benefactor_id(id, nombre)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProgramas(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      setLoadError(err instanceof Error ? err.message : 'Error al cargar');
      console.error('Error loading programas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterProgramas = () => {
    let filtered = programas;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.objetivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sede?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterEstado) {
      filtered = filtered.filter(p => p.estado === filterEstado);
    }

    setFilteredProgramas(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = editingId ? "¿Guardar los cambios en este proyecto?" : "¿Crear este nuevo proyecto?";
    if (!confirm(msg)) return;
    setCreating(true);
    setError(null);

    try {
      const payload: any = {
        nombre: formData.nombre.trim(),
        objetivo: formData.objetivo.trim() || null,
        sede_id: formData.sede_id,
        tema_id: formData.tema_id || null,
        poblacion_grupo_id: formData.poblacion_grupo_id || null,
        benefactor_id: formData.benefactor_id || null,
        fecha_inicio: formData.fecha_inicio || null,
        fecha_fin: formData.fecha_fin || null,
        metas_clave: formData.metas_clave.trim() || null,
        estado: formData.estado
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("programa")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("programa").insert(payload);
        if (error) throw error;
      }

      // Reset form and reload data
      setFormData({
        nombre: "",
        objetivo: "",
        sede_id: "",
        tema_id: "",
        poblacion_grupo_id: "",
        benefactor_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        metas_clave: "",
        estado: "activo"
      });
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el programa');
    } finally {
      setCreating(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      activo: "badge badge-success",
      inactivo: "badge badge-gray",
      completado: "badge badge-primary",
      suspendido: "badge badge-warning"
    };
    return badges[estado as keyof typeof badges] || "badge badge-gray";
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'activo': return '🟢';
      case 'completado': return '✅';
      case 'suspendido': return '⏸️';
      case 'inactivo': return '⭕';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <Protected>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="card">
                  <div className="card-body">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
            {loadError && (
              <div className="alert alert-error flex items-center justify-between">
                <span>{loadError}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setAttempt(a => a + 1)}>Reintentar</button>
              </div>
            )}
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Proyectos
            </h1>
            <p className="text-gray-600">
              Gestiona los proyectos activos y sus actividades
            </p>
          </div>
          
          <Role allow={['admin', 'supervisor_central', 'coordinador_sede']}>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => { setShowForm(!showForm); if (!showForm) setEditingId(null); }}
                className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} btn-md`}
                type="button"
              >
                {!showForm && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
                {showForm ? 'Cancelar' : editingId ? 'Editando...' : 'Nuevo Proyecto'}
              </button>
            </div>
          </Role>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="animate-fade-in-down">
            <FormCard
              title={editingId ? "Editar Proyecto" : "Crear Nuevo Proyecto"}
              description={editingId ? "Modifique los datos del proyecto" : "Complete la información del programa que desea crear"}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Nombre del Proyecto"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Proyecto de Desarrollo Comunitario"
                    required
                  />

                  <Select
                    label="Sede"
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    options={sedes}
                    required
                  />

                  <Select
                    label="Tema Principal"
                    value={formData.tema_id}
                    onChange={(e) => setFormData({ ...formData, tema_id: e.target.value })}
                    options={temas}
                    placeholder="Seleccione un tema..."
                  />

                  <Select
                    label="Población Objetivo"
                    value={formData.poblacion_grupo_id}
                    onChange={(e) => setFormData({ ...formData, poblacion_grupo_id: e.target.value })}
                    options={poblacionGrupos}
                    placeholder="Seleccione un grupo..."
                  />

                  <Select
                    label="Benefactor"
                    value={formData.benefactor_id}
                    onChange={(e) => setFormData({ ...formData, benefactor_id: e.target.value })}
                    options={benefactores}
                    placeholder="Seleccione un benefactor..."
                  />

                  <Field
                    label="Fecha de Inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  />

                  <Field
                    label="Fecha de Fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  />

                  <Select
                    label="Estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    options={[
                      { value: "activo", label: "Activo" },
                      { value: "inactivo", label: "Inactivo" },
                      { value: "completado", label: "Completado" },
                      { value: "suspendido", label: "Suspendido" }
                    ]}
                    required
                  />
                </div>

                <Textarea
                  label="Objetivo del Proyecto"
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Describa los objetivos principales del proyecto..."
                  rows={3}
                />

                <Textarea
                  label="Metas Clave"
                  value={formData.metas_clave}
                  onChange={(e) => setFormData({ ...formData, metas_clave: e.target.value })}
                  placeholder="Defina las metas específicas y medibles del proyecto..."
                  rows={3}
                />

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn btn-secondary btn-md"
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md relative"
                    disabled={creating}
                  >
                    {creating && (
                      <div className="absolute left-4">
                        <div className="loading-spinner"></div>
                      </div>
                    )}
                    {creating ? (editingId ? "Guardando..." : "Creando...") : (editingId ? "Guardar Cambios" : "Crear Proyecto")}
                  </button>
                </div>
              </form>
            </FormCard>
          </div>
        )}

        {/* Filters, Search and Grid - hidden when form is open */}
        {!showForm && (
          <>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nombre, objetivo o sede..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              label=""
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              options={[
                { value: "", label: "Todos los estados" },
                { value: "activo", label: "Activos" },
                { value: "inactivo", label: "Inactivos" },
                { value: "completado", label: "Completados" },
                { value: "suspendido", label: "Suspendidos" }
              ]}
            />
          </div>
        </div>

        {/* Programs Grid */}
        {filteredProgramas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProgramas.map((programa, index) => (
              <div
                key={programa.id}
                className="card hover:shadow-lg transition-all duration-200 animate-fade-in h-full flex flex-col"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="card-body flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getEstadoIcon(programa.estado)}</span>
                      <span className={getEstadoBadge(programa.estado)}>
                        {programa.estado}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(programa.created_at ?? "").toLocaleDateString('es-MX')}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {programa.nombre}
                  </h3>

                  {programa.objetivo && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {programa.objetivo}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    {programa.sede && (
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {programa.sede.nombre}
                      </div>
                    )}

                    {programa.tema && (
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {programa.tema.nombre}
                      </div>
                    )}

                    {programa.poblacion_grupo && (
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {programa.poblacion_grupo.nombre}
                      </div>
                    )}

                    {(programa as any).benefactor && (
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {(programa as any).benefactor.nombre}
                      </div>
                    )}

                    {programa.fecha_inicio && programa.fecha_fin && (
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(programa.fecha_inicio).toLocaleDateString('es-MX')} - {new Date(programa.fecha_fin).toLocaleDateString('es-MX')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex space-x-2">
                      <button className="btn btn-secondary btn-sm" title="Editar proyecto" onClick={() => {
                        setFormData({
                          nombre: programa.nombre,
                          objetivo: programa.objetivo ?? "",
                          sede_id: programa.sede?.id ?? "",
                          tema_id: programa.tema?.id ?? "",
                          poblacion_grupo_id: programa.poblacion_grupo?.id ?? "",
                          benefactor_id: (programa as any).benefactor?.id ?? "",
                          fecha_inicio: (programa.fecha_inicio as any) || "",
                          fecha_fin: (programa.fecha_fin as any) || "",
                          metas_clave: programa.metas_clave ?? "",
                          estado: programa.estado
                        });
                        setEditingId(programa.id);
                        setShowForm(true);
                      }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="btn btn-secondary btn-sm" title="Clonar proyecto" onClick={() => {
                        setFormData({
                          nombre: programa.nombre + " (copia)",
                          objetivo: programa.objetivo ?? "",
                          sede_id: programa.sede?.id ?? "",
                          tema_id: programa.tema?.id ?? "",
                          poblacion_grupo_id: programa.poblacion_grupo?.id ?? "",
                          benefactor_id: (programa as any).benefactor?.id ?? "",
                          fecha_inicio: "",
                          fecha_fin: "",
                          metas_clave: programa.metas_clave ?? "",
                          estado: "activo"
                        });
                        setEditingId(null);
                        setShowForm(true);
                      }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <Link className="btn btn-secondary btn-sm" title="Ver actividades" href={`/actividades?programa_id=${programa.id}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                    <div className="text-xs text-gray-500"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterEstado ? 'No se encontraron proyectos' : 'No hay proyectos creados'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterEstado 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primer proyecto para organizar las actividades'
              }
            </p>
            {!searchTerm && !filterEstado && (
              <Role allow={['admin', 'supervisor_central', 'coordinador_sede']}>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary btn-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Crear Primer Proyecto
                </button>
              </Role>
            )}
          </div>
        )}

        {/* Stats Summary */}
        {filteredProgramas.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{filteredProgramas.length}</div>
                <div className="text-sm text-gray-500">
                  {filteredProgramas.length === 1 ? 'Proyecto' : 'Proyectos'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredProgramas.filter(p => p.estado === 'activo').length}
                </div>
                <div className="text-sm text-gray-500">Activos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-600">
                  {filteredProgramas.filter(p => p.estado === 'completado').length}
                </div>
                <div className="text-sm text-gray-500">Completados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {filteredProgramas.filter(p => p.estado === 'suspendido').length}
                </div>
                <div className="text-sm text-gray-500">Suspendidos</div>
              </div>
            </div>
          </div>
        )}

          </>
        )}
      </div>
    </Protected>
  );
}
