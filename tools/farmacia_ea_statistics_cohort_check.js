#!/usr/bin/env node
'use strict';

// Check focal EA v1 demo (#867), Tramo D3c-1: la cohorte de Estadísticas lleva
// el modelo de EA nuevo por paciente y ofrece funciones puras para filtrar y
// contar (decisiones de Sil, 29-10-2026):
//  - Los filtros EA (sospechoso, método) se aplican a TODA la población: un
//    paciente entra si tiene ≥1 episodio que cumple.
//  - El sospechoso se muestra con el nombre de fármaco registrado en la línea
//    del paciente cuyo `line_id` es la referencia; si no hay un nombre único
//    registrado, la referencia tal cual. Unión declarada, sin inferir.
//  - Lo antiguo de EA en Estadísticas se sustituye por esto (D3c-2, página).
// Tres denominadores: pacientes / episodios / observaciones. Ausente ≠ NO: un
// paciente sin filas 166 es «not_recorded», nunca «sin EA».

const assert = require('assert');

const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { P1, P2, source } = mixed;
const screen = global.HubTools.farmaciaEaScreenModel;
const Cohort = global.FarmaciaStatisticsCohort;

let passed = 0;
const test = (label, fn) => {
    try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
    passed += 1;
};
const byId = (cohort, id) => cohort.find(record => record.patient_id === id);
const noActive = value => {
    for (const text of JSON.stringify(value).match(/"[^"]*"/g) || []) {
        assert.ok(!/activ/i.test(text), `no debe aparecer «activo»: ${text}`);
    }
};

test('fromEnvelope: una sola regla envelope V2 → { status, model? }', () => {
    const env = global.FarmaciaPatientReadContractV2.create({ source: source() }).readAdverseEventEpisodes(P1.pid);
    assert.equal(env.outcome, 'ok');
    const ok = screen.fromEnvelope(env);
    assert.equal(ok.status, 'ok');
    assert.deepEqual(ok.model, screen.build(Object.assign({ ok: true }, env.value)));
    assert.deepEqual(screen.fromEnvelope({ outcome: 'not_found' }), { status: 'not_found' });
    assert.deepEqual(screen.fromEnvelope({ outcome: 'unavailable' }), { status: 'unavailable' });
    assert.deepEqual(screen.fromEnvelope(undefined), { status: 'unavailable' });
    assert.deepEqual(screen.fromEnvelope(null), { status: 'unavailable' });
    assert.deepEqual(screen.fromEnvelope({ outcome: 'error' }), { status: 'error' });
    assert.deepEqual(screen.fromEnvelope({ outcome: 'partial', value: env.value }), { status: 'error' });
    const broken = JSON.parse(JSON.stringify(env));
    broken.value.state.episodes = [];
    assert.deepEqual(screen.fromEnvelope(broken), { status: 'error' }, 'modelo no construible = error, no dato parcial');
});

test('buildRawCohort adjunta ea_episodes y ea_suspect_labels por paciente', () => {
    const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
    assert.equal(cohort.length, 3);
    const m1 = byId(cohort, P1.pid);
    const m2 = byId(cohort, P2.pid);
    const legacy = cohort.find(record => record.primary_identifier_value === 'CIP-LEGACY-003');
    assert.equal(m1.ea_episodes.status, 'ok');
    assert.deepEqual(m1.ea_episodes.model.counts, { episodes: 2, observations: 3 });
    assert.deepEqual(m1.ea_suspect_labels, { 'LINE-A': 'SINTETICO' });
    assert.equal(m2.ea_episodes.status, 'ok');
    assert.deepEqual(m2.ea_suspect_labels, { 'LINE-Z': 'OTRO SINTETICO' });
    assert.deepEqual(legacy.ea_episodes, { status: 'not_found' }, 'sin filas 166: no leído, nunca «sin EA»');
    assert.deepEqual(legacy.ea_suspect_labels, {});
    // Lo antiguo del registro no cambia (CSV y otros consumidores).
    assert.ok(Object.prototype.hasOwnProperty.call(m1, 'adverse_event_overall_status'));
    // El payload del handoff sigue siendo válido con los campos nuevos.
    global.FarmaciaStatisticsHandoff._test.validatePayload({
        contract_version: Cohort.VERSION, source_mode: 'raw', source_file_name: 'mixto.xlsx', imported_at: '',
        patient_count: cohort.length, event_count: 0, cohort: JSON.parse(JSON.stringify(cohort))
    });
});

test('sin contrato V2 o sin modelo de pantalla → unavailable', () => {
    const saved = global.FarmaciaPatientReadContractV2;
    try {
        delete global.FarmaciaPatientReadContractV2;
        const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
        assert.deepEqual(byId(cohort, P1.pid).ea_episodes, { status: 'unavailable' });
        assert.deepEqual(byId(cohort, P1.pid).ea_suspect_labels, {});
    } finally {
        global.FarmaciaPatientReadContractV2 = saved;
    }
    const savedScreen = global.HubTools.farmaciaEaScreenModel;
    try {
        delete global.HubTools.farmaciaEaScreenModel;
        assert.deepEqual(byId(Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' }), P1.pid).ea_episodes, { status: 'unavailable' });
    } finally {
        global.HubTools.farmaciaEaScreenModel = savedScreen;
    }
});

test('el nombre del sospechoso solo sale de una línea declarada con nombre único', () => {
    const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
    const m1 = JSON.parse(JSON.stringify(byId(cohort, P1.pid)));
    assert.deepEqual(Cohort.eaSuspectLabels(m1.ea_episodes.model, m1.lines), { 'LINE-A': 'SINTETICO' });
    assert.deepEqual(Cohort.eaSuspectLabels(m1.ea_episodes.model, []), { 'LINE-A': 'LINE-A' }, 'sin línea: referencia tal cual');
    const conflict = [{ line_id: 'LINE-A', drug_name: 'SINTETICO' }, { line_id: 'LINE-A', drug_name: 'OTRO' }];
    assert.deepEqual(Cohort.eaSuspectLabels(m1.ea_episodes.model, conflict), { 'LINE-A': 'LINE-A' }, 'nombres distintos: no se elige');
    assert.deepEqual(Cohort.eaSuspectLabels(m1.ea_episodes.model, [{ line_id: 'LINE-A', drug_name: '' }]), { 'LINE-A': 'LINE-A' });
});

test('eaCategory: cuatro categorías, ausente ≠ NO', () => {
    const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
    const m1 = byId(cohort, P1.pid);
    assert.equal(Cohort.eaCategory(m1), 'episodes');
    const empty = { ea_episodes: { status: 'ok', model: Object.assign({}, m1.ea_episodes.model, { episodes: [], counts: { episodes: 0, observations: 0 } }) } };
    assert.equal(Cohort.eaCategory(empty), 'no_episodes');
    assert.equal(Cohort.eaCategory({ ea_episodes: { status: 'not_found' } }), 'not_recorded');
    assert.equal(Cohort.eaCategory({ ea_episodes: { status: 'unavailable' } }), 'not_recorded');
    assert.equal(Cohort.eaCategory({}), 'not_recorded', 'registro demo sin modelo nuevo');
    assert.equal(Cohort.eaCategory({ ea_episodes: { status: 'error' } }), 'error');
    assert.equal(Cohort.eaCategory({ ea_episodes: { status: 'ok' } }), 'error', 'ok sin modelo utilizable es error');
});

test('eaFilterOptions: nombres de sospechoso y métodos declarados', () => {
    const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
    assert.deepEqual(Cohort.eaFilterOptions(cohort), { suspects: ['OTRO SINTETICO', 'SINTETICO'], methods: ['naranjo'] });
    assert.deepEqual(Cohort.eaFilterOptions([]), { suspects: [], methods: [] });
});

test('eaMatches: filtro de población a nivel de episodio', () => {
    const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
    const ids = filters => cohort.filter(record => Cohort.eaMatches(record, filters)).map(record => record.patient_id).sort();
    const legacyId = cohort.find(record => record.primary_identifier_value === 'CIP-LEGACY-003').patient_id;
    assert.deepEqual(ids({}), [legacyId, P1.pid, P2.pid].sort(), 'sin filtros EA no se excluye a nadie');
    assert.deepEqual(ids(undefined), [legacyId, P1.pid, P2.pid].sort());
    assert.deepEqual(ids({ suspect: 'SINTETICO' }), [P1.pid]);
    assert.deepEqual(ids({ suspect: 'OTRO SINTETICO' }), [P2.pid]);
    assert.deepEqual(ids({ method: 'naranjo' }), [P1.pid]);
    assert.deepEqual(ids({ suspect: 'SINTETICO', method: 'naranjo' }), [P1.pid]);
    assert.deepEqual(ids({ suspect: 'OTRO SINTETICO', method: 'naranjo' }), [], 'método solo cuenta para su sospechoso');
    for (const bad of [{ gravedad: 'Grave' }, { suspect: '' }, { method: 3 }, 'x', []]) {
        assert.throws(() => Cohort.eaMatches(cohort[0], bad), /EA_FILTER_INVALID/);
    }
});

test('eaSummary: tres denominadores, estados y sospechosos de los episodios que cumplen', () => {
    const cohort = Cohort.buildRawCohort(source(), { fileName: 'mixto.xlsx' });
    const all = Cohort.eaSummary(cohort, {});
    assert.deepEqual(all, {
        patientsTotal: 3,
        patientsWithEpisodes: 2,
        episodes: 3,
        observations: 4,
        categories: { episodes: 2, no_episodes: 0, not_recorded: 1, error: 0 },
        states: { 'continúa': 1, 'sin evolución indicada': 2 },
        suspects: { 'SINTETICO': 1, 'OTRO SINTETICO': 1 }
    });
    noActive(all);
    const filtered = cohort.filter(record => Cohort.eaMatches(record, { suspect: 'SINTETICO' }));
    assert.deepEqual(Cohort.eaSummary(filtered, { suspect: 'SINTETICO' }), {
        patientsTotal: 1,
        patientsWithEpisodes: 1,
        episodes: 1,
        observations: 2,
        categories: { episodes: 1, no_episodes: 0, not_recorded: 0, error: 0 },
        states: { 'continúa': 1 },
        suspects: { 'SINTETICO': 1 }
    });
    // Ambiguo y cerrado: etiquetas literales del modelo, sin deducir.
    const odd = JSON.parse(JSON.stringify(byId(cohort, P1.pid)));
    Object.assign(odd.ea_episodes.model.episodes[0], { ambiguous: true, stateLabel: null });
    Object.assign(odd.ea_episodes.model.episodes[1], { closed: true, stateLabel: 'resuelto' });
    assert.deepEqual(Cohort.eaSummary([odd], {}).states, { 'último estado no determinable': 1, 'resuelto': 1 });
    assert.deepEqual(Cohort.eaSummary([], {}), {
        patientsTotal: 0, patientsWithEpisodes: 0, episodes: 0, observations: 0,
        categories: { episodes: 0, no_episodes: 0, not_recorded: 0, error: 0 }, states: {}, suspects: {}
    });
    const frozen = JSON.stringify(cohort);
    Cohort.eaSummary(cohort, { method: 'naranjo' });
    assert.equal(JSON.stringify(cohort), frozen, 'eaSummary no muta la cohorte');
});

console.log(`farmacia_ea_statistics_cohort_check OK (${passed} casos)`);
