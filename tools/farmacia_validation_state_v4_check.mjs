#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = require(path.join(ROOT, 'scripts/farmacia_multitreatment_core.js'));
const stateApi = require(path.join(ROOT, 'scripts/farmacia_validation_state_v4_model.js'));

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function sourceFor({ result = null, line = null } = {}) {
  return {
    getRequestsByPatientId() {
      return [{
        request_id: 'fhv4-request-check', request_type: 'new_start', origin: 'imported_nursing',
        requested_drug_name: 'Upadacitinib', dose_text: null, route: null, schedule: null,
        presentation: null, induction: null
      }];
    },
    getValidationActsByPatientId() {
      if (!result) return [];
      return [{ validation_act_id: 'fhv4-validation-check', request_id: 'fhv4-request-check', result, produced_line_id: line ? line.line_id : null }];
    },
    getCanonicalLinesByPatientId() { return line ? [line] : []; }
  };
}

const storage = memoryStorage();
const store = core.createSessionStore(storage);
stateApi.seedPatientState({ core, store, dataSource: sourceFor(), patientId: 'fhv4-patient-check' });

const emptyIdentity = stateApi.emptyCatalogIdentity();
const blankExplicit = {
  saved_at: '2026-07-24T20:00:00.000Z',
  drug: { drug_name: 'Upadacitinib', active_ingredient: '', catalog_identity: emptyIdentity, catalog_snapshot: emptyIdentity },
  therapy: { dose_text: '', presentation: '', route: '', pauta_codigo: '', pauta_label: '', pauta_otro_texto: '' },
  line: { relationship: 'primary', drug_name: 'Upadacitinib', active_ingredient: '', dose_text: '', presentation: '', route: '', pauta_codigo: '', pauta_label: '', pauta_otro_texto: '', catalog_identity: emptyIdentity, catalog_snapshot: emptyIdentity, start_date: '', end_date: '' }
};

let saved = stateApi.saveDecision({
  core, store, patientId: 'fhv4-patient-check', result: 'pending', explicit: blankExplicit,
  observations: 'Pendiente de información', performedAt: '2026-07-24T20:01:00.000Z'
});
assert.equal(saved.validation_act.result, 'pending');
assert.equal(saved.validation_act.produced_line_id, '');
assert.equal(Object.keys(saved.patient.lines).length, 0);

saved = stateApi.saveDecision({
  core, store, patientId: 'fhv4-patient-check', result: 'denied', denialReason: 'Motivo sintético',
  explicit: blankExplicit, performedAt: '2026-07-24T20:02:00.000Z'
});
assert.equal(saved.validation_act.result, 'denied');
assert.equal(Object.keys(saved.patient.lines).length, 0);
assert.equal(stateApi.restoreDecision({ store, patientId: 'fhv4-patient-check' }).denial_reason, 'Motivo sintético');

saved = stateApi.saveDecision({
  core, store, patientId: 'fhv4-patient-check', result: 'validated', explicit: blankExplicit,
  performedAt: '2026-07-24T20:03:00.000Z'
});
assert.equal(saved.validation_act.result, 'validated');
assert.ok(saved.validation_act.produced_line_id);
assert.equal(saved.line.status, 'validated_not_started');
assert.equal(saved.line.start_date, '');
assert.equal(saved.line.dose_text, '');
assert.equal(saved.line.route, '');
assert.equal(saved.line.presentation, '');
assert.equal(Object.keys(saved.patient.lines).length, 1);

const repeated = stateApi.saveDecision({
  core, store, patientId: 'fhv4-patient-check', result: 'validated', explicit: blankExplicit,
  performedAt: '2026-07-24T20:04:00.000Z'
});
assert.equal(Object.keys(repeated.patient.lines).length, 1, 'repeated save must not create a second line');
assert.throws(() => stateApi.saveDecision({
  core, store, patientId: 'fhv4-patient-check', result: 'denied', denialReason: 'No permitido',
  explicit: blankExplicit, performedAt: '2026-07-24T20:05:00.000Z'
}), /cannot be downgraded/);

const bootstrap = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_data_source.js'), 'utf8');
assert.match(bootstrap, /farmacia_data_source_v4_core\.js/);
assert.match(bootstrap, /farmacia_index_v4_state_guard\.js/);
assert.match(bootstrap, /farmacia_import_mode_v4\.js/);
assert.match(bootstrap, /farmacia_multitreatment_core\.js/);
assert.match(bootstrap, /farmacia_validation_state_v4_model\.js/);
assert.match(bootstrap, /farmacia_import_validation_bridge_v4\.js/);
assert.match(bootstrap, /farmacia_validation_export_truth_v4_helpers\.js/);
assert.match(bootstrap, /farmacia_validation_export_truth_v4_state\.js/);
assert.match(bootstrap, /farmacia_validation_export_truth_v4_outputs\.js/);
assert.match(bootstrap, /farmacia_validation_export_truth_v4_ui\.js/);
assert.match(bootstrap, /farmacia_validation_state_v4_ui\.js/);
assert.match(bootstrap, /farmacia_validation_export_truth_v4_transition_guard\.js/);
assert.match(bootstrap, /farmacia_validation_state_v4_safety\.js/);
assert.doesNotMatch(bootstrap, /farmacia_wo8_runtime_v1/);

const writtenScripts = [];
vm.runInNewContext(bootstrap, {
  window: { location: { pathname: '/farmacia_validacion.html' } },
  document: { write(value) { writtenScripts.push(value); } }
});
assert.equal(writtenScripts.length, 13);
writtenScripts.forEach((markup) => assert.match(markup, /^<script src="[^"]+"><\/script>$/));

const stateSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validation_state_v4_model.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validation_state_v4_ui.js'), 'utf8');
const safetySource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_validation_state_v4_safety.js'), 'utf8');
const importModeSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_import_mode_v4.js'), 'utf8');
const importBridgeSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_import_validation_bridge_v4.js'), 'utf8');
const truthSource = ['helpers', 'state', 'outputs', 'ui', 'transition_guard'].map((part) => fs.readFileSync(path.join(ROOT, `scripts/farmacia_validation_export_truth_v4_${part}.js`), 'utf8')).join('\n');

assert.match(uiSource, /Guardar validación/);
assert.match(stateSource, /validated_not_started/);
assert.match(stateSource, /a validation that already produced a line cannot be downgraded/);
assert.doesNotMatch(stateSource, /start_date:\s*new Date/);
assert.match(safetySource, /fhValidadoInduccion/);
assert.match(safetySource, /select\.value = ""/);
assert.match(safetySource, /switch_cambio/);
assert.match(safetySource, /Catálogo: identidad y trazabilidad/);
assert.match(importModeSource, /qa_fixture/);
assert.match(importModeSource, /real_import/);
assert.match(importModeSource, /No hay pacientes demo de fallback/);
assert.match(importBridgeSource, /createTreatmentRequest/);
assert.match(importBridgeSource, /imported_nursing/);
assert.doesNotMatch(importBridgeSource, /dose_text:\s*['"][^'"]+/);

assert.match(truthSource, /Guarde primero la decisión de Validación/);
assert.match(truthSource, /stopImmediatePropagation/);
assert.match(truthSource, /validation_act_id/);
assert.match(truthSource, /validated_not_started/);
assert.match(truthSource, /patient\.patient_id/);
assert.match(truthSource, /dateParts/);
assert.match(truthSource, /Recencia analítica <3 meses/);
assert.match(truthSource, /Medicina preventiva/);
assert.match(truthSource, /analitica_reciente_explicit/);
assert.match(truthSource, /No existe una línea terapéutica validada/);
assert.match(truthSource, /acción explícita de anulación/);
assert.match(truthSource, /option\.disabled/);
assert.match(truthSource, /Hay cambios sin guardar/);
assert.match(truthSource, /aria-disabled/);

console.log('farmacia_validation_state_v4_check: PASSED_CANONICAL_EXPORT_AND_TRANSITION_GUARD');
