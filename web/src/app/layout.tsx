import "../styles.css";
import NavbarWrapper from "./components/NavbarWrapper";
import SessionHydrator from "./components/SessionHydrator";
import BuildVersion from "./components/BuildVersion";
import type { Viewport } from "next";

export const metadata = {
  title: "Casa Origen - Gestión de Proyectos",
  description: "Sistema de gestión de proyectos, actividades y asistencia para Casa Origen",
  keywords: "Casa Origen, proyectos sociales, gestión, asistencia",
  authors: [{ name: "samdsmx" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/Loguito.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <SessionHydrator />
          <NavbarWrapper />
          <main className="flex-1">{children}</main>
          <BuildVersion />
        </div>
      </body>
    </html>
  );
}
