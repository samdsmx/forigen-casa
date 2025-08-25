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
      </head>
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
