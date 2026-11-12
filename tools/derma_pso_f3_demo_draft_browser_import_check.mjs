#!/usr/bin/env node
// F3a BROWSER COMPATIBILITY ONLY: no integration, no UI, no histories.
import {createServer} from 'node:http';
import {existsSync,statSync,createReadStream} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 const f=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
 if(!f.startsWith(root+'/')||!existsSync(f)||!statSync(f).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream'});
 createReadStream(f).pipe(res);
});
const assert=(x,m)=>{if(!x)throw new Error(m)};
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1160,height:780}});
 const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url())});
 await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
 assert(await page.getByRole('button',{name:'Primera Visita'}).count()===1,'La app actual no carga');
 console.log('PASS F3B-01 Pantalla anterior continúa cargando sin F3');
 const outcome=await page.evaluate(async()=>{
  const mod=await import('/modules/derma/pso_demo_visit_drafts.js');
  const registry=mod.createPsoDemoVisitDraftRegistry();
  const input={siteId:'DEMO-SITE-TEST',patientCip:'DEMO-CIP-TEST99',
     visitType:'seguimiento',pathology:'pso',clinicalDate:null,provenance:'synthetic-manual-entry'};
  registry.createDraft({...input,visitId:'DEMO-VISIT-AAA'});
  registry.createDraft({...input,visitId:'DEMO-VISIT-BBB'});
  registry.setAnswers('DEMO-VISIT-AAA',{bsa:'0'},{expectedRevision:0});
  return {
   count:registry.listDraftMetadata({siteId:input.siteId,patientCip:input.patientCip,pathology:'pso'}).length,
   own:registry.readDraft('DEMO-VISIT-AAA').answers.bsa,
   other:registry.readDraft('DEMO-VISIT-BBB').answers.bsa,
   prior:registry.earlierDatedDraftMetadata({currentVisitId:'DEMO-VISIT-AAA',asOfDate:'2026-11-13'}).length,
   local:localStorage.length,session:sessionStorage.length,
  };
 });
 assert(outcome.count===2&&outcome.own==='0'&&outcome.other===undefined,'Aislamiento F3a falla en Chromium');
 console.log('PASS F3B-02 Módulo puro ESM importa y aísla dos borradores en Chromium');
 assert(outcome.prior===0,'Un borrador sin fecha se presenta como previo');
 console.log('PASS F3B-03 Fecha vacía no genera un previo');
 assert(outcome.local===0&&outcome.session===0&&(await page.context().cookies()).length===0,'Storage inesperado');
 assert(errors.length===0&&external.length===0,'Consola o red externa '+JSON.stringify({errors,external}));
 console.log('PASS F3B-04 Sin red, storage, cookies ni errores');
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok))}
console.log('F3A_CHROMIUM_MODULE_4_4_PASS (no QA UI F3)');
