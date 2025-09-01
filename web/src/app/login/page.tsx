"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Field } from "../components/Forms";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Verificar si ya está autenticado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkUser();
  }, [router]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifique su email y contraseña.'
            : error.message
        );
      } else if (data.session) {
        // El listener de onAuthStateChange en Navbar se encargará de actualizar el estado
        router.push("/");
      }
    } catch (err) {
      setError('Error inesperado. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Image
            src="/logo-casa-origen-full.jpg"
            alt="Casa Origen AC"
            width={320}
            height={64}
            className="mx-auto mb-2"
          />
          <p className="text-gray-600 font-bold">Sistema de Gestión de Programas</p>

        </div>

        {/* Login Form */}
        <div className="space-y-3 ">
          <p className="text-sm text-gray-500 mt-4 text-center">
              Ingrese sus credenciales para acceder al sistema
          </p>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-3">

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-4">
                <Field
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="su-email@ejemplo.com"
                  required
                  autoComplete="email"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />

                <Field
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
              </div>

              {error && (
                <div className="alert alert-error animate-fade-in">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full relative"
              >
                {loading && (
                  <div className="absolute left-4">
                    <div className="loading-spinner"></div>
                  </div>
                )}
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </form>

            {/* Additional Options */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">¿Necesita ayuda?</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Contacte al administrador del sistema para obtener acceso
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>Casa Origen - Sistema de Gestión © 2025</p>
          <p className="mt-1">Espacios de Empoderamiento Integral</p>
        </div>
      </div>
    </div>
  );
}