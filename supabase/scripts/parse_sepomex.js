/**
 * parse_sepomex.js
 *
 * Parsea el archivo CPdescarga.txt de SEPOMEX (Correos de México) y genera
 * SQL de INSERT para las tablas cat_estado, cat_municipio y cat_asentamiento.
 *
 * Uso:
 *   node parse_sepomex.js <ruta_a_CPdescarga.txt> [--encoding utf8|latin1|cp1252]
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

const args = process.argv.slice(2);
const encodingFlag = args.indexOf("--encoding");
let forceEncoding = null;
let inputFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--encoding" && args[i + 1]) {
    forceEncoding = args[i + 1];
    i++;
  } else if (!inputFile) {
    inputFile = args[i];
  }
}

if (!inputFile) {
  console.error("Uso: node parse_sepomex.js <ruta_a_CPdescarga.txt> [--encoding utf8|latin1|cp1252]");
  process.exit(1);
}

const outputFile = path.resolve(__dirname, "..", "seed_sepomex.sql");

/**
 * Decodifica un Buffer de Windows-1252 a string UTF-16 (JS nativo).
 * Cubre los bytes 0x80–0x9F que difieren de ISO-8859-1.
 */
const CP1252_MAP = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};

function decodeCp1252(buf) {
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b in CP1252_MAP) {
      out += String.fromCharCode(CP1252_MAP[b]);
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

/**
 * Detecta la codificación del archivo:
 *  - Si empieza con BOM UTF-8 (EF BB BF) → utf8
 *  - Si al leer como UTF-8 no hay caracteres de reemplazo → utf8
 *  - De lo contrario → cp1252 (superset de latin1, común en archivos de Windows/México)
 */
function detectAndRead(filePath) {
  const buf = fs.readFileSync(filePath);

  // UTF-8 BOM
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    console.log("   Codificación detectada: UTF-8 (con BOM)");
    return buf.toString("utf8").slice(1); // quitar BOM
  }

  // Intentar UTF-8
  const asUtf8 = buf.toString("utf8");
  if (!asUtf8.includes("\uFFFD")) {
    // Verificar que no haya secuencias inválidas: buscar bytes > 127 que no formen UTF-8 válido
    let hasHighBytes = false;
    for (let i = 0; i < buf.length && i < 10000; i++) {
      if (buf[i] > 127) { hasHighBytes = true; break; }
    }
    if (!hasHighBytes) {
      console.log("   Codificación detectada: ASCII (compatible UTF-8)");
      return asUtf8;
    }
    // Tiene bytes altos y no hubo replacement chars → probablemente UTF-8 válido
    console.log("   Codificación detectada: UTF-8");
    return asUtf8;
  }

  // Fallback: CP-1252 (Windows-1252)
  console.log("   Codificación detectada: Windows-1252 (CP1252)");
  return decodeCp1252(buf);
}

let raw;
if (forceEncoding) {
  console.log(`   Codificación forzada: ${forceEncoding}`);
  if (forceEncoding === "cp1252" || forceEncoding === "windows-1252") {
    raw = decodeCp1252(fs.readFileSync(inputFile));
  } else {
    raw = fs.readFileSync(inputFile, forceEncoding);
  }
} else {
  raw = detectAndRead(inputFile);
}
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

let sql = "\\set ON_ERROR_STOP on\n";
sql += "SET client_encoding TO 'UTF8';\n\n";
sql += "-- seed_sepomex.sql - Generado automáticamente por parse_sepomex.js\n";
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

// Escribir con BOM UTF-8 para garantizar que editores y psql lo lean correctamente
fs.writeFileSync(outputFile, "\uFEFF" + sql, "utf8");

console.log(`✅ Generado: ${outputFile}`);
console.log(`   Estados: ${estados.size}`);
console.log(`   Municipios: ${municipios.size}`);
console.log(`   Asentamientos: ${asentamientos.length}`);
