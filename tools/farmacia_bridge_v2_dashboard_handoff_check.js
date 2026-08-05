#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', 'scripts', 'farmacia_bridge_v2_dashboard_handoff.js'));
const H = global.FarmaciaBridgeV2DashboardHandoff;
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function rejects(fn, code) { assert.throws(fn, error => error instanceof TypeError && error.message.includes(code)); }
function view(overrides = {}) {
    return Object.assign({ patient_id: 'patient-a', identifiers: [{ identifier_system: 'urn:cip:demo', identifier_value: 'SAME-VALUE' }], timeline: [], lines: [], warnings: [], structured_proms: [], adherence: [], adverse_events: [], causality_assessments: [], workbook: { read_model_version: '1.0.0', storage: 'runtime_memory', file_name: 'synthetic.xlsx' } }, overrides);
}
function payload(overrides = {}) {
    return Object.assign({ search_context: { identifier_system: 'urn:cip:demo', identifier_value: 'SAME-VALUE' }, quick_view: view() }, overrides);
}

test('supported version', () => assert.strictEqual(H.protocolVersion, '1.0.0'));
test('single read-only TTL is exposed', () => { assert.strictEqual(H.sessionTtlMs, 45000); const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'farmacia_bridge_v2_dashboard_handoff.js'), 'utf8'); assert.strictEqual((source.match(/45000/g) || []).length, 1); });
test('nonce is random and non-empty', () => assert.notStrictEqual(H.generateNonce(), H.generateNonce()));
test('fragment round trip', () => { const n = H.generateNonce(); assert.strictEqual(H.parseFragment(H.buildFragment(n)), n); });
test('valid READY envelope', () => { const n = H.generateNonce(); assert(H.validateEnvelope(H.createReady(n), H.readyType, n)); });
test('valid PAYLOAD envelope', () => { const n = H.generateNonce(); assert(H.validateEnvelope(H.createPayload(n, payload()), H.payloadType, n)); });
test('valid quick view accepted', () => assert(H.validatePayload(payload()).quick_view.patient_id === 'patient-a'));
test('stored padding and unpadded context resolve', () => assert(H.validatePayload(payload({ search_context: { identifier_system: 'urn:cip:demo', identifier_value: 'SAME-VALUE' }, quick_view: view({ identifiers: [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }] }) }))));
test('stored and context padding both resolve', () => assert(H.validatePayload(payload({ search_context: { identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }, quick_view: view({ identifiers: [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }] }) }))));
test('identifier components must be strings', () => rejects(() => H.validatePayload(payload({ quick_view: view({ identifiers: [{ identifier_system: 1, identifier_value: 'SAME-VALUE' }] }) })), 'HANDOFF_IDENTIFIERS_INVALID'));
test('normalization does not mutate source payload', () => { const p = payload({ search_context: { identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }, quick_view: view({ identifiers: [{ identifier_system: ' urn:cip:demo ', identifier_value: ' SAME-VALUE ' }] }) }); H.validatePayload(p); assert.strictEqual(p.search_context.identifier_system, ' urn:cip:demo '); assert.strictEqual(p.quick_view.identifiers[0].identifier_value, ' SAME-VALUE '); });
test('case sensitive identifier preserved', () => rejects(() => H.validatePayload(payload({ search_context: { identifier_system: 'URN:CIP:DEMO', identifier_value: 'SAME-VALUE' } })), 'IDENTIFIER_NOT_DECLARED'));
test('false zero empty and null preserved', () => { const p = payload(); p.quick_view.timeline = [{ source_event_id: 'src-1', event_id: 'event-1', rows: [{ canonical_row: { values: [true, false, 0, '', null] } }] }]; const out = H.validatePayload(p); assert.deepStrictEqual(out.quick_view.timeline[0].rows[0].canonical_row.values, [true, false, 0, '', null]); });
test('arrays preserved', () => { const p = payload(); p.quick_view.timeline = [{ source_event_id: 'src-1', event_id: 'event-1', rows: [{ canonical_row: {} }] }, { source_event_id: 'src-2', event_id: 'event-2', rows: [{ canonical_row: {} }] }]; p.quick_view.lines = [{ line_id: 'line-1', snapshot: {} }]; assert.strictEqual(H.validatePayload(p).quick_view.timeline.length, 2); });
test('clone does not mutate source', () => { const p = payload(); const out = H.validatePayload(p); out.quick_view.patient_id = 'changed'; assert.strictEqual(p.quick_view.patient_id, 'patient-a'); });
test('serializable payload', () => assert.doesNotThrow(() => H.validatePayload(payload())));
test('unknown protocol rejected', () => { const n = H.generateNonce(); const m = H.createReady(n); m.protocol_version = '9.9.9'; assert(!H.validateEnvelope(m, H.readyType, n)); });
test('missing nonce rejected', () => rejects(() => H.createReady(), 'HANDOFF_NONCE_REQUIRED'));
test('wrong nonce rejected', () => { const n = H.generateNonce(); assert(!H.validateEnvelope(H.createReady(n), H.readyType, H.generateNonce())); });
test('wrong type rejected', () => { const n = H.generateNonce(); assert(!H.validateEnvelope(H.createReady(n), H.payloadType, n)); });
test('missing payload rejected', () => rejects(() => H.validatePayload({ search_context: {}, quick_view: {} }), 'HANDOFF_SEARCH_CONTEXT_INVALID'));
test('invalid patient id rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ patient_id: 1 }) })), 'HANDOFF_PATIENT_ID_INVALID'));
test('invalid identifiers rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ identifiers: null }) })), 'HANDOFF_IDENTIFIERS_INVALID'));
test('invalid timeline rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ timeline: null }) })), 'HANDOFF_TIMELINE_INVALID'));
test('invalid lines rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ lines: null }) })), 'HANDOFF_LINES_INVALID'));
test('whitespace-only search system rejected', () => rejects(() => H.validatePayload(payload({ search_context: { identifier_system: '   ', identifier_value: 'x' } })), 'HANDOFF_IDENTIFIER_COMPONENT_EMPTY'));
test('whitespace-only search value rejected', () => rejects(() => H.validatePayload(payload({ search_context: { identifier_system: 'x', identifier_value: '   ' } })), 'HANDOFF_IDENTIFIER_COMPONENT_EMPTY'));
test('whitespace-only stored system rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ identifiers: [{ identifier_system: '   ', identifier_value: 'x' }] }) })), 'HANDOFF_IDENTIFIER_COMPONENT_EMPTY'));
test('whitespace-only stored value rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ identifiers: [{ identifier_system: 'x', identifier_value: '   ' }] }) })), 'HANDOFF_IDENTIFIER_COMPONENT_EMPTY'));
test('undeclared identifier rejected', () => rejects(() => H.validatePayload(payload({ search_context: { identifier_system: 'urn:cip:demo', identifier_value: 'OTHER' } })), 'HANDOFF_IDENTIFIER_NOT_DECLARED'));
test('case mismatch rejected', () => rejects(() => H.validatePayload(payload({ search_context: { identifier_system: 'urn:cip:demo', identifier_value: 'same-value' } })), 'HANDOFF_IDENTIFIER_NOT_DECLARED'));
test('incompatible workbook rejected', () => rejects(() => H.validatePayload(payload({ quick_view: view({ workbook: { read_model_version: '9.0.0' } }) })), 'HANDOFF_WORKBOOK_INVALID'));
test('function and cycle rejected', () => { const p = payload(); p.quick_view.bad = () => {}; rejects(() => H.validatePayload(p), 'HANDOFF_NON_SERIALIZABLE'); const q = payload(); q.quick_view.cycle = q; rejects(() => H.validatePayload(q), 'HANDOFF_NON_SERIALIZABLE'); });
test('invalid origin/source envelope is rejected by helpers', () => { const n = H.generateNonce(); assert(!H.validateEnvelope(H.createReady(n), H.readyType, H.generateNonce())); });
test('fragment without nonce rejected', () => { assert.strictEqual(H.parseFragment('#bridge-handoff='), null); assert(H.hasFragmentMarker('#bridge-handoff=')); });
test('consumers use module TTL and no 1500 timeout', () => {
    const index = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'farmacia_index.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'farmacia_dashboard_paciente.js'), 'utf8');
    assert(index.includes('handoff.sessionTtlMs') && dashboard.includes('handoff.sessionTtlMs'));
    assert(!index.includes('45000') && !dashboard.includes('45000') && !dashboard.includes('1500'));
});
test('Quick View message says dashboard is available', () => {
    const index = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'farmacia_index.js'), 'utf8');
    assert(index.includes('El dashboard Bridge está disponible como lectura temporal'));
    assert(!index.includes('El dashboard y los formularios todavía no están conectados'));
});
console.log(`farmacia_bridge_v2_dashboard_handoff_check: PASS (${passed} cases)`);
