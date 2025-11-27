"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";
import type { Tables } from "app/types/supabase";
import Protected from "./components/Protected";
import Link from "next/link";
import { useRef } from "react";

interface DashboardStats {
  programas: number;
  actividades: number;
  beneficiarios: number;
  asistencia_total: number;
}

interface RecentActivity {
  id: string;
  type: 'programa' | 'actividad' | 'asistencia';
  title: string;
  description: string;
  date: string;
  icon: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    programas: 0,
    actividades: 0,
    beneficiarios: 0,
    asistencia_total: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [build, setBuild] = useState<{ short: string | null; branch: string | null; message: string | null; buildTime: string | null } | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const buildRef = useRef<string | null>(null);
  const router = useRouter();

  const handleLoginRedirect = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Poll server build version and detect updates
  useEffect(() => {
    let active = true;
    let timer: any;
    const loadVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const short = data?.short || null;
          const branch = data?.branch || null;
          const message = data?.message || null;
          const buildTime = data?.buildTime || null;
          setBuild({ short, branch, message, buildTime });
          if (buildRef.current && short && short !== buildRef.current) {
            setUpdateAvailable(true);
          }
          if (!buildRef.current) buildRef.current = short;
        }
      } catch {}
    };
    loadVersion();
    timer = setInterval(loadVersion, 60000);
    return () => { active = false; if (timer) clearInterval(timer); };
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setSessionMissing(false);
        setAttempt((a) => a + 1);
      }
      if (event === "SIGNED_OUT") {
        setSessionMissing(true);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let timeout: any;
    (async () => {
      setLoading(true);
      setLoadError(null);
      await loadDashboardData();
    })();
    timeout = setTimeout(() => {
      if (loading) {
        setLoadError('La carga tomó demasiado tiempo.');
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const loadDashboardData = async () => {
    try {
      // Validar sesión primero para evitar AuthSessionMissingError
      const { data: sessionRes } = await supabase.auth.getSession();
      if (!sessionRes.session) {
        setSessionMissing(true);
        setLoadError("Tu sesión ha expirado. Por favor vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }

      // Obtener rol del usuario
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr && (userErr as any).name !== 'AuthSessionMissingError') {
        console.error('[Dashboard] getUser error:', userErr);
      }
      if (user) {
        const { data: appUser } = await supabase
          .from("app_user")
          .select("role")
          .eq("auth_user_id", user.id)
          .single();
        const row = appUser as (Pick<Tables<'app_user'>, 'role'> | null);
        setUserRole(row?.role ?? null);
      }

      // Cargar estadísticas
      const [programasRes, actividadesRes, beneficiariosRes, asistenciaRes] = await Promise.all([
        supabase.from("programa").select("id", { count: "exact", head: true }),
        supabase.from("actividad").select("id", { count: "exact", head: true }),
        supabase.from("beneficiario").select("id", { count: "exact", head: true }),
        supabase.from("asistencia").select("id", { count: "exact", head: true })
      ]);

      setStats({
        programas: programasRes.count || 0,
        actividades: actividadesRes.count || 0,
        beneficiarios: beneficiariosRes.count || 0,
        asistencia_total: asistenciaRes.count || 0
      });

      // Cargar actividades recientes
      const { data: programas } = await supabase
        .from("programa")
        .select("id, nombre, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: actividades } = await supabase
        .from("actividad")
        .select("id, fecha, hora_inicio, created_at, programa:programa_id(nombre)")
        .order("created_at", { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [
        ...(((programas as any[]) || [])).map(p => ({
          id: p.id,
          type: 'programa' as const,
          title: `Nuevo proyecto: ${p.nombre}`,
          description: 'Proyecto creado exitosamente',
          date: p.created_at ?? '',
          icon: '📋'
        })),
        ...(((actividades as any[]) || [])).map(a => ({
          id: a.id,
          type: 'actividad' as const,
          title: `Nueva actividad programada`,
          description: `${(Array.isArray(a.programa) ? (a.programa as any[])[0]?.nombre : (a.programa as any)?.nombre) ?? ''} - ${a.fecha} ${a.hora_inicio}`,
          date: a.created_at ?? '',
          icon: '🎯'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoadError(error instanceof Error ? error.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, trend }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    trend?: string;
  }) => (
    <div className="card hover:shadow-lg transition-all duration-200">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            {trend && (
              <p className="text-xs text-green-600 mt-1">
                <span className="inline-flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  {trend}
                </span>
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <span className="text-xl">{icon}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (sessionMissing) {
    return (
      <Protected>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="card shadow-lg">
            <div className="card-body text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-2xl">⚠️</div>
              <h2 className="text-2xl font-semibold text-gray-900">Sesión no disponible</h2>
              <p className="text-gray-600">{loadError || "Tu sesión expiró o fue cerrada. Vuelve a iniciar sesión para continuar."}</p>
              <div className="pt-2">
                <button className="btn btn-primary" onClick={handleLoginRedirect}>
                  Volver a iniciar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </Protected>
    );
  }

  if (loading) {
    return (
      <Protected>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card">
                <div className="card-body">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {loadError && (
            <div className="mt-6 alert alert-error flex items-center justify-between">
              <span>{loadError}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setAttempt(a => a + 1)}>
                Reintentar
              </button>
            </div>
          )}
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">
                Bienvenido al sistema de gestión de Casa Origen
                {userRole && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                    {userRole === 'admin' && 'Administrador'}
                    {userRole === 'supervisor_central' && 'Supervisor'}
                    {userRole === 'coordinador_sede' && 'Coordinador'}
                    {userRole === 'facilitador' && 'Facilitador'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 slide-up">
          
          <Link href={{ pathname: "/proyectos", query: { estado: "activo" } }} className="block">
          <StatCard
            title="Proyectos Activos"
            value={stats.programas}
            icon="📋"
            color="bg-gradient-to-br from-brand-100 to-brand-200"
            trend="+12% vs mes anterior"
          />
          </Link>
          
          <Link href="/actividades" className="block">
          <StatCard
            title="Actividades"
            value={stats.actividades}
            icon="🎯"
            color="bg-gradient-to-br from-green-100 to-green-200"
            trend="+8% vs mes anterior"
          />
          </Link>
          <Link href="/beneficiarios" className="block">
          <StatCard
            title="Beneficiarios"
            value={stats.beneficiarios}
            icon="👥"
            color="bg-gradient-to-br from-purple-100 to-purple-200"
            trend="+15% vs mes anterior"
          />
          </Link>
          <Link href="/asistencias" className="block">
          <StatCard
            title="Asistencias Registradas"
            value={stats.asistencia_total}
            icon="✅"
            color="bg-gradient-to-br from-orange-100 to-orange-200"
            trend="+25% vs mes anterior"
          />
          </Link>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
                <p className="text-sm text-gray-500">Últimos movimientos en el sistema</p>
              </div>
              <div className="card-body">
                {recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm">{activity.icon}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.date).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin actividad reciente</h3>
                    <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer proyecto.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <Link
                    href="/proyectos"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                        <span className="text-sm">📋</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Gestionar Proyectos</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href="/actividades"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <span className="text-sm">🎯</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Ver Actividades</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Estado del Sistema</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Base de datos</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                      Activo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Último respaldo</span>
                    <span className="text-xs text-gray-500">Hace 2 horas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Usuarios conectados</span>
                    <span className="text-xs text-gray-500">5 activos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Última actualización</span>
                    <span
                      className="text-xs text-gray-500"
                      title={build?.short ? `commit ${build.short}${build?.branch ? ` [${build.branch}]` : ''}${build?.message ? ` — ${build.message}` : ''}` : ''}
                    >
                      {build?.buildTime
                        ? new Date(build.buildTime).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'cargando...'}
                    </span>
                  </div>
                  {updateAvailable && (
                    <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border border-yellow-200">
                      <span className="text-xs text-yellow-800">Hay una actualización disponible</span>
                      <button
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('v', Date.now().toString());
                          window.location.replace(url.toString());
                        }}
                        className="text-xs font-medium text-yellow-900 underline hover:opacity-80"
                      >
                        Actualizar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}


