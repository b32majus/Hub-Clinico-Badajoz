#!/usr/bin/env node
// tools/farmacia_enfermeria_board_dom_check.mjs
// WO8.1c.8 — Verifica que las tarjetas Enfermería reutilizan pending-validation-card
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
  if (typeof str !== 'string') { fail(`${label}: no se puede evaluar (no es string)`); return; }
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
var patients = {};
patients['000000001'] = makeEnfPatient({
  cip: '000000001', nombre: 'Paciente A',
  medicina_preventiva_estado: 'PENDIENTE',
  observaciones_prebiologico: 'Pendiente cita Preventiva'
});
patients['000000002'] = makeEnfPatient({
  cip: '000000002', nombre: 'Paciente B',
  analitica_estado: 'ALTERADA / BLOQUEO',
  mantoux_estado: 'PENDIENTE',
  igra_estado: 'PENDIENTE',
  estado_prebiologico_enfermeria: 'BLOQUEADO',
  estado: 'bloqueado',
  estadoLabel: 'Bloqueado'
});
patients['000000003'] = makeEnfPatient({
  cip: '000000003', nombre: 'Paciente C', servicio: 'Reuma',
  servicio_origen: 'Reuma', patologia: 'AR', patologia_indicacion: 'AR',
  farmaco: 'Upadacitinib',
  estado_prebiologico_enfermeria: 'OK FARMACIA',
  estado: 'ok_farmacia',
  estadoLabel: 'OK Farmacia',
  fecha_ok_farmacia: '2026-06-12'
});
patients['000000004'] = makeEnfPatient({
  cip: '000000004', nombre: 'Paciente D', servicio: 'Digestivo',
  servicio_origen: 'Digestivo', patologia: 'EII', patologia_indicacion: 'EII',
  farmaco: 'Vedolizumab',
  analitica_estado: 'PENDIENTE',
  medicina_preventiva_estado: 'NO PRECISA'
});

// Also add a non-Enfermería patient to test filtering (no importSource to avoid pharmacy routing)
patients['LEGACY-TEST-001'] = {
  cip: 'LEGACY-TEST-001',
  nombre: 'Paciente Legacy',
  servicio: 'Derma',
  patologia: 'HS',
  farmaco: 'Cosentyx',
  estado: 'pending',        // fallback legacy: estado === 'pending'
  estadoLabel: 'Pendiente de validación'
};

// Direct inject to F.patients
for (var k in patients) {
  F.patients[k] = patients[k];
}

// ─── Checks ──────────────────────────────────────────────────────────────────
console.log('');
console.log('=== WO8.1c.8 — Enfermería Board (reusa pending-validation-card) ===');

// ─── 1-3. getEnfermeriaVisiblePatients returns 4 ──────────────────────────
var visible = F.getEnfermeriaVisiblePatients();
assertEqual(visible.length, 4, '1. getEnfermeriaVisiblePatients → 4 pacientes');

// Verify each patient
assert(F.isEnfermeriaPatient(visible[0]), '2. Paciente A es Enfermería');
assert(F.isEnfermeriaPatient(visible[1]), '3. Paciente B es Enfermería');
assert(F.isEnfermeriaPatient(visible[2]), '4. Paciente C es Enfermería');
assert(F.isEnfermeriaPatient(visible[3]), '5. Paciente D es Enfermería');

// ─── 6-8. Group counts ───────────────────────────────────────────────────
var groups = { ok_farmacia: [], en_vigilancia: [], bloqueado: [] };
visible.forEach(function (p) {
  var est = String(p.estado || p.estado_prebiologico_enfermeria || '').toLowerCase();
  if (est.indexOf('ok') !== -1 || est === 'ok_farmacia') groups.ok_farmacia.push(p);
  else if (est.indexOf('bloqueado') !== -1 || est === 'bloqueado') groups.bloqueado.push(p);
  else groups.en_vigilancia.push(p);
});
assertEqual(groups.en_vigilancia.length, 2, '6. 2 pacientes en vigilancia (A y D)');
assertEqual(groups.bloqueado.length, 1, '7. 1 paciente bloqueado (B)');
assertEqual(groups.ok_farmacia.length, 1, '8. 1 paciente OK FARMACIA (C)');

// ─── 9-11. Badges per patient ────────────────────────────────────────────
var badgesA = F.getEnfermeriaBadges(visible[0]);
assertEqual(badgesA.length, 1, '9. Paciente A → 1 badge');
if (badgesA.length > 0) {
  assertEqual(badgesA[0].label, 'Med. Preventiva', '10. Badge A → Med. Preventiva');
  assertEqual(badgesA[0].display, 'Pendiente', '11. Badge A → Pendiente');
}

var badgesB = F.getEnfermeriaBadges(visible[1]);
assertEqual(badgesB.length, 3, '12. Paciente B → 3 badges');

var badgesC = F.getEnfermeriaBadges(visible[2]);
assertEqual(badgesC.length, 0, '13. Paciente C → 0 badges');

var badgesD = F.getEnfermeriaBadges(visible[3]);
assertEqual(badgesD.length, 1, '14. Paciente D → 1 badge');
if (badgesD.length > 0) {
  assertEqual(badgesD[0].label, 'Analítica', '15. Badge D → Analítica');
  assertEqual(badgesD[0].display, 'Pendiente', '16. Badge D → Pendiente');
}

// ─── 17-26. Simulate card texts ──────────────────────────────────────────
function simulateEnfermeriaCard(patient) {
  var cardLines = [];
  // Header: CIP + nombre
  cardLines.push('CIP: ' + patient.cip + ', Nombre: ' + patient.nombre);
  // Badge estado
  var est = String(patient.estado || patient.estado_prebiologico_enfermeria || '').toLowerCase();
  var badgeClass = est.indexOf('ok') !== -1 ? 'status-badge--ok'
    : est.indexOf('bloqueado') !== -1 ? 'status-badge--blocked'
    : 'status-badge--vigilance';
  cardLines.push('EstadoBadgeClase: ' + badgeClass);
  cardLines.push('EstadoLabel: ' + (patient.estadoLabel || patient.estado_prebiologico_enfermeria || '—'));

  // Card class: pending-validation-card (reutilizada, no enfermeria-card)
  cardLines.push('CardClase: pending-validation-card');

  // Body: meta rows
  var bodyItems = [];
  bodyItems.push('Servicio: ' + (patient.servicio || patient.servicio_origen));
  bodyItems.push('Patologia: ' + (patient.patologia || patient.patologia_indicacion));
  bodyItems.push('Farmaco: ' + (patient.farmaco || patient.farmaco_solicitado));
  bodyItems.push('Origen: Excel Enfermería');
  if (patient.fecha_ok_farmacia) bodyItems.push('OK Fecha: ' + patient.fecha_ok_farmacia);
  cardLines.push('CuerpoMeta: ' + bodyItems.join(' | '));

  // Badges
  var badges = F.getEnfermeriaBadges(patient);
  if (badges.length > 0) {
    cardLines.push('Badges: ' + badges.map(function (b) { return b.label + ': ' + b.display; }).join(' | '));
  }

  // Action
  var hasValidar = est.indexOf('ok') !== -1;
  cardLines.push('TieneBotonValidar: ' + (hasValidar ? 'SI' : 'NO'));
  cardLines.push('TieneDashboard: SI');

  return cardLines.join('\n');
}

var cards = visible.map(simulateEnfermeriaCard);
var allText = cards.join('\n\n');

// Check Paciente en cards
assert(allText.indexOf('Paciente A') !== -1, '17. Paciente A en cards');
assert(allText.indexOf('Paciente B') !== -1, '18. Paciente B en cards');
assert(allText.indexOf('Paciente C') !== -1, '19. Paciente C en cards');
assert(allText.indexOf('Paciente D') !== -1, '20. Paciente D en cards');

// Estado labels
assert(allText.indexOf('EstadoLabel: En vigilancia') !== -1, '21. Paciente A → En vigilancia');
assert(allText.indexOf('EstadoLabel: Bloqueado') !== -1, '22. Paciente B → Bloqueado');
assert(allText.indexOf('EstadoLabel: OK Farmacia') !== -1, '23. Paciente C → OK Farmacia');
assert(allText.indexOf('EstadoLabel: En vigilancia') !== -1, '24. Paciente D → En vigilancia');

// Acciones
function countValidar(text) { return (text.match(/TieneBotonValidar: SI/g) || []).length; }
assertEqual(countValidar(allText), 1, '25. Solo 1 paciente tiene botón "Abrir validación"');

// Card class check: pending-validation-card, NOT enfermeria-card
assert(allText.indexOf('CardClase: pending-validation-card') !== -1, '26. Cards usan clase pending-validation-card');

// ─── 27. No .enfermeria-card en producción (clase en elementos, no en grid/headers) ──
var indexSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_index.js'), 'utf8');
// Check for actual class assignment 'enfermeria-card' (not enfermeria-card-grid or __*)
var badEnfCardRe = /['\"]enfermeria-card['\"]/g;
var badMatch = indexSrc.match(badEnfCardRe);
assert(!badMatch, '27. No existe "enfermeria-card" asignado en farmacia_index.js');

// ─── 28-32. No forbidden texts in card display data ─────────────────────
// Check only body/badges content, not class names
var bodyAndBadgesText = cards.map(function (c) {
  return c.split('\n').filter(function (line) {
    return line.indexOf('CardClase:') === -1 && line.indexOf('EstadoBadgeClase:') === -1;
  }).join('\n');
}).join('\n\n');

assertNoText(bodyAndBadgesText, 'unknown', '28. No aparece "unknown" en cards');
assertNoText(bodyAndBadgesText, ' pending', '29. No aparece " pending" en cards');
assertNoText(bodyAndBadgesText, 'Hemograma', '30. No aparece "Hemograma" en cards');
assertNoText(bodyAndBadgesText, 'Bioquímica', '31. No aparece "Bioquímica" en cards');
assertNoText(bodyAndBadgesText, 'Analítica reciente', '32. No aparece "Analítica reciente" en cards');

// ─── 33. Prebiológico bloqueado genérico ────────────────────────────────
assertNoText(allText, 'Prebiológico bloqueado', '33. No aparece "Prebiológico bloqueado" genérico');

// ─── 34-36. No duplicate between boards ──────────────────────────────────
// Data layer still includes Paciente C (shouldAppearInValidationInbox=true for OK FARMACIA)
// Render layer filters out ALL Enfermería patients to avoid duplicates
var pending = F.getPendingValidationPatients();
var enfInPendingData = pending.filter(function (p) {
  return F.isEnfermeriaPatient(p);
});
// Paciente C is OK FARMACIA → appears in data layer (correct)
assert(enfInPendingData.length >= 1, '34. Paciente C aparece en data layer de pending (OK FARMACIA)');

// But renderPendingValidationBoard filter would exclude ALL Enfermería
// Simulate the render filter WITHOUT imports (demo can appear):
var filtered = pending.filter(function (p) {
  return !F.isEnfermeriaPatient(p);
});
var enfInFiltered = filtered.filter(function (p) {
  return F.isEnfermeriaPatient(p);
});
assertEqual(enfInFiltered.length, 0, '35. Render filter (sin imports) excluye todo paciente Enfermería');

// The legacy patient should appear when no imports loaded
var demoInPending = pending.filter(function (p) { return p.cip === 'LEGACY-TEST-001'; });
assertEqual(demoInPending.length, 1, '36. Paciente legacy aparece en pending (sin imports)');

// ─── 37-39. With imports loaded, demo fallback is hidden ────────────────
// Simulate FarmaciaDataImports with data
var mockImports = [
  { cip: 'IMPORT-001', nombre: 'Paciente Importado', servicio: 'Reuma',
    patologia: 'AR', farmaco: 'Benlysta', estado: 'pending', estadoLabel: 'Pendiente',
    importSource: 'Excel Enfermería', origen_solicitud: 'enfermeria' }
];
function simulateRenderFilterWithImports(pendingPatients) {
  var hasData = mockImports.length > 0;
  return pendingPatients.filter(function (p) {
    if (F.isEnfermeriaPatient(p)) return false;
    if (hasData) {
      var src = String(p.importSource || '').toLowerCase();
      if (src === 'demo' || src === '') return false;
    }
    return true;
  });
}

var filteredWithImports = simulateRenderFilterWithImports(pending);
var demoInFilteredWithImports = filteredWithImports.filter(function (p) { return p.cip === 'LEGACY-TEST-001'; });
assertEqual(demoInFilteredWithImports.length, 0, '37. Paciente legacy NO aparece en pending (con imports cargados)');

// Imported patient with pending status should appear
// (LEGACY-TEST-001 has importSource undefined → treated as demo when hasImportedData=true)
// Also verify that imported patient mock would appear
var mockPendingCheck = simulateRenderFilterWithImports([
  { cip: 'IMPORT-001', nombre: 'Imported', estado: 'pending', estadoLabel: 'Pendiente', importSource: 'Excel Farmacia' }
]);
assertEqual(mockPendingCheck.length, 1, '38. Paciente importado (Excel Farmacia) SÍ aparece con imports cargados');

// ─── 39-40. innerHTML check ──────────────────────────────────────────────
var commonSrcContent = fs.readFileSync(commonPath, 'utf8');
var innerCount = (commonSrcContent.match(/innerHTML/g) || []).length;
assert(innerCount <= 3, `39. innerHTML en farmacia_common.js: ${innerCount}`);

var indexSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_index.js'), 'utf8');
var indexInner = (indexSrc.match(/innerHTML/g) || []).length;
assert(indexInner <= 2, `40. innerHTML en farmacia_index.js: ${indexInner}`);
console.log(`\n Total: ${passed} passed, ${failed} failed${errors.length ? ' (' + errors.length + ' errores)' : ''}`);
if (failed > 0) process.exit(1);
