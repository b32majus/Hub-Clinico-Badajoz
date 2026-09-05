#!/usr/bin/env node
/** T8 #300 independent acceptance oracle — frozen before T8 implementation. */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SEP='═'.repeat(55); const CIP='CIP-DEMO-FH-001';
const PRESALUD_CONFIRM='Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
/* T8 semantic hook contract, additive to frozen T6/T7 hooks:
 * [data-fh-intake-preview-panel] carries data-fh-intake-review-id and data-fh-parse-run-id.
 * [data-fh-concept-action="reapply-imported"] is the explicit REAPPLY_IMPORTED action.
 * [data-fh-concept-action="confirm-for-global"] records an explicit professional
 * decision for batch execution without writing by itself.
 * [data-fh-intake-global-apply] executes only already-authorized eligible concepts.
 */
function loadPlaywrightFromNpx(){for(const b of String(process.env.PATH||'').split(path.delimiter)){const n=path.resolve(b,'..');if(existsSync(path.join(n,'playwright','package.json')))return createRequire(path.join(n,'__fh_t8_oracle_loader.cjs'))('playwright');}throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_unified_intake_reparse_apply_oracle_check.mjs');}
const {chromium}=loadPlaywrightFromNpx();
function chromiumExecutable(){if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;const b=chromium.executablePath();if(existsSync(b))return b;const c=process.env.PLAYWRIGHT_BROWSERS_PATH||path.join(process.env.HOME||'','.cache','ms-playwright');if(!existsSync(c))return b;return readdirSync(c).filter(x=>x.startsWith('chromium_headless_shell-')).sort().reverse().map(x=>path.join(c,x,'chrome-headless-shell-linux64','chrome-headless-shell')).find(existsSync)||b;}
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json'],['.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]);
const server=createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url||'/','http://127.0.0.1').pathname).replace(/^\/+/, '')||'farmacia_validacion.html';const f=path.resolve(ROOT,rel);if(f!==ROOT&&!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}try{if(!statSync(f).isFile())throw new Error();res.writeHead(200,{'content-type':mime.get(path.extname(f).toLowerCase())||'application/octet-stream','cache-control':'no-store'});createReadStream(f).pipe(res);}catch{res.writeHead(404).end('Not found');}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);}); const BASE=`http://127.0.0.1:${server.address().port}/`;
function eordenRaw({dose='40 MG',route='SC'}={}){return ['SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS',SEP,`• CIP: ${CIP}`,'• Marca comercial solicitada: HYRIMOZ',`• Dosis solicitada: ${dose}`,`• Vía solicitada: ${route}`,'• Pauta: CADA 14 DIAS','• Inducción solicitada: NO','• Justificación clínica: Justificación sintética T8.','PROGRAMA SES','• Código: SES_PSOR','• Denominación: PSORIASIS'].join('\n');}
const PRESALUD=';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;'; const url=()=>new URL(`farmacia_validacion.html?cip=${encodeURIComponent(CIP)}`,BASE).href;
async function setup(browser){const p=await browser.newPage();await p.goto(url(),{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>Boolean(window.FarmaciaValidacion));return p;}
async function preview(page,raw,minUnits=1){const ta=page.locator('textarea[data-fh-intake-source]');assert.equal(await ta.count(),1,'T6 intake missing');await ta.fill(raw);const t=page.locator('[data-fh-intake-preview]');if(await t.count())await t.first().click();await page.waitForFunction(n=>document.querySelectorAll('[data-fh-intake-preview-panel] [data-fh-source-name]').length>=n,minUnits,{timeout:8000});}
function panel(page){return page.locator('[data-fh-intake-preview-panel]');} function row(page,c='requested_dose'){return page.locator(`[data-fh-concept="${c}"]`);} async function state(page,s,c='requested_dose'){const r=row(page,c);assert.equal(await r.count(),1,`${c} row missing`);assert.ok(((await r.textContent())||'').includes(s),`${c} expected ${s}`);}
async function clickAction(page,kind,c='requested_dose'){const a=row(page,c).locator(`[data-fh-concept-action="${kind}"]`);assert.equal(await a.count(),1,`${c}:${kind} missing`);assert.equal(await a.first().isDisabled(),false,`${c}:${kind} disabled`);await a.first().click();}
async function available(page,kind,c='requested_dose'){const a=row(page,c).locator(`[data-fh-concept-action="${kind}"]`);return await a.count()===1 && !(await a.first().isDisabled());}
async function ids(page){const p=panel(page);const review=await p.getAttribute('data-fh-intake-review-id');const parse=await p.getAttribute('data-fh-parse-run-id');assert.ok(review,'intake_review_id missing');assert.ok(parse,'parse_run_id missing');return{review,parse};}
async function confirmPresalud(page){for(const role of ['button','checkbox','radio','switch']){const x=page.getByRole(role,{name:PRESALUD_CONFIRM,exact:true});if(await x.count()){await x.first().click();return;}}const x=page.getByLabel(PRESALUD_CONFIRM,{exact:true});assert.ok(await x.count(),'PreSalud confirm missing');await x.first().click();}
async function directApplyDose(page){await state(page,'CURRENT_EMPTY');await clickAction(page,'confirm');assert.equal(await page.locator('#fhDermaDosis').inputValue(),'40 MG');}
const browser=await chromium.launch({headless:true,executablePath:chromiumExecutable()}); let passed=0;
try{
  {
    const page=await setup(browser); const raw=eordenRaw(); await page.locator('#fhDermaDosis').fill(''); await preview(page,raw); const first=await ids(page); await directApplyDose(page); await page.locator('#fhDermaDosis').fill('45 MG'); await preview(page,raw); const second=await ids(page);
    assert.equal(second.review,first.review,'reparse must remain inside same intake_review_id'); assert.notEqual(second.parse,first.parse,'each parse run requires new parse_run_id'); assert.equal(await page.locator('#fhDermaDosis').inputValue(),'45 MG','reparse silently overwrote manual edit'); await state(page,'MANUALLY_EDITED_AFTER_APPLY'); await state(page,'PROTECTED_EXISTING'); console.log('OK 1 reparse != reapply after manual edit'); passed++;
    assert.equal(await available(page,'reapply-imported'),true,'explicit REAPPLY_IMPORTED action missing'); const txt=(await row(page).textContent())||''; assert.ok(txt.includes('REAPPLY_IMPORTED'),'explicit reapply action/state must be visible'); await clickAction(page,'reapply-imported'); assert.equal(await page.locator('#fhDermaDosis').inputValue(),'40 MG','explicit reapply did not restore imported value'); console.log('OK 2 explicit REAPPLY_IMPORTED only'); passed++; await page.close();
  }
  {
    const page=await setup(browser); const raw=eordenRaw(); const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,raw); await directApplyDose(page); const first=await ids(page); await preview(page,raw); const second=await ids(page); assert.equal(second.review,first.review); assert.notEqual(second.parse,first.parse); await state(page,'ALREADY_MATCHES_CURRENT'); assert.equal(await dose.inputValue(),'40 MG'); assert.equal(await available(page,'reapply-imported'),false,'already-matches must not offer rewrite'); console.log('OK 3 already matches no rewrite/state churn'); passed++; await page.close();
  }
  {
    const page=await setup(browser); const raw=eordenRaw(); const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,raw); await directApplyDose(page); await dose.fill('80 MG'); await preview(page,raw); await state(page,'PROTECTED_EXISTING'); assert.equal(await dose.inputValue(),'80 MG'); await dose.fill('40 MG'); await preview(page,raw); await state(page,'ALREADY_MATCHES_CURRENT'); assert.equal(await dose.inputValue(),'40 MG'); console.log('OK 4 each parse recalculates against live current value'); passed++; await page.close();
  }
  {
    const page=await setup(browser); await preview(page,PRESALUD); const first=await ids(page); await confirmPresalud(page); await page.waitForFunction(()=>document.querySelector('[data-fh-source-name="presalud"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT')); await page.goto(url(),{waitUntil:'domcontentloaded'}); await page.waitForFunction(()=>Boolean(window.FarmaciaValidacion)); await preview(page,PRESALUD); const second=await ids(page); assert.notEqual(second.review,first.review,'brand-new review must get fresh intake_review_id'); const text=(await page.locator('[data-fh-source-name="presalud"]').textContent())||''; assert.ok(text.includes('UNBOUND'),'new review inherited source confirmation'); assert.ok(!text.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'),'new review inherited association decision'); console.log('OK 5 fresh review inherits zero confirmations/associations'); passed++; await page.close();
  }
  {
    const page=await setup(browser); const dose=page.locator('#fhDermaDosis'); const via=page.locator('#fhDermaVia'); await dose.fill(''); await via.selectOption({label:'IV'}); await preview(page,eordenRaw({dose:'40 MG',route:'SC'})); await state(page,'CURRENT_EMPTY','requested_dose'); await state(page,'PROTECTED_EXISTING','requested_route');
    await clickAction(page,'confirm-for-global','requested_dose'); assert.equal(await dose.inputValue(),'','batch confirmation must not write before global apply'); assert.equal(await via.inputValue(),'IV','protected route changed before global apply'); const global=page.locator('[data-fh-intake-global-apply]'); assert.equal(await global.count(),1,'global apply control missing'); assert.equal(await global.first().isDisabled(),false,'global apply should execute confirmed eligible subset'); await global.first().click(); assert.equal(await dose.inputValue(),'40 MG','global apply missed confirmed eligible concept'); assert.equal(await via.inputValue(),'IV','global apply overwrote unconfirmed PROTECTED_EXISTING concept'); console.log('OK 6 global apply executes only confirmed eligible subset'); passed++; await page.close();
  }
  {
    const page=await setup(browser); const dose=page.locator('#fhDermaDosis'); await dose.fill(''); await preview(page,`${eordenRaw({dose:'40 MG'})}\n;ADALIMUMAB (BENEPALI);SC;80 MG;CADA 14 DIAS;`,2); await confirmPresalud(page); const text=(await row(page).textContent())||''; assert.ok(text.includes('CONFLICT')||text.includes('REQUIRES_SELECTION'),'conflict/selection state missing'); assert.equal(await available(page,'confirm-for-global'),false,'global decision must not stage conflict/selection concept'); assert.equal(await dose.inputValue(),''); console.log('OK 7 global apply cannot blanket-confirm conflict/selection'); passed++; await page.close();
  }
  console.log(`T8 ORACLE PASS ${passed} scenario groups`);
}catch(error){console.error(`T8 ORACLE FAIL after ${passed} passed scenario groups: ${error?.stack||error}`);process.exitCode=1;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
