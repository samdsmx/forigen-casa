
"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.push("/programas");
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Correo</label>
          <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/>
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required/>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="button" type="submit">Entrar</button>
      </form>
    </main>
  );
}
