#!/usr/bin/env node
'use strict';

// Check focal del filtro «Validación» de Estadísticas (#684, contrato
// docs/contracts/FARMACIA_ESTADISTICAS_FILTROS_COHORTE_CONTRACT.md §2).
// Decisión de Sil (08-11-2026): «validación explícita» = `validation_result`
// `validated` de la ÚLTIMA validación del paciente. El filtro «Estado
// seguimiento» devuelve `followup` cuando hay seguimiento y oculta la
// validación; por eso la validación tiene su propio filtro, que no depende de
// `care_status`. Solicitado ≠ validado; ausente ≠ denegado. Solo datos sintéticos.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const Cohort = global.FarmaciaStatisticsCohort;

let passed = 0;
const test = (label, fn) => {
    try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
    passed += 1;
};
const rec = (id, result, careStatus, extra) => Object.assign({
    patient_id: id,
    care_status: careStatus || 'not_recorded',
    latest_validation: result === undefined ? undefined : { validation_result: result }
}, extra || {});

test('API pública: validationFilterOptions y validationMatches', () => {
    assert.strictEqual(typeof Cohort.validationFilterOptions, 'function');
    assert.strictEqual(typeof Cohort.validationMatches, 'function');
});

test('validated entra aunque el paciente tenga seguimiento (care_status followup)', () => {
    const patient = rec('P-A', 'validated', 'followup');
    assert.strictEqual(Cohort.validationMatches(patient, 'validated'), true);
    assert.strictEqual(Cohort.validationMatches(patient, 'pending'), false);
});

test('solicitado no es validado: pending no entra en validated', () => {
    const patient = rec('P-B', 'pending', 'pending', { latest_request: { requested_drug_name: 'Fármaco sintético' } });
    assert.strictEqual(Cohort.validationMatches(patient, 'validated'), false);
    assert.strictEqual(Cohort.validationMatches(patient, 'pending'), true);
});

test('denied es un estado propio, distinto de ausente', () => {
    const denied = rec('P-C', 'denied', 'denied');
    assert.strictEqual(Cohort.validationMatches(denied, 'denied'), true);
    assert.strictEqual(Cohort.validationMatches(denied, 'not_recorded'), false);
});

test('ausente, vacío o valor desconocido = not_recorded, nunca validated ni denied', () => {
    [rec('P-D1', undefined), rec('P-D2', ''), rec('P-D3', 'valor_raro'), { patient_id: 'P-D4' }].forEach(patient => {
        assert.strictEqual(Cohort.validationMatches(patient, 'not_recorded'), true, patient.patient_id);
        assert.strictEqual(Cohort.validationMatches(patient, 'validated'), false, patient.patient_id);
        assert.strictEqual(Cohort.validationMatches(patient, 'denied'), false, patient.patient_id);
    });
});

test('valor de filtro inválido lanza TypeError VALIDATION_FILTER_INVALID', () => {
    ['', 'followup', 'validado', null, undefined, 3].forEach(value => {
        assert.throws(() => Cohort.validationMatches(rec('P-E', 'validated'), value),
            error => error instanceof TypeError && /VALIDATION_FILTER_INVALID/.test(error.message));
    });
});

test('opciones: solo valores presentes, en orden fijo, sin inventar', () => {
    const records = [rec('P-1', 'pending'), rec('P-2', 'validated', 'followup'), rec('P-3', ''), rec('P-4', 'valor_raro')];
    assert.deepStrictEqual(Cohort.validationFilterOptions(records), ['validated', 'pending', 'not_recorded']);
    assert.deepStrictEqual(Cohort.validationFilterOptions([rec('P-5', 'denied')]), ['denied']);
    assert.deepStrictEqual(Cohort.validationFilterOptions([]), []);
    assert.deepStrictEqual(Cohort.validationFilterOptions(undefined), []);
});

test('cohorte real del libro mixto: care_status sigue en followup y la validación se lee aparte', () => {
    const cohort = Cohort.buildRawCohort(mixed.source(), { fileName: 'mixto.xlsx' });
    const pending = cohort.filter(record => Cohort.validationMatches(record, 'pending'));
    assert.strictEqual(pending.length, 1);
    assert.strictEqual(pending[0].patient_id, 'patient-mixed-001');
    assert.strictEqual(pending[0].care_status, 'followup');
    const none = cohort.filter(record => Cohort.validationMatches(record, 'not_recorded'));
    assert.strictEqual(none.length, 2);
    assert.strictEqual(cohort.filter(record => Cohort.validationMatches(record, 'validated')).length, 0);
});

test('el CSV no cambia: siguen 37 columnas', () => {
    assert.strictEqual(Cohort.CSV_COLUMNS.length, 37);
});

test('la página cablea el filtro con las funciones de la cohorte', () => {
    const html = fs.readFileSync(path.join(ROOT, 'farmacia_estadisticas.html'), 'utf8');
    const script = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_estadisticas.js'), 'utf8');
    assert.ok(/id="qf-validacion"[^>]*data-quick-filter="validacion"|data-quick-filter="validacion"[^>]*id="qf-validacion"/.test(html), 'select qf-validacion');
    assert.ok(/for="qf-validacion"[^>]*>\s*Validación\s*</.test(html), 'etiqueta «Validación»');
    assert.ok(/id="qf-estado"/.test(html) && />\s*Estado seguimiento\s*</.test(html), 'Estado seguimiento se conserva');
    assert.ok(/Cohort\.validationMatches\(/.test(script), 'matches usa validationMatches');
    assert.ok(/Cohort\.validationFilterOptions\(/.test(script), 'opciones desde validationFilterOptions');
    assert.ok(/qf-validacion/.test(script), 'se rellena el select');
    assert.ok(/validacion:\s*'Validación'/.test(script), 'chip de filtro activo');
});

console.log(`farmacia_statistics_validation_filter_check: ${passed} comprobaciones OK`);
