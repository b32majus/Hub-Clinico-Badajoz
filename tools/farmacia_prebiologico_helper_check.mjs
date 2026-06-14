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

const bBlockerLabels = (resultB.blockerLabels || resultB.blockers.map(b => b.label + ": " + b.status)).join(' ').toLowerCase();
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

// ─── TEST T1: pending bloquea (Mantoux=Pendiente) ──────────────────────────────

console.log('\n[Test T1] Mantoux pendiente bloquea la validación');
const patientT1 = {
    cip: 'DEMO-T1',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Pendiente',
        vacunacion: 'si'
    }
};

const resultT1 = evaluatePatientPrebiologico(patientT1);
assertEqual(resultT1.overallStatus, 'blocked', 'overallStatus');
assertValue(resultT1.canValidate === false, 'canValidate = false');

const tbCheckT1 = resultT1.checks.find(function (c) { return c.category === 'tuberculosis'; });
if (tbCheckT1) {
    assertEqual(tbCheckT1.status, 'pending', 'tuberculosis status');
    assertValue(tbCheckT1.blocking === true, 'tuberculosis blocking = true');
} else {
    fail('check tuberculosis no encontrado');
}

const t1BlockerLabels = (resultT1.blockerLabels || resultT1.blockers.map(b => b.label + ": " + b.status));
assertValue(t1BlockerLabels.some(function (l) { return l.toLowerCase().includes('mantoux/igra: pending'); }), 'blockerLabels incluye Mantoux/IGRA: pending');

// ─── TEST T2: Vacunación pendiente bloquea ─────────────────────────────────────

console.log('\n[Test T2] Vacunación pendiente bloquea la validación');
const patientT2 = {
    cip: 'DEMO-T2',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Negativo',
        vacunacion: { ok: false, pendientes: ['gripe', 'neumococo'] }
    }
};

const resultT2 = evaluatePatientPrebiologico(patientT2);
assertEqual(resultT2.overallStatus, 'blocked', 'overallStatus');
assertValue(resultT2.canValidate === false, 'canValidate = false');

const vacCheckT2 = resultT2.checks.find(function (c) { return c.category === 'vacunacion'; });
if (vacCheckT2) {
    assertEqual(vacCheckT2.status, 'pending', 'vacunacion status');
    assertValue(vacCheckT2.blocking === true, 'vacunacion blocking = true');
} else {
    fail('check vacunacion no encontrado');
}

const t2BlockerLabels = (resultT2.blockerLabels || resultT2.blockers.map(b => b.label + ": " + b.status));
assertValue(t2BlockerLabels.some(function (l) { return l.toLowerCase().includes('vacunación: pending'); }), 'blockerLabels incluye Vacunación: pending');

// ─── TEST T3: Vacunación OK no bloquea ─────────────────────────────────────────

console.log('\n[Test T3] Vacunación OK no bloquea (otro campo pendiente bloquea)');
const patientT3 = {
    cip: 'DEMO-T3',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Pendiente',
        vacunacion: { ok: true, pendientes: [] }
    },
    medicinaPreventiva: 'revisado'
};

const resultT3 = evaluatePatientPrebiologico(patientT3);
assertEqual(resultT3.overallStatus, 'blocked', 'overallStatus');
assertValue(resultT3.canValidate === false, 'canValidate = false');

const vacCheckT3 = resultT3.checks.find(function (c) { return c.category === 'vacunacion'; });
if (vacCheckT3) {
    assertEqual(vacCheckT3.status, 'complete', 'vacunacion status');
    assertValue(vacCheckT3.blocking === false, 'vacunacion blocking = false');
} else {
    fail('check vacunacion no encontrado');
}

const t3BlockerLabels = (resultT3.blockerLabels || resultT3.blockers.map(b => b.label + ": " + b.status)).join(' ').toLowerCase();
assertValue(!t3BlockerLabels.includes('vacun'), 'blockers NO incluye vacunacion');

// ─── TEST T4: IGRA alias pendiente bloquea ─────────────────────────────────────

console.log('\n[Test T4] IGRA alias pendiente bloquea la validación');
const patientT4 = {
    cip: 'DEMO-T4',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        igra: 'Pendiente',
        vacunacion: 'si'
    }
};

const resultT4 = evaluatePatientPrebiologico(patientT4);
const tbCheckT4 = resultT4.checks.find(function (c) { return c.category === 'tuberculosis'; });
if (tbCheckT4) {
    assertEqual(tbCheckT4.status, 'pending', 'tuberculosis status');
    assertValue(tbCheckT4.blocking === true, 'tuberculosis blocking = true');
} else {
    fail('check tuberculosis no encontrado');
}

const t4BlockerLabels = (resultT4.blockerLabels || resultT4.blockers.map(b => b.label + ": " + b.status));
assertValue(t4BlockerLabels.some(function (l) { return l.toLowerCase().includes('mantoux/igra: pending'); }), 'blockerLabels incluye Mantoux/IGRA: pending');

// ─── TEST T5: alerta no se diluye ──────────────────────────────────────────────

console.log('\n[Test T5] Serología reactiva genera alerta y bloquea');
const patientT5 = {
    cip: 'DEMO-T5',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Reactivo'
    }
};

const resultT5 = evaluatePatientPrebiologico(patientT5);
const serCheckT5 = resultT5.checks.find(function (c) { return c.category === 'serologias'; });
if (serCheckT5) {
    assertEqual(serCheckT5.status, 'alert', 'serologias status');
    assertValue(serCheckT5.blocking === true, 'serologias blocking = true');
} else {
    fail('check serologias no encontrado');
}

// mapStatus es interno; la comprobación de status 'alert' arriba es suficiente

// ─── TEST T6: No mutación del paciente ─────────────────────────────────────────

console.log('\n[Test T6] El objeto paciente original no se muta');
const patientT6 = {
    cip: 'DEMO-T6',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Negativo',
        vacunacion: 'si'
    },
    medicinaPreventiva: 'revisado'
};

const patientT6Before = JSON.stringify(patientT6);
evaluatePatientPrebiologico(patientT6);
const patientT6After = JSON.stringify(patientT6);
assertEqual(patientT6After, patientT6Before, 'paciente original no modificado');

// ─── TEST T7: TB alerta prevalece (mantoux=Positivo, igra=Negativo) ────────────

console.log('\n[Test T7] TB alerta prevalece sobre alias negativo');
const patientT7 = {
    cip: 'DEMO-T7',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Positivo',
        igra: 'Negativo',
        vacunacion: 'si'
    }
};
const resultT7 = evaluatePatientPrebiologico(patientT7);
assertEqual(resultT7.overallStatus, 'blocked', 'overallStatus');
const tbCheckT7 = resultT7.checks.find(function (c) { return c.category === 'tuberculosis'; });
if (tbCheckT7) {
    assertEqual(tbCheckT7.status, 'alert', 'tuberculosis status');
    assertValue(tbCheckT7.blocking === true, 'tuberculosis blocking = true');
} else {
    fail('check tuberculosis no encontrado');
}

// ─── TEST T8: TB pendiente prevalece (mantoux=Pendiente, igra=Negativo) ────────

console.log('\n[Test T8] TB pendiente prevalece sobre alias negativo');
const patientT8 = {
    cip: 'DEMO-T8',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: 'Negativo',
        serologiasVih: 'Negativo',
        mantoux: 'Pendiente',
        igra: 'Negativo',
        vacunacion: 'si'
    }
};
const resultT8 = evaluatePatientPrebiologico(patientT8);
assertEqual(resultT8.overallStatus, 'blocked', 'overallStatus');
const tbCheckT8 = resultT8.checks.find(function (c) { return c.category === 'tuberculosis'; });
if (tbCheckT8) {
    assertEqual(tbCheckT8.status, 'pending', 'tuberculosis status');
    assertValue(tbCheckT8.blocking === true, 'tuberculosis blocking = true');
} else {
    fail('check tuberculosis no encontrado');
}

// ─── TEST T9: Serología parcial reactiva (VHB=Reactivo, VHC="", VIH="") ────────

console.log('\n[Test T9] Serología parcial reactiva no se oculta');
const patientT9 = {
    cip: 'DEMO-T9',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Reactivo',
        serologiasVhc: '',
        serologiasVih: '',
        mantoux: 'Negativo',
        vacunacion: 'si'
    }
};
const resultT9 = evaluatePatientPrebiologico(patientT9);
assertEqual(resultT9.overallStatus, 'blocked', 'overallStatus');
const serCheckT9 = resultT9.checks.find(function (c) { return c.category === 'serologias'; });
if (serCheckT9) {
    assertEqual(serCheckT9.status, 'alert', 'serologias status');
    assertValue(serCheckT9.blocking === true, 'serologias blocking = true');
} else {
    fail('check serologias no encontrado');
}

// ─── TEST T10: Serología parcial pendiente (VHB=Pendiente, VHC="", VIH="") ─────

console.log('\n[Test T10] Serología parcial pendiente no se oculta');
const patientT10 = {
    cip: 'DEMO-T10',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Pendiente',
        serologiasVhc: '',
        serologiasVih: '',
        mantoux: 'Negativo',
        vacunacion: 'si'
    }
};
const resultT10 = evaluatePatientPrebiologico(patientT10);
assertEqual(resultT10.overallStatus, 'blocked', 'overallStatus');
const serCheckT10 = resultT10.checks.find(function (c) { return c.category === 'serologias'; });
if (serCheckT10) {
    assertEqual(serCheckT10.status, 'pending', 'serologias status');
    assertValue(serCheckT10.blocking === true, 'serologias blocking = true');
} else {
    fail('check serologias no encontrado');
}

// ─── TEST T11: Serologías parciales negativas sin 3 campos → unknown ───────────

console.log('\n[Test T11] Serologías parciales negativas sin 3 campos → unknown');
const patientT11 = {
    cip: 'DEMO-T11',
    analiticaEstruct: {
        reciente: 'si',
        hemograma: true,
        bioquimica: true,
        serologiasVhb: 'Negativo',
        serologiasVhc: '',
        serologiasVih: '',
        mantoux: 'Negativo',
        vacunacion: 'si'
    }
};
const resultT11 = evaluatePatientPrebiologico(patientT11);
assertEqual(resultT11.overallStatus, 'blocked', 'overallStatus');
const serCheckT11 = resultT11.checks.find(function (c) { return c.category === 'serologias'; });
if (serCheckT11) {
    assertEqual(serCheckT11.status, 'unknown', 'serologias status');
    assertValue(serCheckT11.blocking === true, 'serologias blocking = true');
} else {
    fail('check serologias no encontrado');
}

// ─── SUMMARY ───────────────────────────────────────────────────────────────────

const totalCases = 15;
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
