"use client";

import Protected from "../../components/Protected";
import { supabase } from "../../lib/supabaseClient";
import { getUserSedeSlug } from "../../lib/auth";
import { use, useEffect, useRef, useState } from "react";
import { Field, Select, SearchInput } from "../../components/Forms";

export default function Asistencia({ params }: { params: Promise<{ actividadId: string }> }) {
  const { actividadId } = use(params);

  const [sedeSlug, setSedeSlug] = useState<string | null>(null);
  const [curp, setCurp] = useState("");
  const [provisional, setProvisional] = useState(false);
  const [benef, setBenef] = useState<any>({
    nombre: "", primer_apellido: "", segundo_apellido: "",
    fecha_nacimiento: "", sexo: "",
    poblacion_indigena: "", lengua_indigena: "",
    condicion_migrante: "", escolaridad: ""
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loadingSede, setLoadingSede] = useState(true);
  const [actividadInfo, setActividadInfo] = useState<any>(null);

  // Kiosco + búsqueda
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedBenefId, setSelectedBenefId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [kiosk, setKiosk] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [forceNew, setForceNew] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [highlight, setHighlight] = useState<number>(-1);
  const [countToday, setCountToday] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userSlug = await getUserSedeSlug();
        let slug = userSlug;
        const { data } = await supabase
          .from('actividad')
          .select('fecha,hora_inicio,hora_fin,cupo, ubicacion, programa:programa_id ( nombre ), tipo:tipo_id ( nombre ), subtipo:subtipo_id ( nombre ), sede:sede_id ( slug, nombre )')
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
  }, [actividadId]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
      setKiosk(params.get('modo') === 'kiosco');
    } catch {}
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    const term = search.trim();
    setResults([]);
    if (!term) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('beneficiario')
          .select('id, nombre, primer_apellido, segundo_apellido, curp, fecha_nacimiento, sexo')
          .or(`nombre.ilike.%${term}%,primer_apellido.ilike.%${term}%,segundo_apellido.ilike.%${term}%,curp.ilike.%${term}%`)
          .limit(10);
        setResults((data as any[]) || []);
        setHighlight(((data as any[]) || []).length > 0 ? 0 : -1);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Contador de registrados hoy
  useEffect(() => {
    (async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('asistencia')
          .select('id', { count: 'exact', head: true })
          .eq('actividad_id', actividadId)
          .gte('created_at', start.toISOString());
        setCountToday(count || 0);
      } catch {
        setCountToday(0);
      }
    })();
  }, [actividadId]);

  // Posibles duplicados por nombre + fecha_nacimiento + sexo (cuando no hay CURP ni selección)
  useEffect(() => {
    (async () => {
      try {
        setDuplicateCandidates([]);
        setForceNew(false);
        if (selectedBenefId) return; // ya se eligió uno existente
        if (curp) return; // con CURP, el backend deduplica
        const nombre = (benef.nombre || '').trim();
        const pa = (benef.primer_apellido || '').trim();
        const fn = (benef.fecha_nacimiento || '').trim();
        const sx = (benef.sexo || '').trim();
        if (!nombre || !pa || !fn || !sx) return;
        let q = supabase
          .from('beneficiario')
          .select('id,nombre,primer_apellido,segundo_apellido,curp,fecha_nacimiento,sexo')
          .eq('fecha_nacimiento', fn)
          .eq('sexo', sx)
          .ilike('nombre', nombre)
          .ilike('primer_apellido', pa)
          .limit(5);
        const { data, error } = await q;
        if (!error && (data as any[])?.length) setDuplicateCandidates(data as any[]);
      } catch {}
    })();
  }, [benef.nombre, benef.primer_apellido, benef.fecha_nacimiento, benef.sexo, curp, selectedBenefId]);

  // Atajos de teclado: Enter para enviar, Esc para limpiar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        // Si el foco está en la búsqueda y hay sugerencias visibles, no enviar todavía
        const activeOnSearch = document.activeElement === (searchRef.current as any);
        if (activeOnSearch && results.length > 0 && !forceNew && !selectedBenefId) {
          if (highlight >= 0 && highlight < results.length) {
            e.preventDefault();
            const r: any = results[highlight];
            setSelectedBenefId(r.id);
            setBenef({
              nombre: r.nombre || '',
              primer_apellido: r.primer_apellido || '',
              segundo_apellido: r.segundo_apellido || '',
              fecha_nacimiento: r.fecha_nacimiento || '',
              sexo: r.sexo || '',
              poblacion_indigena: benef.poblacion_indigena || '',
              lengua_indigena: benef.lengua_indigena || '',
              condicion_migrante: benef.condicion_migrante || '',
              escolaridad: benef.escolaridad || ''
            });
            setCurp(r.curp || '');
            setProvisional(false);
            setResults([]);
            setSearch('');
            return;
          } else {
            e.preventDefault();
            return;
          }
        }
        e.preventDefault();
        formRef.current?.requestSubmit();
      } else if (e.key === 'ArrowDown' || e.key === 'Down') {
        const activeOnSearch = document.activeElement === (searchRef.current as any);
        if (activeOnSearch && results.length > 0) {
          e.preventDefault();
          setHighlight(h => Math.min((h < 0 ? 0 : h) + 1, results.length - 1));
        }
      } else if (e.key === 'ArrowUp' || e.key === 'Up') {
        const activeOnSearch = document.activeElement === (searchRef.current as any);
        if (activeOnSearch && results.length > 0) {
          e.preventDefault();
          setHighlight(h => Math.max((h < 0 ? 0 : h) - 1, 0));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // limpiar
        setCurp('');
        setBenef({ nombre: '', primer_apellido: '', segundo_apellido: '', fecha_nacimiento: '', sexo: '', poblacion_indigena: '', lengua_indigena: '', condicion_migrante: '', escolaridad: '' });
        setProvisional(false);
        setSelectedBenefId(null);
        setSearch('');
        setResults([]);
        setDuplicateCandidates([]);
        setForceNew(false);
        setHighlight(-1);
        setMsg(null);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fechaDMY = (iso: string | undefined | null) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const registrar = async (e: any) => {
    e.preventDefault();
    setMsg(null);
    setIsError(false);

    // Evitar doble asistencia si ya fue marcado (cuando seleccionaron un beneficiario existente)
    if (selectedBenefId) {
      const { count } = await supabase
        .from('asistencia')
        .select('id', { count: 'exact', head: true })
        .eq('actividad_id', actividadId)
        .eq('beneficiario_id', selectedBenefId);
      if ((count || 0) > 0) {
        setIsError(false);
        setMsg('Este beneficiario ya está registrado en esta actividad.');
        return;
      }
    }
    if (!selectedBenefId && !curp && duplicateCandidates.length > 0 && !forceNew) {
      setIsError(false);
      setMsg('Se detectaron posibles duplicados. Selecciona uno o confirma registrar como nuevo.');
      return;
    }

    const payload: any = {
      actividad_id: actividadId,
      curp: curp || null,
      provisional,
      beneficiario: { ...benef },
      sede_slug: sedeSlug
    };
    const resp = await fetch("/api/alta_rapida_asistencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.error) {
      setIsError(true);
      setMsg(data.error);
    } else {
      setIsError(false);
      setMsg('¡Asistencia registrada!');
      // Reset para flujo ágil
      setCurp("");
      setBenef({ nombre: "", primer_apellido: "", segundo_apellido: "", fecha_nacimiento: "", sexo: "", poblacion_indigena: "", lengua_indigena: "", condicion_migrante: "", escolaridad: "" });
      setProvisional(false);
      setSelectedBenefId(null);
      setSearch("");
      setResults([]);
      setCountToday((c) => c + 1);
      setTimeout(() => searchRef.current?.focus(), 0);
    }
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
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                Registrados hoy: {countToday}{typeof (actividadInfo as any)?.cupo === 'number' ? ` / ${(actividadInfo as any).cupo}` : ''}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={registrar} ref={formRef} className="card p-5 md:p-6 space-y-4">
          <div>
            <label className="form-label">Buscar beneficiario (CURP o nombre)</label>
            <SearchInput
              ref={searchRef as any}
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Ej. CURP o 'Juana Pérez'"
            />
            {results.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg divide-y bg-white shadow-sm max-h-56 overflow-auto">
                {results.map((r: any, idx: number) => (
                  <button type="button" key={r.id} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${idx===highlight?"bg-gray-100":""}`}
                    onClick={() => {
                      setSelectedBenefId(r.id);
                      setBenef({
                        nombre: r.nombre || '',
                        primer_apellido: r.primer_apellido || '',
                        segundo_apellido: r.segundo_apellido || '',
                        fecha_nacimiento: r.fecha_nacimiento || '',
                        sexo: r.sexo || '',
                        poblacion_indigena: benef.poblacion_indigena || '',
                        lengua_indigena: benef.lengua_indigena || '',
                        condicion_migrante: benef.condicion_migrante || '',
                        escolaridad: benef.escolaridad || ''
                      });
                      setCurp(r.curp || '');
                      setProvisional(false);
                      setResults([]);
                      setSearch("");
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">{r.nombre} {r.primer_apellido} {r.segundo_apellido || ''}</div>
                    <div className="text-xs text-gray-500">{(r.curp || '').toUpperCase()} {r.fecha_nacimiento ? `• ${r.fecha_nacimiento}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
            {duplicateCandidates.length > 0 && !selectedBenefId && !curp && (
              <div className="mt-3 p-3 rounded-lg border border-yellow-300 bg-yellow-50">
                <div className="text-sm font-medium text-yellow-800 mb-2">Posibles duplicados</div>
                <div className="space-y-2">
                  {duplicateCandidates.map((r:any) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-900">{r.nombre} {r.primer_apellido} {r.segundo_apellido || ''}</div>
                        <div className="text-xs text-gray-500">{(r.curp || '').toUpperCase()} {r.fecha_nacimiento ? `• ${r.fecha_nacimiento}` : ''}</div>
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedBenefId(r.id); setCurp(r.curp || curp); }}>
                        Usar existente
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setForceNew(true); formRef.current?.requestSubmit(); }}>
                    Registrar como nuevo de todos modos
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">CURP</label>
              <input className="form-input" value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())} placeholder="AAAA000000HDFRRN00" />
              <div className="form-help">
                Si no trae CURP, marque "Provisional" y capture datos mínimos.
              </div>
            </div>
            <div className="flex items-end gap-2">
              <input id="prov" className="form-checkbox" type="checkbox" checked={provisional} onChange={(e) => setProvisional(e.target.checked)} />
              <label htmlFor="prov" className="form-label">Provisional (sin CURP)</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre(s)" value={benef.nombre} onChange={(e: any) => setBenef({ ...benef, nombre: e.target.value })} required />
            <Field label="Primer apellido" value={benef.primer_apellido} onChange={(e: any) => setBenef({ ...benef, primer_apellido: e.target.value })} required />
            <Field label="Segundo apellido" value={benef.segundo_apellido} onChange={(e: any) => setBenef({ ...benef, segundo_apellido: e.target.value })} />
            <Field
              label="Fecha de nacimiento"
              type="date"
              value={benef.fecha_nacimiento}
              onChange={(e: any) => setBenef({ ...benef, fecha_nacimiento: e.target.value })}
              required
            />
            <Select label="Sexo" value={benef.sexo} onChange={(e: any) => setBenef({ ...benef, sexo: e.target.value })}
              options={[{ value: "F", label: "Femenino" }, { value: "M", label: "Masculino" }, { value: "X", label: "No especifica" }]} />
          </div>

          {!kiosk && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Población indígena" value={benef.poblacion_indigena} onChange={(e: any) => setBenef({ ...benef, poblacion_indigena: e.target.value })}
                options={[{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }, { value: "Prefiere no decir", label: "Prefiere no decir" }]} />
              <Field label="Lengua indígena" value={benef.lengua_indigena} onChange={(e: any) => setBenef({ ...benef, lengua_indigena: e.target.value })} />
              <Select label="Condición migrante/refugiada" value={benef.condicion_migrante} onChange={(e: any) => setBenef({ ...benef, condicion_migrante: e.target.value })}
                options={[{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }, { value: "Prefiere no decir", label: "Prefiere no decir" }]} />
              <Select label="Escolaridad" value={benef.escolaridad} onChange={(e: any) => setBenef({ ...benef, escolaridad: e.target.value })}
                options={[
                  { value: "Primaria", label: "Primaria" },
                  { value: "Secundaria", label: "Secundaria" },
                  { value: "Media superior", label: "Media superior" },
                  { value: "Superior", label: "Superior" },
                  { value: "Otra", label: "Otra" }
                ]} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button className="btn btn-primary btn-md" type="submit" disabled={!sedeSlug || loadingSede}>
              {loadingSede ? 'Cargando...' : 'Registrar'}
            </button>
            {!loadingSede && !sedeSlug && (
              <div className="alert alert-error">No se pudo determinar la sede.</div>
            )}
            {msg && (
              <div className={`alert ${isError ? 'alert-error' : 'alert-success'}`}>{msg}</div>
            )}
          </div>
        </form>
      </div>
    </Protected>
  );
}

