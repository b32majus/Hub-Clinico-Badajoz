import assert from 'node:assert/strict';
import {preparePsoSyntheticTransport} from '../modules/derma/pso_synthetic_transport_probe.js';

const FORMAT='pso-synthetic-transport-probe/v0';
let count=0;

function test(name,fn){
  fn();
  count++;
  console.log('PASS PROBE-'+String(count).padStart(2,'0')+' '+name);
}
function input(overrides={}){
  return {
    visitId:'DEMO-VISIT-PSO001',
    siteId:'DEMO-SITE-BADAJOZ',
    patientCip:'DEMO-PSO-001',
    visitType:'primera',
    pathology:'pso',
    clinicalDate:'2026-11-12',
    professionalDisplay:'DEMO-PROF-01',
    provenance:'synthetic-manual-entry',
    answers:{
      observaciones_clinicas:'PsO sintética · revisión inicial',
      loc_cuero_cabelludo:'No',
      comorb_obesidad:'0',
      bsa:'0',
      pasi_cabeza_eritema:'0',
    },
    ...overrides,
  };
}
function expectFailure(request){
  const result=preparePsoSyntheticTransport(request);
  assert.equal(result?.ok,false);
  assert.equal(typeof result.error?.code,'string');
  assert.ok(result.error.code.length);
  assert.equal(Object.hasOwn(result,'artifact'),false,'No hay artefacto parcial ante fallo');
  assert.equal(Object.hasOwn(result,'status'),false,'No hay estado positivo ante fallo');
  assert.equal(Object.hasOwn(result,'evidence'),false,'No hay prueba positiva ante fallo');
}
function decoded(result){
  assert.equal(result.ok,true);
  assert.equal(result.status,'synthetic_probe_prepared');
  assert.equal(result.evidence?.kind,'synthetic_local_validation');
  assert.equal(result.evidence?.external,null);
  assert.equal(result.artifact?.format,FORMAT);
  assert.equal(typeof result.artifact?.content,'string');
  assert.equal(Object.hasOwn(result,'persisted'),false);
  const parsed=JSON.parse(result.artifact.content);
  assert.equal(parsed.format,FORMAT);
  assert.equal(parsed.visit.provenance,'synthetic-manual-entry');
  assert.equal(Object.hasOwn(parsed,'created_at'),false);
  assert.equal(Object.hasOwn(parsed.visit,'authoredAt'),false);
  assert.equal(Object.hasOwn(parsed.visit,'actorId'),false);
  assert.equal(Object.hasOwn(parsed.visit,'authenticated'),false);
  return parsed;
}
const expectedVisit=(request)=>({
  visitId:request.visitId,
  siteId:request.siteId,
  patientCip:request.patientCip,
  visitType:request.visitType,
  pathology:request.pathology,
  clinicalDate:request.clinicalDate,
  professionalDisplay:request.professionalDisplay,
  provenance:request.provenance,
});

test('Primera Visita conserva contexto y las cinco respuestas expresas',()=>{
  const request=input();
  assert.deepEqual(decoded(preparePsoSyntheticTransport(request)),{
    format:FORMAT, visit:expectedVisit(request),answers:request.answers,
  });
});
test('Seguimiento es visita independiente y no hereda datos de Primera',()=>{
  const first=input(),followup=input({
    visitId:'DEMO-VISIT-PSO002',visitType:'seguimiento',
    clinicalDate:'2026-11-13',answers:{bsa:'0',loc_cuero_cabelludo:'No'},
  });
  const a=decoded(preparePsoSyntheticTransport(first));
  const b=decoded(preparePsoSyntheticTransport(followup));
  assert.notEqual(a.visit.visitId,b.visit.visitId);
  assert.equal(a.visit.visitType,'primera');
  assert.equal(b.visit.visitType,'seguimiento');
  assert.deepEqual(b.answers,{bsa:'0',loc_cuero_cabelludo:'No'});
  assert.equal(Object.hasOwn(b.answers,'observaciones_clinicas'),false);
});
test('No, cero, texto y claves ausentes no se convierten ni se completan',()=>{
  const parsed=decoded(preparePsoSyntheticTransport(input({answers:{
    loc_cuero_cabelludo:'No',bsa:'0',
  }})));
  assert.equal(parsed.answers.loc_cuero_cabelludo,'No');
  assert.equal(parsed.answers.bsa,'0');
  for(const k of ['comorb_obesidad','observaciones_clinicas','pasi_cabeza_eritema'])
    assert.equal(Object.hasOwn(parsed.answers,k),false);
});
test('Fecha explícitamente null se conserva sin reloj automático',()=>{
  const parsed=decoded(preparePsoSyntheticTransport(input({clinicalDate:null,answers:{}})));
  assert.equal(parsed.visit.clinicalDate,null);
  assert.deepEqual(parsed.answers,{});
});
test('Resultado estable y sin mutar la entrada',()=>{
  const request=input({answers:Object.freeze({bsa:'0',loc_cuero_cabelludo:'No'})});
  Object.freeze(request);
  const x=preparePsoSyntheticTransport(request);
  const y=preparePsoSyntheticTransport(request);
  assert.equal(x.artifact.content,y.artifact.content);
  assert.deepEqual(decoded(x).answers,request.answers);
});
test('Rechaza identificadores ausentes, no-demo, hospital inexistente o tipo incorrecto',()=>{
  for(const patch of [
    {visitId:null},{visitId:'VISIT-123'},{siteId:'SES-BADAJOZ'},
    {patientCip:'1234-REAL'},{visitType:'otras'},{pathology:'hs'},
    {professionalDisplay:null},{professionalDisplay:'Dra. Nombre Real'},
    {provenance:'hospital-real'}, {clinicalDate:undefined},
    {clinicalDate:'2026-02-30'},{clinicalDate:'2026-13-01'},
    {clinicalDate:'14/11/2026'},
  ])expectFailure(input(patch));
});
test('No inventa nombre de profesional a partir de actorId o campos extra',()=>{
  expectFailure({...input(),actorId:'DEMO-PROF-01'});
  expectFailure({...input(),authentication:'ses'});
  expectFailure({...input(),created_at:'2026-11-14'});
});
test('Solo cinco claves literales: sin cuestionarios, derivados ni terapias',()=>{
  for(const k of [
    'pasi','dlqi_q1','dlqi_total','pure4_q1','pure4_total_positivas',
    'seguimiento_adherencia_morisky_q1','seguimiento_morisky_total_no_adherencia',
    'zona_esp_cara','tratamiento_previo_consulta','tx_primera_biologicos_farmaco_1',
    'tx_primera_biologicos_posologia_1','derivacion_derma_reuma','seguimiento_ajuste_terapeutico',
    'fecha_visita','nusha','irrelevante',
  ])expectFailure(input({answers:{bsa:'0',[k]:'texto-demo'}}));
});
test('Respuestas no literales no producen éxito ni contenido parcial',()=>{
  for(const answers of [
    {bsa:0},{bsa:false},{bsa:null},{bsa:''},
    {bsa:undefined},{bsa:['0']},{bsa:{value:'0'}},
    null,[],undefined,
  ])expectFailure(input({answers}));
});
test('Rechaza claves extra de contexto, tipos no planos y accesores',()=>{
  expectFailure(null);
  expectFailure(input({answers:new Date()}));
  const hostile=JSON.parse('{"__proto__":"demo"}');
  expectFailure(input({answers:hostile}));
  const getter={};
  Object.defineProperty(getter,'bsa',{enumerable:true,get(){throw Error('GETTER_CALLED')}});
  expectFailure(input({answers:getter}));
});
test('No degrada silenciosamente un contenido cíclico ni crea artefacto',()=>{
  const values={bsa:'0'};
  values.self=values;
  expectFailure(input({answers:values}));
});

console.log('DER_PSO_SYNTHETIC_TRANSPORT_PROBE_'+count+'_'+count+'_PASS');
