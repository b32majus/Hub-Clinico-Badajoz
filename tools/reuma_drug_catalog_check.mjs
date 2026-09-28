#!/usr/bin/env node
'use strict';
/**
 * Deterministic oracle for the non-inferring drug catalogue seam
 * (SIL-REV-016 / ticket #444, T2 of TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06).
 *
 * Loads the real, unmodified `modules/drugCatalog.js` in a vm sandbox together
 * with the real published catalogue file and asserts the frozen contract:
 *   1. the published catalogue is the source actually parsed (CIMA + local);
 *   2. search works by fragment, case and accents, and by active ingredient;
 *   3. a search result exposes ONLY identity (id/name) — never dose, route,
 *      schedule, presentation, induction, duration, therapeutic line,
 *      switch/add-on, renewal or validation data;
 *   4. without a loaded catalogue `search()` returns nothing (fail safe, no
 *      invented options);
 *   5. a catalogue missing the expected sheets is rejected, not silently
 *      accepted.
 *
 * Synthetic-only. Exit code 0 = all cases PASS, 1 = at least one FAIL.
 * Usage: node tools/reuma_drug_catalog_check.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const MODULE_FILE = path.join(ROOT, 'modules', 'drugCatalog.js');
const CATALOG_FILE = path.join(ROOT, 'data', 'catalogos', 'farmacia', 'hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx');

const results = [];
function record(name, fn) {
    try {
        fn();
        results.push(true);
        console.log(`  [OK  ] ${name}`);
    } catch (err) {
        results.push(false);
        console.log(`  [FAIL] ${name} -> ${err.message}`);
    }
}

function newSandbox() {
    const sandbox = { HubTools: { catalog: {} }, console, XLSX };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(MODULE_FILE, 'utf8'), sandbox, { filename: 'modules/drugCatalog.js' });
    return sandbox.HubTools.catalog;
}

// A fresh, untouched adapter never auto-loads (no document in the sandbox).
const emptyCatalog = newSandbox();

console.log('1. Fail-safe without a loaded catalogue');
record('search() returns nothing before a catalogue is loaded', () => {
    assert.equal(emptyCatalog.search('cosentyx').length, 0);
});
record('getState() reports not ready / no invented total', () => {
    const state = emptyCatalog.getState();
    assert.equal(state.ready, false);
    assert.equal(state.total, 0);
    assert.equal(state.cima, 0);
    assert.equal(state.local, 0);
});

console.log('2. Published catalogue is parsed from the real file');
const catalog = newSandbox();
const workbook = XLSX.read(fs.readFileSync(CATALOG_FILE), { type: 'buffer' });
const loaded = catalog.loadFromWorkbook(workbook);
record('CIMA rows are loaded from the published file', () => {
    assert.ok(loaded.cima > 3000, `cima=${loaded.cima}`);
});
record('local-special rows are loaded from the published file', () => {
    assert.ok(loaded.local >= 1, `local=${loaded.local}`);
});
record('total equals cima + local', () => {
    assert.equal(loaded.total, loaded.cima + loaded.local);
});
record('getState() is ready after load', () => {
    const state = catalog.getState();
    assert.equal(state.ready, true);
    assert.equal(state.state, 'loaded');
    assert.equal(state.total, loaded.total);
});

console.log('3. Search by fragment, case, accents and active ingredient');
const THERAPEUTIC_KEY = /(dosis|dose|via|route|pauta|frecuencia|schedule|presentacion|presentation|induccion|induction|duracion|duration|linea|line|switch|addon|add_on|renovacion|renewal|validacion|validation)/i;

function assertOnlyIdentity(query) {
    const hits = catalog.search(query);
    assert.ok(hits.length > 0, `sin resultados para '${query}'`);
    hits.forEach((hit) => {
        assert.deepEqual(Object.keys(hit).sort(), ['id', 'name'], `claves inesperadas: ${Object.keys(hit).join(',')}`);
        Object.keys(hit).forEach((key) => {
            assert.ok(!THERAPEUTIC_KEY.test(key), `clave terapéutica expuesta: ${key}`);
        });
        assert.equal(typeof hit.id, 'string');
        assert.ok(hit.id.length > 0);
        assert.equal(typeof hit.name, 'string');
        assert.ok(hit.name.length > 0);
    });
    return hits;
}

record("fragment 'cosentyx' (minúsculas) encuentra COSENTYX", () => {
    const hits = assertOnlyIdentity('cosentyx');
    assert.ok(hits.some((hit) => hit.name.toUpperCase().includes('COSENTYX')), JSON.stringify(hits.slice(0, 3)));
});
record("fragment 'COSENTYX' (mayúsculas) obtiene el mismo conjunto", () => {
    const lower = catalog.search('cosentyx').map((hit) => hit.id).sort();
    const upper = catalog.search('COSENTYX').map((hit) => hit.id).sort();
    assert.deepEqual(upper, lower);
});
record("búsqueda sin acento 'solucion' encuentra nombres con 'SOLUCIÓN'", () => {
    const hits = assertOnlyIdentity('solucion');
    assert.ok(hits.some((hit) => hit.name.includes('SOLUCIÓN')), JSON.stringify(hits.slice(0, 2)));
});
record("la búsqueda con acento 'ácido' normaliza igual que sin acento", () => {
    const withAccent = catalog.search('ácido').map((hit) => hit.id).sort();
    const withoutAccent = catalog.search('acido').map((hit) => hit.id).sort();
    assert.ok(withoutAccent.length > 0, 'sin resultados para acido');
    assert.deepEqual(withAccent, withoutAccent);
});
record('la búsqueda respeta el mínimo de caracteres', () => {
    assert.equal(catalog.search('c').length, 0);
    assert.equal(catalog.search('  ').length, 0);
});
record("principio activo 'secukinumab' encuentra la marca COSENTYX", () => {
    const hits = assertOnlyIdentity('secukinumab');
    assert.ok(hits.some((hit) => hit.name.toUpperCase().includes('COSENTYX')), JSON.stringify(hits.slice(0, 3)));
});

console.log('4. The adapter never exposes therapeutic fields');
record('ningún resultado expone dosis/vía/pauta/presentación/...', () => {
    ['humira', 'metotrexato', 'adalimumab', 'cosentyx', 'solucion'].forEach(assertOnlyIdentity);
});

console.log('5. A malformed catalogue is rejected, not silently accepted');
record('parseWorkbook rechaza hojas esperadas ausentes', () => {
    const bad = { Sheets: { OTRA: {} } };
    assert.throws(() => catalog.parseWorkbook(bad), /faltan las hojas/i);
});
record('loadFromWorkbook rechaza un workbook inválido sin dejar estado cargado', () => {
    const isolated = newSandbox();
    assert.throws(() => isolated.loadFromWorkbook({}), /workbook inválido/i);
    assert.equal(isolated.getState().ready, false);
    assert.equal(isolated.search('humira').length, 0);
});

const passed = results.filter(Boolean).length;
const total = results.length;
console.log(`\nRESULTADO: ${passed} OK / ${total - passed} FALLIDO`);
if (passed !== total) {
    console.log('reuma_drug_catalog_check FAILED');
    process.exit(1);
}
console.log('reuma_drug_catalog_check PASS');
