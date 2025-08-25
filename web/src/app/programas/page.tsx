"use client";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import { Field, Select } from "../components/Forms";

type Programa = {
  id: string;
  nombre: string;
  objetivo: string | null;
  sede_id: string;
  estado: string;
};

export default function Programas() {
  const [list, setList] = useState<Programa[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre:"", objetivo:"", sede_id:"" });

  useEffect(()=>{
    (async()=>{
      // sedes via RPC para evitar fricciones de RLS
      const s = await supabase.rpc("list_sedes");
      const sd = Array.isArray(s.data) ? s.data : [];
      setSedes(sd.map((x:any)=>({ value:x.id, label:`${x.nombre}` })));
      const { data } = await supabase.from("programa").select("id,nombre,objetivo,sede_id,estado").order("created_at",{ascending:false});
      setList(data||[]);
    })();
  },[]);

  const create = async (e:any) => {
    e.preventDefault();
    const { error } = await supabase.from("programa").insert({
      nombre: form.nombre,
      objetivo: form.objetivo || null,
      sede_id: form.sede_id
    });
    if (error) alert(error.message);
    else {
      const { data: n } = await supabase.from("programa").select("id,nombre,objetivo,sede_id,estado").order("created_at",{ascending:false});
      setList(n||[]);
      setForm({ nombre:"", objetivo:"", sede_id:"" });
    }
  };

  return (
    <Protected>
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Programas</h1>

        <Role allow={['admin','supervisor_central','coordinador_sede']}>
          <form onSubmit={create} className="card grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nombre" value={form.nombre} onChange={(e:any)=>setForm({...form, nombre:e.target.value})} required />
            <Field label="Objetivo" value={form.objetivo} onChange={(e:any)=>setForm({...form, objetivo:e.target.value})} />
            <Select label="Sede" value={form.sede_id} onChange={(e:any)=>setForm({...form, sede_id:e.target.value})} options={sedes} />
            <div className="md:col-span-3">
              <button className="button" type="submit">Crear programa</button>
            </div>
          </form>
        </Role>

        <section className="grid gap-3">
          {list.map(p => (
            <div key={p.id} className="card">
              <div className="font-medium">{p.nombre}</div>
              <div className="text-sm text-gray-600">{p.objetivo}</div>
              <div className="text-xs mt-1">Estado: {p.estado}</div>
            </div>
          ))}
        </section>
      </main>
    </Protected>
  );
}
