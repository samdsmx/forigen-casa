import "../styles.css";
import Navbar from "./components/Navbar";
import Image from "next/image";

export const metadata = {
  title: "Casa Origen - Gestión de Programas",
  description: "Sistema de gestión de programas, actividades y asistencia para Casa Origen",
  keywords: "Casa Origen, programas sociales, gestión, asistencia",
  authors: [{ name: "Casa Origen" }],
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
        <link rel="icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Image src="/logo.svg" alt="Origen AC" width={24} height={24} className="w-6 h-6" />
                    <span className="font-semibold text-gray-900">Casa Origen</span>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 text-sm text-gray-500">
                  © 2025 Casa Origen. Transformando comunidades.
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}