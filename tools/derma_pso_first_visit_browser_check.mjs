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
  ['F1-1 CIP de demo obligatorio y no hospitalario',async()=>{
    await page.goto(origin+'/dermatologia_prototipo.html',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(!await page.locator('#visitForm').isVisible(),'formulario sin CIP');
    await page.locator('#patientCip').fill('CIP-REAL-NO-VALIDO');
    await page.locator('#lookupCip').click();
    assert((await page.locator('#cipStatus').textContent()).includes('CIP no aceptado'),'formato no restringido');
    assert(await page.locator('#patientCip').getAttribute('aria-invalid')==='true','error sin estado accesible');
    assert(await page.locator('#patientCip').inputValue()==='CIP-REAL-NO-VALIDO','entrada borrada, no se puede corregir');
    assert(!await page.locator('#visitForm').isVisible(),'acepta identificadores sin DEMO-');
    await page.locator('#patientCip').fill('DEMO-F1-NUEVO');
    await page.locator('#lookupCip').click();
    assert((await page.locator('#cipStatus').textContent()).includes('CIP ficticio nuevo preparado'),'CIP nuevo demo no declarado');
    assert(await page.locator('#patientName').evaluate(el=>document.activeElement===el),'foco no conduce al siguiente dato');
    assert(!await page.locator('#visitForm').isVisible(),'patología deducida al crear CIP');
    await page.locator('#patientName').fill('Paciente sintético Nuevo');
    await page.locator('#patientSex').selectOption('Otro');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('#visitForm').isVisible(),'formulario no abrió tras PsO explícita');
  }],
  ['F1-2 Sin tarjeta/next; secciones clínicas siguen visibles',async()=>{
    assert(await page.locator('#firstVisitGuide').count()===0,'sigue la tarjeta ¿Qué necesitas registrar?');
    assert(await page.locator('[data-next-first-section]').count()===0,'quedan botones Siguiente apartado');
    assert(await page.locator('.section').count()===11,'se perdieron secciones de primera visita');
    assert(await page.locator('[data-field="fecha_visita"]').count()===1,'fecha de consulta ausente');
    await page.locator('[data-section="05 Exploración/PASI"] > summary').click();
    await page.locator('[data-field="pga"]').selectOption('0');
    assert(await page.locator('[data-field="pga"]').inputValue()==='0','0 válido no preservado');
  }],
  ['F1-3 Chips solo color, negativo no inferido',async()=>{
    const hta=page.locator('[data-chip="comorb_hta"]');
    const obes=page.locator('[data-chip="comorb_obesidad"]');
    await hta.click();
    assert(await hta.getAttribute('aria-pressed')==='true','no queda seleccionado');
    assert(await obes.getAttribute('data-status')==='unknown','chip no seleccionado tratado como No');
    assert(await hta.evaluate(el=>getComputedStyle(el,'::before').content)==='none','sigue mostrando check');
    let declined=false;
    page.once('dialog',async dialog=>{declined=true;await dialog.dismiss()});
    await page.locator('[data-section="03 Comorbilidades"] [data-review]').click();
    assert(declined&&await obes.getAttribute('data-status')==='unknown','negativo registrado sin consentimiento');
  }],
  ['F1-4 Tabaco y alcohol visibles solo tras marcar; valores explícitos',async()=>{
    assert(await page.locator('[data-field="extra_tabaco_situacion"]').count()===0,'tabaco sin marca ya visible');
    await page.locator('[data-chip="comorb_tabaquismo"]').click();
    assert(await page.locator('[data-field="extra_tabaco_situacion"]').isVisible(),'no muestra detalles tabaco');
    assert(await page.locator('[data-field="extra_tabaco_situacion"]').inputValue()==='','asume fumador actual');
    await page.locator('[data-field="extra_tabaco_situacion"]').selectOption('Fumador actual');
    await page.locator('[data-field="extra_tabaco_cigarrillos_dia"]').fill('8');
    let declineStatus=false;
    page.once('dialog',async dialog=>{declineStatus=true;await dialog.dismiss()});
    await page.locator('[data-field="extra_tabaco_situacion"]').selectOption('Exfumador');
    assert(declineStatus&&await page.locator('[data-field="extra_tabaco_situacion"]').inputValue()==='Fumador actual','cambio de situación sin confirmación');
    let acceptStatus=false;
    page.once('dialog',async dialog=>{acceptStatus=true;await dialog.accept()});
    await page.locator('[data-field="extra_tabaco_situacion"]').selectOption('Exfumador');
    assert(acceptStatus&&await page.locator('[data-field="extra_tabaco_cigarrillos_dia"]').count()===0,'cantidad anterior sigue visible');
    assert(await page.locator('[data-field="extra_tabaco_anos_abandono"]').isVisible(),'exfumador sin periodo abandono');
    await page.locator('[data-field="extra_tabaco_anos_abandono"]').fill('3');
    await page.locator('[data-chip="comorb_alcohol"]').click();
    assert(await page.locator('[data-field="extra_alcohol_situacion"]').inputValue()==='','asume consumo alcohol actual');
    await page.locator('[data-field="extra_alcohol_situacion"]').selectOption('Consumo actual');
    await page.locator('[data-field="extra_alcohol_bebidas_semana"]').fill('2');
    let canceled=false;
    page.once('dialog',async dialog=>{canceled=true;await dialog.dismiss()});
    await page.locator('[data-chip="comorb_alcohol"]').click();
    assert(canceled&&await page.locator('[data-field="extra_alcohol_situacion"]').count()===1,'cancelación borró consumo');
    let accepted=false;
    page.once('dialog',async dialog=>{accepted=true;await dialog.accept()});
    await page.locator('[data-chip="comorb_alcohol"]').click();
    assert(accepted&&await page.locator('[data-field="extra_alcohol_situacion"]').count()===0,'desmarcar no oculta los detalles');
  }],
  ['F1-5 DLQI: 10 textos, q7 condicional, sin resultado',async()=>{
    await page.locator('[data-section="07 DLQI"] > summary').click();
    assert(await page.locator('[data-question^="dlqi_q"]').count()===10,'no hay 10 enunciados');
    assert((await page.locator('[data-question="dlqi_q9"]').textContent()).includes('dificultades sexuales'),'q9 incorrecta como Farmacia');
    assert(await page.locator('[data-field="extra_dlqi_q7_detail"]').count()===0,'subpregunta visible sin No');
    await page.locator('[data-field="extra_dlqi_q7_main"]').selectOption('No');
    assert(await page.locator('[data-field="extra_dlqi_q7_detail"]').isVisible(),'no abre q7 condicional');
    await page.locator('[data-field="extra_dlqi_q7_detail"]').selectOption('Un poco');
    await page.locator('[data-field="dlqi_q3"]').selectOption('NR');
    assert(await page.locator('[data-field="dlqi_q3"]').inputValue()==='NR','NR colapsa a 0');
    assert((await page.locator('.dlqi-candidate .derived').textContent()).includes('Sin cálculo clínico'),'total calculado antes de homologación');
  }],
  ['F1-6 Tratamientos: familias y nombres, dosis/vía/pauta vacías',async()=>{
    await page.locator('[data-section="10 Tratamiento primera visita"] > summary').click();
    for(const title of ['Tópicos','Sistémicos convencionales','Biológicos','Fototerapia']){
      assert(await page.locator('.therapy-group h3').filter({hasText:title}).count()===1,'falta grupo '+title);
    }
    const name=page.locator('[data-field="tx_primera_biologicos_farmaco_1"]');
    await name.fill('Secukinumab');
    for(const key of ['extra_tx_primera_biologicos_dosis_1','extra_tx_primera_biologicos_via_1','tx_primera_biologicos_posologia_1']){
      assert(await page.locator('[data-field="'+key+'"]').inputValue()==='',key+' inferido');
    }
    await page.locator('[data-field="extra_tx_primera_biologicos_dosis_1"]').fill('Dato demo explícito');
    await page.locator('[data-field="extra_tx_primera_biologicos_via_1"]').fill('Dato demo explícito');
    await page.locator('[data-field="tx_primera_biologicos_posologia_1"]').fill('Dato demo explícito');
    await page.locator('[data-section="10 Tratamiento primera visita"] [data-more="biologicos"]').click();
    assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_2"]').count()===1,'no añade segunda línea');
    assert((await page.locator('.warning-inline').first().textContent()).length>0,'falta advertencia');
    if(process.env.DERMA_F1_DESKTOP_SCREENSHOT)await page.screenshot({path:process.env.DERMA_F1_DESKTOP_SCREENSHOT,fullPage:true});
  }],
  ['F1-7 Descarte irreversible entre pacientes y circuitos, sin inferencias clínicas',async()=>{
    let confirmed=false;
    page.once('dialog',async dialog=>{confirmed=true;await dialog.accept()});
    await page.locator('#patientCip').fill('DEMO-PSO-001');
    assert(await page.locator('#visitForm').getAttribute('inert')!==null,'CIP sin validar deja editar clínica');
    await page.locator('#lookupCip').click();
    assert(confirmed,'no confirmó descartar Primera con tratamiento y cuestionarios');
    assert(await page.locator('#pathology').inputValue()==='','PsO transferida desde paciente nuevo');
    assert(await page.locator('#patientName').inputValue()==='Paciente sintético A','fixture demo A incorrecta');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-chip="comorb_tabaquismo"]').getAttribute('aria-pressed')==='false','consumos de otro paciente');
    assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').inputValue()==='','tratamiento del otro CIP filtrado');
    await page.locator('#patientCip').fill('DEMO-F1-NUEVO');
    await page.locator('#lookupCip').click();
    assert(await page.locator('#patientName').inputValue()==='','perfil ficticio descartado se recuperó');
    assert(await page.locator('#patientSex').inputValue()==='','sexo descartado se recuperó');
    assert(await page.locator('#pathology').inputValue()==='','PsO anterior recuperada');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').inputValue()==='','fármaco anterior reabierto');
    await page.getByRole('button',{name:'Seguimiento',exact:true}).click();
    assert(!await page.locator('#visitForm').isVisible(),'Seguimiento hereda patología');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-followup-family="biologicos"]').getAttribute('aria-pressed')==='false','familia preseleccionada');
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(!await page.locator('#visitForm').isVisible(),'Primera reabrió patología anterior');
    await page.locator('#pathology').selectOption('pso');
    assert(await page.locator('[data-field="tx_primera_biologicos_farmaco_1"]').inputValue()==='','borrador propio descartado se recuperó');
  }],
  ['F1-8 Recarga/móvil/sin almacenamiento ni red externa',async()=>{
    await page.setViewportSize({width:390,height:844});
    const dimensions=await page.evaluate(()=>({window:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert(dimensions.scroll<=dimensions.window+1,'desbordamiento móvil '+JSON.stringify(dimensions));
    if(process.env.DERMA_F1_MOBILE_SCREENSHOT)await page.screenshot({path:process.env.DERMA_F1_MOBILE_SCREENSHOT,fullPage:true});
    assert(logs.length===0&&external.length===0,'errores/red ajena '+JSON.stringify({logs,external}));
    const st=await page.evaluate(()=>({ls:localStorage.length,ss:sessionStorage.length}));
    assert(!st.ls&&!st.ss&&(await page.context().cookies()).length===0,'storage o cookies no autorizadas');
    if(process.env.DERMA_FIRST_VISIT_MOBILE)await page.screenshot({path:process.env.DERMA_FIRST_VISIT_MOBILE,fullPage:true});
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Primera Visita'}).click();
    assert(await page.locator('#patientCip').inputValue()==='','CIP restaurado sin fuente');
    assert(await page.locator('#pathology').inputValue()==='','patología restaurada sin fuente');
    await page.locator('#patientCip').fill('DEMO-F1-NUEVO');
    await page.locator('#lookupCip').click();
    assert(await page.locator('#patientName').inputValue()==='','perfil nuevo sobrevivió a recarga');
    assert(logs.length===0&&external.length===0,'errores después de recarga');
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
