#!/usr/bin/env node
'use strict';

// Check focal del filtro «Líneas activas» de Estadísticas (#691, contrato
// docs/contracts/FARMACIA_ESTADISTICAS_FILTROS_COHORTE_CONTRACT.md §7).
// Decisión de Sil (08-11-2026): punto de evaluación = último acto del
// paciente; se cuentan líneas DISTINTAS por `line_id`, con su última foto
// (la del acto más reciente de `events[]`). Solo cuenta `active_at_event === true`;
// `null` = desconocida y NO se deduce su cierre por aparecer otro nombre.
// Opciones del filtro: '1', '2', '3plus'. Solo datos sintéticos.

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
const ln = (lineId, eventId, active, extra) => Object.assign({
    line_id: lineId, source_event_id: eventId, active_at_event: active,
    activity_state: active === true ? 'active' : (active === false ? 'inactive' : 'not_recorded')
}, extra || {});
const rec = (id, events, lines) => ({ patient_id: id, events, lines });

test('API pública', () => {
    assert.strictEqual(typeof Cohort.concurrentLineCount, 'function');
    assert.strictEqual(typeof Cohort.concurrentFilterOptions, 'function');
    assert.strictEqual(typeof Cohort.concurrentMatches, 'function');
});

test('A: dos líneas activas (primaria + concomitante) → 2', () => {
    const p = rec('A', [ev('e1', '2026-01-10')], [
        ln('L1', 'e1', true, { line_role: 'primary', is_primary_line: true }),
        ln('L2', 'e1', true, { line_role: 'concomitant' })]);
    assert.strictEqual(Cohort.concurrentLineCount(p), 2);
    assert.strictEqual(Cohort.concurrentMatches(p, '2'), true);
    assert.strictEqual(Cohort.concurrentMatches(p, '1'), false);
    assert.strictEqual(Cohort.concurrentMatches(p, '3plus'), false);
});

test('B: una activa y otra inactiva → 1 (la inactiva no cuenta)', () => {
    const p = rec('B', [ev('e1', '2026-01-10')], [ln('L1', 'e1', true), ln('L2', 'e1', false)]);
    assert.strictEqual(Cohort.concurrentLineCount(p), 1);
    assert.strictEqual(Cohort.concurrentMatches(p, '1'), true);
    assert.strictEqual(Cohort.concurrentMatches(p, '2'), false);
});

test('D: línea con active_at_event null NO se cuenta ni se cierra por nombre nuevo', () => {
    const p = rec('D', [ev('e1', '2026-01-10'), ev('e2', '2026-02-10')], [
        ln('L1', 'e1', true), ln('L2', 'e1', null, { drug_name: 'Fármaco viejo' }),
        ln('L1', 'e2', true), ln('L3', 'e2', true, { drug_name: 'Fármaco nuevo' })]);
    // L1 activa, L3 activa; L2 sigue desconocida (no se cuenta ni se da por cerrada, pero tampoco suma)
    assert.strictEqual(Cohort.concurrentLineCount(p), 2);
    const q = rec('Q', [ev('e1', '2026-01-10'), ev('e2', '2026-02-10')], [
        ln('L1', 'e1', true), ln('L2', 'e1', null), ln('L1', 'e2', true)]);
    assert.strictEqual(Cohort.concurrentLineCount(q), 1, 'null no suma');
});

test('Duplicados por acto: misma línea en varios actos cuenta UNA vez, con su última foto', () => {
    const p = rec('DUP', [ev('e1', '2026-01-10'), ev('e2', '2026-02-10'), ev('e3', '2026-03-10')], [
        ln('L1', 'e1', true), ln('L1', 'e2', true), ln('L1', 'e3', true),
        ln('L2', 'e1', true), ln('L2', 'e2', false)]);
    assert.strictEqual(Cohort.concurrentLineCount(p), 1, 'L2 cerrada en su última foto (e2); L1 una vez');
});

test('Última foto = por orden de events[], no por id ni por orden del array de líneas', () => {
    const p = rec('ORD', [ev('z9', '2026-01-10'), ev('a1', '2026-02-10')], [
        ln('L1', 'a1', false), ln('L1', 'z9', true)]);
    assert.strictEqual(Cohort.concurrentLineCount(p), 0, 'a1 es posterior a z9');
});

test('3 o más: tres y cuatro líneas activas → 3plus', () => {
    const three = rec('T3', [ev('e1', '2026-01-10')], [ln('L1', 'e1', true), ln('L2', 'e1', true), ln('L3', 'e1', true)]);
    const four = rec('T4', [ev('e1', '2026-01-10')], [ln('L1', 'e1', true), ln('L2', 'e1', true), ln('L3', 'e1', true), ln('L4', 'e1', true)]);
    assert.strictEqual(Cohort.concurrentMatches(three, '3plus'), true);
    assert.strictEqual(Cohort.concurrentMatches(four, '3plus'), true);
    assert.strictEqual(Cohort.concurrentMatches(four, '2'), false);
});

test('Cero líneas activas / sin líneas / sin events: no entra en ninguna opción, no lanza', () => {
    const none = rec('N', [], []);
    const off = rec('O', [ev('e1', '2026-01-10')], [ln('L1', 'e1', false)]);
    [none, off, {}, null, undefined].forEach((p) => {
        assert.strictEqual(Cohort.concurrentLineCount(p), 0);
        ['1', '2', '3plus'].forEach((v) => assert.strictEqual(Cohort.concurrentMatches(p, v), false));
    });
});

test('Línea sin source_event_id conocido en events[]: se trata como foto más antigua, no lanza', () => {
    const p = rec('X', [ev('e1', '2026-01-10')], [ln('L1', 'huerfano', true), ln('L1', 'e1', false)]);
    assert.strictEqual(Cohort.concurrentLineCount(p), 0);
});

test('Opciones: solo las presentes, en orden 1,2,3plus', () => {
    const a = rec('A', [ev('e1', '2026-01-10')], [ln('L1', 'e1', true), ln('L2', 'e1', true)]);
    const b = rec('B', [ev('e1', '2026-01-10')], [ln('L1', 'e1', true)]);
    assert.deepStrictEqual(Cohort.concurrentFilterOptions([a, b]), ['1', '2']);
    assert.deepStrictEqual(Cohort.concurrentFilterOptions([]), []);
    assert.deepStrictEqual(Cohort.concurrentFilterOptions(undefined), []);
});

test('Valor de filtro inválido lanza TypeError CONCURRENT_FILTER_INVALID', () => {
    assert.throws(() => Cohort.concurrentMatches(rec('A', [], []), '5'), (e) => e instanceof TypeError && e.message === 'CONCURRENT_FILTER_INVALID');
    assert.throws(() => Cohort.concurrentMatches(rec('A', [], []), ''), TypeError);
});

test('No se infiere por nombre: mismo fármaco con otra línea distinta son dos líneas', () => {
    const p = rec('NAME', [ev('e1', '2026-01-10')], [
        ln('L1', 'e1', true, { drug_name: 'Fármaco X' }), ln('L2', 'e1', true, { drug_name: 'Fármaco X' })]);
    assert.strictEqual(Cohort.concurrentLineCount(p), 2);
});

console.log(`farmacia_statistics_concurrent_filter_check: ${passed} OK`);
