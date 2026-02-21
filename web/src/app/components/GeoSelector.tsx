"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Field, Select } from "./Forms";

export interface GeoValue {
  estado_clave: string;
  municipio_id: string;
  codigo_postal: string;
  localidad_colonia: string;
}

interface GeoSelectorProps {
  value: Partial<GeoValue>;
  onChange: (geo: Partial<GeoValue>) => void;
  required?: boolean;
}

type Estado = { clave: string; nombre: string };
type Municipio = { id: string; nombre: string; clave_estado: string };
type Asentamiento = { id: number; nombre: string; codigo_postal: string; tipo_asentamiento: string | null; municipio_id: string };

export default function GeoSelector({ value, onChange, required }: GeoSelectorProps) {
  const [mode, setMode] = useState<"cp" | "cascada">("cp");
  const hasData = !!(value.estado_clave || value.codigo_postal || value.localidad_colonia);
  const [editing, setEditing] = useState(!hasData);

  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [asentamientos, setAsentamientos] = useState<Asentamiento[]>([]);

  const [cpInput, setCpInput] = useState(value.codigo_postal || "");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpResults, setCpResults] = useState<Asentamiento[]>([]);
  const [cpEstado, setCpEstado] = useState("");
  const [cpMunicipio, setCpMunicipio] = useState("");
  const didAutoSearch = useRef(false);

  // Load estados on mount
  useEffect(() => {
    supabase
      .from("cat_estado")
      .select("clave,nombre")
      .order("nombre")
      .then(({ data }) => setEstados((data as Estado[]) || []));
  }, []);

  // Auto-search CP on mount when value has existing CP
  useEffect(() => {
    if (didAutoSearch.current) return;
    if (estados.length === 0) return;
    const cp = value.codigo_postal || "";
    if (cp.length === 5) {
      didAutoSearch.current = true;
      setCpInput(cp);
      searchCp(cp);
    }
  }, [estados, value.codigo_postal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load municipios when estado changes
  useEffect(() => {
    if (!value.estado_clave) {
      setMunicipios([]);
      return;
    }
    supabase
      .from("cat_municipio")
      .select("id,nombre,clave_estado")
      .eq("clave_estado", value.estado_clave)
      .order("nombre")
      .then(({ data }) => setMunicipios((data as Municipio[]) || []));
  }, [value.estado_clave]);

  // Load asentamientos when municipio changes (cascada mode)
  useEffect(() => {
    if (mode !== "cascada" || !value.municipio_id) {
      setAsentamientos([]);
      return;
    }
    supabase
      .from("cat_asentamiento")
      .select("id,nombre,codigo_postal,tipo_asentamiento,municipio_id")
      .eq("municipio_id", value.municipio_id)
      .order("nombre")
      .then(({ data }) => setAsentamientos((data as Asentamiento[]) || []));
  }, [mode, value.municipio_id]);

  // CP search
  const searchCp = useCallback(async (cp: string) => {
    if (cp.length !== 5) {
      setCpResults([]);
      setCpEstado("");
      setCpMunicipio("");
      return;
    }
    setCpLoading(true);
    const { data } = await supabase
      .from("cat_asentamiento")
      .select("id,nombre,codigo_postal,tipo_asentamiento,municipio_id")
      .eq("codigo_postal", cp);

    const results = (data as Asentamiento[]) || [];
    setCpResults(results);

    if (results.length > 0) {
      const { data: mun } = await supabase
        .from("cat_municipio")
        .select("id,nombre,clave_estado")
        .eq("id", results[0].municipio_id)
        .single();

      if (mun) {
        const m = mun as Municipio;
        const estado = estados.find((e) => e.clave === m.clave_estado);
        setCpEstado(estado?.nombre || "");
        setCpMunicipio(m.nombre);
        onChange({
          ...value,
          estado_clave: m.clave_estado,
          municipio_id: m.id,
          codigo_postal: cp,
        });
      }
    }
    setCpLoading(false);
  }, [estados, onChange, value]);

  const handleCpChange = (cp: string) => {
    const cleaned = cp.replace(/\D/g, "").slice(0, 5);
    setCpInput(cleaned);
    if (cleaned.length === 5) {
      searchCp(cleaned);
    } else {
      setCpResults([]);
      setCpEstado("");
      setCpMunicipio("");
    }
  };

  const selectColonia = (nombre: string) => {
    onChange({ ...value, localidad_colonia: nombre });
  };

  // In cascada mode, auto-fill CP from selected colonia
  const selectColoniaCascada = (nombre: string) => {
    const found = asentamientos.find((a) => a.nombre === nombre);
    onChange({
      ...value,
      localidad_colonia: nombre,
      codigo_postal: found?.codigo_postal || value.codigo_postal || "",
    });
  };

  const estadoOptions = estados.map((e) => ({ value: e.clave, label: e.nombre }));
  const municipioOptions = municipios.map((m) => ({ value: m.id, label: m.nombre }));
  const coloniaOptions = asentamientos.map((a) => ({
    value: a.nombre,
    label: `${a.nombre}${a.tipo_asentamiento ? ` (${a.tipo_asentamiento})` : ""}`,
  }));

  // Build summary text
  const summaryParts: string[] = [];
  const estadoNombre = estados.find((e) => e.clave === value.estado_clave)?.nombre;
  if (estadoNombre) summaryParts.push(estadoNombre);
  const munNombre = municipios.find((m) => m.id === value.municipio_id)?.nombre || cpMunicipio;
  if (munNombre) summaryParts.push(munNombre);
  if (value.localidad_colonia) summaryParts.push(value.localidad_colonia);
  const summaryText = summaryParts.join(", ");

  // Collapsed view: show preview with edit button
  if (!editing && hasData) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>📍</span>
            <span>{summaryText || "Ubicación registrada"}</span>
            {value.codigo_postal && (
              <span className="text-gray-500 dark:text-gray-400">(CP {value.codigo_postal})</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing(true)}
            title="Editar ubicación"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400 font-medium">Ubicación:</span>
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === "cp" ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
          onClick={() => setMode("cp")}
        >
          Por Código Postal
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === "cascada" ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
          onClick={() => setMode("cascada")}
        >
          Por Estado / Municipio
        </button>
        {hasData && (
          <button
            type="button"
            className="ml-auto btn btn-ghost btn-sm text-xs"
            onClick={() => setEditing(false)}
          >
            Listo
          </button>
        )}
      </div>

      {mode === "cp" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="Código Postal"
              value={cpInput}
              onChange={(e) => handleCpChange((e.target as HTMLInputElement).value)}
              placeholder="Ej. 06600"
              required={required}
              help={cpLoading ? "Buscando..." : cpInput.length === 5 && cpResults.length === 0 && !cpLoading ? "CP no encontrado en el catálogo" : ""}
            />
            <Field label="Estado" value={cpEstado} readOnly placeholder="—" />
            <Field label="Municipio" value={cpMunicipio} readOnly placeholder="—" />
          </div>

          {cpResults.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Localidad / Colonia
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-48 overflow-y-auto border rounded-lg p-2 bg-white dark:bg-gray-800 dark:border-gray-700">
                {cpResults.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`text-left px-3 py-1.5 rounded text-sm transition-colors ${
                      value.localidad_colonia === a.nombre
                        ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200 font-medium"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                    onClick={() => selectColonia(a.nombre)}
                  >
                    {a.nombre}
                    {a.tipo_asentamiento && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({a.tipo_asentamiento})</span>
                    )}
                  </button>
                ))}
              </div>
              <Field
                label=""
                value={value.localidad_colonia || ""}
                onChange={(e) => onChange({ ...value, localidad_colonia: (e.target as HTMLInputElement).value })}
                placeholder="O escribe la localidad/colonia manualmente"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Estado"
            options={estadoOptions}
            value={value.estado_clave || ""}
            onChange={(e) => {
              const clave = (e.target as HTMLSelectElement).value;
              onChange({ ...value, estado_clave: clave, municipio_id: "", codigo_postal: "", localidad_colonia: "" });
            }}
            required={required}
          />
          <Select
            label="Municipio"
            options={municipioOptions}
            value={value.municipio_id || ""}
            onChange={(e) => {
              const id = (e.target as HTMLSelectElement).value;
              onChange({ ...value, municipio_id: id, codigo_postal: "", localidad_colonia: "" });
            }}
            required={required}
          />
          {coloniaOptions.length > 0 ? (
            <Select
              label="Localidad / Colonia"
              options={coloniaOptions}
              value={value.localidad_colonia || ""}
              onChange={(e) => selectColoniaCascada((e.target as HTMLSelectElement).value)}
            />
          ) : (
            <Field
              label="Localidad / Colonia"
              value={value.localidad_colonia || ""}
              onChange={(e) => onChange({ ...value, localidad_colonia: (e.target as HTMLInputElement).value })}
              placeholder="Localidad o colonia"
            />
          )}
          <Field label="Código Postal" value={value.codigo_postal || ""} readOnly placeholder="Se llena con la colonia" />
        </div>
      )}

      {/* Summary */}
      {summaryText && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span>📍</span>
          {summaryText}
          {value.codigo_postal && ` (CP ${value.codigo_postal})`}
        </div>
      )}
    </div>
  );
}
