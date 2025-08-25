import "../styles.css";
import Navbar from "./components/Navbar";

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
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                    </div>
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