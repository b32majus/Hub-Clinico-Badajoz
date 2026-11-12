// F3a / PsO: PROTOTIPO de identidad y aislamiento de borradores de DEMOSTRACIÓN.
// No está conectado a la UI ni a almacenamiento. NO es un registro clínico, una historia,
// ni un contrato homologado. Sin backend, fecha automática, identidad/autoría real o precarga.
import {PSO_VALME_FIELDS} from './pso_valme_fields.js';

const editableFields=new Set(PSO_VALME_FIELDS.filter(f=>
  !['contexto','derivado','derivado-presentacion','cuestionario'].includes(f.kind)
).map(f=>f.key));

function requireDemoId(value,re,label){
  if(typeof value!=='string'||!re.test(value))throw new TypeError(label+': solo ID sintético explícito');
  return value;
}
function requireClinicalDate(date){
  if(date===null)return null;
  if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))
    throw new TypeError('Fecha clínica: usar AAAA-MM-DD explícito o null, nunca hoy implícito');
  const [year,month,day]=date.split('-').map(Number);
  if(year<1900||year>2100)throw new RangeError('Fecha clínica fuera de rango demostrativo');
  const test=new Date(Date.UTC(year,month-1,day));
  if(test.getUTCFullYear()!==year||test.getUTCMonth()!==month-1||test.getUTCDate()!==day)
    throw new RangeError('Fecha clínica imposible');
  return date;
}
const outputDraft=d=>Object.freeze({
  visitId:d.visitId,siteId:d.siteId,patientCip:d.patientCip,
  visitType:d.visitType,pathology:d.pathology,clinicalDate:d.clinicalDate,
  provenance:d.provenance,recordState:'demo_draft_only',actorId:null,
  revision:d.revision,answers:Object.freeze({...d.answers}),
});
const metadata=d=>Object.freeze({
  visitId:d.visitId,siteId:d.siteId,patientCip:d.patientCip,
  visitType:d.visitType,pathology:d.pathology,clinicalDate:d.clinicalDate,
  provenance:d.provenance,recordState:'demo_draft_only',actorId:null,
  revision:d.revision,
});
function assertRevision(d,expected){
  if(!Number.isSafeInteger(expected)||expected<0||d.revision!==expected)
    throw new Error('Conflicto de revisión: actualizar tras releer el borrador');
}

export function createPsoDemoVisitDraftRegistry(){
  const byId=new Map(); // privado: únicamente durante la vida de este módulo/instancia
  function required(id){
    const d=byId.get(id);
    if(!d)throw new Error('Borrador no encontrado; nunca inventar una visita previa');
    return d;
  }
  return Object.freeze({
    createDraft(input){
      if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Solicitud de borrador explícita obligatoria');
      const keys=Object.keys(input);
      const allowed=['visitId','siteId','patientCip','visitType','pathology','clinicalDate','provenance'];
      if(keys.some(k=>!allowed.includes(k)))throw new Error('No se admite adjuntar historia, respuestas o autoría implícitas');
      const visitId=requireDemoId(input.visitId,/^DEMO-VISIT-[A-Z0-9-]{3,32}$/,'ID de borrador');
      const siteId=requireDemoId(input.siteId,/^DEMO-SITE-[A-Z0-9-]{2,32}$/,'Site');
      const patientCip=requireDemoId(input.patientCip,/^DEMO-[A-Z0-9-]{3,24}$/,'CIP');
      if(!['primera','seguimiento'].includes(input.visitType))throw new Error('Tipo de visita debe seleccionarse expresamente');
      if(input.pathology!=='pso')throw new Error('Patología de la visita debe seleccionarse expresamente: pso');
      if(input.provenance!=='synthetic-manual-entry')throw new Error('Sin procedencia demo explícita no se atribuye visita');
      if(!Object.hasOwn(input,'clinicalDate'))throw new Error('La fecha debe constar expresamente, incluso si es null');
      const clinicalDate=requireClinicalDate(input.clinicalDate);
      if(byId.has(visitId))throw new Error('ID de borrador duplicado; no sobrescribir otra visita');
      const record={visitId,siteId,patientCip,visitType:input.visitType,pathology:'pso',
        clinicalDate,provenance:input.provenance,revision:0,answers:Object.create(null)};
      byId.set(visitId,record);
      return outputDraft(record);
    },
    readDraft(visitId){
      return outputDraft(required(visitId));
    },
    setAnswers(visitId,patch,{expectedRevision}={}){
      const d=required(visitId);
      assertRevision(d,expectedRevision);
      if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length===0)
        throw new TypeError('Se exige edición de respuestas explícita');
      const next=Object.assign(Object.create(null),d.answers);
      for(const [key,value] of Object.entries(patch)){
        if(!editableFields.has(key))throw new Error('Campo no editable/aprobado en el inventario de demostración: '+key);
        if((d.visitType==='primera'&&(key.startsWith('seguimiento_')||key.startsWith('tx_seguimiento_')))||
          (d.visitType==='seguimiento'&&key.startsWith('tx_primera_')))
          throw new Error('Campo de otro circuito: no trasladar tratamiento ni decisiones entre visitas');
        if(value!==null&&typeof value!=='string')throw new TypeError('Respuesta demo debe ser texto explícito o null para borrar');
        if(value===null||value==='')delete next[key];
        else next[key]=value;
      }
      const updated={...d,revision:d.revision+1,answers:next};
      byId.set(visitId,updated);
      return outputDraft(updated);
    },
    setClinicalDate(visitId,date,{expectedRevision}={}){
      const d=required(visitId);
      assertRevision(d,expectedRevision);
      const clinicalDate=requireClinicalDate(date);
      const updated={...d,revision:d.revision+1,clinicalDate};
      byId.set(visitId,updated);
      return outputDraft(updated);
    },
    listDraftMetadata({siteId,patientCip,pathology}={}){
      requireDemoId(siteId,/^DEMO-SITE-[A-Z0-9-]{2,32}$/,'Site');
      requireDemoId(patientCip,/^DEMO-[A-Z0-9-]{3,24}$/,'CIP');
      if(pathology!=='pso')throw new Error('Patología explícita obligatoria');
      // Solo metadatos de borradores en esta sesión; NO historial clínico.
      return Object.freeze([...byId.values()]
        .filter(d=>d.siteId===siteId&&d.patientCip===patientCip&&d.pathology===pathology)
        .map(metadata));
    },
    earlierDatedDraftMetadata({currentVisitId,asOfDate}={}){
      const current=required(currentVisitId);
      const asOf=requireClinicalDate(asOfDate);
      if(!asOf)throw new Error('Fecha de referencia explícita obligatoria; no usar hoy automáticamente');
      if(!current.clinicalDate||current.clinicalDate>asOf)return Object.freeze([]);
      // Metadatos únicamente: no equivalen a hechos clínicos ni son fuente de precarga.
      return Object.freeze([...byId.values()]
        .filter(d=>d.visitId!==current.visitId&&d.siteId===current.siteId&&
          d.patientCip===current.patientCip&&d.pathology===current.pathology&&
          d.clinicalDate&&d.clinicalDate<current.clinicalDate&&d.clinicalDate<=asOf)
        .sort((a,b)=>b.clinicalDate.localeCompare(a.clinicalDate)||a.visitId.localeCompare(b.visitId))
        .map(metadata));
    },
  });
}
