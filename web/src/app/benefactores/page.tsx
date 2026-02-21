"use client";
import { useEffect, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import DeleteConfirm from "../components/DeleteConfirm";
import { Field, Select } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";
import { ensureClientSession } from "../lib/clientSession";

interface BenefactorTipo { id: string; nombre: string; created_at: string | null; }
interface Benefactor { id: string; nombre: string; tipo_id: string; created_at: string | null; tipo?: { id: string; nombre: string }; }

export default function BenefactoresPage() {
  const [benefactorTipos, setBenefactorTipos] = useState<BenefactorTipo[]>([]);
  const [benefactores, setBenefactores] = useState<Benefactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{ blocked: boolean; message: string; loading: boolean }>({ blocked: false, message: '', loading: true });

  const [benefactorForm, setBenefactorForm] = useState<{ nombre: string; tipo_id: string }>({ nombre: "", tipo_id: "" });
  const [editBenefactor, setEditBenefactor] = useState<Record<string, { nombre: string; tipo_id: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureClientSession();
      const [bts, bns] = await Promise.all([
        (supabase as any).from("benefactor_tipo").select("id,nombre,created_at").order("nombre", { ascending: true }),
        (supabase as any).from("benefactor").select("id,nombre,tipo_id,created_at,tipo:tipo_id(id,nombre)").order("nombre", { ascending: true }),
      ]);
      if (bts.error) throw bts.error;
      if (bns.error) throw bns.error;
      setBenefactorTipos((bts.data as BenefactorTipo[]) || []);
      setBenefactores((bns.data as Benefactor[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los benefactores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ok = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 2000); };

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

  const confirmDeleteBenefactor = async (b: Benefactor) => {
    setDeleteTarget({ id: b.id, nombre: b.nombre });
    setDeleteBlocked({ blocked: false, message: '', loading: true });
    const { count } = await (supabase as any).from('programa').select('id', { count: 'exact', head: true }).eq('benefactor_id', b.id);
    const c = count || 0;
    setDeleteBlocked({
      blocked: c > 0,
      message: c > 0
        ? `Este benefactor está asignado a ${c} proyecto(s). Debes desvincularlo primero.`
        : '¿Estás seguro de que deseas eliminar este benefactor? Esta acción no se puede deshacer.',
      loading: false,
    });
  };

  const deleteBenefactor = async (id: string) => {
    setSaving(`benefactor:${id}`);
    try { const { error } = await (supabase as any).from("benefactor").delete().eq("id", id); if (error) throw error; await load(); ok("Benefactor eliminado"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar (puede estar asignado a un proyecto)"); }
    finally { setSaving(null); setDeleteTarget(null); }
  };

  return (
    <Protected>
      <Role allow={["admin","supervisor_central"]}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Benefactores</h1>
              <p className="text-gray-600 dark:text-gray-400">Gestiona los benefactores de proyectos</p>
            </div>
          </div>

          {notice && <div className="alert alert-success">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Benefactores */}
          <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Benefactores</h2>
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
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {benefactores.map(b => (
                      <tr key={b.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 min-w-[200px]">
                          {editBenefactor[b.id] ? (
                            <Select label="" value={editBenefactor[b.id].tipo_id} onChange={e => setEditBenefactor(p => ({ ...p, [b.id]: { ...p[b.id], tipo_id: e.target.value } }))} options={benefactorTipos.map(t => ({ value: t.id, label: t.nombre }))} />
                          ) : b.tipo?.nombre || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 min-w-[220px]">
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
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => confirmDeleteBenefactor(b)} disabled={saving === `benefactor:${b.id}`}>{saving === `benefactor:${b.id}` ? "Eliminando..." : "Eliminar"}</button>
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
          <DeleteConfirm
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => { if (deleteTarget) deleteBenefactor(deleteTarget.id); }}
            title="Eliminar benefactor"
            message={
              deleteBlocked.loading
                ? <p>Verificando dependencias...</p>
                : <p>{deleteBlocked.message}</p>
            }
            blocked={deleteBlocked.loading || deleteBlocked.blocked}
            loading={!!deleteTarget && saving === `benefactor:${deleteTarget.id}`}
          />
        </div>
      </Role>
    </Protected>
  );
}
