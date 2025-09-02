
"use client";
import Protected from "../../components/Protected";
import { supabase } from "../../lib/supabaseClient";
import { getUserSedeSlug } from "../../lib/auth";
import { use, useEffect, useState } from "react";
import { Field, Select } from "../../components/Forms";

export default function Asistencia({ params }: { params: Promise<{ actividadId: string }> }) {
  const { actividadId } = use(params);
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
  const [isError, setIsError] = useState(false);
  const [loadingSede, setLoadingSede] = useState(true);
  const [actividadInfo, setActividadInfo] = useState<any>(null);

  useEffect(()=>{
    let mounted = true;
    (async () => {
      try {
        const userSlug = await getUserSedeSlug();
        let slug = userSlug;
        const { data } = await supabase
          .from('actividad')
          .select('fecha,hora_inicio,hora_fin, ubicacion, programa:programa_id ( nombre ), tipo:tipo_id ( nombre ), subtipo:subtipo_id ( nombre ), sede:sede_id ( slug, nombre )')
          .eq('id', actividadId)
          .single();
        const sede = (data as any)?.sede;
        if (!slug) slug = sede?.slug ?? null;
        if (mounted) {
          setActividadInfo(data);
          setSedeSlug(slug);
        }
      } catch (_) {
        if (mounted) {
          setActividadInfo(null);
          setSedeSlug(null);
        }
      } finally {
        if (mounted) setLoadingSede(false);
      }
    })();
    return () => { mounted = false; };
  },[actividadId]);

  const fechaDMY = (iso: string | undefined | null) => {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const registrar = async (e:any) => {
    e.preventDefault();
    setMsg(null);
    const payload: any = {
      actividad_id: actividadId,
      curp: curp || null,
      provisional,
      beneficiario: { ...benef },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registrar asistencia</h1>
            <p className="text-gray-600">
              {actividadInfo ? (
                <>
                  {actividadInfo?.programa?.nombre ? `${actividadInfo.programa.nombre} • ` : ''}
                  {fechaDMY(actividadInfo?.fecha)}{actividadInfo?.hora_inicio ? ` ${actividadInfo.hora_inicio}` : ''}
                  {actividadInfo?.hora_fin ? ` - ${actividadInfo.hora_fin}` : ''}
                  {actividadInfo?.sede?.nombre || actividadInfo?.sede?.slug ? ` • Sede: ${actividadInfo?.sede?.nombre || actividadInfo?.sede?.slug}` : ''}
                </>
              ) : (
                'Cargando información de la actividad...'
              )}
            </p>
            {actividadInfo && (
              <p className="text-gray-600">
                {(actividadInfo?.tipo?.nombre || actividadInfo?.subtipo?.nombre) ? `Tipo: ${actividadInfo?.subtipo?.nombre || actividadInfo?.tipo?.nombre}` : ''}
                {actividadInfo?.ubicacion ? ` • Ubicación: ${actividadInfo.ubicacion}` : ''}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={registrar} className="card p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">CURP</label>
              <input className="form-input" value={curp} onChange={(e)=>setCurp(e.target.value.toUpperCase())} placeholder="AAAA000000HDFRRN00"/>
              <div className="form-help">
                Si no trae CURP, marque "Provisional" y capture datos mínimos.
              </div>
            </div>
            <div className="flex items-end gap-2">
              <input id="prov" className="form-checkbox" type="checkbox" checked={provisional} onChange={(e)=>setProvisional(e.target.checked)} />
              <label htmlFor="prov" className="form-label">Provisional (sin CURP)</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre(s)" value={benef.nombre} onChange={(e:any)=>setBenef({...benef, nombre:e.target.value})} required />
            <Field label="Primer apellido" value={benef.primer_apellido} onChange={(e:any)=>setBenef({...benef, primer_apellido:e.target.value})} required />
            <Field label="Segundo apellido" value={benef.segundo_apellido} onChange={(e:any)=>setBenef({...benef, segundo_apellido:e.target.value})} />
            <Field 
              label="Fecha de nacimiento" 
              type="date" 
              value={benef.fecha_nacimiento}
              onChange={(e:any)=>setBenef({...benef, fecha_nacimiento: e.target.value})}
              required 
            />
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

          <div className="flex items-center gap-3">
            <button className="btn btn-primary btn-md" type="submit" disabled={!sedeSlug || loadingSede}>
              {loadingSede ? 'Cargando...' : 'Registrar'}
            </button>
            {!loadingSede && !sedeSlug && (
              <div className="alert alert-error">No se pudo determinar la sede.</div>
            )}
            {msg && (
              <div className={`alert alert-info`}>
                {msg}
              </div>
            )}
          </div>
        </form>
      </div>
    </Protected>
  );
}
