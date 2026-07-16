#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  'farmacia_index.html',
  'farmacia_validacion.html',
  'farmacia_primera_visita.html',
  'farmacia_seguimiento.html',
  'farmacia_dashboard_paciente.html',
  'farmacia_dashboard_longitudinal.html'
];
const unauthorizedPages = [
  'farmacia_actividad_servicio.html',
  'farmacia_estadisticas.html',
  'farmacia_farmacos.html',
  'farmacia_profesionales.html'
];

for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const dataSource = html.indexOf('scripts/farmacia_data_source.js');
  const common = html.indexOf('scripts/farmacia_common.js');
  assert.ok(dataSource >= 0, `${page} loads farmacia_data_source.js`);
  assert.ok(dataSource < common, `${page} loads data source before common`);
}

for (const page of unauthorizedPages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  assert.ok(!html.includes('scripts/farmacia_data_source.js'), `${page} remains unchanged by WO8 runtime wiring`);
}

const common = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_common.js'), 'utf8');
assert.ok(!/const\s+patients\s*=\s*\{/.test(common), 'hardcoded patient object is removed');
assert.ok(!common.includes('CIP-DEMO-FH-'), 'legacy CIPs are removed from common');
assert.ok(!common.includes('Paciente Demo FH-'), 'legacy patient names are removed from common');
assert.ok(common.includes('dataSource.ready'), 'common waits for the canonical ready gate');
assert.ok(common.includes('loadFarmaciaDataSource'), 'common can bootstrap the data source for unchanged HTML consumers');
assert.ok(common.includes('whenReady:'), 'common exposes the shared canonical readiness helper');

const statistics = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_estadisticas.js'), 'utf8');
assert.ok(!statistics.includes('generateSyntheticPatients'), 'parallel synthetic patient generator is physically removed');
assert.ok(!statistics.includes('seededRandom'), 'parallel deterministic random generator is physically removed');

const consumers = [
  'scripts/farmacia_index.js',
  'scripts/farmacia_primera_visita.js',
  'scripts/farmacia_seguimiento.js',
  'scripts/farmacia_dashboard_paciente.js',
  'scripts/farmacia_estadisticas.js',
  'scripts/farmacia_validacion.js',
  'scripts/farmacia_dashboard_longitudinal.js'
];
for (const relative of consumers) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  assert.ok(!source.includes('CIP-DEMO-FH-'), `${relative} has no legacy CIP`);
  assert.ok(!source.includes('Paciente Demo FH-'), `${relative} has no legacy patient name`);
  assert.ok(!/patient\.farmaco(?!_solicitado)/.test(source), `${relative} has no generic patient.farmaco fallback`);
}

const readyConsumers = consumers.filter((relative) => relative !== 'scripts/farmacia_estadisticas.js');
readyConsumers.push('scripts/farmacia_actividad_servicio.js');
for (const relative of readyConsumers) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  assert.ok(source.includes('F.whenReady('), `${relative} uses shared rejection handling`);
  assert.ok(!source.includes('F.ready.then'), `${relative} has no unhandled ready chain`);
}

for (const relative of ['scripts/farmacia_dashboard_paciente.js', 'scripts/farmacia_dashboard_longitudinal.js']) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  assert.ok(!source.includes('farmacia_longitudinal_demo_v0_3.json'), `${relative} has no legacy longitudinal URL`);
}

console.log('farmacia_wo8_runtime_wiring_check: PASSED');
