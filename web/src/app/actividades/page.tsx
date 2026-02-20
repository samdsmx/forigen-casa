"use client";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { supabase } from "../lib/supabaseClient";
import type { Tables } from "app/types/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Field, Select, SearchInput, Textarea } from "../components/Forms";
import GeoSelector, { type GeoValue } from "../components/GeoSelector";

export default function Actividades() {
  const [programas, setProgramas] = useState<{ value: string; label: string }[]>([]);
  const [tipos, setTipos] = useState<{ value: string; label: string }[]>([]);
  const [subtipos, setSubtipos] = useState<{ value: string; label: string }[]>([]);
  const [facilitadores, setFacilitadores] = useState<{ value: string; label: string }[]>([]);
  const [sedes, setSedes] = useState<{ value: string; label: string }[]>([]);
  const [list, setList] = useState<(Pick<Tables<'actividad'>, 'id' | 'fecha' | 'hora_inicio' | 'hora_fin' | 'programa_id'> & { programa?: { nombre?: string } | null })[]>([]);
  const [filterProgramaId, setFilterProgramaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipoId, setFilterTipoId] = useState("");
  const [filterSubtipoId, setFilterSubtipoId] = useState("");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterFacilitadorId, setFilterFacilitadorId] = useState("");
  const [filterSedeId, setFilterSedeId] = useState("");

  const [form, setForm] = useState<any>({
    programa_id:"", fecha:"", hora_inicio:"", hora_fin:"", tipo_id:"", subtipo_id:"", facilitador_id:"", cupo:"", notas:"",
    estado_clave:"", municipio_id:"", codigo_postal:"", localidad_colonia:""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      // Cargar usuarios (excepto admin) para facilitador
      try {
        const resp = await fetch('/api/users');
        const users = await resp.json();
        const opts = (users as any[])
          .filter(u => (u.role || '').toLowerCase() !== 'admin')
          .map(u => ({ value: u.id as string, label: `${u.email || u.id}${u.role ? ' - ' + u.role : ''}` }));
        setFacilitadores([{ value: '', label: 'Sin facilitador' }, ...opts]);
      } catch {}
      // Cargar sedes
      try {
        const { data: sed } = await supabase.from('sede').select('id,nombre');
        setSedes(((sed as Pick<Tables<'sede'>,'id'|'nombre'>[] | null) || [])
          .map(x => ({ value: x.id, label: x.nombre })));
      } catch {}

      // Determine filtered program from URL
      let pid = null;
      try {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
        pid = params.get('programa_id');
        setFilterProgramaId(pid);
      } catch { /* ignore */ }

      // Optimize query to filter by program_id if present
      let query = supabase
        .from("actividad")
        .select("id,fecha,hora_inicio,hora_fin,programa_id, facilitador_id, tipo:tipo_id(nombre), subtipo:subtipo_id(nombre), sede:sede_id(nombre), programa:programa_id(nombre)")
        .order("fecha",{ascending:false});

      if (pid) {
        query = query.eq('programa_id', pid);
      }

      const { data: a } = await query;
      setList(((a as any[]) || []) as any);
    })();
  },[]);

  const filteredList = list.filter(a => {
    if (filterProgramaId && a.programa_id !== filterProgramaId) return false;
    if (filterTipoId && (a as any).tipo_id !== filterTipoId) return false;
    if (filterSubtipoId && (a as any).subtipo_id !== filterSubtipoId) return false;
    if (filterFacilitadorId && (a as any).facilitador_id !== filterFacilitadorId) return false;
    if (filterSedeId && (a as any).sede_id !== filterSedeId) return false;
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

    const payload: any = {
      programa_id: form.programa_id,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      tipo_id: form.tipo_id || null,
      subtipo_id: form.subtipo_id || null,
      facilitador_id: form.facilitador_id || null,
      cupo: form.cupo ? Number(form.cupo) : null,
      estado_clave: form.estado_clave || null,
      municipio_id: form.municipio_id || null,
      codigo_postal: form.codigo_postal || null,
      localidad_colonia: form.localidad_colonia || null,
      notas: form.notas || null,
    };

    let error: any = null;
    if (editingId) {
      const resp = await (supabase as any).from("actividad").update(payload).eq("id", editingId);
      error = resp.error;
    } else {
      const resp = await (supabase as any).from("actividad").insert(payload as any);
      error = resp.error;
    }
    if (error) alert(error.message);
    else {
      const { data: a } = await supabase
        .from("actividad")
        .select("id,fecha,hora_inicio,hora_fin,programa_id, facilitador_id, tipo:tipo_id(nombre), subtipo:subtipo_id(nombre), sede:sede_id(nombre), programa:programa_id(nombre)")
        .order("fecha",{ascending:false});
      setList(((a as any[]) || []) as any);
      setForm({programa_id:"",fecha:"",hora_inicio:"",hora_fin:"",tipo_id:"",subtipo_id:"",facilitador_id:"",cupo:"", notas:"", estado_clave:"", municipio_id:"", codigo_postal:"", localidad_colonia:""});
      setEditingId(null);
      setErrors({});
    }
  };

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Actividades</h1>
            <p className="text-gray-600 dark:text-gray-400">Crea y gestiona las actividades</p>
          </div>
          <Role allow={['admin','supervisor_central','coordinador_sede']}>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowForm(!showForm)}
                className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} btn-md`}
                type="button"
              >
                {!showForm && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
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
              <div className="sm:col-span-2 lg:col-span-4">
                <GeoSelector
                  value={{
                    estado_clave: form.estado_clave,
                    municipio_id: form.municipio_id,
                    codigo_postal: form.codigo_postal,
                    localidad_colonia: form.localidad_colonia,
                  }}
                  onChange={(geo) => setForm({ ...form, ...geo })}
                />
              </div>
              <Select
                label="Facilitador"
                value={form.facilitador_id}
                onChange={(e:any)=>setForm({...form,facilitador_id:e.target.value})}
                options={facilitadores}
              />
              <div className="lg:col-span-4">
                <Textarea
                  label="Notas"
                  value={form.notas}
                  onChange={(e:any)=>setForm({...form,notas:e.target.value})}
                  placeholder="Observaciones relevantes (opcional)"
                  rows={4}
                />
              </div>
              <Field
                label="Cupo"
                type="number"
                min={0}
                value={form.cupo}
                onChange={(e:any)=>setForm({...form,cupo:e.target.value})}
                error={errors.cupo}
                help="Opcional"
              />
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => {
                    setForm({ programa_id:"", fecha:"", hora_inicio:"", hora_fin:"", tipo_id:"", subtipo_id:"", facilitador_id:"", cupo:"", notas:"", estado_clave:"", municipio_id:"", codigo_postal:"", localidad_colonia:"" });
                    setEditingId(null);
                  }}
                >
                  Limpiar
                </button>
                <button className="btn btn-primary btn-md" type="submit">{editingId ? 'Guardar cambios' : 'Crear actividad'}</button>
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
                  label="Buscar"
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
                label="Sede"
                options={[{ value: "", label: "Todas" }, ...sedes]}
                value={filterSedeId}
                onChange={(e:any) => setFilterSedeId(e.target.value)}
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
              <Select
                label="Facilitador"
                options={[{ value: "", label: "Todos" }, ...facilitadores.filter(f => f.value !== '')]}
                value={filterFacilitadorId}
                onChange={(e:any) => setFilterFacilitadorId(e.target.value)}
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
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {(filterProgramaId || filterSedeId || filterTipoId || filterSubtipoId || filterFacilitadorId || filterDesde || filterHasta || searchTerm) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setFilterProgramaId(null); setFilterSedeId(""); setFilterTipoId(""); setFilterSubtipoId(""); setFilterFacilitadorId(""); setFilterDesde(""); setFilterHasta(""); setSearchTerm(""); }}
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
              {filterSedeId && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Sede: {sedes.find(s => s.value === filterSedeId)?.label || filterSedeId}
                  <button type="button" className="ml-2 text-green-700 hover:text-green-900" onClick={() => setFilterSedeId("")}>x</button>
                </span>
              )}
              {filterTipoId && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Tipo: {tipos.find(t => t.value === filterTipoId)?.label || filterTipoId}
                  <button type="button" className="ml-2 text-purple-700 hover:text-purple-900" onClick={() => setFilterTipoId("")}>x</button>
                </span>
              )}
              {filterSubtipoId && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Subtipo: {subtipos.find(st => st.value === filterSubtipoId)?.label || filterSubtipoId}
                  <button type="button" className="ml-2 text-orange-700 hover:text-orange-900" onClick={() => setFilterSubtipoId("")}>x</button>
                </span>
              )}
              {filterFacilitadorId && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Facilitador: {facilitadores.find(f => f.value === filterFacilitadorId)?.label || filterFacilitadorId}
                  <button type="button" className="ml-2 text-blue-700 hover:text-blue-900" onClick={() => setFilterFacilitadorId("")}>x</button>
                </span>
              )}
            </div>
          </div>
        </div>

        <section className="grid gap-3">
          {filteredList.map((a)=> {
            const facilId = (a as any).facilitador_id as string | undefined;
            const facilLabel = facilId ? (facilitadores.find(f => f.value === facilId)?.label || '') : '';
            return (
            <div key={a.id} className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-medium">{a.fecha} {a.hora_inicio}-{a.hora_fin}</div>
                {a.programa?.nombre && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">Proyecto: {a.programa.nombre}</div>
                )}
                {((a as any).subtipo?.nombre || (a as any).tipo?.nombre) && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">Tipo: {(a as any).subtipo?.nombre || (a as any).tipo?.nombre}</div>
                )}
                {(a as any).sede?.nombre && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">Sede: {(a as any).sede?.nombre}</div>
                )}
                {facilLabel && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">Facilitador: {facilLabel}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Role allow={['admin','supervisor_central','coordinador_sede']}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase
                          .from('actividad')
                          .select('*')
                          .eq('id', a.id)
                          .single();
                        if (error) throw error;
                        const act: any = data;
                        setForm({
                          programa_id: act.programa_id || '',
                          fecha: act.fecha || '',
                          hora_inicio: act.hora_inicio || '',
                          hora_fin: act.hora_fin || '',
                          tipo_id: act.tipo_id || '',
                          subtipo_id: act.subtipo_id || '',
                          facilitador_id: act.facilitador_id || '',
                          cupo: act.cupo?.toString() || '',
                          notas: act.notas || '',
                          estado_clave: act.estado_clave || '',
                          municipio_id: act.municipio_id || '',
                          codigo_postal: act.codigo_postal || '',
                          localidad_colonia: act.localidad_colonia || '',
                        });
                        setEditingId(a.id);
                        setShowForm(true);
                      } catch (e) {
                        alert((e as any)?.message || 'No se pudo cargar la actividad');
                      }
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </Role>
                <Link className="btn btn-primary btn-sm" href={`/asistencia/${a.id}`}>Registrar asistencia</Link>
              </div>
            </div>
          );})}
        </section>
      </div>
    </Protected>
  );
}
