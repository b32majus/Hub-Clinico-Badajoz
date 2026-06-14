#!/usr/bin/env node
// tools/farmacia_enfermeria_import_check.mjs
// Verifica WO8.1c.3 — Adaptador import Enfermería / Inicio Biológico

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) { console.log('  \u2713 ' + msg); passed++; }
function fail(msg) { console.log('  \u2717 ' + msg); failed++; errors.push(msg); }
function assert(condition, label) { if (condition) ok(label); else fail(label); }
function assertEqual(actual, expected, label) {
  if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
  else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

function assertNotEqual(actual, unexpected, label) {
  if (actual !== unexpected) ok(`${label}: ${JSON.stringify(actual)}`);
  else fail(`${label}: valor inesperado ${JSON.stringify(actual)}`);
}

function assertTruthy(actual, label) {
  if (actual) ok(`${label}: ${JSON.stringify(actual)}`);
  else fail(`${label}: se esperaba valor truthy`);
}

// ─── Load scripts ────────────────────────────────────────────────────────────
const catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

const catalogSrc = fs.readFileSync(catalogPath, 'utf8');
const commonSrc = fs.readFileSync(commonPath, 'utf8');

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
vm.runInContext(catalogSrc, sandbox);
vm.runInContext(commonSrc, sandbox);

const F = sandbox.window.FarmaciaDemo;

// 1. Funciones de Enfermería existen
assert(typeof F.isEnfermeriaInicioBiologicoWorkbook === 'function', 'isEnfermeriaInicioBiologicoWorkbook existe');
assert(typeof F.findEnfermeriaHeaderRow === 'function', 'findEnfermeriaHeaderRow existe');
assert(typeof F.buildEnfermeriaHeaderMap === 'function', 'buildEnfermeriaHeaderMap existe');
assert(typeof F.normalizeEnfermeriaInicioBiologicoRow === 'function', 'normalizeEnfermeriaInicioBiologicoRow existe');
assert(typeof F.parseEnfermeriaInicioBiologicoSheet === 'function', 'parseEnfermeriaInicioBiologicoSheet existe');
assert(typeof F.shouldEnfermeriaRowAppearInValidationInbox === 'function', 'shouldEnfermeriaRowAppearInValidationInbox existe');

// 2. isEnfermeriaInicioBiologicoWorkbook detecta hoja INICIO_BIOLOGICO
const mockWorkbookWith = { SheetNames: ['INICIO_BIOLOGICO', 'LISTAS', 'INSTRUCCIONES'] };
const mockWorkbookWithout = { SheetNames: ['01_DERMA', '02_REUMA', '05_CATALOGOS'] };
assert(F.isEnfermeriaInicioBiologicoWorkbook(mockWorkbookWith), 'Detecta workbook con INICIO_BIOLOGICO');
assert(!F.isEnfermeriaInicioBiologicoWorkbook(mockWorkbookWithout), 'Rechaza workbook sin INICIO_BIOLOGICO');
assert(!F.isEnfermeriaInicioBiologicoWorkbook(null), 'Maneja null');
assert(!F.isEnfermeriaInicioBiologicoWorkbook({}), 'Maneja objeto vacío');

// 3. findEnfermeriaHeaderRow localiza cabecera aunque no esté en fila 1 (row index 3 = row 4)
const mockRows = [
  ['Título de la hoja'],
  ['Instrucciones...'],
  [],
  ['CIP', 'Paciente', 'Servicio', 'Patología', 'Fármaco', 'Analítica', 'Mantoux', 'IGRA', 'VHB', 'VHC', 'VIH', 'Med. Preventiva', 'Estado', 'Fecha OK', 'Observación prebiológico'],
  ['000000001', 'Paciente A', 'Derma', 'HS', 'Secukinumab', 'OK', 'NEGATIVO', 'NO PRECISA', 'NEGATIVO', 'NEGATIVO', 'NEGATIVO', 'PENDIENTE', 'EN VIGILANCIA', '', 'Pendiente cita Preventiva'],
];
const headerIdx = F.findEnfermeriaHeaderRow(mockRows);
assertEqual(headerIdx, 3, 'findEnfermeriaHeaderRow encuentra cabecera en fila 4 (índice 3)');
assertEqual(F.findEnfermeriaHeaderRow([['Sin CIP']]), -1, 'No encuentra cabecera en array sin CIP');
assertEqual(F.findEnfermeriaHeaderRow([]), -1, 'Array vacío devuelve -1');

// 4. buildEnfermeriaHeaderMap mapea columnas correctamente
const headerRow = mockRows[headerIdx];
const headerMap = F.buildEnfermeriaHeaderMap(headerRow);
assertTruthy(headerMap, 'buildEnfermeriaHeaderMap devuelve mapa');
assertEqual(headerMap.cip, 0, 'CIP columna 0');
assertEqual(headerMap.paciente, 1, 'Paciente columna 1');
assertEqual(headerMap.servicio, 2, 'Servicio columna 2');
assertEqual(headerMap.patologia, 3, 'Patología columna 3');
assertEqual(headerMap.farmaco, 4, 'Fármaco columna 4');
assertEqual(headerMap.analitica, 5, 'Analítica columna 5');
assertEqual(headerMap.mantoux, 6, 'Mantoux columna 6');
assertEqual(headerMap.igra, 7, 'IGRA columna 7');
assertEqual(headerMap.vhb, 8, 'VHB columna 8');
assertEqual(headerMap.vhc, 9, 'VHC columna 9');
assertEqual(headerMap.vih, 10, 'VIH columna 10');
assertEqual(headerMap.medPreventiva, 11, 'Med. Preventiva columna 11');
assertEqual(headerMap.estado, 12, 'Estado columna 12');
assertEqual(headerMap.fechaOk, 13, 'Fecha OK columna 13');
assertEqual(headerMap.observacion, 14, 'Observación prebiológico columna 14');

// 5. normalizeEnfermeriaInicioBiologicoRow mapea correctamente
const row5 = mockRows[4];
const normalized = F.normalizeEnfermeriaInicioBiologicoRow(row5, headerMap);
assertTruthy(normalized, 'normalizeEnfermeriaInicioBiologicoRow devuelve objeto');
assertEqual(normalized.cip_demo_o_hash, '000000001', 'cip_demo_o_hash');
assertEqual(normalized.paciente_nombre, 'Paciente A', 'paciente_nombre');
assertEqual(normalized.servicio_origen, 'Derma', 'servicio_origen');
assertEqual(normalized.patologia_indicacion, 'HS', 'patologia_indicacion');
assertEqual(normalized.farmaco_solicitado, 'Secukinumab', 'farmaco_solicitado');
assertEqual(normalized.analitica_estado, 'OK', 'analitica_estado');
assertEqual(normalized.mantoux_estado, 'NEGATIVO', 'mantoux_estado');
assertEqual(normalized.igra_estado, 'NO PRECISA', 'igra_estado');
assertEqual(normalized.vhb_estado, 'NEGATIVO', 'vhb_estado');
assertEqual(normalized.vhc_estado, 'NEGATIVO', 'vhc_estado');
assertEqual(normalized.vih_estado, 'NEGATIVO', 'vih_estado');
assertEqual(normalized.medicina_preventiva_estado, 'PENDIENTE', 'medicina_preventiva_estado');
assertEqual(normalized.estado_prebiologico_enfermeria, 'EN VIGILANCIA', 'estado_prebiologico_enfermeria');
assertEqual(normalized.estado, 'EN VIGILANCIA', 'estado');
assertEqual(normalized.source_type, 'ENFERMERIA', 'source_type');
assertEqual(normalized.origen_solicitud, 'enfermeria', 'origen_solicitud');
assertEqual(normalized.tipo_origen, 'enfermeria_inicio_biologico', 'tipo_origen');

// 6. Fila sin CIP → null
assertEqual(F.normalizeEnfermeriaInicioBiologicoRow(['', 'Paciente X', 'Derma'], headerMap), null, 'Fila sin CIP devuelve null');

// 7. parseEnfermeriaInicioBiologicoSheet parsa correctamente
const parsed = F.parseEnfermeriaInicioBiologicoSheet(mockRows, 'INICIO_BIOLOGICO');
assertEqual(parsed.length, 1, 'parseEnfermeriaInicioBiologicoSheet extrae 1 fila');
assertEqual(parsed[0].cip_demo_o_hash, '000000001', 'Fila extraída tiene CIP correcto');

// 8. Hoja no INICIO_BIOLOGICO se ignora
assertEqual(F.parseEnfermeriaInicioBiologicoSheet(mockRows, 'PANEL_ENFERMERIA').length, 0, 'PANEL_ENFERMERIA ignorada');
assertEqual(F.parseEnfermeriaInicioBiologicoSheet(mockRows, 'LISTAS').length, 0, 'LISTAS ignorada');
assertEqual(F.parseEnfermeriaInicioBiologicoSheet(mockRows, 'INSTRUCCIONES').length, 0, 'INSTRUCCIONES ignorada');

// 9. shouldEnfermeriaRowAppearInValidationInbox clasifica estados
assert(F.shouldEnfermeriaRowAppearInValidationInbox({ estado_prebiologico_enfermeria: 'OK FARMACIA' }), 'OK FARMACIA → true');
assert(F.shouldEnfermeriaRowAppearInValidationInbox({ estado_prebiologico_enfermeria: 'OK_FARMACIA' }), 'OK_FARMACIA → true');
assert(F.shouldEnfermeriaRowAppearInValidationInbox({ estado: 'OK FARMACIA' }), 'fallback estado OK FARMACIA → true');
assert(!F.shouldEnfermeriaRowAppearInValidationInbox({ estado_prebiologico_enfermeria: 'EN VIGILANCIA' }), 'EN VIGILANCIA → false');
assert(!F.shouldEnfermeriaRowAppearInValidationInbox({ estado_prebiologico_enfermeria: 'BLOQUEADO' }), 'BLOQUEADO → false');
assert(!F.shouldEnfermeriaRowAppearInValidationInbox({}), 'Vacío → false');

// 10. buildImportedPatientCandidate con Enfermería OK FARMACIA
const buildCandidate = F.buildImportedPatientCandidate;
const enfOK = buildCandidate(
  { cip: 'ENF-OK-001', farmaco: 'Secukinumab', estado: 'OK FARMACIA', analitica_estado: 'OK', mantoux_estado: 'NEGATIVO' },
  { cip: 'cip', farmaco: 'farmaco' },
  'Enfermería', 0
);
assertEqual(enfOK.estado, 'ok_farmacia', 'buildCandidate Enfermería OK → estado=ok_farmacia');
assertEqual(enfOK.estadoLabel, 'OK Farmacia', 'buildCandidate Enfermería OK → label correcto');
assertEqual(enfOK.analitica_estado, 'OK', 'buildCandidate preserva analitica_estado');
assertEqual(enfOK.mantoux_estado, 'NEGATIVO', 'buildCandidate preserva mantoux_estado');

// 11. buildImportedPatientCandidate con Enfermería EN VIGILANCIA
const enfVig = buildCandidate(
  { cip: 'ENF-VIG-001', estado: 'EN VIGILANCIA' },
  { cip: 'cip' },
  'Enfermería', 1
);
assertEqual(enfVig.estado, 'en_vigilancia', 'buildCandidate Enfermería vigilancia → estado=en_vigilancia');

// 12. buildImportedPatientCandidate con Enfermería BLOQUEADO
const enfBloq = buildCandidate(
  { cip: 'ENF-BLOQ-001', estado: 'BLOQUEADO' },
  { cip: 'cip' },
  'Enfermería', 2
);
assertEqual(enfBloq.estado, 'bloqueado', 'buildCandidate Enfermería bloqueado → estado=bloqueado');

// 13. El lector de Farmacia WO8 sigue funcionando (regresión)
const farmaciaAct = buildCandidate(
  { cip: 'FH-TEST-001', tipo_acto_fh: 'validacion_inicial', resultado_validacion: 'validado', estado_registro: 'completado' },
  { cip: 'cip', tipoActoFH: 'tipo_acto_fh', resultadoValidacion: 'resultado_validacion', estadoRegistro: 'estado_registro' },
  'Farmacia', 3
);
assertEqual(farmaciaAct.estado, 'completado', 'Farmacia validado → completado (no regresión)');

// 14. shouldAppearInValidationInbox conserva semántica corregida
const shouldAppear = F.shouldAppearInValidationInbox;
assertEqual(shouldAppear({ importSource: 'Excel Farmacia', resultado_validacion: 'validado', estado_registro: 'completado' }), false, 'Farmacia completado no aparece');
assertEqual(shouldAppear({ importSource: 'Excel Enfermería', estado_prebiologico_enfermeria: 'OK FARMACIA' }), true, 'Enfermería OK FARMACIA sí aparece');
assertEqual(shouldAppear({ importSource: 'Excel Enfermería', estado: 'EN VIGILANCIA' }), false, 'Enfermería vigilancia no aparece');
assertEqual(shouldAppear({ estado_solicitud_validacion: 'pendiente' }), true, 'Solicitud pendiente explícita sí aparece');

// 15. innerHTML check: no innerHTML nuevo
const commonSrcContent = fs.readFileSync(commonPath, 'utf8');
const matches = commonSrcContent.match(/innerHTML/g);
const count = matches ? matches.length : 0;
assert(count <= 3, `innerHTML en farmacia_common.js: ${count} (máx 3 permitido, 0-2 en código existente)`);

// ─── WO8.1c.5 — Tests de normalización y visibilidad ───────────────────
console.log('\n[Caso O] normalizeEnfermeriaFieldValue');
const normVal = F.normalizeEnfermeriaFieldValue;
assertEqual(normVal('OK'), 'Completo', 'OK → Completo');
assertEqual(normVal('NEGATIVO'), 'Completo', 'NEGATIVO → Completo');
assertEqual(normVal('NO PRECISA'), 'No precisa', 'NO PRECISA → No precisa');
assertEqual(normVal('PENDIENTE'), 'Pendiente', 'PENDIENTE → Pendiente');
assertEqual(normVal('ALTERADA / BLOQUEO'), 'Bloqueo', 'ALTERADA/BLOQUEO → Bloqueo');
assertEqual(normVal(''), 'No informado', 'vacío → No informado');
assertEqual(normVal('  '), 'No informado', 'espacios → No informado');

console.log('\n[Caso P] getEnfermeriaFieldStatus');
const fldStatus = F.getEnfermeriaFieldStatus;
assertEqual(fldStatus('OK'), 'completo', 'OK → completo');
assertEqual(fldStatus('NEGATIVO'), 'completo', 'NEGATIVO → completo');
assertEqual(fldStatus('NO PRECISA'), 'no_aplica', 'NO PRECISA → no_aplica');
assertEqual(fldStatus('PENDIENTE'), 'pendiente', 'PENDIENTE → pendiente');
assertEqual(fldStatus('ALTERADA / BLOQUEO'), 'bloqueo', 'ALTERADA/BLOQUEO → bloqueo');
assertEqual(fldStatus('POSITIVO'), 'alerta', 'POSITIVO → alerta');

console.log('\n[Caso Q] getEnfermeriaBadges — Paciente A (EN VIGILANCIA)');
const badgesA = F.getEnfermeriaBadges({
analitica_estado: 'OK',
mantoux_estado: 'NEGATIVO',
igra_estado: 'NO PRECISA',
vhb_estado: 'NEGATIVO',
vhc_estado: 'NEGATIVO',
vih_estado: 'NEGATIVO',
medicina_preventiva_estado: 'PENDIENTE'
});
assertEqual(badgesA.length, 1, 'Paciente A → 1 badge (solo Med. Preventiva pendiente)');
if (badgesA.length > 0) {
assertEqual(badgesA[0].label, 'Med. Preventiva', 'Badge A → Med. Preventiva');
assertEqual(badgesA[0].display, 'Pendiente', 'Badge A → Pendiente');
}

console.log('\n[Caso R] getEnfermeriaBadges — Paciente B (BLOQUEADO)');
const badgesB = F.getEnfermeriaBadges({
analitica_estado: 'ALTERADA / BLOQUEO',
mantoux_estado: 'PENDIENTE',
igra_estado: 'PENDIENTE',
vhb_estado: 'NEGATIVO',
vhc_estado: 'NEGATIVO',
vih_estado: 'NEGATIVO',
medicina_preventiva_estado: 'OK'
});
assertEqual(badgesB.length, 3, 'Paciente B → 3 badges (Analítica bloqueo + Mantoux pendiente + IGRA pendiente)');

console.log('\n[Caso S] getEnfermeriaBadges — Paciente C (OK FARMACIA)');
const badgesC = F.getEnfermeriaBadges({
analitica_estado: 'OK',
mantoux_estado: 'NEGATIVO',
igra_estado: 'NEGATIVO',
vhb_estado: 'NEGATIVO',
vhc_estado: 'NEGATIVO',
vih_estado: 'NEGATIVO',
medicina_preventiva_estado: 'OK'
});
assertEqual(badgesC.length, 0, 'Paciente C → 0 badges (todo completo/no precisa)');

console.log('\n[Caso T] getEnfermeriaBadges — Paciente D (EN VIGILANCIA)');
const badgesD = F.getEnfermeriaBadges({
analitica_estado: 'PENDIENTE',
mantoux_estado: 'NO PRECISA',
igra_estado: 'NO PRECISA',
vhb_estado: 'NEGATIVO',
vhc_estado: 'NEGATIVO',
vih_estado: 'NEGATIVO',
medicina_preventiva_estado: 'NO PRECISA'
});
assertEqual(badgesD.length, 1, 'Paciente D → 1 badge (solo Analítica pendiente)');
if (badgesD.length > 0) {
assertEqual(badgesD[0].label, 'Analítica', 'Badge D → Analítica');
assertEqual(badgesD[0].display, 'Pendiente', 'Badge D → Pendiente');
}

console.log('\n[Caso U] getEnfermeriaVisiblePatients existe');
assert(typeof F.getEnfermeriaVisiblePatients === 'function', 'getEnfermeriaVisiblePatients existe');

console.log('\n[Caso V] NO PRECISA no cuenta como bloqueo');
assertEqual(fldStatus('NO PRECISA') !== 'bloqueo' && fldStatus('NO PRECISA') !== 'pendiente', true, 'NO PRECISA no es bloqueo ni pendiente');

console.log('\n[Caso W] NEGATIVO no cuenta como bloqueo');
assertEqual(fldStatus('NEGATIVO'), 'completo', 'NEGATIVO es completo');

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
