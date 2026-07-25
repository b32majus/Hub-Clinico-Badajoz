#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'scripts/farmacia_validation_export_truth_v4_transition_guard.js');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

function loadGuard({ patient, snapshot }) {
  const root = {
    FarmaciaDemo: {
      getQueryContext() {
        return { patient };
      }
    },
    FarmaciaMultitreatmentCore: {
      createSessionStore() {
        return { kind: 'memory-store' };
      }
    },
    FarmaciaValidationStateV4Model: {
      restoreDecision({ patientId }) {
        assert.equal(patientId, patient && patient.patient_id);
        return snapshot;
      }
    },
    sessionStorage: {},
    URLSearchParams
  };

  vm.runInNewContext(source, {
    window: root,
    globalThis: root,
    URLSearchParams
  }, { filename: SOURCE_PATH });

  return root.FarmaciaValidationTransitionGuardV4;
}

const patient = {
  cip: '000000003',
  patient_id: 'fhv4-import-nursing-000000003',
  servicio: 'Reumatología',
  servicioSlug: 'reumatologia',
  patologia: 'Artritis reumatoide'
};

const validated = {
  result: 'validated',
  produced_line_id: 'line_identity_handoff_001'
};

const api = loadGuard({ patient, snapshot: validated });
const href = api.buildFirstVisitHref();
const url = new URL(href, 'https://example.invalid/');

assert.equal(url.pathname, '/farmacia_primera_visita.html');
assert.equal(url.searchParams.get('cip'), patient.cip);
assert.equal(url.searchParams.get('patient_id'), patient.patient_id);
assert.equal(url.searchParams.get('line_id'), validated.produced_line_id);
assert.equal(url.searchParams.get('servicio'), patient.servicioSlug);
assert.equal(url.searchParams.get('patologia'), patient.patologia);
assert.equal(url.searchParams.get('entrada'), 'primera_visita');

assert.equal(loadGuard({ patient, snapshot: { result: 'pending', produced_line_id: '' } }).buildFirstVisitHref(), '', 'pending must not produce a First Visit href');
assert.equal(loadGuard({ patient, snapshot: { result: 'denied', produced_line_id: '' } }).buildFirstVisitHref(), '', 'denied must not produce a First Visit href');
assert.equal(loadGuard({ patient, snapshot: { result: 'validated', produced_line_id: '' } }).buildFirstVisitHref(), '', 'validated without produced_line_id must fail closed');
assert.equal(loadGuard({ patient: { ...patient, patient_id: '' }, snapshot: validated }).buildFirstVisitHref(), '', 'missing patient_id must fail closed');
assert.equal(loadGuard({ patient: null, snapshot: validated }).buildFirstVisitHref(), '', 'missing patient context must fail closed');

assert.match(source, /params\.set\('patient_id',\s*patientId\)/);
assert.match(source, /params\.set\('line_id',\s*lineId\)/);
assert.match(source, /decision\.produced_line_id/);
assert.doesNotMatch(source, /makeContextUrl\(/, 'canonical identity must not pass through the legacy URL helper');
assert.doesNotMatch(source, /lines\s*\[\s*0\s*\]/);

console.log('farmacia_first_visit_identity_handoff_v4_check: PASSED_CANONICAL_PATIENT_AND_LINE_ID');
