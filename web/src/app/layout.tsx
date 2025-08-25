
import "../styles.css";

export const metadata = {
  title: "forigen-casa MVP",
  description: "Captura de programas, actividades y asistencia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
