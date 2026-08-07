#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forbiddenAccess = { document: 0, fetch: 0, localStorage: 0, sessionStorage: 0 };
for (const name of Object.keys(forbiddenAccess)) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      forbiddenAccess[name] += 1;
      throw new Error(`FORBIDDEN_${name.toUpperCase()}_ACCESS`);
    }
  });
}
await import('../scripts/farmacia_longitudinal_raw_adapter.js');
const adapter = globalThis.FarmaciaLongitudinalRawAdapter;

const physical = canonical_row => ({ canonical_row });
function event(type, sourceId, eventId, date, idFields, rows) {
  return {
    event_type: type,
    source_event_id: sourceId,
    event_id: eventId,
    rows: rows.map((row, index) => physical({
      patient_id: 'patient-long-a',
      source_event_id: sourceId,
      event_id: eventId,
      row_index: index + 1,
      ...(type === 'pharmacy_first_visit' ? { first_visit_date: date } : { visit_date: date }),
      ...idFields,
      ...row
    }))
  };
}

const firstVisit = event('pharmacy_first_visit', 'source-first-a', 'event-first-a', '2026-01-10',
  { first_visit_id: 'first-a' }, [
    {
      line_id: 'line-a', treatment_id: 'treatment-a', line_role: 'primary', is_primary_line: true,
      line_status_at_event: 'active', active_at_event: true, line_drug_name: 'Fármaco sintético A',
      line_active_ingredient: 'Principio A', line_dose_text: '10 mg', line_route: 'SC', line_schedule_label: 'Cada 14 días'
    },
    {
      line_id: 'line-b', treatment_id: 'treatment-b', line_role: 'additional', is_primary_line: false,
      line_status_at_event: 'active', active_at_event: null, line_drug_name: 'Fármaco sintético B'
    }
  ]);
const followupOne = event('pharmacy_followup', 'source-follow-a-1', 'event-follow-a-1', '2026-02-10',
  { visit_id: 'follow-a-1' }, [
    {
      line_id: 'line-a', treatment_id: 'treatment-a', line_role: 'primary', is_primary_line: true,
      line_status_at_event: 'active', active_at_event: true, line_drug_name: 'Fármaco sintético A',
      therapeutic_movement_type: 'no_change_recorded'
    },
    {
      line_id: 'line-b', treatment_id: 'treatment-b', line_role: 'additional', is_primary_line: false,
      line_status_at_event: 'historical', active_at_event: false, line_drug_name: 'Fármaco sintético B',
      therapeutic_movement_type: 'schedule_change', new_schedule_label: 'Cada 21 días',
      movement_reason: 'Cambio explícito', movement_effective_date: '2026-02-12'
    }
  ]);
const followupTwo = event('pharmacy_followup', 'source-follow-a-2', 'event-follow-a-2', '2026-03-10',
  { visit_id: 'follow-a-2' }, [{
    line_id: 'line-a', treatment_id: 'treatment-a', line_role: 'primary', is_primary_line: true,
    line_status_at_event: 'active', active_at_event: null, line_drug_name: 'Fármaco sintético A',
    therapeutic_movement_type: 'dose_change', new_dose_text: '20 mg', movement_reason: 'Dosis explícita',
    movement_effective_date: null
  }]);
const followupThree = event('pharmacy_followup', 'source-follow-a-3', 'event-follow-a-3', '2026-04-10',
  { visit_id: 'follow-a-3' }, [{
    line_id: 'line-a', treatment_id: 'treatment-a', line_role: 'primary', is_primary_line: true,
    line_status_at_event: 'suspended', active_at_event: false, line_drug_name: 'Fármaco sintético A',
    therapeutic_movement_type: 'suspension', suspension_status: 'yes',
    suspension_reason: 'Suspensión explícita', suspension_effective_date: '2026-04-11'
  }]);

function promRecord(sourceId, eventId, rowIndex, measurements) {
  return { source_event_id: sourceId, event_id: eventId, row_index: rowIndex, values: { proms_json: { measurements } } };
}
function adherenceRecord(sourceId, eventId, result) {
  return {
    source_event_id: sourceId, event_id: eventId, row_index: 1,
    values: {
      adherence_collection_status: 'yes', adherence_instrument: 'Escala sintética',
      adherence_result: result, adherence_answers_json: [{ answer: result === '0' ? 0 : false }]
    }
  };
}
function adverseRecord(sourceId, eventId, description, action) {
  return {
    source_event_id: sourceId, event_id: eventId, row_index: 1,
    values: {
      adverse_event_id: 'ea-a', adverse_event_status: 'present', adverse_event_description: description,
      adverse_event_severity: null, adverse_event_resolution_status: 'not_recorded', adverse_event_action: action,
      adverse_event_suspects_json: [{ suspect_ref: 'line-a' }]
    }
  };
}
function causalityRecord(sourceId, eventId, method) {
  return {
    source_event_id: sourceId, event_id: eventId, row_index: 1,
    values: { causality_assessments_json: [{ adverse_event_id: 'ea-a', suspect_ref: 'line-a', method, assessed: false, score: 0 }] }
  };
}
function noIdAdverseRecord(sourceId, eventId) {
  return {
    source_event_id: sourceId, event_id: eventId, row_index: 1,
    values: {
      adverse_event_id: null, adverse_event_status: 'present', adverse_event_description: 'EA sin ID repetido',
      adverse_event_severity: null, adverse_event_resolution_status: 'not_recorded', adverse_event_action: null,
      adverse_event_suspects_json: []
    }
  };
}

const envelope = {
  version: '1.0.0',
  identifier: { identifier_system: 'urn:cip:synthetic', identifier_value: 'CIP-LONG-A' },
  patient_id: 'patient-long-a',
  generation: 'generation-a',
  patient_projection: { patient_id: 'patient-long-a', patient: { __farmaciaRawPatient: true, patient_id: 'patient-long-a', cip: 'CIP-LONG-A' } },
  explicit_data: {
    latest_request: { request_id: 'request-a', requested_drug_name: 'Solicitud sintética' },
    latest_validation: { validation_id: 'validation-a', validation_result: 'validated' },
    visits_and_lines: {
      visits: [firstVisit, followupOne, followupTwo, followupThree],
      latest_first_visit: firstVisit,
      latest_followup: followupThree,
      lines: [
        { source_event_id: 'source-follow-a-3', event_id: 'event-follow-a-3', line_id: 'line-a', treatment_id: 'treatment-a', snapshot: followupThree.rows[0].canonical_row },
        { source_event_id: 'source-follow-a-1', event_id: 'event-follow-a-1', line_id: 'line-b', treatment_id: 'treatment-b', snapshot: followupOne.rows[1].canonical_row }
      ]
    },
    proms: [
      promRecord('source-first-a', 'event-first-a', 1, [{ instrument: 'DLQI', value: 8, date: '2026-01-10' }]),
      promRecord('source-first-a', 'event-first-a', 2, [{ instrument: 'DLQI', value: 8, date: '2026-01-10' }]),
      promRecord('source-follow-a-1', 'event-follow-a-1', 1, [
        { instrument: 'DLQI', value: 0, date: '2026-02-10' },
        { instrument: 'PROM booleano', value: false, date: '2026-02-10' },
        { instrument: 'PROM ausente' }
      ])
    ],
    adherence: [
      adherenceRecord('source-follow-a-1', 'event-follow-a-1', '0'),
      adherenceRecord('source-follow-a-2', 'event-follow-a-2', false),
      {
        source_event_id: 'source-follow-a-3', event_id: 'event-follow-a-3', row_index: 1,
        values: { adherence_collection_status: 'not_recorded', adherence_instrument: null, adherence_result: null, adherence_answers_json: null }
      }
    ],
    safety: {
      adverse_events: [
        adverseRecord('source-follow-a-1', 'event-follow-a-1', 'EA inicial sintético', 'Observación'),
        adverseRecord('source-follow-a-2', 'event-follow-a-2', 'EA actualizado sintético', 'Seguimiento'),
        noIdAdverseRecord('source-no-id-1', 'event-no-id-1'),
        noIdAdverseRecord('source-no-id-2', 'event-no-id-2')
      ],
      causality_assessments: [
        causalityRecord('source-follow-a-1', 'event-follow-a-1', 'Explícita inicial'),
        causalityRecord('source-follow-a-2', 'event-follow-a-2', 'Explícita actualizada'),
        {
          source_event_id: 'source-follow-a-2', event_id: 'event-follow-a-2', row_index: 1,
          values: { causality_assessments_json: [{ method: 'Referencia explícita por acto' }] }
        }
      ]
    },
    validation_context: {},
    event_metadata: {
      'source-first-a': { visit_date: '2026-01-10' },
      'source-follow-a-1': { visit_date: '2026-02-10' },
      'source-follow-a-2': { visit_date: '2026-03-10' },
      'source-follow-a-3': { visit_date: '2026-04-10' },
      'source-no-id-1': { visit_date: '2026-05-10' },
      'source-no-id-2': { visit_date: '2026-06-10' }
    }
  },
  provenance: [], drafts: {}, dirty: false
};

const before = JSON.stringify(envelope);
const patient = adapter.buildFromEnvelope(envelope);
assert.equal(JSON.stringify(envelope), before, 'adapter does not mutate the envelope');
assert.deepEqual(forbiddenAccess, { document: 0, fetch: 0, localStorage: 0, sessionStorage: 0 });
assert.equal(patient.patient_id, 'patient-long-a');
assert.equal(patient.cip, 'CIP-LONG-A');
assert.equal(patient.visitas_fh.length, 4, 'one first visit plus three followups');
assert.deepEqual(patient.visitas_fh.map(visit => visit.source_event_id), [
  'source-first-a', 'source-follow-a-1', 'source-follow-a-2', 'source-follow-a-3'
], 'stable Data Port order is retained');
assert.equal(patient.visitas_fh[0].lineas.length, 2, 'the multiline act remains one visit');
assert.deepEqual(patient.visitas_fh.flatMap(visit => visit.lineas.map(line => line.active_at_event)), [true, null, true, false, null, false]);
assert.equal(patient.tratamientos.length, 2, 'current snapshots stay separate from act history');
assert.deepEqual(patient.tratamientos.map(line => Object.hasOwn(line, 'activo') ? line.activo : null), [false, false]);
assert.deepEqual(patient.movimientos_terapeuticos.map(item => item.type), ['schedule_change', 'dose_change', 'suspension']);
assert.equal(patient.movimientos_terapeuticos.some(item => item.type === 'no_change_recorded'), false);
const dose = patient.movimientos_terapeuticos.find(item => item.type === 'dose_change');
assert.equal(dose.effective_date, '');
assert.equal(dose.visit_date, '2026-03-10');
const suspension = patient.movimientos_terapeuticos.find(item => item.type === 'suspension');
assert.equal(suspension.reason, 'Suspensión explícita');
assert.equal(suspension.effective_date, '2026-04-11');
assert.equal(patient.tratamientos.every(line => line.fecha_inicio === '' && line.fecha_fin === ''), true);
assert.equal(patient.proms.length, 4, 'historical and simultaneous PROMs are complete without multiline duplicates');
assert.equal(patient.proms.some(prom => prom.valor === 0), true);
assert.equal(patient.proms.some(prom => prom.valor === false), true);
assert.equal(patient.proms.find(prom => prom.tipo_prom === 'PROM ausente').fecha, '', 'visit date is not used as PROM date');
assert.equal(Object.hasOwn(patient.proms.find(prom => prom.tipo_prom === 'PROM ausente'), 'valor'), false);
assert.deepEqual(patient.adherencia_historial.map(item => item.result), ['0', false, null]);
assert.equal(patient.adherencia, false, 'status-only records do not hide the latest explicit result');
assert.equal(patient.eventos_adversos.length, 3, 'same ID is grouped while separate no-ID acts remain separate');
assert.equal(patient.eventos_adversos[0].actualizaciones.length, 2, 'updates remain chronological');
assert.equal(patient.eventos_adversos[0].evaluaciones_causalidad.length, 3);
assert.equal(patient.causality_records.some(item => item.assessment.method === 'Referencia explícita por acto'), true);
assert.equal(patient.eventos_adversos.slice(1).every(item => item.ea_id === '' && item.actualizaciones.length === 1), true);
assert.deepEqual(patient.actividad_clinica, []);
assert.doesNotMatch(JSON.stringify(patient), /threshold|interpretaci[oó]n/i);
assert.throws(() => adapter.buildFromEnvelope({ ...envelope, patient_id: 'other-patient' }), /PATIENT_ID_MISMATCH/);

const source = readFileSync(path.join(ROOT, 'scripts/farmacia_longitudinal_raw_adapter.js'), 'utf8');
assert.doesNotMatch(source, /\bdocument\b|\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(/);
console.log('farmacia_longitudinal_raw_adapter_check: PASS (18 capabilities)');
