
"use client";
import Protected from "../../components/Protected";
import { supabase } from "../../lib/supabaseClient";
import { getUserSedeSlug } from "../../lib/auth";
import { useEffect, useState } from "react";
import { Field, Select } from "../../components/Forms";

export default function Asistencia({ params }: any) {
  const actividadId = params.actividadId as string;
  const [sedeSlug, setSedeSlug] = useState<string | null>(null);
  const [curp, setCurp] = useState("");
  const [provisional, setProvisional] = useState(false);
  const [benef, setBenef] = useState<any>({
    nombre:"", primer_apellido:"", segundo_apellido:"",
    fecha_nacimiento:"", sexo:"",
    poblacion_indigena:"", lengua_indigena:"",
    condicion_migrante:"", escolaridad:""
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(()=>{
    getUserSedeSlug().then(setSedeSlug);
  },[]);

  const registrar = async (e:any) => {
    e.preventDefault();
    setMsg(null);
    const payload: any = {
      actividad_id: actividadId,
      curp: curp || null,
      provisional,
      beneficiario: benef,
      sede_slug: sedeSlug
    };
    const resp = await fetch("/api/alta_rapida_asistencia", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.error) setMsg(data.error);
    else setMsg("¡Asistencia registrada!");
  };

  return (
    <Protected>
      <section className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Registrar asistencia</h1>

        <form onSubmit={registrar} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CURP</label>
              <input className="input" value={curp} onChange={(e)=>setCurp(e.target.value.toUpperCase())} placeholder="AAAA000000HDFRRN00"/>
              <div className="text-xs text-gray-500 mt-1">
                Si no trae CURP, marque "Provisional" y capture datos mínimos.
              </div>
            </div>
            <div className="flex items-end gap-2">
              <input id="prov" type="checkbox" checked={provisional} onChange={(e)=>setProvisional(e.target.checked)} />
              <label htmlFor="prov" className="label">Provisional (sin CURP)</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre(s)" value={benef.nombre} onChange={(e:any)=>setBenef({...benef, nombre:e.target.value})} required />
            <Field label="Primer apellido" value={benef.primer_apellido} onChange={(e:any)=>setBenef({...benef, primer_apellido:e.target.value})} required />
            <Field label="Segundo apellido" value={benef.segundo_apellido} onChange={(e:any)=>setBenef({...benef, segundo_apellido:e.target.value})} />
            <Field label="Fecha de nacimiento" type="date" value={benef.fecha_nacimiento} onChange={(e:any)=>setBenef({...benef, fecha_nacimiento:e.target.value})} required />
            <Select label="Sexo" value={benef.sexo} onChange={(e:any)=>setBenef({...benef,sexo:e.target.value})}
              options={[{value:"F",label:"Femenino"},{value:"M",label:"Masculino"},{value:"X",label:"No especifica"}]} />
            <Select label="Población indígena" value={benef.poblacion_indigena} onChange={(e:any)=>setBenef({...benef,poblacion_indigena:e.target.value})}
              options={[{value:"Sí",label:"Sí"},{value:"No",label:"No"},{value:"Prefiere no decir",label:"Prefiere no decir"}]} />
            <Field label="Lengua indígena" value={benef.lengua_indigena} onChange={(e:any)=>setBenef({...benef, lengua_indigena:e.target.value})} />
            <Select label="Condición migrante/refugiada" value={benef.condicion_migrante} onChange={(e:any)=>setBenef({...benef,condicion_migrante:e.target.value})}
              options={[{value:"Sí",label:"Sí"},{value:"No",label:"No"},{value:"Prefiere no decir",label:"Prefiere no decir"}]} />
            <Select label="Escolaridad" value={benef.escolaridad} onChange={(e:any)=>setBenef({...benef,escolaridad:e.target.value})}
              options={[
                {value:"Primaria",label:"Primaria"},
                {value:"Secundaria",label:"Secundaria"},
                {value:"Media superior",label:"Media superior"},
                {value:"Superior",label:"Superior"},
                {value:"Otra",label:"Otra"}
              ]} />
          </div>

          <button className="button" type="submit">Registrar</button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>
      </section>
    </Protected>
  );
}
