#!/usr/bin/env node
// WO5 — Prebiológico single source of truth check
// Verifica que FarmaciaDemo.getPrebiologicoStatus delega en el helper
// y que no queda lógica clínica duplicada en farmacia_common.js
// Ejecutar: node tools/farmacia_prebiologico_single_source_check.mjs

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
    if (actual === expected) ok(`${label}: ${expected}`);
    else fail(`${label}: esperado "${expected}", recibido "${JSON.stringify(actual)}"`);
}

function assertValue(v, label) {
    if (v) ok(label);
    else fail(label);
}

function assertIncludes(str, substr, label) {
    if (str.includes(substr)) ok(`${label}: incluye "${substr}"`);
    else fail(`${label}: se esperaba "${substr}" en "${str}"`);
}

// ─── Load scripts ────────────────────────────────────────────────────────────

const prebioPath = path.join(ROOT, 'scripts/farmacia_prebiologico.js');
const commonPath = path.join(ROOT, 'scripts/farmacia_common.js');

if (!fs.existsSync(prebioPath)) {
    console.error('FATAL: scripts/farmacia_prebiologico.js no encontrado');
    process.exit(1);
}
if (!fs.existsSync(commonPath)) {
    console.error('FATAL: scripts/farmacia_common.js no encontrado');
    process.exit(1);
}

const prebioSrc = fs.readFileSync(prebioPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

// First pass: verify no legacy clinical code remains in farmacia_common.js
console.log('\n[Pre-check] Verificación de que no queda lógica clínica legacy en farmacia_common.js');

const legacyPatterns = [
    { pattern: 'evaluateAnaliticaStatus', name: 'evaluateAnaliticaStatus' },
    { pattern: 'evaluateSerologiasStatus', name: 'evaluateSerologiasStatus' },
    { pattern: 'evaluateMantouxIgraStatus', name: 'evaluateMantouxIgraStatus' },
    { pattern: 'evaluateVacunacionStatus', name: 'evaluateVacunacionStatus' },
    { pattern: 'evaluateMedicinaPreventivaStatus', name: 'evaluateMedicinaPreventivaStatus' },
    { pattern: 'function buildPrebiologicoItem', name: 'buildPrebiologicoItem' },
];

let allClean = true;
for (const item of legacyPatterns) {
    if (commonSrc.includes(item.pattern)) {
        // Exclude the export line for getPrebiologicoStatus (which is fine)
        if (item.pattern === 'evaluateAnaliticaStatus') {
            // This could appear in comments; let's check more precisely
        }
        fail(`Legacy code "${item.name}" todavía presente en farmacia_common.js`);
        allClean = false;
    }
}
if (allClean) ok('No queda lógica clínica legacy en farmacia_common.js');

// Also verify normalizeCheckString, hasMeaningfulValue, evaluateBooleanLikeCheck are gone
const helperPatterns = [
    { pattern: 'function normalizeCheckString', name: 'normalizeCheckString' },
    { pattern: 'function hasMeaningfulValue', name: 'hasMeaningfulValue' },
];
for (const item of helperPatterns) {
    if (commonSrc.includes(item.pattern)) {
        fail(`Helper duplicado "${item.name}" todavía presente en farmacia_common.js`);
        allClean = false;
    }
}
if (allClean) ok('No hay helpers duplicados en farmacia_common.js');

// ─── Load both files in VM ───────────────────────────────────────────────────

// Minimal document mock for farmacia_common.js DOMContentLoaded listener
const mockDoc = {
    addEventListener: function() {},
    getElementById: function() { return null; },
    createElement: function() { return {}; },
    documentElement: { style: {} },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    body: { classList: { add: function() {}, remove: function() {} } }
};

const sandbox = { window: {}, console: console, document: mockDoc, location: { search: '' } };
vm.createContext(sandbox);

// Load helper first (sets window.FarmaciaPrebiologico)
vm.runInContext(prebioSrc, sandbox);

if (!sandbox.window.FarmaciaPrebiologico) {
    console.error('FATAL: window.FarmaciaPrebiologico no definido tras ejecutar helper');
    process.exit(1);
}

// Now the adapter will need to check it too - let's create FarmaciaDemo namespace
// to simulate what browser would have after loading both scripts
sandbox.window.FarmaciaDemo = {};

// Load farmacia_common.js (defines FarmaciaDemo.getPrebiologicoStatus)
vm.runInContext(commonSrc, sandbox);

if (!sandbox.window.FarmaciaDemo || typeof sandbox.window.FarmaciaDemo.getPrebiologicoStatus !== 'function') {
    console.error('FATAL: FarmaciaDemo.getPrebiologicoStatus no disponible');
    process.exit(1);
}

console.log('  ✓ Helper + Common cargados en VM sandbox');

const getPrebiologicoStatus = sandbox.window.FarmaciaDemo.getPrebiologicoStatus;

// ─── CASO 1: Delegación al helper ────────────────────────────────────────────

console.log('\n[Caso 1] Delegación al helper (monkeypatch)');
const originalEvaluate = sandbox.window.FarmaciaPrebiologico.evaluatePatientPrebiologico;

// Replace with controlled mock
sandbox.window.FarmaciaPrebiologico.evaluatePatientPrebiologico = function(patient) {
    return {
        overallStatus: 'complete',
        canValidate: true,
        checks: [
            { category: 'analitica', status: 'complete', label: 'Analítica reciente', detail: '', blocking: false },
            { category: 'hemograma', status: 'complete', label: 'Hemograma', detail: '', blocking: false },
            { category: 'bioquimica', status: 'complete', label: 'Bioquímica', detail: '', blocking: false },
            { category: 'serologias', status: 'complete', label: 'Serologías VHB/VHC/VIH', detail: '', blocking: false },
            { category: 'tuberculosis', status: 'complete', label: 'Mantoux/IGRA', detail: '', blocking: false },
            { category: 'vacunacion', status: 'complete', label: 'Vacunación', detail: '', blocking: false },
            { category: 'medicinaPreventiva', status: 'complete', label: 'Medicina preventiva', detail: '', blocking: false }
        ],
        blockers: [],
        blockerLabels: [],
        summaryText: 'Prebiológico completo. Listo para validación.'
    };
};

const mockPatient = { cip: 'MOCK-1' };
const result1 = getPrebiologicoStatus(mockPatient);

assertEqual(result1.overall, 'ok', 'overall = ok (complete)');
assertEqual(result1.blocking, false, 'blocking = false');
assertValue(!!result1.items, 'items presente');
assertValue(Array.isArray(result1.missing), 'missing es array');
assertEqual(result1.missing.length, 0, 'missing vacío');
assertValue(result1.label && result1.label.length > 0, 'label presente');

// Restore
sandbox.window.FarmaciaPrebiologico.evaluatePatientPrebiologico = originalEvaluate;

// ─── CASO 2: Helper no disponible ─────────────────────────────────────────────

console.log('\n[Caso 2] Helper no disponible');

const savedHelper = sandbox.window.FarmaciaPrebiologico;
delete sandbox.window.FarmaciaPrebiologico;

const result2 = getPrebiologicoStatus({ cip: 'NO-HELPER' });
assertEqual(result2.overall, 'no_informado', 'overall = no_informado');
assertEqual(result2.blocking, true, 'blocking = true');
assertEqual(result2.missing.length, 1, '1 missing (fallback)');
assertIncludes(result2.label, 'no informado', 'label contiene "no informado"');
assertEqual(Object.keys(result2.items).length, 0, 'items vacío');

// Restore
sandbox.window.FarmaciaPrebiologico = savedHelper;

// ─── CASO 3: Paciente completo ────────────────────────────────────────────────

console.log('\n[Caso 3] Paciente completo (delegación real al helper)');

const patientComplete = {
    cip: 'COMPLETE-1',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Negativo',
        vacunacion: 'si',
    },
    medicinaPreventiva: 'revisado'
};

const result3 = getPrebiologicoStatus(patientComplete);

assertEqual(result3.overall, 'ok', 'overall = ok');
assertEqual(result3.blocking, false, 'blocking = false');
assertEqual(result3.missing.length, 0, 'missing vacío');
assertValue(Object.keys(result3.items).length > 0, 'items con datos');
assertValue(result3.label && result3.label.length > 0, 'label presente');

// Verificar items tienen las claves esperadas con mapeo tuberculosis→mantouxIgra
const itemKeys = Object.keys(result3.items);
assertValue(itemKeys.indexOf('analitica') !== -1, 'items tiene analitica');
assertValue(itemKeys.indexOf('hemograma') !== -1, 'items tiene hemograma');
assertValue(itemKeys.indexOf('mantouxIgra') !== -1, 'items tiene mantouxIgra (tuberculosis→mantouxIgra)');
assertValue(itemKeys.indexOf('vacunacion') !== -1, 'items tiene vacunacion');
assertValue(itemKeys.indexOf('medicinaPreventiva') !== -1, 'items tiene medicinaPreventiva');

// ─── CASO 4: Paciente bloqueado ───────────────────────────────────────────────

console.log('\n[Caso 4] Paciente bloqueado (serologías ausentes, pendientes)');

const patientBlocked = {
    cip: 'BLOCKED-1',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        mantoux: 'Pendiente',
        vacunacion: 'pendiente'
    }
};

const result4 = getPrebiologicoStatus(patientBlocked);

// Debe detectar que hay bloqueos
assertValue(result4.blocking === true, 'blocking = true');
assertValue(result4.missing.length > 0, 'missing con elementos');

// Verify missing includes expected blockers
const missingJoined = result4.missing.join(' ').toLowerCase();
assertValue(missingJoined.includes('serolog'), 'missing incluye Serologías');
assertValue(missingJoined.includes('medicina preventiva'), 'missing incluye Medicina preventiva');

// overall puede ser 'pendiente' o 'alerta' dependiendo de los checks
// En este caso no hay alertas, solo pendientes/no_informados
assertValue(result4.overall === 'pendiente' || result4.overall === 'no_informado' || result4.overall === 'alerta',
    'overall indica estado no-ok: ' + result4.overall);

// items debería tener todos los keys mapeados
assertValue(Object.keys(result4.items).length > 0, 'items con datos');

// ─── FINAL ────────────────────────────────────────────────────────────────────

console.log(`\n┌──────────────────────────────────────────────┐`);
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log(`└──────────────────────────────────────────────┘`);

if (failed > 0) {
    process.exit(1);
}
