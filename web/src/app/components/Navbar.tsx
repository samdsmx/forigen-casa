"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Tables } from "app/types/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface User {
  email?: string;
  role?: string;
  sede?: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const withTimeout = async <T,>(p: Promise<T>, ms = 8000): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)) as Promise<T>,
      ]);
    };

    const getUser = async () => {
      try {
        const { data: { user: authUser }, error } = await withTimeout(supabase.auth.getUser());
        if (!active) return;
        if (error) {
          // No hay sesión: no es un error fatal
          if ((error as any).name !== "AuthSessionMissingError") {
            console.error("[Navbar] getUser error", error);
          }
          setUser(null);
          return;
        }
        if (authUser) {
          const appUserRes = await withTimeout(
            supabase
              .from("app_user")
              .select("role, sede:sede_id(nombre)")
              .eq("auth_user_id", authUser.id)
              .single()
          );
          type AppUserJoined = Pick<Tables<'app_user'>, 'role'> & { sede: Pick<Tables<'sede'>,'nombre'>[] };
          const appUser = appUserRes.data as (AppUserJoined | null);

          setUser({
            email: authUser.email,
            role: appUser?.role,
            sede: appUser?.sede?.[0]?.nombre
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("[Navbar] Error fetching user", err);
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    getUser();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session) {
            // Usuario se logueó
            const { data: appUser } = await supabase
              .from("app_user")
              .select("role, sede:sede_id(nombre)")
              .eq("auth_user_id", session.user.id)
              .single();
            const joined = appUser as (Pick<Tables<'app_user'>,'role'> & { sede: Pick<Tables<'sede'>,'nombre'>[] }) | null;
            setUser({
              email: session.user.email,
              role: joined?.role,
              sede: joined?.sede?.[0]?.nombre
            });
          } else if (event === 'SIGNED_OUT') {
            // Usuario se deslogueó
            setUser(null);
          }
        } catch (err) {
          console.error("[Navbar] auth state change error", err);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    // Cleanup: cancelar la suscripción cuando el componente se desmonte
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isActive = (href: string) => pathname === href;

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  const baseNavigation = [
    { name: "Dashboard", href: "/", icon: "🏠" },
    { name: "Programas", href: "/programas", icon: "📋" },
    { name: "Actividades", href: "/actividades", icon: "🎯" },
  ];

  const navigation =
    user?.role === "admin"
      ? [...baseNavigation, { name: "Usuarios", href: "/usuarios", icon: "👥" }]
      : baseNavigation;


  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y Título */}
          <div className="flex items-center space-x-3 group">
              <Image
                src="/logo-casa-origen.jpg"
                alt="Casa Origen AC"
                width={166}
                height={1}
              
              />
              <div className="flex flex-col">
                <span className="font-bold text-gray-800">Gestión de Programas</span>
                <span className="text-xs text-gray-600 hidden sm:block">Espacios de Empoderamiento Integral</span>
              </div>
          </div>

          {/* Navegación Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>

          {/* Usuario y Acciones */}
          <div className="flex items-center space-x-4">
            {loading && (
              <div className="loading-spinner"></div>
            )}
            
            {!loading && user && (
              <>
                {/* Info del Usuario */}
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-800">
                    {user.email}
                  </span>
                  <span className="text-xs text-gray-600">
                    {user.role === 'admin' && 'Administrador'}
                    {user.role === 'supervisor_central' && 'Supervisor Central'}
                    {user.role === 'coordinador_sede' && `Coordinador - ${user.sede}`}
                    {user.role === 'facilitador' && `Facilitador - ${user.sede}`}
                  </span>
                </div>

                {/* Menú de Usuario */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.role === 'admin' && 'Administrador'}
                          {user.role === 'supervisor_central' && 'Supervisor'}
                          {user.role === 'coordinador_sede' && 'Coordinador'}
                          {user.role === 'facilitador' && 'Facilitador'}
                        </p>
                      </div>
                      
                      <div className="md:hidden">
                        {navigation.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>{item.icon}</span>
                            {item.name}
                          </Link>
                        ))}
                        <hr className="my-1" />
                      </div>

                      <button
                        onClick={signOut}
                        className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {!loading && !user && pathname !== "/login" && (
              <Link
                href="/login"
                className="btn btn-primary btn-sm"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>

          {/* Botón de menú móvil */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay para cerrar menú */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-25 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </nav>
  );
}
