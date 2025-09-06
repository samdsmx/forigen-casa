
"use client";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { supabase } from "../lib/supabaseClient";
import type { Tables } from "app/types/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Field, Select, SearchInput } from "../components/Forms";

export default function Actividades() {
  const [programas, setProgramas] = useState<{ value: string; label: string }[]>([]);
  const [tipos, setTipos] = useState<{ value: string; label: string }[]>([]);
  const [subtipos, setSubtipos] = useState<{ value: string; label: string }[]>([]);
  const [list, setList] = useState<(Pick<Tables<'actividad'>, 'id' | 'fecha' | 'hora_inicio' | 'hora_fin' | 'programa_id'> & { programa?: { nombre?: string } | null })[]>([]);
  const [filterProgramaId, setFilterProgramaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipoId, setFilterTipoId] = useState("");
  const [filterSubtipoId, setFilterSubtipoId] = useState("");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");

  const [form, setForm] = useState<any>({
    programa_id:"", fecha:"", hora_inicio:"", hora_fin:"", tipo_id:"", subtipo_id:"", facilitador_id:"", cupo:""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  useEffect(()=>{
    (async()=>{
      const { data: p } = await supabase.from("programa").select("id,nombre");
      setProgramas(((p as Pick<Tables<'programa'>,'id'|'nombre'>[] | null) || [])
        .map(x => ({ value: x.id, label: x.nombre })));
      const { data: t } = await supabase.from("actividad_tipo").select("id,nombre");
      setTipos(((t as Pick<Tables<'actividad_tipo'>,'id'|'nombre'>[] | null) || [])
        .map(x => ({ value: x.id, label: x.nombre })));
      const { data: s } = await supabase.from("actividad_subtipo").select("id,nombre");
      setSubtipos(((s as Pick<Tables<'actividad_subtipo'>,'id'|'nombre'>[] | null) || [])
        .map(x => ({ value: x.id, label: x.nombre })));
      const { data: a } = await supabase
        .from("actividad")
        .select("id,fecha,hora_inicio,hora_fin,programa_id, programa:programa_id(nombre)")
        .order("fecha",{ascending:false});
      setList(((a as any[]) || []) as any);
    })();
  },[]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
      const pid = params.get('programa_id');
      setFilterProgramaId(pid);
    } catch { /* ignore */ }
  }, []);

  const filteredList = list.filter(a => {
    if (filterProgramaId && a.programa_id !== filterProgramaId) return false;
    if (filterTipoId && (a as any).tipo_id !== filterTipoId) return false;
    if (filterSubtipoId && (a as any).subtipo_id !== filterSubtipoId) return false;
    if (filterDesde && a.fecha < filterDesde) return false;
    if (filterHasta && a.fecha > filterHasta) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const nombreProg = a.programa?.nombre?.toLowerCase() || "";
      if (!nombreProg.includes(q)) return false;
    }
    return true;
  });

  const create = async (e:any) => {
    e.preventDefault();
    // Validaciones mínimas
    const newErrors: Record<string, string> = {};
    if (!form.programa_id) newErrors.programa_id = "Selecciona un programa";
    if (!form.fecha) newErrors.fecha = "Ingresa la fecha";
    if (form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio) {
      newErrors.hora_fin = "La hora fin debe ser posterior a la hora inicio";
    }
    if (form.cupo && Number(form.cupo) < 0) newErrors.cupo = "El cupo no puede ser negativo";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const { error } = await supabase.from("actividad").insert({
      programa_id: form.programa_id,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      tipo_id: form.tipo_id || null,
      subtipo_id: form.subtipo_id || null,
      facilitador_id: form.facilitador_id || null,
      cupo: form.cupo ? Number(form.cupo) : null
    } as any);
    if (error) alert(error.message);
    else {
      const { data: a } = await supabase
        .from("actividad")
        .select("id,fecha,hora_inicio,hora_fin,programa_id, programa:programa_id(nombre)")
        .order("fecha",{ascending:false});
      setList(((a as any[]) || []) as any);
      setForm({programa_id:"",fecha:"",hora_inicio:"",hora_fin:"",tipo_id:"",subtipo_id:"",facilitador_id:"",cupo:""});
      setErrors({});
    }
  };

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Actividades</h1>
            <p className="text-gray-600">Crea y gestiona las actividades</p>
          </div>
          <Role allow={['admin','supervisor_central','coordinador_sede']}>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary btn-md"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {showForm ? 'Cancelar' : 'Nueva Actividad'}
              </button>
            </div>
          </Role>
        </div>

        {showForm && (
          <Role allow={['admin','supervisor_central','coordinador_sede']}>
            <form onSubmit={create} className="card p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Select
                label="Proyecto"
                options={programas}
                value={form.programa_id}
                onChange={(e:any)=>setForm({...form,programa_id:e.target.value})}
                required
                error={errors.programa_id}
                help="Proyecto al que pertenece la actividad"
              />
              <Field
                label="Fecha"
                type="date"
                value={form.fecha}
                onChange={(e:any)=>setForm({...form,fecha:e.target.value})}
                required
                error={errors.fecha}
                help="Formato AAAA-MM-DD"
              />
              <Field
                label="Hora inicio"
                type="time"
                value={form.hora_inicio}
                onChange={(e:any)=>setForm({...form,hora_inicio:e.target.value})}
                help="Opcional"
              />
              <Field
                label="Hora fin"
                type="time"
                value={form.hora_fin}
                onChange={(e:any)=>setForm({...form,hora_fin:e.target.value})}
                error={errors.hora_fin}
                help="Opcional"
              />
              <Select label="Tipo" options={tipos} value={form.tipo_id} onChange={(e:any)=>setForm({...form,tipo_id:e.target.value})} />
              <Select label="Subtipo" options={subtipos} value={form.subtipo_id} onChange={(e:any)=>setForm({...form,subtipo_id:e.target.value})} />
              <Field
                label="Cupo"
                type="number"
                min={0}
                value={form.cupo}
                onChange={(e:any)=>setForm({...form,cupo:e.target.value})}
                error={errors.cupo}
                help="Opcional"
              />
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button className="btn btn-primary btn-md" type="submit">Crear actividad</button>
              </div>
            </form>
          </Role>
        )}

        {/* Filtros de lista */}
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <SearchInput
                  placeholder="Buscar por nombre de proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                  onClear={() => setSearchTerm("")}
                />
              </div>
              <Select
                label="Proyecto"
                options={programas}
                value={filterProgramaId ?? ""}
                onChange={(e:any) => setFilterProgramaId(e.target.value || null)}
              />
              <Select
                label="Tipo"
                options={[{ value: "", label: "Todos" }, ...tipos]}
                value={filterTipoId}
                onChange={(e:any) => setFilterTipoId(e.target.value)}
              />
              <Select
                label="Subtipo"
                options={[{ value: "", label: "Todos" }, ...subtipos]}
                value={filterSubtipoId}
                onChange={(e:any) => setFilterSubtipoId(e.target.value)}
              />
              <Field
                label="Desde"
                type="date"
                value={filterDesde}
                onChange={(e:any) => setFilterDesde(e.target.value)}
              />
              <Field
                label="Hasta"
                type="date"
                value={filterHasta}
                onChange={(e:any) => setFilterHasta(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              {(filterProgramaId || filterTipoId || filterSubtipoId || filterDesde || filterHasta || searchTerm) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setFilterProgramaId(null); setFilterTipoId(""); setFilterSubtipoId(""); setFilterDesde(""); setFilterHasta(""); setSearchTerm(""); }}
                >
                  Limpiar filtros
                </button>
              )}
              {filterProgramaId && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                  Proyecto: {programas.find(p => p.value === filterProgramaId)?.label || filterProgramaId}
                  <button type="button" className="ml-2 text-brand-700 hover:text-brand-900" onClick={() => setFilterProgramaId(null)}>×</button>
                </span>
              )}
            </div>
          </div>
        </div>

        <section className="grid gap-3">
          {filteredList.map((a)=> (
            <div key={a.id} className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-medium">{a.fecha} {a.hora_inicio}-{a.hora_fin}</div>
                {a.programa?.nombre && (
                  <div className="text-xs text-gray-600">Proyecto: {a.programa.nombre}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Link className="btn btn-primary btn-sm" href={`/asistencia/${a.id}`}>Registrar asistencia</Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Protected>
  );
}
