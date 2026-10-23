import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const ctx=vm.createContext({window:{HubTools:{}}});
vm.runInContext(fs.readFileSync('modules/farmacia_ea_invariants.js','utf8'),ctx);
const api=ctx.window.HubTools.farmaciaEaInvariants;
assert.equal(typeof api.validateRevision,'function','missing pure finalized-record revision behavior');
const local=x=>x && typeof x==='object'?(Array.isArray(x)?Array.from(x,local):Object.fromEntries(Object.keys(x).map(k=>[k,local(x[k])]))):x;
const original={patientRef:'P',actId:'A',episode_id:'E',observation_id:'O',status:'incorporated',revision:1,description:'  original  ',notes:{raw:[undefined,null,'',0,false]},suspicions:[{patientRef:'P',episode_id:'E',medicationRef:'M'}],evaluations:[{patientRef:'P',actId:'A',episode_id:'E',medicationRef:'M',method:'naranjo',evaluation_id:'EV',responses:[true],result:0}]};
const request=(operation='correction')=>({operation,previous:structuredClone(original),next:{...structuredClone(original),revision:2,description:'corregida',amendment:{previousRevision:1,reason:'  error transcripción  '}}});
function run(input) {
  const before=structuredClone(input), out=api.validateRevision(input);
  assert.deepEqual(input,before,'no mutation, including rejected requests');
  return out;
}
function good(input) {
  const out=local(run(input));
  assert.equal(out.ok,true,JSON.stringify(out));
  assert.deepEqual(out.previous,input.previous,'previous revision, identities and clinical data remain recoverable');
  assert.deepEqual(out.next,input.next,'new revision is explicit, no defaults or regenerated identities');
  assert.equal(out.operation,input.operation,'annulment is not silent physical deletion');
  assert.deepEqual(local(run(input)),out,'retries deterministic');
  return out;
}
function bad(input) {
  const out=local(run(input));
  assert.equal(out.ok,false,'invalid correction/annulment must fail closed');
  assert.deepEqual(Object.keys(out).sort(),['error','ok'],'no partial positive representation');
  assert.equal(typeof out.error.code,'string');
}
for(const operation of ['correction','annulment']) {
  good(request(operation));
  const jump=request(operation); jump.next.revision=5; good(jump); // F4.4 allows >, not only +1.
  for(const value of [undefined,null,'','   ',0,false]) {
    const r=request(operation); r.next.amendment.reason=value; bad(r);
  }
  for(const key of ['amendment','revision']) {const r=request(operation); delete r.next[key]; bad(r);}
  for(const key of ['previousRevision','reason']) {const r=request(operation); delete r.next.amendment[key]; bad(r);}
  for(const value of [0,2,9,1.5,'1',null]) {const r=request(operation); r.next.amendment.previousRevision=value; bad(r);}
  for(const value of [0,1,1.5,'2',null]) {const r=request(operation); r.next.revision=value; bad(r);}
  const extra=request(operation); extra.next.amendment.extra=true; bad(extra);
  for(const key of ['patientRef','actId','episode_id','observation_id']) {
    for(const side of ['previous','next']) {
      const missing=request(operation); delete missing[side][key]; bad(missing);
      const wrong=request(operation); wrong[side][key]='OTHER'; bad(wrong);
    }
  }
  const swapped=request(operation); [swapped.next.patientRef,swapped.next.episode_id]=[swapped.next.episode_id,swapped.next.patientRef]; bad(swapped);
  for(const side of ['previous','next']) {const draft=request(operation); draft[side].status='draft'; bad(draft);}
  const absent=request(operation); delete absent.previous.revision; bad(absent);
  for(const collection of ['suspicions','evaluations']) {
    const wrong=request(operation); wrong.next[collection][0].episode_id='OTHER'; bad(wrong);
  }
  const r=request(operation);
  delete r.next.suspicions; delete r.next.evaluations;
  // Delinking does not delete historical clinical data.
  good(r);
  for(const value of [undefined,null,'',0,false,'NO_VALUE']) {
    const r=request(operation);
    for(const key of ['occurredAt','authoredAt','authorRef','onset','resolution','severity']) r.next[key]=value;
    good(r);
  }
}
const input=request(), expected=good(input);
const a=run(input), b=run(input);
a.previous.notes.raw.push('output'); a.next.evaluations[0].responses.push('output');
assert.deepEqual(input,request()); assert.deepEqual(local(b),expected);
assert.deepEqual(local(a.next.notes),expected.next.notes,'old/new outputs not aliased');
input.previous.notes.raw.push('input'); input.next.notes.raw.push('input');
assert.deepEqual(local(b),expected,'outputs do not alias input');
const chain=request(); chain.previous=structuredClone(chain.next); chain.next={...structuredClone(chain.previous),revision:3,amendment:{previousRevision:2,reason:'segunda corrección'}}; good(chain);
bad({...request(),operation:'selection'});
const p=request(); good(p);
const q=request(); for(const side of ['previous','next']) {q[side].patientRef='Q'; delete q[side].suspicions; delete q[side].evaluations;} good(q); good(p);
// A subsequent act is an observation, not an amendment of A.
const basis=Object.fromEntries(['patientRef','actId','episode_id','observation_id'].map(k=>[k,original[k]]));
const visit={patientRef:'P',actId:'B',present:'si',history:[original],selections:[],adverse_events:[{patientRef:'P',actId:'B',episode_id:'E',observation_id:'OB',status:'incorporated',basis,review:{confirmed:true,unchanged:true}}]};
const before=structuredClone(visit), observed=local(api.validateObservations(visit));
assert.equal(observed.ok,true); assert.deepEqual(visit,before);
assert.deepEqual(observed.history,[original]); assert.deepEqual(observed.representation.adverse_events,visit.adverse_events);
console.log('PASS revision / annulment / reason / identity / isolation / retry / distinct act');
for(const path of ['tools/farmacia_ea_r1_revisions_check.mjs','tools/farmacia_ea_r1_states_check.mjs','tools/farmacia_ea_r1_identity_check.mjs','tools/farmacia_ea_r1_clinical_data_check.mjs','metis/oracles/ea-cardinalidad-estados.mjs','metis/oracles/ea-episodios-observaciones.mjs','metis/oracles/ea-ausencias-causalidad.mjs','tools/farmacia_act_contract_check.mjs','tools/farmacia_act_payloads_check.mjs','tools/farmacia_ea_t01_check.mjs']) {
  assert.ok(fs.existsSync(path),`required check ${path}`);
  const result=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:120000});
  assert.equal(result.status,0,path+'\n'+result.stdout+result.stderr);
}
console.log('PASS focal / earlier R1 / F4.4 / T01 regressions');
