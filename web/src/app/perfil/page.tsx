"use client";
import { useState } from "react";
import Protected from "../components/Protected";
import { Field } from "../components/Forms";
import { useAuth } from "../context/UserContext";
import { supabase } from "../lib/supabaseClient";

export default function PerfilPage() {
  const { user, appUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    supervisor_central: "Supervisor Central",
    coordinador_sede: "Coordinador de Sede",
    facilitador: "Facilitador",
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice("Contraseña actualizada correctamente");
      setPassword("");
      setConfirm("");
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Error al cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Protected>
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi Perfil</h1>

        <div className="card p-5 md:p-6 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</span>
            <p className="text-gray-900 dark:text-gray-100">{user?.email || "—"}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Rol</span>
            <p className="text-gray-900 dark:text-gray-100">{roleLabels[appUser?.role || ""] || appUser?.role || "—"}</p>
          </div>
          {(appUser as any)?.sede?.nombre && (
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sede</span>
              <p className="text-gray-900 dark:text-gray-100">{(appUser as any).sede.nombre}</p>
            </div>
          )}
        </div>

        <div className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cambiar contraseña</h2>
          {notice && <div className="alert alert-success mb-4">{notice}</div>}
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field
              label="Nueva contraseña"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <Field
              label="Confirmar contraseña"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repetir contraseña"
            />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
                {saving ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Protected>
  );
}
