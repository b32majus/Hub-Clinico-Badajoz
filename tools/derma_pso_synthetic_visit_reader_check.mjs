import assert from 'node:assert/strict';
import {projectPsoSyntheticVisit} from '../modules/derma/pso_synthetic_visit_projection.js';
import {decodePsoSyntheticVisit,readPsoSyntheticPatientHistory} from '../modules/derma/pso_synthetic_visit_reader.js';

const A='DEMO-PAT-001', B='DEMO-PAT-002', SITE='DEMO-SITE-BADAJOZ', OTHER_SITE='DEMO-SITE-CACERES';
const FMT='pso-synthetic-visit-projection/v1';
let passed=0;
function check(name,body){body();passed++;console.log('PASS READ-'+String(passed).padStart(2,'0')+' '+name);}
function input(patch={}){
 return {visitId:'DEMO-VISIT-PSO001',siteId:SITE,patientCip:A,visitType:'primera',
 pathology:'pso',clinicalDate:'2026-11-12',professionalDisplay:'DEMO-PROFESIONAL-1',
 provenance:'synthetic-manual-entry',answers:{},...patch};
}
function artifact(request){
 const result=projectPsoSyntheticVisit(request);
 assert.equal(result.ok,true,'Debe originarse en el proyector sintético real');
 return result.artifact.content;
}
function history(patientCip=A,contents=[],siteId=SITE){
 return readPsoSyntheticPatientHistory({siteId,patientCip,contents});
}
function noPartial(result,code){
 assert.equal(result?.outcome,'error');
 assert.equal(result.errorCode,code);
 assert.equal(Object.hasOwn(result,'value'),false,'El error no puede entregar historial parcial');
 assert.equal(Object.hasOwn(result,'visits'),false);
 assert.equal(Object.hasOwn(result,'persisted'),false);
}
function readOK(text){
 const result=decodePsoSyntheticVisit(text);
 assert.equal(result?.outcome,'ok');
 assert.deepEqual(result.provenance,{kind:'synthetic_artifact'});
 assert.equal(result.completeness,'unknown');
 assert.equal(Object.hasOwn(result,'persisted'),false);
 return result.value;
}
function bundleOK(result,patientCip=A){
 assert.equal(result?.outcome,'ok');
 assert.equal(result.value?.siteId,SITE);
 assert.equal(result.value?.patientCip,patientCip);
 assert.equal(result.provenance?.kind,'supplied_synthetic_artifacts');
 assert.equal(result.completeness,'unknown');
 assert.equal(Object.hasOwn(result,'persisted'),false);
 return result.value.visits;
}
const A1=input({answers:{bsa:'0',comorb_obesidad:'No',loc_cuero_cabelludo:'Desconocido',
 observaciones_clinicas:'DEMO · Prueba con ñ y ⚕️',tx_primera_biologicos_farmaco_1:'DEMO-TERAPIA'}});
const A2=input({visitId:'DEMO-VISIT-PSO002',visitType:'seguimiento',clinicalDate:'2026-11-16',
 answers:{bsa:'30',observaciones_clinicas:'DEMO · revisión posterior',seguimiento_motivo_cambio:'DEMO declaración sin acción'}});
const B1=input({patientCip:B,visitId:'DEMO-VISIT-PSO003',clinicalDate:'2026-11-14',
 answers:{bsa:'50',comorb_obesidad:'No'}});
const AUN=input({visitId:'DEMO-VISIT-PSO004',clinicalDate:null,
 answers:{bsa:'0',observaciones_clinicas:'DEMO fecha no indicada'}});
const C=[artifact(A2),artifact(B1),artifact(AUN),artifact(A1)];

check('reader reconstruye una Primera Visita sin perder texto ni completar posología',()=>{
 const row=readOK(artifact(A1));
 assert.deepEqual(row,{visit:((({answers,...v})=>v)(A1)),answers:A1.answers});
 assert.equal(Object.hasOwn(row.answers,'tx_primera_biologicos_posologia_1'),false);
 assert.equal(row.answers.bsa,'0');
 assert.equal(row.answers.comorb_obesidad,'No');
 assert.equal(Object.hasOwn(row.answers,'pasi'),false);
});
check('reader reconstruye Seguimiento separado sin heredar respuestas anteriores',()=>{
 const row=readOK(artifact(A2));
 assert.equal(row.visit.visitType,'seguimiento');
 assert.equal(row.visit.clinicalDate,'2026-11-16');
 assert.equal(Object.hasOwn(row.answers,'tx_primera_biologicos_farmaco_1'),false);
 assert.deepEqual(row.answers,A2.answers);
});
check('A → B → A: mismo lote, sin contaminación, resultados reproducibles',()=>{
 const a1=bundleOK(history(A,C));
 const b=bundleOK(history(B,C),B);
 const a2=bundleOK(history(A,C));
 assert.deepEqual(a2,a1);
 assert.deepEqual(a1.map(x=>x.visit.visitId),['DEMO-VISIT-PSO001','DEMO-VISIT-PSO002','DEMO-VISIT-PSO004']);
 assert.deepEqual(b.map(x=>x.visit.visitId),['DEMO-VISIT-PSO003']);
 assert.equal(b[0].answers.bsa,'50');
 assert.equal(a2[0].answers.bsa,'0');
 assert.equal(Object.hasOwn(b[0].answers,'observaciones_clinicas'),false);
});
check('dos visitas mismo día: desempate por ID, no por orden del array',()=>{
 const x=artifact(input({visitId:'DEMO-VISIT-PSO006',answers:{bsa:'6'}}));
 const y=artifact(input({visitId:'DEMO-VISIT-PSO005',answers:{bsa:'5'}}));
 const rows=bundleOK(history(A,[x,y]));
 assert.deepEqual(rows.map(x=>x.visit.visitId),['DEMO-VISIT-PSO005','DEMO-VISIT-PSO006']);
});
check('fecha clínica nula permanece nula y no se convierte en visita previa válida',()=>{
 const r=history(A,C);
 const rows=bundleOK(r);
 assert.equal(r.chronology,'contains_undated');
 assert.equal(rows[2].visit.clinicalDate,null);
 assert.equal(rows[2].answers.bsa,'0');
 assert.equal(Object.hasOwn(rows[2].visit,'created_at'),false);
 assert.equal(Object.hasOwn(rows[2].visit,'recorded_at'),false);
});
check('todas las visitas fechadas: ordenadas y sin fecha de exportación',()=>{
 const r=history(A,[artifact(A2),artifact(A1)]);
 assert.equal(r.chronology,'ordered');
 assert.deepEqual(bundleOK(r).map(x=>x.visit.clinicalDate),['2026-11-12','2026-11-16']);
});
check('fuente sintética sin coincidencia no prueba que el paciente no exista',()=>{
 const r=history('DEMO-PAT-999',[artifact(A1),artifact(B1)]);
 assert.equal(r.outcome,'not_found');
 assert.equal(r.errorCode,'NO_MATCH_IN_SUPPLIED_ARTIFACTS');
 assert.equal(Object.hasOwn(r,'value'),false);
 assert.equal(Object.hasOwn(r,'persisted'),false);
 const empty=history(A,[]);
 assert.equal(empty.outcome,'not_found');
 assert.equal(empty.errorCode,'NO_MATCH_IN_SUPPLIED_ARTIFACTS');
});
check('scope hospitalario: otra fuente/sede se rechaza, no se filtra',()=>{
 const foreign=artifact(input({siteId:OTHER_SITE,visitId:'DEMO-VISIT-PSO008'}));
 noPartial(history(A,[artifact(A1),foreign]),'SOURCE_SCOPE_MISMATCH');
 noPartial(history(A,[foreign]),'SOURCE_SCOPE_MISMATCH');
});
check('lote con artifact JSON corrupto no devuelve visitas parciales',()=>{
 noPartial(history(A,[artifact(A1),'incorrecto']), 'INVALID_SYNTHETIC_BATCH');
 noPartial(history(A,[artifact(A1),'null']), 'INVALID_SYNTHETIC_BATCH');
 noPartial(history(A,[artifact(A1),'[]']), 'INVALID_SYNTHETIC_BATCH');
});
check('versiones y claves adicionales, cambios en serialización, borrador F3a: rechazados',()=>{
 const good=artifact(A1);
 const parsed=JSON.parse(good);
 for(const modified of [
  JSON.stringify({...parsed,format:'pso-synthetic-visit-projection/v2'}),
  JSON.stringify({...parsed,recordState:'demo_draft_only'}),
  JSON.stringify({...parsed,visit:{...parsed.visit,recordState:'demo_draft_only'}}),
  JSON.stringify({...parsed,answers:{...parsed.answers,pasi:'17'}}),
  JSON.stringify({...parsed,answers:{...parsed.answers,comorb_obesidad:null}}),
  JSON.stringify({...parsed,answers:{...parsed.answers,bsa:'0',dlqi_total:'0'}}),
  JSON.stringify(parsed,null,2),
  good.replace('"format"','"format":"pso-synthetic-visit-projection/v9","format"'),
 ])noPartial(decodePsoSyntheticVisit(modified),'INVALID_SYNTHETIC_ARTIFACT');
});
check('una visita duplicada idéntica bloquea el lote completo',()=>{
 noPartial(history(A,[artifact(A1),artifact(A1)]),'DUPLICATE_SYNTHETIC_VISIT');
});
check('mismo visitId con otro paciente también es conflicto de identidad',()=>{
 const x=artifact(input({patientCip:B,answers:{bsa:'77'}}));
 noPartial(history(A,[artifact(A1),x]),'DUPLICATE_SYNTHETIC_VISIT');
});
check('error sin filtraciones: input hostil o campos técnicos no permitidos',()=>{
 for(const content of [null,undefined,{},1,false,new String(artifact(A1))])
  noPartial(decodePsoSyntheticVisit(content),'INVALID_SYNTHETIC_ARTIFACT');
 for(const wrong of [null,undefined,{},'texto',[],new Date()])
  noPartial(readPsoSyntheticPatientHistory(wrong),'INVALID_SYNTHETIC_BATCH');
});
check('validación del contexto y array denso: no invoca getters',()=>{
 let invoked=false;
 const hostile={siteId:SITE,patientCip:A,contents:[artifact(A1)]};
 Object.defineProperty(hostile,'siteId',{enumerable:true,get(){invoked=true;throw Error('GETTER')}});
 noPartial(readPsoSyntheticPatientHistory(hostile),'INVALID_SYNTHETIC_BATCH');
 assert.equal(invoked,false);
 const arr=[artifact(A1)];Object.defineProperty(arr,'0',{get(){invoked=true;throw Error('GETTER')}});
 noPartial(history(A,arr),'INVALID_SYNTHETIC_BATCH');
 assert.equal(invoked,false);
 const sparse=[];sparse.length=1;
 noPartial(history(A,sparse),'INVALID_SYNTHETIC_BATCH');
 for(const x of [null,'REAL-CIP','DEMO-',A.toLowerCase()])
  noPartial(history(x,[artifact(A1)]),'INVALID_SYNTHETIC_BATCH');
});
check('campos peligrosos, claves de contexto extra y símbolo en solicitud: rechazo',()=>{
 const hostile=JSON.parse('{"__proto__":"DEMO"}');
 // Object.assign activa un setter y no preserva esta clave propia con el valor primitivo.
 // Spread sí crea la propiedad hostil real y prueba el rechazo del lector.
 const request={...{siteId:SITE,patientCip:A,contents:[]},...hostile};
 assert.equal(Object.hasOwn(request,'__proto__'),true);
 noPartial(readPsoSyntheticPatientHistory(request),'INVALID_SYNTHETIC_BATCH');
 noPartial(readPsoSyntheticPatientHistory({siteId:SITE,patientCip:A,contents:[],registered:true}),'INVALID_SYNTHETIC_BATCH');
 noPartial(readPsoSyntheticPatientHistory({siteId:SITE,patientCip:A,contents:[],[Symbol('a')]:true}),'INVALID_SYNTHETIC_BATCH');
});
check('lecturas posteriores no conservan estado mutable entre pacientes',()=>{
 const r=history(A,C),rows=bundleOK(r);
 rows[0].answers.bsa='CAMBIADO_EN_VISTA';
 const next=bundleOK(history(A,C));
 assert.equal(next[0].answers.bsa,'0');
 assert.equal(bundleOK(history(B,C),B)[0].answers.bsa,'50');
});
console.log('DER_PSO_SYNTHETIC_VISIT_READER_'+passed+'_'+passed+'_PASS');
