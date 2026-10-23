import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const context = vm.createContext({ window: { HubTools: {} } });
vm.runInContext(fs.readFileSync('modules/farmacia_ea_invariants.js', 'utf8'), context);
const validate = context.window.HubTools.farmaciaEaInvariants?.validateObservations;
assert.equal(typeof validate, 'function', 'Missing longitudinal identity / explicit review behavior');
function local(x) {
  if (!x || typeof x !== 'object') return x;
  if (Array.isArray(x)) return Array.from(x, local);
  return Object.fromEntries(Object.keys(x).map(k => [k, local(x[k])]));
}
const old = {patientRef:'P-A', actId:'ACT-Z', episode_id:'E-A', observation_id:'O-1', status:'incorporated', description:'Mismo texto', medications:['M'], notes:{raw:['original']}};
const ref = x => Object.fromEntries(['patientRef','actId','episode_id','observation_id'].map(k => [k,x[k]]));
const current = (extra={}) => ({patientRef:'P-A',actId:'ACT-A',episode_id:'E-A',observation_id:'O-2',status:'incorporated',basis:ref(old),review:{confirmed:true,unchanged:true},...extra});
const request = (events=[], extra={}) => ({patientRef:'P-A',actId:'ACT-A',present:events.some(e=>e.status==='incorporated')?'si':'no_consta', adverse_events:events,history:[structuredClone(old)],selections:[],...extra});
function run(input) {
  const before=structuredClone(input);
  const out=local(validate(input));
  assert.deepEqual(input,before,'every path leaves input intact');
  return out;
}
function good(input) {
  const out=run(input);
  assert.equal(out.ok,true,JSON.stringify(out));
  assert.deepEqual(out.representation,{patientRef:input.patientRef,actId:input.actId,present:input.present,adverse_events:input.adverse_events.filter(e=>e.status==='incorporated')});
  assert.deepEqual(out.retained,input.adverse_events.filter(e=>e.status==='draft'));
  assert.deepEqual(out.history,input.history,'history survives without correction');
  assert.deepEqual(out.selections,input.selections);
  return out;
}
function bad(input) {
  const out=run(input);
  assert.equal(out.ok,false,'unsafe association rejected');
  assert.equal(typeof out.error?.code,'string');
  assert.equal(typeof out.error?.message,'string');
  assert.deepEqual(Object.keys(out).sort(),['error','ok'],'atomic failure');
}
const omit = (x,...keys) => {x=structuredClone(x); for(const k of keys) delete x[k]; return x;};

good(request([current()]));
good(request([current({review:{confirmed:true}})]));
good(request([current({description:'No contiene un token clínico de revisión'})]));
for(const present of ['no','no_consta']) {
  good(request([],{present,selections:[ref(old)]}));
  bad(request([current()],{present}));
}
bad(request([],{present:'si',selections:[ref(old)]}));
bad(request([omit(current(),'review')]));
for(const review of [null,{}, {confirmed:false}, {unchanged:true}]) bad(request([current({review})]));
// Neither a reference nor a magic phrase is a review declaration.
bad(request([{...omit(current(),'review'),description:'revisado sin cambios'}]));
const newEvent={...omit(current(),'basis','review'),episode_id:'E-NEW',description:'Mismo texto',medications:['M']};
good(request([newEvent]));
bad(request([omit(newEvent,'description')]));
good(request([newEvent,{...newEvent,episode_id:'E-OTHER',observation_id:'O-3'}]));
console.log('PASS longitudinal / selection only / explicit review / equal text and drugs');

for(const evolution of ['continuation','resolution']) good(request([{...omit(current(),'review'),evolution}]));
const recurrence={...newEvent,basis:ref(old),evolution:'recurrence'};
good(request([recurrence]));
bad(request([{...recurrence,episode_id:old.episode_id}]));
bad(request([omit(recurrence,'basis')]));
bad(request([{...current(),episode_id:'E-NEW'}]));
const plain=good(request([newEvent]));
assert.equal('evolution' in plain.representation.adverse_events[0],false);
assert.equal('basis' in plain.representation.adverse_events[0],false);
assert.equal('evolution' in plain.history[0],false);
const second=current({evolution:'resolution'});
const third=current({actId:'ACT-0',observation_id:'O-3',basis:ref(second)});
good(request([third],{actId:'ACT-0',history:[old,second]}));
console.log('PASS explicit evolution / recurrence / no inferred evolution / opaque chronology');

for(const key of ['patientRef','actId','episode_id','observation_id']) {
  bad(request([current({basis:omit(ref(old),key)})]));
  bad(request([current({basis:{...ref(old),[key]:'absent'}})]));
  bad(request([omit(current(),key)]));
  bad(request([current()],{history:[omit(old,key)]}));
  bad(request([],{selections:[omit(ref(old),key)]}));
}
bad(request([current({basis:{...ref(old),actId:old.episode_id,episode_id:old.actId}})]));
bad(request([current({basis:{...ref(old),patientRef:old.actId,actId:old.patientRef}})]));
bad(request([current({patientRef:'P-B'})]));
bad(request([current({actId:'ACT-B'})]));
bad(request([current()],{history:[{...old,patientRef:'P-B'}]}));
bad(request([current()],{history:[{...old,actId:'ACT-A'}]}));
bad(request([current({observation_id:'O-1'})]));
bad(request([current(),current({episode_id:'E-NEW',basis:undefined,description:'Otro'})]));
bad(request([current()],{history:[old,{...old,episode_id:'E-OTHER'}]}));
bad(request([],{selections:[{...ref(old),episode_id:'E-OTHER'}]}));
for(const key of ['patientRef','actId','history','selections']) bad(omit(request(),key));
const draft={...omit(current(),'review'),status:'draft',description:'',notes:{raw:['draft']}};
good(request([draft]));
console.log('PASS tuple negatives / current context / duplicate observation / drafts');

const a=request([current(),draft],{selections:[ref(old)]});
// Draft and incorporated observations also need their own identities.
a.adverse_events[1].observation_id='O-DRAFT';
const before=structuredClone(a);
const one=validate(a), two=validate(a);
assert.equal(one.ok,true);
assert.deepEqual(local(one),local(two),'repeat deterministic');
one.history[0].notes.raw.push('output');
one.retained[0].notes.raw.push('output');
one.representation.adverse_events[0].basis.actId='changed';
one.selections[0].episode_id='changed';
assert.deepEqual(a,before,'outputs cannot edit inputs');
a.history[0].notes.raw.push('input'); a.adverse_events[0].review.confirmed=false;
assert.deepEqual(local(two),good(before),'inputs and independent outputs disconnected');
const b={patientRef:'P-B',actId:'ACT-B',present:'no',adverse_events:[],history:[],selections:[]};
good(b); bad({...b,adverse_events:[current()],present:'si'}); good(before); good(b);
console.log('PASS deterministic / deep isolation / A-B-A / atomic failure');

assert.ok(fs.existsSync('tools/farmacia_ea_r1_identity_check.mjs'),'required identity focal check');
const focal=spawnSync(process.execPath,['tools/farmacia_ea_r1_identity_check.mjs'],{encoding:'utf8',timeout:30000});
assert.equal(focal.status,0,focal.stdout+focal.stderr);
const previous=spawnSync(process.execPath,['metis/oracles/ea-cardinalidad-estados.mjs'],{encoding:'utf8',timeout:30000});
assert.equal(previous.status,0,previous.stdout+previous.stderr);
console.log('PASS identity check / earlier R1 oracle and focal check');
