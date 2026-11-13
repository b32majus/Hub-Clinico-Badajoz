#!/usr/bin/env node
// F3b · contrato RED: selección real en navegador de varios borradores PsO por CIP y circuito.
// Se prueba con controles públicos, nunca manipulando DOM interno o almacenamiento.
import {createServer} from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,extname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=createRequire('/home/hermes/.npm-global/lib/node_modules/__derma_playwright_loader.cjs')('playwright');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=createServer((req,res)=>{
  const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));
  if(!file.startsWith(root+'/')||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
  createReadStream(file).pipe(res);
});
const assert=(yes,message)=>{if(!yes)throw new Error(message)};
let browser;
try{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const host='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1360,height:850}});
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('request',r=>{if(new URL(r.url()).origin!==host)external.push(r.url())});
  const test=async(name,fn)=>{
    try{await fn();console.log('OK',name)}catch(e){console.error('FALLO',name,e.message);throw e}
  };
  await test('01 Primer borrador DEMO y selector por ID explícito',async()=>{
    await page.goto(host+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await page.locator('#patientCip').fill('DEMO-PSO-001');
    await page.locator('#lookupCip').click();
    assert(!(await page.locator('#visitForm').isVisible()),'sin patología se habilitó formulario');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('#visitForm').isVisible(),'no abre formulario tras selección explícita');
    assert(await page.locator('#draftVisitSelect').isVisible(),'falta selector de borrador por ID');
    assert(await page.locator('#newDemoVisit').isVisible(),'falta acción explícita nueva visita');
    const id=await page.locator('#draftVisitSelect').inputValue();
    assert(/^DEMO-VISIT-[A-Z0-9-]{3,32}$/.test(id),'ID sintético ausente o inválido: '+id);
    assert((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'falta aviso visible NO GUARDADO');
    assert((await page.locator('#draftScope').textContent()).includes(id),'no queda identificada la visita actual');
  });
  let first,second;
  await test('02 Nueva visita del mismo circuito no sobrescribe la anterior',async()=>{
    first=await page.locator('#draftVisitSelect').inputValue();
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    await page.locator('[data-field="bsa"]').fill('0');
    await page.locator('[data-field="pga"]').selectOption('0');
    await page.locator('[data-section="07 DLQI"] > summary').click();
    await page.locator('[data-field="dlqi_q1"]').selectOption('3');
    await page.locator('#newDemoVisit').click();
    second=await page.locator('#draftVisitSelect').inputValue();
    assert(second!==first && /^DEMO-VISIT-/.test(second),'la nueva visita recicló ID');
    assert(await page.locator('#draftVisitSelect option').count()>=2,'no hay dos visitas seleccionables');
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','la nueva visita heredó BSA');
    assert(await page.locator('[data-field="pga"]').inputValue()==='','la nueva visita heredó PGA');
  });
  await test('03 Reapertura aislada, cero verdadero y DLQI no homologado',async()=>{
    await page.locator('[data-field="bsa"]').fill('36');
    await page.locator('#draftVisitSelect').selectOption(first);
    assert(await page.locator('[data-field="bsa"]').inputValue()==='0','se perdió BSA cero del primer borrador');
    assert(await page.locator('[data-field="pga"]').inputValue()==='0','se perdió PGA cero');
    await page.locator('[data-section="07 DLQI"] > summary').click();
    assert(await page.locator('[data-field="dlqi_q1"]').inputValue()==='3','se perdió respuesta de borrador candidato');
    await page.locator('#draftVisitSelect').selectOption(second);
    assert(await page.locator('[data-field="bsa"]').inputValue()==='36','se mezclaron las dos visitas');
    await page.locator('[data-section="07 DLQI"] > summary').click();
    assert(await page.locator('[data-field="dlqi_q1"]').inputValue()==='','hereda cuestionario de otra visita');
    assert((await page.locator('.dlqi-candidate .derived').textContent()).includes('Sin cálculo clínico'),'se homologó DLQI implícitamente');
  });
  await test('04 Cambio de paciente no arrastra ni ofrece otra visita',async()=>{
    await page.locator('#patientCip').fill('DEMO-PSO-002');
    await page.locator('#lookupCip').click();
    assert(!(await page.locator('#visitForm').isVisible()),'se heredó patología de otro CIP');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','mezcla datos entre CIP');
    const options=await page.locator('#draftVisitSelect option').evaluateAll(els=>els.map(e=>e.value));
    assert(!options.includes(first)&&!options.includes(second),'aparecen IDs de otro CIP');
    await page.locator('#patientCip').fill('DEMO-PSO-001');
    await page.locator('#lookupCip').click();
    assert(await page.locator('#draftVisitSelect').inputValue()===second,'no se recupera la selección del CIP anterior');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='36','se perdieron respuestas por cambio paciente');
  });
  await test('05 Primera y seguimiento, sin precarga ni confusión de tratamiento',async()=>{
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(!(await page.locator('#visitForm').isVisible()),'patología Seguimiento inferida en Primera');
    await page.locator('#pathology').selectOption('pso');
    await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
    await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').fill('Adalimumab');
    const firstVisit=await page.locator('#draftVisitSelect').inputValue();
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    assert(await page.locator('#draftVisitSelect').inputValue()===second,'seguimiento no recupera selección propia');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='36','seguimiento perdió el valor');
    assert((await page.locator('#followupContextStatus').textContent()).includes('BORRADOR SIN GUARDAR'),'se presenta como historia');
    assert(!(await page.locator('#followupContext').textContent()).includes('Adalimumab'),'tratamiento previo inferido');
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(await page.locator('#draftVisitSelect').inputValue()===firstVisit,'primera no recupera selección propia');
    await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
    assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').inputValue()==='Adalimumab','tratamiento manual desaparece');
  });
  await test('06 Fecha explícita, no fecha de hoy, cambio sin pérdida',async()=>{
    assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='','fecha de visita inventada');
    await page.locator('[data-field="fecha_visita"]').fill('2026-11-08');
    const id=await page.locator('#draftVisitSelect').inputValue();
    await page.locator('#newDemoVisit').click();
    assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='','nueva visita heredó fecha');
    await page.locator('#draftVisitSelect').selectOption(id);
    assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='2026-11-08','se perdió fecha declarada');
    assert((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'se afirma persistencia');
  });
  await test('06b Multiprimera, teclado, etiqueta de fecha y rechazo explícito',async()=>{
    const earlier=await page.locator('#draftVisitSelect').inputValue();
    assert((await page.locator('#draftVisitSelect option:checked').textContent()).includes('2026-11-08'),'fecha de opción no sincronizada');
    if(await page.locator('[data-section="02 Historia de PsO"]').getAttribute('open')===null)
      await page.locator('[data-section="02 Historia de PsO"] > summary').click();
    await page.locator('[data-field="curso_evolutivo"]').selectOption('Brotes');
    await page.locator('#newDemoVisit').click();
    assert(await page.locator('#draftVisitSelect option').count()>=3,'no admite múltiples primeras visitas');
    assert(await page.locator('[data-field="curso_evolutivo"]').inputValue()==='','se copió historia al nuevo borrador');
    await page.locator('#draftVisitSelect').selectOption(earlier);
    assert(await page.locator('[data-field="curso_evolutivo"]').inputValue()==='Brotes','Primera Visita anterior perdió su contenido');
    await page.locator('#draftVisitSelect').focus();
    await page.keyboard.press('Tab');
    assert(await page.evaluate(()=>document.activeElement?.id)==='newDemoVisit','la navegación teclado no llega al botón');
    await page.keyboard.press('Enter');
    assert(await page.locator('#draftVisitSelect option').count()>=4,'nueva visita por teclado no creada');
    await page.locator('[data-field="fecha_visita"]').fill('1899-01-01');
    assert((await page.locator('#draftVisitStatus').textContent()).includes('Aviso del registro DEMO'),'fecha fuera de rango no falla de forma visible');
    await page.locator('[data-field="fecha_visita"]').fill('2026-11-09');
    assert((await page.locator('#draftVisitSelect option:checked').textContent()).includes('2026-11-09'),'fecha corregida no actualiza selector');
    assert(!(await page.locator('#draftVisitStatus').textContent()).includes('Aviso del registro DEMO'),'aviso no se limpia tras fecha válida');
  });
  await test('07 Sin guardado, sin solicitudes, sin consola ni servicios externos',async()=>{
    assert(errors.length===0,'errores consola: '+errors.join('; '));
    assert(external.length===0,'peticiones externas: '+external.join('; '));
    const storage=await page.evaluate(()=>({
      local:localStorage.length,session:sessionStorage.length,cookie:document.cookie,
    }));
    assert(storage.local===0&&storage.session===0&&storage.cookie==='','se usó almacenamiento');
    const labels=await page.locator('#visitView').textContent();
    assert(!/Guardar visita|Historial validado|Tratamiento validado por FH/i.test(labels),'afirmación de validación inexistente');
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await page.locator('#patientCip').fill('DEMO-PSO-001');
    await page.locator('#lookupCip').click();
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('#draftVisitSelect option').count()===1,'sobrevivieron visitas tras recargar');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','los datos persistieron contra contrato');
    assert(errors.length===0,'errores consola tras recargar: '+errors.join('; '));
  });
}finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
