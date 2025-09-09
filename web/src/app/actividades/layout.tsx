export const metadata = {
  title: "Actividades · Casa Origen",
  description: "Listado y gestión de actividades",
};

export default function ActividadesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nested layouts must not render <html>/<body>; root layout owns that.
  return <>{children}</>;
}
