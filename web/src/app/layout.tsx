import "../styles.css";

export const metadata = {
  title: "forigen-casa MVP",
  description: "Captura de programas, actividades y asistencia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="bg-brand text-white shadow">
          <div className="container mx-auto flex items-center gap-2 p-4">
            <img src="/logo.svg" alt="Logo" className="h-8 w-auto" />
            <span className="font-semibold">forigen-casa</span>
          </div>
        </header>
        <main className="container mx-auto flex-1 p-6">{children}</main>
        <footer className="bg-gray-100 text-center text-sm text-gray-500 p-4">
          © 2024 Origen
        </footer>
      </body>
    </html>
  );
}
