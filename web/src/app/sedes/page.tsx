"use client";
import { useEffect, useMemo, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";
import { ensureClientSession } from "../lib/clientSession";
import type { Tables, TablesInsert, TablesUpdate } from "app/types/supabase";

type Sede = Tables<'sede'>;

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function SedesPage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newForm, setNewForm] = useState<Pick<Sede, "nombre" | "estado">>({ nombre: "", estado: "" as any });
  const [editing, setEditing] = useState<Record<string, Pick<Sede, "nombre" | "estado">>>({});

  const slugExists = useMemo(() => new Set(sedes.map(s => s.slug)), [sedes]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Hydrate Supabase auth state from cookies
      await ensureClientSession();
      const { data, error } = await supabase
        .from("sede")
        .select("id,nombre,slug,estado,created_at")
        .order("nombre", { ascending: true });
      if (error) throw error;
      setSedes((data as Sede[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las sedes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const clearNoticeLater = () => setTimeout(() => setNotice(null), 2000);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!newForm.nombre.trim()) {
      setError("Ingresa el nombre de la sede");
      return;
    }
    const slug = slugify(newForm.nombre);
    if (slugExists.has(slug)) {
      setError("El slug ya existe. Ajusta el nombre/slug");
      return;
    }
    setSaving("new");
    try {
      const payload: TablesInsert<'sede'> = {
        nombre: newForm.nombre.trim(),
        slug,
        estado: newForm.estado || null,
      } as TablesInsert<'sede'>;
      const { error } = await (supabase as any).from("sede").insert(payload);
      if (error) throw error;
      setNotice("Sede creada");
      setNewForm({ nombre: "", estado: "" as any });
      await load();
      clearNoticeLater();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la sede");
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (s: Sede) => {
    setEditing(prev => ({ ...prev, [s.id]: { nombre: s.nombre, estado: (s.estado as any) ?? "" } }));
  };
  const cancelEdit = (id: string) => {
    setEditing(prev => { const p = { ...prev }; delete p[id]; return p; });
  };
  const commitEdit = async (id: string) => {
    const form = editing[id];
    if (!form) return;
    setSaving(id);
    setError(null);
    setNotice(null);
    try {
      if (!form.nombre.trim()) throw new Error("El nombre es requerido");
      // Conserva el slug actual; solo actualiza nombre y estado
      const payload: TablesUpdate<'sede'> = { nombre: form.nombre.trim(), estado: form.estado || null } as TablesUpdate<'sede'>;
      const { error } = await (supabase as any).from("sede").update(payload).eq("id", id);
      if (error) throw error;
      setNotice("Sede actualizada");
      await load();
      cancelEdit(id);
      clearNoticeLater();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la sede");
    } finally {
      setSaving(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar sede? Esta acción no se puede deshacer.")) return;
    setSaving(id);
    setError(null);
    setNotice(null);
    try {
      const { error } = await (supabase as any).from("sede").delete().eq("id", id);
      if (error) throw error;
      setNotice("Sede eliminada");
      await load();
      clearNoticeLater();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Protected>
      <Role allow={["admin","supervisor_central"]}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sedes</h1>
              <p className="text-gray-600 dark:text-gray-400">Administra sedes (nombre y estado)</p>
            </div>
          </div>

          {notice && <div className="alert alert-success">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card p-5 md:p-6">
            <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 items-end">
              <Field
                label="Nombre"
                value={newForm.nombre}
                onChange={e => setNewForm({ ...newForm, nombre: e.target.value })}
                required
                placeholder="Ej. Centro Comunitario Norte"
              />
              <Field
                label="Estado (opcional)"
                value={(newForm.estado as any) || ""}
                onChange={e => setNewForm({ ...newForm, estado: e.target.value as any })}
                placeholder="Ej. Oaxaca"
              />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md" disabled={saving === "new"}>
                  {saving === "new" ? "Agregando..." : "Agregar sede"}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-0 overflow-x-auto">
            {loading ? (
              <div className="p-6">Cargando...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Estado</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {sedes.map(s => {
                    const isEditing = !!editing[s.id];
                    const form = editing[s.id] || { nombre: s.nombre, estado: s.estado as any };
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 min-w-[220px]">
                          {isEditing ? (
                            <Field label="" value={form.nombre} onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...form, nombre: e.target.value } }))} />
                          ) : (
                            s.nombre
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 min-w-[160px]">
                          {isEditing ? (
                            <Field label="" value={(form.estado as any) || ""} onChange={e => setEditing(prev => ({ ...prev, [s.id]: { ...form, estado: e.target.value as any } }))} />
                          ) : (
                            (s.estado as any) || "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {!isEditing ? (
                              <>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => startEdit(s)}>Editar</button>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => remove(s.id)} disabled={saving === s.id}>
                                  {saving === s.id ? "Eliminando..." : "Eliminar"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => commitEdit(s.id)} disabled={saving === s.id}>
                                  {saving === s.id ? "Guardando..." : "Guardar"}
                                </button>
                                <button className="btn btn-secondary btn-sm" type="button" onClick={() => cancelEdit(s.id)}>Cancelar</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Role>
    </Protected>
  );
}
