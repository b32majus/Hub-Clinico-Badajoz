#!/usr/bin/env node
// F3b · reconciliación de contrato: UNA visita DEMO / UN paciente activo.
// El nombre histórico del script se conserva para los invocadores existentes.
// UI y Chromium reales, sin manipular DOM, storage ni estado clínico inyectado.
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
  if(!file.startsWith(root+'/')||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
  createReadStream(file).pipe(res);
});
const assert=(value,message)=>{if(!value)throw new Error(message)};
let browser;
try{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const host='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1360,height:850}});
  const errors=[],external=[],dialogs=[],decisions=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('request',r=>{if(new URL(r.url()).origin!==host)external.push(r.url())});
  page.on('dialog',async dialog=>{
    dialogs.push({type:dialog.type(),message:dialog.message()});
    const choice=decisions.shift();
    if(choice==='accept')await dialog.accept();
    else await dialog.dismiss();
  });
  const check=async(name,fn)=>{
    try{await fn();console.log('OK',name)}catch(error){console.error('FALLO',name,error.message);throw error}
  };
  const open=async key=>{
    const section=page.locator('[data-section="'+key+'"]');
    if((await section.getAttribute('open'))===null)await section.locator('summary').click();
  };
  const currentId=async()=>{
    const label=await page.locator('#draftScope').textContent();
    const match=label.match(/DEMO-VISIT-[A-Z0-9-]{3,32}/);
    assert(!!match,'ID sintético de la única visita no visible: '+label);
    return match[0];
  };
  const confirm=async(choice,action)=>{
    const count=dialogs.length;
    decisions.push(choice);
    await action();
    assert(dialogs.length===count+1,'no solicitó confirmar descarte de una visita con datos');
    assert(dialogs.at(-1).type==='confirm'&&/descart/i.test(dialogs.at(-1).message),'diálogo no informa descarte');
    assert(decisions.length===0,'diálogo no consumido');
  };
  const selectPatient=async cip=>{
    await page.locator('#patientCip').fill(cip);
    await page.locator('#lookupCip').click();
    assert(await page.locator('#patientCip').inputValue()===cip,'CIP no seleccionado: '+cip);
  };

  let first,second;
  await check('01 Única visita DEMO e identificación visible sin selector histórico',async()=>{
    await page.goto(host+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await selectPatient('DEMO-PSO-001');
    assert(!await page.locator('#visitForm').isVisible(),'formulario sin patología explícita');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('#visitForm').isVisible(),'formulario no habilitado tras seleccionar PsO');
    assert(await page.locator('#draftVisitSelect').count()===0,'persiste selector multivisita');
    assert(await page.locator('#newDemoVisit').isVisible(),'no existe acción de nueva visita');
    first=await currentId();
    assert((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'afirma guardado no real');
    assert((await page.locator('#draftVisitsHeading').textContent()).includes('Única visita'),'no informa unicidad');
  });
  await check('02 Cancelar conserva actual; aceptar nueva visita descarta BSA, PGA y DLQI',async()=>{
    await open('05 Exploración/PASI');
    await page.locator('[data-field="bsa"]').fill('0');
    await page.locator('[data-field="pga"]').selectOption('0');
    await open('07 DLQI');
    await page.locator('[data-field="dlqi_q1"]').selectOption('3');
    await confirm('dismiss',()=>page.locator('#newDemoVisit').click());
    assert(await currentId()===first,'cancelación cambió de visita');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='0','cancelación perdió BSA cero');
    assert(await page.locator('[data-field="pga"]').inputValue()==='0','cancelación perdió PGA cero');
    assert(await page.locator('[data-field="dlqi_q1"]').inputValue()==='3','cancelación perdió DLQI');
    await confirm('accept',()=>page.locator('#newDemoVisit').click());
    second=await currentId();
    assert(first!==second,'la nueva visita reutilizó el ID anterior');
    await open('05 Exploración/PASI');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA heredada');
    assert(await page.locator('[data-field="pga"]').inputValue()==='','PGA heredada');
    await open('07 DLQI');
    assert(await page.locator('[data-field="dlqi_q1"]').inputValue()==='','DLQI heredado');
    assert(await page.locator('#draftVisitSelect').count()===0,'se ofrece recuperar visita descartada');
  });
  await check('03 Cero verdadero, DLQI candidato y descarte sin reapertura',async()=>{
    await page.locator('[data-field="bsa"]').fill('0');
    await page.locator('[data-field="pga"]').selectOption('0');
    await page.locator('[data-field="dlqi_q1"]').selectOption('3');
    assert((await page.locator('.dlqi-candidate .derived').textContent()).includes('Sin cálculo clínico'),'DLQI homologado implícitamente');
    await confirm('accept',()=>page.locator('#newDemoVisit').click());
    assert(await currentId()!==second,'el ID de visita descartada volvió a ser actual');
    await open('05 Exploración/PASI');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA descartada reapareció');
    assert(await page.locator('[data-field="pga"]').inputValue()==='','PGA descartada reapareció');
    await open('07 DLQI');
    assert(await page.locator('[data-field="dlqi_q1"]').inputValue()==='','DLQI descartado reapareció');
  });
  await check('04 Cambio de paciente exige confirmación, no recupera los datos anteriores',async()=>{
    await open('05 Exploración/PASI');
    await page.locator('[data-field="bsa"]').fill('36');
    await page.locator('#patientCip').fill('DEMO-PSO-002');
    assert(await page.locator('#visitForm').getAttribute('inert')!==null,'deja editar clínica con CIP sin validar');
    await confirm('dismiss',()=>page.locator('#lookupCip').click());
    assert(await page.locator('#patientCip').inputValue()==='DEMO-PSO-001','cancelación cambió de paciente');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='36','cancelación perdió BSA');
    await page.locator('#patientCip').fill('DEMO-PSO-002');
    await confirm('accept',()=>page.locator('#lookupCip').click());
    assert(!await page.locator('#visitForm').isVisible(),'patología del paciente anterior inferida');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA cruzada entre pacientes');
    await selectPatient('DEMO-PSO-001');
    assert(await page.locator('#pathology').inputValue()==='','patología de otro paciente recuperada');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','BSA de visita anterior recuperada');
    assert(await page.locator('#draftVisitSelect').count()===0,'aparece listado histórico de pacientes');
  });
  await check('05 Primera y Seguimiento: tratamientos no se precargan ni se validan',async()=>{
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(!await page.locator('#visitForm').isVisible(),'Primera hereda PsO de Seguimiento');
    await page.locator('#pathology').selectOption('pso');
    await open('10 Tratamiento primera visita');
    await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').fill('Adalimumab');
    for(const key of ['tx_primera_biologicos_posologia_1','extra_tx_primera_biologicos_dosis_1','extra_tx_primera_biologicos_via_1'])
      assert(await page.locator('[data-field="'+key+'"]').inputValue()==='','tratamiento inferido '+key);
    await confirm('accept',()=>page.getByRole('button',{name:'Seguimiento',exact:true}).click());
    assert(!await page.locator('#visitForm').isVisible(),'F2 hereda PsO de Primera');
    await page.locator('#pathology').selectOption('pso');
    const context=await page.locator('#followupContextStatus').textContent();
    assert(context.includes('No hay Primera Visita guardada'),'historia previa inferida');
    assert(!(await page.locator('#followupContext').textContent()).includes('Adalimumab'),'tratamiento previo atribuido como vigente');
    await page.locator('[data-followup-family="biologicos"]').click();
    assert(await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').inputValue()==='','terapia previa restaurada');
    await page.locator('[data-field="tx_seguimiento_biologicos_farmaco_1"]').fill('Secukinumab');
    assert(await page.locator('[data-field="tx_seguimiento_biologicos_posologia_1"]').inputValue()==='','pauta F2 inferida');
    await confirm('accept',()=>page.getByRole('button',{name:'Primera Visita'}).click());
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').inputValue()==='','primera visita descartada recuperó fármaco');
  });
  await check('06 Fecha declarada no automática y nueva visita sin fecha anterior',async()=>{
    assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='','fecha presente sin consignar');
    await page.locator('[data-field="fecha_visita"]').fill('2026-11-08');
    assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='2026-11-08','fecha manual no admitida');
    const previous=await currentId();
    await confirm('accept',()=>page.locator('#newDemoVisit').click());
    assert(await currentId()!==previous,'fecha descartada conserva ID de visita');
    assert(await page.locator('[data-field="fecha_visita"]').inputValue()==='','fecha previa copiada');
    assert((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'afirma persistencia clínica');
  });
  await check('06b Nueva visita por teclado y fecha inválida rechazada con aviso',async()=>{
    const old=await currentId();
    await page.locator('#newDemoVisit').focus();
    await page.keyboard.press('Enter');
    assert(await currentId()!==old,'acción teclado no creó visita distinta');
    assert(await page.locator('#draftVisitSelect').count()===0,'selector multivisita reintroducido');
    await page.locator('[data-field="fecha_visita"]').fill('1899-01-01');
    assert((await page.locator('#draftVisitStatus').textContent()).includes('Aviso del registro DEMO'),'fecha no válida aceptada sin aviso');
    await page.locator('[data-field="fecha_visita"]').fill('2026-11-09');
    assert((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'fecha válida implica guardado');
    assert(!(await page.locator('#draftVisitStatus').textContent()).includes('Aviso del registro DEMO'),'aviso no desapareció tras corregir fecha');
  });
  await check('07 Sin guardado, cookies, peticiones externas ni datos recuperados tras recarga',async()=>{
    assert(errors.length===0,'consola con errores: '+errors.join('; '));
    assert(external.length===0,'red ajena: '+external.join('; '));
    const storage=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}));
    assert(storage.local===0&&storage.session===0&&!storage.cookie,'almacenamiento no autorizado');
    const labels=await page.locator('#visitView').textContent();
    assert(!/Guardar visita|Historial validado|Tratamiento validado por FH/i.test(labels),'afirma validación no realizada');
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    await selectPatient('DEMO-PSO-001');
    assert(await page.locator('#pathology').inputValue()==='','PsO rehidratada sin fuente');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('#draftVisitSelect').count()===0,'reapareció selector histórico');
    assert(await page.locator('[data-field="bsa"]').inputValue()==='','se restauró BSA tras reload');
    assert((await page.locator('#draftVisitStatus').textContent()).includes('NO GUARDADO'),'texto de guardado engañoso');
    assert(errors.length===0,'errores tras recarga: '+errors.join('; '));
  });
}finally{
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
