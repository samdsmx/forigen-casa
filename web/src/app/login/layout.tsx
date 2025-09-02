import "../../styles.css";
import type { Viewport } from "next";

export const metadata = {
  title: "Casa Origen - Gestión de Programas",
  description: "Sistema de gestión de programas, actividades y asistencia para Casa Origen",
  keywords: "Casa Origen, programas sociales, gestión, asistencia",
  authors: [{ name: "samdsmx" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}

