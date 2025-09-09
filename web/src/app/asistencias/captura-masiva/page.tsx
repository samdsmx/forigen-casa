"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Protected from "../../components/Protected";
import { supabase } from "../../lib/supabaseClient";
import { Field, Select, SearchInput, FileInput } from "../../components/Forms";

type RowMap = {
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  fecha_nacimiento: string;
  sexo: string;
  curp?: string;
  escolaridad?: string;
};

type ParsedRow = RowMap & {
  _status?: "nuevo" | "existente" | "conflicto" | "error";
  _beneficiario_id?: string | null;
  _errorMsg?: string | null;
  _candidates?: any[];
};

const guessMap = (headers: string[]) => {
  const norm = (s: string) => s.toLowerCase().trim();
  const find = (names: string[]) => headers.findIndex(h => names.includes(norm(h)));
  return {
    nombre: find(["nombre", "nombres"]),
    primer_apellido: find(["apellido", "primer apellido", "apellido paterno", "apellidopaterno"]),
    segundo_apellido: find(["segundo apellido", "apellido materno", "apellidomaterno"]),
    fecha_nacimiento: find(["fecha", "fecha nacimiento", "fecha de nacimiento", "fechanacimiento"]),
    sexo: find(["sexo", "genero", "género"]),
    curp: find(["curp"]),
    escolaridad: find(["escolaridad"])
  };
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(cur); cur = "";
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cur !== "" || row.length > 0) { row.push(cur); cur = ""; rows.push(row); row = []; }
      if (c === '\r' && next === '\n') i++;
    } else {
      cur += c;
    }
  }
  if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

export default function CapturaMasivaPage() {
  const [actividadId, setActividadId] = useState<string>("");
  const [raw, setRaw] = useState<string>("");
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapIdx, setMapIdx] = useState<Record<keyof RowMap, number | null>>({
    nombre: null, primer_apellido: null, segundo_apellido: null,
    fecha_nacimiento: null, sexo: null, curp: null, escolaridad: null,
  });
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{done:number; total:number}>({done:0,total:0});
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
      const aid = params.get('actividadId');
      if (aid) setActividadId(aid);
    } catch {}
  }, []);

  const requiredFields: (keyof RowMap)[] = ["nombre", "primer_apellido", "fecha_nacimiento", "sexo"];

  const onParse = (text: string) => {
    setRaw(text);
    const r = parseCSV(text);
    if (!r.length) { setRows([]); setHeaders([]); return; }
    const headersGuess = r[0].every(c => /[a-zA-Z]/.test(c)) ? r[0] : [];
    const body = headersGuess.length ? r.slice(1) : r;
    setRows(body);
    setHeaders(headersGuess.length ? headersGuess : ["nombre","primer apellido","segundo apellido","fecha nacimiento","sexo","curp","escolaridad"]);
    if (headersGuess.length) {
      const g = guessMap(headersGuess);
      setMapIdx({
        nombre: g.nombre ?? null,
        primer_apellido: g.primer_apellido ?? null,
        segundo_apellido: g.segundo_apellido ?? null,
        fecha_nacimiento: g.fecha_nacimiento ?? null,
        sexo: g.sexo ?? null,
        curp: g.curp ?? null,
        escolaridad: g.escolaridad ?? null,
      });
    }
  };

  const canMap = useMemo(() => requiredFields.every(f => mapIdx[f] !== null), [mapIdx]);

  const buildParsed = () => {
    if (!canMap) { setParsed([]); return; }
    const list: ParsedRow[] = rows.map(row => {
      const pick = (k: keyof RowMap) => {
        const idx = mapIdx[k];
        return (idx !== null && idx! < row.length) ? (row[idx!] || "").trim() : "";
      };
      const obj: ParsedRow = {
        nombre: pick('nombre'),
        primer_apellido: pick('primer_apellido'),
        segundo_apellido: pick('segundo_apellido') || undefined,
        fecha_nacimiento: pick('fecha_nacimiento'),
        sexo: pick('sexo'),
        curp: pick('curp') || undefined,
        escolaridad: pick('escolaridad') || undefined,
      };
      return obj;
    });
    setParsed(list);
  };

  useEffect(() => { buildParsed(); /* eslint-disable-next-line */ }, [rows, mapIdx]);

  const detectar = async () => {
    try {
      setDetecting(true);
      // 1) por CURP
      const curps = parsed.map(p => (p.curp || "").toUpperCase()).filter(c => !!c);
      const curpSet = Array.from(new Set(curps));
      let existingByCurp: Record<string, string> = {};
      if (curpSet.length) {
        const { data } = await supabase
          .from('beneficiario')
          .select('id,curp');
        const all = (data as any[] || []);
        all.forEach(r => { if (r.curp) existingByCurp[(r.curp as string).toUpperCase()] = r.id; });
      }
      // 2) por nombre+fecha+sexo (consulta por fila para precisión)
      const updated: ParsedRow[] = [];
      for (const p of parsed) {
        const curpU = (p.curp || '').toUpperCase();
        if (curpU && existingByCurp[curpU]) {
          updated.push({ ...p, _status: 'existente', _beneficiario_id: existingByCurp[curpU] });
          continue;
        }
        if (p.nombre && p.primer_apellido && p.fecha_nacimiento && p.sexo) {
          const { data, error } = await supabase
            .from('beneficiario')
            .select('id,nombre,primer_apellido,segundo_apellido,curp,fecha_nacimiento,sexo')
            .eq('fecha_nacimiento', p.fecha_nacimiento)
            .eq('sexo', p.sexo)
            .ilike('nombre', p.nombre)
            .ilike('primer_apellido', p.primer_apellido)
            .limit(2);
          if (!error) {
            const arr = (data as any[]) || [];
            if (arr.length === 1) updated.push({ ...p, _status: 'existente', _beneficiario_id: arr[0].id });
            else if (arr.length > 1) updated.push({ ...p, _status: 'conflicto', _beneficiario_id: null, _errorMsg: 'Múltiples coincidencias', _candidates: arr });
            else updated.push({ ...p, _status: 'nuevo', _beneficiario_id: null });
            continue;
          }
        }
        updated.push({ ...p, _status: 'nuevo' });
      }
      setParsed(updated);
    } finally {
      setDetecting(false);
    }
  };

  const procesar = async () => {
    if (!actividadId) { alert('Captura el ID de la actividad.'); return; }
    setProcessing(true);
    setProgress({ done: 0, total: parsed.length });
    try {
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        const payload: any = {
          actividad_id: actividadId,
          curp: p.curp || null,
          provisional: !p.curp,
          beneficiario: {
            nombre: p.nombre,
            primer_apellido: p.primer_apellido,
            segundo_apellido: p.segundo_apellido || '',
            fecha_nacimiento: p.fecha_nacimiento,
            sexo: p.sexo,
            escolaridad: p.escolaridad || ''
          }
        };
        try {
          const resp = await fetch('/api/alta_rapida_asistencia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await resp.json();
          if (data.error) {
            parsed[i]._status = 'error';
            parsed[i]._errorMsg = data.error;
          } else {
            parsed[i]._status = parsed[i]._status === 'existente' ? 'existente' : 'nuevo';
          }
        } catch (e:any) {
          const pend = { actividad_id: actividadId, payload };
          const key = `pendientes_asistencia_${actividadId}`;
          const prev = JSON.parse(localStorage.getItem(key) || '[]');
          prev.push(pend);
          localStorage.setItem(key, JSON.stringify(prev));
          setPending(prev);
          parsed[i]._status = 'error';
          parsed[i]._errorMsg = 'Guardado en pendientes (sin red)';
        }
        setProgress({ done: i + 1, total: parsed.length });
      }
      setParsed([...parsed]);
      alert('Procesamiento finalizado');
    } finally {
      setProcessing(false);
    }
  };
  const descargarPlantilla = () => {
    const headers = ['nombre','primer_apellido','segundo_apellido','fecha_nacimiento','sexo','curp','escolaridad'];
    const sample = ['JUANA','PEREZ','LOPEZ','2001-05-12','F','PEJJ010512MDFRPN01','Secundaria'];
    const csv = [headers.join(', '), sample.join(', ')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_asistencias.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const cargarPendientes = () => {
    const key = `pendientes_asistencia_${actividadId}`;
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    setPending(prev);
  };
  const enviarPendientes = async () => {
    if (!actividadId) { alert('Actividad requerida'); return; }
    const key = `pendientes_asistencia_${actividadId}`;
    const prev: any[] = JSON.parse(localStorage.getItem(key) || '[]');
    const rest: any[] = [];
    for (const pend of prev) {
      try {
        const resp = await fetch('/api/alta_rapida_asistencia', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pend.payload) });
        const data = await resp.json();
        if (data.error) rest.push(pend);
      } catch { rest.push(pend); }
    }
    localStorage.setItem(key, JSON.stringify(rest));
    setPending(rest);
    alert(rest.length ? `Quedaron ${rest.length} pendientes` : 'Pendientes enviados');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onParse(String(reader.result || ''));
    reader.readAsText(f);
  };

  return (
    <Protected>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Captura masiva de asistencias</h1>
            <p className="text-gray-600">Pega desde Excel o sube un CSV, mapea columnas y procesa.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Actividad ID" value={actividadId} onChange={(e:any)=>setActividadId(e.target.value)} required />
            <div className="md:col-span-2">
              <FileInput label="Subir CSV" accept=".csv,text/csv" onChange={onFile} ref={fileRef as any} />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button className="btn btn-secondary btn-sm" type="button" onClick={descargarPlantilla}>Descargar plantilla CSV</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={cargarPendientes}>Cargar pendientes</button>
              {pending.length > 0 && (
                <button className="btn btn-primary btn-sm" type="button" onClick={enviarPendientes}>Enviar pendientes ({pending.length})</button>
              )}
            </div>
            <div className="md:col-span-3">
              <label className="form-label">Pegar datos (con encabezados)</label>
              <textarea className="form-textarea" rows={6} placeholder="Pega aquí..." value={raw} onChange={(e)=>onParse(e.target.value)} />
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Mapeo de columnas</h3>
            </div>
            <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(mapIdx).map((k) => (
                <Select key={k} label={k} value={mapIdx[k as keyof RowMap] ?? ''} onChange={(e:any)=>setMapIdx({...mapIdx, [k]: e.target.value ? Number(e.target.value) : null})}
                  options={[{value:"",label:"-- Seleccionar --"}, ...headers.map((h,idx)=>({value:String(idx), label:`${idx+1}. ${h}`}))]} />
              ))}
            </div>
            <div className="card-footer flex gap-3">
              <button className="btn btn-secondary btn-md" onClick={detectar} disabled={!canMap || detecting}>
                {detecting ? 'Detectando...' : 'Detectar existentes'}
              </button>
              <button className="btn btn-primary btn-md" onClick={procesar} disabled={!canMap || !actividadId || processing}>
                {processing ? `Procesando ${progress.done}/${progress.total}...` : 'Procesar registros'}
              </button>
            </div>
          </div>
        )}

        {parsed.length > 0 && (
          <div className="card">
            <div className="card-body overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CURP</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sexo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsed.map((p, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-xs">
                        {p._status === 'existente' && <span className="badge badge-success">Existente</span>}
                        {p._status === 'nuevo' && <span className="badge badge-primary">Nuevo</span>}
                        {p._status === 'conflicto' && <span className="badge badge-warning">Conflicto</span>}
                        {p._status === 'error' && <span className="badge badge-error">Error</span>}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{p.nombre} {p.primer_apellido} {p.segundo_apellido || ''}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{(p.curp || '').toUpperCase()}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{p.fecha_nacimiento}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {p.sexo}
                        {p._status==='conflicto' && (p as any)._candidates && (
                          <div className="mt-2">
                            <select className="form-select" onChange={(e:any)=>{
                              const val = e.target.value;
                              if (val) {
                                const cand = (p as any)._candidates.find((c:any)=>c.id===val);
                                p._beneficiario_id = val;
                                p.curp = (cand?.curp || p.curp || '').toUpperCase();
                                p._status = 'existente';
                                setParsed([...parsed]);
                              }
                            }}>
                              <option value="">Elegir existente…</option>
                              {(p as any)._candidates.map((c:any)=> (
                                <option key={c.id} value={c.id}>{c.nombre} {c.primer_apellido} {(c.curp||'').toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {p._status==='error' && p._errorMsg && (
                          <div className="text-xs text-red-600 mt-1">{p._errorMsg}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}






