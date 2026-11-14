#!/usr/bin/env node
/**
 * farmacia_cima_trim_check.mjs — #947: los valores del catálogo CIMA no deben llevar
 * espacios al principio ni al final. Datos sintéticos.
 *  1. FarmaciaCatalog.loadFromExcel recorta los textos de CATALOGO_CIMA.
 *  2. mapMedicamento (actualizador mensual) deja los textos recortados.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

let passed = 0;
let failed = 0;
async function test(name, fn) {
    try { await fn(); passed++; console.log(`  ok  ${name}`); }
    catch (err) { failed++; console.log(`  FAIL ${name}\n       ${err && err.message ? err.message : err}`); }
}

function makeStorage() {
    const store = {};
    return {
        getItem: (k) => (store[k] === undefined ? null : store[k]),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
    };
}
const doc = {
    addEventListener() {}, getElementById: () => null, createElement: () => ({}),
    documentElement: { style: {} }, querySelector: () => null, querySelectorAll: () => [],
    body: { classList: { add() {}, remove() {} } }
};
const sandbox = {
    window: { localStorage: makeStorage(), sessionStorage: makeStorage(), XLSX },
    sessionStorage: makeStorage(), console, document: doc, location: { search: '' }, XLSX
};
vm.createContext(sandbox);
for (const f of ['scripts/farmacia_pautas_catalog.js', 'scripts/farmacia_common.js']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox);
}

console.log('farmacia_cima_trim_check');

await test('1. loadFromExcel recorta principio_activo, dosis, forma y nombres de CATALOGO_CIMA', () => {
    const cima = XLSX.utils.json_to_sheet([{
        drug_source_id: '90001', codigo_nacional: '', nregistro: '90001',
        nombre_presentacion: ' FARMACO PRUEBA 10 MG ', nombre_comercial: ' FARMACO PRUEBA ',
        principio_activo: 'SECUKINUMAB ', forma_farmaceutica: ' COMPRIMIDO', dosis_presentacion: '10 mg ',
        via: 'VÍA ORAL ', es_hospitalario_derivado: 'TRUE', biosimilar: 'FALSE'
    }]);
    const local = XLSX.utils.json_to_sheet([{ display_name: 'Local sintético', principio_activo_o_molecula: 'X' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, cima, 'CATALOGO_CIMA');
    XLSX.utils.book_append_sheet(wb, local, 'CATALOGO_LOCAL_ESPECIAL');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    sandbox.window.FarmaciaCatalog.loadFromExcel(buf);
    const d = sandbox.window.FarmaciaCatalog.drugs[0];
    assert.equal(d.principio_activo, 'SECUKINUMAB');
    assert.equal(d.dosis, '10 mg');
    assert.equal(d.forma_farmaceutica, 'COMPRIMIDO');
    assert.equal(d.nombre_comercial, 'FARMACO PRUEBA');
    assert.equal(d.nombre_presentacion, 'FARMACO PRUEBA 10 MG');
    assert.equal(d.via, 'VÍA ORAL');
    assert.equal(d.drug_id, '90001', 'el id sigue siendo el nregistro');
});

await test('2. mapMedicamento recorta los textos que vienen de la API', async () => {
    const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'update_cima_catalog.mjs')).href);
    const row = mod.mapMedicamento({
        nregistro: '90002', nombre: ' FARMACO PRUEBA 10 MG ', labtitular: 'Lab ',
        cpresc: 'Medicamento Uso Hospitalario ', comerc: true, receta: true, biosimilar: false,
        viasAdministracion: [{ nombre: ' VÍA ORAL ' }], formaFarmaceutica: { nombre: ' COMPRIMIDO ' },
        vtm: { nombre: ' farmacoprueba ' }, dosis: ' 10 mg '
    }, '2026-12-01 03:00:00 UTC');
    for (const col of ['nombre_presentacion', 'nombre_comercial', 'principio_activo', 'forma_farmaceutica',
        'dosis_presentacion', 'via', 'laboratorio', 'cpresc_raw']) {
        assert.equal(row[col], String(row[col]).trim(), `${col} lleva espacios: "${row[col]}"`);
    }
    assert.equal(row.principio_activo, 'FARMACOPRUEBA');
    assert.equal(row.dosis_presentacion, '10 mg');
});

await test('3. mapMedicamento: la forma de los valores sin espacios no cambia', async () => {
    const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'update_cima_catalog.mjs')).href);
    const row = mod.mapMedicamento({
        nregistro: '90003', nombre: 'A B', cpresc: 'X', comerc: true, vtm: { nombre: 'a + b' }, dosis: '5 mg'
    }, 'f');
    assert.equal(row.principio_activo, 'A, B');
    assert.equal(row.nombre_comercial, 'A B');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
