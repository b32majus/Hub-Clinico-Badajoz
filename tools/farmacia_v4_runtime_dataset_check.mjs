#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'data/demo/farmacia/farmacia_v4_scenario_manifest.json');
const RUNTIME_PATH = path.join(ROOT, 'data/demo/farmacia/farmacia_v4_runtime_v1.json');
const GENERATOR_PATH = path.join(ROOT, 'tools/generate_farmacia_v4_runtime_dataset.mjs');

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function byScenario(collection, scenarioId) {
  return collection.filter((item) => item.scenario_id === scenarioId);
}

const manifestBytes = fs.readFileSync(MANIFEST_PATH);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const runtimeText = fs.readFileSync(RUNTIME_PATH, 'utf8');
const runtime = JSON.parse(runtimeText);

assert.equal(manifest.synthetic, true);
assert.equal(runtime.metadata.synthetic, true);
assert.equal(runtime.metadata.schema, 'promueve.farmacia.v4.runtime');
assert.equal(runtime.metadata.status, 'generated_not_wired');
assert.equal(
  runtime.metadata.source_manifest_blob_sha,
  crypto.createHash('sha1').update(`blob ${manifestBytes.length}\0`).update(manifestBytes).digest('hex'),
  'runtime must identify the exact manifest blob'
);

const regenerated = spawnSync(process.execPath, [GENERATOR_PATH, '--stdout'], {
  cwd: ROOT,
  encoding: 'utf8'
});
assert.equal(regenerated.status, 0, regenerated.stderr || 'generator failed');
assert.equal(regenerated.stdout, runtimeText, 'runtime must be byte-for-byte deterministic');

const expectedIds = Array.from({ length: 12 }, (_, index) => `S${String(index + 1).padStart(2, '0')}`);
assert.deepEqual(manifest.scenarios.map((item) => item.scenario_id), expectedIds);
assert.deepEqual(runtime.scenario_states.map((item) => item.scenario_id), expectedIds);
assert.equal(runtime.persons.length, 12);
unique(runtime.persons.map((item) => item.patient_id), 'patient_id');
unique(runtime.persons.map((item) => item.cip), 'synthetic CIP');
assert.ok(runtime.persons.every((item) => /^FH-V4-\d{4}$/.test(item.cip)), 'all visible CIPs must be synthetic');

assert.equal(runtime.readiness.length, 3, 'S01-S03 are the only nursing readiness scenarios');
assert.equal(byScenario(runtime.readiness, 'S01')[0].status, 'BLOQUEADO');
assert.equal(byScenario(runtime.readiness, 'S02')[0].status, 'EN VIGILANCIA');
assert.equal(byScenario(runtime.readiness, 'S03')[0].status, 'OK FARMACIA');
assert.equal(byScenario(runtime.readiness, 'S04').length, 0, 'general request must not acquire nursing readiness');

assert.equal(runtime.treatment_requests.length, 6);
assert.equal(runtime.validation_acts.length, 4);
assert.equal(runtime.treatment_lines.length, 8);
unique(runtime.treatment_requests.map((item) => item.request_id), 'request_id');
unique(runtime.validation_acts.map((item) => item.validation_act_id), 'validation_act_id');
unique(runtime.treatment_lines.map((item) => item.line_id), 'line_id');

for (const act of runtime.validation_acts) {
  if (act.result === 'pending' || act.result === 'denied') {
    assert.equal(act.produced_line_id, null, `${act.result} validation cannot produce a line`);
    assert.equal(
      runtime.treatment_lines.some((line) => line.patient_id === act.patient_id),
      false,
      `${act.result} validation cannot coexist with a produced scenario line`
    );
  }
  if (act.result === 'validated') {
    const produced = runtime.treatment_lines.filter((line) => line.line_id === act.produced_line_id);
    assert.equal(produced.length, 1, 'validated act must reference one explicit line');
    assert.equal(produced[0].patient_id, act.patient_id);
    assert.equal(produced[0].status, 'validated_not_started');
    assert.equal(produced[0].start_date, null);
  }
}

for (const line of runtime.treatment_lines) {
  for (const field of ['dose_text', 'route', 'schedule', 'presentation', 'induction']) {
    assert.equal(line[field], null, `${line.line_id}.${field} must remain absent`);
  }
  if (line.provenance === 'validated_in_hub') {
    assert.equal(line.status, 'validated_not_started');
    assert.equal(line.start_date, null);
  }
  if (line.provenance === 'pre_hub_existing') {
    assert.ok(['active', 'historical'].includes(line.status), 'pre-Hub line status must be explicitly declared');
  }
}

for (const request of runtime.treatment_requests) {
  for (const field of ['dose_text', 'route', 'schedule', 'presentation', 'induction']) {
    assert.equal(request[field], null, `${request.request_id}.${field} must remain absent`);
  }
  assert.equal(['switch', 'add_on'].includes(request.request_type), false, 'switch/add-on are outside this runtime');
}

assert.deepEqual(byScenario(runtime.treatment_lines, 'S07').map((line) => line.status), ['validated_not_started']);
assert.deepEqual(byScenario(runtime.treatment_lines, 'S08').map((line) => line.status), ['validated_not_started']);
assert.equal(byScenario(runtime.treatment_lines, 'S08')[0].start_date, null, 'S08 start transition has not happened yet');
assert.deepEqual(byScenario(runtime.treatment_lines, 'S09').map((line) => line.status), ['active']);
assert.deepEqual(byScenario(runtime.treatment_lines, 'S10').map((line) => line.status).sort(), ['active', 'historical']);
assert.deepEqual(byScenario(runtime.treatment_lines, 'S11').map((line) => line.status).sort(), ['active', 'active', 'historical']);
assert.equal(byScenario(runtime.treatment_lines, 'S12').length, 0, 'unsaved context scenario must not fabricate a line');

assert.deepEqual(runtime.visits, []);
assert.deepEqual(runtime.followups, []);
assert.deepEqual(runtime.adverse_events, []);
assert.equal(JSON.stringify(runtime).includes('CIP-DEMO-FH-'), false);
assert.equal(JSON.stringify(runtime).includes('Paciente Demo FH-'), false);

console.log(
  `farmacia_v4_runtime_dataset_check: PASSED ` +
  `${runtime.persons.length} persons, ${runtime.treatment_requests.length} requests, ` +
  `${runtime.validation_acts.length} validations, ${runtime.treatment_lines.length} lines`
);
