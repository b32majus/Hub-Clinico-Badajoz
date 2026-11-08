#!/usr/bin/env node
'use strict';

// Check focal de los filtros «Dosis», «Vía» y «Pauta» de Estadísticas
// (#687, #688, #689; contrato FARMACIA_ESTADISTICAS_FILTROS_COHORTE_CONTRACT §3-§5).
// Reglas: igualdad exacta de texto; la misma línea (line_id) con su última foto
// (acto más reciente de events[]); la dosis, vía y pauta de una línea cambian si un
// movimiento posterior de esa línea trae new_dose_text / new_route /
// new_schedule_code|label (el último movimiento no vacío manda). Los agregados
// *_values del paciente NO se usan. Vacío = «no registrado»: nunca entra.
// Pauta: valor de la línea = código si lo hay; si no, la etiqueta (la pauta libre
// hoy llega fundida con la etiqueta en lines[]). Solo datos sintéticos.

const assert = require('assert');
const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const Cohort = global.FarmaciaStatisticsCohort;

let passed = 0;
const test = (label, fn) => {
    try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
    passed += 1;
};
const ev = (id, date) => ({ source_event_id: id, event_date: date });
const ln = (lineId, eventId, extra) => Object.assign({
    line_id: lineId, source_event_id: eventId, active_at_event: true,
    dose_text: '', route: '', schedule_code: '', schedule_label: ''
}, extra || {});
const mv = (lineId, eventId, extra) => Object.assign({
    line_id: lineId, source_event_id: eventId, type: 'dose_change',
    new_dose_text: '', new_route: '', new_schedule_code: '', new_schedule_label: ''
}, extra || {});
const rec = (id, events, lines, movements) => ({
    patient_id: id, events, lines, therapeutic_movements: movements || []
});

test('API pública', () => {
    assert.strictEqual(typeof Cohort.lineFieldMatches, 'function');
    assert.strictEqual(typeof Cohort.lineFieldOptions, 'function');
});

test('DOSE A: una línea «5 mg/kg», filtro «5 mg/kg» → entra', () => {
    const p = rec('A', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { dose_text: '5 mg/kg' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5 mg/kg'), true);
});

test('DOSE B: igualdad exacta, «5.0 mg/kg» no equivale', () => {
    const p = rec('B', [ev('e1', '2026-01-10')], [
        ln('L1', 'e1', { dose_text: '5 mg/kg' }), ln('L2', 'e1', { dose_text: '10 mg/kg' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5.0 mg/kg'), false);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '10 mg/kg'), true);
});

test('DOSE C: new_dose_text de un movimiento posterior manda en la línea vigente', () => {
    const p = rec('C', [ev('e1', '2026-01-10'), ev('e2', '2026-03-10')],
        [ln('L1', 'e1', { dose_text: '5 mg/kg' })],
        [mv('L1', 'e2', { new_dose_text: '10 mg/kg' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '10 mg/kg'), true);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5 mg/kg'), false);
});

test('DOSE C2: un movimiento con new_dose_text vacío no borra la dosis', () => {
    const p = rec('C2', [ev('e1', '2026-01-10'), ev('e2', '2026-03-10')],
        [ln('L1', 'e1', { dose_text: '5 mg/kg' })],
        [mv('L1', 'e2', { new_dose_text: '' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5 mg/kg'), true);
});

test('DOSE C3: la última foto de la línea manda sobre una anterior', () => {
    const p = rec('C3', [ev('e1', '2026-01-10'), ev('e2', '2026-03-10')], [
        ln('L1', 'e1', { dose_text: '5 mg/kg' }), ln('L1', 'e2', { dose_text: '8 mg/kg' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '8 mg/kg'), true);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5 mg/kg'), false);
});

test('DOSE D: un agregado *_values del paciente no cuenta', () => {
    const p = rec('D', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { dose_text: '10 mg/kg' })]);
    p.dose_text_values = '5 mg/kg | 10 mg/kg';
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5 mg/kg'), false);
});

test('DOSE E: dosis en blanco → no registrado, no entra', () => {
    const p = rec('E', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { drug_name: 'X' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'dose', '5 mg/kg'), false);
});

test('ROUTE A/B/C/D', () => {
    const iv = rec('A', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { route: 'IV' })]);
    const intra = rec('B', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { route: 'Intravenosa' })]);
    const two = rec('C', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { route: 'IV' }), ln('L2', 'e1', { route: 'oral' })]);
    const none = rec('D', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { drug_name: 'X' })]);
    assert.strictEqual(Cohort.lineFieldMatches(iv, 'route', 'IV'), true);
    assert.strictEqual(Cohort.lineFieldMatches(intra, 'route', 'IV'), false);
    assert.strictEqual(Cohort.lineFieldMatches(two, 'route', 'IV'), true);
    assert.strictEqual(Cohort.lineFieldMatches(none, 'route', 'IV'), false);
});

test('ROUTE: new_route de un movimiento posterior manda', () => {
    const p = rec('R', [ev('e1', '2026-01-10'), ev('e2', '2026-03-10')],
        [ln('L1', 'e1', { route: 'IV' })], [mv('L1', 'e2', { new_route: 'SC' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'route', 'SC'), true);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'route', 'IV'), false);
});

test('SCHED A/B/C/E', () => {
    const code = rec('A', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { schedule_code: 'Q14D' })]);
    const label = rec('B', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { schedule_label: 'cada dos semanas' })]);
    const free = rec('C', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { schedule_label: 'a las 8 h si tiene fiebre' })]);
    const none = rec('E', [ev('e1', '2026-01-10')], [ln('L1', 'e1')]);
    assert.strictEqual(Cohort.lineFieldMatches(code, 'schedule', 'Q14D'), true);
    assert.strictEqual(Cohort.lineFieldMatches(label, 'schedule', 'Q14D'), false);
    assert.strictEqual(Cohort.lineFieldMatches(label, 'schedule', 'cada dos semanas'), true);
    assert.strictEqual(Cohort.lineFieldMatches(free, 'schedule', 'a las 8 h si tiene fiebre'), true);
    assert.strictEqual(Cohort.lineFieldMatches(none, 'schedule', 'Q14D'), false);
});

test('SCHED D: new_schedule_code del movimiento manda (pauta actual)', () => {
    const p = rec('D', [ev('e1', '2026-01-10'), ev('e2', '2026-03-10')],
        [ln('L1', 'e1', { schedule_code: 'Q14D' })], [mv('L1', 'e2', { new_schedule_code: 'Q7D' })]);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'schedule', 'Q7D'), true);
    assert.strictEqual(Cohort.lineFieldMatches(p, 'schedule', 'Q14D'), false);
});

test('Opciones: valores distintos con datos, ordenados, sin vacíos', () => {
    const a = rec('A', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { route: 'oral' }), ln('L2', 'e1', { route: 'IV' })]);
    const b = rec('B', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { route: 'IV' }), ln('L2', 'e1')]);
    assert.deepStrictEqual(Cohort.lineFieldOptions([a, b], 'route'), ['IV', 'oral']);
    assert.deepStrictEqual(Cohort.lineFieldOptions([], 'route'), []);
    assert.deepStrictEqual(Cohort.lineFieldOptions(null, 'route'), []);
});

test('Inválidos: campo desconocido o valor vacío lanzan LINE_FILTER_INVALID', () => {
    const p = rec('A', [ev('e1', '2026-01-10')], [ln('L1', 'e1', { route: 'IV' })]);
    assert.throws(() => Cohort.lineFieldMatches(p, 'otro', 'IV'), /LINE_FILTER_INVALID/);
    assert.throws(() => Cohort.lineFieldMatches(p, 'route', ''), /LINE_FILTER_INVALID/);
    assert.throws(() => Cohort.lineFieldMatches(p, 'route', 3), /LINE_FILTER_INVALID/);
});

test('Record nulo o sin líneas nunca lanza y no entra', () => {
    assert.strictEqual(Cohort.lineFieldMatches(null, 'route', 'IV'), false);
    assert.strictEqual(Cohort.lineFieldMatches({}, 'dose', '5 mg/kg'), false);
});

console.log(`line_fields_filter_check: ${passed} OK`);
