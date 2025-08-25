
import Link from "next/link";

export default function Page() {
  return (
    <section className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">forigen-casa (MVP)</h1>
      <div className="card space-y-3">
        <p>Selecciona una acción:</p>
        <div className="flex gap-3">
          <Link href="/login" className="button">Iniciar sesión</Link>
          <Link href="/programas" className="button">Programas</Link>
          <Link href="/actividades" className="button">Actividades</Link>
        </div>
      </div>
    </section>
  );
}
