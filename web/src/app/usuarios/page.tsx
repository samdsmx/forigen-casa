"use client";
import { useEffect, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field, Select } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";
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
  const [toggling, setToggling] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [sedes, setSedes] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState({ email: "", password: "", role: "", sede_id: "" });

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
    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario');
      setNotice('Usuario agregado correctamente');
      setForm({ email: '', password: '', role: '', sede_id: '' });
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
    if (!confirm('¿Eliminar usuario?')) return;
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
    }
  };

  return (
    <Protected>
      <Role allow={["admin"]}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Administración de Usuarios</h1>

          {notice && <div className="alert alert-success">{notice}</div>}

          <div className="card p-5 md:p-6">
            <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
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
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button type="submit" className="btn btn-primary btn-md relative" disabled={creating}>{creating ? "Agregando..." : "Agregar usuario"}</button>
              </div>
            </form>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <div className="overflow-x-auto card p-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rol</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sede</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Activo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 min-w-[160px]">
                        <Select
                          label=""
                          value={u.role ?? ""}
                          onChange={e => update(u.id, { role: e.target.value })}
                          options={roles}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 min-w-[180px]">
                        <Select
                          label=""
                          value={u.sede_id ?? ""}
                          onChange={e => update(u.id, { sede_id: e.target.value || null })}
                          options={sedes}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">
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
                          <button
                            onClick={() => remove(u.id)}
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={deleting === u.id}
                          >
                            {deleting === u.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Role>
    </Protected>
  );
}






