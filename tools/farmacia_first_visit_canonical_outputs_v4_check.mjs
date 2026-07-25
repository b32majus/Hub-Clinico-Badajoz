#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const identity = require(path.join(ROOT, 'scripts/farmacia_first_visit_identity_v4.js'));
const outputs = require(path.join(ROOT, 'scripts/farmacia_first_visit_exports_v4.js'));
const html = fs.readFileSync(path.join(ROOT, 'farmacia_primera_visita.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_first_visit_exports_v4.js'), 'utf8');
const excelSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_excel_row_export.js'), 'utf8');

const patientId = 'patient-canonical-003';
const lineId = 'line-canonical-003';
const validationId = 'validation-canonical-003';
const startDate = '2026-07-23';

function baseState() {
  return { patients: { [patientId]: { validation_acts: { [validationId]: {
    validation_act_id: validationId, patient_id: patientId, request_id: 'request-canonical-003',
    produced_line_id: lineId, result: 'validated'
  } }, lines: { [lineId]: {
    line_id: lineId, patient_id: patientId, source_request_id: 'request-canonical-003', source_validation_act_id: validationId,
    relationship: 'primary', status: 'active', provenance: 'validated_in_hub',
    catalog_identity: { selected_drug_id: 'catalog-explicit-003', source_type: 'CIMA', national_code: 'CN-DEMO-003', registration_number: 'NR-DEMO-003' },
    catalog_snapshot: {}, drug_name: 'Fármaco validado demo', active_ingredient: 'Principio demo', dose_text: 'Dosis explícita',
    presentation: 'Presentación explícita', route: 'SC', pauta_codigo: 'SEMANAL', pauta_label: 'Semanal', pauta_otro_texto: '',
    start_date: startDate, end_date: '', created_at: '', updated_at: ''
  } }, movements: { start003: {
    movement_id: 'start003', patient_id: patientId, movement_type: 'start', target_line_id: lineId,
    effective_at: startDate, validation_act_id: validationId, declared_by_demo: 'Profesional FH-01'
  } } } } };
}

function clone(value) { return structuredClone(value); }
function makeElement(value = '') {
  const attrs = new Map();
  return { value, disabled: false, textContent: '', setAttribute(k, v) { attrs.set(k, String(v)); }, getAttribute(k) { return attrs.get(k) ?? null; }, removeAttribute(k) { attrs.delete(k); } };
}
function actualExcelHelper() {
  const sandbox = { window: {}, navigator: { clipboard: { writeText() { return Promise.resolve(); } } }, document: {} };
  vm.runInNewContext(excelSource, sandbox);
  return sandbox.window.FarmaciaExcelRowExport;
}
function envFor(state = baseState()) {
  const elements = {
    fhPvCip: makeElement('CIP-VISIBLE-003'), fhPvInduccionRealizada: makeElement('No'), fhPvEstratificacion: makeElement('Nivel 2'), fhPvProms: makeElement('No'), fhPvNotas: makeElement('Nota explícita'),
    fhPvEvaDolorRange: makeElement('0'), fhPvEvaPruritoRange: makeElement('0'),
    fhPvCanonicalStatus: makeElement(), fhPvExportTxt: makeElement(), fhPvExportCsv: makeElement(), fhPvExcelExportBtn: makeElement()
  };
  let helperContext;
  let objectCalls = 0;
  let arrayCalls = 0;
  const excel = {
    buildExcelRowObject(context) {
      objectCalls += 1; helperContext = context;
      return { patient_id: context.patientId, cip_demo_o_hash: context.cip, visita_id: context.visitaId, validacion_id: context.validacionId,
        tratamiento_id: context.lineaActual.tratamiento_id, linea_id: context.lineaActual.linea_id, estado_linea: context.lineaActual.estado_linea,
        tipo_movimiento: context.lineaActual.tipo_movimiento, fecha_inicio: context.lineaActual.fecha_inicio, fecha_acto: context.fechaActo,
        profesional_fh: context.profesional, resultado_validacion: 'validado', marca_comercial: context.lineaActual.nombre_comercial,
        created_at: 'generated', updated_at: 'generated' };
    },
    buildExcelRowArray(row) { arrayCalls += 1; return Array.from({ length: 61 }, (_, i) => i === 0 ? row.patient_id : ''); },
    copyTSVRowToClipboard() {}, getServiceSheetName() { return '02_REUMA'; }
  };
  const env = {
    URLSearchParams, location: { search: `?patient_id=${patientId}&line_id=${lineId}&cip=CIP-DEMO-HASH-003&servicio=Reumatolog%C3%ADa` },
    sessionStorage: {}, FarmaciaFirstVisitIdentityV4: identity,
    FarmaciaMultitreatmentCore: { createSessionStore() { return { load() { return clone(state); } }; } },
    FarmaciaExcelRowExport: excel, FarmaciaDemo: { copyTextToClipboard() {}, downloadFile() {} },
    document: { answered: [], getElementById(id) { return elements[id] || null; }, querySelectorAll() { return this.answered; } }
  };
  return { env, elements, get helperContext() { return helperContext; }, get calls() { return { objectCalls, arrayCalls }; } };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function resolution(mutator) { const state = baseState(); mutator(state.patients[patientId]); return outputs.resolveActiveContext(envFor(state).env); }

test('01 pending is blocked with exact message/title contract', () => {
  const state = baseState(); const p = state.patients[patientId]; p.lines[lineId].status = 'validated_not_started'; p.lines[lineId].start_date = ''; p.movements = {};
  const fixture = envFor(state); const result = outputs.execute('jara', fixture.env);
  assert.equal(result.ok, false); assert.equal(result.message, outputs.PENDING_MESSAGE); assert.equal(fixture.elements.fhPvExportTxt.getAttribute('title'), outputs.PENDING_MESSAGE);
});
test('02 active line without start_date is blocked', () => assert.equal(resolution((p) => { p.lines[lineId].start_date = ''; }).ok, false));
test('03 active line without start movement is blocked', () => assert.equal(resolution((p) => { p.movements = {}; }).ok, false));
test('04 duplicate starts are blocked', () => assert.equal(resolution((p) => { p.movements.duplicate = clone(p.movements.start003); }).ok, false));
test('05 line patient mismatch is blocked', () => assert.equal(resolution((p) => { p.lines[lineId].patient_id = 'other'; }).ok, false));
test('06 line identity mismatch is blocked', () => assert.equal(resolution((p) => { p.lines[lineId].line_id = 'other'; }).ok, false));
test('07 validation patient mismatch is blocked', () => assert.equal(resolution((p) => { p.validation_acts[validationId].patient_id = 'other'; }).ok, false));
test('08 validation produced line mismatch is blocked', () => assert.equal(resolution((p) => { p.validation_acts[validationId].produced_line_id = 'other'; }).ok, false));
test('09 validation result mismatch is blocked', () => assert.equal(resolution((p) => { p.validation_acts[validationId].result = 'pending'; }).ok, false));
test('10 start validation mismatch is blocked', () => assert.equal(resolution((p) => { p.movements.start003.validation_act_id = 'other'; }).ok, false));
test('11 validation request mismatch is blocked', () => assert.equal(resolution((p) => { p.validation_acts[validationId].request_id = 'other'; }).ok, false));
test('12 coherent active exact line resolves', () => assert.equal(outputs.resolveActiveContext(envFor().env).ok, true));
test('13 JARA uses canonical date and identities without invented IDs', () => {
  const fixture = envFor(); const resolved = outputs.resolveActiveContext(fixture.env); const text = outputs.buildJaraText(outputs.buildCanonicalRecord(resolved, fixture.env, '2026-07-25T10:11:12Z'));
  assert.match(text, new RegExp(startDate)); assert.match(text, new RegExp(patientId)); assert.match(text, new RegExp(lineId)); assert.doesNotMatch(text, /visita_id|tratamiento_id|FH-PV-/i);
});
test('14 CSV has exactly the explicit columns and canonical date', () => {
  const fixture = envFor(); const csv = outputs.buildCsv(outputs.buildCanonicalRecord(outputs.resolveActiveContext(fixture.env), fixture.env));
  assert.equal(csv.split('\n')[0].split(',').length, 23); assert.deepEqual(outputs.CSV_COLUMNS, ['patient_id','cip_demo_o_hash','line_id','validation_act_id','request_id','line_status','relationship','drug_name','active_ingredient','dose_text','presentation','route','pauta_codigo','pauta_label','pauta_otro_texto','start_date','start_declared_by_demo','induccion_realizada','estratificacion','proms_basales','notas','generated_at','demo_flag']); assert.match(csv, new RegExp(startDate));
});
test('15 Excel calls both existing helpers and preserves 61 columns', () => {
  const fixture = envFor(); const resolved = outputs.resolveActiveContext(fixture.env); const result = outputs.buildExcel(outputs.buildCanonicalRecord(resolved, fixture.env), resolved, fixture.env);
  assert.equal(result.rowArray.length, 61); assert.deepEqual(fixture.calls, { objectCalls: 1, arrayCalls: 1 });
});
test('16 URL CIP takes precedence over a different visible CIP', () => { const f = envFor(); const record = outputs.buildCanonicalRecord(outputs.resolveActiveContext(f.env), f.env); assert.equal(record.cip_demo_o_hash, 'CIP-DEMO-HASH-003'); });
test('17 visible CIP is the fallback when URL CIP is absent', () => { const f = envFor(); f.env.location.search = `?patient_id=${patientId}&line_id=${lineId}`; const record = outputs.buildCanonicalRecord(outputs.resolveActiveContext(f.env), f.env); assert.equal(record.cip_demo_o_hash, 'CIP-VISIBLE-003'); });
test('18 CIP remains separate from patient_id when URL and visible CIP are absent', () => { const f = envFor(); f.env.location.search = `?patient_id=${patientId}&line_id=${lineId}`; f.elements.fhPvCip.value = ''; const record = outputs.buildCanonicalRecord(outputs.resolveActiveContext(f.env), f.env); assert.equal(record.patient_id, patientId); assert.equal(record.cip_demo_o_hash, ''); });
test('19 Excel preserves validation/line IDs and blanks visit/treatment', () => { const f = envFor(); const r = outputs.resolveActiveContext(f.env); outputs.buildExcel(outputs.buildCanonicalRecord(r, f.env), r, f.env); assert.equal(f.helperContext.validacionId, validationId); assert.equal(f.helperContext.lineaActual.linea_id, lineId); assert.equal(f.helperContext.visitaId, ''); assert.equal(f.helperContext.lineaActual.tratamiento_id, ''); });
test('20 empty catalog identity falls back field-by-field to populated snapshot', () => { const state = baseState(); const line = state.patients[patientId].lines[lineId]; line.catalog_identity = {}; line.catalog_snapshot = { selected_drug_id: 'snapshot-id', source_type: 'SNAPSHOT', national_code: 'snapshot-cn', registration_number: 'snapshot-nr', drug_name: 'snapshot-name', active_ingredient: 'snapshot-active' }; const f = envFor(state); const record = outputs.buildCanonicalRecord(outputs.resolveActiveContext(f.env), f.env); assert.deepEqual(record.catalog_identity, line.catalog_snapshot); });
test('21 absent therapy stays blank and untouched PROM defaults are not zero', () => { const state = baseState(); ['drug_name','active_ingredient','dose_text','presentation','route','pauta_codigo','pauta_label'].forEach((k) => { state.patients[patientId].lines[lineId][k] = ''; }); const f = envFor(state); const resolved = outputs.resolveActiveContext(f.env); assert.equal(outputs.buildCanonicalRecord(resolved, f.env).drug_name, ''); assert.equal(outputs.buildCanonicalRecord(resolved, f.env).dose_text, ''); f.elements.fhPvProms.value = 'Sí'; assert.equal(outputs.buildProms(f.env), 'Sí · Sin controles PROM completados'); assert.deepEqual(outputs.captureExcelProms(f.env), {}); f.env.FarmaciaExcelRowExport = actualExcelHelper(); const excel = outputs.buildExcel(outputs.buildCanonicalRecord(resolved, f.env), resolved, f.env); assert.equal(excel.rowObject.dosis_presentacion, ''); assert.equal(excel.rowArray[f.env.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('dosis_presentacion')], ''); assert.equal(excel.rowObject.eva_dolor, ''); assert.equal(excel.rowObject.dlqi, ''); });
test('22 actual Excel helper preserves only completed PROMs and explicit notes', () => {
  const f = envFor(); f.env.FarmaciaExcelRowExport = actualExcelHelper(); f.elements.fhPvProms.value = 'Sí';
  f.elements.fhPvEvaDolorRange.value = '0'; f.elements.fhPvEvaDolorRange.setAttribute('data-fh-pv-completed', 'true');
  f.env.document.answered = Array.from({ length: 10 }, (_, i) => { const input = makeElement(); input.name = `dlqi_q${i + 1}`; input.setAttribute('data-fh-pv-completed', 'true'); input.setAttribute('data-dlqi-q', String(i + 1)); input.setAttribute('data-dlqi-val', i === 0 ? '2' : '0'); return input; });
  const r = outputs.resolveActiveContext(f.env); const excel = outputs.buildExcel(outputs.buildCanonicalRecord(r, f.env), r, f.env);
  assert.equal(excel.rowObject.eva_dolor, '0'); assert.equal(excel.rowObject.dlqi, '2'); assert.equal(excel.rowObject.observaciones_generales, 'Nota explícita');
  assert.equal(excel.rowObject.estado_registro, 'completado'); assert.equal(excel.rowObject.resultado_validacion, 'validado');
  assert.doesNotMatch(excel.rowObject.observaciones_generales, /inducci|estratific|PROMs basales/i);
});
test('23 HTML neutralizes all three explicit selects', () => { ['fhPvInduccionRealizada','fhPvEstratificacion','fhPvProms'].forEach((id) => assert.match(html, new RegExp(`id="${id}"><option value="">Seleccionar\\.\\.\\.</option>`))); });
test('24 canonical builders contain no forbidden therapy resolution', () => { assert.doesNotMatch(source, /lines\s*\[\s*0\s*\]/); assert.doesNotMatch(source, /getCurrentPrimaryTreatment|FarmaciaCatalog|getSnapshot|selectedIndex/); });
test('25 capture absorbs blocked and success clicks before downstream listeners', () => {
  for (const active of [false, true]) { const state = baseState(); if (!active) { state.patients[patientId].lines[lineId].status = 'validated_not_started'; state.patients[patientId].lines[lineId].start_date = ''; state.patients[patientId].movements = {}; } const f = envFor(state); const flags = { prevented: 0, stopped: 0, immediate: 0 }; const event = { target: { id: 'fhPvExportTxt', closest() { return this; } }, preventDefault() { flags.prevented++; }, stopPropagation() { flags.stopped++; }, stopImmediatePropagation() { flags.immediate++; } }; outputs.captureClick(event, f.env); assert.deepEqual(flags, { prevented: 1, stopped: 1, immediate: 1 }); }
});
test('26 actual Excel helper preserves distinct explicit dose and presentation in their single cell', () => {
  const f = envFor(); f.env.FarmaciaExcelRowExport = actualExcelHelper(); const resolved = outputs.resolveActiveContext(f.env);
  const record = outputs.buildCanonicalRecord(resolved, f.env); record.dose_text = 'Record must not override line'; record.presentation = 'Record must not override line';
  const excel = outputs.buildExcel(record, resolved, f.env); const index = f.env.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('dosis_presentacion');
  assert.equal(excel.rowObject.dosis_presentacion, 'Dosis explícita · Presentación explícita'); assert.equal(excel.rowArray[index], 'Dosis explícita · Presentación explícita');
});
test('27 Q7 No trigger exports only its scored follow-up', () => {
  const f = envFor(); f.elements.fhPvProms.value = 'Sí'; const trigger = makeElement(); trigger.name = 'dlqi_q7_a'; trigger.setAttribute('data-dlqi-q', '7'); trigger.setAttribute('data-fh-pv-completed', 'true');
  const followup = makeElement(); followup.name = 'dlqi_q7_b'; followup.setAttribute('data-dlqi-q', '7'); followup.setAttribute('data-dlqi-val', '1'); followup.setAttribute('data-fh-pv-completed', 'true'); f.env.document.answered = [trigger, followup];
  const result = outputs.buildProms(f.env); assert.equal(result, 'Sí · DLQI Q7: 1'); assert.doesNotMatch(result, /No informado|Q7.*Q7/);
  [1,2,3,4,5,6,8,9,10].forEach((question) => { const answer = makeElement(); answer.setAttribute('data-dlqi-q', String(question)); answer.setAttribute('data-dlqi-val', '0'); answer.setAttribute('data-fh-pv-completed', 'true'); f.env.document.answered.push(answer); });
  assert.deepEqual(outputs.captureExcelProms(f.env), { dlqi: '1' });
});
test('28 incomplete Q7 No trigger is not exported as a result or zero', () => {
  const f = envFor(); f.elements.fhPvProms.value = 'Sí'; const trigger = makeElement(); trigger.name = 'dlqi_q7_a'; trigger.setAttribute('data-dlqi-q', '7'); trigger.setAttribute('data-fh-pv-completed', 'true'); f.env.document.answered = [trigger];
  assert.equal(outputs.buildProms(f.env), 'Sí · Sin controles PROM completados'); assert.deepEqual(outputs.captureExcelProms(f.env), {});
});
test('29 Q7 Yes keeps its score when a previously completed follow-up remains checked', () => {
  const f = envFor(); f.elements.fhPvProms.value = 'Sí';
  const answers = Array.from({ length: 10 }, (_, i) => { const input = makeElement(); input.name = `dlqi_q${i + 1}`; input.setAttribute('data-fh-pv-completed', 'true'); input.setAttribute('data-dlqi-q', String(i + 1)); input.setAttribute('data-dlqi-val', i === 6 ? '3' : '0'); return input; });
  const staleFollowup = makeElement(); staleFollowup.name = 'dlqi_q7_b'; staleFollowup.setAttribute('data-fh-pv-completed', 'true'); staleFollowup.setAttribute('data-dlqi-q', '7'); staleFollowup.setAttribute('data-dlqi-val', '1'); answers.splice(7, 0, staleFollowup); f.env.document.answered = answers;
  assert.deepEqual(outputs.captureExcelProms(f.env), { dlqi: '3' });
});

for (const item of tests) { await item.fn(); console.log(`ok ${item.name}`); }
assert.equal(tests.length, 29);
console.log('farmacia_first_visit_canonical_outputs_v4_check: PASSED_29_CASES');
