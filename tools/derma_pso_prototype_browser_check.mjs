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
   if(await obes.getAttribute('aria-pressed')!=='false')throw Error('obesidad inferida');
   if(!await page.getByText('Sin seleccionar = no consignado').count())throw Error('falta semántica visible');
 });
 check('S4 cobertura fuente explícita',async()=>{
   if(!String(await page.locator('#fieldCoverage').textContent()).includes('174'))throw Error('cobertura visible no 174');
   const fieldKeys=await page.evaluate(()=>window.__dermaPrototypeFieldKeys||[]);
   if(fieldKeys.length!==174||new Set(fieldKeys).size!==174)throw Error('claves fuente erróneas');
 });
 check('S5 dosis sin inferencias',async()=>{
   await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
   const drug=page.locator('[data-field="tx_primera_biologicos_farmaco_1"]');
   await drug.selectOption('Secukinumab');
   const pos=await page.locator('[data-field="tx_primera_biologicos_posologia_1"]').inputValue();
   if(pos!=='')throw Error('posología inferida: '+pos);
 });
 check('S6 evaluaciones no homologadas',async()=>{
   await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
   await page.locator('[data-field="pasi_cabeza_eritema"]').selectOption('1');
   const status=await page.locator('#pasiStatus').textContent();
   if(!/sin cálculo|no homologado/i.test(status))throw Error('PASI calculado o sin cautela: '+status);
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
 });
 for(const [title,fn] of checks){
   try{await fn();console.log('PASS '+title)}catch(e){console.error('FAIL '+title+' — '+e.message);process.exitCode=1;break}
 }
 if(!process.exitCode && process.env.DERMA_SCREENSHOT_PATH)await page.screenshot({path:process.env.DERMA_SCREENSHOT_PATH,fullPage:true});
}finally{
 if(browser)await browser.close();
 await new Promise(done=>server.close(done));
}
