
"use client";
import Protected from "../components/Protected";
import Role from "../components/Role";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Field, Select } from "../components/Forms";

export default function Actividades() {
  const [programas, setProgramas] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [subtipos, setSubtipos] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    programa_id:"", fecha:"", hora_inicio:"", hora_fin:"", tipo_id:"", subtipo_id:"", facilitador_id:"", cupo:""
  });

  useEffect(()=>{
    (async()=>{
      const { data: p } = await supabase.from("programa").select("id,nombre");
      setProgramas((p||[]).map((x:any)=>({value:x.id,label:x.nombre})));
      const { data: t } = await supabase.from("actividad_tipo").select("id,nombre");
      setTipos((t||[]).map((x:any)=>({value:x.id,label:x.nombre})));
      const { data: s } = await supabase.from("actividad_subtipo").select("id,nombre");
      setSubtipos((s||[]).map((x:any)=>({value:x.id,label:x.nombre})));
      const { data: a } = await supabase.from("actividad").select("id,fecha,hora_inicio,hora_fin,programa_id").order("fecha",{ascending:false});
      setList(a||[]);
    })();
  },[]);

  const create = async (e:any) => {
    e.preventDefault();
    const { error } = await supabase.from("actividad").insert({
      programa_id: form.programa_id,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      tipo_id: form.tipo_id || null,
      subtipo_id: form.subtipo_id || null,
      facilitador_id: form.facilitador_id || null,
      cupo: form.cupo ? Number(form.cupo) : null
    });
    if (error) alert(error.message);
    else {
      const { data: a } = await supabase.from("actividad").select("id,fecha,hora_inicio,hora_fin,programa_id").order("fecha",{ascending:false});
      setList(a||[]);
      setForm({programa_id:"",fecha:"",hora_inicio:"",hora_fin:"",tipo_id:"",subtipo_id:"",facilitador_id:"",cupo:""});
    }
  };

  return (
    <Protected>
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Actividades</h1>

        <Role allow={['admin','supervisor_central','coordinador_sede']}>
          <form onSubmit={create} className="card grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select label="Programa" options={programas} value={form.programa_id} onChange={(e:any)=>setForm({...form,programa_id:e.target.value})} />
            <Field label="Fecha" type="date" value={form.fecha} onChange={(e:any)=>setForm({...form,fecha:e.target.value})} />
            <Field label="Hora inicio" type="time" value={form.hora_inicio} onChange={(e:any)=>setForm({...form,hora_inicio:e.target.value})} />
            <Field label="Hora fin" type="time" value={form.hora_fin} onChange={(e:any)=>setForm({...form,hora_fin:e.target.value})} />
            <Select label="Tipo" options={tipos} value={form.tipo_id} onChange={(e:any)=>setForm({...form,tipo_id:e.target.value})} />
            <Select label="Subtipo" options={subtipos} value={form.subtipo_id} onChange={(e:any)=>setForm({...form,subtipo_id:e.target.value})} />
            <Field label="Cupo" type="number" value={form.cupo} onChange={(e:any)=>setForm({...form,cupo:e.target.value})} />
            <div className="md:col-span-4">
              <button className="button" type="submit">Crear actividad</button>
            </div>
          </form>
        </Role>

        <section className="grid gap-3">
          {list.map((a:any)=> (
            <div key={a.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium">{a.fecha} {a.hora_inicio}-{a.hora_fin}</div>
                <div className="text-xs text-gray-600">Programa: {a.programa_id.substring(0,8)}…</div>
              </div>
              <div className="flex gap-2">
                <Link className="button" href={`/asistencia/${a.id}`}>Registrar asistencia</Link>
              </div>
            </div>
          ))}
        </section>
      </main>
    </Protected>
  );
}
