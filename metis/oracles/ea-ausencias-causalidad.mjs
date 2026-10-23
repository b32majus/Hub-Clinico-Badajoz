import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const ctx=vm.createContext({window:{HubTools:{}}});
vm.runInContext(fs.readFileSync('modules/farmacia_ea_invariants.js','utf8'),ctx);
const api=ctx.window.HubTools.farmaciaEaInvariants;
const local=x=> x && typeof x==='object' ? (Array.isArray(x)?Array.from(x,local):Object.fromEntries(Object.keys(x).map(k=>[k,local(x[k])]))) : x;
const event=(extra={})=>({patientRef:'P',actId:'B',episode_id:'E',observation_id:'O',status:'incorporated',description:'Original',...extra});
const request=(events=[event()],extra={})=>({patientRef:'P',actId:'B',present:'si',adverse_events:events,history:[],selections:[],...extra});
function run(input,method='validateObservations') {
  const before=structuredClone(input), result=local(api[method](input));
  assert.deepEqual(input,before,'pure on success and failure');
  return result;
}
function good(input,method='validateObservations') {
  const out=run(input,method);
  assert.equal(out.ok,true,JSON.stringify(out));
  const expected={patientRef:input.patientRef,actId:input.actId,present:input.present,adverse_events:input.adverse_events.filter(e=>e.status==='incorporated' && e.actId===input.actId)};
  if(Object.hasOwn(input,'occurredAt')) expected.occurredAt=input.occurredAt;
  assert.deepEqual(out.representation,expected,'only explicit clinical data and one act date, verbatim');
  if(method==='validateObservations') assert.deepEqual(out.history,input.history,'no overwritten historical evaluation');
  assert.deepEqual(out.retained,input.adverse_events.filter(e=>e.status==='draft' || e.actId!==input.actId));
  return out;
}
function bad(input,method='validateObservations') {
  const out=run(input,method);
  assert.equal(out.ok,false,'contradictory association must fail closed');
  assert.deepEqual(Object.keys(out).sort(),['error','ok']);
  assert.equal(typeof out.error.code,'string');
}
// BASE fails by assertion: the existing API drops the explicit act date.
for(const method of ['validateNewEvents','validateObservations']) {
  good(request([event()],{occurredAt:'2026-10-23T12:00:00Z'}),method);
  good(request(),method);
  for(const value of [undefined,null,'',0,false,'NO_VALUE','No informado','  desconocido  ']) {
    const fields={onset:value,resolution:value,duration:value,authorRef:value,treatment:value,severity:value,evolution:value,course:value,action:value,suspicions:value,evaluations:value};
    good(request([event(fields)],{occurredAt:value}),method);
  }
  good(request([event({onset:'2026-01-02',resolution:null,notes:{raw:['  literal  ',undefined,false,0]}})]),method);
}
console.log('PASS absence / sentinels / own undefined / single act date / no defaults');
const suspicion=(e,medicationRef)=>({patientRef:e.patientRef,episode_id:e.episode_id,medicationRef});
const evaluation=(e,medicationRef,method,id,extra={})=>({patientRef:e.patientRef,episode_id:e.episode_id,actId:e.actId,medicationRef,method,evaluation_id:id,...extra});
const old=event({actId:'A',observation_id:'OLD',suspicions:[suspicion(event(),'M')],evaluations:[evaluation({...event(),actId:'A'},'M','naranjo','EV-A',{result:0,responses:[false,undefined]})],severity:'anterior',onset:'2025-01-01'});
const basis=Object.fromEntries(['patientRef','actId','episode_id','observation_id'].map(k=>[k,old[k]]));
good(request([event({basis,review:{confirmed:true,unchanged:true},description:undefined})],{history:[old]}));
good(request([event({episode_id:'REC',basis,evolution:'recurrence',medications:['M'],prescribed:['M'],historicalMedications:['M'],visualScores:{naranjo:0,karchLasagna:0}})],{history:[old]}));
good(request([event({medications:['M'],visualScores:{naranjo:0,karchLasagna:0}})]));
good(request([event({evaluations:[evaluation(event(),'M','naranjo','ZERO',{result:0})]})]));
good(request([event({evaluations:[evaluation(event(),'M','naranjo','ONLY-N',{state:'completed',result:3,responses:[true]})],visualScores:{karchLasagna:0}})]));
const events=['E','E2'].map((episode_id,i)=>{
  const e=event({episode_id,observation_id:'O'+i});
  e.suspicions=['M','M2'].map(m=>suspicion(e,m));
  e.evaluations=['M','M2'].flatMap((m,j)=>['naranjo','karch_lasagna'].map((method,k)=>evaluation(e,m,method,`${i}-${j}-${k}`,{result:i*10+j*2+k,responses:[i,j,k],state:k?'draft':'completed'})));
  return e;
});
for(const method of ['validateNewEvents','validateObservations']) good(request(events),method);
const later=event({actId:'C',observation_id:'OC',basis:{...basis,actId:'B',observation_id:'O0'},review:{confirmed:true},evaluations:[evaluation({...event(),actId:'C'},'M','naranjo','EV-C',{responses:[true],result:9})]});
const laterInput=request([later],{actId:'C',history:events,occurredAt:'2026-10-24T12:00:00Z'});
const saved=good(laterInput);
assert.equal(saved.history[0].evaluations.length,4);
assert.equal(saved.representation.adverse_events[0].evaluations.length,1);
console.log('PASS explicit suspicion / recurrence / visual zero not evaluated / pair-method-act preservation');
for(const method of ['validateNewEvents','validateObservations']) {
  for(const kind of ['suspicions','evaluations']) {
    const valid=kind==='suspicions'?suspicion(event(),'M'):evaluation(event(),'M','naranjo','ID');
    for(const key of Object.keys(valid)) {
      const missing={...valid}; delete missing[key];
      bad(request([event({[kind]:[missing]})]),method);
    }
    for(const key of ['patientRef','episode_id',...(kind==='evaluations'?['actId']:[])]) bad(request([event({[kind]:[{...valid,[key]:'OTHER'}]})]),method);
    bad(request([event({[kind]:[{...valid,patientRef:valid.episode_id,episode_id:valid.patientRef}]})]),method);
    bad(request([event(),event({episode_id:'E2',observation_id:'O2',[kind]:[valid]})]),method);
  }
}
const polluted=structuredClone(laterInput); polluted.history[0].evaluations[0].actId='C'; bad(polluted);
const draft=event({status:'draft',description:'',evaluations:undefined});
good(request([draft],{present:'no_consta'}));
const a=structuredClone(laterInput), before=structuredClone(a);
const first=api.validateObservations(a), second=api.validateObservations(a);
assert.deepEqual(local(first),local(second));
first.history[0].evaluations[0].responses.push('output');
first.representation.adverse_events[0].evaluations[0].responses.push('output');
assert.deepEqual(a,before);
a.history[0].evaluations[0].responses.push('input');
assert.deepEqual(local(second),saved);
good(request([],{patientRef:'Q',actId:'Q-A',present:'no'}));
good(before);
console.log('PASS association negatives / atomicity / deep isolation / A-B-A');
for(const path of ['tools/farmacia_ea_r1_clinical_data_check.mjs','metis/oracles/ea-cardinalidad-estados.mjs','metis/oracles/ea-episodios-observaciones.mjs','tools/farmacia_act_contract_check.mjs','tools/farmacia_act_payloads_check.mjs','tools/farmacia_ea_t01_check.mjs']) {
  assert.ok(fs.existsSync(path),`required check ${path}`);
  const result=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:60000});
  assert.equal(result.status,0,path+'\n'+result.stdout+result.stderr);
}
console.log('PASS focal clinical data / previous R1 / F4.4 / T01 checks');
