"use client";
import { useEffect, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { Field, Select } from "../components/Forms";
import { supabase } from "../lib/supabaseClient";

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
      if (rolesRes.data) setRoles(rolesRes.data.map(r => ({ value: r.name, label: r.name })));
      if (sedesRes.data) setSedes(sedesRes.data.map(s => ({ value: s.id, label: s.nombre })));
    })();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ email: "", password: "", role: "", sede_id: "" });
    load();
  };

  const update = async (id: string, updates: Record<string, any>) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_user_id: id, ...updates })
    });
    load();
  };

  const toggle = (id: string, active: boolean) => update(id, { is_active: !active });

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_user_id: id })
    });
    load();
  };

  return (
    <Protected>
      <Role allow={["admin"]}>
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Administración de Usuarios</h1>

          <div className="card">
            <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="md:col-span-4">
                <button type="submit" className="btn btn-primary">Agregar</button>
              </div>
            </form>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rol</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sede</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Activo</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{u.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <Select
                          label=""
                          value={u.role ?? ""}
                          onChange={e => update(u.id, { role: e.target.value })}
                          options={roles}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <Select
                          label=""
                          value={u.sede_id ?? ""}
                          onChange={e => update(u.id, { sede_id: e.target.value || null })}
                          options={sedes}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{u.is_active ? "Sí" : "No"}</td>
                      <td className="px-4 py-2 text-sm space-x-2">
                        <button
                          onClick={() => toggle(u.id, u.is_active)}
                          className="btn btn-secondary btn-sm"
                        >
                          {u.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => remove(u.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Eliminar
                        </button>
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
