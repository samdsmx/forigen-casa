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
  const [detailBenefactor, setDetailBenefactor] = useState<Benefactor | null>(null);
  const [detailData, setDetailData] = useState<{programs: any[]; activityCount: number; beneficiaryCount: number; loading: boolean}>({programs: [], activityCount: 0, beneficiaryCount: 0, loading: true});

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

  const loadDetail = async (b: Benefactor) => {
    setDetailBenefactor(b);
    setDetailData({programs: [], activityCount: 0, beneficiaryCount: 0, loading: true});
    try {
      const { data: progs } = await (supabase as any)
        .from('programa')
        .select('id, nombre, estado, sede:sede_id(nombre), fecha_inicio, fecha_fin')
        .eq('benefactor_id', b.id)
        .order('created_at', { ascending: false });

      const programs = (progs as any[]) || [];
      let activityCount = 0;
      let beneficiaryCount = 0;

      if (programs.length > 0) {
        const progIds = programs.map((p: any) => p.id);
        const { count: actCount } = await supabase
          .from('actividad')
          .select('id', { count: 'exact', head: true })
          .in('programa_id', progIds);
        activityCount = actCount || 0;

        const { data: asist } = await supabase
          .from('asistencia')
          .select('beneficiario_id, actividad:actividad_id!inner(programa_id)')
          .in('actividad.programa_id', progIds);
        const uniqueBeneficiaries = new Set((asist as any[] || []).map((a: any) => a.beneficiario_id));
        beneficiaryCount = uniqueBeneficiaries.size;
      }

      setDetailData({programs, activityCount, beneficiaryCount, loading: false});
    } catch {
      setDetailData({programs: [], activityCount: 0, beneficiaryCount: 0, loading: false});
    }
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
                                <button className="btn btn-ghost btn-sm" type="button" title="Ver detalle" onClick={() => loadDetail(b)}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
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
          {detailBenefactor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setDetailBenefactor(null)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detailBenefactor.nombre}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{detailBenefactor.tipo?.nombre || '—'}</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailBenefactor(null)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  {detailData.loading ? (
                    <div className="flex items-center gap-2 py-4">
                      <div className="loading-spinner"></div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Cargando...</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{detailData.programs.length}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Proyectos</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{detailData.activityCount}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Actividades</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{detailData.beneficiaryCount}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Beneficiarios</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Proyectos relacionados</h4>
                        {detailData.programs.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No tiene proyectos asignados.</p>
                        ) : (
                          <div className="space-y-2">
                            {detailData.programs.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.nombre}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {p.sede?.nombre || ''}
                                    {p.fecha_inicio ? ` · ${p.fecha_inicio}` : ''}
                                    {p.fecha_fin ? ` - ${p.fecha_fin}` : ''}
                                  </div>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  p.estado === 'activo' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                  p.estado === 'completado' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                  'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {p.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
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
