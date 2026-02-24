"use client";
import { useEffect, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import DeleteConfirm from "../components/DeleteConfirm";
import { Field, Select } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";
import { ensureClientSession } from "../lib/clientSession";
import type { Tables } from "../types/supabase";

interface User {
  id: string;
  email: string;
  role: string | null;
  sede_id: string | null;
  sede: string | null;
  is_active: boolean;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{id: string; email: string} | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [pwUser, setPwUser] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [sedes, setSedes] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", role: "", sede_id: "" });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; sede_id: string }>({ role: "", sede_id: "" });

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      // Hydrate session before metadata fetches
      await ensureClientSession();
      const [rolesRes, sedesRes] = await Promise.all([
        supabase.from("app_role").select("name"),
        supabase.from("sede").select("id, nombre")
      ]);
      if (rolesRes.data) {
        const r = rolesRes.data as Pick<Tables<'app_role'>, 'name'>[];
        setRoles(r.map(r => ({ value: r.name, label: r.name })));
      }
      if (sedesRes.data) {
        const s = sedesRes.data as Pick<Tables<'sede'>, 'id' | 'nombre'>[];
        setSedes(s.map(s => ({ value: s.id, label: s.nombre })));
      }
    })();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { confirmPassword, ...payload } = form;
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario');
      setNotice('Usuario agregado correctamente');
      setForm({ email: '', password: '', confirmPassword: '', role: '', sede_id: '' });
      setShowCreateForm(false);
      load();
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al crear usuario');
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_user_id: id, ...updates })
    });
    load();
  };

  const saveUserEdit = async () => {
    if (!editingUserId) return;
    setNotice(null);
    setError(null);
    try {
      await update(editingUserId, { role: editForm.role, sede_id: editForm.sede_id || null });
      setNotice('Usuario actualizado');
      setEditingUserId(null);
      setTimeout(() => setNotice(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditForm({ role: u.role || '', sede_id: u.sede_id || '' });
  };

  const toggle = async (id: string, active: boolean) => {
    setToggling(id);
    setNotice(null);
    try {
      await update(id, { is_active: !active });
      setNotice('Estado actualizado');
      setTimeout(() => setNotice(null), 2000);
    } finally {
      setToggling(null);
    }
  };

  const remove = async (id: string) => {
    setDeleting(id);
    setNotice(null);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar');
      setNotice('Usuario eliminado');
      load();
      setTimeout(() => setNotice(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al eliminar');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const resetPassword= async (id: string) => {
    if (pwValue.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setPwSaving(true); setError(null); setNotice(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_user_id: id, password: pwValue })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña');
      setNotice('Contraseña actualizada');
      setPwUser(null); setPwValue("");
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Protected>
      <Role allow={["admin"]}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Administración de Usuarios</h1>
            <button
              type="button"
              onClick={() => {
                if (showCreateForm) {
                  setShowCreateForm(false);
                } else {
                  setForm({ email: '', password: '', confirmPassword: '', role: '', sede_id: '' });
                  setShowCreateForm(true);
                }
              }}
              className={`btn ${showCreateForm ? 'btn-secondary' : 'btn-primary'} btn-md`}
            >
              {showCreateForm ? 'Cancelar' : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Nuevo Usuario
                </>
              )}
            </button>
          </div>

          {notice && <div className="alert alert-success">{notice}</div>}

          {showCreateForm && (
          <div className="card p-5 md:p-6">
            <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-end">
              <Field
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <Field
                label="Contraseña"
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <Field
                label="Confirmar contraseña"
                type="password"
                required
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              />
              <Select
                label="Rol"
                required
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                options={roles}
              />
              <Select
                label="Sede"
                value={form.sede_id}
                onChange={e => setForm({ ...form, sede_id: e.target.value })}
                options={sedes}
              />
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary btn-md relative" disabled={creating}>{creating ? "Agregando..." : "Agregar usuario"}</button>
              </div>
            </form>
          </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <div className="overflow-x-auto card p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Rol</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Sede</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Activo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 min-w-[160px]">
                        {editingUserId === u.id ? (
                          <Select label="" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} options={roles} />
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{u.role || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 min-w-[180px]">
                        {editingUserId === u.id ? (
                          <Select label="" value={editForm.sede_id} onChange={e => setEditForm({ ...editForm, sede_id: e.target.value })} options={sedes} placeholder="Sin sede" />
                        ) : (
                          <span>{u.sede || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggle(u.id, u.is_active)}
                          className={"btn btn-sm " + (u.is_active ? "btn-success" : "btn-secondary")}
                          type="button"
                          disabled={toggling === u.id}
                        >
                          {toggling === u.id ? '...' : (u.is_active ? 'Activo' : 'Inactivo')}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {editingUserId === u.id ? (
                            <>
                              <button onClick={saveUserEdit} className="btn btn-primary btn-sm" type="button">Guardar</button>
                              <button onClick={() => setEditingUserId(null)} className="btn btn-secondary btn-sm" type="button">Cancelar</button>
                            </>
                          ) : pwUser === u.id ? (
                            <>
                              <input
                                type="password"
                                placeholder="Nueva contraseña"
                                value={pwValue}
                                onChange={e => setPwValue(e.target.value)}
                                className="form-input w-36 text-sm"
                                minLength={6}
                              />
                              <button onClick={() => resetPassword(u.id)} className="btn btn-primary btn-sm" type="button" disabled={pwSaving}>{pwSaving ? '...' : 'OK'}</button>
                              <button onClick={() => { setPwUser(null); setPwValue(""); }} className="btn btn-secondary btn-sm" type="button">✕</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditUser(u)} className="btn btn-secondary btn-sm" type="button" title="Editar rol y sede">✏️</button>
                              <button onClick={() => { setPwUser(u.id); setPwValue(""); }} className="btn btn-secondary btn-sm" type="button" title="Cambiar contraseña">🔑</button>
                              <button
                                onClick={() => setDeleteTarget({id: u.id, email: u.email})}
                                className="btn btn-danger btn-sm"
                                type="button"
                                disabled={deleting === u.id}
                              >
                                {deleting === u.id ? '...' : '🗑️'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DeleteConfirm
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => { if (deleteTarget) remove(deleteTarget.id); }}
            title="Eliminar usuario"
            message={<p>¿Estás seguro de que deseas eliminar al usuario <strong>{deleteTarget?.email}</strong>? Esta acción no se puede deshacer.</p>}
            loading={!!deleting}
          />
        </div>
      </Role>
    </Protected>
  );
}






