#!/usr/bin/env node
/**
 * DermaNEXus PsO prototype: browser witness with synthetic data only.
 * No DOM mutation/readonly alteration/forged clinical storage.
 * Run: node tools/derma_pso_prototype_browser_check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const { chromium }=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
// Oráculo congelado de Valme (index.html HEADERS, 174 claves); NO procede del módulo bajo prueba.
const VALME_HEADERS = `nusha,fecha_visita,tipo_visita,procedencia,tratamiento_previo_consulta,fecha_inicio_psoriasis,fecha_diagnostico_psoriasis,curso_evolutivo,fenotipo,antecedentes_familiares_psoriasis,desenc_infeccion,desenc_estres,desenc_farmacos,desenc_traumatismo_friccion,desenc_retirada_corticoides,desenc_tabaco,desenc_alcohol,desenc_otros,tratamiento_previo,tipo_tratamiento_previo,tratamiento_previo_detalle,motivo_suspension_previo,respuesta_previa,comorb_obesidad,comorb_sobrepeso,comorb_hta,comorb_dislipemia,comorb_diabetes_prediabetes,comorb_sindrome_metabolico,comorb_esteatosis_hepatica,comorb_alteracion_transaminasas,comorb_hepatopatia_cronica,comorb_artritis_psoriasica_conocida,comorb_sospecha_artritis_psoriasica,comorb_eii,comorb_cardiopatia_isquemica,comorb_ictus_ait,comorb_insuficiencia_cardiaca,comorb_enfermedad_vascular_periferica,comorb_tabaquismo,comorb_alcohol,comorb_ansiedad_depresion,loc_cuero_cabelludo,loc_cara,loc_tronco,loc_miembros_superiores,loc_miembros_inferiores,loc_pliegues,loc_genitales,loc_palmas,loc_plantas,loc_unas,zona_esp_cuero_cabelludo,zona_esp_unas,zona_esp_cara,zona_esp_genitales,zona_esp_palmas,zona_esp_plantas,zona_esp_pliegues,bsa,pga,pasi,pasi_cabeza_eritema,pasi_cabeza_induracion,pasi_cabeza_escamas,pasi_cabeza_area,pasi_tronco_eritema,pasi_tronco_induracion,pasi_tronco_escamas,pasi_tronco_area,pasi_brazos_eritema,pasi_brazos_induracion,pasi_brazos_escamas,pasi_brazos_area,pasi_piernas_eritema,pasi_piernas_induracion,pasi_piernas_escamas,pasi_piernas_area,afectacion_ungueal,observaciones_clinicas,eva_prurito,eva_dolor,escozor,fisuracion,sangrado,alteracion_funcional,alteracion_sueno,dlqi_q1,dlqi_q2,dlqi_q3,dlqi_q4,dlqi_q5,dlqi_q6,dlqi_q7,dlqi_q8,dlqi_q9,dlqi_q10,dlqi_total,pure4_q1,pure4_q2,pure4_q3,pure4_q4,pure4_total_positivas,derivacion_derma_reuma,tx_primera_topicos_farmaco_1,tx_primera_topicos_posologia_1,tx_primera_topicos_farmaco_2,tx_primera_topicos_posologia_2,tx_primera_topicos_farmaco_3,tx_primera_topicos_posologia_3,tx_primera_topicos_otros,tx_primera_sinteticos_convencionales_farmaco_1,tx_primera_sinteticos_convencionales_posologia_1,tx_primera_sinteticos_convencionales_farmaco_2,tx_primera_sinteticos_convencionales_posologia_2,tx_primera_sinteticos_convencionales_farmaco_3,tx_primera_sinteticos_convencionales_posologia_3,tx_primera_sinteticos_convencionales_otros,tx_primera_fototerapia_farmaco_1,tx_primera_fototerapia_posologia_1,tx_primera_fototerapia_farmaco_2,tx_primera_fototerapia_posologia_2,tx_primera_fototerapia_farmaco_3,tx_primera_fototerapia_posologia_3,tx_primera_fototerapia_otros,tx_primera_biologicos_farmaco_1,tx_primera_biologicos_posologia_1,tx_primera_biologicos_farmaco_2,tx_primera_biologicos_posologia_2,tx_primera_biologicos_farmaco_3,tx_primera_biologicos_posologia_3,tx_primera_biologicos_otros,tx_seguimiento_topicos_farmaco_1,tx_seguimiento_topicos_posologia_1,tx_seguimiento_topicos_farmaco_2,tx_seguimiento_topicos_posologia_2,tx_seguimiento_topicos_farmaco_3,tx_seguimiento_topicos_posologia_3,tx_seguimiento_topicos_otros,tx_seguimiento_sinteticos_convencionales_farmaco_1,tx_seguimiento_sinteticos_convencionales_posologia_1,tx_seguimiento_sinteticos_convencionales_farmaco_2,tx_seguimiento_sinteticos_convencionales_posologia_2,tx_seguimiento_sinteticos_convencionales_farmaco_3,tx_seguimiento_sinteticos_convencionales_posologia_3,tx_seguimiento_sinteticos_convencionales_otros,tx_seguimiento_fototerapia_farmaco_1,tx_seguimiento_fototerapia_posologia_1,tx_seguimiento_fototerapia_farmaco_2,tx_seguimiento_fototerapia_posologia_2,tx_seguimiento_fototerapia_farmaco_3,tx_seguimiento_fototerapia_posologia_3,tx_seguimiento_fototerapia_otros,tx_seguimiento_biologicos_farmaco_1,tx_seguimiento_biologicos_posologia_1,tx_seguimiento_biologicos_farmaco_2,tx_seguimiento_biologicos_posologia_2,tx_seguimiento_biologicos_farmaco_3,tx_seguimiento_biologicos_posologia_3,tx_seguimiento_biologicos_otros,seguimiento_adherencia_categoria,seguimiento_ajuste_terapeutico,seguimiento_adherencia_morisky_q1,seguimiento_adherencia_morisky_q2,seguimiento_adherencia_morisky_q3,seguimiento_adherencia_morisky_q4,seguimiento_morisky_total_no_adherencia,seguimiento_motivo_cambio,seguimiento_efectos_adversos,impresion_clinica,objetivo_terapeutico,otras_derivaciones,proxima_revision,comentarios_finales`.split(',');
const NON_EDITABLE_FIELDS = new Set(['nusha','tipo_visita','tratamiento_previo_consulta','pasi','dlqi_total','pure4_total_positivas','seguimiento_morisky_total_no_adherencia',...VALME_HEADERS.filter(k=>k.startsWith('zona_esp_'))]);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file=path.resolve(ROOT,rel);
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const checks=[];
const check=(title,fn)=>checks.push([title,fn]);
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const errors=[];
 const externalRequests=[];
 page.on('request',req=>{ if(new URL(req.url()).origin!==origin)externalRequests.push(req.url()) });
 page.on('pageerror',e=>errors.push('pageerror '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text())});
 const res=await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
 check('S1 pantalla real y advertencia',async()=>{
   if(res.status()!=200)throw Error('HTTP '+res.status());
   await page.getByText('Demostración sintética sin persistencia').waitFor();
   await page.getByRole('button',{name:'Primera Visita'}).waitFor();
 });
 check('S2 circuito y patología explícita',async()=>{
   await page.getByRole('button',{name:'Primera Visita'}).click();
   await page.locator('#demoPatient').selectOption('DEMO-PSO-001');
   if(await page.locator('#visitForm').isVisible())throw Error('visible sin patología explícita');
   await page.locator('#pathology').selectOption('pso');
   await page.locator('#visitForm').waitFor({state:'visible'});
   if(await page.locator('#pathology option').count()!==2)throw Error('otras patologías habilitadas');
 });
 check('S3 chips no infieren negación',async()=>{
   const hta=page.locator('[data-chip="comorb_hta"]');
   const obes=page.locator('[data-chip="comorb_obesidad"]');
   if(await hta.getAttribute('aria-pressed')!=='false')throw Error('HTA no inicial vacía');
   await hta.click();
   if(await hta.getAttribute('aria-pressed')!=='true')throw Error('HTA sin marca positiva');
   if(await obes.getAttribute('aria-pressed')!=='false'||await obes.getAttribute('data-status')!=='unknown')throw Error('obesidad inferida');
   if(!await page.getByText('Sin seleccionar = no consignado').count())throw Error('falta semántica visible');
   let dismissed=false;
   page.once('dialog',async dialog=>{dismissed=true;await dialog.dismiss()});
   await page.locator('[data-section="03 Comorbilidades"] [data-review]').click();
   if(!dismissed||await obes.getAttribute('data-status')!=='unknown')throw Error('revisión negativa sin confirmación');
   let accepted=false;
   page.once('dialog',async dialog=>{accepted=true;await dialog.accept()});
   await page.locator('[data-section="03 Comorbilidades"] [data-review]').click();
   if(!accepted)throw Error('no confirmó revisión negativa');
   if(await hta.getAttribute('aria-pressed')!=='true')throw Error('revisión borró HTA positiva');
   if(await obes.getAttribute('data-status')!=='absent')throw Error('no se registró ausencia explícita de obesidad');
   if(await page.locator('[data-chip="loc_tronco"]').getAttribute('data-status')!=='unknown')throw Error('revisión contaminó localizaciones');
 });
 check('S4 cobertura fuente explícita',async()=>{
   if(!String(await page.locator('#fieldCoverage').textContent()).includes('174'))throw Error('cobertura visible no 174');
   const fieldKeys=await page.evaluate(()=>window.__dermaPrototypeFieldKeys||[]);
   if(JSON.stringify(fieldKeys)!==JSON.stringify(VALME_HEADERS))throw Error('crosswalk no coincide con HEADERS de Valme');
   const observed=new Set();
   const snapshot=async()=>{for(const k of await page.locator('[data-field]').evaluateAll(els=>els.map(el=>el.dataset.field)))observed.add(k);for(const k of await page.locator('[data-chip]').evaluateAll(els=>els.map(el=>el.dataset.chip)))observed.add(k)};
   for(const [visit,section] of [['primera','10 Tratamiento primera visita'],['seguimiento','11 Tratamiento seguimiento']]){
     if(visit==='seguimiento')await page.getByRole('button',{name:'Seguimiento'}).click();
     await page.locator('[data-section="'+section+'"] > summary').click();
     for(const group of ['topicos','sinteticos_convencionales','fototerapia','biologicos']){
       for(let slot=1;slot<3;slot++)await page.locator('[data-section="'+section+'"] [data-more="'+group+'"]').click();
     }
     await snapshot();
   }
   const absent=VALME_HEADERS.filter(k=>!observed.has(k)&&!NON_EDITABLE_FIELDS.has(k));
   const unlisted=[...observed].filter(k=>!VALME_HEADERS.includes(k));
   if(absent.length||unlisted.length)throw Error('campos sin control o ajenos a Valme: '+JSON.stringify({absent,unlisted}));
   if([...NON_EDITABLE_FIELDS].some(k=>observed.has(k)))throw Error('un derivado/contexto aparece como campo editable');
   await page.getByRole('button',{name:'Primera Visita'}).click();
 });
 check('S5 dosis sin inferencias',async()=>{
   await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
   const drug=page.locator('[data-field="tx_primera_biologicos_farmaco_1"]');
   await drug.selectOption('Secukinumab');
   const pos=await page.locator('[data-field="tx_primera_biologicos_posologia_1"]').inputValue();
   if(pos!=='')throw Error('posología inferida: '+pos);
   await page.getByRole('button',{name:'Seguimiento'}).click();
   const follow=page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]');
   if(await follow.inputValue()!==''||await page.locator('[data-field="tx_seguimiento_biologicos_posologia_1"]').inputValue()!=='')throw Error('se trasladó tratamiento primera a seguimiento');
   await page.getByRole('button',{name:'Primera Visita'}).click();
   if(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').inputValue()!=='Secukinumab')throw Error('se perdió dato del circuito original');
 });
 check('S6 evaluaciones no homologadas',async()=>{
   await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
   await page.locator('[data-field="pasi_cabeza_eritema"]').selectOption('1');
   const status=await page.locator('#pasiStatus').textContent();
   if(!/sin cálculo|no homologado/i.test(status))throw Error('PASI calculado o sin cautela: '+status);
   for(const label of ['Total DLQI','Total PURE-4']){
     const displayed=await page.locator('.derived').filter({hasText:label}).textContent();
     if(!/sin cálculo clínico|no homologado/i.test(displayed))throw Error(label+' aparenta estar homologado');
   }
   await page.getByRole('button',{name:'Seguimiento'}).click();
   const morisky=await page.locator('.derived').filter({hasText:'Total Morisky'}).textContent();
   if(!/sin cálculo clínico|no homologado/i.test(morisky))throw Error('Morisky aparenta estar homologado');
   await page.getByRole('button',{name:'Primera Visita'}).click();
 });
 check('S7 aislamiento entre circuitos y pacientes',async()=>{
   await page.getByRole('button',{name:'Seguimiento'}).click();
   if(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')!=='false')throw Error('carga primera en seguimiento');
   await page.getByRole('button',{name:'Primera Visita'}).click();
   if(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')!=='true')throw Error('se perdió borrador en memoria');
   await page.locator('#demoPatient').selectOption('DEMO-PSO-002');
   if(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')!=='false')throw Error('contaminación paciente');
   await page.locator('#demoPatient').selectOption('DEMO-PSO-001');
   if(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')!=='true')throw Error('borrador sintético previo no restaurado');
 });
 check('S8 sin persistencia ni errores de consola',async()=>{
   if(errors.length)throw Error(errors.join(' | '));
   const storage=await page.evaluate(()=>({ls:localStorage.length,ss:sessionStorage.length}));
   if(storage.ls!==0||storage.ss!==0)throw Error('se escribió en storage '+JSON.stringify(storage));
   if(externalRequests.length)throw Error('peticiones externas '+JSON.stringify(externalRequests));
   if((await page.context().cookies()).length)throw Error('cookies escritas');
   await page.reload({waitUntil:'networkidle'});
   if(await page.locator('#demoPatient').inputValue()!==''||await page.locator('#pathology').inputValue()!=='')throw Error('contexto restaurado sin fuente tras recarga');
   await page.locator('#demoPatient').selectOption('DEMO-PSO-001');
   await page.locator('#pathology').selectOption('pso');
   if(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')!=='false')throw Error('la recarga no borró el borrador');
   if(errors.length||externalRequests.length)throw Error('errores o peticiones tras recarga');
 });
 for(const [title,fn] of checks){
   try{await fn();console.log('PASS '+title)}catch(e){console.error('FAIL '+title+' — '+e.message);process.exitCode=1;break}
 }
 if(!process.exitCode && process.env.DERMA_SCREENSHOT_PATH)await page.screenshot({path:process.env.DERMA_SCREENSHOT_PATH,fullPage:true});
}finally{
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
