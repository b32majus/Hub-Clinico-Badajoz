// F3c / PsO · SONDA local de transporte sintético (prueba técnica de fidelidad).
// NO es registro clínico, ni export Excel, ni acto Derma aprobado. Función pura:
// sin DOM, almacenamiento, red, reloj, persistencia ni borradores recuperables.
// Solo acepta contexto y respuestas DEMO explícitos y nunca invoca accesores.
const FORMAT='pso-synthetic-transport-probe/v0';
const ERROR_CODE='INVALID_PROBE_INPUT';
const CONTEXT_KEYS=Object.freeze([
  'visitId','siteId','patientCip','visitType','pathology','clinicalDate',
  'professionalDisplay','provenance','answers',
]);
const ANSWER_KEYS=Object.freeze([
  'observaciones_clinicas','loc_cuero_cabelludo','comorb_obesidad','bsa','pasi_cabeza_eritema',
]);
const DANGEROUS_KEYS=new Set(['__proto__','constructor','prototype']);
const DEMO_VISIT_ID=/^DEMO-VISIT-[A-Z0-9-]{3,32}$/;
const DEMO_SITE_ID=/^DEMO-SITE-[A-Z0-9-]{2,32}$/;
const DEMO_PATIENT_CIP=/^DEMO-[A-Z0-9-]{3,24}$/;
const VISIT_TYPES=Object.freeze(['primera','seguimiento']);
const CONTROL_CHARS=/[\u0000-\u001f\u007f]/;
const REJECT_MARK=Symbol('psoSyntheticProbeReject');
const GENERIC_MESSAGE='Sonda sintética rechazada: entrada no explícita o incoherente';

function reject(message){
  const error=new Error(message);
  error[REJECT_MARK]=message;
  throw error;
}
function failure(message){
  return Object.freeze({ok:false,error:Object.freeze({code:ERROR_CODE,message})});
}
function rejectionMessage(error){
  try{
    if(error===null||typeof error!=='object')return GENERIC_MESSAGE;
    const descriptor=Object.getOwnPropertyDescriptor(error,REJECT_MARK);
    if(!descriptor||!Object.hasOwn(descriptor,'value'))return GENERIC_MESSAGE;
    return typeof descriptor.value==='string'?descriptor.value:GENERIC_MESSAGE;
  }catch{return GENERIC_MESSAGE;}
}
function isPlainObject(value){
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===null||prototype===Object.prototype;
}
function ownStringKeys(object,label){
  const keys=Reflect.ownKeys(object);
  for(const key of keys){
    if(typeof key!=='string'||DANGEROUS_KEYS.has(key))
      reject(label+': solo se admiten claves de datos literales');
  }
  return keys;
}
function readOwnField(object,key,label){
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor||!descriptor.enumerable)reject(label+': falta la clave propia '+key);
  if(!Object.hasOwn(descriptor,'value'))reject(label+': '+key+' no admite accesores');
  return descriptor.value;
}
function requireDemoId(value,pattern,label){
  if(typeof value!=='string'||!pattern.test(value))
    reject(label+': solo identificador DEMO sintético explícito');
  return value;
}
function requireVisitType(value){
  if(!VISIT_TYPES.includes(value))
    reject('Tipo de visita debe consignarse expresamente: primera o seguimiento');
  return value;
}
function requireClinicalDate(value){
  if(value===null)return null;
  if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))
    reject('Fecha clínica: AAAA-MM-DD explícita o null, nunca hoy implícito');
  const [year,month,day]=value.split('-').map(Number);
  if(year<1900||year>2100)reject('Fecha clínica fuera de rango demostrativo');
  const probe=new Date(Date.UTC(year,month-1,day));
  if(probe.getUTCFullYear()!==year||probe.getUTCMonth()!==month-1||probe.getUTCDate()!==day)
    reject('Fecha clínica imposible');
  return value;
}
function requireProfessionalDisplay(value){
  if(typeof value!=='string'||value.length<6||value.length>80||
    !value.startsWith('DEMO-')||CONTROL_CHARS.test(value))
    reject('Profesional: nombre sintético aportado que empiece por DEMO-');
  return value;
}
function readAnswers(container){
  if(!isPlainObject(container))reject('Respuestas: objeto plano explícito obligatorio');
  const present=ownStringKeys(container,'Respuestas');
  for(const key of present){
    if(!ANSWER_KEYS.includes(key))reject('Respuestas: clave no autorizada');
  }
  const answers={};
  for(const key of ANSWER_KEYS){
    const descriptor=Object.getOwnPropertyDescriptor(container,key);
    if(!descriptor)continue; // omitida permanece omitida: no se completa ni se deriva
    if(!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))
      reject('Respuestas: '+key+' debe ser texto consignado, no accesor');
    if(typeof descriptor.value!=='string'||descriptor.value.length===0)
      reject('Respuestas: '+key+' debe ser texto consignado, no nulo, vacío ni derivado');
    answers[key]=descriptor.value; // se conserva la grafía literal
  }
  return answers;
}

export function preparePsoSyntheticTransport(request){
  try{
    if(!isPlainObject(request))
      reject('Sonda sintética: se exige un objeto plano explícito');
    const present=ownStringKeys(request,'Sonda sintética');
    for(const key of present){
      if(!CONTEXT_KEYS.includes(key))
        reject('Sonda sintética: no se admiten claves de contexto adicionales');
    }
    for(const key of CONTEXT_KEYS){
      if(!present.includes(key))reject('Sonda sintética: falta la clave obligatoria '+key);
    }
    const visit={
      visitId:requireDemoId(readOwnField(request,'visitId','Visita'),DEMO_VISIT_ID,'ID de visita'),
      siteId:requireDemoId(readOwnField(request,'siteId','Visita'),DEMO_SITE_ID,'Site de la visita'),
      patientCip:requireDemoId(readOwnField(request,'patientCip','Visita'),DEMO_PATIENT_CIP,'CIP de la visita'),
      visitType:requireVisitType(readOwnField(request,'visitType','Visita')),
      pathology:readOwnField(request,'pathology','Visita'),
      clinicalDate:requireClinicalDate(readOwnField(request,'clinicalDate','Visita')),
      professionalDisplay:requireProfessionalDisplay(readOwnField(request,'professionalDisplay','Visita')),
      provenance:readOwnField(request,'provenance','Visita'),
    };
    if(visit.pathology!=='pso')reject('Patología debe consignarse expresamente: pso');
    if(visit.provenance!=='synthetic-manual-entry')
      reject('Procedencia demo explícita obligatoria: synthetic-manual-entry');
    const answers=readAnswers(readOwnField(request,'answers','Visita'));
    const content=JSON.stringify({format:FORMAT,visit,answers});
    return Object.freeze({
      ok:true,
      status:'synthetic_probe_prepared',
      evidence:Object.freeze({kind:'synthetic_local_validation',external:null}),
      artifact:Object.freeze({format:FORMAT,content}),
    });
  }catch(error){
    return failure(rejectionMessage(error));
  }
}
