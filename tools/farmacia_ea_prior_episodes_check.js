#!/usr/bin/env node
'use strict';

// Check focal EA v1 demo (#867), Tramo D4b-1: historia de EA en Seguimiento
// (decisiones de Sil, 31-10-2026). Fuente: los episodios del paciente de
// sesión (`patient.ea_episodes`, modelo de pantalla leído del libro).
//  - Botones por episodio: abierto → «Continúa» / «Resuelto»; cerrado → solo
//    «Recurrencia»; ambiguo → ninguno (se revisa en origen).
//  - La ficha nueva se apoya en la ÚLTIMA observación del episodio (basis) y
//    lleva la evolución declarada; nunca se infiere evolución ni episodio.
//  - La historia completa viaja a la copia 166 para que el validador impida
//    reutilizar episodios u observaciones de actos anteriores.
//  - Lo copiado, pegado en el libro, se relee con el estado esperado.
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
    'modules/farmacia_ea_screen_model.js',
    'scripts/farmacia_bridge_raw_ea_v21_demo_context.js',
    'scripts/farmacia_bridge_raw_ea_v21_followup_adapter.js',
    'scripts/farmacia_bridge_raw_ea_v21_workbook_context.js'
].forEach(file => require(path.join(ROOT, file))));

const W = global.FarmaciaBridgeRawEaV21WorkbookContext;
const adapter = global.FarmaciaBridgeRawEaV21FollowupAdapter;
const Contract = global.FarmaciaPatientReadContractV2;
const screenModel = (global.HubTools || {}).farmaciaEaScreenModel;
assert.ok(screenModel && typeof screenModel.fromEnvelope === 'function', 'modelo de pantalla EA cargado');

let passed = 0;
const test = (label, fn) => {
    try { fn(); } catch (error) { error.message = `[${label}] ${error.message}`; throw error; }
    passed += 1;
};
const throwsCode = (fn, code) => assert.throws(fn, error => error && error.code === code, `se esperaba ${code}`);
const clone = value => JSON.parse(JSON.stringify(value));

// Lo mismo que deja Inicio en el paciente de sesión.
const envelopeOf = src => Contract.create({ source: src }).readAdverseEventEpisodes(P1.pid);
const sessionEpisodesOf = src => screenModel.fromEnvelope(envelopeOf(src));
const identityOf = src => W.declaredPatientIdentity({
    patientId: P1.pid,
    identifierValue: P1.cip,
    events: src.getPatientEvents(P1.pid) || [],
    eaEnvelope: envelopeOf(src),
    lines: (src.getVisitsAndLines(P1.pid) || {}).lines || []
});

let seq = 0;
// Un acto nuevo de Seguimiento con sus fichas EA, copiado como 166.
function copyAct(src, drafts, date) {
    seq += 1;
    const identity = identityOf(src);
    const prior = W.priorEpisodes(identity, sessionEpisodesOf(src));
    const act = {
        actId: 'FH-ACT-D4B-' + seq, eventId: 'FH-EVT-D4B-' + seq, sourceEventId: 'FH-SRC-D4B-' + seq,
        visitId: 'FH-VISIT-D4B-' + seq, visitDate: date, recordedAt: date + 'T10:00:00Z'
    };
    const context = W.buildActContext(identity, act, []);
    return adapter.buildFollowupRawProjection({
        context, present: 'si', adverseEvents: drafts, history: prior.history, selections: []
    }).tsv;
}
const incorporate = (draft, description) => Object.assign(draft, { status: 'incorporated', description });
const stateOf = (src, episodeId) => envelopeOf(src).value.state.episodes.find(e => e.episode_id === episodeId);

test('episodios del libro: abiertos ofrecen Continúa/Resuelto y se apoyan en su última observación', () => {
    const src = source();
    const prior = W.priorEpisodes(identityOf(src), sessionEpisodesOf(src));
    assert.equal(prior.status, 'ok');
    assert.deepEqual(prior.history, [
        { patientRef: P1.ref, actId: 'ACT-A', episode_id: 'E1', observation_id: 'O1', status: 'incorporated' },
        { patientRef: P1.ref, actId: 'ACT-B', episode_id: 'E1', observation_id: 'O2', status: 'incorporated' },
        { patientRef: P1.ref, actId: 'ACT-A', episode_id: 'E9', observation_id: 'O9', status: 'incorporated' }
    ], 'toda la historia del paciente, solo referencias');
    const e1 = prior.episodes.find(e => e.episode_id === 'E1');
    assert.deepEqual(e1.actions, ['continuation', 'resolution']);
    assert.deepEqual(e1.basis, { patientRef: P1.ref, actId: 'ACT-B', episode_id: 'E1', observation_id: 'O2' });
    assert.equal(e1.description, 'Cefalea persiste');
    assert.equal(e1.lastDate, '2026-10-10');
    assert.equal(e1.closed, false);
    assert.ok(typeof e1.statusText === 'string' && e1.statusText.length > 0);
    const e9 = prior.episodes.find(e => e.episode_id === 'E9');
    assert.deepEqual(e9.actions, ['continuation', 'resolution']);
    assert.deepEqual(e9.basis, { patientRef: P1.ref, actId: 'ACT-A', episode_id: 'E9', observation_id: 'O9' });
});

test('Continúa y Resuelto conservan el episodio; releído, E1 continúa y E9 queda cerrado', () => {
    const src = source();
    const prior = W.priorEpisodes(identityOf(src), sessionEpisodesOf(src));
    const e1 = prior.episodes.find(e => e.episode_id === 'E1');
    const e9 = prior.episodes.find(e => e.episode_id === 'E9');
    const cont = W.longitudinalDraft(e1, 'continuation', { observationId: 'FH-OBS-D4B-C1' });
    assert.deepEqual(cont, {
        episode_id: 'E1', observation_id: 'FH-OBS-D4B-C1', status: 'draft', description: '',
        evolution: 'continuation', basis: e1.basis
    }, 'ficha en borrador: el clínico escribe la descripción');
    const res = W.longitudinalDraft(e9, 'resolution', { observationId: 'FH-OBS-D4B-R1' });
    assert.equal(res.episode_id, 'E9');
    assert.equal(res.evolution, 'resolution');
    const tsv = copyAct(src, [incorporate(cont, 'Cefalea persiste leve'), incorporate(res, 'Náuseas resueltas')], '2026-11-01');
    const after = source({ extraDermaTsv: [tsv] });
    assert.equal(envelopeOf(after).outcome, 'ok');
    assert.equal(stateOf(after, 'E1').observationCount, 3);
    assert.equal(stateOf(after, 'E1').lastEvolution, 'continuation');
    assert.equal(stateOf(after, 'E1').closed, false);
    assert.equal(stateOf(after, 'E9').closed, true, 'Resuelto cierra el episodio');
    const priorAfter = W.priorEpisodes(identityOf(after), sessionEpisodesOf(after));
    assert.deepEqual(priorAfter.episodes.find(e => e.episode_id === 'E9').actions, ['recurrence'], 'cerrado: solo Recurrencia');
    assert.equal(priorAfter.history.length, 5);
});

test('Recurrencia abre un episodio nuevo apoyado en el cerrado; el cerrado sigue cerrado', () => {
    const base = source();
    const prior = W.priorEpisodes(identityOf(base), sessionEpisodesOf(base));
    const closing = W.longitudinalDraft(prior.episodes.find(e => e.episode_id === 'E9'), 'resolution', { observationId: 'FH-OBS-D4B-R2' });
    const closingTsv = copyAct(base, [incorporate(closing, 'Náuseas resueltas')], '2026-11-01');
    const closedSrc = source({ extraDermaTsv: [closingTsv] });
    const e9 = W.priorEpisodes(identityOf(closedSrc), sessionEpisodesOf(closedSrc)).episodes.find(e => e.episode_id === 'E9');
    throwsCode(() => W.longitudinalDraft(e9, 'continuation', { observationId: 'X' }), 'ACTION_NOT_OFFERED');
    throwsCode(() => W.longitudinalDraft(e9, 'recurrence', { observationId: 'FH-OBS-D4B-Q1' }), 'MISSING_EPISODE_ID');
    const rec = W.longitudinalDraft(e9, 'recurrence', { observationId: 'FH-OBS-D4B-Q1', episodeId: 'FH-EP-D4B-Q1' });
    assert.deepEqual(rec, {
        episode_id: 'FH-EP-D4B-Q1', observation_id: 'FH-OBS-D4B-Q1', status: 'draft', description: '',
        evolution: 'recurrence', basis: e9.basis
    });
    const after = source({ extraDermaTsv: [closingTsv, copyAct(closedSrc, [incorporate(rec, 'Náuseas de nuevo')], '2026-11-05')] });
    assert.equal(envelopeOf(after).outcome, 'ok');
    assert.equal(stateOf(after, 'E9').closed, true, 'el episodio cerrado no se reabre');
    assert.equal(stateOf(after, 'FH-EP-D4B-Q1').observationCount, 1, 'la recurrencia es un episodio nuevo');
});

test('la historia en la copia impide reutilizar episodios u observaciones de actos anteriores', () => {
    const src = source();
    const reused = { episode_id: 'E9', observation_id: 'FH-OBS-D4B-N1', status: 'incorporated', description: 'EA nuevo con id viejo' };
    assert.throws(() => copyAct(src, [reused], '2026-11-02'), error => error && /EPISODE_NOT_NEW/.test(String(error.code || error.message)));
    const reusedObs = { episode_id: 'FH-EP-D4B-N2', observation_id: 'O9', status: 'incorporated', description: 'EA nuevo con observación vieja' };
    assert.throws(() => copyAct(src, [reusedObs], '2026-11-02'), error => error && /DUPLICATE_OBSERVATION_ID/.test(String(error.code || error.message)));
});

test('sin datos utilizables no hay botones ni historia inventada', () => {
    const src = source();
    const identity = identityOf(src);
    const sessionEpisodes = sessionEpisodesOf(src);
    const ambiguous = clone(sessionEpisodes);
    ambiguous.model.episodes[0].ambiguous = true;
    const amb = W.priorEpisodes(identity, ambiguous);
    assert.deepEqual(amb.episodes[0].actions, [], 'ambiguo: se revisa en origen');
    throwsCode(() => W.longitudinalDraft(amb.episodes[0], 'continuation', { observationId: 'X' }), 'ACTION_NOT_OFFERED');
    for (const missing of [undefined, null, { status: 'unavailable' }, { status: 'error' }]) {
        const result = W.priorEpisodes(identity, missing);
        assert.equal(result.status, 'unavailable');
        assert.deepEqual(result.history, []);
        assert.deepEqual(result.episodes, []);
    }
    const otherPatient = clone(sessionEpisodes);
    otherPatient.model.patientRef = 'PATREF-OTRO';
    const mismatch = W.priorEpisodes(identity, otherPatient);
    assert.equal(mismatch.status, 'blocked');
    assert.equal(mismatch.reason, 'HISTORY_PATIENT_MISMATCH');
    assert.deepEqual(mismatch.episodes, []);
    const broken = clone(sessionEpisodes);
    delete broken.model.episodes[1].observations[0].observation_id;
    const invalid = W.priorEpisodes(identity, broken);
    assert.equal(invalid.status, 'blocked');
    assert.equal(invalid.reason, 'INVALID_HISTORY');
    throwsCode(() => W.priorEpisodes({ status: 'blocked', reason: 'PATIENT_REF_UNDECLARED' }, sessionEpisodes), 'IDENTITY_NOT_DECLARED');
    throwsCode(() => W.longitudinalDraft(amb.episodes[1], 'continuation', {}), 'MISSING_OBSERVATION_ID');
});

test('funciones puras: no mutan la entrada y devuelven copias', () => {
    const src = source();
    const identity = identityOf(src);
    const sessionEpisodes = sessionEpisodesOf(src);
    const before = clone(sessionEpisodes);
    const prior = W.priorEpisodes(identity, sessionEpisodes);
    assert.deepEqual(sessionEpisodes, before);
    const e1 = prior.episodes.find(e => e.episode_id === 'E1');
    const draft = W.longitudinalDraft(e1, 'continuation', { observationId: 'FH-OBS-D4B-P1' });
    draft.basis.observation_id = 'cambiado';
    assert.equal(e1.basis.observation_id, 'O2', 'la ficha no comparte objetos con el episodio');
});

console.log(`farmacia_ea_prior_episodes_check OK (${passed} casos)`);
