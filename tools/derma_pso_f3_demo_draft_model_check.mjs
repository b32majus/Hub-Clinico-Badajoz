#!/usr/bin/env node
// F3a: pure in-memory model, SYNTHETIC-only, no UI/persistence.
// This is not clinical history, qualification, or a saving test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createPsoDemoVisitDraftRegistry} from '../modules/derma/pso_demo_visit_drafts.js';
import {PSO_VALME_FIELDS} from '../modules/derma/pso_valme_fields.js';

const tests=[];
const test=(title,fn)=>tests.push([title,fn]);
const site='DEMO-SITE-BADAJOZ';
const cip='DEMO-PATIENT-999';
const base={siteId:site,patientCip:cip,visitType:'seguimiento',pathology:'pso',
  clinicalDate:null,provenance:'synthetic-manual-entry'};
const create=(id,overrides={})=>({...base,visitId:id,...overrides});
let registry;
test('F3A-01 Registry begins empty; no implicit patient or visit',()=>{
 registry=createPsoDemoVisitDraftRegistry();
 assert.deepEqual(registry.listDraftMetadata({siteId:site,patientCip:cip,pathology:'pso'}),[]);
});
test('F3A-02 Explicit synthetic IDs, site, visit, pathology and NULL date',()=>{
 const x=registry.createDraft(create('DEMO-VISIT-A001'));
 assert.equal(x.revision,0);
 assert.equal(x.recordState,'demo_draft_only');
 assert.equal(x.actorId,null);
 assert.equal(x.clinicalDate,null);
 assert.equal(x.visitType,'seguimiento');
 assert.deepEqual(x.answers,{});
});
test('F3A-03 Multiple follow-ups same patient/type are different drafts',()=>{
 const b=registry.createDraft(create('DEMO-VISIT-B002',{clinicalDate:'2026-11-11'}));
 const c=registry.createDraft(create('DEMO-VISIT-C003',{clinicalDate:'2026-11-12'}));
 assert.equal(b.visitType,c.visitType);
 assert.notEqual(b.visitId,c.visitId);
 assert.equal(registry.listDraftMetadata({siteId:site,patientCip:cip,pathology:'pso'}).length,3);
});
test('F3A-04 First visit never forced by existence of another visit',()=>{
 const f=registry.createDraft(create('DEMO-VISIT-F004',{visitType:'primera',clinicalDate:'2026-09-01'}));
 assert.equal(f.visitType,'primera');
 assert.equal(registry.readDraft('DEMO-VISIT-A001').visitType,'seguimiento');
 assert.equal(registry.readDraft('DEMO-VISIT-F004').answers.bsa,undefined);
});
test('F3A-05 Revisioned explicit fields preserve zero and separate visits',()=>{
 const before=registry.readDraft('DEMO-VISIT-A001');
 const after=registry.setAnswers('DEMO-VISIT-A001',{bsa:'0',pasi_cabeza_eritema:'0'},{expectedRevision:before.revision});
 assert.equal(after.revision,1);
 assert.equal(after.answers.bsa,'0');
 assert.equal(after.answers.pasi_cabeza_eritema,'0');
 for(const id of ['DEMO-VISIT-B002','DEMO-VISIT-C003','DEMO-VISIT-F004'])
   assert.equal(registry.readDraft(id).answers.bsa,undefined);
});
test('F3A-06 No writable derived PASI/DLQI/PURE4/Morisky',()=>{
 for(const key of ['pasi','dlqi_total','pure4_total_positivas','seguimiento_morisky_total_no_adherencia','zona_esp_cara','nusha','fecha_visita']){
   assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{[key]:'72'},{expectedRevision:1}),/no editable/);
 }
 assert.equal(registry.readDraft('DEMO-VISIT-A001').revision,1);
});
test('F3A-07 Unrecognized keys, accidental clinical payload and data types blocked',()=>{
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{extra_tx_seguimiento_biologicos_dosis_1:'10'},{expectedRevision:1}),/no editable/);
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{bsa:0},{expectedRevision:1}),/debe ser texto/);
 assert.throws(()=>registry.createDraft({...create('DEMO-VISIT-X005'),answers:{bsa:'0'}}),/No se admite adjuntar/);
 assert.equal(registry.readDraft('DEMO-VISIT-A001').revision,1);
});
test('F3A-08 Stale updates rejected instead of silently overriding',()=>{
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{bsa:'2'},{expectedRevision:0}),/Conflicto de revisión/);
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{bsa:'2'}),/Conflicto de revisión/);
 assert.equal(registry.readDraft('DEMO-VISIT-A001').answers.bsa,'0');
});
test('F3A-09 Clear is explicit; empty and zero never equivalent',()=>{
 const r=registry.setAnswers('DEMO-VISIT-A001',{bsa:null},{expectedRevision:1});
 assert.equal(r.revision,2);
 assert.equal(Object.hasOwn(r.answers,'bsa'),false);
 assert.equal(r.answers.pasi_cabeza_eritema,'0');
});
test('F3A-10 ID collisions rejected, synthetic-only identity/site/provenance enforced',()=>{
 assert.throws(()=>registry.createDraft(create('DEMO-VISIT-A001')),/duplicado/);
 for(const id of ['98765','CIP-REAL-888','DEMO-A']){
   assert.throws(()=>registry.createDraft(create('DEMO-VISIT-ID888',{patientCip:id})),/sintético/);
 }
 assert.throws(()=>registry.createDraft(create('DEMO-VISIT-ID999',{siteId:'HOSPITAL REAL'})),/sintético/);
 assert.throws(()=>registry.createDraft(create('DEMO-VISIT-ID777',{provenance:'ehr-import'})),/procedencia demo/);
 assert.throws(()=>registry.createDraft(create('DEMO-VISIT-ID666',{pathology:'hs'})),/Patología/);
 assert.throws(()=>registry.createDraft(create('DEMO-VISIT-ID555',{visitType:'seguimiento-automatico'})),/Tipo de visita/);
});
test('F3A-11 All 174 Valme keys remain read-only as a schema; derived excluded',()=>{
 assert.equal(PSO_VALME_FIELDS.length,174);
 assert.equal(PSO_VALME_FIELDS.some(f=>f.key==='pasi'&&f.kind==='derivado'),true);
 assert.equal(PSO_VALME_FIELDS.some(f=>f.key==='bsa'),true);
});
test('F3A-12 Impossible and implicit dates rejected, leap day accepted',()=>{
 for(const date of ['','2026-02-30','2026-13-01','2025-02-29','11/13/2026']){
   assert.throws(()=>registry.createDraft(create('DEMO-VISIT-DATE1',{clinicalDate:date})),/Fecha clínica/);
 }
 assert.equal(registry.createDraft(create('DEMO-VISIT-LEAP1',{clinicalDate:'2024-02-29'})).clinicalDate,'2024-02-29');
 assert.throws(()=>registry.createDraft({visitId:'DEMO-VISIT-DATE2',siteId:site,patientCip:cip,visitType:'primera',pathology:'pso',provenance:'synthetic-manual-entry'}),/fecha debe constar/);
});
test('F3A-13 Update date requires explicit revision and preserves answers',()=>{
 const before=registry.readDraft('DEMO-VISIT-A001');
 const r=registry.setClinicalDate('DEMO-VISIT-A001','2026-11-13',{expectedRevision:before.revision});
 assert.equal(r.clinicalDate,'2026-11-13');
 assert.equal(r.answers.pasi_cabeza_eritema,'0');
 assert.equal(r.revision,3);
 assert.throws(()=>registry.setClinicalDate('DEMO-VISIT-A001',null,{expectedRevision:2}),/Conflicto/);
});
test('F3A-14 Earlier dated demo records only: same site+patient+pathology, no answers',()=>{
 const current='DEMO-VISIT-A001';
 const results=registry.earlierDatedDraftMetadata({currentVisitId:current,asOfDate:'2026-11-13'});
 assert.deepEqual(results.map(x=>x.visitId),['DEMO-VISIT-C003','DEMO-VISIT-B002','DEMO-VISIT-F004','DEMO-VISIT-LEAP1']);
 assert.equal(results.some(x=>'answers' in x),false);
 assert.equal(results.every(x=>x.recordState==='demo_draft_only'&&x.actorId===null),true);
});
test('F3A-15 Same-day, future, undated and other site/patient excluded',()=>{
 registry.createDraft(create('DEMO-VISIT-SAME',{clinicalDate:'2026-11-13'}));
 registry.createDraft(create('DEMO-VISIT-FUTURE',{clinicalDate:'2026-12-01'}));
 registry.createDraft(create('DEMO-VISIT-OTHER',{clinicalDate:'2026-10-10',patientCip:'DEMO-OTHER-111'}));
 registry.createDraft(create('DEMO-VISIT-SITE',{clinicalDate:'2026-10-10',siteId:'DEMO-SITE-CACERES'}));
 assert.deepEqual(registry.earlierDatedDraftMetadata({currentVisitId:'DEMO-VISIT-A001',asOfDate:'2026-11-13'}).map(x=>x.visitId),
   ['DEMO-VISIT-C003','DEMO-VISIT-B002','DEMO-VISIT-F004','DEMO-VISIT-LEAP1']);
 assert.deepEqual(registry.earlierDatedDraftMetadata({currentVisitId:'DEMO-VISIT-FUTURE',asOfDate:'2026-11-13'}),[]);
 assert.deepEqual(registry.earlierDatedDraftMetadata({currentVisitId:'DEMO-VISIT-SAME',asOfDate:'2026-10-01'}),[]);
});
test('F3A-16 Metadata list explicitly scoped, never full patient answers',()=>{
 const list=registry.listDraftMetadata({siteId:site,patientCip:cip,pathology:'pso'});
 assert.equal(list.some(x=>'answers' in x),false);
 assert.equal(list.some(x=>x.siteId==='DEMO-SITE-CACERES'),false);
 assert.equal(list.some(x=>x.patientCip==='DEMO-OTHER-111'),false);
});
test('F3A-17 Returned snapshots cannot alter registry',()=>{
 const snap=registry.readDraft('DEMO-VISIT-A001');
 assert.throws(()=>{snap.answers.pasi_cabeza_eritema='4'},TypeError);
 assert.throws(()=>{snap.visitType='primera'},TypeError);
 assert.equal(registry.readDraft('DEMO-VISIT-A001').answers.pasi_cabeza_eritema,'0');
});
test('F3A-18 Instrumentos sin homologación no se guardan como hechos clínicos',()=>{
 for(const key of ['pure4_q1','seguimiento_adherencia_morisky_q1','dlqi_q1']){
   assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{[key]:'1'},{expectedRevision:3}),/no editable/);
 }
 assert.equal(registry.readDraft('DEMO-VISIT-A001').revision,3);
});
test('F3A-19 No se traspasan tratamientos ni decisiones entre circuitos',()=>{
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-A001',{tx_primera_biologicos_farmaco_1:'Adalimumab'},{expectedRevision:3}),/otro circuito/);
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-F004',{tx_seguimiento_biologicos_farmaco_1:'Secukinumab'},{expectedRevision:0}),/otro circuito/);
 assert.throws(()=>registry.setAnswers('DEMO-VISIT-F004',{seguimiento_adherencia_categoria:'Buena'},{expectedRevision:0}),/otro circuito/);
 assert.equal(registry.readDraft('DEMO-VISIT-F004').revision,0);
});
test('F3A-20 No storage, browser, network, save/export, default clock interfaces',()=>{
 for(const name of ['save','persist','export','sync','approve','validate'])assert.equal(name in registry,false);
 const src=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../modules/derma/pso_demo_visit_drafts.js'),'utf8');
 for(const needle of ['localStorage','sessionStorage','fetch(','XMLHttpRequest','indexedDB','Date.now','new Date()','writeFile','navigator.'])
   assert.equal(src.includes(needle),false,'Unexpected persisted or contextual dependency '+needle);
});
for(const [label,fn] of tests){
 try{fn();console.log('PASS '+label)}
 catch(e){console.error('FAIL '+label+': '+e.stack);process.exitCode=1;break}
}
if(!process.exitCode)console.log('F3A_MODEL_20_20_PASS');
