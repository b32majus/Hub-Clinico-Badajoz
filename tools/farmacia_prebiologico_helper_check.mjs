#!/usr/bin/env node
// WO-032-lite FASE B — Prebiológico helper check
// Ejecutar: node tools/farmacia_prebiologico_helper_check.mjs

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
    else fail(`${label}: esperado "${expected}", recibido "${actual}"`);
}

function assertValue(v, label) {
    if (v) ok(label);
    else fail(label);
}

// ─── Load the helper ───────────────────────────────────────────────────────────

const srcPath = path.join(ROOT, 'scripts/farmacia_prebiologico.js');
if (!fs.existsSync(srcPath)) {
    console.error('FATAL: scripts/farmacia_prebiologico.js no encontrado');
    process.exit(1);
}
const src = fs.readFileSync(srcPath, 'utf8');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

if (!sandbox.window.FarmaciaPrebiologico) {
    console.error('FATAL: window.FarmaciaPrebiologico no definido tras ejecutar helper');
    process.exit(1);
}

const evaluatePatientPrebiologico = sandbox.window.FarmaciaPrebiologico.evaluatePatientPrebiologico;
if (typeof evaluatePatientPrebiologico !== 'function') {
    console.error('FATAL: evaluatePatientPrebiologico no es una función');
    process.exit(1);
}

console.log('  ✓ Helper loaded via vm sandbox');

// ─── TEST A: Complete patient ──────────────────────────────────────────────────

console.log('\n[Test A] Paciente completo (todos los campos OK)');
const patientA = {
    cip: 'DEMO-A',
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

const resultA = evaluatePatientPrebiologico(patientA);
assertEqual(resultA.overallStatus, 'complete', 'overallStatus');
assertValue(resultA.canValidate === true, 'canValidate = true');
assertValue(resultA.blockers.length === 0, '0 bloqueos');
assertValue(Array.isArray(resultA.checks) && resultA.checks.length === 7, '7 checks');
assertValue(resultA.summaryText && resultA.summaryText.length > 0, 'summaryText presente');

// ─── TEST B: Incomplete patient ────────────────────────────────────────────────

console.log('\n[Test B] Paciente incompleto (serologías ausentes, pendientes)');
const patientB = {
    cip: 'DEMO-B',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        mantoux: 'Pendiente',
        vacunacion: 'pendiente'
    }
};

const resultB = evaluatePatientPrebiologico(patientB);
assertEqual(resultB.overallStatus, 'blocked', 'overallStatus');
assertValue(resultB.canValidate === false, 'canValidate = false');
assertValue(resultB.blockers.length > 0, `bloqueos presentes: ${resultB.blockers.length}`);

const bBlockerLabels = resultB.blockers.join(' ').toLowerCase();
assertValue(bBlockerLabels.includes('serolog'), 'bloqueo: Serologías');
assertValue(bBlockerLabels.includes('medicina preventiva'), 'bloqueo: Medicina preventiva');
assertValue(Array.isArray(resultB.checks) && resultB.checks.length === 7, '7 checks');

// ─── TEST C: No-data patient ───────────────────────────────────────────────────

console.log('\n[Test C] Paciente sin datos (analiticaEstruct = null)');
const patientC = {
    cip: 'DEMO-C',
    analiticaEstruct: null,
    analitica: ''
};

const resultC = evaluatePatientPrebiologico(patientC);
assertEqual(resultC.overallStatus, 'blocked', 'overallStatus');
assertValue(resultC.canValidate === false, 'canValidate = false');
assertEqual(resultC.blockers.length, 7, '7 bloqueos');

if (resultC.checks && Array.isArray(resultC.checks)) {
    assertEqual(resultC.checks.length, 7, '7 checks');
    const allUnknown = resultC.checks.every(function (c) { return c.status === 'unknown'; });
    assertValue(allUnknown, 'todos los checks son unknown');
    const allBlocking = resultC.checks.every(function (c) { return c.blocking === true; });
    assertValue(allBlocking, 'todos los checks son blocking');
} else {
    fail('checks ausente o no es array');
}

// ─── TEST D: FH-004 real data ──────────────────────────────────────────────────

console.log('\n[Test D] Paciente FH-004 (sin analiticaEstruct, con biologicos)');
const patientD = {
    cip: 'CIP-DEMO-FH-004',
    nombre: 'Paciente Demo FH-004',
    edad: '44',
    sexo: 'Mujer',
    servicio: 'Reumatología',
    patologia: 'LES / Síndrome de Sjögren',
    farmaco: 'Belimumab + Rituximab (demo multibiológico)',
    estado: 'followup',
    analitica: 'Seguimiento analítico activo. Caso sintético multibiológico para validación exploratoria.',
    biologicos: [
        {
            linea_id: 'BIO-FH-004-L1',
            orden: 1,
            nombre_linea: 'Abatacept',
            principio_activo: 'Abatacept',
            dosis: '125 mg',
            via: 'SC',
            estado_linea: 'historico',
        },
        {
            linea_id: 'BIO-FH-004-L2',
            orden: 2,
            nombre_linea: 'Belimumab',
            principio_activo: 'Belimumab',
            dosis: '200 mg',
            via: 'SC',
            estado_linea: 'activo',
        },
        {
            linea_id: 'BIO-FH-004-L3',
            orden: 3,
            nombre_linea: 'Rituximab',
            principio_activo: 'Rituximab',
            dosis: '1 g',
            via: 'IV',
            estado_linea: 'añadido',
        }
    ]
};

let resultD = null;
let crashed = false;
try {
    resultD = evaluatePatientPrebiologico(patientD);
} catch (e) {
    crashed = true;
    fail('Crash al evaluar FH-004: ' + e.message);
}

if (!crashed) {
    ok('Sin crash al evaluar FH-004');
}

if (resultD) {
    const blockedOrIncomplete = resultD.overallStatus === 'blocked' || resultD.overallStatus === 'incomplete';
    assertValue(blockedOrIncomplete, 'overallStatus bloqueado o incompleto: ' + resultD.overallStatus);
    assertValue(resultD.canValidate === false, 'canValidate = false');
    assertValue(Array.isArray(resultD.checks) && resultD.checks.length === 7, '7 checks');
    assertValue(resultD.blockers.length > 0, `bloqueos: ${resultD.blockers.length}`);
} else if (!crashed) {
    fail('resultD es null/undefined sin crash');
}

// ─── SUMMARY ───────────────────────────────────────────────────────────────────

const totalCases = 4;
console.log('\n' + '═'.repeat(60));
console.log(`RESULTADO: ${passed} OK / ${failed} FALLIDO  — ${failed === 0 ? totalCases : passed} / ${totalCases} PASS`);
if (failed === 0) {
    console.log('✓ Helper check PASSED');
} else {
    console.log('✗ Helper check FAILED');
    console.log('\nErrores:');
    for (const e of errors) console.log('  - ' + e);
    process.exit(1);
}
