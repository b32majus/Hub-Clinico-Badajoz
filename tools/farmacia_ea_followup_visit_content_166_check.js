#!/usr/bin/env node
'use strict';

// Check focal EA v1 demo (#867), Tramo E1: la copia 166 de Seguimiento lleva
// la visita COMPLETA (decisiones de Sil, 31-10-2026; adenda C1 ampliada).
//  - Datos de la visita (estratificación, recogida de PROMs, valores de PROMs,
//    otros fármacos, observaciones generales) van UNA vez, en la fila
//    `followup_act`; `fh_act_id` agrupa fármacos y EA de la misma visita.
//  - Datos de cada línea (dispensación, movimiento, suspensión, observaciones,
//    adherencia) van en su fila `followup_line`.
//  - Nada se duplica en otras filas ni se rellena: ausente sigue ausente.
//  - Releído el libro, el camino antiguo (Dashboard/Estadísticas) ve la
//    visita, y el camino nuevo de EA sigue igual.
// Solo datos sintéticos.

const assert = require('assert');
const path = require('path');

const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { ROOT, P1, source } = mixed;
const quiet = fn => {
    const realConsole = global.console;
    global.console = { log() {}, warn() {}, error() {} };
    try { return fn(); } finally { global.console = realConsole; }
};
quiet(() => [
    'scripts/farmacia_bridge_raw_ea_v21_demo_context.js',
    'scripts/farmacia_bridge_raw_ea_v21_followup_adapter.js',
    'scripts/farmacia_bridge_raw_ea_v21_workbook_context.js'
].forEach(file => require(path.join(ROOT, file))));

const core = global.FarmaciaBridgeRawEaV21Core;
const adapter = global.FarmaciaBridgeRawEaV21FollowupAdapter;
const W = global.FarmaciaBridgeRawEaV21WorkbookContext;
const Contract = global.FarmaciaPatientReadContractV2;

let passed = 0;
const test = (label, fn) => {
    try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
    passed += 1;
};
const throwsCode = (fn, code) => assert.throws(fn, error => error && error.code === code, `se esperaba ${code}`);
const clone = value => JSON.parse(JSON.stringify(value));

const VISIT_FIELDS = ['stratification_review_status', 'previous_stratification_level', 'new_stratification_level',
    'stratification_change_reason', 'followup_proms_collection_status', 'visit_general_observations',
    'proms_json', 'related_treatments_json'];
const LINE_CONTENT_FIELDS = ['dispensation_status', 'dispensation_observations', 'specific_review_status',
    'specific_review_reason', 'therapeutic_movement_type', 'new_dose_text', 'new_schedule_code', 'new_schedule_label',
    'new_schedule_other_text', 'new_route', 'movement_reason', 'movement_effective_date', 'suspension_status',
    'suspension_reason', 'suspension_effective_date', 'line_observations', 'adherence_collection_status',
    'adherence_instrument', 'adherence_result', 'adherence_answers_json'];

const VISIT = {
    stratification_review_status: 'yes',
    new_stratification_level: 'Nivel 2',
    followup_proms_collection_status: 'yes',
    proms_json: [
        { instrument: 'EVA_DOLOR', value: 4, complete: true, answeredCount: 1 },
        { instrument: 'EVA_PRURITO', value: 2, complete: true, answeredCount: 1 }
    ],
    related_treatments_json: [{ relation: 'Concomitante', drug_name: 'SINTETICO CONCOMITANTE' }]
};
const LINE_CONTENT = {
    'LINE-A': {
        dispensation_status: 'dispensed',
        therapeutic_movement_type: 'no_change_recorded',
        line_observations: 'Sin incidencias (sintético)',
        adherence_collection_status: 'yes',
        adherence_instrument: 'morisky_green',
        adherence_result: 'adherente',
        adherence_answers_json: { q1: 'no', q2: 'si', q3: 'no', q4: 'no' }
    }
};
const ACT = {
    actId: 'ACT-E1-001', eventId: 'EVT-E1-001', sourceEventId: 'SRC-E1-001',
    visitId: 'VIS-E1-001', visitDate: '2026-10-31', recordedAt: '2026-10-31T09:30:00Z'
};

function contextP1(src = source()) {
    const identity = W.declaredPatientIdentity({
        patientId: P1.pid, identifierValue: P1.cip,
        events: src.getPatientEvents(P1.pid) || [],
        eaEnvelope: Contract.create({ source: src }).readAdverseEventEpisodes(P1.pid),
        lines: (src.getVisitsAndLines(P1.pid) || {}).lines || []
    });
    return W.buildActContext(identity, ACT, ['LINE-A']);
}
const projectionInput = (extra = {}) => Object.assign({
    context: contextP1(),
    present: 'si',
    adverseEvents: [{ episode_id: 'E30', observation_id: 'O30', status: 'incorporated', description: 'Mareo', suspect_ids: ['LINE-A'] }],
    history: [],
    selections: [],
    visit: clone(VISIT),
    lineContent: clone(LINE_CONTENT)
}, extra);

test('la visita va UNA vez en la fila del acto; cada línea lleva lo suyo', () => {
    const input = projectionInput();
    const frozen = JSON.stringify(input);
    const { rows } = adapter.buildFollowupRawProjection(input);
    assert.equal(JSON.stringify(input), frozen, 'no muta la entrada');
    const act = rows.filter(row => row.row_role === 'followup_act');
    const lines = rows.filter(row => row.row_role === 'followup_line');
    const others = rows.filter(row => row.row_role !== 'followup_act' && row.row_role !== 'followup_line');
    assert.equal(act.length, 1);
    assert.equal(lines.length, 1);
    assert.ok(others.length >= 1, 'filas EA');
    for (const field of VISIT_FIELDS) {
        const expected = Object.prototype.hasOwnProperty.call(VISIT, field) ? VISIT[field] : null;
        assert.deepEqual(act[0][field], expected, `acto.${field}`);
        for (const row of lines.concat(others)) assert.equal(row[field], null, `${row.row_role}.${field} no se duplica`);
    }
    for (const field of LINE_CONTENT_FIELDS) {
        const expected = Object.prototype.hasOwnProperty.call(LINE_CONTENT['LINE-A'], field) ? LINE_CONTENT['LINE-A'][field] : null;
        assert.deepEqual(lines[0][field], expected, `línea.${field}`);
        for (const row of act.concat(others)) assert.equal(row[field], null, `${row.row_role}.${field} solo en la línea`);
    }
    const rowSet = core.validateRowSet(rows);
    assert.ok(rowSet.valid, JSON.stringify(rowSet.errors));
});

test('sin visita ni contenido de línea: todo ausente, nada rellenado (compatibilidad)', () => {
    const input = projectionInput();
    delete input.visit;
    delete input.lineContent;
    const { rows } = adapter.buildFollowupRawProjection(input);
    for (const row of rows) {
        for (const field of VISIT_FIELDS.concat(LINE_CONTENT_FIELDS)) assert.equal(row[field], null, `${row.row_role}.${field}`);
    }
    const empty = adapter.buildFollowupRawProjection(projectionInput({ visit: {}, lineContent: {} })).rows;
    assert.deepEqual(empty.map(row => row.row_id), rows.map(row => row.row_id));
});

test('el adaptador rechaza contenido fuera de contrato', () => {
    const run = extra => () => adapter.buildFollowupRawProjection(projectionInput(extra));
    throwsCode(run({ visit: { gravedad: 'Grave' } }), 'UNKNOWN_VISIT_FIELD');
    throwsCode(run({ visit: { dispensation_status: 'dispensed' } }), 'UNKNOWN_VISIT_FIELD');
    throwsCode(run({ visit: [] }), 'INVALID_VISIT');
    throwsCode(run({ visit: { stratification_review_status: 'quizá' } }), 'INVALID_VISIT_VALUE');
    throwsCode(run({ visit: { proms_json: [{ instrument: 'EVA_DOLOR', value: 'alto' }] } }), 'INVALID_PROMS');
    throwsCode(run({ visit: { proms_json: [{ instrument: 'OTRO', value: 1 }] } }), 'INVALID_PROMS');
    throwsCode(run({ visit: { proms_json: [{ instrument: 'DLQI', value: 1 }, { instrument: 'DLQI', value: 2 }] } }), 'INVALID_PROMS');
    throwsCode(run({ visit: { proms_json: { instrument: 'DLQI', value: 1 } } }), 'INVALID_PROMS');
    throwsCode(run({ lineContent: { 'LINE-X': { dispensation_status: 'dispensed' } } }), 'LINE_CONTENT_UNKNOWN_LINE');
    throwsCode(run({ lineContent: { 'LINE-A': { new_stratification_level: 'Nivel 2' } } }), 'UNKNOWN_LINE_CONTENT_FIELD');
    throwsCode(run({ lineContent: { 'LINE-A': { dispensation_status: 'si' } } }), 'INVALID_LINE_CONTENT_VALUE');
    throwsCode(run({ lineContent: [] }), 'INVALID_LINE_CONTENT');
});

test('el núcleo no deja que la visita viaje duplicada en el evento', () => {
    const { rows } = adapter.buildFollowupRawProjection(projectionInput());
    assert.ok(rows.length > 0);
    // Un evento con campos de visita los copiaría a todas las filas: se rechaza.
    const request = {
        event: {
            event_id: 'EVT-E1-002', source_event_id: 'SRC-E1-002', event_type: 'pharmacy_followup',
            event_status: 'recorded', occurred_at: '2026-10-31', recorded_at: '2026-10-31T09:30:00Z',
            demo_flag: true, patient_id: P1.pid, visit_id: 'VIS-E1-002', identifier_value: P1.cip,
            visit_date: '2026-10-31', stratification_review_status: 'yes'
        },
        actId: 'ACT-E1-002', patientRef: P1.ref, present: 'no', activeLines: [], adverse_events: [],
        history: [], selections: []
    };
    throwsCode(() => core.buildFollowupRows(request), 'VISIT_FIELD_IN_EVENT');
    const lineInEvent = clone(request);
    delete lineInEvent.event.stratification_review_status;
    lineInEvent.event.dispensation_status = 'dispensed';
    throwsCode(() => core.buildFollowupRows(lineInEvent), 'VISIT_FIELD_IN_EVENT');
    const ok = clone(lineInEvent);
    delete ok.event.dispensation_status;
    ok.visit = { followup_proms_collection_status: 'no' };
    const built = core.buildFollowupRows(ok);
    assert.equal(built[0].row_role, 'followup_act');
    assert.equal(built[0].followup_proms_collection_status, 'no');
    throwsCode(() => core.buildFollowupRows(Object.assign(clone(ok), { visit: { line_observations: 'x' } })), 'UNKNOWN_VISIT_FIELD');
});

test('releído el libro: el camino antiguo ve la visita y el nuevo sigue con los EA', () => {
    const { tsv } = adapter.buildFollowupRawProjection(projectionInput());
    const src = source({ extraDermaTsv: [tsv] });
    const proms = src.getProms(P1.pid) || [];
    // El puerto devuelve un registro por fila; solo la fila del acto trae valores.
    const fromAct = proms.filter(record => record.source_event_id === ACT.sourceEventId && record.values.proms_json !== null);
    assert.equal(fromAct.length, 1, 'PROMs del acto nuevo una sola vez (no uno por fila)');
    assert.deepEqual(fromAct[0].values.proms_json, VISIT.proms_json);
    const visits = src.getVisitsAndLines(P1.pid) || {};
    const latest = visits.latest_followup;
    assert.ok(latest && latest.source_event_id === ACT.sourceEventId, 'el acto nuevo es el último seguimiento');
    const rowsOf = event => (event.rows || []).map(row => row.canonical_row);
    const actRow = rowsOf(latest).find(row => row.line_id === null);
    const lineRow = rowsOf(latest).find(row => row.line_id === 'LINE-A');
    assert.equal(actRow.stratification_review_status, 'yes');
    assert.equal(actRow.new_stratification_level, 'Nivel 2');
    assert.equal(lineRow.dispensation_status, 'dispensed');
    assert.equal(lineRow.adherence_instrument, 'morisky_green');
    assert.equal(lineRow.stratification_review_status, null, 'la línea no repite la visita');
    const reread = Contract.create({ source: src }).readAdverseEventEpisodes(P1.pid);
    assert.equal(reread.outcome, 'ok');
    assert.ok(reread.value.state.episodes.some(episode => episode.episode_id === 'E30'));
});

console.log(`farmacia_ea_followup_visit_content_166_check OK (${passed} casos)`);
