#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = path.join(ROOT, 'scripts/farmacia_first_visit_identity_v4.js');
const HTML_PATH = path.join(ROOT, 'farmacia_primera_visita.html');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    toggle(item, force) {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
      return values.has(item);
    },
    contains: (item) => values.has(item)
  };
}

function element({ textContent = '', value = '', classes = [] } = {}) {
  const attrs = new Map();
  return {
    textContent,
    value,
    disabled: false,
    readOnly: false,
    classList: classList(classes),
    setAttribute(name, valueToSet) { attrs.set(name, String(valueToSet)); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    removeAttribute(name) { attrs.delete(name); },
    addEventListener() {}
  };
}

const patientId = 'fhv4-import-nursing-000000003';
const lineId = 'line_confirm_start_001';
const validationId = 'val_confirm_start_001';
let confirmCalls = 0;
let state = {
  schema: 'farmaciaDemo.multitreatment.v1',
  patients: {
    [patientId]: {
      requests: {},
      validation_acts: {
        [validationId]: {
          validation_act_id: validationId,
          patient_id: patientId,
          request_id: 'req_confirm_start_001',
          produced_line_id: lineId,
          performed_at: '2026-07-25T10:00:00.000Z',
          result: 'validated',
          professional_demo_id: 'Profesional FH-01',
          observations: '',
          origin: 'imported_nursing',
          created_at: '2026-07-25T10:00:00.000Z'
        }
      },
      lines: {
        [lineId]: {
          line_id: lineId,
          patient_id: patientId,
          source_request_id: 'req_confirm_start_001',
          source_validation_act_id: validationId,
          relationship: 'primary',
          status: 'validated_not_started',
          provenance: 'validated_in_hub',
          drug_name: 'Upadacitinib',
          active_ingredient: '',
          start_date: ''
        }
      },
      movements: {},
      drafts: {},
      selected_line_id: ''
    }
  }
};

const elements = {
  fhPvCanonicalContext: element(),
  fhPvCanonicalStatus: element(),
  fhPvCanonicalPatientId: element(),
  fhPvCanonicalLineId: element(),
  fhPvCanonicalDrug: element(),
  fhPvCanonicalLineStatus: element(),
  fhPvCanonicalProfessional: element(),
  fhPvConfirmStart: element({ classes: ['hidden'] }),
  fhPvFecha: element(),
  currentProfessional: element({ textContent: 'Profesional FH-01' }),
  fhPvExportTxt: element(),
  fhPvExportCsv: element(),
  fhPvExcelExportBtn: element()
};

const core = {
  createSessionStore() {
    return {
      load() { return structuredClone(state); }
    };
  },
  confirmTreatmentStart(input) {
    confirmCalls += 1;
    assert.equal(input.patient_id, patientId);
    assert.equal(input.line_id, lineId);
    assert.equal(input.start_date, '2026-07-21');
    assert.equal(input.declared_by_demo, 'Profesional FH-01');
    assert.match(input.created_at, /^\d{4}-\d{2}-\d{2}T/);

    const movement = {
      movement_id: 'mov_start_confirm_001',
      patient_id: patientId,
      movement_type: 'start',
      target_line_id: lineId,
      from_line_id: '',
      to_line_id: '',
      base_line_id: '',
      effective_at: input.start_date,
      reason: '',
      validation_act_id: validationId,
      declared_by_demo: input.declared_by_demo,
      created_at: input.created_at
    };
    state = structuredClone(state);
    state.patients[patientId].lines[lineId].status = 'active';
    state.patients[patientId].lines[lineId].start_date = input.start_date;
    state.patients[patientId].movements[movement.movement_id] = movement;
    return {
      state: structuredClone(state),
      line: structuredClone(state.patients[patientId].lines[lineId]),
      movement: structuredClone(movement),
      idempotent: false
    };
  }
};

const root = {
  URLSearchParams,
  location: { search: `?cip=000000003&patient_id=${patientId}&line_id=${lineId}` },
  sessionStorage: {},
  FarmaciaMultitreatmentCore: core,
  FarmaciaDemo: { ready: Promise.resolve() },
  document: {
    getElementById(id) { return elements[id] || null; },
    addEventListener() {}
  }
};

vm.runInNewContext(source, { globalThis: root, window: root, URLSearchParams, Promise, Date }, { filename: SCRIPT_PATH });
const api = root.FarmaciaFirstVisitIdentityV4;

const initial = api.render(root);
assert.equal(initial.ok, true);
assert.equal(initial.line.status, 'validated_not_started');
assert.equal(elements.fhPvConfirmStart.classList.contains('hidden'), false);
assert.equal(elements.fhPvFecha.value, '', 'date must not be prefilled');

const missingDate = api.confirmStart(root);
assert.equal(missingDate.ok, false);
assert.equal(missingDate.code, 'START_DATE_REQUIRED');
assert.equal(confirmCalls, 0);
assert.equal(state.patients[patientId].lines[lineId].status, 'validated_not_started');

// Writing the date alone must not activate the line.
elements.fhPvFecha.value = '2026-07-21';
assert.equal(state.patients[patientId].lines[lineId].status, 'validated_not_started');
assert.equal(Object.keys(state.patients[patientId].movements).length, 0);

const confirmed = api.confirmStart(root);
assert.equal(confirmed.ok, true);
assert.equal(confirmed.code, 'START_CONFIRMED');
assert.equal(confirmCalls, 1);
assert.equal(state.patients[patientId].lines[lineId].line_id, lineId);
assert.equal(state.patients[patientId].lines[lineId].status, 'active');
assert.equal(state.patients[patientId].lines[lineId].start_date, '2026-07-21');
assert.equal(Object.keys(state.patients[patientId].lines).length, 1);
assert.equal(Object.keys(state.patients[patientId].movements).length, 1);
assert.equal(elements.fhPvCanonicalProfessional.textContent, 'Profesional FH-01');
assert.equal(elements.fhPvFecha.readOnly, true);
assert.equal(elements.fhPvConfirmStart.classList.contains('hidden'), true);

const repeated = api.confirmStart(root);
assert.equal(repeated.ok, false, 'active line must not be confirmed again by the UI');
assert.equal(confirmCalls, 1);
assert.equal(Object.keys(state.patients[patientId].movements).length, 1);

const restored = api.render(root);
assert.equal(restored.ok, true);
assert.equal(restored.line.status, 'active');
assert.equal(elements.fhPvFecha.value, '2026-07-21');
assert.equal(elements.fhPvCanonicalLineId.textContent, lineId);

assert.match(html, /id="fhPvConfirmStart"/);
assert.match(html, /Confirmar inicio de tratamiento/);
assert.match(html, /id="fhPvCanonicalProfessional"/);
assert.match(source, /confirmTreatmentStart\s*\(/);
assert.match(source, /start_date:\s*startDate/);
assert.match(source, /declared_by_demo:\s*professional/);
assert.doesNotMatch(source, /lines\s*\[\s*0\s*\]/);
assert.doesNotMatch(source, /fhPvFecha[^\n]+new Date/);

console.log('farmacia_first_visit_confirm_start_v4_check: PASSED_EXPLICIT_START_SAME_LINE_ONE_MOVEMENT');
