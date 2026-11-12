#!/usr/bin/env node
// Regression: CIP nuevo desde Primera Visita e Inicio/sidebar — interacciones reales con datos DEMO únicamente.
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const server=createServer((req,res)=>{
  const f=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
  if(!f.startsWith(root+'/')||!existsSync(f)||!statSync(f).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream'});
  createReadStream(f).pipe(res);
});
let browser;
const assert=(x,m)=>{if(!x)throw Error(m)};
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1300,height:820}});
 const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url())});
 const tests=[
  ['C1 CIP incorrecto: valor permanece + aviso de validación accesible',async()=>{
   await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Primera Visita'}).click();
   await page.locator('#patientCip').fill('PRUEBA-NUEVA');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#patientCip').inputValue()==='PRUEBA-NUEVA','CIP borrado sin posibilidad de corregir');
   assert(await page.locator('#patientCip').getAttribute('aria-invalid')==='true','no se indica CIP erróneo');
   assert((await page.locator('#cipStatus').textContent()).includes('DEMO-'),'no hay ayuda sobre identificador sintético');
   assert(!await page.locator('#patientName').isEnabled(),'identidad no valida activa');
   assert(!await page.locator('#visitForm').isVisible(),'abre acto para identificador inválido');
  }],
  ['C2 CIP ficticio nuevo guía al profesional al nombre, sexo y patología',async()=>{
   await page.locator('#patientCip').fill('DEMO-CIP-999');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#patientCip').inputValue()==='DEMO-CIP-999','CIP nuevo no retenido');
   assert(await page.locator('#patientName').isEnabled(),'nombre no habilitado');
   assert(await page.locator('#patientName').evaluate(el=>document.activeElement===el),'foco no guía al siguiente campo');
   assert((await page.locator('#cipStatus').textContent()).includes('Psoriasis'),'mensaje no explica paso para mostrar formulario');
   assert(await page.locator('#pathology').inputValue()==='','patología inferida');
   assert(!await page.locator('#visitForm').isVisible(),'formulario aparece sin patología');
   await page.locator('#patientName').fill('Persona ficticia');
   await page.locator('#patientSex').selectOption('Otro');
   await page.locator('#pathology').selectOption('pso');
   assert(await page.locator('#visitForm').isVisible(),'no abre con selección explícita PsO');
  }],
  ['C3 CIP sintético desconocido en Inicio abre Primera Visita por acción',async()=>{
   await page.getByRole('button',{name:'Inicio'}).click();
   await page.locator('#homeSearch').fill('DEMO-NUEVO-888');
   await page.locator('#homeSearchButton').click();
   const modal=page.getByRole('dialog');
   assert(await modal.isVisible(),'no muestra búsqueda sin resultados');
   assert(await modal.getByRole('button',{name:/Iniciar Primera Visita/}).isVisible(),'no propone iniciar visita');
   await modal.getByRole('button',{name:/Iniciar Primera Visita/}).click();
   assert(await page.locator('#visitView').isVisible(),'no navega desde Inicio');
   assert(!await modal.isVisible(),'modal no se cerró');
   assert(await page.locator('#patientCip').inputValue()==='DEMO-NUEVO-888','no conserva CIP buscado');
   assert(await page.locator('#patientName').isEnabled(),'no habilita identificación');
   assert(await page.locator('#patientName').evaluate(el=>document.activeElement===el),'no guía al nombre');
   assert(await page.locator('#pathology').inputValue()==='','no exige PsO expresa');
   assert(!await page.locator('#visitForm').isVisible(),'abre sin selección de patología');
  }],
  ['C4 Buscador lateral: idéntica acción con otro CIP nuevo',async()=>{
   await page.locator('#patientSearch').fill('DEMO-LATERAL-222');
   await page.locator('#sidebarSearchButton').click();
   const dialog=page.getByRole('dialog');
   assert(await dialog.getByRole('button',{name:/Iniciar Primera Visita/}).isVisible(),'CTA ausente lateral');
   await dialog.getByRole('button',{name:/Iniciar Primera Visita/}).click();
   assert(await page.locator('#patientCip').inputValue()==='DEMO-LATERAL-222','CIP lateral no pasó a visita');
   assert(!await page.locator('#visitForm').isVisible(),'patología heredada');
  }],
  ['C5 Buscador general no invita a crear CIP no sintéticos',async()=>{
   await page.getByRole('button',{name:'Inicio'}).click();
   await page.locator('#homeSearch').fill('PRUEBA-NO-DEMO');
   await page.locator('#homeSearchButton').click();
   const dialog=page.getByRole('dialog');
   assert((await dialog.innerText()).includes('DEMO-'),'no informa que debe ser ficticio');
   assert(await dialog.getByRole('button',{name:/Iniciar Primera Visita/}).count()===0,'invita a crear identificadores potencialmente reales');
   await page.keyboard.press('Escape');
   assert(!await dialog.isVisible(),'escape no cierra');
  }],
  ['C6 Sin datos cruzados, sin storage, sin errores y responsive',async()=>{
   await page.getByRole('button',{name:'Primera Visita'}).click();
   await page.locator('#patientCip').fill('DEMO-CIP-999');await page.locator('#lookupCip').click();
   assert(await page.locator('#patientName').inputValue()==='Persona ficticia','se perdió perfil temporal propio');
   await page.locator('#patientCip').fill('DEMO-LATERAL-222');await page.locator('#lookupCip').click();
   assert(await page.locator('#patientName').inputValue()==='','datos de otro paciente copiados');
   await page.setViewportSize({width:390,height:844});
   const r=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,storage:localStorage.length+sessionStorage.length}));
   assert(r.scroll<=r.w+1,'overflow móvil');
   assert(r.storage===0&&(await page.context().cookies()).length===0,'almacenamiento no aprobado');
   assert(errors.length===0&&external.length===0,'errores/red externa '+JSON.stringify({errors,external}));
   await page.reload({waitUntil:'networkidle'});
   assert(await page.locator('#patientCip').inputValue()==='','CIP persistió tras reload');
  }],
 ];
 for(const [label,fn] of tests){
  try{await fn();console.log('PASS '+label)}
  catch(e){console.error('FAIL '+label+': '+e.message);process.exitCode=1;break}
 }
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
