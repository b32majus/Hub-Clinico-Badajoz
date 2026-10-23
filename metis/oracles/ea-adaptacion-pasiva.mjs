import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const ctx=vm.createContext({window:{HubTools:{}},console:{log(){},error(){}}});
for(const name of ['contract','payloads']) vm.runInContext(fs.readFileSync(`modules/farmacia_act_${name}.js`,'utf8'),ctx);
let calls=0;
const builder=ctx.window.HubTools.farmaciaActPayloads.createFollowupAct;
ctx.window.HubTools.farmaciaActPayloads={createFollowupAct(...args){calls++; return builder(...args);}};
vm.runInContext(fs.readFileSync('modules/farmacia_ea_invariants.js','utf8'),ctx);
const api=ctx.window.HubTools.farmaciaEaInvariants;
assert.equal(typeof api.composeFollowup,'function','missing passive T01 → existing F4.4 composition');
const local=x=>x && typeof x==='object'?(Array.isArray(x)?Array.from(x,local):Object.fromEntries(Object.keys(x).map(k=>[k,local(x[k])]))):x;
const envelope=()=>({actId:'A',patientRef:'P',revision:1,siteId:'S',occurredAt:'2026-10-23T10:00:00Z',authoredAt:'2026-10-23T11:00:00Z',authorRef:'U',attributionAssurance:'explicit',provenance:{source:'synthetic'}});
const event=i=>({episode_id:'E'+i,observation_id:'O'+i,status:'incorporated',description:'  original  ',evolution:'no_consta',severity:'',expanded:true});
const fixture=(n=1,present=n?'si':'no_consta')=>[envelope(),{followup:{adverse_events:Array.from({length:n},(_,i)=>event(i)),notes:{raw:[undefined,null,'',0,false]}},lines:[{id:'L2',opaque:{v:null}},{id:'L1'}]},{present,history:[],selections:[],revisions:[]}];
function run(args,ok=true){
  const before=structuredClone(args), start=calls;
  const out=local(api.composeFollowup(...args));
  assert.deepEqual(args,before,'input unchanged on success and failure');
  assert.equal(out.ok,ok,JSON.stringify(out));
  if(ok){
    assert.equal(calls,start+1,'one existing builder call, never one act per observation');
    assert.equal(out.act.kind,'pharmacy_followup');
    assert.deepEqual(out.act.payload.lines,args[1].lines,'opaque ordered lines independent of N');
    assert.deepEqual(out.act.payload.followup.notes,args[1].followup.notes);
    assert.equal(Object.hasOwn(out.act.payload.followup,'adverse_event'),false);
    assert.equal(out.act.payload.followup.adverse_events.present,args[2].present);
    assert.deepEqual(out.history,args[2].history);
  } else {
    assert.deepEqual(Object.keys(out).sort(),['error','ok'],'no partial act or representation');
    assert.equal(typeof out.error.code,'string');
  }
  return out;
}
for(const n of [0,1,2,5,9,37]){
  for(const lines of [[],[{id:'only'}],[{id:'second'},{id:'first'}]]){
    const a=fixture(n); a[1].lines=lines;
    a[1].followup.adverse_events.push({...event('draft'),status:'draft',description:''});
    const out=run(a), block=out.act.payload.followup.adverse_events;
    assert.equal(block.adverse_events.length,n); assert.equal(out.retained.length,1);
    assert.equal(out.retained[0].description,'');
    for(let i=0;i<n;i++) assert.deepEqual(block.adverse_events[i],{...event(i),patientRef:'P',actId:'A'});
    assert.deepEqual(local(api.composeFollowup(...a)),out,'deterministic IDs');
    const expected=local(builder(a[0],{...a[1],followup:{...a[1].followup,adverse_events:block}}));
    assert.deepEqual(out.act,expected,'F4.4 alone constructs the act');
  }
}
for(const state of ['si','no','no_consta']){
  run(fixture(0,state),state!=='si'); run(fixture(1,state),state==='si');
}
const historical={...event('old'),patientRef:'P',actId:'OLD',revision:1};
const basis=Object.fromEntries(['patientRef','actId','episode_id','observation_id'].map(k=>[k,historical[k]]));
for(const state of ['no','no_consta']){
  const a=fixture(0,state); a[2].history=[historical]; a[2].selections=[basis];
  const out=run(a); assert.equal(out.act.payload.followup.adverse_events.adverse_events.length,0);
}
const reviewed=fixture(); reviewed[2].history=[historical]; reviewed[2].selections=[basis];
reviewed[1].followup.adverse_events=[{episode_id:historical.episode_id,observation_id:'NEW',status:'incorporated',basis,review:{confirmed:true,unchanged:true}}];
const review=run(reviewed).act.payload.followup.adverse_events.adverse_events[0];
assert.equal(review.episode_id,historical.episode_id); assert.equal(review.observation_id,'NEW');
for(const key of ['description','severity','suspicions','evaluations','amendment','onset','resolution']) assert.equal(Object.hasOwn(review,key),false);
const unreviewed=structuredClone(reviewed); delete unreviewed[1].followup.adverse_events[0].review; run(unreviewed,false);
const correction=fixture(); const previous={...event(0),patientRef:'P',actId:'A',revision:1};
const next={...previous,revision:2,description:'corregida',amendment:{previousRevision:1,reason:'error de transcripción'}};
correction[1].followup.adverse_events=[next]; correction[2].revisions=[{operation:'correction',previous,next}];
const corrected=run(correction); assert.deepEqual(corrected.revisions[0].previous,previous); assert.deepEqual(corrected.revisions[0].next,next);
const noReason=structuredClone(correction); delete noReason[2].revisions[0].next.amendment.reason; run(noReason,false);
const unrelated=structuredClone(correction); unrelated[2].revisions[0].next={...unrelated[2].revisions[0].next,description:'not the submitted record'}; run(unrelated,false);
const lostPrevious=structuredClone(correction); lostPrevious[2].revisions=[]; run(lostPrevious,false);
const annulment=structuredClone(correction); annulment[2].revisions[0].operation='annulment'; run(annulment);
for(const key of ['present','history','selections','revisions']) {const a=fixture(); delete a[2][key]; run(a,false);}
for(const value of [undefined,null,'',0,false,'NO_VALUE']) {
  const a=fixture();
  Object.assign(a[1].followup.adverse_events[0],{onset:value,resolution:value,action:value,notes:value});
  const out=run(a).act.payload.followup.adverse_events.adverse_events[0];
  for(const key of ['onset','resolution','action','notes']) assert.equal(out[key],value);
}
const minimal=fixture(); minimal[1].followup.adverse_events=[{episode_id:'E',observation_id:'O',status:'incorporated',description:'EA'}];
assert.deepEqual(run(minimal).act.payload.followup.adverse_events.adverse_events,[{...minimal[1].followup.adverse_events[0],patientRef:'P',actId:'A'}]);
const clinical=fixture();
Object.assign(clinical[1].followup.adverse_events[0],{
  suspicions:[{patientRef:'P',episode_id:'E0',medicationRef:'M'}],
  evaluations:[{patientRef:'P',actId:'A',episode_id:'E0',medicationRef:'M',evaluation_id:'EV',method:'naranjo',result:0}]
});
assert.deepEqual(run(clinical).act.payload.followup.adverse_events.adverse_events[0],{...clinical[1].followup.adverse_events[0],patientRef:'P',actId:'A'});
const wrongClinical=structuredClone(clinical); wrongClinical[1].followup.adverse_events[0].evaluations[0].patientRef='B'; run(wrongClinical,false);
for(const key of ['patientRef','actId']){
  const wrong=fixture(); wrong[1].followup.adverse_events[0][key]='OTHER'; run(wrong,false);
  const absent=fixture(); delete absent[0][key]; run(absent,false);
}
const historyB=fixture(); historyB[2].history=[{...historical,patientRef:'B'}]; run(historyB,false);
const invalid=fixture(); invalid[1].followup.adverse_events.push({...event('bad'),description:''}); run(invalid,false);
for(const mutate of [a=>delete a[1].lines,a=>a[0].revision=0,a=>a[1].extra={},a=>a[1].lines=[null]]){
  const a=fixture(); mutate(a); const out=run(a,false);
  const expected=local(builder(a[0],a[1])); assert.deepEqual(out,expected,'F4.4 errors pass through');
}
const a=fixture(), first=api.composeFollowup(...a), second=local(api.composeFollowup(...a));
first.act.payload.lines[0].opaque.v='changed'; first.retained.push({});
assert.deepEqual(local(api.composeFollowup(...a)),second);
a[1].followup.notes.raw.push('later'); assert.equal(second.act.payload.followup.notes.raw.length,5);
const b=fixture(); b[0].patientRef='B'; run(b); run(fixture());
// No browser/page/catalogue globals are provided to this VM.
console.log('PASS passive T01 / F4.4 / cardinality / states / history / revisions / isolation');
for(const path of ['tools/farmacia_ea_r1_followup_check.mjs','tools/farmacia_ea_r1_states_check.mjs','tools/farmacia_ea_r1_identity_check.mjs','tools/farmacia_ea_r1_clinical_data_check.mjs','tools/farmacia_ea_r1_revisions_check.mjs','metis/oracles/ea-revisiones-conservadas.mjs']){
  const result=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:120000});
  assert.equal(result.status,0,path+'\n'+result.stdout+result.stderr);
}
