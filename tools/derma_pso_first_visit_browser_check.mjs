#!/usr/bin/env node
/**
 * First Visit F1: navegador real, pacientes demo, sin persistencia ni cálculos clínicos.
 * No muta DOM ni crea fixtures artificiales: usa UI soportada.
 */
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,extname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
  const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,''));
  if(!file.startsWith(root+'/')||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':contentTypes[extname(file)]||'application/octet-stream'});
  createReadStream(file).pipe(res);
});
let browser;
const logs=[],external=[];
const assert=(ok,label)=>{if(!ok)throw new Error(label)};
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:900}});
 page.on('pageerror',e=>logs.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')logs.push('console: '+m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url())});
 const tests=[
  ['F1-1 Paciente y PsO explícitos',async()=>{
    await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(!await page.locator('#visitForm').isVisible(),'formulario sin paciente/diagnóstico');
    assert(!await page.locator('#firstVisitGuide').isVisible(),'guía sin patología');
    await page.locator('#demoPatient').selectOption('DEMO-PSO-001');
    assert(!await page.locator('#visitForm').isVisible(),'formulario sin diagnóstico');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('#firstVisitGuide').isVisible(),'guía no se activó');
  }],
  ['F1-2 Índice de 11 apartados y navegación real',async()=>{
    assert(await page.locator('[data-jump-section]').count()===11,'11 secciones no accesibles');
    assert(await page.locator('.first-visit-section-nav__group').count()===4,'grupos editoriales incorrectos');
    assert((await page.locator('#firstVisitProgress').textContent()).includes('0 de 11'),'progreso inicial no vacío');
    await page.locator('#firstVisitNextPending').click();
    assert(await page.locator('[data-section="01 Datos de consulta"]').getAttribute('open')!==null,'primer apartado no abrió');
    assert(await page.locator('[data-section="01 Datos de consulta"] > summary').evaluate(el=>document.activeElement===el),'foco no se movió al apartado');
    await page.locator('[data-jump-section="05 Exploración/PASI"]').click();
    assert(await page.locator('[data-section="05 Exploración/PASI"]').getAttribute('open')!==null,'índice no abrió exploración');
    assert(await page.locator('[data-jump-section="05 Exploración/PASI"]').getAttribute('aria-current')==='step','índice no indica destino');
  }],
  ['F1-3 Cero válido, ausencia distinta y solo cuenta de borrador',async()=>{
    await page.locator('[data-field="pga"]').selectOption('0');
    assert((await page.locator('#firstVisitProgress').textContent()).includes('1 de 11'),'cero válido no cuenta como respuesta');
    assert((await page.locator('[data-jump-section="05 Exploración/PASI"]').textContent()).includes('1 respuesta'),'apartado no refleja el 0 registrado');
    const absent=await page.locator('[data-jump-section="04 Localizaciones"]').textContent();
    assert(absent.includes('Sin consignar'),'ausencia de registro aparece como dato');
    await page.locator('[data-jump-section="01 Datos de consulta"]').click();
    await page.locator('[data-field="fecha_visita"]').fill('2026-11-12');
    assert((await page.locator('#firstVisitProgress').textContent()).includes('2 de 11'),'fecha explícita no cuenta');
    assert(!(await page.locator('#firstVisitGuide').textContent()).includes('validado clínicamente'),'se anuncia validación no realizada');
  }],
  ['F1-4 Chips y revisión explícita, sin negativos inferidos',async()=>{
    await page.locator('[data-chip="comorb_hta"]').click();
    assert(await page.locator('[data-chip="comorb_obesidad"]').getAttribute('data-status')==='unknown','obesidad inferida');
    assert((await page.locator('#firstVisitProgress').textContent()).includes('3 de 11'),'chip positivo no contó');
    let canceled=false;
    page.once('dialog',async dialog=>{canceled=true;await dialog.dismiss()});
    await page.locator('[data-section="03 Comorbilidades"] [data-review]').click();
    assert(canceled&&await page.locator('[data-chip="comorb_obesidad"]').getAttribute('data-status')==='unknown','cancelación alteró negativos');
    let accepted=false;
    page.once('dialog',async dialog=>{accepted=true;await dialog.accept()});
    await page.locator('[data-section="03 Comorbilidades"] [data-review]').click();
    assert(accepted&&await page.locator('[data-chip="comorb_obesidad"]').getAttribute('data-status')==='absent','ausencia no registrada tras confirmar');
    assert((await page.locator('[data-jump-section="03 Comorbilidades"]').textContent()).includes('Chips revisados'),'no refleja revisión explícita del grupo');
    assert(await page.locator('[data-chip="loc_tronco"]').getAttribute('data-status')==='unknown','contaminó otras secciones');
  }],
  ['F1-5 Siguiente apartado y tratamiento sin inferencia',async()=>{
    await page.locator('[data-jump-section="02 Historia de PsO"]').click();
    await page.locator('[data-section="02 Historia de PsO"] [data-next-first-section]').click();
    assert(await page.locator('[data-section="03 Comorbilidades"] > summary').evaluate(el=>document.activeElement===el),'siguiente apartado no navega');
    await page.locator('[data-jump-section="10 Tratamiento primera visita"]').click();
    await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').selectOption('Secukinumab');
    assert(await page.locator('[data-field="tx_primera_biologicos_posologia_1"]').inputValue()==='','posología inferida');
    assert((await page.locator('[data-jump-section="10 Tratamiento primera visita"]').textContent()).includes('1 respuesta'),'línea explícita no aparece contada');
    assert((await page.locator('#pasiStatus').textContent()).includes('Sin cálculo clínico'),'se ha generado PASI no homologado');
  }],
  ['F1-6 Aislamiento pacientes y circuitos',async()=>{
    const before=await page.locator('#firstVisitProgress').textContent();
    await page.locator('#demoPatient').selectOption('DEMO-PSO-002');
    assert(!await page.locator('#firstVisitGuide').isVisible(),'borrador visible sin elección en otro paciente');
    await page.locator('#pathology').selectOption('pso');
    assert((await page.locator('#firstVisitProgress').textContent()).includes('0 de 11'),'datos del paciente A copiados al B');
    await page.locator('#demoPatient').selectOption('DEMO-PSO-001');
    assert(await page.locator('#firstVisitProgress').textContent()===before,'borrador A no restauró conteos');
    await page.getByRole('button',{name:'Seguimiento'}).click();
    assert(!await page.locator('#firstVisitGuide').isVisible(),'índice Primera activo en seguimiento');
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert((await page.locator('#firstVisitProgress').textContent())===before,'borrador Primera perdido tras Seguimiento');
    if(process.env.DERMA_FIRST_VISIT_DESKTOP)await page.screenshot({path:process.env.DERMA_FIRST_VISIT_DESKTOP,fullPage:true});
  }],
  ['F1-7 Móvil y ausencia de errores',async()=>{
    await page.setViewportSize({width:390,height:844});
    const width=await page.evaluate(()=>({window:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert(width.scroll<=width.window+1,'scroll horizontal '+JSON.stringify(width));
    assert(await page.locator('#firstVisitSectionNav').isVisible(),'índice no accesible en móvil');
    assert(logs.length===0&&external.length===0,'consola/red '+JSON.stringify({logs,external}));
    if(process.env.DERMA_FIRST_VISIT_MOBILE)await page.screenshot({path:process.env.DERMA_FIRST_VISIT_MOBILE,fullPage:true});
  }],
  ['F1-8 Recarga y falta de persistencia',async()=>{
    const st=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));
    assert(st.local===0&&st.session===0&&(await page.context().cookies()).length===0,'escritura no autorizada');
    await page.reload({waitUntil:'networkidle'});
    assert(await page.locator('#homeView').isVisible(),'Inicio tras reload');
    await page.getByRole('button',{name:'Primera Visita'}).click();
    await page.locator('#demoPatient').selectOption('DEMO-PSO-001');
    await page.locator('#pathology').selectOption('pso');
    assert((await page.locator('#firstVisitProgress').textContent()).includes('0 de 11'),'guardado tácito en reload');
    assert(logs.length===0&&external.length===0,'errores tras reload');
  }],
 ];
 for(const [label,fn] of tests){
   try{await fn();console.log('PASS '+label);}
   catch(e){console.error('FAIL '+label+' — '+e.message);process.exitCode=1;break;}
 }
 if(!process.exitCode&&process.env.FIRST_VISIT_SCREENSHOT){
   await page.screenshot({path:process.env.FIRST_VISIT_SCREENSHOT,fullPage:true});
 }
}finally{
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
