#!/usr/bin/env node
// F2 Seguimiento PsO · Chromium real, UI soportada y solo pacientes DEMO.
// No se alteran DOM/readOnly ni se crean visitas/historias ficticias en storage.
import { createServer } from 'node:http';
import { createReadStream,existsSync,statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve,dirname,extname } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=createServer((req,res)=>{
  const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
  if(!file.startsWith(root+'/')||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
  createReadStream(file).pipe(res);
});
const assert=(test,msg)=>{if(!test)throw new Error(msg)};
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:880}});
 const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url())});
 const tests=[
  ['F2-1 Identificación obligatoria y PsO explícita sin heredar Primera',async()=>{
   await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert(await page.locator('#visitView').isVisible(),'Seguimiento no abre');
   assert(!await page.locator('#visitForm').isVisible(),'formulario sin CIP');
   assert((await page.locator('#emptyStateHint').textContent()).includes('no haya Primera Visita'),'no informa ausencia de historial');
   await page.locator('#patientCip').fill('DEMO-PSO-001');
   await page.locator('#lookupCip').click();
   assert(!await page.locator('#visitForm').isVisible(),'patología inferida');
   assert(await page.locator('#pathology').inputValue()==='','PsO automática');
   await page.locator('#pathology').selectOption('pso');
   assert(await page.locator('#visitForm').isVisible(),'seguimiento no muestra PsO explícita');
   assert(await page.locator('#followupContext').isVisible(),'sin aviso de frontera');
  }],
  ['F2-2 CIP demo nuevo permite seguimiento SIN primera visita',async()=>{
   await page.locator('#patientCip').fill('PRUEBA-SIN-DEMO');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#patientCip').inputValue()==='PRUEBA-SIN-DEMO','se borró CIP de prueba inválido');
   assert(await page.locator('#patientCip').getAttribute('aria-invalid')==='true','sin error de formato');
   await page.locator('#patientCip').fill('DEMO-SEG-NUEVO-01');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#patientName').isEnabled(),'no admite seguimiento sin ficha demo');
   assert((await page.locator('#cipStatus').textContent()).includes('sin primera visita guardada'),'se presupone primera visita');
   assert(!await page.locator('#visitForm').isVisible(),'no exige selección de PsO');
   await page.locator('#patientName').fill('Paciente ficticio seguimiento');
   await page.locator('#patientSex').selectOption('Mujer');
   await page.locator('#pathology').selectOption('pso');
   assert(await page.locator('#visitForm').isVisible(),'seguimiento de CIP nuevo no abre');
   assert((await page.locator('#followupContextStatus').textContent()).includes('No hay Primera Visita guardada'),'se inventó visita anterior');
   assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='','se infirió fecha actual');
  }],
  ['F2-3 Recorrido diferenciado 11 secciones, sin historia inicial ni fármacos de Primera',async()=>{
   const keys=await page.locator('#clinicalSections .section').evaluateAll(els=>els.map(x=>x.dataset.section));
   const expected=['01 Datos de consulta','11 Tratamiento seguimiento','06 Síntomas','04 Localizaciones','05 Exploración/PASI','07 DLQI','12 Seguimiento terapéutico','03 Comorbilidades','08 PURE-4','09 Derivaciones/plan','13 Plan'];
   assert(JSON.stringify(keys)===JSON.stringify(expected),'orden/grupos Seguimiento distintos: '+JSON.stringify(keys));
   assert(!keys.includes('02 Historia de PsO')&&!keys.includes('10 Tratamiento primera visita'),'arrastra capturas iniciales');
   assert((await page.locator('#visitSummaryHeading').textContent()).includes('Seguimiento'),'cabecera no distingue seguimiento');
   assert((await page.locator('[data-section="12 Seguimiento terapéutico"] > summary').textContent()).includes('Adherencia'),'sin valoración terapéutica');
  }],
  ['F2-4 Valor actual BSA/PGA y cuestionarios sin cálculo clínico',async()=>{
   await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
   await page.locator('[data-field="bsa"]').fill('0');
   await page.locator('[data-field="pga"]').selectOption('0');
   assert(await page.locator('[data-field="bsa"]').inputValue()==='0','BSA cero perdido');
   assert(await page.locator('[data-field="pga"]').inputValue()==='0','PGA cero perdido');
   assert((await page.locator('#pasiStatus').textContent()).includes('Sin cálculo clínico'),'PASI inferido');
   await page.locator('[data-section="07 DLQI"] > summary').click();
   assert(await page.locator('[data-question^="dlqi_q"]').count()===10,'DLQI incompleto en seguimiento');
   await page.locator('[data-field="dlqi_q1"]').selectOption('0');
   assert((await page.locator('.dlqi-candidate .derived').textContent()).includes('Sin cálculo clínico'),'DLQI calculado desde parcial');
   await page.locator('[data-section="08 PURE-4"] > summary').click();
   assert((await page.locator('[data-section="08 PURE-4"]').textContent()).includes('no habilitado'),'PURE-4 parece homologado');
   assert(await page.locator('[data-field="pure4_q1"]').count()===0,'PURE-4 ficticio se puede responder');
  }],
  ['F2-5 Tratamiento de Seguimiento independiente y sin dosis/vía/pauta',async()=>{
   const families=page.locator('[data-followup-family]');
   assert(await families.count()===4,'faltan chips de familias');
   await page.locator('[data-followup-family="biologicos"]').click();
   assert(await page.locator('[data-followup-family="biologicos"]').getAttribute('aria-pressed')==='true','familia no seleccionada');
   await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').fill('Secukinumab');
   for(const key of ['tx_seguimiento_biologicos_posologia_1','extra_tx_seguimiento_biologicos_dosis_1','extra_tx_seguimiento_biologicos_via_1']){
    assert(await page.locator('[data-field="'+key+'"]').inputValue()==='',key+' inferida');
   }
   assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').count()===0,'tratamiento Primera visible en F2');
  }],
  ['F2-6 Adherencia y ajuste solo si los declara el profesional',async()=>{
   await page.locator('[data-section="12 Seguimiento terapéutico"] > summary').click();
   const adherence=page.locator('[data-choice-field="seguimiento_adherencia_categoria"][data-choice-value="Buena"]');
   assert(await adherence.getAttribute('aria-pressed')==='false','se inventa adherencia');
   await adherence.click();
   assert(await page.locator('[data-choice-field="seguimiento_adherencia_categoria"][data-choice-value="Buena"]').getAttribute('aria-pressed')==='true','adherencia no registrada');
   const proposed=page.locator('[data-choice-field="extra_seg_decision_tipo"][data-choice-value="cambio_propuesto"]');
   await proposed.click();
   const adjust=page.locator('[data-field="seguimiento_ajuste_terapeutico"]');
   assert(await adjust.inputValue()==='','se inventa ajuste/switch');
   await adjust.fill('Revisión sintética, sin cambios inferidos');
   assert((await page.locator('[data-section="12 Seguimiento terapéutico"]').textContent()).includes('no habilitado'),'Morisky respondible');
   assert(await page.locator('[data-field="seguimiento_adherencia_morisky_q1"]').count()===0,'pregunta Morisky ficticia activada');
   await page.locator('[data-section="13 Plan"] > summary').click();
   assert(await page.locator('[data-field="extra_seg_proxima_fecha_prevista"]').inputValue()==='','fecha prevista inventada');
   assert(await page.locator('[data-field="proxima_revision"]').inputValue()==='','plazo inventado');
  }],
  ['F2-7 Primera Visita solo referencia de borrador, sin copiar dato anterior',async()=>{
   await page.getByRole('button',{name:'Primera Visita'}).click();
   assert(!await page.locator('#visitForm').isVisible(),'F1 heredó patología de F2');
   await page.locator('#pathology').selectOption('pso');
   await page.locator('[data-field="fecha_visita"]').fill('2026-11-10');
   await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
   await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').fill('Adalimumab');
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert(await page.locator('#pathology').inputValue()==='pso','seguimiento propio perdió PsO');
   assert((await page.locator('#followupContextStatus').textContent()).includes('BORRADOR SIN GUARDAR'),'se presenta como historia');
   assert((await page.locator('#followupContextStatus').textContent()).includes('NO se ha copiado'),'no explica ausencia de precarga');
   assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='','fecha Primera copiada a F2');
   assert(await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').inputValue()==='Secukinumab','borrador Seguimiento propio perdido');
   assert(!(await page.locator('#followupContext').textContent()).includes('Adalimumab'),'muestra tratamiento de Primera como vigente');
   if(process.env.DERMA_F2_DESKTOP_SCREENSHOT)await page.screenshot({path:process.env.DERMA_F2_DESKTOP_SCREENSHOT,fullPage:true});
   await page.locator('#patientCip').fill('DEMO-PSO-002');
   await page.locator('#lookupCip').click();
   assert(!await page.locator('#visitForm').isVisible(),'PsO de paciente anterior copiada');
   await page.locator('#pathology').selectOption('pso');
   assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA de otro paciente');
   assert((await page.locator('#followupContextStatus').textContent()).includes('No hay Primera Visita'),'borrador cruzado');
   await page.locator('#patientCip').fill('DEMO-SEG-NUEVO-01');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#pathology').inputValue()==='pso','no restauró patología propia');
   assert(await page.locator('[data-field="bsa"]').inputValue()==='0','no restauró cero propio');
  }],
  ['F2-8 Móvil y recarga limpios, sin falsa persistencia',async()=>{
   await page.setViewportSize({width:390,height:844});
   const sizes=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,local:localStorage.length,session:sessionStorage.length}));
   assert(sizes.scroll<=sizes.w+1,'desborde móvil: '+JSON.stringify(sizes));
   assert(sizes.local===0&&sizes.session===0&&(await page.context().cookies()).length===0,'persistencia indebida');
   assert(errors.length===0&&external.length===0,'errores consola/red '+JSON.stringify({errors,external}));
   if(process.env.DERMA_F2_SCREENSHOT)await page.screenshot({path:process.env.DERMA_F2_SCREENSHOT,fullPage:true});
   await page.reload({waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert(await page.locator('#patientCip').inputValue()==='','CIP sobrevivió a recarga');
   assert(await page.locator('#pathology').inputValue()==='','patología sobrevivió a recarga');
   await page.locator('#patientCip').fill('DEMO-SEG-NUEVO-01');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#patientName').inputValue()==='','identidad nueva persistida tras recarga');
   assert(errors.length===0&&external.length===0,'errores al recargar');
  }],
 ];
 for(const [name,test] of tests){
  try{await test();console.log('PASS '+name)}
  catch(e){console.error('FAIL '+name+' — '+e.message);process.exitCode=1;break;}
 }
}finally{
 if(browser)await browser.close();
 await new Promise(ok=>server.close(ok));
}
