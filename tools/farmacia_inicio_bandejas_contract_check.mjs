#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataset = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/demo/farmacia/farmacia_wo8_runtime_v1.json'), 'utf8'));
const commonSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_common.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_index.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'farmacia_index.html'), 'utf8');

function storage() {
  const values = {};
  return {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: (key) => { delete values[key]; }
  };
}

const document = {
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} }; },
  createTextNode() { return {}; },
  body: { classList: { add() {}, remove() {} }, insertBefore() {}, firstChild: null },
  head: { appendChild() {} },
  documentElement: { appendChild() {}, style: {} }
};
const dataSource = {
  ready: Promise.resolve(),
  getPersons: () => dataset.persons.slice(),
  findPersonByCip: () => null,
  getActsByPatientId: (id) => dataset.acts.filter((item) => item.patient_id === id),
  getValidationsByPatientId: (id) => dataset.validations.filter((item) => item.patient_id === id),
  getTreatmentLinesByPatientId: (id) => dataset.treatment_lines.filter((item) => item.patient_id === id),
  getVisitsByPatientId: (id) => dataset.visits.filter((item) => item.patient_id === id),
  getFollowupsByPatientId: (id) => dataset.followups.filter((item) => item.patient_id === id),
  getAdverseEventsByPatientId: (id) => dataset.adverse_events.filter((item) => item.patient_id === id),
  getLongitudinalDataset: () => ({ pacientes: [] })
};
const window = {
  FarmaciaDataSource: dataSource,
  FarmaciaPautasCatalog: {},
  localStorage: storage(),
  sessionStorage: storage(),
  location: { search: '' },
  addEventListener() {}
};
const sandbox = { window, document, console, URLSearchParams, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(commonSource, sandbox);
await sandbox.window.FarmaciaDemo.ready;

const F = sandbox.window.FarmaciaDemo;
assert.equal(typeof F.getInicioInboxClassification, 'function', 'common exposes explicit Inicio inbox classification');
const classified = F.getInicioInboxClassification();
assert.deepEqual(Object.keys(classified.enfermeria), ['ok_farmacia', 'en_vigilancia', 'bloqueado']);
assert.equal(classified.enfermeria.ok_farmacia.length, 0);
assert.equal(classified.enfermeria.en_vigilancia.length, 0);
assert.equal(classified.enfermeria.bloqueado.length, 0);
assert.equal(
  Array.from(classified.otras, (patient) => patient.cip).sort().join(','),
  'DEMO-CIP-DER-001,DEMO-CIP-DIG-001,DEMO-CIP-ONC-001'
);
assert.equal(classified.unclassified.length, 37, 'records without explicit pending/prebiological state remain outside inboxes');

const enfermeriaCips = new Set(Object.values(classified.enfermeria).flat().map((patient) => patient.cip));
assert.equal(classified.otras.some((patient) => enfermeriaCips.has(patient.cip)), false, 'inboxes are mutually exclusive');
assert.equal(classified.otras.some((patient) => patient.resultado_validacion !== 'pendiente'), false, 'other inbox requires explicit pending validation');
assert.equal(classified.otras.some((patient) => F.isEnfermeriaPatient(patient)), false, 'other inbox excludes Enfermeria');

const pendingByCip = new Map();
for (const patient of classified.otras) {
  const ids = pendingByCip.get(patient.cip) || [];
  ids.push(...patient.rawValidations.filter((item) => item.resultado_validacion === 'pendiente').map((item) => item.validacion_id));
  pendingByCip.set(patient.cip, ids);
}
assert.equal([...pendingByCip.values()].some((ids) => ids.length > 1), false, 'no CIP has multiple ambiguous pending validations');

assert.match(indexHtml + indexSource, /Preparación prebiológica — solicitudes de Enfermería/);
assert.match(indexHtml, /Otras validaciones farmacéuticas pendientes/);
assert.match(indexHtml, /Dataset sintético WO8/);
assert.match(indexHtml, /Generado desde Excel operativo/);
assert.doesNotMatch(indexHtml + indexSource, /Bandeja operativa alimentada por Excel de Enfermería,\s*Excel de Farmacia y demo fallback\./);
assert.doesNotMatch(indexSource, /return ['"]demo['"]/);
assert.match(indexSource, /board\.classList\.toggle\(['"]hidden['"],\s*!filtered\.length\)/);
assert.match(indexSource, /data-inbox-cip/);

execFileSync('git', ['diff', '--quiet', '6d86025a8c973d0e9e11b3811b525368972795b7', '--',
  'data/demo/farmacia/farmacia_wo8_runtime_v1.json',
  'tools/generate_farmacia_wo8_runtime_dataset.mjs'
], { cwd: ROOT });

console.log('farmacia_inicio_bandejas_contract_check: PASSED');
