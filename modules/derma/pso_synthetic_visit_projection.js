// F3c / PsO · Proyección sintética integral de visita DEMO (prueba técnica de representación).
// NO es registro clínico, acto Derma, export Excel ni validación L1: no puntúa, no decide
// terapia, no infiere ausencias y no persiste. Función pura: sin DOM, red, almacenamiento,
// reloj ni borradores recuperables. Única autoridad de claves: PSO_VALME_FIELDS.
import {PSO_VALME_FIELDS} from './pso_valme_fields.js';

const FORMAT='pso-synthetic-visit-projection/v1';
const ERROR_CODE='INVALID_SYNTHETIC_VISIT';
// Mensaje único y no sensible: nunca se reemiten contenidos ni claves recibidas.
const ERROR_MESSAGE='Error de proyección sintética';
const CONTEXT_KEYS=Object.freeze([
  'visitId','siteId','patientCip','visitType','pathology','clinicalDate',
  'professionalDisplay','provenance','answers',
]);
const NON_CAPTURABLE_KINDS=new Set(['contexto','derivado','derivado-presentacion','cuestionario']);
const DANGEROUS_KEYS=new Set(['__proto__','constructor','prototype']);
const VISIT_TYPES=Object.freeze(['primera','seguimiento']);
const DEMO_VISIT_ID=/^DEMO-VISIT-[A-Z0-9-]{3,32}$/;
const DEMO_SITE_ID=/^DEMO-SITE-[A-Z0-9-]{2,32}$/;
const DEMO_PATIENT_CIP=/^DEMO-[A-Z0-9-]{3,24}$/;
const CONTROL_CHARS=/[\u0000-\u001f\u007f]/;

// Circuitos derivados del inventario donante: contexto, derivados, presentación y
// cuestionarios UI_ONLY quedan fuera; cada circuito excluye los tratamientos del otro.
function capturableKeys(visitType){
  return PSO_VALME_FIELDS
    .filter(field=>!NON_CAPTURABLE_KINDS.has(field.kind))
    .filter(field=>visitType==='primera'
      ? !field.key.startsWith('seguimiento_')&&!field.key.startsWith('tx_seguimiento_')
      : !field.key.startsWith('tx_primera_'))
    .map(field=>field.key);
}
const CIRCUIT_KEYS=Object.freeze({
  primera:Object.freeze(capturableKeys('primera')),
  seguimiento:Object.freeze(capturableKeys('seguimiento')),
});
const CIRCUIT_KEY_SETS=Object.freeze({
  primera:new Set(CIRCUIT_KEYS.primera),
  seguimiento:new Set(CIRCUIT_KEYS.seguimiento),
});

function reject(){
  throw new Error(ERROR_MESSAGE);
}
function failure(){
  return Object.freeze({
    ok:false,
    error:Object.freeze({code:ERROR_CODE,message:ERROR_MESSAGE}),
  });
}
function isPlainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===null||prototype===Object.prototype;
}
function ownStringKeys(object){
  const keys=Reflect.ownKeys(object);
  for(const key of keys){
    if(typeof key!=='string'||DANGEROUS_KEYS.has(key))reject();
  }
  return keys;
}
// Lee solo propiedades de dato ya presentes: nunca invoca accesores ni heredados.
function ownField(object,key){
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))reject();
  return descriptor.value;
}
function requireDemoId(value,pattern){
  if(typeof value!=='string'||!pattern.test(value))reject();
  return value;
}
function requireLiteral(value,expected){
  if(value!==expected)reject();
  return value;
}
function requireVisitType(value){
  if(!VISIT_TYPES.includes(value))reject();
  return value;
}
function requireClinicalDate(value){
  if(value===null)return null; // null explícito solo para la fecha; nunca se sustituye
  if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))reject();
  const [year,month,day]=value.split('-').map(Number);
  if(year<1900||year>2100)reject();
  const probe=new Date(Date.UTC(year,month-1,day));
  if(probe.getUTCFullYear()!==year||probe.getUTCMonth()!==month-1||probe.getUTCDate()!==day)
    reject();
  return value;
}
function requireProfessionalDisplay(value){
  if(typeof value!=='string'||value.length<6||value.length>80||
    !value.startsWith('DEMO-')||CONTROL_CHARS.test(value))reject();
  return value;
}
function readVisit(request){
  if(!isPlainObject(request))reject();
  const present=ownStringKeys(request);
  for(const key of present)if(!CONTEXT_KEYS.includes(key))reject();
  for(const key of CONTEXT_KEYS)if(!present.includes(key))reject();
  return {
    visitId:requireDemoId(ownField(request,'visitId'),DEMO_VISIT_ID),
    siteId:requireDemoId(ownField(request,'siteId'),DEMO_SITE_ID),
    patientCip:requireDemoId(ownField(request,'patientCip'),DEMO_PATIENT_CIP),
    visitType:requireVisitType(ownField(request,'visitType')),
    pathology:requireLiteral(ownField(request,'pathology'),'pso'),
    clinicalDate:requireClinicalDate(ownField(request,'clinicalDate')),
    professionalDisplay:requireProfessionalDisplay(ownField(request,'professionalDisplay')),
    provenance:requireLiteral(ownField(request,'provenance'),'synthetic-manual-entry'),
  };
}
// Copia en orden canónico del inventario: lo omitido permanece omitido, lo consignado
// se conserva literal (0, No, Desconocido, Unicode) sin completar ni derivar nada.
function readAnswers(container,visitType){
  if(!isPlainObject(container))reject();
  const keySet=CIRCUIT_KEY_SETS[visitType];
  for(const key of ownStringKeys(container))if(!keySet.has(key))reject();
  const answers={};
  for(const key of CIRCUIT_KEYS[visitType]){
    const descriptor=Object.getOwnPropertyDescriptor(container,key);
    if(!descriptor)continue;
    if(!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))reject();
    const value=descriptor.value;
    if(typeof value!=='string'||value.trim().length===0)reject();
    answers[key]=value;
  }
  return answers;
}

export function projectPsoSyntheticVisit(request){
  try{
    const visit=readVisit(request);
    const answers=readAnswers(ownField(request,'answers'),visit.visitType);
    const content=JSON.stringify({format:FORMAT,visit,answers});
    return Object.freeze({
      ok:true,
      status:'synthetic_projection_prepared',
      evidence:Object.freeze({kind:'synthetic_local_validation',external:null}),
      artifact:Object.freeze({format:FORMAT,content}),
    });
  }catch{
    return failure();
  }
}
