#!/usr/bin/env node
// DER SAFE: solo UNA visita y UN paciente activos; ninguna visita previa recuperable.
// Solo controles soportados: clics, cambio CIP, confirmar/cancelar, navegación, reload.
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
  if(!path.startsWith(root+'/')||!existsSync(path)||!statSync(path).isFile()){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});
  createReadStream(path).pipe(res);
});
const check=(value,message)=>{if(!value)throw new Error(message)};
let browser;
try{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const url='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1360,height:840}});
  const errors=[],requests=[],dialogs=[],decisions=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('request',r=>{if(new URL(r.url()).origin!==url)requests.push(r.url())});
  page.on('dialog',async d=>{
    dialogs.push({type:d.type(),message:d.message()});
    const action=decisions.shift();
    if(action==='accept')await d.accept();else await d.dismiss();
  });
  const decision=action=>decisions.push(action);
  const test=async(name,fn)=>{
    await fn();console.log('OK',name);
  };
  const cip=page.locator('#patientCip');
  const active=()=>page.locator('#draftScope').textContent();
  await test('01 UI sin selector histórico y solo una visita activa',async()=>{
    await page.goto(url+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await cip.fill('DEMO-PSO-001');await page.locator('#lookupCip').click();
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('#visitForm').isVisible(),'formulario PsO no disponible');
    check(await page.locator('#draftVisitSelect').count()===0,'selector de visitas anteriores todavía existe');
    check(await page.locator('#newDemoVisit').isVisible(),'falta acción de nueva visita segura');
    check((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'falta aviso sin guardado');
    check(!(await page.locator('#visitForm').textContent()).includes('Cada una conserva'),'promete acumular borradores');
  });
  let first,second;
  await test('02 cancelar nueva visita conserva ÚNICAMENTE la actual',async()=>{
    first=await active();
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    await page.locator('[data-field="bsa"]').fill('0');
    await page.locator('[data-field="pga"]').selectOption('0');
    await page.locator('#newDemoVisit').click({timeout:5000}); // se descarta por defecto si no hay elección explícita
    check(await active()===first,'nueva visita se abrió sin confirmación');
    check(await page.locator('[data-field="bsa"]').inputValue()==='0','cancelación perdió BSA cero');
    check(dialogs.some(d=>d.type==='confirm'&&/descart/i.test(d.message)),'sin confirmación de descarte');
  });
  await test('03 aceptar nueva visita borra la anterior en vez de retenerla',async()=>{
    decision('accept');await page.locator('#newDemoVisit').click();
    second=await active();
    check(second!==first,'se reutilizó identidad de visita');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','la nueva visita heredó BSA');
    check(await page.locator('[data-field="pga"]').inputValue()==='','la nueva visita heredó PGA');
    check(await page.locator('#draftVisitSelect').count()===0,'se ofrece recuperar una visita descartada');
    check((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'la nueva visita parece guardada');
  });
  await test('04 cambiar circuito cancela o descarta, sin datos previos ni precargas',async()=>{
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    await page.locator('[data-field="bsa"]').fill('31');
    await page.getByRole('button',{name:'Primera Visita'}).click();
    check(await page.locator('#visitTitle').textContent()==='Seguimiento','cancelar cambió de circuito');
    check(await page.locator('[data-field="bsa"]').inputValue()==='31','cancelar descartó datos');
    decision('accept');await page.getByRole('button',{name:'Primera Visita'}).click();
    check(await page.locator('#visitTitle').textContent()==='Primera Visita','no cambió circuito');
    check(!(await page.locator('#visitForm').isVisible()),'heredó la patología o reabrió otra visita');
    check(await page.locator('#pathology').inputValue()==='','se infirió PsO en nueva visita');
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','apareció dato previo de Seguimiento');
    check(!(await page.locator('#followupContext').isVisible()),'se trasladó el contexto de Seguimiento');
  });
  await test('05 cambio CIP exige descarte y no conserva nombre ni historia',async()=>{
    const earlier=await active();
    await page.locator('#patientName').fill('Nombre ficticio temporal');
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    await page.locator('[data-field="bsa"]').fill('45');
    await cip.fill('DEMO-PSO-002');
    check(await cip.inputValue()==='DEMO-PSO-001','cancelar no restituye identidad');
    check(await active()===earlier,'cancelar modificó visita activa');
    check(await page.locator('[data-field="bsa"]').inputValue()==='45','cancelar perdió datos');
    decision('accept');await cip.fill('DEMO-PSO-002');await page.locator('#lookupCip').click();
    check(await cip.inputValue()==='DEMO-PSO-002','no seleccionó nuevo paciente');
    check(!(await page.locator('#visitForm').isVisible()),'se abrió consulta para nuevo CIP sin patología');
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','nuevo paciente heredó respuestas');
    await cip.fill('DEMO-PSO-001');await page.locator('#lookupCip').click();
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','recuperó 45 de un paciente abandonado');
    check(await page.locator('#patientName').inputValue()==='Paciente sintético A','conservó datos personales modificados de visita anterior');
  });
  await test('06 salida a Inicio descarta y nunca permite reanudar visita',async()=>{
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    await page.locator('[data-field="bsa"]').fill('28');
    await page.getByRole('button',{name:'Inicio'}).click();
    check(await page.locator('#visitView').isVisible(),'cancelación no mantuvo la consulta abierta');
    check(await page.locator('[data-field="bsa"]').inputValue()==='28','cancelación perdió BSA');
    decision('accept');await page.getByRole('button',{name:'Inicio'}).click();
    check(await page.locator('#homeView').isVisible(),'confirmación no vuelve a Inicio');
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    check(!(await page.locator('#visitForm').isVisible()),'se retomó visita descartada');
    await cip.fill('DEMO-PSO-001');await page.locator('#lookupCip').click();
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','se restauró visita al regresar de Inicio');
  });
  await test('07 navegación y recarga nunca almacenan datos en navegador',async()=>{
    const privacy=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}));
    check(privacy.local===0&&privacy.session===0&&!privacy.cookie,'persistencia en navegador detectada');
    check(requests.length===0,'peticiones externas: '+requests.join(','));
    check(errors.length===0,'errores JS: '+errors.join(';'));
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await cip.fill('DEMO-PSO-001');await page.locator('#lookupCip').click();
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','sobrevivió una visita tras recargar');
    check(errors.length===0,'errores JS tras recarga: '+errors.join(';'));
  });
  await test('08 PASI cero auténtico y tratamiento sin inferencia dentro de la visita activa',async()=>{
    const section=page.locator('[data-section="05 Exploración/PASI"]');
    if(await section.getAttribute('open')===null)await section.locator('summary').click();
    for(const region of ['cabeza','brazos','tronco','piernas']){
      for(const metric of ['eritema','induracion','escamas','area'])
        await page.locator('[data-field="pasi_'+region+'_'+metric+'"]').selectOption('0');
    }
    check((await page.locator('#pasiStatus').textContent()).includes('PASI calculado: 0,0'),'PASI 16 ceros no calculado');
    await page.locator('[data-followup-family="biologicos"]').click();
    await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').fill('Secukinumab');
    for(const key of ['tx_seguimiento_biologicos_posologia_1','extra_tx_seguimiento_biologicos_dosis_1','extra_tx_seguimiento_biologicos_via_1'])
      check(await page.locator('[data-field="'+key+'"]').inputValue()==='','dato terapéutico inferido '+key);
  });
  await test('09 Quick View no cambia de paciente sin descarte, ni arrastra datos',async()=>{
    await page.locator('#patientSearch').fill('DEMO-PSO-002');
    await page.locator('#sidebarSearchButton').click();
    check(!(await page.locator('#quickViewOverlay').isVisible()),'cancelar abrió otro paciente');
    check(await cip.inputValue()==='DEMO-PSO-001','cancelar cambió paciente');
    check((await page.locator('#pasiStatus').textContent()).includes('PASI calculado: 0,0'),'cancelar perdió PASI');
    decision('accept');await page.locator('#sidebarSearchButton').click();
    check(await page.getByRole('dialog').isVisible(),'no abre Quick View tras descarte');
    check(await cip.inputValue()==='DEMO-PSO-002','cambio autorizado no seleccionó nuevo paciente');
    await page.getByRole('button',{name:'Abrir Seguimiento'}).click();
    check(!(await page.locator('#visitForm').isVisible()),'Quick View heredó una visita');
    await page.locator('#pathology').selectOption('pso');
    check((await page.locator('#pasiStatus').textContent()).includes('0/16'),'se restauró PASI de otro paciente');
    await page.locator('[data-followup-family="biologicos"]').click();
    check(await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').inputValue()==='','tratamiento de otro paciente heredado');
  });
  await test('10 Dashboard descarta la visita anterior o respeta la cancelación',async()=>{
    const section=page.locator('[data-section="05 Exploración/PASI"]');
    if(await section.getAttribute('open')===null)await section.locator('summary').click();
    await page.locator('[data-field="bsa"]').fill('16');
    await page.locator('#patientNav').click();
    check(await page.locator('#visitView').isVisible(),'cancelar abrió Dashboard perdiendo consulta');
    check(await page.locator('[data-field="bsa"]').inputValue()==='16','cancelar perdió datos');
    decision('accept');await page.locator('#patientNav').click();
    check(await page.locator('#patientDashboardView').isVisible(),'Dashboard no se abrió tras descartar');
    check((await page.locator('#dashboardDraftCounts').textContent()).includes('Sin visitas guardadas'),'Dashboard retuvo borradores');
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    check(!await page.locator('#visitForm').isVisible(),'Dashboard reabrió PsO automáticamente');
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','Dashboard recuperó BSA antigua');
  });
  await test('11 Salida y vuelta de navegación no resucitan el estado de la visita',async()=>{
    const section=page.locator('[data-section="05 Exploración/PASI"]');
    if(await section.getAttribute('open')===null)await section.locator('summary').click();
    await page.locator('[data-field="bsa"]').fill('77');
    await page.goto(url+'/dermatologia_prototipo.html?otra-vista=1',{waitUntil:'domcontentloaded'});
    await page.goBack({waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await cip.fill('DEMO-PSO-002');await page.locator('#lookupCip').click();
    await page.locator('#pathology').selectOption('pso');
    check(await page.locator('[data-field="bsa"]').inputValue()==='','BFCache/navegación restauró datos abandonados');
    check(errors.length===0,'errores JS: '+errors.join('; '));
  });
  await test('12 Móvil: una sola visita visible y cero almacenamiento',async()=>{
    await page.setViewportSize({width:390,height:844});
    const state=await page.evaluate(()=>({
      w:innerWidth,scroll:document.documentElement.scrollWidth,
      local:localStorage.length,session:sessionStorage.length,cookie:document.cookie,
    }));
    check(state.scroll<=state.w+1,'desbordamiento horizontal móvil');
    check(state.local===0&&state.session===0&&!state.cookie,'almacenamiento persistente en móvil');
    check(await page.locator('#newDemoVisit').isVisible(),'acción de descarte no visible en móvil');
    check(await page.locator('#draftVisitSelect').count()===0,'selector histórico visible en móvil');
    check(errors.length===0,'errores JS móvil: '+errors.join('; '));
  });
}finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
