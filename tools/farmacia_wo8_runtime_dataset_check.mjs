#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_PATH = path.join(ROOT, 'data/demo/farmacia/farmacia_wo8_runtime_v1.json');
const SOURCE_PATH = 'templates/farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx';
const SOURCE_HASH = 'ef743757c43f36cf6209133f49a12705e67cba489f4ce5586acd146ea4046e6e';

assert.ok(fs.existsSync(DATASET_PATH), 'runtime dataset must exist');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
assert.deepEqual(dataset.metadata, {
  schema: 'farmacia_wo8_runtime_v1',
  source: SOURCE_PATH,
  hash: SOURCE_HASH,
  synthetic: true
});
assert.equal(dataset.persons.length, 40, '40 unique synthetic persons');
assert.equal(dataset.acts.length, 43, 'all 43 pharmacy acts are preserved');
assert.equal(dataset.acts.filter((item) => item.patient_id === 'FH-SYN-REU-001').length, 2, 'repeated REUMA patient acts are not collapsed');
assert.equal(dataset.treatment_lines.filter((item) => item.patient_id === 'FH-SYN-REU-001').length, 2, 'explicit multi-treatment case is preserved');
assert.equal(dataset.validations.length, 17, 'all rows with explicit validation data are preserved even when IDs are absent');
assert.equal(dataset.adverse_events.length, 4, 'only rows with explicit adverse-event IDs become adverse events');
for (const key of ['persons', 'acts', 'validations', 'treatment_lines', 'visits', 'followups', 'adverse_events']) {
  assert.ok(Array.isArray(dataset[key]), `${key} must be an array`);
}
assert.ok(dataset.acts.some((item) => item.visita_id === null), 'missing IDs remain null');
assert.ok(!JSON.stringify(dataset).includes('CIP-DEMO-FH-'), 'legacy CIPs are absent');
assert.ok(!JSON.stringify(dataset).includes('Paciente Demo FH-'), 'legacy patient names are absent');

const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_data_source.js'), 'utf8');

function loadDataSource(fetchImpl) {
  const window = {};
  const context = vm.createContext({ window, fetch: fetchImpl, Promise, Error, Object, Array, String, console });
  vm.runInContext(source, context, { filename: 'farmacia_data_source.js' });
  return window.FarmaciaDataSource;
}

const api = loadDataSource(async () => ({ ok: true, json: async () => dataset }));
await api.ready;
assert.equal(api.findPersonByCip('demo-cip-reu-001').patient_id, 'FH-SYN-REU-001', 'CIP lookup is case-insensitive');
assert.equal(api.findPersonById('FH-SYN-REU-001').cip, 'DEMO-CIP-REU-001', 'patient ID lookup works');
assert.equal(api.getActsByPatientId('FH-SYN-REU-001').length, 2, 'act query preserves repeated rows');
assert.equal(api.getTreatmentLinesByPatientId('FH-SYN-REU-001').length, 2, 'line query preserves multi-treatment rows');
assert.equal(api.findPersonByCip('UNKNOWN-CIP'), null, 'unknown CIP returns null');
const longitudinal = api.getLongitudinalDataset();
assert.equal(longitudinal.pacientes.length, 40, 'longitudinal adapter exposes all canonical persons');
const longitudinalReu = longitudinal.pacientes.find((person) => person.cip === 'DEMO-CIP-REU-001');
assert.equal(longitudinalReu.tratamientos.length, 2, 'longitudinal adapter preserves both explicit REUMA lines');
for (const key of ['episodios_asistenciales', 'tratamientos', 'cambios_pauta', 'proms', 'actividad_clinica', 'eventos_adversos', 'adherencia']) {
  assert.ok(Array.isArray(longitudinalReu[key]), `longitudinal ${key} keeps the renderer collection contract`);
}

for (const invalid of [
  { ...dataset, metadata: { ...dataset.metadata, hash: 'wrong' } },
  { ...dataset, metadata: { ...dataset.metadata, synthetic: false } }
]) {
  const invalidApi = loadDataSource(async () => ({ ok: true, json: async () => invalid }));
  await assert.rejects(invalidApi.ready, /No se pudo cargar el dataset sintético de Farmacia\./);
  assert.equal(invalidApi.getPersons().length, 0, 'invalid dataset exposes no clinical data');
}

const failedApi = loadDataSource(async () => { throw new Error('blocked'); });
await assert.rejects(failedApi.ready, /No se pudo cargar el dataset sintético de Farmacia\./);
assert.equal(failedApi.getPersons().length, 0, 'load failure has zero fallback');

const serialized = fs.readFileSync(DATASET_PATH);
console.log(`farmacia_wo8_runtime_dataset_check: PASSED sha256=${crypto.createHash('sha256').update(serialized).digest('hex')}`);
