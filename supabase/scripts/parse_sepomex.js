/**
 * parse_sepomex.js
 *
 * Parsea el archivo CPdescarga.txt de SEPOMEX (Correos de México) y genera
 * SQL de INSERT para las tablas cat_estado, cat_municipio y cat_asentamiento.
 *
 * Uso:
 *   node parse_sepomex.js <ruta_a_CPdescarga.txt>
 *
 * El archivo se descarga de:
 *   https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Descarga.aspx
 *
 * Formato del archivo (separado por |):
 *   d_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado|d_ciudad|d_CP|c_estado|c_oficina|c_CP|c_tipo_asenta|c_mnpio|id_asenta_cpcons
 *
 * Genera: ../seed_sepomex.sql
 */

const fs = require("fs");
const path = require("path");

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Uso: node parse_sepomex.js <ruta_a_CPdescarga.txt>");
  process.exit(1);
}

const outputFile = path.resolve(__dirname, "..", "seed_sepomex.sql");

const raw = fs.readFileSync(inputFile, "latin1");
const lines = raw.split(/\r?\n/).filter((l) => l.trim());

// Skip header lines (the first line with column names, and possible encoding BOM)
const dataLines = lines.filter((l) => !l.startsWith("d_codigo") && !l.startsWith("The") && l.includes("|"));

const estados = new Map(); // clave -> nombre
const municipios = new Map(); // id -> { clave_estado, clave_municipio, nombre }
const asentamientos = []; // { codigo_postal, nombre, tipo_asentamiento, municipio_id, ciudad }

for (const line of dataLines) {
  const cols = line.split("|").map((c) => c.trim());
  if (cols.length < 13) continue;

  const [d_codigo, d_asenta, d_tipo_asenta, D_mnpio, d_estado, d_ciudad, , c_estado, , , , c_mnpio] = cols;

  // Estado
  if (!estados.has(c_estado)) {
    estados.set(c_estado, d_estado);
  }

  // Municipio
  const munId = c_estado + c_mnpio;
  if (!municipios.has(munId)) {
    municipios.set(munId, {
      clave_estado: c_estado,
      clave_municipio: c_mnpio,
      nombre: D_mnpio,
    });
  }

  // Asentamiento
  asentamientos.push({
    codigo_postal: d_codigo,
    nombre: d_asenta,
    tipo_asentamiento: d_tipo_asenta,
    municipio_id: munId,
    ciudad: d_ciudad || null,
  });
}

function esc(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  return "'" + val.replace(/'/g, "''") + "'";
}

let sql = "-- seed_sepomex.sql - Generado automáticamente por parse_sepomex.js\n";
sql += "-- NO editar manualmente.\n\n";
sql += "BEGIN;\n\n";

// Estados
sql += "-- Estados (" + estados.size + ")\n";
for (const [clave, nombre] of estados) {
  sql += `INSERT INTO cat_estado (clave, nombre) VALUES (${esc(clave)}, ${esc(nombre)}) ON CONFLICT DO NOTHING;\n`;
}

sql += "\n-- Municipios (" + municipios.size + ")\n";
for (const [id, m] of municipios) {
  sql += `INSERT INTO cat_municipio (id, clave_estado, clave_municipio, nombre) VALUES (${esc(id)}, ${esc(m.clave_estado)}, ${esc(m.clave_municipio)}, ${esc(m.nombre)}) ON CONFLICT DO NOTHING;\n`;
}

sql += "\n-- Asentamientos (" + asentamientos.length + ")\n";

// Batch inserts for performance (500 per batch)
const BATCH_SIZE = 500;
for (let i = 0; i < asentamientos.length; i += BATCH_SIZE) {
  const batch = asentamientos.slice(i, i + BATCH_SIZE);
  sql += "INSERT INTO cat_asentamiento (codigo_postal, nombre, tipo_asentamiento, municipio_id, ciudad) VALUES\n";
  sql += batch
    .map(
      (a) =>
        `  (${esc(a.codigo_postal)}, ${esc(a.nombre)}, ${esc(a.tipo_asentamiento)}, ${esc(a.municipio_id)}, ${esc(a.ciudad)})`
    )
    .join(",\n");
  sql += ";\n\n";
}

sql += "COMMIT;\n";

fs.writeFileSync(outputFile, sql, "utf8");

console.log(`✅ Generado: ${outputFile}`);
console.log(`   Estados: ${estados.size}`);
console.log(`   Municipios: ${municipios.size}`);
console.log(`   Asentamientos: ${asentamientos.length}`);
