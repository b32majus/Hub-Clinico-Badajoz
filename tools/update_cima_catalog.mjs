#!/usr/bin/env node
/**
 * update_cima_catalog.mjs — regenera la hoja CATALOGO_CIMA del catálogo
 * farmacológico publicado a partir de la API pública de CIMA (AEMPS)
 * (deuda CDC-001, buscador tramo 5).
 *
 * Decisiones (Sil, 12-11-2026):
 *  - SIN filtro hospitalario: se incluyen todos los comercializados
 *    (comerc === true); el criterio de hospitalario queda como columna
 *    informativa, nunca como filtro.
 *  - La hoja manual CATALOGO_LOCAL_ESPECIAL se copia tal cual.
 *  - codigo_nacional queda vacío (el listado de medicamentos no lo da).
 *  - Mismo nombre de fichero publicado, sobrescrito en sitio.
 *
 * Importar el módulo no toca la red ni escribe ficheros; main() solo corre
 * cuando el script se ejecuta directamente.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

export const CATALOG_PATH = 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx';
export const MIN_COMERCIALIZADOS = 10000;

export const CIMA_COLUMNS = Object.freeze([
    'drug_source_id',
    'codigo_nacional',
    'nregistro',
    'nombre_presentacion',
    'nombre_comercial',
    'principio_activo',
    'forma_farmaceutica',
    'dosis_presentacion',
    'via',
    'laboratorio',
    'comercializado',
    'receta',
    'cpresc_raw',
    'es_hospitalario_derivado',
    'criterio_hospitalario',
    'biosimilar',
    'problema_suministro',
    'url_ficha_tecnica',
    'url_prospecto',
    'fecha_extraccion',
    'observaciones_import'
]);

const CIMA_BASE_URL = 'https://cima.aemps.es/cima/rest/medicamentos';
const MAX_FETCH_PAGES = 1000;

const boolText = (value) => (value === true ? 'True' : 'False');
const cellText = (value) => (value == null ? '' : String(value).trim());
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function mapMedicamento(med, fechaExtraccion) {
    const nregistro = String(med.nregistro);
    const vtmNombre = med.vtm && med.vtm.nombre ? String(med.vtm.nombre) : '';
    const cpresc = cellText(med.cpresc);
    const esHospitalario = /hospitalari/i.test(cpresc);
    const docs = Array.isArray(med.docs) ? med.docs : [];
    const fichaTecnica = docs.find((doc) => doc && doc.tipo === 1);
    const prospecto = docs.find((doc) => doc && doc.tipo === 2);
    return {
        drug_source_id: nregistro,
        codigo_nacional: '',
        nregistro: nregistro,
        nombre_presentacion: cellText(med.nombre),
        nombre_comercial: cellText(med.nombre),
        principio_activo: vtmNombre.replace(/ \+ /g, ', ').toLocaleUpperCase('es').trim(),
        forma_farmaceutica:
            med.formaFarmaceutica && med.formaFarmaceutica.nombre ? String(med.formaFarmaceutica.nombre).trim() : '',
        dosis_presentacion: cellText(med.dosis),
        via: (Array.isArray(med.viasAdministracion) ? med.viasAdministracion : [])
            .map((via) => cellText(via && via.nombre))
            .filter(Boolean)
            .join(', '),
        laboratorio: cellText(med.labtitular),
        comercializado: boolText(med.comerc),
        receta: boolText(med.receta),
        cpresc_raw: cpresc,
        es_hospitalario_derivado: esHospitalario ? 'TRUE' : (med.biosimilar === true ? 'revisar' : 'FALSE'),
        criterio_hospitalario: esHospitalario
            ? "Contiene 'H' en condiciones de prescripción"
            : (med.biosimilar === true ? 'Biosimilar - requiere revisión manual' : ''),
        biosimilar: boolText(med.biosimilar),
        problema_suministro: med.psum === true ? 'True' : '',
        url_ficha_tecnica: fichaTecnica && fichaTecnica.url ? String(fichaTecnica.url) : '',
        url_prospecto: prospecto && prospecto.url ? String(prospecto.url) : '',
        fecha_extraccion: fechaExtraccion == null ? '' : String(fechaExtraccion),
        observaciones_import: ''
    };
}

export function buildCimaRows(medicamentos, fechaExtraccion) {
    const rows = [];
    const seen = new Set();
    for (const med of medicamentos || []) {
        if (!(med && med.comerc === true)) continue; // estricto: el listado 'true' (texto) no vale
        const key = String(med.nregistro);
        if (seen.has(key)) continue; // gana el primero
        seen.add(key);
        rows.push(mapMedicamento(med, fechaExtraccion));
    }
    rows.sort((a, b) =>
        a.nombre_presentacion.localeCompare(b.nombre_presentacion, 'es')
        || a.nregistro.localeCompare(b.nregistro, 'es'));
    return rows;
}

export function assertEnough(rows, min) {
    if (rows.length < min) {
        throw new Error(`solo ${rows.length} medicamentos comercializados (mínimo exigido ${min}); no se escribe el catálogo`);
    }
}

export async function fetchAllMedicamentos(fetchImpl, { pageDelayMs = 150 } = {}) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('fetchAllMedicamentos requiere una función fetch');
    }
    const resultados = [];
    for (let pagina = 1; pagina <= MAX_FETCH_PAGES; pagina++) {
        const res = await fetchImpl(`${CIMA_BASE_URL}?pagina=${pagina}`);
        if (!res || !res.ok) {
            throw new Error(`CIMA API HTTP ${res && res.status ? res.status : 'sin estado'} (página ${pagina})`);
        }
        let data;
        try {
            data = await res.json();
        } catch (err) {
            throw new Error(`CIMA API devolvió JSON inválido (página ${pagina}): ${err && err.message ? err.message : err}`);
        }
        if (!data || !Array.isArray(data.resultados)) {
            throw new Error(`CIMA API sin array "resultados" (página ${pagina})`);
        }
        if (data.resultados.length === 0) return resultados;
        resultados.push(...data.resultados);
        if (pagina < MAX_FETCH_PAGES && pageDelayMs > 0) await sleep(pageDelayMs);
    }
    throw new Error(`tope de ${MAX_FETCH_PAGES} páginas alcanzado sin agotar la paginación de CIMA`);
}

export function buildWorkbook(XLSXLib, cimaRows, localSheet) {
    const wb = XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(wb, XLSXLib.utils.json_to_sheet(cimaRows, { header: [...CIMA_COLUMNS] }), 'CATALOGO_CIMA');
    XLSXLib.utils.book_append_sheet(wb, localSheet, 'CATALOGO_LOCAL_ESPECIAL');
    return wb;
}

// XLSX.writeFile cannot save when SheetJS is loaded from vendor/ in an ES module
// ("cannot save file"), and SheetJS's own deflate is weak and closed to native
// zlib, so the workbook is repacked by hand as a standard PKZIP with node:zlib 9.
export function writeWorkbookFile(XLSXLib, wb, absPath) {
    const raw = XLSXLib.write(wb, { type: 'buffer', bookType: 'xlsx', compression: false, bookSST: true });
    fs.writeFileSync(absPath, buildXlsxZip(readXlsxParts(XLSXLib, raw)));
}

// Partes fichero del contenedor xlsx de SheetJS, en orden, con [Content_Types].xml
// el primero (estándar OPC); el nombre zip es la FullPath sin el prefijo raíz.
function readXlsxParts(XLSXLib, raw) {
    const cfb = XLSXLib.CFB.read(raw, { type: 'buffer' });
    const parts = [];
    for (let i = 0; i < cfb.FileIndex.length; i++) {
        const entry = cfb.FileIndex[i];
        if (entry.type !== 2 || !entry.content) continue;
        const fullPath = String(cfb.FullPaths[i] || '');
        const slash = fullPath.indexOf('/');
        const name = slash >= 0 ? fullPath.slice(slash + 1) : fullPath;
        if (name) parts.push({ name, data: Buffer.from(entry.content) });
    }
    const posContentTypes = parts.findIndex((part) => part.name === '[Content_Types].xml');
    if (posContentTypes > 0) parts.unshift(parts.splice(posContentTypes, 1)[0]);
    return parts;
}

// ZIP estándar PKZIP (sin ZIP64, sin cifrado): cabecera local + datos deflated por
// parte, directorio central y registro de fin; hora/fecha DOS fijas (1980-01-01)
// para que la salida sea determinista.
function buildXlsxZip(parts) {
    const chunks = [];
    const directorio = [];
    let offset = 0;
    for (const { name: nombre, data } of parts) {
        const comp = zlib.deflateRawSync(data, { level: 9 });
        const crc = zlib.crc32(data) >>> 0;
        const nombreBytes = Buffer.from(nombre, 'utf8');
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); // firma cabecera local
        local.writeUInt16LE(20, 4); // versión necesaria 2.0
        local.writeUInt16LE(0, 6); // flags
        local.writeUInt16LE(8, 8); // método: deflate
        local.writeUInt16LE(0, 10); // hora DOS fija
        local.writeUInt16LE(0x21, 12); // fecha DOS fija (1980-01-01)
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(comp.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nombreBytes.length, 26);
        local.writeUInt16LE(0, 28); // extra
        chunks.push(local, nombreBytes, comp);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); // firma directorio central
        central.writeUInt16LE(20, 4); // versión hecha
        central.writeUInt16LE(20, 6); // versión necesaria
        central.writeUInt16LE(0, 8); // flags
        central.writeUInt16LE(8, 10); // método
        central.writeUInt16LE(0, 12); // hora DOS fija
        central.writeUInt16LE(0x21, 14); // fecha DOS fija
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(comp.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nombreBytes.length, 28);
        central.writeUInt16LE(0, 30); // extra
        central.writeUInt16LE(0, 32); // comentario
        central.writeUInt16LE(0, 34); // disco inicial
        central.writeUInt16LE(0, 36); // atributos internos
        central.writeUInt32LE(0, 38); // atributos externos
        central.writeUInt32LE(offset, 42); // offset de la cabecera local
        directorio.push(central, nombreBytes);
        offset += local.length + nombreBytes.length + comp.length;
    }
    const directorioBuffer = Buffer.concat(directorio);
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0); // firma fin de directorio central
    fin.writeUInt16LE(0, 4); // este disco
    fin.writeUInt16LE(0, 6); // disco del directorio
    fin.writeUInt16LE(parts.length, 8); // entradas en este disco
    fin.writeUInt16LE(parts.length, 10); // entradas totales
    fin.writeUInt32LE(directorioBuffer.length, 12); // tamaño del directorio
    fin.writeUInt32LE(offset, 16); // offset del directorio
    fin.writeUInt16LE(0, 20); // comentario
    return Buffer.concat([...chunks, directorioBuffer, fin]);
}

export function sameCatalogIgnoringDate(rowsA, rowsB) {
    if (!Array.isArray(rowsA) || !Array.isArray(rowsB) || rowsA.length !== rowsB.length) return false;
    for (let i = 0; i < rowsA.length; i++) {
        for (const col of CIMA_COLUMNS) {
            if (col === 'fecha_extraccion') continue;
            if (cellText(rowsA[i][col]) !== cellText(rowsB[i][col])) return false;
        }
    }
    return true;
}

async function main() {
    const catalogAbs = path.resolve(ROOT, CATALOG_PATH);
    const workbookActual = XLSX.read(fs.readFileSync(catalogAbs));
    const hojaLocal = workbookActual.Sheets.CATALOGO_LOCAL_ESPECIAL;
    if (!hojaLocal) {
        throw new Error(`el catálogo ${CATALOG_PATH} no tiene la hoja CATALOGO_LOCAL_ESPECIAL`);
    }
    const filasActuales = workbookActual.Sheets.CATALOGO_CIMA
        ? XLSX.utils.sheet_to_json(workbookActual.Sheets.CATALOGO_CIMA, { defval: '' })
        : [];

    const medicamentos = await fetchAllMedicamentos(globalThis.fetch);
    const fecha = new Date().toISOString().replace('T', ' ').replace(/\..*$/, '') + ' UTC';
    const filas = buildCimaRows(medicamentos, fecha);
    assertEnough(filas, MIN_COMERCIALIZADOS);

    if (sameCatalogIgnoringDate(filasActuales, filas)) {
        console.log(`sin cambios: CATALOGO_CIMA ya coincide (${filas.length} comercializados)`);
        return;
    }

    const wb = buildWorkbook(XLSX, filas, hojaLocal);
    writeWorkbookFile(XLSX, wb, catalogAbs);
    console.log(`catálogo actualizado: ${filasActuales.length} -> ${filas.length} comercializados (${CATALOG_PATH})`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((err) => {
        console.error(err && err.message ? err.message : String(err));
        process.exit(1);
    });
}
