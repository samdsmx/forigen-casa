"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/UserContext";
import { supabase } from "../lib/supabaseClient";
import { cleanupSession } from "../lib/cleanupSession";

export default function Navbar() {
  const { user, appUser, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const signOut = async () => {
    try {
      // Aggressive cleanup first
      await cleanupSession();
      
      // Then attempt signOut
      await supabase.auth.signOut();
      
      // Use window.location for reliable redirect
      window.location.href = '/login';
    } catch (error) {
      console.error("Signout error:", error);
      // Force redirect even if signout fails
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const baseNavigation = [
    { name: "Dashboard", href: "/", icon: "🏠" },
    { name: "Proyectos", href: "/proyectos", icon: "📋" },
    { name: "Actividades", href: "/actividades", icon: "🎯" },
  ];

  const navigation =
    appUser?.role === "admin"
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
                    {appUser?.role === 'admin' && 'Administrador'}
                    {appUser?.role === 'supervisor_central' && 'Supervisor Central'}
                    {appUser?.role === 'coordinador_sede' && `Coordinador - ${appUser.sede_nombre}`}
                    {appUser?.role === 'facilitador' && `Facilitador - ${appUser.sede_nombre}`}
                  </span>
                </div>

                {/* Menú de Usuario */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    title="Menú de usuario"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {appUser?.role === 'admin' && 'Administrador'}
                          {appUser?.role === 'supervisor_central' && 'Supervisor'}
                          {appUser?.role === 'coordinador_sede' && 'Coordinador'}
                          {appUser?.role === 'facilitador' && 'Facilitador'}
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

                      {(appUser?.role === 'admin' || appUser?.role === 'supervisor_central') && (
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
                          {appUser?.role === 'admin' && (
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

                      <Link
                        href="/perfil"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mi Perfil
                      </Link>
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
              title="Menú de navegación"
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
