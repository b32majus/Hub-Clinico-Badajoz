#!/usr/bin/env node
// C2a: comprobador RED/GREEN de núcleo puro Bridge raw tipado. Solo datos sintéticos.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const baseSchema = JSON.parse(script('schemas/farmacia_export_row_v2.schema.json'));
const newSchema = JSON.parse(script('schemas/farmacia_bridge_raw_ea_v21.schema.json'));
const context = {window:{HubTools:{}},console};
vm.createContext(context);
for (const file of ['scripts/farmacia_export_v2_core.js',
 'modules/farmacia_ea_invariants.js','scripts/farmacia_bridge_ea_typed_codec.js',
 'scripts/farmacia_bridge_raw_ea_v21_core.js']) {
 vm.runInContext(script(file),context,{filename:file});
}
const core = context.window.FarmaciaBridgeRawEaV21Core;
const codec = context.window.FarmaciaBridgeEaTypedCodec;
const EA_FIELDS = ['fh_act_id','fh_patient_ref','ea_present','ea_episode_id','ea_observation_id',
 'ea_related_episode_id','ea_basis_observation_id','ea_medication_ref','ea_evaluation_id',
 'ea_evaluation_method','ea_record_status','ea_evaluation_status','ea_payload_codec','ea_payload_json'];
let count = 0;
function test(label, fn) {
 try {fn();console.log('PASS '+label);count++; }
 catch(e){console.error('FAIL '+label+': '+e.stack);process.exitCode=1;}
}
function reject(code, fn) {
 assert.throws(fn,e=>!!e && (e.code===code || e.message?.includes(code)), 'must reject '+code);
}
function event(id='EV-A', patient='PAT-A') {
 return {event_id:id,source_event_id:id+'-SRC',event_type:'pharmacy_followup',
 event_status:'completed',occurred_at:'2026-10-25',recorded_at:'2026-10-25',
 demo_flag:true,patient_id:patient,identifier_system:'DEMO',identifier_value:patient,
 visit_id:id+'-VIS',visit_date:'2026-10-25',service_code:'DERMA'};
}
const line=(id)=>({rowKey:id,treatment_id:'TR-'+id,line_id:id,line_role:'additional',
 is_primary_line:false,line_status_at_event:'active',active_at_event:true,line_drug_name:'SINTETICO'});
const observation=(n,episode='EP-'+n,act='ACT-A',patient='PAT-A')=>
 ({patientRef:patient,actId:act,episode_id:episode,observation_id:'OBS-'+n,
   status:'incorporated',description:'Sintético '+n});
function input(id='EV-A', patient='PAT-A',act='ACT-A') {
 return {event:event(id,patient),patientRef:patient,actId:act,present:'si',
   activeLines:[line('LINE-A'),line('LINE-B')],history:[],selections:[],
   adverse_events:[observation(1,'EP-1',act,patient),observation(2,'EP-2',act,patient),
     observation(3,'EP-3',act,patient)]};
}
const sup=(ep,m,patient='PAT-A')=>({patientRef:patient,episode_id:ep,medicationRef:m});
const evaln=(id,ep,m,act='ACT-A',patient='PAT-A')=>({
 evaluation_id:id,patientRef:patient,episode_id:ep,medicationRef:m,method:'Naranjo',actId:act
});
function richInput(){
 const x=input();
 x.adverse_events[0].suspicions=[sup('EP-1','LINE-A')];
 x.adverse_events[1].suspicions=[sup('EP-2','LINE-B')];
 x.adverse_events[2].suspicions=[sup('EP-3','EXT-01')];
 x.adverse_events[0].evaluations=[evaln('EVAL-1','EP-1','LINE-A')];
 x.adverse_events[0].extraNote=undefined;
 x.adverse_events[1].another=null;
 return x;
}
test('schema preserves 152 originals and appends exactly 14',()=>{
 assert.equal(newSchema['x-column-order'].length,166);
 assert.deepEqual(Array.from(newSchema['x-column-order'].slice(0,152)),baseSchema['x-column-order']);
 assert.deepEqual(Array.from(newSchema['x-column-order'].slice(152)),EA_FIELDS);
 assert.equal(newSchema.properties.row_schema_version.const,'2.1.0-draft.1');
 assert.equal(newSchema.additionalProperties,false);
});
test('core column order and role definitions',()=>{
 assert.equal(core.ROW_COLUMNS.length,166);
 assert.deepEqual(Array.from(core.ROW_COLUMNS),newSchema['x-column-order']);
 for(const role of ['followup_act','followup_line','ea_observation','ea_suspicion','ea_evaluation'])
  assert.ok(core.ROW_ROLES.includes(role),role);
});
test('codec preserves absent versus own undefined versus null, nested/arrays',()=>{
 const val={first:undefined,second:null,nest:{a:undefined,normal:'ok'},arr:[undefined,null]};
 const wire=codec.encode(val);
 const back=codec.decode(wire);
 assert.equal(Object.hasOwn(back,'missing'),false);
 assert.equal(Object.hasOwn(back,'first'),true);
 assert.equal(back.first,undefined);
 assert.equal(back.second,null);
 assert.equal(Object.hasOwn(back.nest,'a'),true);
 assert.equal(back.nest.a,undefined);
 assert.equal(back.arr.length,2);
 assert.equal(Object.hasOwn(back.arr,0),true);
 assert.equal(back.arr[0],undefined);
 assert.equal(back.arr[1],null);
});
test('codec fail-closed dangerous descriptors and malformed paths',()=>{
 let reads=0;
 const obj={name:'ok'};
 Object.defineProperty(obj,'evil',{enumerable:true,get(){reads++;return 'bad';}});
 reject('UNSUPPORTED_STRUCTURE',()=>codec.encode(obj));assert.equal(reads,0);
 reject('INVALID_CODEC',()=>codec.decode('{"value":{"x":null},"undefinedPaths":["/not-exist"]}'));
 reject('INVALID_CODEC',()=>codec.decode('{"value":{},"undefinedPaths":["/__proto__"]}'));
 const cyc={};cyc.self=cyc;reject('UNSUPPORTED_STRUCTURE',()=>codec.encode(cyc));
 const sparse=[];sparse.length=2;sparse[1]='X';reject('UNSUPPORTED_STRUCTURE',()=>codec.encode({sparse}));
});
test('two lines three EA with suspects and evaluation are ten typed rows',()=>{
 const rows=core.buildFollowupRows(richInput());
 assert.equal(rows.length,10);
 assert.deepEqual(Array.from(rows.map(r=>r.row_role)),
 ['followup_act','followup_line','followup_line','ea_observation','ea_suspicion',
 'ea_evaluation','ea_observation','ea_suspicion','ea_observation','ea_suspicion']);
});
test('0 EA explicit no/no_consta have act row even without lines',()=>{
 for(const present of ['no','no_consta']){
  const x=input();x.present=present;x.adverse_events=[];x.activeLines=[];
  const rows=core.buildFollowupRows(x);
  assert.equal(rows.length,1);assert.equal(rows[0].row_role,'followup_act');
  assert.equal(rows[0].ea_present,present);
  assert.equal(core.decodeFollowupRows(rows).present,present);
 }
});
test('state contradiction blocks the entire copy',()=>{
 const x=input();x.adverse_events=[];reject('STATE_CONTRADICTION',()=>core.buildFollowupRows(x));
 x.present='no';x.adverse_events=[observation(1)];reject('STATE_CONTRADICTION',()=>core.buildFollowupRows(x));
});
test('independent 1/2/5 EA cardinalities',()=>{
 for(const n of [1,2,5]){
  const x=input();x.activeLines=[];x.adverse_events=Array.from({length:n},(_,i)=>observation(i+1));
  const rows=core.buildFollowupRows(x);
  assert.equal(rows.length,n+1);
  assert.equal(rows.filter(r=>r.row_role==='ea_observation').length,n);
 }
});
test('roundtrip 2 lines 3 EA including suspects, evaluation, null and undefined',()=>{
 const x=richInput();
 const rows=core.buildFollowupRows(x);
 const tsv=core.serializeRowsToTsv(rows);
 const parsed=core.parseTsvRows(tsv);
 const back=core.decodeFollowupRows(parsed);
 assert.equal(back.actId,x.actId);assert.equal(back.patientRef,x.patientRef);
 assert.equal(back.adverse_events.length,3);
 assert.equal(back.activeLines.length,2);
 assert.equal(back.adverse_events[0].suspicions[0].medicationRef,'LINE-A');
 assert.equal(back.adverse_events[1].suspicions[0].medicationRef,'LINE-B');
 assert.equal(back.adverse_events[2].suspicions[0].medicationRef,'EXT-01');
 assert.equal(back.adverse_events[0].evaluations[0].evaluation_id,'EVAL-1');
 assert.equal(Object.hasOwn(back.adverse_events[0],'extraNote'),true);
 assert.equal(back.adverse_events[0].extraNote,undefined);
 assert.equal(back.adverse_events[1].another,null);
 assert.equal(core.serializeRowsToTsv(parsed),tsv);
});
test('clinical identity must be explicitly supplied, not synthesized',()=>{
 const x=richInput();delete x.actId;reject('INVALID_ACT_ID',()=>core.buildFollowupRows(x));
 const y=richInput();delete y.patientRef;reject('INVALID_PATIENT_REF',()=>core.buildFollowupRows(y));
});
test('unrelated patient and duplicate observations blocked by R1',()=>{
 const x=input();x.adverse_events[0].patientRef='PAT-B';reject('PATIENT_ASSOCIATION_MISMATCH',()=>core.buildFollowupRows(x));
 const y=input();y.adverse_events[1].observation_id=y.adverse_events[0].observation_id;
 reject('DUPLICATE_OBSERVATION_ID',()=>core.buildFollowupRows(y));
});
test('tampering row_count or missing row rejected',()=>{
 const r=core.buildFollowupRows(richInput());
 const altered=structuredClone(r);altered[0].row_count+=1;
 assert.equal(core.validateRowSet(altered).valid,false);
 assert.equal(core.validateRowSet(r.slice(1)).valid,false);
});
test('mismatch between typed row payload and indexes fails closed',()=>{
 const r=structuredClone(core.buildFollowupRows(richInput()));
 const obs=r.find(x=>x.row_role==='ea_observation');
 obs.ea_episode_id='EP-OTHER';
 assert.equal(core.validateRowSet(r).valid,false);
 reject('INVALID_ROW_SET',()=>core.decodeFollowupRows(r));
});
test('overlong Excel cell fails before any transfer',()=>{
 const x=richInput();x.adverse_events[0].description='L'.repeat(33000);
 reject('EXCEL_CELL_LIMIT',()=>core.buildFollowupRows(x));
});
test('formula-like text is encoded with quote as first cell character',()=>{
 const x=input();x.adverse_events=[observation(1)];
 x.adverse_events[0].description='=2+2';
 const rows=core.buildFollowupRows(x);
 const tsv=core.serializeRowsToTsv(rows);
 assert.ok(!tsv.split('\t').some(cell=>cell[0]==='='));
 const back=core.decodeFollowupRows(core.parseTsvRows(tsv));
 assert.equal(back.adverse_events[0].description,'=2+2');
});
test('legacy 152-column row and version are not silently reinterpreted',()=>{
 const x=input();const tsv=core.serializeRowsToTsv(core.buildFollowupRows(x));
 const broken=tsv.split('\n').map(s=>s.split('\t').slice(0,152).join('\t')).join('\n');
 reject('INVALID_TSV_COLUMN_COUNT',()=>core.parseTsvRows(broken));
});
test('all explicit V2 common event fields survive and cannot diverge across rows',()=>{
const x=richInput();x.event.proms_json=[{instrument:'TEST',value:7}];
x.event.visit_general_observations='Nota sintética no omitida';
const rows=core.buildFollowupRows(x);
const back=core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(rows)));
assert.equal(back.event.visit_general_observations,'Nota sintética no omitida');
assert.equal(back.event.proms_json[0].instrument,'TEST');
const altered=structuredClone(rows);altered[3].visit_general_observations='Cambió';
assert.equal(core.validateRowSet(altered).valid,false);
});
test('association payloads preserve their own declared fields, no synthetic properties',()=>{
const x=richInput();x.adverse_events[0].suspicions[0].reviewNote=undefined;
x.adverse_events[0].suspicions[0].observation_id='OBS-1';
x.adverse_events[0].evaluations[0].note=null;
const b=core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(core.buildFollowupRows(x))));
const s=b.adverse_events[0].suspicions[0];
assert.equal(s.observation_id,'OBS-1');assert.equal(Object.hasOwn(s,'reviewNote'),true);assert.equal(s.reviewNote,undefined);
assert.equal(Object.hasOwn(s,'actId'),false);
assert.equal(Object.hasOwn(b.adverse_events[0].evaluations[0],'observation_id'),false);
assert.equal(b.adverse_events[0].evaluations[0].note,null);
});
test('draft clinical evaluation blocks export rather than masquerading as completed',()=>{
const x=richInput();x.adverse_events[0].evaluations[0].status='borrador';
reject('EVALUATION_NOT_FINAL',()=>core.buildFollowupRows(x));
});
test('mutable getters in technical event and line never execute',()=>{
 let reads=0;
 const a=richInput();
 Object.defineProperty(a.event,'recorded_at',{enumerable:true,get(){reads++;return '2026-10-25';}});
 reject('UNSUPPORTED_STRUCTURE',()=>core.buildFollowupRows(a));assert.equal(reads,0);
 const b=richInput();Object.defineProperty(b.activeLines[0],'line_id',{enumerable:true,get(){reads++;return 'LINE-ALTERED';}});
 reject('UNSUPPORTED_STRUCTURE',()=>core.buildFollowupRows(b));assert.equal(reads,0);
});
test('tampered dates and importing provisional evaluations fail closed',()=>{
 const r=structuredClone(core.buildFollowupRows(richInput()));
 for(const row of r)row.recorded_at='2026-02-30';
 assert.equal(core.validateRowSet(r).valid,false);
 const draft=structuredClone(core.buildFollowupRows(richInput()));
 const ev=draft.find(row=>row.row_role==='ea_evaluation');
 const decoded=codec.decode(ev.ea_payload_json);decoded.status='borrador';
 ev.ea_payload_json=codec.encode(decoded);ev.ea_evaluation_status='borrador';
 assert.equal(core.validateRowSet(draft).valid,false);
});
test('nonline row cannot contain a line therapy field',()=>{
 const rows=structuredClone(core.buildFollowupRows(richInput()));
 rows[3].line_drug_name='NO SE DEBE HEREDAR';
 assert.equal(core.validateRowSet(rows).valid,false);
});
test('codec rejects noncanonical/ambiguous JSON and symbols on arrays',()=>{
 reject('INVALID_CODEC',()=>codec.decode('{"value":{"x":1,"x":2},"undefinedPaths":[]}'));
 const arr=[1];arr[Symbol('hidden')]='discarded';
 reject('UNSUPPORTED_STRUCTURE',()=>codec.encode({arr}));
});
test('row set rejects duplicate evaluation identity in one observation',()=>{
 const x=richInput();
 x.adverse_events[0].evaluations.push(evaln('EVAL-2','EP-1','LINE-A'));
 const rows=structuredClone(core.buildFollowupRows(x));
 const evalRows=rows.filter(r=>r.row_role==='ea_evaluation');
 assert.equal(evalRows.length,2);
 const second=evalRows[1];const payload=codec.decode(second.ea_payload_json);
 payload.evaluation_id='EVAL-1';second.ea_evaluation_id='EVAL-1';
 second.ea_payload_json=codec.encode(payload);
 assert.equal(core.validateRowSet(rows).valid,false);
});
test('no real persistence claim and no mutating inputs',()=>{
 const x=richInput();const before=x.adverse_events[0].description;
 core.buildFollowupRows(x);
 assert.equal(x.adverse_events[0].description,before);
 assert.equal(Object.hasOwn(core,'writeExcel'),false);
});
/* =====================================================================
 * C2a-R1 · integridad declarada (adenda C1 ratificada 25-10-2026).
 * Manifiesto tecnico de cardinalidad en la fila de acto, envoltorio de
 * observacion v2 y forma exacta de las asociaciones. Ningun recuento
 * transporta dato clinico: solo cardinalidad de transporte.
 * ===================================================================== */
const OBS_CODEC = 'fh-ea-typed-json/2';
const ENTITY_CODEC = 'fh-ea-typed-json/1';
const MANIFEST_CODEC = 'fh-ea-bridge-manifest/1';
function reindex(rows) {
 return rows.map((r, i) => Object.assign({}, r, { row_index: i + 1, row_count: rows.length }));
}
function dropAt(rows, index) { return reindex(rows.filter((r, i) => i !== index)); }
function manifestOf(rows) { return codec.decodeManifest(rows[0].ea_payload_json); }
function setManifest(rows, next) {
 rows[0].ea_payload_json = codec.encodeManifest(next);
 rows[0].ea_payload_codec = MANIFEST_CODEC;
 return rows;
}
function errorCodes(rows) { return core.validateRowSet(rows).errors.map(e => e.code); }
function reencodeObservation(envelope) {
 const entity = structuredClone(envelope.value);
 for (const field of Object.keys(envelope.associations)) delete entity[field];
 return codec.encodeObservation(entity, envelope.associations);
}
function expectSetCode(label, rows, code) {
 const found = errorCodes(rows);
 assert.ok(found.includes(code), label + ': se esperaba ' + code + ' y llego ' + JSON.stringify(found.slice(0, 6)));
}
function rowOf(rows, role, matcher) {
 return rows.filter(r => r.row_role === role).find(r => (matcher ? matcher(r) : true));
}

// ---- P1-A: lineas activas, identidad y coherencia ----
test('R1 P1-A a suspended line is rejected when building', () => {
 const x = input();
 x.activeLines = [Object.assign(line('LINE-A'), { line_status_at_event: 'suspended', active_at_event: false })];
 reject('FOLLOWUP_LINE_MUST_BE_ACTIVE', () => core.buildFollowupRows(x));
});
test('R1 P1-A a line that declares itself inactive is rejected', () => {
 const x = input();
 x.activeLines = [Object.assign(line('LINE-A'), { active_at_event: false })];
 reject('FOLLOWUP_LINE_MUST_BE_ACTIVE', () => core.buildFollowupRows(x));
});
test('R1 P1-A a non-active status is rejected even when flagged active', () => {
 const x = input();
 x.activeLines = [Object.assign(line('LINE-A'), { line_status_at_event: 'inactive' })];
 reject('FOLLOWUP_LINE_STATUS', () => core.buildFollowupRows(x));
});
test('R1 P1-A primary role and primary flag must be coherent', () => {
 const x = input();
 x.activeLines = [Object.assign(line('LINE-A'), { line_role: 'principal', is_primary_line: false })];
 reject('INVALID_PRIMARY_COHERENCE', () => core.buildFollowupRows(x));
 const y = input();
 y.activeLines = [Object.assign(line('LINE-A'), { line_role: 'additional', is_primary_line: true })];
 reject('INVALID_PRIMARY_COHERENCE', () => core.buildFollowupRows(y));
});
test('R1 P1-A at most one primary line per act', () => {
 const x = input();
 x.activeLines = [
  Object.assign(line('LINE-A'), { line_role: 'principal', is_primary_line: true }),
  Object.assign(line('LINE-B'), { line_role: 'principal', is_primary_line: true })];
 reject('MULTIPLE_PRIMARY_LINES', () => core.buildFollowupRows(x));
});
test('R1 P1-A a line without drug identity is rejected', () => {
 const x = input();
 x.activeLines = [Object.assign(line('LINE-A'), { line_drug_name: null, line_active_ingredient: null })];
 reject('LINE_NOT_IDENTIFIABLE', () => core.buildFollowupRows(x));
 const y = input();
 y.activeLines = [Object.assign(line('LINE-A'), { line_drug_name: '—' })];
 reject('LINE_NOT_IDENTIFIABLE', () => core.buildFollowupRows(y));
});
test('R1 P1-A required line identity fields cannot be blank', () => {
 for (const field of ['line_id', 'treatment_id', 'line_role', 'line_status_at_event']) {
  const x = input();
  x.activeLines = [Object.assign(line('LINE-A'), { [field]: null })];
  reject('MISSING_REQUIRED', () => core.buildFollowupRows(x));
 }
});
test('R1 P1-A unknown line role and legacy placeholders are rejected', () => {
 const x = input();
 x.activeLines = [Object.assign(line('LINE-A'), { line_role: 'other' })];
 reject('INVALID_LINE_ROLE', () => core.buildFollowupRows(x));
 const y = input();
 y.activeLines = [Object.assign(line('LINE-A'), { line_dose_text: '  No informado ' })];
 reject('PLACEHOLDER_NOT_ALLOWED', () => core.buildFollowupRows(y));
});
test('R1 P1-A imported rows repeat the same line invariants', () => {
 const rows = core.buildFollowupRows(richInput());
 const suspended = structuredClone(rows);
 rowOf(suspended, 'followup_line').active_at_event = false;
 expectSetCode('active_at_event', suspended, 'FOLLOWUP_LINE_MUST_BE_ACTIVE');
 const incoherent = structuredClone(rows);
 const lineRow = rowOf(incoherent, 'followup_line');
 lineRow.line_role = 'principal';
 lineRow.is_primary_line = false;
 expectSetCode('primary coherence', incoherent, 'INVALID_PRIMARY_COHERENCE');
 const unidentifiable = structuredClone(rows);
 const other = rowOf(unidentifiable, 'followup_line');
 other.line_drug_name = null;
 other.line_active_ingredient = null;
 expectSetCode('identifiability', unidentifiable, 'LINE_NOT_IDENTIFIABLE');
 reject('INVALID_ROW_SET', () => core.decodeFollowupRows(suspended));
});
test('R1 P1-A zero lines stay valid, with and without EA', () => {
 const withEa = input();
 withEa.activeLines = [];
 const rowsEa = core.buildFollowupRows(withEa);
 assert.equal(rowsEa.filter(r => r.row_role === 'followup_line').length, 0);
 assert.equal(manifestOf(rowsEa).lines, 0);
 const empty = input();
 empty.activeLines = [];
 empty.present = 'no_consta';
 empty.adverse_events = [];
 const rowsEmpty = core.buildFollowupRows(empty);
 assert.equal(rowsEmpty.length, 1);
 const emptyManifest = manifestOf(rowsEmpty);
 for (const [key, value] of Object.entries({ evaluations: 0, lines: 0, observations: 0, suspicions: 0 })) {
  assert.equal(emptyManifest[key], value, key);
 }
});

// ---- P1-B: manifiesto, cardinalidad y renumeracion ----
test('R1 P1-B the act row declares a technical manifest only', () => {
 const rows = core.buildFollowupRows(richInput());
 assert.equal(rows[0].row_role, 'followup_act');
 assert.equal(rows[0].ea_payload_codec, MANIFEST_CODEC);
 const m = manifestOf(rows);
 assert.deepEqual(Object.keys(m).sort(), ['evaluations', 'lines', 'observations', 'suspicions']);
 for (const key of Object.keys(m)) assert.equal(Number.isInteger(m[key]) && m[key] >= 0, true, key);
 assert.equal(m.evaluations, 1); assert.equal(m.lines, 2);
 assert.equal(m.observations, 3); assert.equal(m.suspicions, 3);
 assert.ok(!/paciente|patient|dose|dosis|grave|severity/i.test(rows[0].ea_payload_json));
});
test('R1 P1-B deleting the last suspicion with renumbering is blocked', () => {
 const rows = core.buildFollowupRows(richInput());
 const suspectRows = rows.map((r, i) => [r, i]).filter(([r]) => r.row_role === 'ea_suspicion');
 const last = suspectRows[suspectRows.length - 1][1];
 const altered = dropAt(rows, last);
 assert.equal(altered.length, rows.length - 1);
 assert.equal(altered[0].row_count, altered.length);
 expectSetCode('last suspicion', altered, 'EXPECTED_SUSPICION_COUNT_MISMATCH');
 reject('INVALID_ROW_SET', () => core.decodeFollowupRows(altered));
});
test('R1 P1-B deleting a middle suspicion with renumbering is blocked', () => {
 const x = richInput();
 x.adverse_events[0].suspicions.push(sup('EP-1', 'EXT-02'));
 const rows = core.buildFollowupRows(x);
 const first = rows.findIndex(r => r.row_role === 'ea_suspicion');
 const altered = dropAt(rows, first);
 expectSetCode('middle suspicion', altered, 'EXPECTED_SUSPICION_COUNT_MISMATCH');
 assert.ok(errorCodes(altered).includes('ASSOCIATION_INDEX_GAP'));
});
test('R1 P1-B deleting evaluations, observations or lines is blocked', () => {
 const rows = core.buildFollowupRows(richInput());
 const evalRows = rows.findIndex(r => r.row_role === 'ea_evaluation');
 expectSetCode('evaluation', dropAt(rows, evalRows), 'EXPECTED_EVALUATION_COUNT_MISMATCH');
 const obsRows = rows.findIndex(r => r.row_role === 'ea_observation');
 expectSetCode('observation', dropAt(rows, obsRows), 'EXPECTED_OBSERVATION_COUNT_MISMATCH');
 const lineRows = rows.findIndex(r => r.row_role === 'followup_line');
 expectSetCode('line', dropAt(rows, lineRows), 'EXPECTED_LINE_COUNT_MISMATCH');
});
test('R1 P1-B injecting lines, observations or suspicions is blocked', () => {
 const rows = core.buildFollowupRows(richInput());
 const lineRow = structuredClone(rows.find(r => r.row_role === 'followup_line'));
 const injectedLine = reindex([...rows, Object.assign(lineRow, { row_id: 'EV-A-SRC::followup_line::INJECTED',
  line_id: 'LINE-INJ', treatment_id: 'TR-INJ' })]);
 expectSetCode('injected line', injectedLine, 'EXPECTED_LINE_COUNT_MISMATCH');
 const obsRow = structuredClone(rows.find(r => r.row_role === 'ea_observation'));
 const envelope = codec.decodeObservation(obsRow.ea_payload_json);
 envelope.value.observation_id = 'OBS-9';
 envelope.value.episode_id = 'EP-9';
 const injectedObs = reindex([...rows, Object.assign(obsRow, {
  row_id: 'EV-A-SRC::ea_observation::OBS-9', ea_observation_id: 'OBS-9', ea_episode_id: 'EP-9',
  ea_payload_json: reencodeObservation(envelope)
 })]);
 expectSetCode('injected observation', injectedObs, 'EXPECTED_OBSERVATION_COUNT_MISMATCH');
 const base = input();
 base.adverse_events[0].suspicions = [];
 const clean = core.buildFollowupRows(base);
 const template = structuredClone(rows.find(r => r.row_role === 'ea_suspicion'));
 const injectedSuspicion = reindex([...clean, template]);
 expectSetCode('injected suspicion', injectedSuspicion, 'EXPECTED_SUSPICION_COUNT_MISMATCH');
});
test('R1 P1-B a tampered manifest is rejected', () => {
 const rows = core.buildFollowupRows(richInput());
 const altered = structuredClone(rows);
 setManifest(altered, Object.assign(manifestOf(altered), { observations: 4 }));
 expectSetCode('manifest observation count', altered, 'EXPECTED_OBSERVATION_COUNT_MISMATCH');
 const broken = structuredClone(rows);
 broken[0].ea_payload_json = '{"lines":"dos"}';
 assert.ok(errorCodes(broken).includes('INVALID_ACT_MANIFEST'));
 const missing = structuredClone(rows);
 missing[0].ea_payload_json = '{"lines":2,"observations":3,"suspicions":3}';
 assert.ok(errorCodes(missing).includes('INVALID_ACT_MANIFEST'));
});
test('R1 P1-B association suffix indexes must be contiguous and unique', () => {
 const x = richInput();
 x.adverse_events[0].suspicions.push(sup('EP-1', 'EXT-02'));
 const rows = core.buildFollowupRows(x);
 const suspect = rows.filter(r => r.row_role === 'ea_suspicion');
 const duplicated = structuredClone(rows);
 const target = duplicated.filter(r => r.row_role === 'ea_suspicion')[1];
 target.row_id = target.row_id.replace(/-S1$/, '-S00');
 assert.ok(errorCodes(duplicated).includes('ASSOCIATION_INDEX_DUPLICATE'));
 const sourceMismatch = structuredClone(rows);
 sourceMismatch.find(r => r.row_role === 'ea_suspicion').row_id = 'OTRO::ea_suspicion::OBS-1-S0';
 assert.ok(errorCodes(sourceMismatch).includes('ROW_ID_SOURCE_MISMATCH'));
 assert.equal(suspect.length >= 2, true);
});
test('R1 P1-B a coherent rewrite of rows and manifest stays a known limit', () => {
 // Limitacion declarada: un libro editable sin firma no autentica el origen.
 // Este test fija el limite para que ninguna promesa futura lo contradiga.
 const rows = core.buildFollowupRows(richInput());
 const withoutLast = dropAt(rows, rows.length - 1);
 const rewritten = structuredClone(withoutLast);
 const lastObservation = rewritten[rewritten.length - 1];
 const envelope = codec.decodeObservation(lastObservation.ea_payload_json);
 envelope.associations.suspicions = { count: 0 };
 lastObservation.ea_payload_json = reencodeObservation(envelope);
 setManifest(rewritten, { evaluations: 1, lines: 2, observations: 3, suspicions: 2 });
 assert.equal(core.validateRowSet(rewritten).valid, true);
 const back = core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(rewritten)));
 assert.equal(back.adverse_events.reduce((n, o) => n + (Array.isArray(o.suspicions) ? o.suspicions.length : 0), 0), 2);
});
test('R1 P1-B association cardinality is declared per observation', () => {
 const rows = core.buildFollowupRows(richInput());
 const obs = rows.find(r => r.row_role === 'ea_observation');
 const envelope = codec.decodeObservation(obs.ea_payload_json);
 assert.equal(envelope.associations.suspicions.count, 1);
 assert.equal(envelope.associations.evaluations.count, 1);
 // The stored clinical entity never embeds the association arrays.
 const stored = JSON.parse(obs.ea_payload_json);
 assert.equal(Object.hasOwn(stored.value, 'suspicions'), false);
 assert.equal(Object.hasOwn(stored.value, 'evaluations'), false);
 assert.equal(stored.associations.suspicions.count, 1);
});

// ---- P1-B: forma exacta de asociaciones ----
test('R1 P1-B association shape is preserved: absent, undefined, null, empty, present', () => {
 const x = input();
 x.adverse_events = [observation(1), observation(2), observation(3), observation(4), observation(5)];
 x.adverse_events[0].suspicions = undefined;
 x.adverse_events[1].suspicions = null;
 x.adverse_events[2].suspicions = [];
 x.adverse_events[3].suspicions = [sup('EP-4', 'EXT-04')];
 const rows = core.buildFollowupRows(x);
 const back = core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(rows)));
 assert.equal(Object.hasOwn(back.adverse_events[0], 'suspicions'), true);
 assert.equal(back.adverse_events[0].suspicions, undefined);
 assert.equal(Object.hasOwn(back.adverse_events[1], 'suspicions'), true);
 assert.equal(back.adverse_events[1].suspicions, null);
 assert.equal(Array.isArray(back.adverse_events[2].suspicions), true);
 assert.equal(back.adverse_events[2].suspicions.length, 0);
 assert.equal(back.adverse_events[3].suspicions[0].medicationRef, 'EXT-04');
 assert.equal(Object.hasOwn(back.adverse_events[4], 'suspicions'), false);
});
test('R1 P1-B a non-array association marker authorizes no rows', () => {
 const x = input();
 x.adverse_events[0].suspicions = 'no_consta';
 const rows = core.buildFollowupRows(x);
 const back = core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(rows)));
 assert.equal(back.adverse_events[0].suspicions, 'no_consta');
 const template = structuredClone(rows.find(r => r.row_role === 'ea_observation'));
 assert.equal(template.ea_payload_codec, OBS_CODEC);
});

// ---- Identidad longitudinal y espacios C1 ----
test('R1 two observations of the same episode in different acts stay distinct', () => {
 const actA = input('EV-A', 'PAT-A', 'ACT-A');
 const rowsA = core.buildFollowupRows(actA);
 const historyEntry = { patientRef: 'PAT-A', actId: 'ACT-A', episode_id: 'EP-1', observation_id: 'OBS-1', status: 'incorporated' };
 const actB = { event: event('EV-B', 'PAT-A'), patientRef: 'PAT-A', actId: 'ACT-B', present: 'si',
  activeLines: [], history: [historyEntry], selections: [],
  adverse_events: [Object.assign(observation(2, 'EP-1', 'ACT-B'), { basis: Object.assign({}, historyEntry), evolution: 'continuation' })] };
 const rowsB = core.buildFollowupRows(actB);
 const backB = core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(rowsB)));
 assert.equal(backB.adverse_events[0].observation_id, 'OBS-2');
 assert.equal(backB.adverse_events[0].episode_id, 'EP-1');
 assert.equal(backB.adverse_events[0].basis.observation_id, 'OBS-1');
 assert.equal(core.validateRowSet(rowsA).valid, true);
 assert.equal(manifestOf(rowsB).observations, 1);
});
test('R1 explicit recurrence is carried, never inferred', () => {
 const historyEntry = { patientRef: 'PAT-A', actId: 'ACT-A', episode_id: 'EP-1', observation_id: 'OBS-1', status: 'incorporated' };
 const recurrence = { event: event('EV-B', 'PAT-A'), patientRef: 'PAT-A', actId: 'ACT-B', present: 'si',
  activeLines: [], history: [historyEntry], selections: [],
  adverse_events: [Object.assign(observation(2, 'EP-9', 'ACT-B'), {
   basis: Object.assign({}, historyEntry), evolution: 'recurrence', description: 'Recurrencia sintetica',
   relatedEpisodeId: 'EP-1' })] };
 const rows = core.buildFollowupRows(recurrence);
 const back = core.decodeFollowupRows(core.parseTsvRows(core.serializeRowsToTsv(rows)));
 assert.equal(back.adverse_events[0].relatedEpisodeId, 'EP-1');
 assert.equal(rows.find(r => r.row_role === 'ea_observation').ea_related_episode_id, 'EP-1');
 const withoutBasis = structuredClone(recurrence);
 delete withoutBasis.adverse_events[0].basis;
 assert.throws(() => core.buildFollowupRows(withoutBasis), e => e.code === 'MISSING_BASIS');
});
test('R1 the codec is versioned per role and never reinterpreted', () => {
 const rows = core.buildFollowupRows(richInput());
 assert.equal(rows[0].ea_payload_codec, MANIFEST_CODEC);
 assert.equal(rowOf(rows, 'ea_observation').ea_payload_codec, OBS_CODEC);
 for (const role of ['ea_suspicion', 'ea_evaluation']) {
  assert.equal(rowOf(rows, role).ea_payload_codec, ENTITY_CODEC, role);
 }
 const downgraded = structuredClone(rows);
 rowOf(downgraded, 'ea_observation').ea_payload_codec = ENTITY_CODEC;
 expectSetCode('observation downgraded', downgraded, 'INVALID_EA_CODEC');
 const lineWithPayload = structuredClone(rows);
 Object.assign(rowOf(lineWithPayload, 'followup_line'), {
  ea_payload_codec: MANIFEST_CODEC, ea_payload_json: '{}' });
 expectSetCode('line payload', lineWithPayload, 'UNEXPECTED_EA_PAYLOAD');
});

// ---- P2 / P3 ----
test('R1 P2-C both schemas have distinct identity and columns', () => {
 assert.notEqual(newSchema['$id'], baseSchema['$id']);
 assert.notEqual(newSchema.title, baseSchema.title);
 const registry = new Map([[baseSchema['$id'], baseSchema], [newSchema['$id'], newSchema]]);
 assert.equal(registry.size, 2);
 assert.equal(newSchema.properties.ea_payload_codec.enum.includes(MANIFEST_CODEC), true);
 assert.equal(newSchema.properties.ea_payload_codec.enum.includes(OBS_CODEC), true);
 assert.equal(newSchema.properties.ea_payload_codec.enum.includes(ENTITY_CODEC), true);
});
test('R1 P3-G the schema constrains line and act rows by role', () => {
 const branches = (newSchema.allOf || []).filter(entry => entry.if && entry.if.properties && entry.if.properties.row_role);
 const byRole = role => branches.find(entry => {
  const constValue = entry.if.properties.row_role.const;
  if (constValue === role) return true;
  const enumValues = entry.if.properties.row_role.enum;
  return Array.isArray(enumValues) && enumValues.includes(role);
 });
 const lineBranch = byRole('followup_line');
 assert.ok(lineBranch, 'followup_line branch');
 assert.equal(lineBranch.then.properties.line_status_at_event.const, 'active');
 assert.equal(lineBranch.then.properties.active_at_event.const, true);
 assert.equal(lineBranch.then.properties.is_primary_line.type, 'boolean');
 assert.deepEqual(Array.from(lineBranch.then.properties.line_role.enum), ['principal', 'additional']);
 for (const field of ['line_id', 'treatment_id', 'line_role', 'line_status_at_event', 'active_at_event', 'is_primary_line']) {
  assert.ok(lineBranch.then.required.includes(field), field);
 }
 const actBranch = byRole('followup_act');
 assert.ok(actBranch, 'followup_act branch');
 assert.equal(actBranch.then.properties.ea_payload_codec.const, MANIFEST_CODEC);
 const obsBranch = byRole('ea_observation');
 assert.equal(obsBranch.then.properties.ea_payload_codec.const, OBS_CODEC);
});
test('R1 P3-E one single EVALUATION_NOT_FINAL per cause', () => {
 const rows = structuredClone(core.buildFollowupRows(richInput()));
 const evaluation = rowOf(rows, 'ea_evaluation');
 const payload = codec.decode(evaluation.ea_payload_json);
 payload.status = 'borrador';
 evaluation.ea_payload_json = codec.encode(payload);
 evaluation.ea_evaluation_status = 'borrador';
 const codes = core.validateRow(evaluation).errors.map(e => e.code);
 assert.equal(codes.filter(c => c === 'EVALUATION_NOT_FINAL').length, 1, JSON.stringify(codes));
});
test('R1 P3-F malformed row_id fails closed with a typed error', () => {
 for (const badId of ['SRC::followup_line::%', 'SRC::followup_line', '::followup_line::K', 'A::B::C::D']) {
  const rows = structuredClone(core.buildFollowupRows(richInput()));
  const lineRow = rowOf(rows, 'followup_line');
  lineRow.row_id = badId;
  const result = core.validateRowSet(rows);
  assert.equal(result.valid, false, badId);
  assert.ok(result.errors.some(e => e.code === 'INVALID_ROW_ID'), badId + ' -> ' + JSON.stringify(result.errors.map(e => e.code)));
  assert.throws(() => core.decodeFollowupRows(rows), e => e.code === 'INVALID_ROW_SET', badId);
 }
 const roleMismatch = structuredClone(core.buildFollowupRows(richInput()));
 rowOf(roleMismatch, 'followup_line').row_id = 'EV-A-SRC::validation::KEY';
 assert.ok(errorCodes(roleMismatch).includes('ROW_ID_ROLE_MISMATCH'));
 const sourceMismatch = structuredClone(core.buildFollowupRows(richInput()));
 rowOf(sourceMismatch, 'followup_line').row_id = 'OTRA-FUENTE::followup_line::LINE-A';
 assert.ok(errorCodes(sourceMismatch).includes('ROW_ID_SOURCE_MISMATCH'));
});
test('R1 association index gaps cannot hide behind unique row identifiers', () => {
 const x = richInput();
 x.adverse_events[0].suspicions.push(sup('EP-1', 'EXT-02'));
 const rows = core.buildFollowupRows(x);
 const changed = structuredClone(rows);
 const second = changed.filter(r => r.row_role === 'ea_suspicion')[1];
 second.row_id = second.row_id.replace(/-S1$/, '-S2');
 assert.ok(errorCodes(changed).includes('ASSOCIATION_INDEX_GAP'));
});
if (!process.exitCode) console.log('C2A FOCAL PASS '+count);
