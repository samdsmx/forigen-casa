export const metadata = {
  title: 'Beneficiarios · Casa Origen',
  description: 'Gestión de beneficiarios',
}

export default function BeneficiariosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Nested layouts must not render <html>/<body>; root layout owns that.
  return <>{children}</>;
}
