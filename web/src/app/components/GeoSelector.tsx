"use client";
import { useCallback, useEffect, useState } from "react";
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

  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [asentamientos, setAsentamientos] = useState<Asentamiento[]>([]);

  const [cpInput, setCpInput] = useState(value.codigo_postal || "");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpResults, setCpResults] = useState<Asentamiento[]>([]);
  const [cpEstado, setCpEstado] = useState("");
  const [cpMunicipio, setCpMunicipio] = useState("");

  // Load estados on mount
  useEffect(() => {
    supabase
      .from("cat_estado")
      .select("clave,nombre")
      .order("nombre")
      .then(({ data }) => setEstados((data as Estado[]) || []));
  }, []);

  // Load municipios when estado changes (cascada mode)
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
      // Lookup municipio and estado from first result
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

  const estadoOptions = estados.map((e) => ({ value: e.clave, label: e.nombre }));
  const municipioOptions = municipios.map((m) => ({ value: m.id, label: m.nombre }));
  const coloniaOptions = asentamientos.map((a) => ({
    value: a.nombre,
    label: `${a.nombre}${a.tipo_asentamiento ? ` (${a.tipo_asentamiento})` : ""}`,
  }));

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 font-medium">Ubicación:</span>
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === "cp" ? "bg-brand-100 text-brand-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => setMode("cp")}
        >
          Por Código Postal
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === "cascada" ? "bg-brand-100 text-brand-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => setMode("cascada")}
        >
          Por Estado / Municipio
        </button>
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
              help={cpLoading ? "Buscando..." : cpInput.length === 5 && cpResults.length === 0 ? "CP no encontrado" : ""}
            />
            {cpEstado && (
              <Field label="Estado" value={cpEstado} readOnly />
            )}
            {cpMunicipio && (
              <Field label="Municipio" value={cpMunicipio} readOnly />
            )}
          </div>

          {cpResults.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localidad / Colonia
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {cpResults.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`text-left px-3 py-1.5 rounded text-sm transition-colors ${
                      value.localidad_colonia === a.nombre
                        ? "bg-brand-100 text-brand-800 font-medium"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => selectColonia(a.nombre)}
                  >
                    {a.nombre}
                    {a.tipo_asentamiento && (
                      <span className="text-xs text-gray-500 ml-1">({a.tipo_asentamiento})</span>
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
              onChange({ ...value, municipio_id: id, localidad_colonia: "" });
            }}
            required={required}
          />
          <Field
            label="Código Postal"
            value={value.codigo_postal || ""}
            onChange={(e) => onChange({ ...value, codigo_postal: (e.target as HTMLInputElement).value.replace(/\D/g, "").slice(0, 5) })}
            placeholder="Opcional"
          />
          {coloniaOptions.length > 0 ? (
            <Select
              label="Localidad / Colonia"
              options={coloniaOptions}
              value={value.localidad_colonia || ""}
              onChange={(e) => onChange({ ...value, localidad_colonia: (e.target as HTMLSelectElement).value })}
            />
          ) : (
            <Field
              label="Localidad / Colonia"
              value={value.localidad_colonia || ""}
              onChange={(e) => onChange({ ...value, localidad_colonia: (e.target as HTMLInputElement).value })}
              placeholder="Localidad o colonia"
            />
          )}
        </div>
      )}

      {/* Summary of selection */}
      {value.estado_clave && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span>📍</span>
          {estados.find((e) => e.clave === value.estado_clave)?.nombre}
          {value.municipio_id && `, ${municipios.find((m) => m.id === value.municipio_id)?.nombre || cpMunicipio}`}
          {value.localidad_colonia && `, ${value.localidad_colonia}`}
          {value.codigo_postal && ` (CP ${value.codigo_postal})`}
        </div>
      )}
    </div>
  );
}
