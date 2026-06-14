#!/usr/bin/env node
// tools/farmacia_enfermeria_board_dom_check.mjs
// WO8.1c.6 — Verifica helpers de renderizado DOM para Enfermería
// (sin cargar farmacia_index.js para evitar dependencias complejas)

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

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

function assertNoText(str, forbidden, label) {
  if (str.indexOf(forbidden) === -1) ok(label);
  else fail(`${label}: encontrado "${forbidden}"`);
}

// ─── Load scripts ────────────────────────────────────────────────────────────
const catalogPath = path.join(ROOT, 'scripts', 'farmacia_pautas_catalog.js');
const commonPath = path.join(ROOT, 'scripts', 'farmacia_common.js');

if (!fs.existsSync(catalogPath) || !fs.existsSync(commonPath)) {
  console.error('FATAL: scripts no encontrados');
  process.exit(1);
}

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

var mockDoc = {
  addEventListener: function () {},
  getElementById: function () { return null; },
  createElement: function () { return {}; },
  createTextNode: function () { return {}; },
  documentElement: { style: {} },
  body: { classList: { add: function () {}, remove: function () {} } },
  head: { appendChild: function () {} },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};

var sandbox = {
  window: Object.assign({
    localStorage: makeStorageMock(),
    sessionStorage: makeStorageMock(),
    location: { search: '' }
  }, mockDoc),
  console: console,
  document: mockDoc,
  location: { search: '' },
  URLSearchParams: function () { return { get: function () { return null; }, has: function () { return false; } }; }
};
vm.createContext(sandbox);

vm.runInContext(catalogSrc, sandbox);
vm.runInContext(commonSrc, sandbox);

const F = sandbox.window.FarmaciaDemo;

// ─── Test data: 4 Enfermería patients ────────────────────────────────────────
function makeEnfPatient(overrides) {
  return Object.assign({
    cip: '000000000',
    nombre: 'Paciente X',
    servicio: 'Derma',
    servicio_origen: 'Derma',
    patologia: 'HS',
    patologia_indicacion: 'HS',
    farmaco: 'Secukinumab',
    farmaco_solicitado: 'Secukinumab',
    analitica_estado: 'OK',
    mantoux_estado: 'NEGATIVO',
    igra_estado: 'NO PRECISA',
    vhb_estado: 'NEGATIVO',
    vhc_estado: 'NEGATIVO',
    vih_estado: 'NEGATIVO',
    medicina_preventiva_estado: 'OK',
    estado_prebiologico_enfermeria: 'EN VIGILANCIA',
    estado: 'en_vigilancia',
    estadoLabel: 'En vigilancia',
    origen_solicitud: 'enfermeria',
    tipo_origen: 'enfermeria_inicio_biologico',
    source_type: 'ENFERMERIA'
  }, overrides);
}

// Inject into patients object
if (F && F.patients) {
  F.patients['000000001'] = makeEnfPatient({
    cip: '000000001', nombre: 'Paciente A',
    medicina_preventiva_estado: 'PENDIENTE',
    observaciones_prebiologico: 'Pendiente cita Preventiva'
  });
  F.patients['000000002'] = makeEnfPatient({
    cip: '000000002', nombre: 'Paciente B',
    analitica_estado: 'ALTERADA / BLOQUEO',
    mantoux_estado: 'PENDIENTE',
    igra_estado: 'PENDIENTE',
    estado_prebiologico_enfermeria: 'BLOQUEADO',
    estado: 'bloqueado',
    estadoLabel: 'Bloqueado'
  });
  F.patients['000000003'] = makeEnfPatient({
    cip: '000000003', nombre: 'Paciente C', servicio: 'Reuma',
    servicio_origen: 'Reuma', patologia: 'AR', patologia_indicacion: 'AR',
    farmaco: 'Upadacitinib',
    estado_prebiologico_enfermeria: 'OK FARMACIA',
    estado: 'ok_farmacia',
    estadoLabel: 'OK Farmacia',
    fecha_ok_farmacia: '2026-06-12'
  });
  F.patients['000000004'] = makeEnfPatient({
    cip: '000000004', nombre: 'Paciente D', servicio: 'Digestivo',
    servicio_origen: 'Digestivo', patologia: 'EII', patologia_indicacion: 'EII',
    farmaco: 'Vedolizumab',
    analitica_estado: 'PENDIENTE',
    medicina_preventiva_estado: 'NO PRECISA'
  });
}

// ─── Helper to build a simulated DOM card ────────────────────────────────────

function simulateEnfermeriaCard(patient) {
  var badges = F.getEnfermeriaBadges(patient);
  var text = 'CIP: ' + patient.cip + ', Nombre: ' + patient.nombre
    + ', Estado: ' + (patient.estadoLabel || '')
    + ', Grupo: ' + (patient.estado || '');
  if (badges.length > 0) {
    text += ', Badges: ' + badges.map(function (b) { return b.label + ': ' + b.display; }).join(' | ');
  }
  text += ', Abrir validación: ' + (patient.estado === 'ok_farmacia' ? 'SI' : 'NO');
  return { text: text, badges: badges };
}

// ─── Checks ──────────────────────────────────────────────────────────────────
console.log('=== Enfermería Board DOM Simulation ===');

// 1-4. getEnfermeriaVisiblePatients returns 4
var visible = F.getEnfermeriaVisiblePatients();
assertEqual(visible.length, 4, 'getEnfermeriaVisiblePatients → 4 pacientes');

// Verify each patient is detected as Enfermería
assert(F.isEnfermeriaPatient(visible[0]), 'Paciente A es Enfermería');
assert(F.isEnfermeriaPatient(visible[1]), 'Paciente B es Enfermería');
assert(F.isEnfermeriaPatient(visible[2]), 'Paciente C es Enfermería');
assert(F.isEnfermeriaPatient(visible[3]), 'Paciente D es Enfermería');

// Group
var groups = { ok_farmacia: [], en_vigilancia: [], bloqueado: [] };
visible.forEach(function (p) {
  var est = String(p.estado || p.estado_prebiologico_enfermeria || '').toLowerCase();
  if (est.indexOf('ok') !== -1 || est === 'ok_farmacia') groups.ok_farmacia.push(p);
  else if (est.indexOf('bloqueado') !== -1 || est === 'bloqueado') groups.bloqueado.push(p);
  else groups.en_vigilancia.push(p);
});
assertEqual(groups.en_vigilancia.length, 2, '2 pacientes en vigilancia (A y D)');
assertEqual(groups.bloqueado.length, 1, '1 paciente bloqueado (B)');
assertEqual(groups.ok_farmacia.length, 1, '1 paciente OK FARMACIA (C)');

// 5-7. Badges per patient
var badgesA = F.getEnfermeriaBadges(visible[0]); // A
assertEqual(badgesA.length, 1, 'Paciente A → 1 badge');
if (badgesA.length > 0) {
  assertEqual(badgesA[0].label, 'Med. Preventiva', 'Badge A → Med. Preventiva');
  assertEqual(badgesA[0].display, 'Pendiente', 'Badge A → Pendiente');
}

var badgesB = F.getEnfermeriaBadges(visible[1]); // B
assertEqual(badgesB.length, 3, 'Paciente B → 3 badges');

var badgesC = F.getEnfermeriaBadges(visible[2]); // C
assertEqual(badgesC.length, 0, 'Paciente C → 0 badges');

var badgesD = F.getEnfermeriaBadges(visible[3]); // D
assertEqual(badgesD.length, 1, 'Paciente D → 1 badge');
if (badgesD.length > 0) {
  assertEqual(badgesD[0].label, 'Analítica', 'Badge D → Analítica');
  assertEqual(badgesD[0].display, 'Pendiente', 'Badge D → Pendiente');
}

// 8-10. Simulate card texts
var cards = visible.map(simulateEnfermeriaCard);
var allText = cards.map(function (c) { return c.text; }).join('\n');

// Paciente A: NO Abrir validación
assert(allText.indexOf('Paciente A') !== -1, 'Paciente A en cards');
assert(allText.indexOf('Paciente A, Estado: En vigilancia') !== -1, 'Paciente A → En vigilancia');
assert(allText.indexOf('Abrir validación: NO') !== -1, 'Paciente A → NO abrir validación');

// Paciente B: Bloqueado
assert(allText.indexOf('Paciente B') !== -1, 'Paciente B en cards');
assert(allText.indexOf('Paciente B, Estado: Bloqueado') !== -1, 'Paciente B → Bloqueado');

// Paciente C: OK FARMACIA → Abrir validación = SI
assert(allText.indexOf('Paciente C') !== -1, 'Paciente C en cards');
assert(allText.indexOf('Paciente C, Estado: OK Farmacia') !== -1, 'Paciente C → OK Farmacia');
assert(allText.indexOf('Abrir validación: SI') !== -1, 'Paciente C → SÍ abrir validación');

// Paciente D: En vigilancia
assert(allText.indexOf('Paciente D') !== -1, 'Paciente D en cards');
assert(allText.indexOf('Paciente D, Estado: En vigilancia') !== -1, 'Paciente D → En vigilancia');
assert(allText.indexOf('Abrir validación: NO') !== -1, 'Paciente D → NO abrir validación');

// 11-14. No forbidden texts in generated card data
assertNoText(allText, 'unknown', 'No aparece "unknown" en cards');
assertNoText(allText, ' pending', 'No aparece " pending" en cards');
assertNoText(allText, 'Hemograma', 'No aparece "Hemograma" en cards');
assertNoText(allText, 'Bioquímica', 'No aparece "Bioquímica" en cards');
assertNoText(allText, 'Analítica reciente', 'No aparece "Analítica reciente" en cards');
assertNoText(allText, 'Prebiológico bloqueado', 'No aparecen bloqueantes genéricos en cards');

// 15-16. Check that isEnfermeriaPatient correctly identifies non-Enfermería
assert(!F.isEnfermeriaPatient({ cip: 'FH-TEST', importSource: 'Excel Farmacia' }), 'Farmacia no es Enfermería');
assert(!F.isEnfermeriaPatient({ cip: 'DEMO-TEST' }), 'Demo no es Enfermería');

// 17. innerHTML check
var commonSrcContent = fs.readFileSync(commonPath, 'utf8');
var innerCount = (commonSrcContent.match(/innerHTML/g) || []).length;
assert(innerCount <= 3, `innerHTML en farmacia_common.js: ${innerCount}`);

var indexSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_index.js'), 'utf8');
var indexInner = (indexSrc.match(/innerHTML/g) || []).length;
assert(indexInner <= 2, `innerHTML en farmacia_index.js: ${indexInner}`);

console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
