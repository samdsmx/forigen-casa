"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";
import Protected from "./components/Protected";
import Link from "next/link";
import { useAuth } from "./context/UserContext";

interface DashboardStats {
  programas: number;
  actividades: number;
  beneficiarios: number;
  asistencia_total: number;
}

interface RecentActivity {
  id: string;
  type: 'programa' | 'actividad' | 'asistencia' | 'beneficiario' | 'benefactor';
  title: string;
  date: string;
  icon: string;
  href: string;
}

export default function Dashboard() {
  const { user, appUser, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    programas: 0,
    actividades: 0,
    beneficiarios: 0,
    asistencia_total: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [trends, setTrends] = useState<Record<string, string | null>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // If auth is loading, we wait. If no user, Protected will handle it.
  // We only fetch data if we have a user.

  useEffect(() => {
    if (authLoading || !user) return;

    let active = true;

    const calcTrend = (current: number, previous: number): string | null => {
      if (previous === 0) return current > 0 ? `+${current} este mes` : null;
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct > 0) return `+${pct}% vs mes anterior`;
      if (pct < 0) return `${pct}% vs mes anterior`;
      return "Sin cambio";
    };

    const loadDashboardData = async () => {
      setLoadingData(true);
      setDataError(null);

      try {
        // Cargar estadísticas
        const [programasRes, actividadesRes, beneficiariosRes, asistenciaRes] = await Promise.all([
          supabase.from("programa").select("id", { count: "exact", head: true }),
          supabase.from("actividad").select("id", { count: "exact", head: true }),
          supabase.from("beneficiario").select("id", { count: "exact", head: true }),
          supabase.from("asistencia").select("id", { count: "exact", head: true })
        ]);

        if (!active) return;

        setStats({
          programas: programasRes.count || 0,
          actividades: actividadesRes.count || 0,
          beneficiarios: beneficiariosRes.count || 0,
          asistencia_total: asistenciaRes.count || 0
        });

        // Trends: this month vs last month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

        const [progThis, progPrev, actThis, actPrev, benThis, benPrev, asistThis, asistPrev] = await Promise.all([
          supabase.from("programa").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
          supabase.from("programa").select("id", { count: "exact", head: true }).gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
          supabase.from("actividad").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
          supabase.from("actividad").select("id", { count: "exact", head: true }).gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
          supabase.from("beneficiario").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
          supabase.from("beneficiario").select("id", { count: "exact", head: true }).gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
          supabase.from("asistencia").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
          supabase.from("asistencia").select("id", { count: "exact", head: true }).gte("created_at", startOfPrevMonth).lte("created_at", endOfPrevMonth),
        ]);

        if (!active) return;

        setTrends({
          programas: calcTrend(progThis.count || 0, progPrev.count || 0),
          actividades: calcTrend(actThis.count || 0, actPrev.count || 0),
          beneficiarios: calcTrend(benThis.count || 0, benPrev.count || 0),
          asistencia: calcTrend(asistThis.count || 0, asistPrev.count || 0),
        });

        // Cargar actividades recientes
        const [{ data: programas }, { data: actividades }, { data: beneficiarios_recent }, { data: benefactores_recent }] = await Promise.all([
          supabase
            .from("programa")
            .select("id, nombre, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("actividad")
            .select("id, fecha, hora_inicio, created_at, programa:programa_id(nombre)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("beneficiario")
            .select("id, nombre, primer_apellido, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          (supabase as any)
            .from("benefactor")
            .select("id, nombre, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (!active) return;

        const activities: RecentActivity[] = [
          ...(((programas as any[]) || [])).map(p => ({
            id: p.id,
            type: 'programa' as const,
            title: `Proyecto: ${p.nombre}`,
            date: p.created_at ?? '',
            icon: '📋',
            href: `/actividades?programa_id=${p.id}`
          })),
          ...(((actividades as any[]) || [])).map(a => ({
            id: a.id,
            type: 'actividad' as const,
            title: `Actividad: ${(Array.isArray(a.programa) ? (a.programa as any[])[0]?.nombre : (a.programa as any)?.nombre) ?? ''} - ${a.fecha} ${a.hora_inicio}`,
            date: a.created_at ?? '',
            icon: '🎯',
            href: `/asistencia/${a.id}`
          })),
          ...(((beneficiarios_recent as any[]) || [])).map(b => ({
            id: b.id,
            type: 'beneficiario' as const,
            title: `Beneficiario: ${b.nombre} ${b.primer_apellido}`,
            date: b.created_at ?? '',
            icon: '👤',
            href: `/beneficiarios`
          })),
          ...(((benefactores_recent as any[]) || [])).map(b => ({
            id: b.id,
            type: 'benefactor' as const,
            title: `Benefactor: ${b.nombre}`,
            date: b.created_at ?? '',
            icon: '🏛️',
            href: `/benefactores`
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        setRecentActivities(activities);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (active) {
          setDataError(error instanceof Error ? error.message : 'Error al cargar datos');
        }
      } finally {
        if (active) setLoadingData(false);
      }
    };

    loadDashboardData();

    return () => { active = false; };
  }, [user, attempt, authLoading]);

  const StatCard = ({ title, value, icon, color, trend }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    trend?: string | null;
  }) => (
    <div className="card transition-all duration-200">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value.toLocaleString()}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trend.startsWith('+') ? 'text-green-600' : trend.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
                {trend}
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

  // If global auth is loading, Protected handles it or we show spinner locally
  if (authLoading) {
    return (
      <Protected>
         <div className="min-h-screen flex items-center justify-center">
           <div className="loading loading-spinner text-primary" />
         </div>
      </Protected>
    );
  }

  // Once auth is ready, we either show Protected's error (if no user) or the dashboard
  // We wrap in Protected to ensure we only render if logged in
  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Bienvenido al sistema de gestión de Casa Origen
                {appUser?.role && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                    {appUser.role === 'admin' && 'Administrador'}
                    {appUser.role === 'supervisor_central' && 'Supervisor'}
                    {appUser.role === 'coordinador_sede' && 'Coordinador'}
                    {appUser.role === 'facilitador' && 'Facilitador'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {dataError && (
          <div className="alert alert-error flex items-center justify-between">
            <div>
              <span className="font-semibold">No pudimos cargar algunos datos del dashboard.</span>
              <span className="ml-2">{dataError}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setAttempt(a => a + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {loadingData ? (
           /* Loading skeleton for dashboard data */
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card">
                <div className="card-body">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Stats Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 slide-up">
            <Link href={{ pathname: "/proyectos", query: { estado: "activo" } }} className="block">
            <StatCard
              title="Proyectos Activos"
              value={stats.programas}
              icon="📋"
              color="bg-gradient-to-br from-brand-100 to-brand-200"
              trend={trends.programas}
            />
            </Link>

            <Link href="/actividades" className="block">
            <StatCard
              title="Actividades"
              value={stats.actividades}
              icon="🎯"
              color="bg-gradient-to-br from-green-100 to-green-200"
              trend={trends.actividades}
            />
            </Link>
            <Link href="/beneficiarios" className="block">
            <StatCard
              title="Beneficiarios"
              value={stats.beneficiarios}
              icon="👥"
              color="bg-gradient-to-br from-purple-100 to-purple-200"
              trend={trends.beneficiarios}
            />
            </Link>
            <Link href="/asistencias" className="block">
            <StatCard
              title="Asistencias Registradas"
              value={stats.asistencia_total}
              icon="✅"
              color="bg-gradient-to-br from-orange-100 to-orange-200"
              trend={trends.asistencia}
            />
            </Link>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actividad Reciente</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Últimos movimientos en el sistema</p>
              </div>
              <div className="card-body">
                {loadingData ? (
                  <div className="space-y-4 animate-pulse">
                     <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
                     <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
                     <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div>
                    {recentActivities.map((activity) => (
                      <Link key={`${activity.type}-${activity.id}`} href={activity.href} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 -mx-2 transition-colors">
                        <span className="text-sm flex-shrink-0">{activity.icon}</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">{activity.title}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">
                          {new Date(activity.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Sin actividad reciente</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comienza creando tu primer proyecto.</p>
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Acciones Rápidas</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <Link
                    href="/proyectos"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-300 hover:bg-brand-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                        <span className="text-sm">📋</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Gestionar Proyectos</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href="/actividades"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <span className="text-sm">🎯</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Ver Actividades</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href="/beneficiarios"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <span className="text-sm">👤</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Beneficiarios</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href="/reportes"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <span className="text-sm">📊</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Reportes</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
