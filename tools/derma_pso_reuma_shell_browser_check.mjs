#!/usr/bin/env node
// DER-REUMA-UX: navegación real sintética sin DOM artificial, red externa ni persistencia.
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const http=createServer((req,res)=>{
  const file=path.resolve(ROOT,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
  if(!file.startsWith(ROOT+path.sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  createReadStream(file).pipe(res);
});
let browser;
const errors=[],external=[];
try{
 await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+http.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push('pageerror '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text())});
 page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url())});
 const assert=async(cond,msg)=>{if(!cond)throw new Error(msg)};
 const checks=[
  ['S1 Inicio y sidebar análogos a Reuma', async()=>{
   await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
   await assert(await page.locator('#homeView').isVisible(),'Inicio no visible');
   await assert(await page.getByText('Hub Clínico de',{exact:false}).isVisible(),'falta hero');
   await assert(await page.locator('#sidebarSearchButton').isVisible(),'buscador sidebar no visible');
   await assert(await page.locator('#patientNav').isDisabled(),'paciente accesible sin selección');
   await assert(await page.getByRole('button',{name:/Estadísticas/}).isDisabled(),'estadísticas aparentan operativas');
  }],
  ['S2 CIP desconocido no crea paciente', async()=>{
   await page.locator('#homeSearch').fill('DEMO-INEXISTENTE');
   await page.locator('#homeSearchButton').click();
   await assert(await page.getByRole('dialog').isVisible(),'Quick View ausente');
   await assert(await page.getByRole('dialog').getByText('No hay ficha en los datos sintéticos').isVisible(),'no avisa inexistente');
   await assert(await page.getByRole('dialog').getByRole('button',{name:/Iniciar Primera Visita/}).isVisible(),'falta acceso a primera visita para CIP demo desconocido');
   await assert(await page.locator('#patientNav').isDisabled(),'búsqueda inventó paciente antes de confirmación');
   await page.locator('#closeQuickView').click();
   await assert(!await page.getByRole('dialog').isVisible(),'Quick View no se cierra');
  }],
  ['S3 Quick View de paciente sintético, sin historia inventada', async()=>{
   await page.locator('#homeSearch').fill('demo-pso-001');
   await page.locator('#homeSearch').press('Enter');
   await assert(await page.getByRole('dialog').isVisible(),'quick view no abrió');
   await assert(await page.getByText('Patología registrada:').isVisible(),'falta estado clínico');
   await assert((await page.getByRole('dialog').locator('.quick-view-summary-card p').last().textContent()).includes('No consta'),'falsa historia');
   await assert(await page.getByRole('dialog').locator('.metric-grid').getByText('PASI').isVisible(),'falta índice orientativo');
   await page.getByRole('button',{name:'Ver Dashboard Completo'}).click();
   await assert(await page.locator('#patientDashboardView').isVisible(),'dashboard paciente no visible');
   await assert(!await page.getByRole('dialog').isVisible(),'overlay no cerró al navegar');
   await assert(await page.locator('#dashboardPatientId').textContent()==='DEMO-PSO-001','paciente incorrecto');
   await assert(!await page.locator('#patientNav').isDisabled(),'enlace Paciente sigue inaccesible');
   await assert((await page.locator('#patientNav small').textContent()).includes('Resumen sintético'),'sidebar indica seleccionar CIP aunque ya hay paciente');
   await assert(/sin historia persistida/i.test(await page.locator('#patientDashboardView .draft-pill').textContent()),'ausencia de historia no marcada');
  }],
  ['S4 Primera Visita conserva PsO y tratamiento seguro', async()=>{
   await page.getByRole('button',{name:'Primera Visita'}).click();
   await assert(await page.locator('#visitView').isVisible(),'primera visita no visible');
   await assert(!await page.locator('#visitForm').isVisible(),'se asumió patología');
   await page.locator('#pathology').selectOption('pso');
   await page.locator('#visitForm').waitFor({state:'visible'});
   await page.locator('[data-chip="comorb_hta"]').click();
   await assert(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')==='true','chip no marcado');
   await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
   await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').fill('Secukinumab');
   await assert(await page.locator('[data-field="tx_primera_biologicos_posologia_1"]').inputValue()==='','dosis inferida');
  }],
  ['S5 Búsqueda sidebar y Seguimiento independiente', async()=>{
   await page.locator('#patientSearch').fill('DEMO-PSO-001');
   await page.locator('#sidebarSearchButton').click();
   await assert(await page.getByRole('dialog').isVisible(),'no abrió Quick View desde sidebar');
   await assert(await page.getByRole('dialog').getByText('Borrador primera visita:').isVisible(),'falta trazabilidad borrador');
   await page.getByRole('button',{name:'Abrir Seguimiento'}).click();
   await assert(await page.locator('#visitView').isVisible(),'no navegó a seguimiento');
   await assert(!await page.locator('#visitForm').isVisible(),'se heredó patología entre actos');
   await page.locator('#pathology').selectOption('pso');
   await assert(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')==='false','fuga de datos entre visitas');
   await page.getByRole('button',{name:'Primera Visita'}).click();
   await assert(await page.locator('#pathology').inputValue()==='pso','visita original no restaurada');
   await assert(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')==='true','borrador primera no restaurado');
  }],
  ['S6 Cambio paciente no infiere patología', async()=>{
   await page.locator('#patientCip').fill('DEMO-PSO-002');await page.locator('#lookupCip').click();
   await assert(await page.locator('#pathology').inputValue()==='','patología inferida al cambiar paciente');
   await assert(!await page.locator('#visitForm').isVisible(),'formulario heredado entre pacientes');
   await page.locator('#pathology').selectOption('pso');
   await assert(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')==='false','datos heredados');
   await page.locator('#patientCip').fill('DEMO-PSO-001');await page.locator('#lookupCip').click();
   await assert(await page.locator('#pathology').inputValue()==='pso','no se restaura selección explícita previa');
   await assert(await page.locator('[data-chip="comorb_hta"]').getAttribute('aria-pressed')==='true','se perdió borrador de paciente original');
  }],
  ['S7 Cierre teclado de Quick View y vista Inicio', async()=>{
   await page.locator('#patientSearch').fill('DEMO-PSO-002');
   await page.locator('#patientSearch').press('Enter');
   await assert(await page.getByRole('dialog').isVisible(),'no abre desde Enter');
   await page.keyboard.press('Escape');
   await assert(!await page.getByRole('dialog').isVisible(),'Escape no cerró');
   await page.getByRole('button',{name:'Inicio'}).click();
   await assert(await page.locator('#homeView').isVisible(),'inicio no se restauró');
   await assert(!await page.locator('#visitView').isVisible(),'formulario visible en Inicio');
  }],
  ['S8 Sin persistencia, red externa ni consola', async()=>{
   await assert(errors.length===0,'consola '+JSON.stringify(errors));
   await assert(external.length===0,'red externa '+JSON.stringify(external));
   const st=await page.evaluate(()=>({ls:localStorage.length,ss:sessionStorage.length}));
   await assert(!st.ls&&!st.ss,'escribió storage');
   await assert((await page.context().cookies()).length===0,'escribió cookies');
   await page.reload({waitUntil:'networkidle'});
   await assert(await page.locator('#homeView').isVisible(),'no abre Inicio tras reload');
   await assert(await page.locator('#patientCip').inputValue()==='','identidad rehidratada sin origen');
   await assert(await page.locator('#pathology').inputValue()==='','patología rehidratada sin origen');
   await assert(errors.length===0&&external.length===0,'error tras recarga');
   await page.setViewportSize({width:390,height:844});
   const mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sidebarHeight:document.querySelector('.sidebar').getBoundingClientRect().height}));
   await assert(mobile.scrollWidth<=mobile.width+1,'desbordamiento horizontal móvil '+JSON.stringify(mobile));
   await assert(mobile.sidebarHeight<=460,'sidebar móvil demasiado alta '+JSON.stringify(mobile));
   await assert(await page.locator('#homeView').isVisible(),'Inicio no visible en móvil');
  }],
 ];
 for(const [label,fn] of checks){
   try{await fn();console.log('PASS '+label)}
   catch(e){console.error('FAIL '+label+' — '+e.message);process.exitCode=1;break}
 }
 if(!process.exitCode&&process.env.DERMA_SHELL_SCREENSHOT_PATH){
   await page.screenshot({path:process.env.DERMA_SHELL_SCREENSHOT_PATH,fullPage:true});
 }
}finally{
 if(browser)await browser.close();
 await new Promise(done=>http.close(done));
}
