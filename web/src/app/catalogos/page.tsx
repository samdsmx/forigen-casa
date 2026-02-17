"use client";
import { useEffect, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field, Select } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";
import { ensureClientSession } from "../lib/clientSession";
import type { Tables, TablesInsert, TablesUpdate } from "app/types/supabase";

type Tema = Tables<'tema'>;
type Tipo = Tables<'actividad_tipo'>;
type Subtipo = Tables<'actividad_subtipo'>;

interface BenefactorTipo { id: string; nombre: string; created_at: string | null; }
interface Benefactor { id: string; nombre: string; tipo_id: string; created_at: string | null; tipo?: { id: string; nombre: string }; }

export default function CatalogosPage() {
  // Data lists
  const [temas, setTemas] = useState<Tema[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [subtipos, setSubtipos] = useState<(Subtipo & { tipo?: Pick<Tipo, 'nombre'> })[]>([]);
  const [benefactorTipos, setBenefactorTipos] = useState<BenefactorTipo[]>([]);
  const [benefactores, setBenefactores] = useState<Benefactor[]>([]);
  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Forms
  const [temaForm, setTemaForm] = useState<Pick<Tema, 'nombre'>>({ nombre: "" });
  const [tipoForm, setTipoForm] = useState<Pick<Tipo, 'nombre'>>({ nombre: "" });
  const [subtipoForm, setSubtipoForm] = useState<{ nombre: string; tipo_id: string }>({ nombre: "", tipo_id: "" });
  const [bTipoForm, setBTipoForm] = useState<{ nombre: string }>({ nombre: "" });
  const [benefactorForm, setBenefactorForm] = useState<{ nombre: string; tipo_id: string }>({ nombre: "", tipo_id: "" });

  const [editTema, setEditTema] = useState<Record<string, Pick<Tema, 'nombre'>>>({});
  const [editTipo, setEditTipo] = useState<Record<string, Pick<Tipo, 'nombre'>>>({});
  const [editSubtipo, setEditSubtipo] = useState<Record<string, { nombre: string; tipo_id: string }>>({});
  const [editBTipo, setEditBTipo] = useState<Record<string, { nombre: string }>>({});
  const [editBenefactor, setEditBenefactor] = useState<Record<string, { nombre: string; tipo_id: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureClientSession();
      const [tms, tps, sbt, bts, bns] = await Promise.all([
        supabase.from("tema").select("id,nombre,created_at").order("nombre", { ascending: true }),
        supabase.from("actividad_tipo").select("id,nombre,created_at").order("nombre", { ascending: true }),
        supabase.from("actividad_subtipo").select("id,nombre,tipo:tipo_id(id,nombre)").order("nombre", { ascending: true }),
        supabase.from("benefactor_tipo").select("id,nombre,created_at").order("nombre", { ascending: true }),
        supabase.from("benefactor").select("id,nombre,tipo_id,created_at,tipo:tipo_id(id,nombre)").order("nombre", { ascending: true }),
      ]);
      if (tms.error) throw tms.error;
      if (tps.error) throw tps.error;
      if (sbt.error) throw sbt.error;
      if (bts.error) throw bts.error;
      if (bns.error) throw bns.error;
      setTemas((tms.data as Tema[]) || []);
      setTipos((tps.data as Tipo[]) || []);
      setSubtipos(((sbt.data as any[]) || []).map(x => ({ id: x.id, nombre: x.nombre, tipo_id: x.tipo?.id, created_at: null as any, tipo: x.tipo })) as any);
      setBenefactorTipos((bts.data as BenefactorTipo[]) || []);
      setBenefactores((bns.data as Benefactor[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los catálogos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ok = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 2000); };

  // CRUD helpers
  const createTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temaForm.nombre.trim()) return setError("Ingresa el nombre del tema");
    setSaving("tema:new"); setError(null);
    try {
      const payload: TablesInsert<'tema'> = { nombre: temaForm.nombre.trim() } as TablesInsert<'tema'>;
      const { error } = await (supabase as any).from("tema").insert(payload);
      if (error) throw error;
      setTemaForm({ nombre: "" });
      await load(); ok("Tema creado");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear tema"); }
    finally { setSaving(null); }
  };

  const updateTema = async (id: string) => {
    const form = editTema[id]; if (!form) return;
    if (!form.nombre.trim()) return setError("Nombre requerido");
    setSaving(`tema:${id}`); setError(null);
    try {
      const payload: TablesUpdate<'tema'> = { nombre: form.nombre.trim() } as TablesUpdate<'tema'>;
      const { error } = await (supabase as any).from("tema").update(payload).eq("id", id);
      if (error) throw error;
      await load(); ok("Tema actualizado");
      setEditTema(prev => { const p = { ...prev }; delete p[id]; return p; });
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar tema"); }
    finally { setSaving(null); }
  };

  const deleteTema = async (id: string) => {
    if (!confirm("¿Eliminar tema?")) return;
    setSaving(`tema:${id}`);
    try { const { error } = await (supabase as any).from("tema").delete().eq("id", id); if (error) throw error; await load(); ok("Tema eliminado"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar"); }
    finally { setSaving(null); }
  };

  const createTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoForm.nombre.trim()) return setError("Ingresa el nombre del tipo");
    setSaving("tipo:new"); setError(null);
    try {
      const payload: TablesInsert<'actividad_tipo'> = { nombre: tipoForm.nombre.trim() } as TablesInsert<'actividad_tipo'>;
      const { error } = await (supabase as any).from("actividad_tipo").insert(payload);
      if (error) throw error;
      setTipoForm({ nombre: "" });
      await load(); ok("Tipo creado");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear tipo"); }
    finally { setSaving(null); }
  };

  const updateTipo = async (id: string) => {
    const form = editTipo[id]; if (!form) return;
    if (!form.nombre.trim()) return setError("Nombre requerido");
    setSaving(`tipo:${id}`); setError(null);
    try {
      const payload: TablesUpdate<'actividad_tipo'> = { nombre: form.nombre.trim() } as TablesUpdate<'actividad_tipo'>;
      const { error } = await (supabase as any).from("actividad_tipo").update(payload).eq("id", id);
      if (error) throw error;
      await load(); ok("Tipo actualizado");
      setEditTipo(prev => { const p = { ...prev }; delete p[id]; return p; });
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar tipo"); }
    finally { setSaving(null); }
  };

  const deleteTipo = async (id: string) => {
    if (!confirm("¿Eliminar tipo? Los subtipos asociados quedarán huérfanos.")) return;
    setSaving(`tipo:${id}`);
    try { const { error } = await (supabase as any).from("actividad_tipo").delete().eq("id", id); if (error) throw error; await load(); ok("Tipo eliminado"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar"); }
    finally { setSaving(null); }
  };

  const createSubtipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtipoForm.tipo_id) return setError("Selecciona un tipo");
    if (!subtipoForm.nombre.trim()) return setError("Ingresa el nombre del subtipo");
    setSaving("subtipo:new"); setError(null);
    try {
      const payload: TablesInsert<'actividad_subtipo'> = { nombre: subtipoForm.nombre.trim(), tipo_id: subtipoForm.tipo_id } as TablesInsert<'actividad_subtipo'>;
      const { error } = await (supabase as any).from("actividad_subtipo").insert(payload);
      if (error) throw error;
      setSubtipoForm({ nombre: "", tipo_id: "" });
      await load(); ok("Subtipo creado");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear subtipo"); }
    finally { setSaving(null); }
  };

  const updateSubtipo = async (id: string) => {
    const form = editSubtipo[id]; if (!form) return;
    if (!form.nombre.trim()) return setError("Nombre requerido");
    if (!form.tipo_id) return setError("Selecciona el tipo");
    setSaving(`subtipo:${id}`); setError(null);
    try {
      const payload: TablesUpdate<'actividad_subtipo'> = { nombre: form.nombre.trim(), tipo_id: form.tipo_id } as TablesUpdate<'actividad_subtipo'>;
      const { error } = await (supabase as any).from("actividad_subtipo").update(payload).eq("id", id);
      if (error) throw error;
      await load(); ok("Subtipo actualizado");
      setEditSubtipo(prev => { const p = { ...prev }; delete p[id]; return p; });
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar subtipo"); }
    finally { setSaving(null); }
  };

  const deleteSubtipo = async (id: string) => {
    if (!confirm("¿Eliminar subtipo?")) return;
    setSaving(`subtipo:${id}`);
    try { const { error } = await (supabase as any).from("actividad_subtipo").delete().eq("id", id); if (error) throw error; await load(); ok("Subtipo eliminado"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar"); }
    finally { setSaving(null); }
  };

  // --- Tipos de Benefactor CRUD ---
  const createBTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTipoForm.nombre.trim()) return setError("Ingresa el nombre del tipo de benefactor");
    setSaving("btipo:new"); setError(null);
    try {
      const { error } = await (supabase as any).from("benefactor_tipo").insert({ nombre: bTipoForm.nombre.trim() });
      if (error) throw error;
      setBTipoForm({ nombre: "" });
      await load(); ok("Tipo de benefactor creado");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear tipo de benefactor"); }
    finally { setSaving(null); }
  };

  const updateBTipo = async (id: string) => {
    const form = editBTipo[id]; if (!form) return;
    if (!form.nombre.trim()) return setError("Nombre requerido");
    setSaving(`btipo:${id}`); setError(null);
    try {
      const { error } = await (supabase as any).from("benefactor_tipo").update({ nombre: form.nombre.trim() }).eq("id", id);
      if (error) throw error;
      await load(); ok("Tipo de benefactor actualizado");
      setEditBTipo(prev => { const p = { ...prev }; delete p[id]; return p; });
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar"); }
    finally { setSaving(null); }
  };

  const deleteBTipo = async (id: string) => {
    if (!confirm("¿Eliminar tipo de benefactor? Los benefactores de este tipo quedarán sin tipo.")) return;
    setSaving(`btipo:${id}`);
    try { const { error } = await (supabase as any).from("benefactor_tipo").delete().eq("id", id); if (error) throw error; await load(); ok("Tipo de benefactor eliminado"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar (puede estar en uso)"); }
    finally { setSaving(null); }
  };

  // --- Benefactores CRUD ---
  const createBenefactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!benefactorForm.tipo_id) return setError("Selecciona un tipo de benefactor");
    if (!benefactorForm.nombre.trim()) return setError("Ingresa el nombre del benefactor");
    setSaving("benefactor:new"); setError(null);
    try {
      const { error } = await (supabase as any).from("benefactor").insert({ nombre: benefactorForm.nombre.trim(), tipo_id: benefactorForm.tipo_id });
      if (error) throw error;
      setBenefactorForm({ nombre: "", tipo_id: "" });
      await load(); ok("Benefactor creado");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear benefactor"); }
    finally { setSaving(null); }
  };

  const updateBenefactor = async (id: string) => {
    const form = editBenefactor[id]; if (!form) return;
    if (!form.nombre.trim()) return setError("Nombre requerido");
    if (!form.tipo_id) return setError("Selecciona el tipo");
    setSaving(`benefactor:${id}`); setError(null);
    try {
      const { error } = await (supabase as any).from("benefactor").update({ nombre: form.nombre.trim(), tipo_id: form.tipo_id }).eq("id", id);
      if (error) throw error;
      await load(); ok("Benefactor actualizado");
      setEditBenefactor(prev => { const p = { ...prev }; delete p[id]; return p; });
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar"); }
    finally { setSaving(null); }
  };

  const deleteBenefactor = async (id: string) => {
    if (!confirm("¿Eliminar benefactor?")) return;
    setSaving(`benefactor:${id}`);
    try { const { error } = await (supabase as any).from("benefactor").delete().eq("id", id); if (error) throw error; await load(); ok("Benefactor eliminado"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar (puede estar asignado a un proyecto)"); }
    finally { setSaving(null); }
  };

  return (
    <Protected>
      <Role allow={["admin","supervisor_central"]}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
              <p className="text-gray-600">Gestiona Temas, Tipos de actividad, Subtipos y Benefactores</p>
            </div>
          </div>

          {notice && <div className="alert alert-success">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Temas */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Temas</h2>
            </div>
            <form onSubmit={createTema} className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end">
              <Field label="Nombre" value={temaForm.nombre} onChange={e => setTemaForm({ nombre: e.target.value })} required />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md" disabled={saving === "tema:new"}>{saving === "tema:new" ? "Agregando..." : "Agregar tema"}</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              {loading ? <div className="p-2">Cargando...</div> : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {temas.map(t => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[220px]">
                          {editTema[t.id] ? (
                            <Field label="" value={editTema[t.id].nombre} onChange={e => setEditTema(prev => ({ ...prev, [t.id]: { nombre: e.target.value } }))} />
                          ) : t.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {editTema[t.id] ? (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => updateTema(t.id)} disabled={saving === `tema:${t.id}`}>{saving === `tema:${t.id}` ? "Guardando..." : "Guardar"}</button>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditTema(p => { const c = { ...p }; delete c[t.id]; return c; })}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditTema(p => ({ ...p, [t.id]: { nombre: t.nombre } }))}>Editar</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteTema(t.id)} disabled={saving === `tema:${t.id}`}>{saving === `tema:${t.id}` ? "Eliminando..." : "Eliminar"}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tipos */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tipos de actividad</h2>
            </div>
            <form onSubmit={createTipo} className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end">
              <Field label="Nombre" value={tipoForm.nombre} onChange={e => setTipoForm({ nombre: e.target.value })} required />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md" disabled={saving === "tipo:new"}>{saving === "tipo:new" ? "Agregando..." : "Agregar tipo"}</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              {loading ? <div className="p-2">Cargando...</div> : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {tipos.map(t => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[220px]">
                          {editTipo[t.id] ? (
                            <Field label="" value={editTipo[t.id].nombre} onChange={e => setEditTipo(prev => ({ ...prev, [t.id]: { nombre: e.target.value } }))} />
                          ) : t.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {editTipo[t.id] ? (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => updateTipo(t.id)} disabled={saving === `tipo:${t.id}`}>{saving === `tipo:${t.id}` ? "Guardando..." : "Guardar"}</button>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditTipo(p => { const c = { ...p }; delete c[t.id]; return c; })}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditTipo(p => ({ ...p, [t.id]: { nombre: t.nombre } }))}>Editar</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteTipo(t.id)} disabled={saving === `tipo:${t.id}`}>{saving === `tipo:${t.id}` ? "Eliminando..." : "Eliminar"}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Subtipos */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Subtipos</h2>
            </div>
            <form onSubmit={createSubtipo} className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end">
              <Select
                label="Tipo"
                required
                value={subtipoForm.tipo_id}
                onChange={e => setSubtipoForm({ ...subtipoForm, tipo_id: e.target.value })}
                options={tipos.map(t => ({ value: t.id, label: t.nombre }))}
              />
              <Field label="Nombre" value={subtipoForm.nombre} onChange={e => setSubtipoForm({ ...subtipoForm, nombre: e.target.value })} required />
              <div className="sm:col-span-1 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md" disabled={saving === "subtipo:new"}>{saving === "subtipo:new" ? "Agregando..." : "Agregar subtipo"}</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              {loading ? <div className="p-2">Cargando...</div> : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {subtipos.map(s => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px]">
                          {editSubtipo[s.id] ? (
                            <Select label="" value={editSubtipo[s.id].tipo_id} onChange={e => setEditSubtipo(p => ({ ...p, [s.id]: { ...p[s.id], tipo_id: e.target.value } }))} options={tipos.map(t => ({ value: t.id, label: t.nombre }))} />
                          ) : (s as any).tipo?.nombre || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[220px]">
                          {editSubtipo[s.id] ? (
                            <Field label="" value={editSubtipo[s.id].nombre} onChange={e => setEditSubtipo(p => ({ ...p, [s.id]: { ...p[s.id], nombre: e.target.value } }))} />
                          ) : s.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {editSubtipo[s.id] ? (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => updateSubtipo(s.id)} disabled={saving === `subtipo:${s.id}`}>{saving === `subtipo:${s.id}` ? "Guardando..." : "Guardar"}</button>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditSubtipo(p => { const c = { ...p }; delete c[s.id]; return c; })}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditSubtipo(p => ({ ...p, [s.id]: { nombre: s.nombre, tipo_id: (s as any).tipo_id || (s as any).tipo?.id || "" } }))}>Editar</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteSubtipo(s.id)} disabled={saving === `subtipo:${s.id}`}>{saving === `subtipo:${s.id}` ? "Eliminando..." : "Eliminar"}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tipos de Benefactor */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tipos de Benefactor</h2>
            </div>
            <form onSubmit={createBTipo} className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end">
              <Field label="Nombre" value={bTipoForm.nombre} onChange={e => setBTipoForm({ nombre: e.target.value })} required />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md" disabled={saving === "btipo:new"}>{saving === "btipo:new" ? "Agregando..." : "Agregar tipo"}</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              {loading ? <div className="p-2">Cargando...</div> : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {benefactorTipos.map(t => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[220px]">
                          {editBTipo[t.id] ? (
                            <Field label="" value={editBTipo[t.id].nombre} onChange={e => setEditBTipo(prev => ({ ...prev, [t.id]: { nombre: e.target.value } }))} />
                          ) : t.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {editBTipo[t.id] ? (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => updateBTipo(t.id)} disabled={saving === `btipo:${t.id}`}>{saving === `btipo:${t.id}` ? "Guardando..." : "Guardar"}</button>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditBTipo(p => { const c = { ...p }; delete c[t.id]; return c; })}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditBTipo(p => ({ ...p, [t.id]: { nombre: t.nombre } }))}>Editar</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteBTipo(t.id)} disabled={saving === `btipo:${t.id}`}>{saving === `btipo:${t.id}` ? "Eliminando..." : "Eliminar"}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Benefactores */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Benefactores</h2>
            </div>
            <form onSubmit={createBenefactor} className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end">
              <Select
                label="Tipo"
                required
                value={benefactorForm.tipo_id}
                onChange={e => setBenefactorForm({ ...benefactorForm, tipo_id: e.target.value })}
                options={benefactorTipos.map(t => ({ value: t.id, label: t.nombre }))}
              />
              <Field label="Nombre" value={benefactorForm.nombre} onChange={e => setBenefactorForm({ ...benefactorForm, nombre: e.target.value })} required />
              <div className="sm:col-span-1 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md" disabled={saving === "benefactor:new"}>{saving === "benefactor:new" ? "Agregando..." : "Agregar benefactor"}</button>
              </div>
            </form>
            <div className="overflow-x-auto">
              {loading ? <div className="p-2">Cargando...</div> : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {benefactores.map(b => (
                      <tr key={b.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px]">
                          {editBenefactor[b.id] ? (
                            <Select label="" value={editBenefactor[b.id].tipo_id} onChange={e => setEditBenefactor(p => ({ ...p, [b.id]: { ...p[b.id], tipo_id: e.target.value } }))} options={benefactorTipos.map(t => ({ value: t.id, label: t.nombre }))} />
                          ) : b.tipo?.nombre || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[220px]">
                          {editBenefactor[b.id] ? (
                            <Field label="" value={editBenefactor[b.id].nombre} onChange={e => setEditBenefactor(p => ({ ...p, [b.id]: { ...p[b.id], nombre: e.target.value } }))} />
                          ) : b.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {editBenefactor[b.id] ? (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => updateBenefactor(b.id)} disabled={saving === `benefactor:${b.id}`}>{saving === `benefactor:${b.id}` ? "Guardando..." : "Guardar"}</button>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditBenefactor(p => { const c = { ...p }; delete c[b.id]; return c; })}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditBenefactor(p => ({ ...p, [b.id]: { nombre: b.nombre, tipo_id: b.tipo_id || b.tipo?.id || "" } }))}>Editar</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteBenefactor(b.id)} disabled={saving === `benefactor:${b.id}`}>{saving === `benefactor:${b.id}` ? "Eliminando..." : "Eliminar"}</button>
                              </>
                            )}
                          </div>
                        </td>
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
