#!/usr/bin/env node
/**
 * farmacia_catalogo_locales_check.mjs — los fármacos propios del hospital
 * (hoja CATALOGO_LOCAL_ESPECIAL del catálogo publicado) se sirven también en
 * un JSON pequeño para que Farmacia no tenga que bajar y leer el Excel de
 * 1,6 MB al entrar (#956, carga). Este check exige que el JSON sea copia
 * exacta de la hoja. Con `--escribir` lo regenera desde el Excel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

export const CATALOG_PATH = 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx';
export const LOCALES_PATH = 'data/catalogos/farmacia/catalogo_locales.json';
const HOJA = 'CATALOGO_LOCAL_ESPECIAL';

function esperado() {
    const wb = XLSX.read(fs.readFileSync(path.join(ROOT, CATALOG_PATH)), { sheets: HOJA });
    const hoja = wb.Sheets[HOJA];
    if (!hoja) throw new Error(`el catálogo no tiene la hoja ${HOJA}`);
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });
    return JSON.stringify({ origen: CATALOG_PATH, hoja: HOJA, filas }, null, 2) + '\n';
}

const texto = esperado();
const destino = path.join(ROOT, LOCALES_PATH);
if (process.argv.includes('--escribir')) {
    fs.writeFileSync(destino, texto);
    console.log(`escrito ${LOCALES_PATH} (${JSON.parse(texto).filas.length} fármacos propios)`);
    process.exit(0);
}
// El repositorio guarda .json con CRLF (.gitattributes): se compara sin mirar los saltos de línea.
const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') : '';
if (actual !== texto) {
    console.log(`FAIL ${LOCALES_PATH} no coincide con la hoja ${HOJA} del Excel. Regenera: node tools/farmacia_catalogo_locales_check.mjs --escribir`);
    process.exit(1);
}
console.log(`PASS ${LOCALES_PATH} coincide con la hoja ${HOJA} (${JSON.parse(texto).filas.length} fármacos propios)`);
