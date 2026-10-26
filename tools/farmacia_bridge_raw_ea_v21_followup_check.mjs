#!/usr/bin/env node
// FH-BRIDGE-C2b · comprobador de repo del adaptador de copia manual Bridge
// raw EA 0..N de Seguimiento. Datos sintéticos, sin DOM ni red.
//
// Cubre los hechos del ticket que son decidibles en Node:
//  - identidad demo declarada (actId/patientRef ≠ ids de transporte, clones
//    frescos, CIP desconocido → null, actos A/B distintos);
//  - 0 EA `no`/`no_consta` con 0 líneas ⇒ una fila de acto;
//  - 1 acto + 2 líneas + 3 EA con sospechosos propios/externo;
//  - presencia `si`/`no`/`no_consta` y contradicción;
//  - cambio de identidad A→B, actId/patientRef no coincidentes;
//  - G0 borrador/provisional ⇒ EA_NOT_INCORPORATED / EVALUATION_NOT_FINAL;
//  - línea no activa ⇒ LINE_NOT_ACTIVE; historia no representable;
//  - TSV canónico de 166 columnas en UNA cadena, sin mutar la entrada;
//  - regresión C2a/V2 (2.1.0-draft.1, 166 y 152 columnas).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const sandbox = { console: { log() {}, error() {}, warn() {} } };
sandbox.window = sandbox;
sandbox.HubTools = {};
vm.createContext(sandbox);
for (const relative of [
  'scripts/farmacia_export_v2_core.js',
  'scripts/farmacia_bridge_ea_typed_codec.js',
  'modules/farmacia_act_contract.js',
  'modules/farmacia_act_payloads.js',
  'modules/farmacia_ea_invariants.js',
  'scripts/farmacia_bridge_raw_ea_v21_core.js',
  'scripts/farmacia_bridge_raw_ea_v21_demo_context.js',
  'scripts/farmacia_bridge_raw_ea_v21_followup_adapter.js'
]) {
  vm.runInContext(read(relative), sandbox, { filename: relative });
}

const demo = sandbox.FarmaciaBridgeRawEaV21DemoContext;
const adapter = sandbox.FarmaciaBridgeRawEaV21FollowupAdapter;
const core = sandbox.FarmaciaBridgeRawEaV21Core;
const v2Core = sandbox.FarmaciaExportV2Core;
let passed = 0;

function test(label, callback) {
  try {
    callback();
    console.log('PASS ' + label);
    passed += 1;
  } catch (error) {
    console.error('FAIL ' + label + ': ' + (error && error.stack ? error.stack : error));
    process.exitCode = 1;
  }
}

function reject(code, callback) {
  assert.throws(callback, (error) => !!error && (error.code === code || String(error.message || '').includes(code)),
    'se esperaba el código ' + code);
}

function act(context, present, adverseEvents, extra) {
  return Object.assign({
    context,
    present,
    adverseEvents,
    history: [],
    selections: []
  }, extra || {});
}

function ficha(episode, observation, description, suspicions) {
  return {
    episode_id: episode,
    observation_id: observation,
    status: 'incorporated',
    description,
    evolution: 'no_consta',
    severity: '',
    suspicions
  };
}

function cellCount(tsv) {
  return tsv.split('\n').map((line) => line.split('\t').length);
}

test('fuente de identidad demo explícita, estable y sin derivar', () => {
  assert.equal(demo.PROVIDER_VERSION, '1.0.0-draft.1');
  const fh001 = demo.getContext('followupAct', 'CIP-DEMO-FH-001');
  const fh002 = demo.getContext('followupAct', 'CIP-DEMO-FH-002');
  const fh004 = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  assert.ok(fh001 && fh002 && fh004);
  for (const context of [fh001, fh004]) {
    assert.equal(context.demoFlag, true);
    for (const derived of ['eventId', 'sourceEventId', 'visitId', 'patientId', 'identifierValue']) {
      assert.notEqual(context.actId, context[derived]);
      assert.notEqual(context.patientRef, context[derived]);
    }
  }
  assert.notEqual(fh001.actId, fh004.actId);
  assert.notEqual(fh001.patientRef, fh004.patientRef);
  assert.equal(fh001.activeLines.length, 1);
  assert.equal(fh002.activeLines.length, 0);
  assert.equal(fh004.activeLines.length, 2);
  const clone = demo.getContext('followupAct', 'CIP-DEMO-FH-001');
  assert.deepEqual(clone, fh001);
  clone.actId = 'MUTADO';
  assert.equal(demo.getContext('followupAct', 'CIP-DEMO-FH-001').actId, fh001.actId);
  assert.equal(demo.getContext('followupAct', 'CIP-NO-EXISTE'), null);
});

test('0 EA no/no_consta con 0 líneas produce solo la fila de acto', () => {
  const fh002 = demo.getContext('followupAct', 'CIP-DEMO-FH-002');
  for (const present of ['no', 'no_consta']) {
    const projection = adapter.buildFollowupRawProjection(act(fh002, present, []));
    assert.equal(projection.rows.length, 1);
    assert.equal(projection.rows[0].row_role, 'followup_act');
    assert.equal(projection.rows[0].ea_present, present);
    assert.equal(projection.tsv.split('\n').length, 1);
    assert.equal(projection.tsv.split('\t').length, 166);
    assert.equal(core.validateRowSet(projection.rows).valid, true);
  }
});

test('1 acto + 2 líneas + 3 EA con sospechosos propios y externo', () => {
  const fh004 = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  const input = act(fh004, 'si', [
    ficha('FH-EA-EP-0001', 'FH-EA-OBS-0001', 'Cefalea sintética', [{ medicationRef: 'line:BIO-FH-004-L2' }]),
    ficha('FH-EA-EP-0002', 'FH-EA-OBS-0002', 'Náuseas sintéticas', [{ medicationRef: 'line:BIO-FH-004-L3' }]),
    ficha('FH-EA-EP-0003', 'FH-EA-OBS-0003', 'Erupción sintética', [{ medicationRef: 'other:TRAT-EXTERNO-SYN-1' }])
  ]);
  const before = JSON.stringify(input);
  const projection = adapter.buildFollowupRawProjection(input);
  assert.equal(JSON.stringify(input), before, 'la proyección no muta la entrada');
  const roles = projection.rows.map((row) => row.row_role);
  assert.equal(roles.filter((role) => role === 'followup_act').length, 1);
  assert.equal(roles.filter((role) => role === 'followup_line').length, 2);
  assert.equal(roles.filter((role) => role === 'ea_observation').length, 3);
  assert.equal(roles.filter((role) => role === 'ea_suspicion').length, 3);
  assert.equal(roles.filter((role) => role === 'ea_evaluation').length, 0);
  assert.deepEqual(
    Array.from(projection.rows.filter((row) => row.row_role === 'ea_suspicion').map((row) => row.ea_medication_ref)).sort(),
    ['line:BIO-FH-004-L2', 'line:BIO-FH-004-L3', 'other:TRAT-EXTERNO-SYN-1'].sort()
  );
  assert.equal(core.validateRowSet(projection.rows).valid, true);
  assert.equal(projection.tsv.split('\n').length, projection.rows.length);
  for (const count of cellCount(projection.tsv)) assert.equal(count, 166);
  assert.equal(
    JSON.stringify(core.parseTsvRows(projection.tsv).map((row) => row.row_id)),
    JSON.stringify(projection.rows.map((row) => row.row_id))
  );
  for (const row of projection.rows) {
    assert.equal(row.fh_act_id, fh004.actId);
    assert.equal(row.fh_patient_ref, fh004.patientRef);
    assert.equal(row.visit_id, fh004.visitId);
  }
});

test('presencia si/no/no_consta y contradicción de presencia', () => {
  const fh004 = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  const withEa = adapter.buildFollowupRawProjection(act(fh004, 'si', [
    ficha('FH-EA-EP-0001', 'FH-EA-OBS-0001', 'Cefalea', [])
  ]));
  assert.equal(withEa.rows[0].ea_present, 'si');
  const noEa = adapter.buildFollowupRawProjection(act(fh004, 'no', []));
  assert.equal(noEa.rows[0].ea_present, 'no');
  const unknown = adapter.buildFollowupRawProjection(act(fh004, 'no_consta', []));
  assert.equal(unknown.rows[0].ea_present, 'no_consta');
  reject('STATE_CONTRADICTION', () => adapter.buildFollowupRawProjection(act(fh004, 'si', [])));
  reject('STATE_CONTRADICTION', () => adapter.buildFollowupRawProjection(act(fh004, 'no', [
    ficha('FH-EA-EP-0001', 'FH-EA-OBS-0001', 'Cefalea', [])
  ])));
});

test('cambio A→B y actId/patientRef no coincidentes se rechazan', () => {
  const fh001 = demo.getContext('followupAct', 'CIP-DEMO-FH-001');
  const fh004 = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  const a = adapter.buildFollowupRawProjection(act(fh001, 'no_consta', []));
  const b = adapter.buildFollowupRawProjection(act(fh004, 'no_consta', []));
  assert.notEqual(a.rows[0].fh_act_id, b.rows[0].fh_act_id);
  assert.notEqual(a.rows[0].fh_patient_ref, b.rows[0].fh_patient_ref);
  const mixedAct = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  mixedAct.actId = fh001.actId;
  reject('IDENTITY_MISMATCH', () => adapter.buildFollowupRawProjection(act(mixedAct, 'no_consta', [])));
  const mixedPatient = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  mixedPatient.patientRef = fh001.patientRef;
  reject('IDENTITY_MISMATCH', () => adapter.buildFollowupRawProjection(act(mixedPatient, 'no_consta', [])));
});

test('G0 borrador y evaluación provisional rechazan TODO el acto', () => {
  const fh004 = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  reject('EA_NOT_INCORPORATED', () => adapter.buildFollowupRawProjection(act(fh004, 'si', [{
    episode_id: 'FH-EA-EP-0009',
    observation_id: 'FH-EA-OBS-0009',
    status: 'draft',
    description: ''
  }])));
  const provisional = ficha('FH-EA-EP-0001', 'FH-EA-OBS-0001', 'Cefalea', []);
  provisional.evaluations = [{
    evaluation_id: 'EVAL-SYN-1',
    medicationRef: 'line:BIO-FH-004-L2',
    method: 'naranjo',
    status: 'provisional'
  }];
  reject('EVALUATION_NOT_FINAL', () => adapter.buildFollowupRawProjection(act(fh004, 'si', [provisional])));
});

test('línea no activa, historia no representable y datos no soportados fallan cerrado', () => {
  const fh004 = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  const inactive = demo.getContext('followupAct', 'CIP-DEMO-FH-004');
  inactive.activeLines = [{
    rowKey: 'row-x',
    treatmentId: 'trat-x',
    lineId: 'line-x',
    lineRole: 'principal',
    isPrimaryLine: true,
    lineStatusAtEvent: 'active',
    activeAtEvent: false,
    drugName: 'Sintético'
  }];
  reject('LINE_NOT_ACTIVE', () => adapter.buildFollowupRawProjection(act(inactive, 'no_consta', [])));
  reject('INVALID_HISTORY', () => adapter.buildFollowupRawProjection(act(fh004, 'no_consta', [], { history: [{ broken: true }] })));
  reject('INVALID_HISTORY', () => adapter.buildFollowupRawProjection(act(fh004, 'no_consta', [], { history: [{}] })));
  reject('UNSUPPORTED_EA_FIELD', () => adapter.buildFollowupRawProjection(act(fh004, 'si', [Object.assign(
    ficha('FH-EA-EP-0001', 'FH-EA-OBS-0001', 'Cefalea', []),
    { dosis_inferida: '500 mg' }
  )])));
});

test('regresión C2a/V2: núcleo y contrato físico intactos', () => {
  assert.equal(core.VERSION, '2.1.0-draft.1');
  assert.equal(core.ROW_COLUMNS.length, 166);
  assert.equal(v2Core.ROW_COLUMNS.length, 152);
  assert.equal(adapter.ADAPTER_VERSION, '1.0.0-draft.1');
});

if (!process.exitCode) console.log('C2B FOLLOWUP FOCAL PASS ' + passed);
