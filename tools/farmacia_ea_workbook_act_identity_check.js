#!/usr/bin/env node
'use strict';

// Check focal EA v1 demo (#867), Tramo D4a-1: identidad del acto de
// Seguimiento desde el libro (decisiones de Sil, 31-10-2026).
//  - Consultar no modifica ni crea nada: la identidad del PACIENTE
//    (patient_id, patientRef, demo_flag, identifier_system) se lee tal como la
//    declara el libro. Sin patientRef declarado, o con datos contradictorios,
//    se bloquea con motivo; nunca se elige ni se inventa.
//  - Solo el propio acto emite su identidad (actId, evento, visita) al crearse;
//    llega como dato a funciones puras (sin reloj ni azar aquí).
//  - Los pacientes del registro demo (CIP-DEMO-FH-*) siguen igual.
//  - El acto copiado se incorpora al libro y se relee como un acto más.
// Solo datos sintéticos.

const assert = require('assert');
const path = require('path');

const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { ROOT, P1, P2, LEGACY_CIP, source } = mixed;
const quiet = fn => {
    const realConsole = global.console;
    global.console = { log() {}, warn() {}, error() {} };
    try { return fn(); } finally { global.console = realConsole; }
};
quiet(() => [
    'scripts/farmacia_bridge_raw_ea_v21_demo_context.js',
    'scripts/farmacia_bridge_raw_ea_v21_followup_adapter.js',
    'scripts/farmacia_bridge_raw_ea_v21_workbook_context.js',
    'scripts/farmacia_current_patient_session.js',
    'scripts/farmacia_patient_flow_runtime.js'
].forEach(file => require(path.join(ROOT, file))));

const W = global.FarmaciaBridgeRawEaV21WorkbookContext;
const adapter = global.FarmaciaBridgeRawEaV21FollowupAdapter;
const Contract = global.FarmaciaPatientReadContractV2;

let passed = 0;
const test = (label, fn) => {
    try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
    passed += 1;
};
const throwsCode = (fn, code) => assert.throws(fn, error => error && error.code === code, `se esperaba ${code}`);
const clone = value => JSON.parse(JSON.stringify(value));

// Misma entrada que arma Inicio (runtime) con el puerto de datos del libro.
const inputFor = (src, pid, cip) => ({
    patientId: pid,
    identifierValue: cip,
    events: src.getPatientEvents(pid) || [],
    eaEnvelope: Contract.create({ source: src }).readAdverseEventEpisodes(pid),
    lines: (src.getVisitsAndLines(pid) || {}).lines || []
});
const legacyPid = src => src.listPatients().map(p => p.patient_id || p).find(id => id !== P1.pid && id !== P2.pid);

const ACT = {
    actId: 'ACT-NEW-001', eventId: 'EVT-NEW-001', sourceEventId: 'SRC-NEW-001',
    visitId: 'VIS-NEW-001', visitDate: '2026-10-31', recordedAt: '2026-10-31T09:30:00Z'
};

test('módulo publicado', () => {
    assert.ok(W, 'FarmaciaBridgeRawEaV21WorkbookContext debe existir');
    assert.equal(W.VERSION, '1.0.0-draft.1');
    assert.equal(typeof W.declaredPatientIdentity, 'function');
    assert.equal(typeof W.buildActContext, 'function');
    assert.ok(Object.isFrozen(W));
});

test('identidad declarada del paciente mixto, tal como la trae el libro', () => {
    const src = source();
    const input = inputFor(src, P1.pid, P1.cip);
    const frozen = JSON.stringify(input);
    const identity = W.declaredPatientIdentity(input);
    assert.equal(JSON.stringify(input), frozen, 'no muta la entrada');
    assert.deepEqual(identity, {
        status: 'ok',
        patientId: P1.pid,
        identifierValue: P1.cip,
        identifierSystem: 'DEMO',
        patientRef: P1.ref,
        demoFlag: true,
        activeLines: [{
            treatmentId: 'TR-LINE-A', lineId: 'LINE-A', lineRole: 'principal', isPrimaryLine: true,
            lineStatusAtEvent: 'active', activeAtEvent: true, drugName: 'SINTETICO', activeIngredient: null,
            presentation: null, doseText: null, route: null, scheduleCode: null, scheduleLabel: null,
            scheduleOtherText: null, selectedDrugId: null, catalogSource: null, nationalCode: null,
            registrationNumber: null
        }]
    });
    assert.equal(W.declaredPatientIdentity(inputFor(src, P2.pid, P2.cip)).patientRef, P2.ref);
});

test('sin patientRef declarado o con datos contradictorios: bloqueo con motivo, nada inventado', () => {
    const src = source();
    const legacy = W.declaredPatientIdentity(inputFor(src, legacyPid(src), LEGACY_CIP));
    assert.deepEqual(legacy, { status: 'blocked', reason: 'PATIENT_REF_UNDECLARED' });

    const base = inputFor(src, P1.pid, P1.cip);
    const withRows = mutate => {
        const copy = clone(base);
        mutate(copy.events.flatMap(event => event.rows || []).map(row => row.canonical_row));
        return W.declaredPatientIdentity(copy);
    };
    assert.deepEqual(withRows(rows => { rows[0].demo_flag = false; }), { status: 'blocked', reason: 'DEMO_FLAG_CONFLICT' });
    assert.deepEqual(withRows(rows => rows.forEach(row => { row.demo_flag = null; })), { status: 'blocked', reason: 'DEMO_FLAG_UNDECLARED' });
    assert.deepEqual(withRows(rows => { rows[0].identifier_system = 'OTRO'; }), { status: 'blocked', reason: 'IDENTIFIER_SYSTEM_CONFLICT' });
    const noSystem = withRows(rows => rows.forEach(row => { row.identifier_system = null; }));
    assert.equal(noSystem.status, 'ok');
    assert.equal(noSystem.identifierSystem, null, 'sistema ausente = null, no se rellena');

    assert.deepEqual(W.declaredPatientIdentity(Object.assign(clone(base), { patientId: '' })), { status: 'blocked', reason: 'PATIENT_NOT_DECLARED' });
    assert.deepEqual(W.declaredPatientIdentity(Object.assign(clone(base), { identifierValue: '  ' })), { status: 'blocked', reason: 'PATIENT_NOT_DECLARED' });
    assert.deepEqual(W.declaredPatientIdentity(Object.assign(clone(base), { eaEnvelope: undefined })), { status: 'unavailable' });
    assert.deepEqual(W.declaredPatientIdentity(Object.assign(clone(base), { eaEnvelope: { outcome: 'unavailable' } })), { status: 'unavailable' });
    assert.deepEqual(W.declaredPatientIdentity(Object.assign(clone(base), { eaEnvelope: { outcome: 'error' } })), { status: 'error' });
    assert.deepEqual(W.declaredPatientIdentity(Object.assign(clone(base), { eaEnvelope: { outcome: 'ok', value: {} } })), { status: 'error' });
    assert.deepEqual(W.declaredPatientIdentity(null), { status: 'blocked', reason: 'PATIENT_NOT_DECLARED' });
});

test('solo viajan líneas declaradas activas; las demás no se arrastran', () => {
    const src = source();
    const input = inputFor(src, P1.pid, P1.cip);
    const extra = clone(input.lines[0]);
    extra.line_id = 'LINE-OLD';
    extra.snapshot.line_id = 'LINE-OLD';
    extra.snapshot.active_at_event = false;
    extra.snapshot.line_status_at_event = 'historical';
    input.lines.push(extra);
    assert.deepEqual(W.declaredPatientIdentity(input).activeLines.map(line => line.lineId), ['LINE-A']);
});

test('buildActContext: identidad del paciente + identidad emitida por el acto', () => {
    const src = source();
    const identity = W.declaredPatientIdentity(inputFor(src, P1.pid, P1.cip));
    const frozen = JSON.stringify(identity);
    const context = W.buildActContext(identity, ACT, ['LINE-A']);
    assert.equal(JSON.stringify(identity), frozen, 'no muta la identidad');
    assert.deepEqual(context, {
        identitySource: 'workbook',
        identifierValue: P1.cip,
        identifier_system: 'DEMO',
        actId: ACT.actId,
        patientRef: P1.ref,
        eventId: ACT.eventId,
        sourceEventId: ACT.sourceEventId,
        visitId: ACT.visitId,
        patientId: P1.pid,
        occurredAt: ACT.visitDate,
        recordedAt: ACT.recordedAt,
        visitDate: ACT.visitDate,
        eventStatus: 'recorded',
        demoFlag: true,
        activeLines: [Object.assign({ rowKey: ACT.actId + ':LINE-A' }, identity.activeLines[0])]
    });
    assert.deepEqual(W.buildActContext(identity, ACT, []).activeLines, [], 'acto sin líneas seleccionadas es válido');
    const noSystem = Object.assign(clone(identity), { identifierSystem: null });
    assert.ok(!Object.prototype.hasOwnProperty.call(W.buildActContext(noSystem, ACT, []), 'identifier_system'));
});

test('buildActContext rechaza identidad no declarada o acto incompleto', () => {
    const src = source();
    const identity = W.declaredPatientIdentity(inputFor(src, P1.pid, P1.cip));
    throwsCode(() => W.buildActContext({ status: 'blocked', reason: 'PATIENT_REF_UNDECLARED' }, ACT, []), 'IDENTITY_NOT_DECLARED');
    throwsCode(() => W.buildActContext(null, ACT, []), 'IDENTITY_NOT_DECLARED');
    for (const field of Object.keys(ACT)) {
        throwsCode(() => W.buildActContext(identity, Object.assign({}, ACT, { [field]: '' }), []), field === 'visitDate' || field === 'recordedAt' ? 'INVALID_ACT_DATE' : 'INVALID_ACT');
    }
    throwsCode(() => W.buildActContext(identity, Object.assign({}, ACT, { visitDate: '31/10/2026' }), []), 'INVALID_ACT_DATE');
    throwsCode(() => W.buildActContext(identity, Object.assign({}, ACT, { recordedAt: '2026-10-31' }), []), 'INVALID_ACT_DATE');
    for (const field of ['eventId', 'sourceEventId', 'visitId']) {
        throwsCode(() => W.buildActContext(identity, Object.assign({}, ACT, { [field]: ACT.actId }), []), 'ACT_ID_NOT_DISTINCT');
    }
    throwsCode(() => W.buildActContext(identity, Object.assign({}, ACT, { actId: P1.pid }), []), 'ACT_ID_NOT_DISTINCT');
    throwsCode(() => W.buildActContext(identity, ACT, ['LINE-X']), 'LINE_NOT_DECLARED');
    throwsCode(() => W.buildActContext(identity, ACT, 'LINE-A'), 'LINE_NOT_DECLARED');
});

function newAct(context) {
    return adapter.buildFollowupRawProjection({
        context,
        present: 'si',
        adverseEvents: [{ episode_id: 'E20', observation_id: 'O20', status: 'incorporated', description: 'Mareo', suspect_ids: ['LINE-A'] }],
        history: [],
        selections: []
    });
}

test('el adaptador acepta la identidad del libro y la copia se relee como un acto más', () => {
    const src = source();
    const context = W.buildActContext(W.declaredPatientIdentity(inputFor(src, P1.pid, P1.cip)), ACT, ['LINE-A']);
    const frozen = JSON.stringify(context);
    const projection = newAct(context);
    assert.equal(JSON.stringify(context), frozen, 'el adaptador no muta el contexto');
    for (const row of projection.rows) {
        assert.equal(row.fh_patient_ref, P1.ref);
        assert.equal(row.fh_act_id, ACT.actId);
        assert.equal(row.patient_id, P1.pid);
        assert.equal(row.identifier_value, P1.cip);
        assert.equal(row.identifier_system, 'DEMO');
        assert.equal(row.demo_flag, true, 'demo_flag declarado por el libro');
    }
    const reread = Contract.create({ source: source({ extraDermaTsv: [projection.tsv] }) }).readAdverseEventEpisodes(P1.pid);
    assert.equal(reread.outcome, 'ok');
    assert.equal(reread.value.patientRef, P1.ref);
    assert.ok(Object.prototype.hasOwnProperty.call(reread.value.actDates, ACT.actId), 'el acto nuevo se relee');
    assert.equal(reread.value.actDates[ACT.actId], ACT.visitDate);
    const episodes = reread.value.state.episodes.map(episode => episode.episode_id).sort();
    assert.deepEqual(episodes, ['E1', 'E20', 'E9']);
});

test('el adaptador cierra la identidad del libro en falso', () => {
    const src = source();
    const context = W.buildActContext(W.declaredPatientIdentity(inputFor(src, P1.pid, P1.cip)), ACT, ['LINE-A']);
    throwsCode(() => newAct(Object.assign({}, context, { identitySource: 'otro' })), 'INVALID_CONTEXT');
    throwsCode(() => newAct(Object.assign({}, context, { demoFlag: 'true' })), 'INVALID_CONTEXT');
    throwsCode(() => newAct(Object.assign({}, context, { patientRef: '' })), 'INVALID_CONTEXT');
    // Un CIP del registro demo no puede llegar con una segunda identidad.
    throwsCode(() => newAct(Object.assign({}, context, { identifierValue: 'CIP-DEMO-FH-001' })), 'IDENTITY_SOURCE_CONFLICT');
    // demo_flag=false declarado viaja tal cual (no se fuerza a true).
    const real = newAct(Object.assign({}, context, { demoFlag: false }));
    assert.ok(real.rows.every(row => row.demo_flag === false));
    // El camino del registro demo sigue igual: sin identitySource exige registro.
    throwsCode(() => newAct(Object.assign({}, context, { identitySource: undefined })), 'INVALID_CONTEXT');
    const withoutSource = Object.assign({}, context);
    delete withoutSource.identitySource;
    throwsCode(() => newAct(withoutSource), 'IDENTITY_UNAVAILABLE');
});

function storage() {
    const values = new Map();
    return {
        get length() { return values.size; },
        key(index) { return [...values.keys()][index] ?? null; },
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}
function runtimeFor(dataPort) {
    const loc = { href: 'http://local/farmacia_index.html', pathname: '/farmacia_index.html', search: '', hash: '' };
    const history = {
        replaceState(_state, _title, url) {
            const parsed = new URL(url, loc.href);
            loc.href = parsed.href; loc.pathname = parsed.pathname; loc.search = parsed.search; loc.hash = parsed.hash;
        }
    };
    return global.FarmaciaPatientFlowRuntime.create({
        sessionModule: global.FarmaciaCurrentPatientSession, sessionStorage: storage(), dataPort, location: loc, history,
        confirm: () => true, crypto: { randomUUID: () => 'generation-test' }
    });
}

test('Inicio deja en el paciente de sesión la identidad declarada (bridge_raw_identity)', () => {
    const src = source();
    const p1 = runtimeFor(src).selectByCip(P1.cip).patient;
    assert.deepEqual(p1.bridge_raw_identity, W.declaredPatientIdentity(inputFor(src, P1.pid, P1.cip)));
    assert.equal(p1.bridge_raw_identity.status, 'ok');
    assert.deepEqual(runtimeFor(src).selectByCip(LEGACY_CIP).patient.bridge_raw_identity,
        { status: 'blocked', reason: 'PATIENT_REF_UNDECLARED' });
    const saved = global.FarmaciaBridgeRawEaV21WorkbookContext;
    try {
        delete global.FarmaciaBridgeRawEaV21WorkbookContext;
        assert.deepEqual(runtimeFor(src).selectByCip(P1.cip).patient.bridge_raw_identity, { status: 'unavailable' });
    } finally {
        global.FarmaciaBridgeRawEaV21WorkbookContext = saved;
    }
});

console.log(`farmacia_ea_workbook_act_identity_check OK (${passed} casos)`);
