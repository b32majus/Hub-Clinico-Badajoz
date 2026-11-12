#!/usr/bin/env node
// F2 UI/UX clinical interaction witness. Synthetic data, supported browser interactions only.
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,extname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=createServer((req,res)=>{
 const path=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
 if(!path.startsWith(root+'/')||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});createReadStream(path).pipe(res);
});
const assert=(x,msg)=>{if(!x)throw Error(msg)};
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:900}});
 page.setDefaultTimeout(7000);
 const errors=[],externals=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)externals.push(r.url())});
 const section=(key)=>page.locator('.section[data-section="'+key+'"]');
 const open=async(key)=>{if((await section(key).getAttribute('open'))===null)await section(key).locator('summary').click()};
 const selected=async(field,value)=>page.locator('[data-choice-field="'+field+'"][data-choice-value="'+value+'"]').getAttribute('aria-pressed');
 const tests=[
  ['UX1 Primacía F2: chips visibles, PASI replegado, orden clínico',async()=>{
   await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   await page.locator('#patientCip').fill('DEMO-UX-F2-013');
   await page.locator('#lookupCip').click();
   await page.locator('#pathology').selectOption('pso');
   const keys=await page.locator('#clinicalSections .section').evaluateAll(xs=>xs.map(x=>x.dataset.section));
   assert(keys.slice(0,4).join('|')==='01 Datos de consulta|11 Tratamiento seguimiento|06 Síntomas|04 Localizaciones','orden no prioriza la visita');
   for(const key of keys.slice(0,4))assert(await section(key).getAttribute('open')!==null,'apartado prioritario cerrado '+key);
   assert(await section('05 Exploración/PASI').getAttribute('open')===null,'PASI domina pantalla inicial');
   assert(await page.locator('[data-followup-family]').count()===4,'faltan cuatro familias en chips');
   assert(await page.locator('[data-chip="loc_tronco"]').isVisible(),'localizaciones no disponibles a simple vista');
   assert(await page.locator('[data-chip="escozor"]').isVisible(),'síntomas no disponibles a simple vista');
   assert(await page.locator('[data-field="pasi_cabeza_eritema"]').isVisible()===false,'PASI invadió apertura');
   assert(await page.locator('.visit--followup').count()===1,'estilos F2 no activos');
   assert(await page.locator('#patientName').isEnabled(),'flujo CIP se rompió');
   assert((await page.locator('#followupContextStatus').textContent()).includes('No hay Primera Visita'),'historia ficticia atribuida');
   if(process.env.DERMA_F2_UX_DESKTOP)await page.screenshot({path:process.env.DERMA_F2_UX_DESKTOP,fullPage:true});
  }],
  ['UX2 Tratamiento sin fuente: familia seleccionable, relación por línea explícita',async()=>{
   assert((await page.locator('#followupTherapyPreview').textContent()).includes('Todavía no'),'se inventa tratamiento actual');
   for(const option of await page.locator('[data-followup-family]').all()){
    assert(await option.getAttribute('aria-pressed')==='false','familia preseleccionada');
   }
   await page.locator('[data-followup-family="biologicos"]').click();
   assert(await page.locator('[data-followup-family="biologicos"]').getAttribute('aria-pressed')==='true','no destaca familia');
   await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').fill('Secukinumab');
   for(const key of ['tx_seguimiento_biologicos_posologia_1','extra_tx_seguimiento_biologicos_dosis_1','extra_tx_seguimiento_biologicos_via_1']){
    assert(await page.locator('[data-field="'+key+'"]').inputValue()==='',key+' autocompletado sin fuente');
   }
   assert((await page.locator('#followupTherapyPreview').textContent()).includes('relación sin consignar'),'infirió estado de línea');
   const rel='extra_tx_seguimiento_biologicos_relacion_1';
   await page.locator('[data-choice-field="'+rel+'"][data-choice-value="actual_referido"]').click();
   assert(await selected(rel,'actual_referido')==='true','relación explícita no guardada');
   assert((await page.locator('#followupTherapyPreview').textContent()).includes('actual referido'),'contexto no refleja lo declarado');
   await page.locator('[data-field="extra_tx_seguimiento_biologicos_dosis_1"]').fill('dato sintético declarado');
   if(process.env.DERMA_F2_UX_TREATMENT)await section('11 Tratamiento seguimiento').screenshot({path:process.env.DERMA_F2_UX_TREATMENT});
   await page.locator('[data-followup-family="topicos"]').click();
   assert(await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').count()===0,'dos familias desordenadas abiertas');
   assert(await page.locator('[data-field="tx_seguimiento_topicos_farmaco_1"]').inputValue()==='','fármaco biológico copiado a tópicos');
   await page.locator('[data-followup-family="biologicos"]').click();
   assert(await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').inputValue()==='Secukinumab','pierde borrador al cambiar familia');
   assert(await page.locator('[data-field="extra_tx_seguimiento_biologicos_dosis_1"]').inputValue()==='dato sintético declarado','pierde dosis explícita');
  }],
  ['UX3 Chips de síntomas: color, estados desconocidos, intensidad no automática',async()=>{
   const yes=page.locator('[data-chip="escozor"]'),unknown=page.locator('[data-chip="sangrado"]');
   assert(await yes.getAttribute('aria-pressed')==='false','se inventa síntoma');
   assert(await unknown.getAttribute('data-status')==='unknown','desconocido se transforma en negativo');
   await yes.click();
   assert(await yes.getAttribute('aria-pressed')==='true','chip no selecciona');
   assert(await yes.evaluate(x=>getComputedStyle(x,'::before').content)==='none','reaparece check visual');
   assert(await selected('alteracion_sueno','Moderada')==='false','se infiere intensidad');
   await page.locator('[data-choice-field="alteracion_sueno"][data-choice-value="Moderada"]').click();
   assert(await selected('alteracion_sueno','Moderada')==='true','intensidad no responde al clic');
   assert(await selected('alteracion_funcional','Moderada')==='false','contaminación entre síntomas');
   assert(await page.locator('[data-chip="loc_tronco"]').getAttribute('aria-pressed')==='false','localizaciones infieren hallazgos');
   await page.locator('[data-chip="loc_tronco"]').click();
   assert(await page.locator('[data-chip="loc_tronco"]').getAttribute('aria-pressed')==='true','localización no marca');
  }],
  ['UX4 PASI por 4 regiones, 16 entradas; BSA % y cero válido sin puntuación',async()=>{
   await open('05 Exploración/PASI');
   assert(await page.locator('.followup-pasi-region').count()===4,'faltan regiones PASI');
   assert(await page.locator('.followup-pasi-region select').count()===16,'faltan componentes PASI');
   assert((await section('05 Exploración/PASI').innerText()).includes('BSA (%)'),'sin unidad BSA');
   await page.locator('[data-field="bsa"]').fill('0');
   await page.locator('[data-field="pga"]').selectOption('0');
   await page.locator('[data-field="pasi_cabeza_eritema"]').selectOption('0');
   assert(await page.locator('[data-field="bsa"]').inputValue()==='0','BSA cero legítimo perdido');
   assert(await page.locator('[data-field="pasi_cabeza_eritema"]').inputValue()==='0','PASI cero legítimo perdido');
   assert((await page.locator('#pasiStatus').textContent()).includes('Sin cálculo clínico'),'PASI clínico fabricado');
   if(process.env.DERMA_F2_UX_PASI)await section('05 Exploración/PASI').screenshot({path:process.env.DERMA_F2_UX_PASI});
  }],
  ['UX5 Instrumentos sin texto NO respondibles; DLQI candidato conserva preguntas',async()=>{
   await open('08 PURE-4');
   assert(await page.locator('[data-field="pure4_q1"]').count()===0,'PURE4 placeholder respondible');
   assert((await section('08 PURE-4').innerText()).includes('no habilitado'),'PURE-4 no bloqueado');
   await open('12 Seguimiento terapéutico');
   assert(await page.locator('[data-field="seguimiento_adherencia_morisky_q1"]').count()===0,'Morisky placeholder respondible');
   assert((await section('12 Seguimiento terapéutico').innerText()).includes('no habilitado'),'Morisky no bloqueado');
   await open('07 DLQI');
   assert(await page.locator('[data-question^="dlqi_q"]').count()===10,'DLQI 10 preguntas incompleto');
   assert((await page.locator('.dlqi-candidate .derived').textContent()).includes('Sin cálculo clínico'),'DLQI calculado sin homologación');
  }],
  ['UX6 Tolerabilidad y decisión expresa: details con confirmación al limpiar',async()=>{
   assert(await selected('seguimiento_adherencia_categoria','Buena')==='false','se inventa adherencia');
   await page.locator('[data-choice-field="seguimiento_adherencia_categoria"][data-choice-value="Buena"]').click();
   assert(await selected('seguimiento_adherencia_categoria','Buena')==='true','adherencia no seleccionable');
   await page.locator('[data-choice-field="seguimiento_efectos_adversos"][data-choice-value="1"]').click();
   const details=page.locator('[data-field="extra_seg_efectos_adversos_detalle"]');
   assert(await details.isVisible(),'detalle de tolerabilidad no condicionado');
   await details.fill('Evento sintético informado');
   let canceled=false;
   page.once('dialog',async dialog=>{canceled=true;await dialog.dismiss()});
   await page.locator('[data-choice-field="seguimiento_efectos_adversos"][data-choice-value="0"]').click();
   assert(canceled&&await selected('seguimiento_efectos_adversos','1')==='true','descartó detalle sin consentimiento');
   let confirmed=false;
   page.once('dialog',async dialog=>{confirmed=true;await dialog.accept()});
   await page.locator('[data-choice-field="seguimiento_efectos_adversos"][data-choice-value="0"]').click();
   assert(confirmed&&await page.locator('[data-field="extra_seg_efectos_adversos_detalle"]').count()===0,'detalle antiguo oculto no limpiado');
   await page.locator('[data-choice-field="extra_seg_decision_tipo"][data-choice-value="cambio_propuesto"]').click();
   const adjustment=page.locator('[data-field="seguimiento_ajuste_terapeutico"]');
   await adjustment.fill('Propuesta sintética expresamente declarada');
   assert(await page.locator('[data-field="seguimiento_motivo_cambio"]').count()===1,'falta motivo para propuesta explícita');
   let rejected=false;
   page.once('dialog',async dialog=>{rejected=true;await dialog.dismiss()});
   await page.locator('[data-choice-field="extra_seg_decision_tipo"][data-choice-value="continuidad_explicita"]').click();
   assert(rejected&&await selected('extra_seg_decision_tipo','cambio_propuesto')==='true','cambió decisión sin confirmación');
   if(process.env.DERMA_F2_UX_DECISION)await section('12 Seguimiento terapéutico').screenshot({path:process.env.DERMA_F2_UX_DECISION});
  }],
  ['UX7 Plan: fecha prevista independiente de texto fuente, sin cita automática',async()=>{
   await open('13 Plan');
   const date=page.locator('[data-field="extra_seg_proxima_fecha_prevista"]');
   assert(await date.inputValue()==='','fecha inventada');
   assert(await page.locator('[data-field="proxima_revision"]').inputValue()==='','plazo previo inventado');
   await date.fill('2026-12-11');
   await page.locator('[data-field="proxima_revision"]').fill('En unas semanas, según evolución sintética');
   assert(await date.inputValue()==='2026-12-11','fecha prevista no retenida');
   assert(await page.locator('[data-field="proxima_revision"]').inputValue()==='En unas semanas, según evolución sintética','sobrescribió campo Valme');
   assert((await section('13 Plan').innerText()).includes('sin cita creada'),'fecha presentada como cita realizada');
   assert(await page.locator('button[type=submit]').count()===0,'simula validación/guardado');
  }],
  ['UX8 Separación Primera/Seguimiento y pacientes; no contaminación clínica',async()=>{
   await page.getByRole('button',{name:'Primera Visita'}).click();
   await page.locator('#pathology').selectOption('pso');
   assert(await page.locator('.visit--followup').count()===0,'estilos F2 contaminan F1');
   assert(await page.locator('[data-followup-family]').count()===0,'chips de familia F2 contaminan F1');
   assert(await page.locator('[data-chip="comorb_hta"]').isVisible(),'chip original de F1 alterado');
   await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
   assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').isVisible(),'F1 perdió tratamientos');
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert(await page.locator('#pathology').inputValue()==='pso','patología F2 propia perdida');
   assert((await page.locator('#followupTherapyPreview').textContent()).includes('Secukinumab'),'borrador F2 perdido al visitar F1');
   await page.locator('#patientCip').fill('DEMO-PSO-002');await page.locator('#lookupCip').click();
   await page.locator('#pathology').selectOption('pso');
   assert(await page.locator('[data-followup-family="biologicos"]').getAttribute('aria-pressed')==='false','familia F2 heredada de otro paciente');
   assert((await page.locator('#followupTherapyPreview').textContent()).includes('Todavía no'),'tratamiento de otro paciente transferido');
   assert(await page.locator('[data-chip="escozor"]').getAttribute('aria-pressed')==='false','síntomas de otro paciente');
  }],
  ['UX9 Móvil, sin overflow ni storage ni red ajena, recarga limpia',async()=>{
   await page.setViewportSize({width:390,height:844});
   const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,ls:localStorage.length,ss:sessionStorage.length}));
   assert(bounds.scroll<=bounds.width+1,'overflow móvil '+JSON.stringify(bounds));
   assert(bounds.ls===0&&bounds.ss===0&&(await page.context().cookies()).length===0,'persistencia no autorizada');
   assert(errors.length===0&&externals.length===0,'errores o llamadas ajenas '+JSON.stringify({errors,externals}));
   if(process.env.DERMA_F2_UX_MOBILE)await page.screenshot({path:process.env.DERMA_F2_UX_MOBILE,fullPage:true});
   await page.reload({waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert(await page.locator('#patientCip').inputValue()==='','CIP sobrevivió recarga');
   assert(errors.length===0&&externals.length===0,'errores tras reload');
  }],
 ];
 for(const [label,test] of tests){
  try{await test();console.log('PASS '+label)}
  catch(error){console.error('FAIL '+label+' — '+error.message);process.exitCode=1;break}
 }
}finally{
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
