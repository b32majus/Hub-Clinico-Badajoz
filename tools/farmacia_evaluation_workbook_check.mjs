#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workbookSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_evaluation_workbook.js'), 'utf8');
const ledgerSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_evaluation_ledger.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'farmacia_index.html'), 'utf8');

const listeners = {};
const sandbox = {
  console,
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Math,
  URLSearchParams,
  location: { pathname: '/farmacia_index.html' },
  document: {
    addEventListener(type, handler) { listeners[type] = handler; },
    getElementById() { return null; },
    querySelector() { return null; },
  },
  window: {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(workbookSource, sandbox, { filename: 'farmacia_evaluation_workbook.js' });

const api = sandbox.FarmaciaEvaluationWorkbook;
assert.ok(api, 'FarmaciaEvaluationWorkbook is exposed');
assert.deepEqual(Array.from(api.sheetOrder), [
  'METADATOS', 'PACIENTES', 'EVENTOS', 'VALIDACION', 'PRIMERA_VISITA', 'SEGUIMIENTO',
  'CAMPOS_FORMULARIO', 'DICCIONARIO_CAMPOS', 'LINEAS_TRATAMIENTO', 'EFECTOS_ADVERSOS', 'PAYLOAD_JSON'
]);

const base = {
  schema_version: '1.0.0',
  patient_id: 'SYN-PAT-ABC',
  synthetic_cip: 'CIP-FICTICIO-001',
  service_code: 'DERMA',
  service_label: 'Dermatología',
  pathology_code: 'HS',
  pathology_label: 'Hidradenitis supurativa',
  created_at: '2026-08-01T10:00:00Z',
  provenance: { storage: 'browser_local_storage', app_context: 'Demo', warning: 'Ficticio' },
  quality_flags: [],
};

const validation = {
  ...base,
  event_id: 'SYN-EVT-V1',
  source_event_id: 'pharmacy_validation:SYN-PAT-ABC:2026-08-01',
  event_type: 'pharmacy_validation',
  occurred_on: '2026-08-01',
  recorded_at: '2026-08-01T10:01:00Z',
  visit_id: 'SYN-VIS-V1',
  line_ids: ['LINE-1'],
  source_page: 'farmacia_validacion.html',
  record_status: 'completado',
  payload: {
    form_state: [
      { key_kind: 'id', key: 'fhManualCip', label: 'CIP', tag: 'INPUT', type: 'text', value: 'CIP-FICTICIO-001', visible: true, disabled: false },
      { key_kind: 'id', key: 'fhValidadoJustificacion', label: 'Observaciones de Farmacia Hospitalaria', tag: 'TEXTAREA', type: 'textarea', value: '=SUM(1,1)', visible: true, disabled: false },
      { key_kind: 'id', key: 'fhHSBioAda', label: 'Adalimumab', tag: 'INPUT', type: 'checkbox', value: 'on', checked: false, visible: true, disabled: false },
    ],
    domain: {
      validation_export_data: {
        lineaActual: { line_id: 'LINE-1', farmaco_nombre: 'Fármaco ficticio', dosis_texto: '100 mg', via: 'SC', pauta_codigo: 'CADA_3_SEMANAS' },
      },
    },
  },
};

const firstVisit = {
  ...base,
  event_id: 'SYN-EVT-PV1',
  source_event_id: 'pharmacy_first_visit:SYN-PAT-ABC:2026-08-02',
  event_type: 'pharmacy_first_visit',
  occurred_on: '2026-08-02',
  recorded_at: '2026-08-02T10:01:00Z',
  visit_id: 'SYN-VIS-PV1',
  line_ids: ['LINE-1'],
  source_page: 'farmacia_primera_visita.html',
  record_status: 'recorded',
  payload: {
    form_state: [
      { key_kind: 'id', key: 'fhPvCip', label: 'CIP', tag: 'INPUT', type: 'text', value: 'CIP-FICTICIO-001', visible: true, disabled: false },
      { key_kind: 'name', key: 'dlqi_q1', label: 'DLQI 1', tag: 'INPUT', type: 'radio', value: '0', checked: true, visible: true, disabled: false },
      { key_kind: 'name', key: 'dlqi_q1', label: 'DLQI 1', tag: 'INPUT', type: 'radio', value: '1', checked: false, visible: true, disabled: false },
    ],
    domain: {
      primary_treatment: { line_id: 'LINE-1', farmaco_nombre: 'Fármaco ficticio', dosis_texto: '100 mg', via: 'SC' },
    },
  },
};

const followUp = {
  ...base,
  event_id: 'SYN-EVT-S1',
  source_event_id: 'pharmacy_follow_up:SYN-PAT-ABC:SYN-VIS-S1',
  event_type: 'pharmacy_follow_up',
  occurred_on: '2026-08-03',
  recorded_at: '2026-08-03T10:01:00Z',
  visit_id: 'SYN-VIS-S1',
  line_ids: ['LINE-1', 'LINE-2'],
  source_page: 'farmacia_seguimiento.html',
  record_status: 'recorded',
  payload: {
    form_state: [
      { key_kind: 'id', key: 'fhSegCip', label: 'CIP', tag: 'INPUT', type: 'text', value: 'CIP-FICTICIO-001', visible: true, disabled: false },
      { key_kind: 'id', key: 'fhSegEvaDolor', label: 'EVA dolor', tag: 'INPUT', type: 'range', value: '0', visible: true, disabled: false },
    ],
    domain: {
      current_visit: { visit_id: 'SYN-VIS-S1' },
      selected_line: { line_id: 'LINE-1', farmaco_nombre: 'Fármaco A' },
      canonical_lines: [
        { line_id: 'LINE-1', farmaco_nombre: 'Fármaco A', estado_linea: 'activa' },
        { line_id: 'LINE-2', farmaco_nombre: 'Fármaco B', estado_linea: 'activa' },
      ],
      related_treatments: [{ line_id: 'REL-1', farmaco_nombre: 'Concomitante ficticio' }],
      adverse_event: {
        ea_id: 'EA-1',
        presente: true,
        descripcion: 'Evento ficticio',
        sospechosos: [{ suspect_id: 'SUS-1', line_id: 'LINE-1', naranjo: 4 }],
      },
    },
  },
};

const events = [validation, firstVisit, followUp];
const model = api.buildWorkbookModel(events, { schema_version: '1.0.0', ledger_type: 'synthetic_local_evaluation' });
assert.equal(model.PACIENTES.length, 1, 'one synthetic patient is grouped');
assert.equal(model.PACIENTES[0].numero_actos, 3, 'patient contains three acts');
assert.equal(model.EVENTOS.length, 3, 'all events are summarized');
assert.equal(model.VALIDACION.length, 1);
assert.equal(model.PRIMERA_VISITA.length, 1);
assert.equal(model.SEGUIMIENTO.length, 1);
assert.equal(model.CAMPOS_FORMULARIO.length, 8, 'all form controls are preserved in long form');
assert.ok(model.DICCIONARIO_CAMPOS.some((row) => row.key === 'fhValidadoJustificacion' && row.label === 'Observaciones de Farmacia Hospitalaria'));
assert.equal(model.VALIDACION[0].fhValidadoJustificacion, "'=SUM(1,1)", 'formula-like text is neutralized');
assert.equal(model.PRIMERA_VISITA[0].dlqi_q1, '0', 'radio value 0 is preserved');
assert.equal(model.SEGUIMIENTO[0].fhSegEvaDolor, '0', 'string zero is preserved');
assert.equal(model.LINEAS_TRATAMIENTO.length, 6, 'validation, first visit and follow-up line sources are retained');
assert.equal(model.EFECTOS_ADVERSOS.length, 1, 'adverse event is retained');
assert.match(model.EFECTOS_ADVERSOS[0].sospechosos_json, /SUS-1/);
assert.equal(model.PAYLOAD_JSON.length, 3, 'lossless JSON row exists for each event');
assert.match(model.PAYLOAD_JSON[0].event_json, /fhValidadoJustificacion/);
assert.equal(api.safeCell('@SUM(A1)'), "'@SUM(A1)");
assert.equal(api.safeCell(false), false);
assert.match(api.filename(), /^PROMueve_FH_evaluacion_ficticia_\d{4}-\d{2}-\d{2}\.xlsx$/);

assert.match(ledgerSource, /function controlLabel\(control\)/, 'ledger captures a visible field label');
assert.match(ledgerSource, /label: controlLabel\(control\)/, 'captured label is stored in form state');
assert.match(indexHtml, /vendor\/sheetjs\/xlsx\.full\.min\.js/, 'SheetJS remains available for normal Excel imports');
assert.doesNotMatch(indexHtml, /scripts\/farmacia_evaluation_workbook\.js/, 'workbook module is not wired into normal Inicio Farmacia runtime');
assert.doesNotMatch(workbookSource, /innerHTML/, 'workbook UI avoids innerHTML');

console.log('farmacia_evaluation_workbook_check: PASSED');
console.log('11 sheets; complete controls; dynamic act sheets; lines; adverse events; JSON fallback; formula protection.');
