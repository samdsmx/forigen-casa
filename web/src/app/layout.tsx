import "../styles.css";
import NavbarWrapper from "./components/NavbarWrapper";
import SessionHydrator from "./components/SessionHydrator";
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "./context/ThemeContext";
import SessionTimeout from "./components/SessionTimeout";
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
        {/* Anti-FOUC: apply dark class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
        {/* Runtime public env injection to avoid stale chunk env issues */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PUB_ENV=${JSON.stringify({
              SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
              SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
              BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME || null,
            })};`,
          }}
        />
      </head>
      <body className="min-h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <ThemeProvider>
        <UserProvider>
          <div className="min-h-screen flex flex-col">
            <SessionHydrator />
            <NavbarWrapper />
            <SessionTimeout />
            <main className="flex-1">{children}</main>
          </div>
        </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
