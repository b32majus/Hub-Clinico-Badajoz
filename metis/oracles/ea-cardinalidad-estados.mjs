import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

// Missing behavior at BASE is an assertion failure, not an import exception.
const path = 'modules/farmacia_ea_invariants.js';
assert.ok(fs.existsSync(path), 'Missing pure EA validation behavior');
const sandbox = { window: { HubTools: {} }, console: { log() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path, 'utf8'), sandbox, { filename: path });
const validate = sandbox.window.HubTools.farmaciaEaInvariants?.validateNewEvents;
assert.equal(typeof validate, 'function', 'pure new-event validation seam');
// Convert only realm prototypes, preserving undefined and all own keys.
function local(x) {
  if (!x || typeof x !== 'object') return x;
  if (Array.isArray(x)) return Array.from(x, local);
  return Object.fromEntries(Object.keys(x).map(k => [k, local(x[k])]));
}
const event = (i, extra = {}) => ({ patientRef: 'P-A', actId: 'ACT-A', episode_id: `E-${i}`, observation_id: `O-${i}`, status: 'incorporated', description: ' Texto original ', ...extra });
const request = (present, events = []) => ({ patientRef: 'P-A', actId: 'ACT-A', present, adverse_events: events });
function run(input) {
  const before = structuredClone(input);
  const result = local(validate(input));
  assert.deepEqual(input, before, 'input intact on every path');
  return result;
}
function good(input, included, retained = []) {
  const out = run(input);
  assert.equal(out.ok, true);
  assert.deepEqual(out.representation, { patientRef: input.patientRef, actId: input.actId, present: input.present, adverse_events: included });
  assert.deepEqual(out.retained, retained);
  return out;
}
function bad(input) {
  const out = run(input);
  assert.equal(out.ok, false);
  assert.equal(typeof out.error?.code, 'string');
  assert.equal(typeof out.error?.message, 'string');
  assert.deepEqual(Object.keys(out).sort(), ['error', 'ok'], 'no partial representation');
}

// cardinality / state matrix / equal descriptions, with no lines or extra acts
for (const n of [0, 1, 2, 5, 9, 37]) {
  const events = Array.from({ length: n }, (_, i) => event(i));
  for (const state of ['si', 'no', 'no_consta']) {
    const input = request(state, events);
    if ((state === 'si') === (n > 0)) good(input, events);
    else bad(input);
  }
}
console.log('PASS cardinality / equal descriptions / state matrix');
for (const token of ['', 'SI', 'Si', 'sí', ' no', null, undefined]) bad(request(token));
console.log('PASS exact tokens');

const draft = event(3, { status: 'draft', description: '', nested: { notes: ['draft'] } });
for (const state of ['no', 'no_consta']) good(request(state, [draft]), [], [draft]);
bad(request('si', [draft]));
good(request('si', [draft, event(1)]), [event(1)], [draft]);
for (const description of ['', ' \n ', null, undefined]) bad(request('si', [event(0, { description })]));
const absentDescription = event(0); delete absentDescription.description;
bad(request('si', [absentDescription]));
good(request('si', [event(0)]), [event(0)]);
console.log('PASS drafts / incomplete incorporation / description only');

const history = event(8, { actId: 'ACT-OLD', evolution: 'persiste' });
for (const state of ['no', 'no_consta']) good(request(state, [history, draft]), [], [history, draft]);
bad(request('si', [history]));
good(request('si', [history, event(0)]), [event(0)], [history]);
console.log('PASS historical observations');

for (const key of ['patientRef', 'actId']) {
  for (const value of ['', null, undefined]) bad({ ...request('no'), [key]: value });
  const missing = request('no'); delete missing[key]; bad(missing);
}
for (const key of ['patientRef', 'actId', 'episode_id', 'observation_id']) {
  for (const value of ['', null, undefined]) bad(request('si', [event(0, { [key]: value })]));
  const missing = event(0); delete missing[key]; bad(request('si', [missing]));
}
bad(request('si', [event(0), event(1, { patientRef: 'P-B' })]));
bad(request('si', [event(0, { status: 'finalized' })]));
for (const input of [null, {}, request('no', null), request('si', [null])]) bad(input);
console.log('PASS explicit identities / association mismatch / failure atomicity');

// Raw sandbox outputs: test sharing in BOTH directions, including retained trees.
const input = request('si', [event(1, { data: { notes: ['original'], unknown: null, blank: '', zero: 0, flag: false, undef: undefined } }), draft, history]);
const first = validate(input);
const second = validate(input);
assert.deepEqual(local(first), local(second), 'deterministic');
first.representation.adverse_events[0].data.notes.push('output');
first.retained[0].nested.notes.push('output draft');
assert.deepEqual(input.adverse_events[0].data.notes, ['original']);
assert.deepEqual(input.adverse_events[1].nested.notes, ['draft']);
input.adverse_events[0].data.notes.push('input');
input.adverse_events[2].description = 'changed history';
assert.deepEqual(local(second.representation.adverse_events[0].data), { notes: ['original'], unknown: null, blank: '', zero: 0, flag: false, undef: undefined });
assert.equal(second.retained[1].description, ' Texto original ');
const b = { patientRef: 'P-B', actId: 'ACT-B', present: 'no_consta', adverse_events: [] };
good(b, []);
good(request('si', [event(1)]), [event(1)]);
console.log('PASS deep isolation / repeat A/B');
assert.ok(fs.existsSync('tools/farmacia_ea_r1_states_check.mjs'), 'required focal check');
const check = spawnSync(process.execPath, ['tools/farmacia_ea_r1_states_check.mjs'], { encoding: 'utf8', timeout: 30000 });
assert.equal(check.status, 0, check.stdout + check.stderr);
console.log('PASS focal product check');
