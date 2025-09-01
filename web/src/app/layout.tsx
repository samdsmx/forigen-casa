import "../styles.css";
import Navbar from "./components/Navbar";
import Image from "next/image";

export const metadata = {
  title: "Casa Origen - Gestión de Programas",
  description: "Sistema de gestión de programas, actividades y asistencia para Casa Origen",
  keywords: "Casa Origen, programas sociales, gestión, asistencia",
  authors: [{ name: "samdsmx" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="icon" href="/Loguito.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}