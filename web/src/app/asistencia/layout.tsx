export const metadata = {
  title: 'Asistencia · Casa Origen',
  description: 'Registro y captura de asistencias',
}

export default function AsistenciaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Nested layouts must not render <html>/<body>; root layout owns that.
  return <>{children}</>;
}
