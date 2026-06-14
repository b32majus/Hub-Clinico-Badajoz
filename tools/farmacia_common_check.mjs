#!/usr/bin/env node
// tools/farmacia_common_check.mjs
// Verifica que buildImportedPatientCandidate expone campos planos de pauta
// Ejecutar: node tools/farmacia_common_check.mjs

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
    console.log(`  ✓ ${msg}`);
    passed++;
}

function fail(msg) {
    console.log(`  ✗ ${msg}`);
    failed++;
    errors.push(msg);
}

function assertEqual(actual, expected, label) {
    if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
    else fail(`${label}: esperado "${expected}" (${typeof expected}), recibido "${JSON.stringify(actual)}" (${typeof actual})`);
}

function assertNoKey(obj, key, label) {
    if (!(key in obj)) ok(label);
    else fail(`${label}: clave "${key}" presente con valor "${JSON.stringify(obj[key])}"`);
}

// ─── Load scripts ────────────────────────────────────────────────────────────

const catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

if (!fs.existsSync(catalogPath)) {
    console.error('FATAL: scripts/farmacia_pautas_catalog.js no encontrado');
    process.exit(1);
}
if (!fs.existsSync(commonPath)) {
    console.error('FATAL: scripts/farmacia_common.js no encontrado');
    process.exit(1);
}

const catalogSrc = fs.readFileSync(catalogPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

// Minimal browser mocks for farmacia_common.js
function makeStorageMock() {
    const store = {};
    return {
        getItem: function (key) { return store[key] === undefined ? null : store[key]; },
        setItem: function (key, value) { store[key] = String(value); },
        removeItem: function (key) { delete store[key]; }
    };
}

const mockDoc = {
    addEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return {}; },
    documentElement: { style: {} },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    body: { classList: { add: function () {}, remove: function () {} } }
};

const sandbox = {
    window: {
        localStorage: makeStorageMock(),
        sessionStorage: makeStorageMock()
    },
    console: console,
    document: mockDoc,
    location: { search: '' }
};
vm.createContext(sandbox);

// Load catalog first (required by normalizePautaString)
vm.runInContext(catalogSrc, sandbox);
if (!sandbox.window.FarmaciaPautasCatalog) {
    console.error('FATAL: window.FarmaciaPautasCatalog no definido tras evaluar catalogo');
    process.exit(1);
}

// Load common
vm.runInContext(commonSrc, sandbox);
if (!sandbox.window.FarmaciaDemo || typeof sandbox.window.FarmaciaDemo.buildImportedPatientCandidate !== 'function') {
    console.error('FATAL: FarmaciaDemo.buildImportedPatientCandidate no disponible');
    process.exit(1);
}

console.log('  ✓ Catalog + Common cargados en VM sandbox');

const buildImportedPatientCandidate = sandbox.window.FarmaciaDemo.buildImportedPatientCandidate;

// ─── Caso A: pauta reconocible ───────────────────────────────────────────────
console.log('\n[Caso A] Pauta reconocible: SC / cada 4 semanas');
const candidateA = buildImportedPatientCandidate(
    { cip: 'TEST-001', pauta: 'SC / cada 4 semanas' },
    { cip: 'cip', pauta: 'pauta' },
    'Farmacia',
    0
);
assertEqual(candidateA.pauta, 'Cada 4 semanas', 'candidate.pauta normalizada');
assertEqual(candidateA.pauta_estructurada.pauta_codigo, 'CADA_4_SEMANAS', 'pauta_estructurada.pauta_codigo');
assertEqual(candidateA.pauta_codigo, 'CADA_4_SEMANAS', 'candidate.pauta_codigo');
assertEqual(candidateA.pauta_label, 'Cada 4 semanas', 'candidate.pauta_label');
assertEqual(candidateA.pauta_intervalo_dias, 28, 'candidate.pauta_intervalo_dias');
assertEqual(candidateA.pauta_unidad, 'semanas', 'candidate.pauta_unidad');
assertEqual(candidateA.pauta_otro_texto, '', 'candidate.pauta_otro_texto');

// ─── Caso B: texto libre / desconocido ───────────────────────────────────────
console.log('\n[Caso B] Texto libre: texto inventado');
const candidateB = buildImportedPatientCandidate(
    { cip: 'TEST-002', pauta: 'texto inventado' },
    { cip: 'cip', pauta: 'pauta' },
    'Farmacia',
    1
);
assertEqual(candidateB.pauta_codigo, 'OTRO', 'candidate.pauta_codigo');
assertEqual(candidateB.pauta_otro_texto, 'texto inventado', 'candidate.pauta_otro_texto');
assertEqual(candidateB.pauta_unidad, 'texto_libre', 'candidate.pauta_unidad');

// ─── Caso C: pauta vacía ─────────────────────────────────────────────────────
console.log('\n[Caso C] Pauta vacía');
const candidateC = buildImportedPatientCandidate(
    { cip: 'TEST-003', pauta: '' },
    { cip: 'cip', pauta: 'pauta' },
    'Farmacia',
    2
);
assertNoKey(candidateC, 'pauta_codigo', 'candidate no tiene pauta_codigo');
assertNoKey(candidateC, 'pauta_estructurada', 'candidate no tiene pauta_estructurada');
assertEqual(candidateC.pauta, '', 'candidate.pauta permanece vacía');

// ─── FINAL ────────────────────────────────────────────────────────────────────

console.log(`\n┌──────────────────────────────────────────────┐`);
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log(`└──────────────────────────────────────────────┘`);

if (failed > 0) {
    process.exit(1);
}
