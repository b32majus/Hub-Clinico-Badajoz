// F3c / PsO · Lector de artefactos sintéticos DEMO (prueba técnica de representación).
// NO es registro clínico, acto Derma, export Excel, read-port institucional ni validación L1:
// solo recompone copias nuevas de artefactos DEMO suministrados explícitamente. Función pura:
// sin DOM, red, almacenamiento, reloj, caché ni estado compartido entre llamadas. La sonda
// canónica del proyector sintético es la única autoridad de esquema y claves: aquí no se
// completa, deriva, puntúa ni inventa ningún dato clínico ni fecha.
import {projectPsoSyntheticVisit} from './pso_synthetic_visit_projection.js';

const FORMAT='pso-synthetic-visit-projection/v1';
const DECODE_ERROR_CODE='INVALID_SYNTHETIC_ARTIFACT';
const BATCH_ERROR_CODE='INVALID_SYNTHETIC_BATCH';
const SCOPE_ERROR_CODE='SOURCE_SCOPE_MISMATCH';
const DUPLICATE_ERROR_CODE='DUPLICATE_SYNTHETIC_VISIT';
const NOT_FOUND_ERROR_CODE='NO_MATCH_IN_SUPPLIED_ARTIFACTS';
const VISIT_KEYS=Object.freeze([
  'visitId','siteId','patientCip','visitType','pathology','clinicalDate',
  'professionalDisplay','provenance',
]);
const ARTIFACT_KEYS=Object.freeze(['format','visit','answers']);
const CONTEXT_KEYS=Object.freeze(['siteId','patientCip','contents']);
const DANGEROUS_KEYS=new Set(['__proto__','constructor','prototype']);
const DEMO_SITE_ID=/^DEMO-SITE-[A-Z0-9-]{2,32}$/;
const DEMO_PATIENT_CIP=/^DEMO-[A-Z0-9-]{3,24}$/;
// Marcas internas: se traducen en cada frontera a un código no sensible, sin reemitir datos.
const REJECT=Symbol('psoSyntheticReaderReject');
const SCOPE_MISMATCH=Symbol('psoSyntheticReaderScope');
const DUPLICATE_VISIT=Symbol('psoSyntheticReaderDuplicate');

function reject(){
  throw REJECT;
}
function isPlainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===null||prototype===Object.prototype;
}
// Solo claves propias de texto y ninguna clave peligrosa por composición accidental.
function ownStringKeys(object){
  const keys=Reflect.ownKeys(object);
  for(const key of keys){
    if(typeof key!=='string'||DANGEROUS_KEYS.has(key))reject();
  }
  return keys;
}
// Lee solo propiedades de dato ya presentes: nunca invoca accesores ni heredados.
function readOwnData(object,key){
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))reject();
  return descriptor.value;
}
function requireDemoId(value,pattern){
  if(typeof value!=='string'||!pattern.test(value))reject();
  return value;
}
function requireExactKeys(object,expected){
  const present=ownStringKeys(object);
  if(present.length!==expected.length)reject();
  for(const key of expected)if(!present.includes(key))reject();
  return present;
}
// Reconstruye una visita desde la sonda JSON canónica: exige igualdad byte a byte con la
// emisión del proyector, de modo que corrupción, versión, desorden, claves extra o llaves
// JSON repetidas no puedan pasar por artefacto válido.
function readArtifact(content){
  if(typeof content!=='string')reject();
  let parsed;
  try{
    parsed=JSON.parse(content);
  }catch{
    reject();
  }
  if(!isPlainObject(parsed))reject();
  requireExactKeys(parsed,ARTIFACT_KEYS);
  if(readOwnData(parsed,'format')!==FORMAT)reject();
  const visit=readOwnData(parsed,'visit');
  if(!isPlainObject(visit))reject();
  requireExactKeys(visit,VISIT_KEYS);
  const request={};
  for(const key of VISIT_KEYS)request[key]=readOwnData(visit,key);
  request.answers=readOwnData(parsed,'answers');
  const projection=projectPsoSyntheticVisit(request);
  if(!projection||projection.ok!==true||!projection.artifact)reject();
  const artifact=projection.artifact;
  if(artifact.format!==FORMAT||typeof artifact.content!=='string')reject();
  if(artifact.content!==content)reject();
  // Reconstrucción nueva e independiente del input: copia canónica recién parseada.
  const canonical=JSON.parse(artifact.content);
  return {visit:canonical.visit,answers:canonical.answers};
}
function readArrayLength(value){
  const descriptor=Object.getOwnPropertyDescriptor(value,'length');
  if(!descriptor||!Object.hasOwn(descriptor,'value'))reject();
  const length=descriptor.value;
  if(typeof length!=='number'||!Number.isInteger(length)||length<0)reject();
  return length;
}
// Array plano y denso de textos: sin huecos, índices extra, accesores ni símbolos.
function readContents(value){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)reject();
  const length=readArrayLength(value);
  if(Reflect.ownKeys(value).length!==length+1)reject(); // índices densos + longitud
  const contents=[];
  for(let index=0;index<length;index+=1){
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))reject();
    if(typeof descriptor.value!=='string')reject();
    contents.push(descriptor.value);
  }
  return contents;
}
function readContext(request){
  if(!isPlainObject(request))reject();
  requireExactKeys(request,CONTEXT_KEYS);
  return {
    siteId:requireDemoId(readOwnData(request,'siteId'),DEMO_SITE_ID),
    patientCip:requireDemoId(readOwnData(request,'patientCip'),DEMO_PATIENT_CIP),
    contents:readContents(readOwnData(request,'contents')),
  };
}
// Fecha válida ascendente; empate por identificador de visita; sin fecha al final, sin inventar
// su orden relativo (se conserva la posición recibida).
function compareVisits(left,right){
  const leftDate=left.visit.clinicalDate, rightDate=right.visit.clinicalDate;
  if(leftDate===null&&rightDate===null)return 0;
  if(leftDate===null)return 1;
  if(rightDate===null)return -1;
  if(leftDate<rightDate)return -1;
  if(leftDate>rightDate)return 1;
  if(left.visit.visitId<right.visit.visitId)return -1;
  if(left.visit.visitId>right.visit.visitId)return 1;
  return 0;
}

export function decodePsoSyntheticVisit(content){
  try{
    const row=readArtifact(content);
    return {
      outcome:'ok',
      value:{visit:row.visit,answers:row.answers},
      provenance:{kind:'synthetic_artifact'},
      completeness:'unknown',
    };
  }catch{
    return {outcome:'error',errorCode:DECODE_ERROR_CODE};
  }
}

export function readPsoSyntheticPatientHistory(request){
  try{
    const context=readContext(request);
    // Se valida el lote completo antes de seleccionar: nunca hay resultados parciales.
    const rows=context.contents.map(content=>readArtifact(content));
    for(const row of rows)if(row.visit.siteId!==context.siteId)throw SCOPE_MISMATCH;
    const seen=new Set();
    for(const row of rows){
      if(seen.has(row.visit.visitId))throw DUPLICATE_VISIT;
      seen.add(row.visit.visitId);
    }
    const selected=rows.filter(row=>row.visit.patientCip===context.patientCip);
    if(selected.length===0){
      return {outcome:'not_found',errorCode:NOT_FOUND_ERROR_CODE};
    }
    const ordered=selected.slice().sort(compareVisits);
    const chronology=ordered.every(row=>row.visit.clinicalDate!==null)?'ordered':'contains_undated';
    return {
      outcome:'ok',
      value:{
        siteId:context.siteId,
        patientCip:context.patientCip,
        visits:ordered.map(row=>({visit:row.visit,answers:row.answers})),
      },
      provenance:{kind:'supplied_synthetic_artifacts'},
      completeness:'unknown',
      chronology,
    };
  }catch(mark){
    if(mark===SCOPE_MISMATCH)return {outcome:'error',errorCode:SCOPE_ERROR_CODE};
    if(mark===DUPLICATE_VISIT)return {outcome:'error',errorCode:DUPLICATE_ERROR_CODE};
    return {outcome:'error',errorCode:BATCH_ERROR_CODE};
  }
}
