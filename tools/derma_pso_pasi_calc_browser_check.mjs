#!/usr/bin/env node
// PASI F2: UI-supported calculation scenarios, synthetic CIP, no DOM overrides.
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,extname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=createServer((req,res)=>{
 const p=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
 if(!p.startsWith(root+'/')||!existsSync(p)||!statSync(p).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream'});createReadStream(p).pipe(res);
});
const assert=(x,m)=>{if(!x)throw new Error(m)};
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:880}});
 const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url())});
 const metrics=['eritema','induracion','escamas','area'];
 const regionNames=['cabeza','tronco','brazos','piernas'];
 const keys=regionNames.flatMap(r=>metrics.map(m=>'pasi_'+r+'_'+m));
 const select=async(key,value)=>page.locator('[data-field="'+key+'"]').selectOption(value);
 const status=async()=>page.locator('#pasiStatus').textContent();
 const open=async()=>{const s=page.locator('[data-section="05 Exploración/PASI"]');if((await s.getAttribute('open'))===null)await s.locator('summary').click()};
 const fillAll=async(value)=>{for(const k of keys)await select(k,value)};
 const go=async(cip,visit='Seguimiento')=>{
   await page.getByRole('button',{name:visit,exact:true}).click();
   await page.locator('#patientCip').fill(cip);
   await page.locator('#lookupCip').click();
   await page.locator('#pathology').selectOption('pso');
   await open();
 };
 const tests=[
  ['P1 Sin datos no calcula ni muestra cero inferido',async()=>{
   await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
   await go('DEMO-PASI-TEST-01');
   assert((await status()).includes('0/16'),'sin progreso 0/16');
   assert(!(await status()).includes('0,0 / 72'),'0 inferido sin datos');
   assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA inventada');
  }],
  ['P2 Parcial no calcula aunque haya ceros legítimos',async()=>{
   await select('pasi_cabeza_eritema','0');
   await select('pasi_cabeza_area','0');
   assert((await status()).includes('2/16'),'no cuenta ceros consignados');
   assert(!(await status()).includes('/ 72'),'resultado parcial mostrado');
  }],
  ['P3 16 ceros = PASI 0,0 (cero legítimo)',async()=>{
   await fillAll('0');
   assert((await status()).includes('0,0 / 72'),'PASI cero incorrecto '+await status());
   assert((await status()).includes('no validado'),'sin aviso de no homologación');
   assert((await page.locator('#draftStatus').textContent()).includes('16 respuestas'),'PASI derivado contaminó las entradas: '+await page.locator('#draftStatus').textContent());
  }],
  ['P4 16 puntuaciones máximas = PASI 72,0',async()=>{
   for(const k of keys)await select(k,k.endsWith('_area')?'6':'4');
   assert((await status()).includes('72,0 / 72'),'PASI máximo incorrecto '+await status());
  }],
  ['P5 Ponderaciones: cabeza 2+1+3 x área 4 = 2,4',async()=>{
   await fillAll('0');
   await select('pasi_cabeza_eritema','2');
   await select('pasi_cabeza_induracion','1');
   await select('pasi_cabeza_escamas','3');
   await select('pasi_cabeza_area','4');
   assert((await status()).includes('2,4 / 72'),'ponderación cabeza incorrecta '+await status());
   assert((await page.locator('#pasiStatus').textContent()).includes('no validado'),'falta advertencia');
   if(process.env.DERMA_PASI_DESKTOP)await page.locator('[data-section="05 Exploración/PASI"]').screenshot({path:process.env.DERMA_PASI_DESKTOP});
  }],
  ['P5b Los cuatro pesos anatómicos son correctos, no solo el máximo',async()=>{
   const expected={cabeza:'2,4',brazos:'4,8',tronco:'7,2',piernas:'9,6'};
   for(const [region,number] of Object.entries(expected)){
     await fillAll('0');
     await select('pasi_'+region+'_eritema','2');
     await select('pasi_'+region+'_induracion','1');
     await select('pasi_'+region+'_escamas','3');
     await select('pasi_'+region+'_area','4');
     assert((await status()).includes(number+' / 72'),region+' mal ponderada '+await status());
   }
   await fillAll('0');
   await select('pasi_cabeza_eritema','2');
   await select('pasi_cabeza_induracion','1');
   await select('pasi_cabeza_escamas','3');
   await select('pasi_cabeza_area','4');
  }],
  ['P6 Contradicción área cero con severidad positiva bloquea resultado',async()=>{
   await select('pasi_cabeza_area','0');
   const x=await status();
   assert(x.includes('Revisar')&&!x.includes('/ 72'),'no bloquea datos incoherentes: '+x);
   await select('pasi_cabeza_area','4');
   assert((await status()).includes('2,4 / 72'),'no recupera resultado válido');
  }],
  ['P7 Eliminar componente invalida resultado; PGA/BSA no recalculan PASI',async()=>{
   await page.locator('[data-field="pasi_piernas_area"]').selectOption('');
   assert((await status()).includes('15/16')&&!(await status()).includes('/ 72'),'se conserva score con faltante');
   await select('pasi_piernas_area','0');
   const old=await status();
   await page.locator('[data-field="bsa"]').fill('9');
   await page.locator('[data-field="pga"]').selectOption('5');
   assert(await status()===old,'BSA/PGA cambian PASI contra fórmula');
  }],
  ['P8 Cambio de visita/paciente descarta PASI, Primera no lo calcula',async()=>{
   let discarded=false;
   page.once('dialog',async dialog=>{discarded=true;await dialog.accept()});
   await page.getByRole('button',{name:'Primera Visita'}).click();
   assert(discarded,'no confirmó descarte del PASI de Seguimiento');
   assert(!await page.locator('#visitForm').isVisible(),'F1 heredó PsO');
   await page.locator('#pathology').selectOption('pso');
   assert((await status()).includes('Sin cálculo clínico'),'F1 calcula PASI clínico');
   await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
   assert(!await page.locator('#visitForm').isVisible(),'Seguimiento heredó PsO');
   await page.locator('#pathology').selectOption('pso');
   await open();
   assert((await status()).includes('0/16'),'PASI descartado se recuperó');
   await page.locator('[data-field="bsa"]').fill('23');
   await page.locator('#patientCip').fill('DEMO-PASI-TEST-02');
   assert(await page.locator('#visitForm').getAttribute('inert')!==null,'edición clínica permitida con CIP sin validar');
   discarded=false;
   page.once('dialog',async dialog=>{discarded=true;await dialog.accept()});
   await page.locator('#lookupCip').click();
   assert(discarded,'no confirmó descarte al cambiar paciente con BSA');
   assert(!await page.locator('#visitForm').isVisible(),'PsO de otro CIP asumida');
   await page.locator('#pathology').selectOption('pso');
   await open();
   assert((await status()).includes('0/16'),'PASI de otro CIP transferido');
   assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA de otro paciente transferida');
   await page.locator('#patientCip').fill('DEMO-PASI-TEST-01');
   await page.locator('#lookupCip').click();
   assert(await page.locator('#pathology').inputValue()==='','se recuperó PsO anterior');
   await page.locator('#pathology').selectOption('pso');
   await open();
   assert((await status()).includes('0/16'),'se recuperó PASI descartado al regresar');
  }],
  ['P9 Mobile, recarga y privacidad local-first',async()=>{
   await page.setViewportSize({width:390,height:844});
   const shape=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,ls:localStorage.length,ss:sessionStorage.length}));
   assert(shape.scroll<=shape.width+1,'overflow móvil '+JSON.stringify(shape));
   assert(shape.ls===0&&shape.ss===0&&(await page.context().cookies()).length===0,'persistencia indebida');
   assert(errors.length===0&&external.length===0,'consola/red '+JSON.stringify({errors,external}));
   if(process.env.DERMA_PASI_SHOT)await page.screenshot({path:process.env.DERMA_PASI_SHOT,fullPage:true});
   await page.reload({waitUntil:'networkidle'});
   await go('DEMO-PASI-TEST-01');
   assert((await status()).includes('0/16'),'PASI persistió tras recarga');
  }],
 ];
 for(const [name,fn] of tests){
  try{await fn();console.log('PASS '+name)}
  catch(e){console.error('FAIL '+name+': '+e.message);process.exitCode=1;break}
 }
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
