"use client";

import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

import type { Tables } from "app/types/supabase";

import { useRouter, usePathname } from "next/navigation";

import Link from "next/link";

import Image from "next/image";
import { ensureClientSession } from "../lib/clientSession";



interface User {

  email?: string;

  role?: string;

  sede?: string;

}



export default function Navbar() {

  const [user, setUser] = useState<User | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);

  const router = useRouter();

  const pathname = usePathname();



  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        // Prefer server-checked session to avoid client-side stalls after deploys
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          // Fallback: try client getUser
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) setUser({ email: authUser.email || undefined });
          else setUser(null);
        }
      } catch (e) {
        console.error('[Navbar] init error', e);
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session) {
          const [{ data: roleData }, { data: sedeId }] = await Promise.all([
            supabase.rpc('user_role'),
            supabase.rpc('user_sede_id')
          ] as const);
          let sedeName: string | undefined;
          if (sedeId) {
            const { data: sede } = await supabase
              .from('sede')
              .select('nombre')
              .eq('id', sedeId as string)
              .maybeSingle();
            sedeName = (sede as any)?.nombre as string | undefined;
          }
          setUser({
            email: session.user.email,
            role: (roleData as string | null) ?? undefined,
            sede: sedeName
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      } catch (e) {
        console.error('[Navbar] auth state change error', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Expose a retry button if loading takes too long
  useEffect(() => {
    let t: any;
    if (loading) {
      t = setTimeout(() => setShowRetry(true), 3000);
    } else {
      setShowRetry(false);
    }
    return () => { if (t) clearTimeout(t); };
  }, [loading]);



  const isActive = (href: string) => pathname === href;



  const signOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      router.push('/auth/signout');
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/auth/signout';
    }
  };



  const baseNavigation = [

    { name: "Dashboard", href: "/", icon: "🏠" },

    { name: "Proyectos", href: "/proyectos", icon: "📋" },
    { name: "Actividades", href: "/actividades", icon: "🎯" },

  ];



  const navigation =
    user?.role === "admin"

      ? [...baseNavigation, { name: "Usuarios", href: "/usuarios", icon: "👥" }]

      : baseNavigation;

  const augmentedNavigation =
    user?.role === "admin"
      ? [...navigation, { name: "Sedes", href: "/sedes", icon: "📍" }, { name: "Catálogos", href: "/catalogos", icon: "🗂️" }]
      : user?.role === "supervisor_central"
        ? [...navigation, { name: "Sedes", href: "/sedes", icon: "📍" }, { name: "Catálogos", href: "/catalogos", icon: "🗂️" }]
        : navigation;




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

                height={63}
                priority

              

              />

              <div className="flex flex-col">

                <span className="font-bold text-gray-800">Gestión de Proyectos</span>
                <span className="text-xs text-gray-600 hidden sm:block">Espacios de Empoderamiento Integral</span>

              </div>

          </div>



          {/* Navegación Desktop */}

          <div className="hidden md:flex items-center space-x-1">

            {baseNavigation.map((item) => (
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
              <div className="flex items-center space-x-2">
                <div className="loading-spinner"></div>
                {showRetry && (
                  <button
                    onClick={() => {
                      // Force a new session check
                      setLoading(true);
                      ensureClientSession()
                        .then(() => fetch('/api/auth/me', { cache: 'no-store' }))
                        .then(r => r.ok ? r.json() : null)
                        .then(data => {
                          if (data?.user) setUser(data.user); else setUser(null);
                        })
                        .catch(() => setUser(null))
                        .finally(() => setLoading(false));
                    }}
                    className="text-xs text-gray-600 underline hover:text-gray-800"
                  >
                    Reintentar
                  </button>
                )}
              </div>
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

                        {baseNavigation.map((item) => (
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



                      {(user?.role === 'admin' || user?.role === 'supervisor_central') && (
                        <div className="py-1">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500">Administración</div>
                          <Link
                            href="/sedes"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>📍</span>
                            Sedes
                          </Link>
                          <Link
                            href="/catalogos"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>🗂️</span>
                            Catálogos
                          </Link>
                          {user?.role === 'admin' && (
                            <Link
                              href="/usuarios"
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <span>👤</span>
                              Usuarios
                            </Link>
                          )}
                          <hr className="my-1" />
                        </div>
                      )}

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









