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

// ─── WO8.1c.2 — Tests de clasificación importación ─────────────────────────
console.log('\n[Caso D] isPharmacyAct — Farmacia');
const isPharmacyAct = sandbox.window.FarmaciaDemo.isPharmacyAct;
const isValidationRequest = sandbox.window.FarmaciaDemo.isValidationRequest;
const shouldAppearInValidationInbox = sandbox.window.FarmaciaDemo.shouldAppearInValidationInbox;

assertEqual(isPharmacyAct({ importSource: 'Excel Farmacia' }), true, 'isPharmacyAct(Excel Farmacia) = true');
assertEqual(isPharmacyAct({ importSource: 'Excel Enfermería' }), false, 'isPharmacyAct(Excel Enfermería) = false');
assertEqual(isPharmacyAct({}), false, 'isPharmacyAct(vacío) = false');

console.log('\n[Caso E] isValidationRequest');
assertEqual(isValidationRequest({ importSource: 'Excel Enfermería' }), true, 'isValidationRequest(Excel Enfermería) = true');
assertEqual(isValidationRequest({ importSource: 'Excel Farmacia' }), false, 'isValidationRequest(Excel Farmacia) = false');
assertEqual(isValidationRequest({ estado_solicitud_validacion: 'pendiente' }), true, 'isValidationRequest(pendiente explícito) = true');
assertEqual(isValidationRequest({ origen_solicitud: 'enfermeria' }), true, 'isValidationRequest(origen enfermeria) = true');

console.log('\n[Caso F] shouldAppearInValidationInbox');
// Farmacia con validación completada → NO aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Farmacia', resultado_validacion: 'validado', estado_registro: 'completado' }), false,
    'Farmacia validado+completado = false');
// Farmacia seguimiento → NO aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Farmacia', tipo_acto_fh: 'seguimiento' }), false,
    'Farmacia seguimiento = false');
// Farmacia histórico → NO aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Farmacia', estado_linea: 'historico' }), false,
    'Farmacia historico = false');
// Farmacia concomitante → NO aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Farmacia', tipo_relacion: 'concomitante' }), false,
    'Farmacia concomitante = false');
// Enfermería sin estado OK FARMACIA → NO aparece (debe tener estado explícito)
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Enfermería' }), false,
    'Enfermería sin OK FARMACIA = false');
// Enfermería con OK FARMACIA → SÍ aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Enfermería', estado_prebiologico_enfermeria: 'OK FARMACIA' }), true,
    'Enfermería OK FARMACIA = true');
// Enfermería con EN VIGILANCIA → NO aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Enfermería', estado_prebiologico_enfermeria: 'EN VIGILANCIA' }), false,
    'Enfermería EN VIGILANCIA = false');
// Enfermería con BLOQUEADO → NO aparece
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Enfermería', estado_prebiologico_enfermeria: 'BLOQUEADO' }), false,
    'Enfermería BLOQUEADO = false');
// Farmacia con pendiente explícito → SÍ aparece (caso borde)
assertEqual(shouldAppearInValidationInbox({ importSource: 'Excel Farmacia', resultado_validacion: 'pendiente', estado_registro: 'pendiente_revision' }), true,
    'Farmacia pendiente explícito = true');
// Solicitud directa pendiente → SÍ aparece
assertEqual(shouldAppearInValidationInbox({ estado_solicitud_validacion: 'pendiente' }), true,
    'Solicitud pendiente explícita = true');

console.log('\n[Caso G] Candidate Farmacia completado (no pending)');
const candidateD = buildImportedPatientCandidate(
    { cip: 'VALID-001', tipo_acto_fh: 'validacion_inicial', resultado_validacion: 'validado', estado_registro: 'completado' },
    { cip: 'cip', tipoActoFH: 'tipo_acto_fh', resultadoValidacion: 'resultado_validacion', estadoRegistro: 'estado_registro' },
    'Farmacia',
    3
);
assertEqual(candidateD.estado, 'completado', 'Farmacia validado+completado → estado=completado');
assertEqual(candidateD.estadoLabel, 'Validación registrada', 'Farmacia validacion_inicial → estadoLabel correcto');
assertEqual(candidateD.importSource, 'Excel Farmacia', 'importSource=Excel Farmacia');

console.log('\n[Caso H] Candidate Farmacia con seguimiento (no pending)');
const candidateE = buildImportedPatientCandidate(
    { cip: 'SEG-001', tipo_acto_fh: 'seguimiento' },
    { cip: 'cip', tipoActoFH: 'tipo_acto_fh' },
    'Farmacia',
    4
);
assertEqual(candidateE.estado, 'completado', 'Farmacia seguimiento → estado=completado');
assertEqual(candidateE.estadoLabel, 'Seguimiento', 'Farmacia seguimiento → estadoLabel=Seguimiento');

console.log('\n[Caso I] Candidate Enfermería (conserva estado prebiológico)');
const candidateF = buildImportedPatientCandidate(
    { cip: 'ENF-001', farmaco: 'Secukinumab', estado: 'OK FARMACIA', analitica_estado: 'OK', mantoux_estado: 'NEGATIVO' },
    { cip: 'cip', farmaco: 'farmaco' },
    'Enfermería',
    5
);
assertEqual(candidateF.estado, 'ok_farmacia', 'Enfermería OK FARMACIA → estado=ok_farmacia');
assertEqual(candidateF.estadoLabel, 'OK Farmacia', 'Enfermería OK FARMACIA → label=OK Farmacia');
assertEqual(candidateF.importSource, 'Excel Enfermería', 'importSource=Excel Enfermería');
assertEqual(candidateF.origen_solicitud, 'enfermeria', 'origen_solicitud=enfermeria');

console.log('\n[Caso M] Candidate Enfermería en vigilancia (no pending)');
const candidateM = buildImportedPatientCandidate(
    { cip: 'ENF-002', farmaco: 'Adalimumab', estado: 'EN VIGILANCIA' },
    { cip: 'cip', farmaco: 'farmaco' },
    'Enfermería',
    6
);
assertEqual(candidateM.estado, 'en_vigilancia', 'Enfermería EN VIGILANCIA → estado=en_vigilancia');
assertEqual(candidateM.estadoLabel, 'En vigilancia', 'Enfermería EN VIGILANCIA → label=En vigilancia');

console.log('\n[Caso N] Candidate Enfermería bloqueado (no pending)');
const candidateN = buildImportedPatientCandidate(
    { cip: 'ENF-003', farmaco: 'Upadacitinib', estado: 'BLOQUEADO' },
    { cip: 'cip', farmaco: 'farmaco' },
    'Enfermería',
    7
);
assertEqual(candidateN.estado, 'bloqueado', 'Enfermería BLOQUEADO → estado=bloqueado');
assertEqual(candidateN.estadoLabel, 'Bloqueado', 'Enfermería BLOQUEADO → label=Bloqueado');

console.log('\n[Caso J] Candidate Farmacia simultáneo pendiente (caso borde)');
const candidateG = buildImportedPatientCandidate(
    { cip: 'PEND-001', tipo_acto_fh: 'validacion_inicial', resultado_validacion: 'pendiente', estado_registro: 'pendiente_revision' },
    { cip: 'cip', tipoActoFH: 'tipo_acto_fh', resultadoValidacion: 'resultado_validacion', estadoRegistro: 'estado_registro' },
    'Farmacia',
    6
);
assertEqual(candidateG.estado, 'pending', 'Farmacia pendiente explícito → estado=pending');
assertEqual(candidateG.estadoLabel, 'Pendiente de revisión', 'Farmacia pendiente explícito → label correcto');

console.log('\n[Caso K] Candidate Farmacia histórico (nunca pending)');
const candidateH = buildImportedPatientCandidate(
    { cip: 'HIST-001', tipo_acto_fh: 'suspension', estado_linea: 'suspendido', fecha_fin: '2026-04-15' },
    { cip: 'cip', tipoActoFH: 'tipo_acto_fh', estadoLinea: 'estado_linea' },
    'Farmacia',
    7
);
assertEqual(candidateH.estado, 'completado', 'Farmacia histórico → estado=completado');
assertEqual(candidateH.estadoLabel, 'Histórico', 'Farmacia histórico → estadoLabel=Histórico');

console.log('\n[Caso L] Candidate Farmacia concomitante (nunca pending)');
const candidateI = buildImportedPatientCandidate(
    { cip: 'CONC-001', tipo_relacion: 'concomitante' },
    { cip: 'cip', tipoRelacion: 'tipo_relacion' },
    'Farmacia',
    8
);
assertEqual(candidateI.estado, 'completado', 'Farmacia concomitante → estado=completado');
assertEqual(candidateI.estadoLabel, 'Concomitante', 'Farmacia concomitante → label=Concomitante');

// ─── FINAL ────────────────────────────────────────────────────────────────────

console.log(`\n┌──────────────────────────────────────────────┐`);
console.log(`│ Resultados: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}   │`);
console.log(`└──────────────────────────────────────────────┘`);

if (failed > 0) {
    process.exit(1);
}
