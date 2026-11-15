import assert from 'node:assert/strict';
import {PSO_VALME_FIELDS} from '../modules/derma/pso_valme_fields.js';
import {projectPsoSyntheticVisit} from '../modules/derma/pso_synthetic_visit_projection.js';

const FORMAT='pso-synthetic-visit-projection/v1';
const blockedKinds=new Set(['contexto','cuestionario','derivado','derivado-presentacion']);
const allKeys=PSO_VALME_FIELDS.map(f=>f.key);
const allowed=(visitType)=>PSO_VALME_FIELDS.filter(f=>!blockedKinds.has(f.kind)&&
  (visitType==='primera'
    ? !f.key.startsWith('seguimiento_')&&!f.key.startsWith('tx_seguimiento_')
    : !f.key.startsWith('tx_primera_'))).map(f=>f.key);
const FIRST=allowed('primera');
const FOLLOW=allowed('seguimiento');
let passed=0;
function test(name,run){run();passed++;console.log('PASS FULL-'+String(passed).padStart(2,'0')+' '+name);}
function demo(patch={}){
 return {
  visitId:'DEMO-VISIT-PSO111',siteId:'DEMO-SITE-BADAJOZ',
  patientCip:'DEMO-PAT-001',visitType:'primera',pathology:'pso',
  clinicalDate:'2026-11-15',professionalDisplay:'DEMO-PROFESIONAL-01',
  provenance:'synthetic-manual-entry',answers:{},...patch
 };
}
function fail(request){
 const out=projectPsoSyntheticVisit(request);
 assert.equal(out?.ok,false);
 assert.equal(out.error?.code,'INVALID_SYNTHETIC_VISIT');
 assert.equal(Object.hasOwn(out,'artifact'),false);
 assert.equal(Object.hasOwn(out,'status'),false);
 assert.equal(Object.hasOwn(out,'evidence'),false);
}
function decoded(request){
 const out=projectPsoSyntheticVisit(request);
 assert.equal(out?.ok,true);
 assert.equal(out.status,'synthetic_projection_prepared');
 assert.deepEqual(out.evidence,{kind:'synthetic_local_validation',external:null});
 assert.equal(out.artifact?.format,FORMAT);
 assert.equal(typeof out.artifact?.content,'string');
 assert.equal(Object.hasOwn(out,'persisted'),false);
 const result=JSON.parse(out.artifact.content);
 assert.equal(result.format,FORMAT);
 assert.equal(Object.hasOwn(result,'created_at'),false);
 assert.equal(Object.hasOwn(result,'actorId'),false);
 assert.equal(Object.hasOwn(result.visit,'actorId'),false);
 assert.equal(Object.hasOwn(result.visit,'authenticated'),false);
 assert.equal(Object.hasOwn(result.visit,'authoredAt'),false);
 const {answers,...context}=request;
 assert.deepEqual(result.visit,context);
 return {out,result};
}
test('inventario fuente único de 174 claves, 140 capturables, 108/112 por circuito',()=>{
 assert.equal(PSO_VALME_FIELDS.length,174);
 assert.equal(new Set(allKeys).size,174);
 assert.equal(new Set([...FIRST,...FOLLOW]).size,140);
 assert.equal(FIRST.length,108);
 assert.equal(FOLLOW.length,112);
 assert.equal(PSO_VALME_FIELDS.filter(f=>f.kind==='cuestionario').length,18);
 assert.equal(PSO_VALME_FIELDS.filter(f=>f.kind==='derivado').length,4);
 assert.equal(PSO_VALME_FIELDS.filter(f=>f.kind==='derivado-presentacion').length,7);
 assert.equal(PSO_VALME_FIELDS.filter(f=>f.kind==='contexto').length,5);
});
test('Primera: exporta exhaustivamente las 108 claves expresas y solo ellas',()=>{
 const answers=Object.fromEntries(FIRST.map((key,i)=>[key,'DEMO-CONTENIDO-'+i]));
 answers.bsa='0';
 answers.loc_cuero_cabelludo='No';
 answers.tx_primera_biologicos_farmaco_1='DEMO-FARMACO';
 const request=demo({answers});
 const {result}=decoded(request);
 assert.deepEqual(Object.keys(result.answers),FIRST);
 assert.deepEqual(result.answers,answers);
 assert.equal(Object.hasOwn(result.answers,'tx_primera_biologicos_posologia_1'),true);
});
test('Seguimiento: exporta exhaustivamente las 112 respuestas expresas sin heredar Primera',()=>{
 const answers=Object.fromEntries(FOLLOW.map((key,i)=>[key,'DEMO-SEGUIMIENTO-'+i]));
 answers.seguimiento_motivo_cambio='DEMO-MOTIVO-LITERAL';
 const request=demo({visitType:'seguimiento',visitId:'DEMO-VISIT-PSO222',clinicalDate:'2026-11-16',answers});
 const {result}=decoded(request);
 assert.deepEqual(Object.keys(result.answers),FOLLOW);
 assert.deepEqual(result.answers,answers);
 assert.equal(Object.hasOwn(result.answers,'tx_primera_topicos_farmaco_1'),false);
});
test('fármaco consignado sin posología: no completa datos terapéuticos',()=>{
 const {result}=decoded(demo({answers:{
  tx_primera_biologicos_farmaco_1:'DEMO-FARMACO',
  tratamiento_previo_detalle:'DEMO-HISTORIA-REFERIDA'
 }}));
 assert.deepEqual(result.answers,{
  tratamiento_previo_detalle:'DEMO-HISTORIA-REFERIDA',
  tx_primera_biologicos_farmaco_1:'DEMO-FARMACO',
 });
 assert.equal(Object.keys(result.answers).some(k=>k.includes('posologia')),false);
});
test('cero, negativo, desconocido, no aplica y unicode se mantienen literales',()=>{
 const values={
  bsa:'0',comorb_obesidad:'No',loc_cuero_cabelludo:'Desconocido',
  antecedentes_familiares_psoriasis:'No aplica',
  observaciones_clinicas:'Área DÉRMA · àéíñ 🧪 · 2.5 %, sin convertir',
 };
 const {result}=decoded(demo({answers:values}));
 assert.deepEqual(result.answers,{
  antecedentes_familiares_psoriasis:'No aplica',
  comorb_obesidad:'No',loc_cuero_cabelludo:'Desconocido',
  bsa:'0',observaciones_clinicas:values.observaciones_clinicas,
 });
});
test('ausencia no es negativo y fecha clínica null no se sustituye',()=>{
 const {result}=decoded(demo({clinicalDate:null,answers:{loc_cuero_cabelludo:'No'}}));
 assert.equal(result.visit.clinicalDate,null);
 assert.deepEqual(Object.keys(result.answers),['loc_cuero_cabelludo']);
 assert.equal(Object.hasOwn(result.answers,'comorb_obesidad'),false);
 assert.equal(Object.hasOwn(result.answers,'bsa'),false);
});
test('serialización estable aunque el input tenga el orden inverso, sin mutar el input',()=>{
 const keys=['bsa','observaciones_clinicas','comorb_obesidad'];
 const one=Object.fromEntries(keys.map((k,i)=>[k,'DEMO-'+i]));
 const two=Object.fromEntries([...Object.entries(one)].reverse());
 const request=Object.freeze(demo({answers:Object.freeze(two)}));
 const p1=projectPsoSyntheticVisit(request),p2=projectPsoSyntheticVisit(demo({answers:one}));
 assert.equal(p1.ok,true);
 assert.equal(p1.artifact.content,p2.artifact.content);
 assert.deepEqual(request.answers,two);
});
test('dos visitas distintas no comparten identidad, ni datos ni revisión implícita',()=>{
 const a=decoded(demo({answers:{bsa:'0'}})).result;
 const b=decoded(demo({visitId:'DEMO-VISIT-PSO002',visitType:'seguimiento',answers:{bsa:'50'}})).result;
 assert.notEqual(a.visit.visitId,b.visit.visitId);
 assert.equal(a.answers.bsa,'0');assert.equal(b.answers.bsa,'50');
 assert.equal(Object.hasOwn(a.visit,'revision'),false);
 assert.equal(Object.hasOwn(b.visit,'revision'),false);
});
test('bloquea los 34 campos NO capturables de los 174 como respuesta',()=>{
 const blocked=PSO_VALME_FIELDS.filter(f=>blockedKinds.has(f.kind));
 assert.equal(blocked.length,34);
 for(const f of blocked)fail(demo({answers:{[f.key]:'DEMO'}}));
});
test('bloquea todos los campos exclusivos de otro circuito',()=>{
 for(const key of FOLLOW.filter(k=>!FIRST.includes(k)))
   fail(demo({answers:{[key]:'DEMO'}}));
 for(const key of FIRST.filter(k=>!FOLLOW.includes(k)))
   fail(demo({visitType:'seguimiento',answers:{[key]:'DEMO'}}));
});
test('rechaza casos concretos: PASI total, cuestionarios, zonas derivadas y fechas como answer',()=>{
 for(const key of ['pasi','dlqi_q1','dlqi_total','pure4_q1','pure4_total_positivas',
    'seguimiento_adherencia_morisky_q1','seguimiento_morisky_total_no_adherencia',
    'zona_esp_cara','nusha','fecha_visita','tratamiento_previo_consulta','OTRO'])
   fail(demo({answers:{[key]:'DEMO'}}));
});
test('no admite null, undefined, arrays, objetos, flags ni cadenas vacías',()=>{
 for(const value of [null,undefined,'', '  ',0,false,[],{},['DEMO']]){
   fail(demo({answers:{bsa:value}}));
 }
 for(const answers of [null,undefined,[],new Date(),'DEMO',0])fail(demo({answers}));
});
test('contexto no puede obtenerse de nombres no demo ni de timestamp automático',()=>{
 for(const patch of [{visitId:'A-123'}, {siteId:'HOSP-REAL'},
 {patientCip:'PACIENTE-REAL'}, {professionalDisplay:'Dra. Real'},
 {professionalDisplay:null},{pathology:'hs'},{visitType:'indefinida'},
 {provenance:'hospital-producida'}, {clinicalDate:undefined},
 {clinicalDate:'2026-02-30'},{clinicalDate:'ayer'},{clinicalDate:'2026-13-01'},
 {actorId:'DEMO-PROF'}, {created_at:'2026-11-15'},{revision:1}]){
   fail(demo(patch));
 }
 const incomplete=demo();delete incomplete.answers;fail(incomplete);
});
test('fecha bisiesta y 0 como cadena explícita aceptados',()=>{
 const {result}=decoded(demo({clinicalDate:'2024-02-29',answers:{bsa:'0'}}));
 assert.equal(result.visit.clinicalDate,'2024-02-29');
 assert.equal(result.answers.bsa,'0');
});
test('accesores, símbolos, propiedades peligrosas y no enumerables: falla seguro',()=>{
 let invoked=false;
 const getters={};Object.defineProperty(getters,'bsa',{enumerable:true,get(){invoked=true;throw Error('NO')}});
 fail(demo({answers:getters}));assert.equal(invoked,false);
 const nonEnum={};Object.defineProperty(nonEnum,'bsa',{value:'DEMO',enumerable:false});fail(demo({answers:nonEnum}));
 const symbol={[Symbol('field')]:'DEMO'};fail(demo({answers:symbol}));
 fail(demo({answers:JSON.parse('{"__proto__":"DEMO"}')}));
 const badVisit=demo();
 Object.defineProperty(badVisit,'visitId',{enumerable:true,get(){invoked=true;throw Error('NO')}});
 fail(badVisit);assert.equal(invoked,false);
});
test('no se entrega artefacto parcial ante circularidad o objeto con prototipo extraño',()=>{
 const cycle={bsa:'0'};cycle.self=cycle;fail(demo({answers:cycle}));
 fail(demo({answers:Object.create({bsa:'0'})}));
 fail(demo({answers:new Map([['bsa','0']])}));
});
console.log('DER_PSO_SYNTHETIC_VISIT_PROJECTION_'+passed+'_'+passed+'_PASS');
