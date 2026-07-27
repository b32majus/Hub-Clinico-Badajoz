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
        removeItem: function (key) { delete store[key]; },
        dump: function () { return { ...store }; }
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

const sessionStorage = makeStorageMock();
const sandbox = {
    window: {
        localStorage: makeStorageMock(),
        sessionStorage: sessionStorage
    },
    sessionStorage: sessionStorage,
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

console.log('\n[Patient context switch policy]');
const resolvePatientContextSwitch = sandbox.window.FarmaciaDemo.resolvePatientContextSwitch;
assertEqual(typeof resolvePatientContextSwitch, 'function', 'shared switch policy is exposed');
if (typeof resolvePatientContextSwitch === 'function') {
    assertEqual(resolvePatientContextSwitch(' cip-a ', 'CIP-A', true).action, 'same', 'normalized same CIP is non-destructive');
    assertEqual(resolvePatientContextSwitch('CIP-A', 'CIP-B', true).action, 'confirm', 'different CIP with context asks for confirmation');
    assertEqual(resolvePatientContextSwitch('CIP-A', 'CIP-B', true, false).action, 'cancel', 'cancelled switch preserves context');
    assertEqual(resolvePatientContextSwitch('CIP-A', 'CIP-B', true, true).action, 'switch', 'confirmed switch replaces context');
    assertEqual(resolvePatientContextSwitch('', 'CIP-B', false).action, 'switch', 'clean screen loads without confirmation');
}

console.log('\n[Contextual catalog proposal registry]');
const catalogApi = sandbox.window.FarmaciaCatalog;
const cimaRowsWithoutNativeId = [{
    drug_source_id: '', codigo_nacional: '700001', nregistro: 'SYN/CIMA/1',
    nombre_comercial: 'Producto CIMA visible', principio_activo: 'Activo CIMA sintético',
    nombre_presentacion: '150 mg pluma', dosis_presentacion: '150 mg', via: 'SC',
    forma_farmaceutica: 'Solución inyectable'
}, {
    drug_source_id: 'CIMA-NATIVE-SYN', codigo_nacional: '700002',
    nombre_comercial: 'Producto CIMA con ID', principio_activo: 'Activo CIMA B',
    nombre_presentacion: '50 mg vial', dosis_presentacion: '50 mg', via: 'IV'
}];
const localRowsWithoutNativeId = [{
    local_drug_id: '', display_name: 'Producto local visible', principio_activo_o_molecula: 'Activo local sintético',
    presentacion_texto: '25 mg vial', dosis_texto: '25 mg', via: 'IV', tipo_situacion: 'Sintética'
}, {
    local_drug_id: '', display_name: 'Entrada local manual incompleta', principio_activo_o_molecula: 'Activo sin presentación'
}];
sandbox.XLSX = {
    read: function () {
        return { Sheets: { CATALOGO_CIMA: { rows: cimaRowsWithoutNativeId }, CATALOGO_LOCAL_ESPECIAL: { rows: localRowsWithoutNativeId } } };
    },
    utils: { sheet_to_json: function (sheet) { return sheet.rows; } }
};
catalogApi.loadFromExcel(new ArrayBuffer(0));
const firstGeneratedIds = catalogApi.drugs.map(function (drug) { return drug.drug_id; });
assertEqual(firstGeneratedIds[0].startsWith('CIMA-AUTO-'), true, 'CIMA row without native source ID receives fallback ID');
assertEqual(firstGeneratedIds[1], 'CIMA-NATIVE-SYN', 'CIMA native source ID remains preferred');
assertEqual(firstGeneratedIds[2].startsWith('LOCAL-AUTO-'), true, 'LOCAL row without native source ID receives fallback ID');
catalogApi.loadFromExcel(new ArrayBuffer(0));
assertEqual(catalogApi.drugs[0].drug_id, firstGeneratedIds[0], 'CIMA fallback ID is stable across normalization');
assertEqual(catalogApi.drugs[2].drug_id, firstGeneratedIds[2], 'LOCAL fallback ID is stable across normalization');
const normalizedConcreteCima = catalogApi.drugs[0];
assertEqual(catalogApi.isConcreteCatalogSelection(normalizedConcreteCima), true, 'normalized visible CIMA presentation is selectable');
assertEqual(catalogApi.search('Producto CIMA visible')[0].drug_id, normalizedConcreteCima.drug_id, 'catalog search matches brand');
assertEqual(catalogApi.search('Activo CIMA sintético')[0].drug_id, normalizedConcreteCima.drug_id, 'catalog search matches active ingredient');
assertEqual(catalogApi.search('150 mg pluma')[0].drug_id, normalizedConcreteCima.drug_id, 'catalog search matches presentation');
assertEqual(catalogApi.search('700001')[0].drug_id, normalizedConcreteCima.drug_id, 'catalog search matches national code');
assertEqual(catalogApi.reconcileCatalogSelection({}, null, { source_type: 'CIMA', via: 'VÍA SUBCUTÁNEA' }).values.via, 'SC', 'prefixed CIMA subcutaneous route normalizes to SC');
assertEqual(catalogApi.mapCatalogViaToSelect('VÍA INTRAMUSCULAR'), 'IM', 'prefixed intramuscular route is select-representable');
assertEqual(catalogApi.mapCatalogViaToSelect('VÍA TRANSDÉRMICA'), 'Otra', 'unknown prefixed route maps to Otra');
const selectedDrug = {
    drug_id: 'CIMA-SYN-1', source_type: 'CIMA', nombre_comercial: 'Producto sintético A',
    principio_activo: 'Molécula sintética A', nombre_presentacion: '100 mg jeringa',
    dosis: '100 mg', via: 'SC', codigo_nacional: '100001', nregistro: 'SYN/1'
};
assertEqual(catalogApi.buildCatalogProposalForSlot('validacion.solicitado', selectedDrug).dosis_texto, '100 mg', 'requested validation receives regulatory concentration only');
assertEqual(Object.hasOwn(catalogApi.buildCatalogProposalForSlot('validacion.solicitado', selectedDrug), 'presentacion'), false, 'requested validation does not receive full presentation');
assertEqual(catalogApi.buildCatalogProposalForSlot('validacion.validado', selectedDrug).presentacion, '100 mg jeringa', 'validated treatment receives concrete presentation');
assertEqual(catalogApi.buildCatalogProposalForSlot('primera_visita.tratamiento', selectedDrug).dosis_texto, '100 mg jeringa', 'first visit combined field prefers one concrete presentation');
assertEqual(catalogApi.buildCatalogProposalForSlot('seguimiento.tratamiento', selectedDrug).dosis_texto, '100 mg', 'follow-up dose remains separate');
assertEqual(catalogApi.reconcileCatalogSelection({}, null, selectedDrug, 'seguimiento.tratamiento').values.farmaco_nombre, 'Producto sintético A', 'selection identity replaces a partial query with catalog product display name');
const contexts = [
    { slot: 'validacion.solicitado', cip: 'CIP-SYN-1' },
    { slot: 'validacion.validado', cip: 'CIP-SYN-1' },
    { slot: 'primera_visita.tratamiento', cip: 'CIP-SYN-1' },
    { slot: 'seguimiento.tratamiento', cip: 'CIP-SYN-1', linea_id: 'LINE-SYN-1' },
    { slot: 'seguimiento.relacionado:uid-syn-1', cip: 'CIP-SYN-1' }
];
contexts.forEach(function (context, index) {
    const snapshot = catalogApi.selectDrug({ ...selectedDrug, drug_id: selectedDrug.drug_id + '-' + index }, context, { proposal_values: { via: 'SC' } });
    assertEqual(snapshot && snapshot.context.slot, context.slot, `slot ${index + 1} stores own context`);
});
assertEqual(catalogApi.getSnapshot(contexts[0]).selected_drug_id, 'CIMA-SYN-1-0', 'requested slot remains isolated');
assertEqual(catalogApi.getSnapshot(contexts[4]).selected_drug_id, 'CIMA-SYN-1-4', 'dynamic UID slot remains isolated');
assertEqual(catalogApi.getSnapshot({ ...contexts[3], linea_id: 'OTHER-LINE' }), null, 'different line cannot reuse snapshot');
assertEqual(catalogApi.getSnapshot({ slot: 'validacion.solicitado', cip: 'OTHER-CIP' }), null, 'different CIP cannot reuse snapshot');
assertEqual(catalogApi.snapshotContextKey({ slot: 'arbitrary.slot', cip: 'CIP-SYN-1' }), '', 'arbitrary snapshot slot is rejected');
assertEqual(catalogApi.snapshotContextKey({ slot: 'seguimiento.relacionado:', cip: 'CIP-SYN-1' }), '', 'empty related UID is rejected');
assertEqual(catalogApi.snapshotContextKey({ slot: 'seguimiento.relacionado:unsafe uid', cip: 'CIP-SYN-1' }), '', 'unsafe related UID is rejected');
assertEqual(catalogApi.getSnapshot(), null, 'contextless lookup is rejected');
assertEqual(catalogApi.selectDrug(selectedDrug), null, 'contextless selection creates no metadata');
assertEqual(catalogApi.selectDrug({ drug_id: 'LOCAL-INCOMPLETE', source_type: 'LOCAL', nombre_comercial: 'Entrada sin presentación' }, contexts[0]), null, 'non-concrete local entry creates no proposal metadata');
assertEqual(catalogApi.isConcreteCatalogSelection(catalogApi.drugs[3]), false, 'normalized incomplete local entry remains rejected');
const normalizedSnapshot = catalogApi.selectDrug(normalizedConcreteCima, { slot: 'validacion.validado', cip: 'CIP-SYN-CATALOG' }, { proposal_values: { presentacion: normalizedConcreteCima.nombre_presentacion, dosis_texto: normalizedConcreteCima.dosis, via: normalizedConcreteCima.via } });
assertEqual(normalizedSnapshot && normalizedSnapshot.selected_drug_id, firstGeneratedIds[0], 'explicit normalized CIMA selection creates contextual snapshot');
assertEqual(normalizedSnapshot && normalizedSnapshot.proposal_values.dosis_texto, '150 mg', 'explicit normalized CIMA selection carries proposal metadata');
sessionStorage.setItem('farmacia_drug_snapshot', JSON.stringify({ selected_drug_id: 'LEGACY' }));
assertEqual(catalogApi.getSnapshot(), null, 'legacy singleton is rejected');
assertEqual(sessionStorage.getItem('farmacia_drug_snapshot'), null, 'legacy singleton is cleaned');

const registryRaw = JSON.parse(sessionStorage.getItem('farmacia_drug_snapshot_registry_v2'));
const malformedKey = catalogApi.snapshotContextKey({ slot: 'validacion.solicitado', cip: 'CIP-BAD' });
registryRaw.snapshots[malformedKey] = { context: { slot: 'validacion.solicitado', cip: 'CIP-BAD' } };
registryRaw.snapshots['arbitrary%2Eslot|CIP-BAD||'] = { selected_drug_id: 'BAD-SLOT', source_type: 'CIMA', context: { slot: 'arbitrary.slot', cip: 'CIP-BAD' } };
registryRaw.snapshots['mismatched-key'] = { selected_drug_id: 'BAD-KEY', source_type: 'CIMA', context: { slot: 'validacion.validado', cip: 'CIP-BAD' } };
registryRaw.snapshots['seguimiento.relacionado%3Aunsafe%20uid|CIP-BAD||'] = { selected_drug_id: 'BAD-UID', source_type: 'LOCAL', context: { slot: 'seguimiento.relacionado:unsafe uid', cip: 'CIP-BAD' } };
const invalidSourceKey = catalogApi.snapshotContextKey({ slot: 'validacion.validado', cip: 'CIP-BAD-SOURCE' });
registryRaw.snapshots[invalidSourceKey] = { selected_drug_id: 'BAD-SOURCE', source_type: 'DEMO', context: { slot: 'validacion.validado', cip: 'CIP-BAD-SOURCE', tratamiento_id: '', linea_id: '' } };
sessionStorage.setItem('farmacia_drug_snapshot_registry_v2', JSON.stringify(registryRaw));
// Force a fresh in-memory registry through a new VM evaluation.
const malformedSession = sessionStorage;
const malformedSandbox = { window: { localStorage: makeStorageMock(), sessionStorage: malformedSession }, sessionStorage: malformedSession, console, document: mockDoc, location: { search: '' } };
vm.createContext(malformedSandbox);
vm.runInContext(catalogSrc, malformedSandbox);
vm.runInContext(commonSrc, malformedSandbox);
assertEqual(malformedSandbox.window.FarmaciaCatalog.getSnapshot(contexts[0]).selected_drug_id, 'CIMA-SYN-1-0', 'valid isolated entry survives proactive registry sanitation');
assertEqual(malformedSandbox.window.FarmaciaCatalog.getSnapshot({ slot: 'validacion.solicitado', cip: 'CIP-BAD' }), null, 'malformed snapshot is rejected');
const cleanedRegistry = JSON.parse(malformedSession.getItem('farmacia_drug_snapshot_registry_v2'));
assertEqual(Object.hasOwn(cleanedRegistry.snapshots, malformedKey), false, 'malformed snapshot is cleaned');
assertEqual(Object.hasOwn(cleanedRegistry.snapshots, 'arbitrary%2Eslot|CIP-BAD||'), false, 'arbitrary slot is proactively cleaned');
assertEqual(Object.hasOwn(cleanedRegistry.snapshots, 'mismatched-key'), false, 'key/context mismatch is proactively cleaned');
assertEqual(Object.hasOwn(cleanedRegistry.snapshots, 'seguimiento.relacionado%3Aunsafe%20uid|CIP-BAD||'), false, 'unsafe dynamic UID is proactively cleaned');
assertEqual(Object.hasOwn(cleanedRegistry.snapshots, invalidSourceKey), false, 'snapshot with incompatible source is proactively cleaned');

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
