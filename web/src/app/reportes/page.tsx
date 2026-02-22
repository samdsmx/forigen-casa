"use client";
import Protected from "../components/Protected";
import Role from "../components/Role";
import Link from "next/link";

const reports = [
  { href: "/reportes/resumen", title: "Resumen General", desc: "KPIs, tendencias de asistencia, top programas", icon: "📊" },
  { href: "/reportes/demografia", title: "Demografía", desc: "Distribución por sexo, escolaridad, población indígena", icon: "👥" },
  { href: "/reportes/asistencia", title: "Actividades y Asistencia", desc: "Tendencias, desglose por tipo, sede y facilitador", icon: "🎯" },
  { href: "/reportes/cobertura", title: "Cobertura Geográfica", desc: "Actividades y beneficiarios por ubicación geográfica", icon: "🗺️" },
];

export default function ReportesPage() {
  return (
    <Protected>
      <Role allow={["admin", "supervisor_central"]}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reportes</h1>
            <p className="text-gray-600 dark:text-gray-400">Consulta gráficas e informes del sistema</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reports.map(r => (
              <Link key={r.href} href={r.href} className="card p-5 hover:shadow-lg transition-shadow group">
                <div className="text-3xl mb-3">{r.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{r.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </Role>
    </Protected>
  );
}
