#!/usr/bin/env node
/** T7 #299 independent acceptance oracle — frozen before T7 implementation. */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEP = '═'.repeat(55);
const CIP = 'CIP-DEMO-FH-001';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
const VALIDATED_IDS = ['fhTipoValidacion','fhValidatedTreatmentRelation','fhValidadoFarmaco','fhValidadoPrincipioActivo','fhValidadoDosis','fhValidadoVia','fhValidadoPauta','fhValidadoPautaOtro','fhValidadoInduccion','fhValidadoPresentacion','fhValidadoJustificacion','fhCausalidadFinal'];

/* T7 semantic hook contract, additive to frozen T6 hooks:
 * [data-fh-concept="requested_dose"] per-concept decision row.
 * row visibly renders CURRENT_EMPTY / ALREADY_MATCHES_CURRENT /
 * PROTECTED_EXISTING / CONFLICT / REQUIRES_SELECTION / NO_PROPOSAL as relevant.
 * row data-fh-source-value and data-fh-applied-value expose immutable review
 * lifecycle evidence for read-only verification.
 * [data-fh-concept-action="confirm|replace|cancel"] are explicit professional
 * decisions. Disabled/absent actions are treated as non-writable.
 */
function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) return createRequire(path.join(nodeModules, '__fh_t7_oracle_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_unified_intake_apply_oracle_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  return readdirSync(cache).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse().map(x => path.join(cache, x, 'chrome-headless-shell-linux64', 'chrome-headless-shell')).find(existsSync) || bundled;
}
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json'],['.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]);
const server = createServer((request,response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_validacion.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try { if (!statSync(file).isFile()) throw new Error(); response.writeHead(200, {'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream','cache-control':'no-store'}); createReadStream(file).pipe(response); }
  catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;

function eordenRaw({ cip=CIP, dose='40 MG', brand='HYRIMOZ', includeCip=true }={}) {
  return ['SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP, ...(includeCip ? [`• CIP: ${cip}`] : []), `• Marca comercial solicitada: ${brand}`, `• Dosis solicitada: ${dose}`, '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO', '• Justificación clínica: Justificación sintética T7.', 'PROGRAMA SES', '• Código: SES_PSOR', '• Denominación: PSORIASIS'].join('\n');
}
const presalud = (dose='40 MG', brand='HYRIMOZ') => `;ADALIMUMAB (${brand});SC;${dose};CADA 14 DIAS;`;
const selectedUrl = () => new URL(`farmacia_validacion.html?cip=${encodeURIComponent(CIP)}`, BASE).href;
const noPatientUrl = () => new URL('farmacia_validacion.html', BASE).href;

async function snapshot(ids,page) {
  return page.evaluate(ids => Object.fromEntries(ids.map(id => {
    const el=document.getElementById(id); if(!el) return [id,null];
    if (el instanceof HTMLInputElement && (el.type==='checkbox'||el.type==='radio')) return [id,{checked:el.checked}];
    return [id,{value:'value' in el ? el.value : null,text:el.textContent}];
  })), ids);
}
async function pageSetup(browser,url) {
  const page=await browser.newPage(); await page.goto(url,{waitUntil:'domcontentloaded'}); await page.waitForFunction(() => Boolean(window.FarmaciaValidacion)); return page;
}
async function preview(page,raw,minUnits=1) {
  const intake=page.locator('textarea[data-fh-intake-source]'); assert.equal(await intake.count(),1,'T6 intake surface missing'); await intake.fill(raw);
  const trigger=page.locator('[data-fh-intake-preview]'); if(await trigger.count()) await trigger.first().click();
  await page.waitForFunction(n => document.querySelectorAll('[data-fh-intake-preview-panel] [data-fh-source-name]').length >= n,minUnits,{timeout:8000});
}
function row(page,concept='requested_dose') { return page.locator(`[data-fh-concept="${concept}"]`); }
async function rowText(page,concept,label) { const r=row(page,concept); assert.equal(await r.count(),1,`${label}: concept row missing`); return (await r.textContent())||''; }
async function assertState(page,state,label,concept='requested_dose') { assert.ok((await rowText(page,concept,label)).includes(state),`${label}: expected visible ${state}`); }
async function action(page,kind,concept='requested_dose') { return row(page,concept).locator(`[data-fh-concept-action="${kind}"]`); }
async function actionAvailable(page,kind,concept='requested_dose') { const a=await action(page,kind,concept); if(await a.count()!==1) return false; return !(await a.first().isDisabled()); }
async function clickAction(page,kind,concept='requested_dose') { const a=await action(page,kind,concept); assert.equal(await a.count(),1,`${concept}: ${kind} action missing`); assert.equal(await a.first().isDisabled(),false,`${concept}: ${kind} unexpectedly disabled`); await a.first().click(); }
async function confirmPresalud(page) {
  for (const role of ['button','checkbox','radio','switch']) { const x=page.getByRole(role,{name:PRESALUD_CONFIRM,exact:true}); if(await x.count()){ await x.first().click(); return; } }
  const x=page.getByLabel(PRESALUD_CONFIRM,{exact:true}); assert.ok(await x.count(),'PreSalud association control missing'); await x.first().click();
  await page.waitForFunction(() => document.querySelector('[data-fh-source-name="presalud"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'));
}
async function withScenario(name,url,fn) {
  const page=await pageSetup(browser,url); const beforeValidated=await snapshot(VALIDATED_IDS,page);
  try { await fn(page); assert.deepEqual(await snapshot(VALIDATED_IDS,page),beforeValidated,`${name}: validated-treatment/causality surfaces changed`); console.log(`OK ${name}`); }
  finally { await page.close(); }
}

const browser=await chromium.launch({headless:true,executablePath:chromiumExecutable()});
let passed=0;
try {
  await withScenario('1 CURRENT_EMPTY + eligible association + explicit confirm writes requested dose only',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,eordenRaw()); await assertState(page,'CURRENT_EMPTY','current-empty');
    assert.equal(await actionAvailable(page,'confirm'),true,'current-empty: confirm must be available'); await clickAction(page,'confirm'); assert.equal(await dose.inputValue(),'40 MG','current-empty: confirmed value written');
    const r=row(page); assert.equal(await r.getAttribute('data-fh-source-value'),'40 MG','source_value preserved'); assert.equal(await r.getAttribute('data-fh-applied-value'),'40 MG','applied_value recorded');
  }); passed++;

  await withScenario('2 no selected patient blocks the same candidate write',noPatientUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,eordenRaw()); assert.equal(await actionAvailable(page,'confirm'),false,'no-patient: concept must not be writable'); assert.equal(await dose.inputValue(),'','no-patient: value unchanged');
  }); passed++;

  await withScenario('3 PreSalud UNBOUND blocks write; explicit source association then allows explicit concept confirm',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,presalud()); assert.equal(await actionAvailable(page,'confirm'),false,'unbound PreSalud must not write'); assert.equal(await dose.inputValue(),'','unbound PreSalud unchanged');
    await confirmPresalud(page); assert.equal(await actionAvailable(page,'confirm'),true,'associated PreSalud confirm must become available'); await clickAction(page,'confirm'); assert.equal(await dose.inputValue(),'40 MG');
  }); passed++;

  await withScenario('4 ALREADY_MATCHES_CURRENT is a visible no-op',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill('40 MG'); await preview(page,eordenRaw()); await assertState(page,'ALREADY_MATCHES_CURRENT','already-matches'); assert.equal(await actionAvailable(page,'confirm'),false,'already-matches: no confirm/rewrite action'); assert.equal(await dose.inputValue(),'40 MG');
  }); passed++;

  await withScenario('5 PROTECTED_EXISTING defaults keep; explicit replace alone overwrites',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill('80 MG'); await preview(page,eordenRaw()); await assertState(page,'PROTECTED_EXISTING','protected'); assert.equal(await dose.inputValue(),'80 MG');
    assert.equal(await actionAvailable(page,'confirm'),false,'protected: ordinary confirm cannot overwrite'); assert.equal(await actionAvailable(page,'replace'),true,'protected: explicit replace must exist'); await clickAction(page,'replace'); assert.equal(await dose.inputValue(),'40 MG','protected: explicit replace writes imported value');
  }); passed++;

  await withScenario('6 cancel is zero mutation',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,eordenRaw()); await assertState(page,'CURRENT_EMPTY','cancel'); assert.equal(await actionAvailable(page,'cancel'),true,'cancel action missing'); await clickAction(page,'cancel'); assert.equal(await dose.inputValue(),'','cancel must leave field unchanged');
  }); passed++;

  await withScenario('7 reconciliation CONFLICT/REQUIRES_SELECTION has no automatic winner/write',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,`${eordenRaw({dose:'40 MG'})}\n${presalud('80 MG','BENEPALI')}`,2); await confirmPresalud(page);
    const text=await rowText(page,'requested_dose','conflict'); assert.ok(text.includes('CONFLICT')||text.includes('REQUIRES_SELECTION'),'conflict: blocking state visible'); assert.equal(await actionAvailable(page,'confirm'),false,'conflict: no automatic confirm'); assert.equal(await dose.inputValue(),'','conflict: no winner written');
  }); passed++;

  await withScenario('8 NO_PROPOSAL / target NONE concept is never writable',selectedUrl(),async page => {
    await preview(page,presalud()); const text=await rowText(page,'principio_activo_raw','no-proposal'); assert.ok(text.includes('NO_PROPOSAL'),'no-proposal state visible'); assert.equal(await actionAvailable(page,'confirm','principio_activo_raw'),false,'target NONE must not be writable');
  }); passed++;

  await withScenario('9 post-apply manual edit preserves source_value/provenance/applied_value',selectedUrl(),async page => {
    const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,eordenRaw()); await clickAction(page,'confirm'); const r=row(page); const source=await r.getAttribute('data-fh-source-value'); const applied=await r.getAttribute('data-fh-applied-value'); const provenance=(await r.locator('[data-fh-provenance]').allTextContents()).join('|');
    await dose.fill('45 MG'); assert.equal(await dose.inputValue(),'45 MG'); assert.equal(await r.getAttribute('data-fh-source-value'),source,'manual edit changed source_value'); assert.equal(await r.getAttribute('data-fh-applied-value'),applied,'manual edit changed historical applied_value'); assert.equal((await r.locator('[data-fh-provenance]').allTextContents()).join('|'),provenance,'manual edit changed provenance');
  }); passed++;

  console.log(`T7 ORACLE PASS ${passed} scenario groups`);
} catch(error) { console.error(`T7 ORACLE FAIL after ${passed} passed scenario groups: ${error?.stack||error}`); process.exitCode=1; }
finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
