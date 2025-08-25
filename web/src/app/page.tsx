"use client";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Protected from "./components/Protected";
import Link from "next/link";

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Obtener rol del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: appUser } = await supabase
          .from("app_user")
          .select("role")
          .eq("auth_user_id", user.id)
          .single();
        setUserRole(appUser?.role);
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
        ...(programas || []).map(p => ({
          id: p.id,
          type: 'programa' as const,
          title: `Nuevo programa: ${p.nombre}`,
          description: 'Programa creado exitosamente',
          date: p.created_at,
          icon: '📋'
        })),
        ...(actividades || []).map(a => ({
          id: a.id,
          type: 'actividad' as const,
          title: `Nueva actividad programada`,
          description: `${a.programa?.nombre} - ${a.fecha} ${a.hora_inicio}`,
          date: a.created_at,
          icon: '🎯'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userRole === 'admin' && 'Administrador'}
                    {userRole === 'supervisor_central' && 'Supervisor'}
                    {userRole === 'coordinador_sede' && 'Coordinador'}
                    {userRole === 'facilitador' && 'Facilitador'}
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <Link href="/programas" className="btn btn-secondary btn-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Nuevo Programa
              </Link>
              <Link href="/actividades" className="btn btn-primary btn-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nueva Actividad
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 slide-up">
          <StatCard
            title="Programas Activos"
            value={stats.programas}
            icon="📋"
            color="bg-gradient-to-br from-blue-100 to-blue-200"
            trend="+12% vs mes anterior"
          />
          <StatCard
            title="Actividades"
            value={stats.actividades}
            icon="🎯"
            color="bg-gradient-to-br from-green-100 to-green-200"
            trend="+8% vs mes anterior"
          />
          <StatCard
            title="Beneficiarios"
            value={stats.beneficiarios}
            icon="👥"
            color="bg-gradient-to-br from-purple-100 to-purple-200"
            trend="+15% vs mes anterior"
          />
          <StatCard
            title="Asistencias Registradas"
            value={stats.asistencia_total}
            icon="✅"
            color="bg-gradient-to-br from-orange-100 to-orange-200"
            trend="+25% vs mes anterior"
          />
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
                          <p className="text-xs text-gray-400 mt-1">
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
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin actividad reciente</h3>
                    <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer programa.</p>
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
                    href="/programas"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <span className="text-sm">📋</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Gestionar Programas</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}