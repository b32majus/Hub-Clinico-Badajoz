import { PSO_VALME_FIELDS } from './pso_valme_fields.js';

// Prototipo sintético: cada respuesta vive SOLO en memoria del navegador.
// La definición clínica y la persistencia pertenecen a contratos Nexus pendientes.
const sections = [
  ['01 Datos de consulta', 'Datos de la consulta'],
  ['02 Historia de PsO', 'Historia de psoriasis'],
  ['03 Comorbilidades', 'Comorbilidades'],
  ['04 Localizaciones', 'Localizaciones y zonas especiales'],
  ['05 Exploración/PASI', 'Exploración clínica y PASI'],
  ['06 Síntomas', 'Síntomas e impacto'],
  ['07 DLQI', 'DLQI · cuestionario'],
  ['08 PURE-4', 'PURE-4 · cribado'],
  ['09 Derivaciones/plan', 'Derivaciones'],
  ['10 Tratamiento primera visita', 'Tratamiento documentado · Primera Visita'],
  ['11 Tratamiento seguimiento', 'Tratamiento documentado · Seguimiento'],
  ['12 Seguimiento terapéutico', 'Seguimiento terapéutico'],
  ['13 Plan', 'Plan y observaciones'],
];
// F2: grupos de la visita actual, sin repetir historia inicial ni autorrellenar desde Primera.
const followupSections=[
  '01 Datos de consulta','11 Tratamiento seguimiento','06 Síntomas',
  '04 Localizaciones','05 Exploración/PASI','07 DLQI',
  '12 Seguimiento terapéutico','03 Comorbilidades','08 PURE-4',
  '09 Derivaciones/plan','13 Plan',
];
const followupTitles={
  '01 Datos de consulta':'Contexto de esta visita',
  '03 Comorbilidades':'Revisión opcional de comorbilidades',
  '04 Localizaciones':'Localizaciones actuales',
  '05 Exploración/PASI':'Actividad actual · BSA, PGA y PASI',
  '06 Síntomas':'Síntomas actuales e impacto',
  '07 DLQI':'DLQI · cuestionario candidato de esta visita',
  '08 PURE-4':'PURE-4 · pendiente de autorización',
  '09 Derivaciones/plan':'Derivaciones documentadas en esta visita',
  '11 Tratamiento seguimiento':'Tratamiento referido o propuesto en esta visita',
  '12 Seguimiento terapéutico':'Adherencia, tolerabilidad y decisión expresa',
  '13 Plan':'Plan y próxima revisión prevista',
};
// Sugerencias históricas DONANTE Valme, no categorías del catálogo común.
const therapyGroups=[
  {key:'topicos',name:'Tópicos',options:['Corticoides Tópicos','Calcipotriol/Betametasona','Tacrolimus Tópico']},
  {key:'sinteticos_convencionales',name:'Sistémicos convencionales',options:['Metotrexato','Ciclosporina','Acitretina','Apremilast']},
  {key:'biologicos',name:'Biológicos',options:['Adalimumab','Secukinumab','Ixekizumab','Guselkumab','Risankizumab','Ustekinumab']},
  {key:'fototerapia',name:'Fototerapia',options:['UVB Banda Estrecha','PUVA','Excimer']},
];
// Datos candidatos de ítems DLQI desde Valme. Divergencia FH q9; no se calculan puntuaciones.
const dlqiCandidate=[
  "Durante los últimos 7 días, ¿ha sentido picor, dolor o escozor en la piel?",
  "Durante los últimos 7 días, ¿se ha sentido incómodo/a o cohibido/a debido a sus problemas de piel?",
  "Durante los últimos 7 días, ¿le han molestado sus problemas de piel para hacer la compra u ocuparse de la casa (o del jardín)?",
  "Durante los últimos 7 días, ¿han influido sus problemas de piel en la elección de la ropa que lleva?",
  "Durante los últimos 7 días, ¿han influido sus problemas de piel en cualquier actividad social o recreativa?",
  "Durante los últimos 7 días, ¿ha tenido dificultades para hacer deporte debido a sus problemas de piel?",
  "Durante los últimos 7 días, ¿sus problemas de piel le han impedido totalmente trabajar o estudiar?",
  "Durante los últimos 7 días, ¿han causado sus problemas de piel dificultades con su pareja o sus amigos y familiares?",
  "Durante los últimos 7 días, ¿han causado sus problemas de piel dificultades sexuales?",
  "Durante los últimos 7 días, ¿le ha causado problemas el tratamiento de la piel, por ejemplo ensuciándole la casa o quitándole tiempo?"
];
const course=['Brotes','Persistente','Progresiva','Intermitente'];
const phenotypes=['Placas','Guttata','Inversa','Pustulosa','Eritrodérmica','Palmoplantar','Cuero cabelludo predominante','Ungueal predominante','Otro'];
const priorTherapies=['Tópico','Fototerapia','Sistémico convencional','Biológico','Otros'];
const origin=['Atención Primaria','Dermatología general','Multidisciplinar Derma–Reuma'];
const adherences=['Buena','Regular','Mala'];
const intensity=['No','Leve','Moderada','Intensa'];
const current={patient:'',pathology:'',visit:'primera',view:'home'};
const pathologyByVisit=new Map();
const DEMO_PATIENTS=new Map([
  ['DEMO-PSO-001',{name:'Paciente sintético A',sex:''}],
  ['DEMO-PSO-002',{name:'Paciente sintético B',sex:''}],
]);
let selectedFollowupFamily=''; // filtro de visualización; no declara tratamiento
const drafts=new Map();
const slots=new Map();
const byKey=new Map(PSO_VALME_FIELDS.map(f=>[f.key,f]));
window.__dermaPrototypeFieldKeys=PSO_VALME_FIELDS.map(f=>f.key); // Read-only QA witness, never clinical data.
const $=q=>document.querySelector(q);
const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function activeScope(){return current.patient+'|'+current.visit+'|'+current.pathology}
function answers(){
  const key=activeScope();
  if(!drafts.has(key))drafts.set(key,Object.create(null));
  return drafts.get(key);
}
function valueFor(key){return Object.hasOwn(answers(),key)?answers()[key]:''}
function setField(key,value){answers()[key]=value;updateStatus()}
function filledCount(){return Object.values(answers()).filter(isConsigned).length}
function isConsigned(value){
  return value!==null&&value!==undefined&&
    (typeof value!=='string'||value.trim().length>0);
}
function updateStatus(){
  $('#draftScope').textContent=(current.patient||'Sin paciente')+' · '+(current.visit==='primera'?'Primera Visita':'Seguimiento');
  $('#draftStatus').textContent=filledCount()+' respuestas de borrador · sin guardar';
}
function optionHtml(options,selected,emptyLabel='Sin consignar'){
  return '<option value="">'+escapeText(emptyLabel)+'</option>'+options.map(o=>{
    const v=typeof o==='string'?o:o.value,txt=typeof o==='string'?o:o.text;
    return '<option value="'+escapeText(v)+'"'+(v===selected?' selected':'')+'>'+escapeText(txt)+'</option>';
  }).join('');
}
function fieldHtml(f){
  const key=f.key;
  const val=valueFor(key);
  const attr='data-field="'+escapeText(key)+'"';
  if(f.kind==='derivado')return '<div class="derived wide"><strong>'+escapeText(f.label)+'</strong><span'+(key==='pasi'?' id="pasiStatus"':'')+'>Sin cálculo clínico · no homologado</span></div>';
  if(f.kind==='derivado-presentacion'||key==='nusha'||key==='tipo_visita')return '';
  if(key==='tratamiento_previo_consulta')return '<div class="field-block"><label>'+escapeText(f.label)+'<input readonly value="" placeholder="Sin fuente clínica conectada"></label><p class="help">No se infiere tratamiento previo desde otra visita.</p></div>';
  if(f.kind==='triestado')return '';
  if(f.kind==='tratamiento-explicito')return '';
  if(key.startsWith('pasi_')){
    const max=key.endsWith('_area')?6:4;
    return '<label class="field-block">'+escapeText(f.label)+'<select '+attr+'>'+optionHtml(Array.from({length:max+1},(_,i)=>String(i)),val)+'</select></label>';
  }
  if(f.kind==='cuestionario'){
    const options=key.startsWith('dlqi_')?['0','1','2','3']:['Sí','No'];
    return '<label class="field-block">'+escapeText(f.label)+'<select '+attr+'>'+optionHtml(options,val,'Sin responder')+'</select></label>';
  }
  const selectOptions={
    procedencia:origin,
    curso_evolutivo:course,
    fenotipo:phenotypes,
    tipo_tratamiento_previo:priorTherapies,
    seguimiento_adherencia_categoria:adherences,
    alteracion_funcional:intensity,
    alteracion_sueno:intensity,
    pga:['0','1','2','3','4','5'],
    eva_prurito:Array.from({length:10},(_,i)=>String(i+1)),
    eva_dolor:Array.from({length:10},(_,i)=>String(i+1)),
  };
  if(selectOptions[key])return '<label class="field-block">'+escapeText(f.label)+'<select '+attr+'>'+optionHtml(selectOptions[key],val)+'</select></label>';
  const isDate=['fecha_visita','fecha_inicio_psoriasis','fecha_diagnostico_psoriasis'].includes(key);
  const isNumeric=key==='bsa';
  const isLong=f.kind==='texto'||/observaciones|impresion|objetivo|comentarios|motivo_suspension|respuesta_previa|ajuste_terapeutico|motivo_cambio/.test(key);
  if(isLong)return '<label class="field-block wide">'+escapeText(f.label)+'<textarea '+attr+' placeholder="Registrar explícitamente…">'+escapeText(val)+'</textarea></label>';
  return '<label class="field-block">'+escapeText(f.label)+'<input '+attr+' type="'+(isDate?'date':isNumeric?'number':'text')+'"'+(isNumeric?' min="0" max="100" step="0.1"':'')+' value="'+escapeText(val)+'"></label>';
}
function dlqiQuestionnaire(){
  const full=['Mucho','Bastante','Un poco','Nada'];
  const noRelation=[...full,'Sin relación'];
  const result=dlqiCandidate.map((question,i)=>{
    const k='dlqi_q'+(i+1);
    const label='<div class="dlqi-candidate__question">'+(i+1)+'. '+escapeText(question)+'</div>';
    if(i===6){
      const main=valueFor('extra_dlqi_q7_main');
      const detail=valueFor('extra_dlqi_q7_detail');
      return '<div class="dlqi-candidate__item" data-question="dlqi_q7">'+label+
       '<label>¿Le han impedido totalmente trabajar o estudiar?<select data-field="extra_dlqi_q7_main" data-dlqi-special="main">'+
       optionHtml(['Sí','No','Sin relación'],main,'Sin responder')+'</select></label>'+
       (main==='No'?'<label>Si no se lo impidieron: ¿cuánto dificultaron su trabajo o estudios?<select data-field="extra_dlqi_q7_detail" data-dlqi-special="detail">'+
       optionHtml(['Bastante','Un poco','Nada'],detail,'Sin responder')+'</select></label>':'')+
       '</div>';
    }
    const selections=(i===0||i===1)?full:noRelation;
    const entries=selections.map((x,index)=>({value:x==='Sin relación'?'NR':String(3-index),text:x}));
    return '<div class="dlqi-candidate__item" data-question="'+k+'">'+label+
      '<label>Respuesta<select data-field="'+k+'">'+optionHtml(entries,valueFor(k),'Sin responder')+'</select></label></div>';
  }).join('');
  return '<div class="dlqi-candidate"><p class="warning-inline">Borrador basado en Valme para revisión de Dermatología. Texto, versión y licencia pendientes de confirmar. El cuestionario puede cumplimentarse, pero NO genera un total clínico validado.</p>'+
    '<div class="dlqi-candidate__list">'+result+'</div><div class="derived"><strong>DLQI total</strong><span>Sin cálculo clínico · no homologado</span></div></div>';
}
function updateDlqiSpecial(){
  const main=valueFor('extra_dlqi_q7_main');
  const detail=valueFor('extra_dlqi_q7_detail');
  if(main!=='No'&&detail)delete answers()['extra_dlqi_q7_detail'];
  const result=main==='No'?(detail?'No|'+detail:''):main;
  setField('dlqi_q7',result);
}
function triStateHtml(fields){
  if(!fields.length)return '';
  let html='<p class="note">Sin seleccionar = no consignado. Marcar una condición no declara que las demás estén ausentes.</p><div class="chips" role="group" aria-label="Presencias expresamente seleccionadas">';
  for(const f of fields){
    const val=valueFor(f.key);
    html+='<button type="button" class="chip" data-chip="'+escapeText(f.key)+'" data-status="'+(val==='0'?'absent':'unknown')+'" aria-pressed="'+(val==='1'?'true':'false')+'" title="'+(val==='0'?'No presente declarado':'Seleccionar presencia')+'">'+escapeText(f.label)+'</button>';
  }
  html+='</div><div class="review-row"><button type="button" class="review-button" data-review="'+escapeText(fields[0].section)+'">Registrar explícitamente como ausentes las no marcadas</button><span class="tag">Revisión consciente del grupo</span></div>';
  return html;
}
// Campos clínicos candidatos no presentes en los 174 HEADERS de Valme.
// La presencia de un chip no equivale a fumador/bebedor actual; situación vacía inicialmente.
const habitControls={
  tabaco:{
    keys:['desenc_tabaco','comorb_tabaquismo'],
    label:'Consumo de tabaco',
    status:'extra_tabaco_situacion',
    quantity:'extra_tabaco_cigarrillos_dia',
    former:'extra_tabaco_anos_abandono',
  },
  alcohol:{
    keys:['desenc_alcohol','comorb_alcohol'],
    label:'Consumo de alcohol',
    status:'extra_alcohol_situacion',
    quantity:'extra_alcohol_bebidas_semana',
  },
};
function habitDetails(section){
  const related=Object.entries(habitControls).filter(([,c])=>c.keys.some(k=>
    PSO_VALME_FIELDS.some(f=>f.key===k&&f.section===section)&&valueFor(k)==='1'));
  if(!related.length)return '';
  return '<div class="habit-detail-group">'+related.map(([name,c])=>{
    const status=valueFor(c.status);
    const choices=optionHtml(name==='tabaco'?['Fumador actual','Exfumador']:['Consumo actual','Consumo anterior'],status);
    let html='<div class="habit-detail"><h4>'+escapeText(c.label)+' · Datos ampliados</h4>'+
      '<p class="help">Información registrada únicamente si el profesional la consigna. No se calcula exposición ni riesgo.</p>'+
      '<label>Situación declarada<select data-field="'+c.status+'" data-habit-status="'+name+'">'+choices+'</select></label>';
    if(status==='Fumador actual'||status==='Consumo actual'){
      html+='<label>'+ (name==='tabaco'?'Cigarrillos por día':'Bebidas por semana')+
        '<input type="number" min="0" max="10000" step="1" data-field="'+c.quantity+'" value="'+escapeText(valueFor(c.quantity))+'" placeholder="Sin consignar"></label>';
    }else if(status==='Exfumador'&&c.former){
      html+='<label>Años desde abandono<input type="number" min="0" max="120" step="0.5" data-field="'+c.former+'" value="'+escapeText(valueFor(c.former))+'" placeholder="Sin consignar"></label>';
    }
    return html+'</div>';
  }).join('')+'</div>';
}
function clearHabitIfUnmarked(chipKey){
  const entry=Object.entries(habitControls).find(([,c])=>c.keys.includes(chipKey));
  if(!entry)return true;
  const [,c]=entry;
  if(c.keys.some(key=>key!==chipKey&&valueFor(key)==='1'))return true;
  const keys=[c.status,c.quantity,c.former].filter(Boolean);
  if(!keys.some(k=>isConsigned(valueFor(k))))return true;
  if(!window.confirm('Al desmarcar este consumo se eliminarán los detalles adicionales de este borrador. ¿Confirmar?'))return false;
  for(const key of keys)delete answers()[key];
  return true;
}
function zoneSummary(){
  const zones=PSO_VALME_FIELDS.filter(f=>f.kind==='derivado-presentacion');
  const selected=zones.filter(f=>valueFor('loc_'+f.key.replace(/^zona_esp_/,''))==='1');
  return '<p class="note">Zonas especiales: reflejo de localizaciones marcadas por el profesional, no un diagnóstico independiente.</p><div class="chips" aria-label="Zonas especiales">'+(selected.length?selected.map(z=>'<span class="tag">'+escapeText(z.label)+'</span>').join(''):'<span class="tag">No se han marcado zonas especiales</span>')+'</div>';
}
function therapyHtml(visit){
  const prefix=visit==='primera'?'tx_primera':'tx_seguimiento';
  return '<p class="warning-inline">Sugerencias iniciales del formulario Valme, NO el catálogo unificado de Farmacia/Reuma. Seleccionar solo el nombre no rellena dosis, vía, pauta ni valida tratamientos. No hay órdenes clínicas.</p>'+
  '<p class="note">Para cada línea, introduce expresamente dosis, vía y pauta documentadas. Están vacías por defecto. El buscador común requiere clasificaciones aprobadas para Dermatología.</p>'+
  therapyGroups.map(group=>{
    const slotKey=activeScope()+'|'+group.key;
    const count=slots.get(slotKey)||1;
    const rows=Array.from({length:count},(_,idx)=>{
      const i=idx+1,drugKey=prefix+'_'+group.key+'_farmaco_'+i,posKey=prefix+'_'+group.key+'_posologia_'+i;
      const doseKey='extra_'+prefix+'_'+group.key+'_dosis_'+i;
      const routeKey='extra_'+prefix+'_'+group.key+'_via_'+i;
      const listId=prefix+'-'+group.key+'-'+i+'-sugerencias';
      const options=group.options.map(v=>'<option value="'+escapeText(v)+'"></option>').join('');
      return '<div class="therapy-line">'+
        '<label>'+(group.key==='fototerapia'?'Modalidad':'Fármaco')+' '+i+' (sugerencias Valme)<input type="search" list="'+listId+'" data-field="'+drugKey+'" value="'+escapeText(valueFor(drugKey))+'" autocomplete="off" placeholder="Escribir o elegir…"></label>'+
        '<datalist id="'+listId+'">'+options+'</datalist>'+
        '<label>Dosis (explícita)<input type="text" data-field="'+doseKey+'" value="'+escapeText(valueFor(doseKey))+'" autocomplete="off" placeholder="Sin consignar"></label>'+
        '<label>Vía (explícita)<input type="text" data-field="'+routeKey+'" value="'+escapeText(valueFor(routeKey))+'" autocomplete="off" placeholder="Sin consignar"></label>'+
        '<label>Pauta (explícita)<input type="text" data-field="'+posKey+'" value="'+escapeText(valueFor(posKey))+'" autocomplete="off" placeholder="Sin consignar"></label>'+
        '</div>';
    }).join('');
    const otherKey=prefix+'_'+group.key+'_otros';
    return '<div class="therapy-group"><h3>'+escapeText(group.name)+'</h3>'+rows+
    (count<3?'<button class="more-row" type="button" data-more="'+group.key+'">+ Añadir línea</button>':'')+
    '<label style="margin-top:12px">Otros / comentario explícito<input data-field="'+otherKey+'" type="text" value="'+escapeText(valueFor(otherKey))+'" placeholder="Opcional"></label></div>';
  }).join('');
}

// Únicamente Seguimiento F2: composición de la consulta real sin lectura clínica.
// Reusa las mismas claves fuente de Valme; extras de UX no pertenecen al esquema aprobado.
function followupChoiceHtml(key,options,label){
  const selected=valueFor(key);
  const chips=options.map(o=>{
    const v=typeof o==='string'?o:o.value;
    const title=typeof o==='string'?o:o.label;
    const chosen=selected===v;
    return '<button type="button" class="chip followup-choice" data-choice-field="'+escapeText(key)+
      '" data-choice-value="'+escapeText(v)+'" aria-pressed="'+String(chosen)+'">'+escapeText(title)+'</button>';
  }).join('');
  return '<div class="followup-choice-group" role="group" aria-label="'+escapeText(label)+'">'+
    '<strong class="followup-choice-label">'+escapeText(label)+'</strong>'+
    '<p class="help">Sin selección = sin consignar; pulsa para registrar o retirar una declaración.</p>'+
    '<div class="chips">'+chips+'</div></div>';
}
function followupConsultationHtml(fields){
  const visible=fields.filter(f=>['fecha_visita','procedencia'].includes(f.key));
  return '<p class="followup-intro">Datos de la visita que se está documentando. No se recuperan episodios previos.</p>'+
    '<div class="fields">'+visible.map(fieldHtml).join('')+'</div>'+
    '<div class="followup-source-note"><strong>Tratamiento anterior: fuente no disponible</strong>'+
    '<p>Sin historia clínica conectada. No se presupone que el paciente no tenga tratamiento. Puedes registrar abajo lo referido o propuesto expresamente en esta visita, sin convertirlo en prescripción ni validación.</p>'+
    '<p id="followupTherapyPreview" class="followup-preview">Todavía no hay líneas terapéuticas registradas en este borrador.</p></div>';
}
function followupTherapyPreviewText(){
  const rows=[];
  for(const group of therapyGroups){
    for(let i=1;i<=3;i++){
      const drug=valueFor('tx_seguimiento_'+group.key+'_farmaco_'+i);
      if(!isConsigned(drug))continue;
      const rel=valueFor('extra_tx_seguimiento_'+group.key+'_relacion_'+i);
      const state={
        actual_referido:'actual referido',
        anterior_referido:'previo referido',
        propuesto_no_validado:'propuesto, no solicitado/validado',
      }[rel]||'relación sin consignar';
      rows.push(drug+' ('+state+')');
    }
  }
  return rows.length?'Solo datos de ESTE borrador, no historia: '+rows.join(' · '):
    'Todavía no hay líneas terapéuticas registradas en este borrador.';
}
function updateFollowupTherapyPreview(){
  const el=$('#followupTherapyPreview');
  if(el)el.textContent=followupTherapyPreviewText();
}
function followupTherapyHtml(){
  const active=therapyGroups.find(g=>g.key===selectedFollowupFamily);
  const familyButtons=therapyGroups.map(g=>'<button type="button" class="chip followup-family-chip" data-followup-family="'+
    escapeText(g.key)+'" aria-pressed="'+String(selectedFollowupFamily===g.key)+'">'+escapeText(g.name)+'</button>').join('');
  let rows='';
  if(active){
    const count=slots.get(activeScope()+'|'+active.key)||1;
    rows=Array.from({length:count},(_,index)=>{
      const i=index+1;
      const drugKey='tx_seguimiento_'+active.key+'_farmaco_'+i;
      const doseKey='extra_tx_seguimiento_'+active.key+'_dosis_'+i;
      const routeKey='extra_tx_seguimiento_'+active.key+'_via_'+i;
      const pautaKey='tx_seguimiento_'+active.key+'_posologia_'+i;
      const relationKey='extra_tx_seguimiento_'+active.key+'_relacion_'+i;
      const options=active.options.map(v=>'<option value="'+escapeText(v)+'"></option>').join('');
      const listId='f2-'+active.key+'-'+i;
      return '<div class="followup-therapy-line"><div class="followup-therapy-grid">'+
        '<label>'+(active.key==='fototerapia'?'Modalidad':'Fármaco')+' '+i+' (referencia Valme)<input type="search" list="'+listId+
        '" autocomplete="off" data-field="'+drugKey+'" value="'+escapeText(valueFor(drugKey))+'" placeholder="No consignado"></label>'+
        '<datalist id="'+listId+'">'+options+'</datalist>'+
        '<label>Dosis (solo si está documentada)<input type="text" data-field="'+doseKey+'" value="'+escapeText(valueFor(doseKey))+'" placeholder="Vacío"></label>'+
        '<label>Vía (solo si está documentada)<input type="text" data-field="'+routeKey+'" value="'+escapeText(valueFor(routeKey))+'" placeholder="Vacío"></label>'+
        '<label>Pauta (solo si está documentada)<input type="text" data-field="'+pautaKey+'" value="'+escapeText(valueFor(pautaKey))+'" placeholder="Vacío"></label>'+
        '</div>'+
        followupChoiceHtml(relationKey,[
          {value:'actual_referido',label:'Actual, referido'},
          {value:'anterior_referido',label:'Previo, referido'},
          {value:'propuesto_no_validado',label:'Propuesto, no validado'},
        ],'Relación de la línea con esta visita (declaración explícita)')+
        '</div>';
    }).join('');
    const otherKey='tx_seguimiento_'+active.key+'_otros';
    rows='<div class="followup-therapy-selected"><h3>'+escapeText(active.name)+'</h3>'+rows+
      (count<3?'<button class="more-row" type="button" data-more="'+escapeText(active.key)+'">+ Añadir línea de esta familia</button>':'')+
      '<label class="followup-other-field">Otros / comentario explícito<input type="text" data-field="'+otherKey+'" value="'+escapeText(valueFor(otherKey))+'" placeholder="Opcional"></label></div>';
  }else{
    rows='<p class="followup-no-selection">Elige una familia para documentar alguna línea. Ninguna familia está seleccionada por defecto y la selección no crea un tratamiento.</p>';
  }
  return '<p class="followup-intro">Solo tratamientos o propuestas que consignes expresamente en ESTA visita; no se importa tratamiento anterior ni se presupone continuidad.</p>'+
    '<div class="chips followup-family-row" role="group" aria-label="Familia terapéutica para introducir">'+familyButtons+'</div>'+rows+
    '<p class="warning-inline">Sugerencias de nombres de Valme (NO buscador farmacológico unificado). La selección de un nombre nunca escribe dosis, vía, pauta, continuidad, cambio ni validación de Farmacia.</p>';
}
function followupSymptomsHtml(fields){
  const chips=fields.filter(f=>f.kind==='triestado');
  const base=fields.filter(f=>['eva_prurito','eva_dolor'].includes(f.key));
  return '<p class="followup-intro">Síntomas manifestados en esta consulta. Los chips registran presencia; los no marcados permanecen desconocidos.</p>'+
    triStateHtml(chips)+
    '<div class="fields followup-symptoms-fields">'+base.map(fieldHtml).join('')+'</div>'+
    '<div class="followup-intensity-grid">'+
    followupChoiceHtml('alteracion_funcional',intensity,'Alteración funcional declarada')+
    followupChoiceHtml('alteracion_sueno',intensity,'Alteración del sueño declarada')+
    '</div>';
}
function followupLocationsHtml(fields){
  return '<p class="followup-intro">Localizaciones observadas o declaradas EN ESTA visita. No son un cambio respecto de la visita previa sin comparación validada.</p>'+
    triStateHtml(fields.filter(f=>f.kind==='triestado'))+
    '<div id="zoneSummary">'+zoneSummary()+'</div>';
}
function followupPasiHtml(fields){
  const regions=[
    ['cabeza','Cabeza'],['tronco','Tronco'],['brazos','Brazos'],['piernas','Piernas']
  ];
  const html=regions.map(([key,title])=>{
    const metrics=['eritema','induracion','escamas','area'];
    const controls=metrics.map(metric=>{
      const f=fields.find(x=>x.key==='pasi_'+key+'_'+metric);
      if(!f)return '';
      const label={eritema:'Eritema',induracion:'Induración',escamas:'Descamación',area:'Extensión'}[metric];
      const choices=Array.from({length:(metric==='area'?7:5)},(_,i)=>String(i));
      return '<label>'+label+'<select data-field="'+escapeText(f.key)+'">'+
        optionHtml(choices,valueFor(f.key))+'</select></label>';
    }).join('');
    return '<div class="followup-pasi-region"><h4>'+escapeText(title)+'</h4><div class="followup-pasi-region-grid">'+controls+'</div></div>';
  }).join('');
  const notes=fields.find(f=>f.key==='observaciones_clinicas');
  const nails=fields.filter(f=>f.kind==='triestado');
  return '<p class="followup-intro">Valoración de actividad actual. Consigna solo las medidas examinadas; cero es un valor válido, vacío es pendiente.</p>'+
    '<div class="followup-activity-top">'+
    '<label>BSA (%)<input data-field="bsa" type="number" min="0" max="100" step="0.1" value="'+escapeText(valueFor('bsa'))+'" placeholder="Sin consignar"></label>'+
    '<label>PGA (0–5)<select data-field="pga">'+optionHtml(['0','1','2','3','4','5'],valueFor('pga'))+'</select></label></div>'+
    '<div class="derived followup-score"><strong>PASI · total</strong><span id="pasiStatus">Sin cálculo clínico · no homologado</span></div>'+
    '<p class="help">Componentes de PASI agrupados por región corporal; no se aplica fórmula ni se interpreta el resultado.</p>'+
    '<div class="followup-pasi-regions">'+html+'</div>'+
    triStateHtml(nails)+
    '<div class="fields">'+(notes?fieldHtml(notes):'')+'</div>';
}
function followupUnavailableInstrument(title){
  return '<div class="followup-instrument-blocked" role="note"><strong>'+escapeText(title)+' no habilitado</strong>'+
    '<p>Los ítems disponibles son marcadores de posición sin enunciado válido. No se puede responder ni obtener puntuación mientras no se aprueben texto, versión, derechos de uso y reglas del instrumento.</p>'+
    '<span class="tag">Pendiente de homologación clínica</span></div>';
}
function followupDecisionHtml(){
  const adverse=valueFor('seguimiento_efectos_adversos');
  const decision=valueFor('extra_seg_decision_tipo');
  const adherence=followupChoiceHtml('seguimiento_adherencia_categoria',adherences,'Adherencia descrita en esta visita');
  const effects=followupChoiceHtml('seguimiento_efectos_adversos',[
    {value:'1',label:'Sí, referidos'},
    {value:'0',label:'No referidos, declarado'},
  ],'Efectos adversos referidos en esta visita');
  const details=adverse==='1'?'<label class="followup-conditional-field">Descripción de los efectos referidos<textarea data-field="extra_seg_efectos_adversos_detalle" placeholder="Solo lo declarado">'+escapeText(valueFor('extra_seg_efectos_adversos_detalle'))+'</textarea></label>':'';
  const decisionChips=followupChoiceHtml('extra_seg_decision_tipo',[
    {value:'continuidad_explicita',label:'Continuidad declarada'},
    {value:'ajuste_declarado',label:'Ajuste documentado'},
    {value:'cambio_propuesto',label:'Cambio propuesto'},
    {value:'suspension_documentada',label:'Suspensión documentada'},
  ],'Decisión registrada expresamente en la visita');
  const followupText=decision?'<div class="followup-conditional-fields">'+
    '<label>Detalle de la decisión o ajuste<textarea data-field="seguimiento_ajuste_terapeutico" placeholder="No deducir pauta ni acción clínica">'+escapeText(valueFor('seguimiento_ajuste_terapeutico'))+'</textarea></label>'+
    (decision==='cambio_propuesto'||decision==='suspension_documentada'?
      '<label>Motivo documentado<textarea data-field="seguimiento_motivo_cambio" placeholder="Solo causa expresamente referida">'+escapeText(valueFor('seguimiento_motivo_cambio'))+'</textarea></label>':'')+
    '</div>':'';
  return '<p class="followup-intro">Revisión terapéutica exclusivamente a partir de lo expresado o evaluado EN ESTA VISITA. Ningún estado se deduce de medicación o cuestionarios.</p>'+
    '<div class="followup-review-grid"><div class="followup-review-panel">'+adherence+'</div>'+
    '<div class="followup-review-panel">'+effects+details+'</div></div>'+
    '<div class="followup-review-panel followup-decision-panel">'+decisionChips+followupText+'</div>'+
    '<p class="warning-inline">Una decisión propuesta no es una solicitud a Farmacia ni un tratamiento validado. Morisky no se muestra como cuestionario respondible: sus ítems aún no están homologados.</p>'+
    followupUnavailableInstrument('Morisky-Green');
}
function followupPlanHtml(fields){
  const other=fields.filter(f=>f.key!=='proxima_revision');
  const textKey='proxima_revision';
  return '<p class="followup-intro">Plan consignado explícitamente. Fecha prevista no equivale a cita programada.</p>'+
    '<div class="followup-plan-date"><label>Fecha prevista de revisión (orientativa, sin cita creada)'+
    '<input type="date" data-field="extra_seg_proxima_fecha_prevista" value="'+escapeText(valueFor('extra_seg_proxima_fecha_prevista'))+'"></label>'+
    '<label>Plazo / indicaciones para la próxima revisión'+
    '<textarea data-field="'+textKey+'" placeholder="Texto libre de origen Valme, sin programación">'+escapeText(valueFor(textKey))+'</textarea></label></div>'+
    '<div class="fields">'+other.map(fieldHtml).join('')+'</div>';
}
function renderFollowupSectionContent(key,fields){
  if(key==='01 Datos de consulta')return followupConsultationHtml(fields);
  if(key==='11 Tratamiento seguimiento')return followupTherapyHtml();
  if(key==='06 Síntomas')return followupSymptomsHtml(fields);
  if(key==='04 Localizaciones')return followupLocationsHtml(fields);
  if(key==='05 Exploración/PASI')return followupPasiHtml(fields);
  if(key==='08 PURE-4')return followupUnavailableInstrument('PURE-4');
  if(key==='12 Seguimiento terapéutico')return followupDecisionHtml();
  if(key==='13 Plan')return followupPlanHtml(fields);
  if(key==='03 Comorbilidades')return '<p class="followup-intro">Revisión opcional de hallazgos. Sin historia conectada, no se declara «sin cambios» respecto de visitas anteriores.</p>'+
    triStateHtml(fields.filter(f=>f.kind==='triestado'))+habitDetails(key);
  if(key==='09 Derivaciones/plan')return '<p class="followup-intro">Registra únicamente derivaciones realizadas y confirmadas, no sospechas ni recomendaciones automáticas.</p>'+
    triStateHtml(fields.filter(f=>f.kind==='triestado'));
  return '';
}

function renderSection(section){
  const [key,name]=section;
  const fields=PSO_VALME_FIELDS.filter(f=>f.section===key);
  const isTherapy=key==='10 Tratamiento primera visita'||key==='11 Tratamiento seguimiento';
  let body;
  if(current.visit==='seguimiento'&&key!=='07 DLQI')body=renderFollowupSectionContent(key,fields);
  else if(isTherapy)body=therapyHtml(current.visit);
  else if(key==='07 DLQI')body=dlqiQuestionnaire();
  else{
    const chips=fields.filter(f=>f.kind==='triestado');
    const other=fields.filter(f=>f.kind!=='triestado');
    body=triStateHtml(chips);
    if(key==='02 Historia de PsO'||key==='03 Comorbilidades')body+=habitDetails(key);
    if(key==='04 Localizaciones')body+='<div id="zoneSummary">'+zoneSummary()+'</div>';
    if(key==='07 DLQI'||key==='08 PURE-4'||key==='12 Seguimiento terapéutico')body+='<p class="warning-inline">Texto, versión, derechos de uso y puntuación requieren aprobación. Respuestas solo para ilustrar el flujo; no constituyen evaluación clínica.</p>';
    body+='<div class="fields">'+other.map(fieldHtml).join('')+'</div>';
  }
  const shownTitle=current.visit==='seguimiento'?(followupTitles[key]||name):name;
  const defaultOpen=current.visit==='seguimiento'?
    ['01 Datos de consulta','11 Tratamiento seguimiento','06 Síntomas','04 Localizaciones'].includes(key):
    ['01 Datos de consulta','02 Historia de PsO','03 Comorbilidades'].includes(key);
  return '<details class="section" data-section="'+escapeText(key)+'"'+(defaultOpen?' open':'')+'>'+
    '<summary><span>'+escapeText(shownTitle)+'</span><small class="section-meta">'+fields.length+' campos fuente</small></summary>'+
    '<div class="section-body">'+body+'</div></details>';
}
function bind(){
  document.querySelectorAll('[data-followup-family]').forEach(el=>el.addEventListener('click',()=>{
    selectedFollowupFamily=el.dataset.followupFamily===selectedFollowupFamily?'':el.dataset.followupFamily;
    render(true);
    const next=document.querySelector('[data-followup-family="'+selectedFollowupFamily+'"]');
    if(next)next.focus();
  }));
  document.querySelectorAll('[data-choice-field]').forEach(el=>el.addEventListener('click',()=>{
    const key=el.dataset.choiceField;
    const old=valueFor(key);
    const next=old===el.dataset.choiceValue?'':el.dataset.choiceValue;
    if(key==='seguimiento_efectos_adversos'&&old==='1'&&next!=='1'&&
      isConsigned(valueFor('extra_seg_efectos_adversos_detalle'))){
      if(!window.confirm('Este cambio eliminará la descripción de efectos adversos de este borrador. ¿Confirmas?'))return;
      delete answers()['extra_seg_efectos_adversos_detalle'];
    }
    if(key==='extra_seg_decision_tipo'&&old!==next){
      const extras=['seguimiento_ajuste_terapeutico','seguimiento_motivo_cambio'];
      if(extras.some(k=>isConsigned(valueFor(k)))){
        if(!window.confirm('Este cambio eliminará los detalles de la decisión anterior del borrador. ¿Confirmas?'))return;
        extras.forEach(k=>delete answers()[k]);
      }
    }
    setField(key,next);
    render(true);
    const nextEl=Array.from(document.querySelectorAll('[data-choice-field]')).find(x=>
      x.dataset.choiceField===key&&x.dataset.choiceValue===el.dataset.choiceValue);
    if(nextEl)nextEl.focus();
  }));
  document.querySelectorAll('[data-chip]').forEach(el=>el.addEventListener('click',()=>{
    const key=el.dataset.chip,val=valueFor(key);
    if(val==='1'&&!clearHabitIfUnmarked(key))return;
    setField(key,val==='1'?'':'1');
    if(Object.values(habitControls).some(c=>c.keys.includes(key))){
      render(true); // ahora aparece/desaparece su panel de consumo solo con selección explícita
      return;
    }
    const pressed=valueFor(key)==='1';
    el.setAttribute('aria-pressed',String(pressed));
    el.dataset.status='unknown';
    el.title=pressed?'Presente declarado':'Sin consignar';
    if(key.startsWith('loc_'))refreshZoneSummary();
  }));
  document.querySelectorAll('[data-field]').forEach(el=>el.addEventListener(el.tagName==='INPUT'||el.tagName==='TEXTAREA'?'input':'change',()=>{
    if(el.dataset.habitStatus){
      const control=habitControls[el.dataset.habitStatus];
      const old=valueFor(control.status),next=el.value;
      const obsolete=[
        (next==='Fumador actual'||next==='Consumo actual')?control.former:control.quantity,
      ].filter(Boolean);
      if(next!==old&&obsolete.some(key=>isConsigned(valueFor(key)))){
        if(!window.confirm('El cambio de situación eliminará el detalle anterior incompatible (cantidad o años desde abandono). ¿Confirmar?')){
          el.value=old;
          return;
        }
        for(const key of obsolete)delete answers()[key];
      }
      setField(el.dataset.field,next);
      render(true);
      return;
    }
    setField(el.dataset.field,el.value);
    if(current.visit==='seguimiento'&&el.dataset.field.startsWith('tx_seguimiento_'))
      updateFollowupTherapyPreview();
    if(el.dataset.dlqiSpecial){updateDlqiSpecial();render(true);}
  }));
  document.querySelectorAll('[data-review]').forEach(el=>el.addEventListener('click',()=>{
    if(!window.confirm('Se registrarán explícitamente como NO presentes las condiciones sin seleccionar de este grupo. ¿Confirmar?'))return;
    const group=el.dataset.review;
    for(const field of PSO_VALME_FIELDS.filter(f=>f.section===group&&f.kind==='triestado')){
      if(valueFor(field.key)!=='1')setField(field.key,'0');
    }
    render(true);
  }));
  document.querySelectorAll('[data-more]').forEach(el=>el.addEventListener('click',()=>{
    const key=activeScope()+'|'+el.dataset.more;
    slots.set(key,Math.min(3,(slots.get(key)||1)+1));
    render(true);
  }));
}
function refreshZoneSummary(){
  const zone=document.getElementById('zoneSummary');
  if(zone)zone.innerHTML=zoneSummary();
}
function patientVisitKey(patient=current.patient,visit=current.visit){return patient+'|'+visit}
function selectPatient(id){
  const normalized=DEMO_PATIENTS.has(id)?id:'';
  if(current.patient!==normalized){
    selectedFollowupFamily=''; // no trasladar navegación terapéutica entre pacientes
    current.patient=normalized;
    current.pathology=pathologyByVisit.get(patientVisitKey())||'';
  }
  const record=DEMO_PATIENTS.get(current.patient);
  $('#patientCip').value=current.patient;
  $('#patientName').disabled=!record;
  $('#patientSex').disabled=!record;
  $('#patientName').value=record?.name||'';
  $('#patientSex').value=record?.sex||'';
  $('#pathology').value=current.pathology;
  $('#cipStatus').dataset.state=record?'found':'hint';
  $('#cipStatus').textContent=record?'CIP ficticio localizado. Selecciona la patología de esta visita para abrir su formulario.':
    'Introduce un CIP ficticio que empiece por DEMO- y pulsa «Buscar / crear CIP». No existe búsqueda hospitalaria.';
  $('#patientNav').disabled=!current.patient;
  $('#patientNav small').textContent=current.patient?'Resumen sintético':'Selecciona primero un CIP';
  render();
}
function lookupCip(){
  const attempted=$('#patientCip').value.trim();
  const id=attempted.toUpperCase();
  if(!/^DEMO-[A-Z0-9-]{3,24}$/.test(id)){
    selectPatient('');
    // No borrar el intento: hacer evidente el problema y permitir corregirlo.
    // El CIP no se guarda ni se envía a ningún servicio.
    $('#patientCip').value=attempted;
    $('#patientCip').setAttribute('aria-invalid','true');
    $('#cipStatus').dataset.state='error';
    $('#cipStatus').textContent='CIP no aceptado: esta demostración solo permite identificadores ficticios como DEMO-PRUEBA-123. No introduzcas CIP reales. Corrige el valor y vuelve a pulsar Buscar / crear CIP.';
    $('#patientCip').focus();
    return;
  }
  $('#patientCip').removeAttribute('aria-invalid');
  if(!DEMO_PATIENTS.has(id)){
    // La ausencia de Primera Visita en esta DEMO no significa ausencia de historia clínica.
    // Se permite un borrador sintético de Seguimiento sin deducir tratamiento ni datos previos.
    DEMO_PATIENTS.set(id,{name:'',sex:''});
    selectPatient(id);
    $('#cipStatus').dataset.state='new';
    $('#cipStatus').textContent=current.visit==='seguimiento'?
      'CIP ficticio nuevo en esta demo: prepara el Seguimiento sin primera visita guardada. Indica nombre/sexo si procede y selecciona Psoriasis. Sin historia conectada ni tratamiento previo inferido.':
      'CIP ficticio nuevo preparado (solo en memoria). Siguiente paso: escribe nombre y apellidos ficticios, indica sexo y selecciona Psoriasis para abrir el formulario. No se ha creado una historia clínica.';
    $('#patientName').focus();
    return;
  }
  selectPatient(id);
  $('#cipStatus').dataset.state='found';
  $('#cipStatus').textContent='CIP de demostración localizado. Revisa los datos y selecciona la patología para abrir el formulario. Ningún acto está guardado.';
}
function activateView(view){
  if(view==='patient'&&!current.patient)return;
  current.view=view;
  render();
}
function selectVisit(visit){
  if(visit!=='primera'&&visit!=='seguimiento')return;
  current.visit=visit;
  current.pathology=pathologyByVisit.get(patientVisitKey())||'';
  $('#pathology').value=current.pathology;
  activateView('visit');
}
function getDraftCountFor(patient,visit){
  const scoped=drafts.get(patient+'|'+visit+'|pso');
  return scoped?Object.values(scoped).filter(v=>v!==null&&v!==undefined&&v!=='').length:0;
}
function renderPatientDashboard(){
  $('#dashboardPatientId').textContent=current.patient||'Sin paciente';
  const primera=getDraftCountFor(current.patient,'primera');
  const seguimiento=getDraftCountFor(current.patient,'seguimiento');
  $('#dashboardDraftCounts').textContent='Borrador Primera Visita: '+primera+' campos · Borrador Seguimiento: '+seguimiento+' campos. Ninguno está guardado como acto clínico.';
}
function followupContextText(){
  const prior=drafts.get(current.patient+'|primera|pso');
  const count=prior?Object.values(prior).filter(isConsigned).length:0;
  if(count){
    return 'En esta sesión existe un BORRADOR SIN GUARDAR de Primera Visita con '+
      count+' respuestas consignadas. No es historia clínica ni una visita previa validada. NO se ha copiado ni precargado ningún dato.';
  }
  return 'No hay Primera Visita guardada ni historia clínica conectada en esta demo. Esto NO significa que el paciente no tenga antecedentes. Ningún dato se ha precargado.';
}
function render(preserveOpen=false){
  $('#homeView').classList.toggle('hidden',current.view!=='home');
  $('#visitView').classList.toggle('hidden',current.view!=='visit');
  $('#patientDashboardView').classList.toggle('hidden',current.view!=='patient');
  document.querySelectorAll('[data-view]').forEach(btn=>{
    const on=btn.dataset.view===current.view;
    btn.classList.toggle('active',on);
    if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-visit]').forEach(btn=>{
    const on=current.view==='visit'&&btn.dataset.visit===current.visit;
    btn.classList.toggle('active',on);
    if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
  $('#patientNav').disabled=!current.patient;
  $('#patientNav small').textContent=current.patient?'Resumen sintético':'Selecciona primero un CIP';
  if(current.view==='patient')renderPatientDashboard();
  const form=$('#visitForm'),empty=$('#emptyState');
  const ready=current.patient&&current.pathology==='pso';
  form.classList.toggle('hidden',!ready);empty.classList.toggle('hidden',!!ready);
  const followup=current.visit==='seguimiento';
  $('#visitView').classList.toggle('visit--followup',followup);
  $('#visitTitle').textContent=followup?'Seguimiento':'Primera Visita';
  $('#visitSubtitle').textContent=followup?
    'Visita actual de Psoriasis. Datos clínicos solo si se registran explícitamente; sin precarga de historia.':
    'Propuesta de captura de Psoriasis basada en las variables de Valme.';
  $('#emptyStateTitle').textContent=followup?
    'Busca o introduce un CIP de prueba y selecciona Psoriasis para el seguimiento':
    'Busca o introduce un CIP de demostración y selecciona Psoriasis';
  $('#emptyStateHint').textContent=followup?
    'Puede existir un seguimiento aunque no haya Primera Visita en esta demo. Los datos previos no se inventan ni se recuperan.':
    'Un CIP nuevo crea únicamente un borrador temporal. No hay consulta hospitalaria ni historia clínica real.';
  $('#visitSummaryHeading').textContent=followup?'Seguimiento de Psoriasis':'Formulario de Psoriasis';
  $('#visitSummaryHint').textContent=followup?
    'Exploración, síntomas, instrumentos candidatos, tratamiento y evolución de esta visita, sin historia precargada.':
    'Secciones plegables de Valme adaptadas a controles de selección rápida.';
  $('#followupContext').classList.toggle('hidden',!followup||!ready||current.view!=='visit');
  if(current.view!=='visit'||!ready)return;
  if(followup)$('#followupContextStatus').textContent=followupContextText();
  const opened=preserveOpen?new Set([...document.querySelectorAll('.section[open]')].map(x=>x.dataset.section)):null;
  const selected=followup?
    followupSections.map(key=>sections.find(([sectionKey])=>sectionKey===key)).filter(Boolean):
    sections.filter(([key])=>!['11 Tratamiento seguimiento','12 Seguimiento terapéutico'].includes(key));
  $('#clinicalSections').innerHTML=selected.map(renderSection).join('');
  if(opened)document.querySelectorAll('.section').forEach(el=>el.open=opened.has(el.dataset.section));
  if(followup)updateFollowupTherapyPreview();
  bind();updateStatus();
}
const overlay=$('#quickViewOverlay');
let lastSearchTrigger=null;
function closeQuickView(){
  if(overlay.classList.contains('hidden'))return;
  overlay.classList.add('hidden');
  document.body.classList.remove('quick-view-open');
  lastSearchTrigger?.focus();
}
function openQuickView(patientId,trigger){
  const id=String(patientId||'').trim().toUpperCase();
  lastSearchTrigger=trigger||null;
  const known=DEMO_PATIENTS.has(id);
  $('#quickViewTitle').textContent=known?'Quick View · '+id:'Paciente no encontrado';
  if(!known){
    const canStart=/^DEMO-[A-Z0-9-]{3,24}$/.test(id);
    $('#quickViewContent').innerHTML='<div class="quick-view-empty-card"><h3>No hay ficha en los datos sintéticos</h3>'+
      (canStart?'<p>El CIP de prueba no tiene ficha. Puedes preparar su <strong>Primera Visita</strong> sin crear una historia clínica real.</p>'+
      '<button type="button" class="action-btn action-primary" data-quick-action="create">Iniciar Primera Visita (CIP de prueba)</button>'+
      '<p>El siguiente paso será introducir nombre, apellidos, sexo y seleccionar la patología.</p>':
      '<p>Este entorno solo admite CIP sintéticos con formato DEMO-..., por ejemplo DEMO-PRUEBA-123. No introduzcas identificadores reales.</p>')+
      '</div>';
    if(canStart)$('#quickViewContent').querySelector('[data-quick-action="create"]').addEventListener('click',()=>{
      closeQuickView();
      selectVisit('primera');
      $('#patientCip').value=id;
      lookupCip();
    });
  }else{
    selectPatient(id);
    const totalPrimera=getDraftCountFor(id,'primera'),totalSeguimiento=getDraftCountFor(id,'seguimiento');
    $('#quickViewContent').innerHTML=
      '<div class="quick-view-summary-card"><div><span class="eyebrow">Paciente ficticio</span><h3>'+escapeText(DEMO_PATIENTS.get(id).name||'Paciente sin nombre')+'</h3><p><strong>CIP demo:</strong> '+escapeText(id)+'</p><p><strong>Patología registrada:</strong> No consta · <strong>Última visita:</strong> No consta</p></div><button type="button" class="action-btn action-primary" data-quick-action="patient">Ver Dashboard Completo</button></div>'+
      '<div class="quick-view-two-col"><div class="quick-view-panel-card"><h3>Resumen clínico</h3><p>Sin historia conectada ni tratamiento activo verificado.</p><p>Borrador primera visita: '+totalPrimera+' campos</p><p>Borrador seguimiento: '+totalSeguimiento+' campos</p></div>'+
      '<div class="quick-view-panel-card"><h3>Índices clínicos</h3><div class="metric-grid"><div>PASI<strong>No evaluable</strong></div><div>BSA<strong>No evaluable</strong></div><div>PGA<strong>No evaluable</strong></div><div>DLQI<strong>No evaluable</strong></div></div><p class="help">Puntuaciones pendientes de homologación clínica.</p></div></div>'+
      '<div class="quick-view-panel-card"><h3>Acciones rápidas</h3><div class="quick-view-actions"><button type="button" class="action-btn action-primary" data-quick-action="primera">Abrir Primera Visita</button><button type="button" class="action-btn action-secondary" data-quick-action="seguimiento">Abrir Seguimiento</button></div><p class="help">Las acciones no crean ni guardan actos clínicos.</p></div>';
    $('#quickViewContent').querySelectorAll('[data-quick-action]').forEach(btn=>btn.addEventListener('click',()=>{
      const action=btn.dataset.quickAction;
      closeQuickView();
      if(action==='patient')activateView('patient');
      else selectVisit(action);
    }));
  }
  overlay.classList.remove('hidden');
  document.body.classList.add('quick-view-open');
  overlay.querySelector('[role="dialog"]').focus();
}
function runSearch(input,trigger){openQuickView(input.value,trigger)}
for(const [inputId,buttonId] of [['#patientSearch','#sidebarSearchButton'],['#homeSearch','#homeSearchButton']]){
  const input=$(inputId),button=$(buttonId);
  button.addEventListener('click',()=>runSearch(input,button));
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runSearch(input,input)}});
}
$('#closeQuickView').addEventListener('click',closeQuickView);
$('#quickViewBackdrop').addEventListener('click',closeQuickView);
document.addEventListener('keydown',e=>{
  if(!overlay.classList.contains('hidden')){
    if(e.key==='Escape'){e.preventDefault();closeQuickView()}
    else if(e.key==='Tab'){
      const controls=[...overlay.querySelectorAll('[role="dialog"] button:not([disabled])')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  }
});
$('#lookupCip').addEventListener('click',lookupCip);
$('#patientCip').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookupCip();}});
$('#patientCip').addEventListener('input',()=>{
  $('#patientCip').removeAttribute('aria-invalid');
  if($('#cipStatus').dataset.state==='error'){
    $('#cipStatus').dataset.state='hint';
    $('#cipStatus').textContent='Comprueba el prefijo DEMO- y pulsa Buscar / crear CIP. No se conectará a una base de datos.';
  }
  if($('#patientCip').value.trim().toUpperCase()!==current.patient&&current.patient){
    current.patient=''; current.pathology='';
    $('#patientName').disabled=true;$('#patientName').value='';
    $('#patientSex').disabled=true;$('#patientSex').value='';
    $('#pathology').value='';
    $('#cipStatus').dataset.state='hint';
    $('#cipStatus').textContent='CIP modificado. Pulsa Buscar / crear CIP para confirmar el paciente ficticio.';
    render();
  }
});
$('#patientName').addEventListener('input',e=>{
  const record=DEMO_PATIENTS.get(current.patient);
  if(record)record.name=e.target.value;
});
$('#patientSex').addEventListener('change',e=>{
  const record=DEMO_PATIENTS.get(current.patient);
  if(record)record.sex=e.target.value;
});
$('#pathology').addEventListener('change',e=>{
  current.pathology=e.target.value;
  if(current.patient)pathologyByVisit.set(patientVisitKey(),current.pathology);
  render();
});
document.querySelectorAll('[data-visit]').forEach(btn=>btn.addEventListener('click',()=>selectVisit(btn.dataset.visit)));
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>activateView(btn.dataset.view)));
$('#btnNuevaVisita').addEventListener('click',()=>selectVisit('primera'));
$('#btnSeguimientoHome').addEventListener('click',()=>selectVisit('seguimiento'));
$('#dashboardSeguimiento').addEventListener('click',()=>selectVisit('seguimiento'));
$('#fieldCoverage').textContent=PSO_VALME_FIELDS.length+' campos de origen Valme mapeados';
render();
