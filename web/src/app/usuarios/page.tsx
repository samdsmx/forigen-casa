"use client";
import { useEffect, useState } from "react";
import Protected from "../components/Protected";
import Role from "../components/Role";

interface User {
  id: string;
  email: string;
  role: string | null;
  sede: string | null;
  is_active: boolean;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, active: boolean) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_user_id: id, is_active: !active })
    });
    load();
  };

  return (
    <Protected>
      <Role allow={["admin"]}>
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Administración de Usuarios</h1>
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
                      <td className="px-4 py-2 text-sm text-gray-900">{u.role ?? "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{u.sede ?? "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{u.is_active ? "Sí" : "No"}</td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() => toggle(u.id, u.is_active)}
                          className="btn btn-secondary btn-sm"
                        >
                          {u.is_active ? "Desactivar" : "Activar"}
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
