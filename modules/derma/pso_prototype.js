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
const therapyGroups=[
  {key:'topicos',name:'Tópicos',options:['Corticoides Tópicos','Calcipotriol/Betametasona','Tacrolimus Tópico']},
  {key:'sinteticos_convencionales',name:'Sintéticos convencionales',options:['Metotrexato','Ciclosporina','Acitretina','Apremilast']},
  {key:'fototerapia',name:'Fototerapia',options:['UVB Banda Estrecha','PUVA','Excimer']},
  {key:'biologicos',name:'Biológicos',options:['Adalimumab','Secukinumab','Ixekizumab','Guselkumab','Risankizumab','Ustekinumab']},
];
const course=['Brotes','Persistente','Progresiva','Intermitente'];
const phenotypes=['Placas','Guttata','Inversa','Pustulosa','Eritrodérmica','Palmoplantar','Cuero cabelludo predominante','Ungueal predominante','Otro'];
const priorTherapies=['Tópico','Fototerapia','Sistémico convencional','Biológico','Otros'];
const origin=['Atención Primaria','Dermatología general','Multidisciplinar Derma–Reuma'];
const adherences=['Buena','Regular','Mala'];
const intensity=['No','Leve','Moderada','Intensa'];
const current={patient:'',pathology:'',visit:'primera'};
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
function filledCount(){return Object.values(answers()).filter(v=>v!==''&&v!==null&&v!==undefined).length}
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
function zoneSummary(){
  const zones=PSO_VALME_FIELDS.filter(f=>f.kind==='derivado-presentacion');
  const selected=zones.filter(f=>valueFor('loc_'+f.key.replace(/^zona_esp_/,''))==='1');
  return '<p class="note">Zonas especiales: reflejo de localizaciones marcadas por el profesional, no un diagnóstico independiente.</p><div class="chips" aria-label="Zonas especiales">'+(selected.length?selected.map(z=>'<span class="tag">'+escapeText(z.label)+'</span>').join(''):'<span class="tag">No se han marcado zonas especiales</span>')+'</div>';
}
function therapyHtml(visit){
  const prefix=visit==='primera'?'tx_primera':'tx_seguimiento';
  return '<p class="warning-inline">El nombre del medicamento no propone ni escribe dosis, vía, pauta, inducción o cambio. Las líneas son un borrador sin efecto clínico.</p>'+
  therapyGroups.map(group=>{
    const slotKey=activeScope()+'|'+group.key;
    const count=slots.get(slotKey)||1;
    const rows=Array.from({length:count},(_,idx)=>{
      const i=idx+1,drugKey=prefix+'_'+group.key+'_farmaco_'+i,posKey=prefix+'_'+group.key+'_posologia_'+i;
      const options=group.options.map(v=>({text:v,value:v}));
      const drug=valueFor(drugKey);
      if(drug&&!options.some(o=>o.value===drug))options.push({text:drug,value:drug});
      return '<div class="therapy-row">'+
        '<label>Fármaco '+i+'<select data-field="'+drugKey+'">'+optionHtml(options,drug,'Seleccionar…')+'</select></label>'+
        '<label>Dosis / frecuencia (si está documentada)<input type="text" data-field="'+posKey+'" value="'+escapeText(valueFor(posKey))+'" placeholder="Vacío hasta declaración clínica"></label>'+
        '</div>';
    }).join('');
    const otherKey=prefix+'_'+group.key+'_otros';
    return '<div class="therapy-group"><h3>'+escapeText(group.name)+'</h3>'+rows+
    (count<3?'<button class="more-row" type="button" data-more="'+group.key+'">+ Añadir línea</button>':'')+
    '<label style="margin-top:12px">Otros (introducción explícita)<input data-field="'+otherKey+'" type="text" value="'+escapeText(valueFor(otherKey))+'" placeholder="Opcional"></label></div>';
  }).join('');
}
function renderSection(section){
  const [key,name]=section;
  const fields=PSO_VALME_FIELDS.filter(f=>f.section===key);
  const isTherapy=key==='10 Tratamiento primera visita'||key==='11 Tratamiento seguimiento';
  let body;
  if(isTherapy)body=therapyHtml(current.visit);
  else{
    const chips=fields.filter(f=>f.kind==='triestado');
    const other=fields.filter(f=>f.kind!=='triestado');
    body=triStateHtml(chips);
    if(key==='04 Localizaciones')body+='<div id="zoneSummary">'+zoneSummary()+'</div>';
    if(key==='07 DLQI'||key==='08 PURE-4'||key==='12 Seguimiento terapéutico')body+='<p class="warning-inline">Texto, versión, derechos de uso y puntuación requieren aprobación. Respuestas solo para ilustrar el flujo; no constituyen evaluación clínica.</p>';
    body+='<div class="fields">'+other.map(fieldHtml).join('')+'</div>';
  }
  return '<details class="section" data-section="'+escapeText(key)+'"'+(['01 Datos de consulta','02 Historia de PsO','03 Comorbilidades'].includes(key)?' open':'')+'>'+
    '<summary><span>'+escapeText(name)+'</span><small class="section-meta">'+fields.length+' campos fuente</small></summary>'+
    '<div class="section-body">'+body+'</div></details>';
}
function bind(){
  document.querySelectorAll('[data-chip]').forEach(el=>el.addEventListener('click',()=>{
    const key=el.dataset.chip,val=valueFor(key);
    setField(key,val==='1'?'':'1');
    const pressed=valueFor(key)==='1';
    el.setAttribute('aria-pressed',String(pressed));
    el.dataset.status='unknown';
    el.title=pressed?'Presente declarado':'Sin consignar';
    if(key.startsWith('loc_'))refreshZoneSummary();
  }));
  document.querySelectorAll('[data-field]').forEach(el=>el.addEventListener(el.tagName==='INPUT'||el.tagName==='TEXTAREA'?'input':'change',()=>{
    setField(el.dataset.field,el.value);
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
function render(preserveOpen=false){
  const form=$('#visitForm'),empty=$('#emptyState');
  const ready=current.patient&&current.pathology==='pso';
  form.classList.toggle('hidden',!ready);empty.classList.toggle('hidden',!!ready);
  $('#visitTitle').textContent=current.visit==='primera'?'Primera Visita':'Seguimiento';
  document.querySelectorAll('[data-visit]').forEach(btn=>{
    const on=btn.dataset.visit===current.visit;btn.classList.toggle('active',on);
    if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
  if(!ready)return;
  const opened=preserveOpen?new Set([...document.querySelectorAll('.section[open]')].map(x=>x.dataset.section)):null;
  const selected=sections.filter(([key])=>!(['10 Tratamiento primera visita','11 Tratamiento seguimiento','12 Seguimiento terapéutico'].includes(key))||
    (current.visit==='primera'&&key==='10 Tratamiento primera visita')||
    (current.visit==='seguimiento'&&key!=='10 Tratamiento primera visita'));
  $('#clinicalSections').innerHTML=selected.map(renderSection).join('');
  if(opened)document.querySelectorAll('.section').forEach(el=>el.open=opened.has(el.dataset.section));
  bind();updateStatus();
}
$('#demoPatient').addEventListener('change',e=>{current.patient=e.target.value;render()});
$('#pathology').addEventListener('change',e=>{current.pathology=e.target.value;render()});
document.querySelectorAll('[data-visit]').forEach(el=>el.addEventListener('click',()=>{
  if(el.dataset.visit===current.visit)return;
  current.visit=el.dataset.visit;render();
}));
$('#fieldCoverage').textContent=PSO_VALME_FIELDS.length+' campos de origen Valme mapeados';
render();
