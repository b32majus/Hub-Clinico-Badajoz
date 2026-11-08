#!/usr/bin/env node
// Check focal del filtro «Ventana temporal» de Estadísticas (#690, contrato
// docs/contracts/FARMACIA_ESTADISTICAS_FILTROS_COHORTE_CONTRACT.md §6).
// Decisión de Sil (08-11-2026): dos campos Desde/Hasta (ambos opcionales,
// límites inclusivos). Fecha CLÍNICA estricta del acto: visit_date,
// first_visit_date, request_date, movement_effective_date. Nunca importación,
// nunca occurred_at/recorded_at. Un paciente entra si ALGÚN acto cae en la ventana.
// Sin fecha clínica = «no registrado»: no entra en ninguna ventana con límite.
// La parte de fecha (yyyy-mm-dd) se toma literal; no se convierte zona horaria.
// Solo datos sintéticos.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(path.join(ROOT, 'scripts/farmacia_statistics_cohort.js')).href);
const Cohort = globalThis.FarmaciaStatisticsCohort;

let passed = 0;
const test = (label, fn) => {
  try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
  passed += 1;
};

const event = (patientId, sourceId, type, occurredAt, row = {}) => ({
  patient_id: patientId, source_event_id: sourceId, event_id: `${sourceId}-event`, event_type: type,
  source_sheet: '01_DERMA', source_table: 'tblBridgeDermaInput',
  rows: [{ source_sheet: '01_DERMA', source_table: 'tblBridgeDermaInput', physical_row_number: 2,
    canonical_row: { patient_id: patientId, source_event_id: sourceId, event_id: `${sourceId}-event`, event_type: type, occurred_at: occurredAt, recorded_at: occurredAt, ...row } }]
});
const patients = {
  A: [event('A', 'a1', 'pharmacy_followup', '2026-01-15T10:00:00Z', { movement_effective_date: '2026-01-15' })],
  B: [event('B', 'b1', 'pharmacy_followup', '2026-02-01T10:00:00Z', { visit_date: '2026-01-01' })],
  C: [event('C', 'c1', 'pharmacy_followup', '2026-02-10T10:00:00Z', { visit_date: '2026-04-20' })],
  D: [event('D', 'd1', 'pharmacy_followup', '2026-02-10T10:00:00Z', {})],
  E: [event('E', 'e1', 'pharmacy_validation', '2026-03-31T23:30:00Z', { request_date: '2026-03-31T23:30:00Z' })],
  F: [event('F', 'f1', 'pharmacy_first_visit', '2026-02-02T10:00:00Z', { first_visit_date: '2026-02-02' }),
      event('F', 'f2', 'pharmacy_followup', '2026-05-02T10:00:00Z', { visit_date: '2026-05-02' })],
  G: [event('G', 'g1', 'pharmacy_followup', '2026-02-10T10:00:00Z', { visit_date: 'no es fecha' })]
};
const ids = Object.keys(patients);
const dataPort = {
  getPopulationProjection: () => ids.map((id) => ({ patient_id: id, identifiers: [], event_count: patients[id].length })),
  getPatientProjection: (id) => ({ patient_id: id, identifiers: [], services: [], pathologies: [], valid_event_count: patients[id].length, excluded_event_count: 0, source_error_count: 0, warnings: [] }),
  getPatientEvents: (id) => patients[id],
  getLatestRequestValidation: () => ({ latest_request: null, latest_validation: null }),
  getVisitsAndLines: () => ({ latest_first_visit: null, latest_followup: null, lines: [] }),
  getProms: () => [],
  getAdherence: () => [],
  getAdverseEventsAndCausality: () => ({ adverse_events: [], causality_assessments: [] })
};
// importedAt dentro de la ventana: nunca debe contar.
const cohort = Cohort.buildRawCohort(dataPort, { fileName: 'sintetico.xlsx', importedAt: '2026-02-15T10:00:00Z' });
const byId = Object.fromEntries(cohort.map((record) => [record.patient_id, record]));
const inWindow = (id, from, to) => Cohort.timeWindowMatches(byId[id], from, to);

test('API pública', () => {
  assert.equal(typeof Cohort.timeWindowMatches, 'function');
  assert.equal(typeof Cohort.timeWindowAvailable, 'function');
});

test('Cada acto lleva clinical_date estricta (sin occurred_at ni recorded_at)', () => {
  assert.equal(byId.A.events[0].clinical_date, '2026-01-15');
  assert.equal(byId.B.events[0].clinical_date, '2026-01-01');
  assert.equal(byId.D.events[0].clinical_date, '', 'solo occurred_at → sin fecha clínica');
  assert.equal(byId.E.events[0].clinical_date, '2026-03-31', 'datetime: parte de fecha literal, sin convertir zona');
  assert.equal(byId.G.events[0].clinical_date, '', 'texto no fecha → no registrado');
});

test('Ventana 01-01-2026 a 31-03-2026 (casos del contrato A-D)', () => {
  assert.equal(inWindow('A', '2026-01-01', '2026-03-31'), true, 'A: movement_effective_date dentro');
  assert.equal(inWindow('B', '2026-01-01', '2026-03-31'), true, 'B: límite inferior inclusivo');
  assert.equal(inWindow('C', '2026-01-01', '2026-03-31'), false, 'C: fecha clínica 20-04, importado dentro: no entra');
  assert.equal(inWindow('D', '2026-01-01', '2026-03-31'), false, 'D: solo occurred_at dentro: no entra');
});

test('Límite superior inclusivo (E el 31-03)', () => {
  assert.equal(inWindow('E', '2026-01-01', '2026-03-31'), true);
  assert.equal(inWindow('E', '2026-01-01', '2026-03-30'), false);
  assert.equal(inWindow('E', '2026-03-31', '2026-03-31'), true, 'ventana de un solo día');
});

test('Algún acto dentro basta (F tiene un acto dentro y otro fuera)', () => {
  assert.equal(inWindow('F', '2026-01-01', '2026-03-31'), true);
  assert.equal(inWindow('F', '2026-06-01', '2026-12-31'), false);
});

test('Ventana de un solo lado', () => {
  assert.equal(inWindow('A', '2026-01-15', ''), true);
  assert.equal(inWindow('A', '2026-01-16', ''), false);
  assert.equal(inWindow('A', '', '2026-01-15'), true);
  assert.equal(inWindow('A', '', '2026-01-14'), false);
  assert.equal(inWindow('A', undefined, undefined), true, 'sin límites: no filtra');
});

test('Sin fecha clínica no entra con límite, y entra sin ventana', () => {
  assert.equal(inWindow('D', '2000-01-01', ''), false);
  assert.equal(inWindow('G', '', '2099-12-31'), false);
  assert.equal(inWindow('D', '', ''), true, 'sin ventana, no se filtra');
});

test('Vacío: ventana sin pacientes dentro devuelve false para todos, sin lanzar', () => {
  ids.forEach((id) => assert.equal(inWindow(id, '1999-01-01', '1999-12-31'), false));
  assert.equal(Cohort.timeWindowMatches(null, '2026-01-01', ''), false);
  assert.equal(Cohort.timeWindowMatches({}, '2026-01-01', ''), false);
});

test('Límites inválidos o invertidos lanzan TypeError TIME_FILTER_INVALID', () => {
  const bad = (from, to) => assert.throws(() => inWindow('A', from, to), (e) => e instanceof TypeError && e.message === 'TIME_FILTER_INVALID');
  bad('2026-13-01', ''); bad('ayer', ''); bad('', '2026-02-30'); bad('2026-03-31', '2026-01-01'); bad('2026-1-1', '');
});

test('timeWindowAvailable: hay al menos un acto con fecha clínica', () => {
  assert.equal(Cohort.timeWindowAvailable(cohort), true);
  assert.equal(Cohort.timeWindowAvailable([byId.D, byId.G]), false);
  assert.equal(Cohort.timeWindowAvailable([]), false);
  assert.equal(Cohort.timeWindowAvailable(undefined), false);
});

test('Demo: los actos con fecha declarada (fecha) llevan clinical_date', () => {
  const demo = Cohort.buildDemoCohort({ pacientes: [{ cip: 'CIP-D1', episodios_asistenciales: [{ tipo: 'seguimiento', fecha: '2026-02-03' }], tratamientos: [] }] }, { fileName: 'demo.json', importedAt: '' });
  assert.equal(demo.length, 1);
  assert.equal(demo[0].events[0].clinical_date, '2026-02-03');
  assert.equal(Cohort.timeWindowMatches(demo[0], '2026-02-01', '2026-02-28'), true);
});

test('El import no cuenta: importedAt dentro de la ventana no hace entrar a C ni a D', () => {
  assert.equal(inWindow('C', '2026-02-01', '2026-02-28'), false);
  assert.equal(inWindow('D', '2026-02-01', '2026-02-28'), false);
});

console.log(`farmacia_statistics_time_window_check: ${passed} OK`);
