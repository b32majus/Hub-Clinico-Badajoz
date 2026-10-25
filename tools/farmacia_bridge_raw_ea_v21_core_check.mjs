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
if (!process.exitCode) console.log('C2A FOCAL PASS '+count);
