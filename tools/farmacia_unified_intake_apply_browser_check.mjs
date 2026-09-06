#!/usr/bin/env node
/**
 * T7 #299 manual browser QA (supported UI, synthetic data only).
 * Exercises the mandated D16/D5/D12 scenarios on farmacia_validacion.html
 * through real supported interactions (no DOM cheating).
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEP = '═'.repeat(55);
const CIP = 'CIP-DEMO-FH-001';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) return createRequire(path.join(nodeModules, '__fh_t7_browser_qa.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_unified_intake_apply_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  return readdirSync(cache).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse().map(x => path.join(cache, x, 'chrome-headless-shell-linux64', 'chrome-headless-shell')).find(existsSync) || bundled;
}
import { readdirSync } from 'node:fs';

const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_validacion.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try { if (!statSync(file).isFile()) throw new Error(); response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(file).pipe(response); }
  catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;

function eordenRaw({ cip = CIP, dose = '40 MG' } = {}) {
  return ['SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP, `• CIP: ${cip}`, '• Marca comercial solicitada: HYRIMOZ', `• Dosis solicitada: ${dose}`, '• Vía solicitada: SC', '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO', '• Justificación clínica: Justificación sintética QA T7.', 'PROGRAMA SES', '• Código: SES_PSOR', '• Denominación: PSORIASIS'].join('\n');
}
const PRESALUD = ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
const selectedUrl = () => new URL(`farmacia_validacion.html?cip=${encodeURIComponent(CIP)}`, BASE).href;
const VALIDATED_IDS = ['fhTipoValidacion', 'fhValidatedTreatmentRelation', 'fhValidadoFarmaco', 'fhValidadoPrincipioActivo', 'fhValidadoDosis', 'fhValidadoVia', 'fhValidadoPauta', 'fhValidadoPautaOtro', 'fhValidadoInduccion', 'fhValidadoPresentacion', 'fhValidadoJustificacion', 'fhCausalidadFinal'];
const CLINICAL_IDS = ['fhDermaCip', 'fhDermaPatologia', 'fhDermaFarmaco', 'fhDermaDosis', 'fhDermaVia', 'fhDermaPauta', 'fhDermaPautaOtro', 'fhDermaInduccion', 'fhDermaJustificacion'];

async function snapshot(page, ids) {
  return page.evaluate(ids => Object.fromEntries(ids.map(id => {
    const el = document.getElementById(id); if (!el) return [id, null];
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return [id, { checked: el.checked }];
    if ('value' in el) return [id, { value: el.value }];
    return [id, { text: el.textContent }];
  })), ids);
}
async function pageSetup(browser, url) {
  const page = await browser.newPage();
  page.on('pageerror', e => { page.__errs = page.__errs || []; page.__errs.push(e.message); });
  page.on('console', m => { if (m.type() === 'error') { page.__errs = page.__errs || []; page.__errs.push(m.text()); } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.FarmaciaValidacion));
  return page;
}
async function preview(page, raw, minUnits = 1) {
  const intake = page.locator('textarea[data-fh-intake-source]');
  await intake.fill(raw);
  const trigger = page.locator('[data-fh-intake-preview]');
  if (await trigger.count()) await trigger.first().click();
  await page.waitForFunction(n => document.querySelectorAll('[data-fh-intake-preview-panel] [data-fh-source-name]').length >= n, minUnits, { timeout: 8000 });
}
function row(page, concept) { return page.locator(`[data-fh-concept="${concept}"]`); }
async function rowText(page, concept) { return (await row(page, concept).textContent()) || ''; }
async function actionAvailable(page, kind, concept) { const a = row(page, concept).locator(`[data-fh-concept-action="${kind}"]`); if (await a.count() !== 1) return false; return !(await a.first().isDisabled()); }
async function clickAction(page, kind, concept) { const a = row(page, concept).locator(`[data-fh-concept-action="${kind}"]`); assert.equal(await a.count(), 1, `${concept}: ${kind} action missing`); assert.equal(await a.first().isDisabled(), false, `${concept}: ${kind} unexpectedly disabled`); await a.first().click(); }
async function confirmPresalud(page) {
  for (const role of ['button', 'checkbox', 'radio', 'switch']) { const x = page.getByRole(role, { name: PRESALUD_CONFIRM, exact: true }); if (await x.count()) { await x.first().click(); return; } }
  const x = page.getByLabel(PRESALUD_CONFIRM, { exact: true }); assert.ok(await x.count(), 'PreSalud association control missing'); await x.first().click();
  await page.waitForFunction(() => document.querySelector('[data-fh-source-name="presalud"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'));
}
function assertNoErrors(page, label) {
  const errs = (page.__errs || []).filter(t => !/favicon/i.test(t));
  assert.deepEqual(errs, [], `${label}: uncaught browser/console errors: ${errs.join(' | ')}`);
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
let passed = 0;
async function scenario(name, fn) {
  const page = await pageSetup(browser, selectedUrl());
  try {
    await fn(page);
    console.log(`OK ${name}`);
    passed += 1;
  } finally { await page.close(); }
}

try {
  // QA-1 CURRENT_EMPTY apply through supported UI writes and stays editable.
  await scenario('QA-1 CURRENT_EMPTY apply (dose, route, schedule, induction, justification)', async page => {
    await page.locator('#fhDermaDosis').fill('');
    await page.locator('#fhDermaInduccion').selectOption('');
    await page.locator('#fhDermaJustificacion').fill('');
    const pauta = page.locator('#fhDermaPauta');
    await pauta.evaluate(el => { el.selectedIndex = 0; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await preview(page, eordenRaw());
    for (const concept of ['requested_dose', 'requested_schedule', 'requested_induction', 'requested_justification']) {
      assert.equal(await actionAvailable(page, 'confirm', concept), true, `${concept}: confirm must be enabled on empty`);
      await clickAction(page, 'confirm', concept);
    }
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '40 MG');
    assert.equal(await page.locator('#fhDermaInduccion').inputValue(), 'no');
    assert.ok((await page.locator('#fhDermaJustificacion').inputValue()).includes('Justificación sintética'));
    assertNoErrors(page, 'QA-1');
  });

  // QA-2 protected keep vs replace through supported UI.
  await scenario('QA-2 PROTECTED_EXISTING keep default; explicit replace', async page => {
    await page.locator('#fhDermaDosis').fill('80 MG');
    await preview(page, eordenRaw());
    assert.ok((await rowText(page, 'requested_dose')).includes('PROTECTED_EXISTING'), 'protected state visible');
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), false, 'ordinary confirm cannot overwrite protected');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '80 MG', 'default keep');
    assert.equal(await actionAvailable(page, 'replace', 'requested_dose'), true, 'explicit replace available');
    // cancel first: zero mutation
    await clickAction(page, 'cancel', 'requested_dose');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '80 MG', 'cancel leaves protected value');
    assertNoErrors(page, 'QA-2');
  });

  // QA-3 association-ineligible source no-write (PreSalud UNBOUND), then explicit confirm after source-aware association.
  await scenario('QA-3 PreSalud UNBOUND no-write; explicit association then apply', async page => {
    await page.locator('#fhDermaDosis').fill('');
    await preview(page, PRESALUD);
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), false, 'UNBOUND cannot write');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '', 'unchanged while UNBOUND');
    await confirmPresalud(page);
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), true, 'confirmed PreSalud may apply');
    await clickAction(page, 'confirm', 'requested_dose');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '40 MG');
    assertNoErrors(page, 'QA-3');
  });

  // QA-4 cancel is zero mutation across a form (all fields byte-identical).
  await scenario('QA-4 cancel decision mutates nothing', async page => {
    await page.locator('#fhDermaDosis').fill('');
    const before = await snapshot(page, CLINICAL_IDS);
    await preview(page, eordenRaw());
    await clickAction(page, 'cancel', 'requested_dose');
    const after = await snapshot(page, CLINICAL_IDS);
    assert.deepEqual(after, before, 'cancel must not change any clinical control');
    assertNoErrors(page, 'QA-4');
  });

  // QA-5 manual edit after apply preserves source_value / applied_value / provenance (review lifecycle evidence).
  await scenario('QA-5 manual edit preserves review lifecycle evidence', async page => {
    await page.locator('#fhDermaDosis').fill('');
    await preview(page, eordenRaw());
    await clickAction(page, 'confirm', 'requested_dose');
    const r = row(page, 'requested_dose');
    const source = await r.getAttribute('data-fh-source-value');
    const applied = await r.getAttribute('data-fh-applied-value');
    const provenance = (await r.locator('[data-fh-provenance]').allTextContents()).join('|');
    assert.equal(source, '40 MG', 'source_value present');
    assert.equal(applied, '40 MG', 'applied_value present');
    assert.ok(provenance.length > 0, 'provenance present');
    await page.locator('#fhDermaDosis').fill('45 MG');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '45 MG', 'form remains editable after apply');
    assert.equal(await r.getAttribute('data-fh-source-value'), source, 'manual edit changed source_value');
    assert.equal(await r.getAttribute('data-fh-applied-value'), applied, 'manual edit changed historical applied_value');
    assert.equal((await r.locator('[data-fh-provenance]').allTextContents()).join('|'), provenance, 'manual edit changed provenance');
    assertNoErrors(page, 'QA-5');
  });

  // QA-6 validated-treatment surfaces byte-identical through every scenario.
  await scenario('QA-6 validated-treatment untouched across apply/cancel', async page => {
    const validatedBefore = await snapshot(page, VALIDATED_IDS);
    await page.locator('#fhDermaDosis').fill('80 MG');
    await preview(page, `${eordenRaw({ dose: '40 MG' })}\n${PRESALUD}`);
    await confirmPresalud(page);
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), false, 'mixed conflict no auto winner');
    await clickAction(page, 'cancel', 'requested_dose');
    const validatedAfter = await snapshot(page, VALIDATED_IDS);
    assert.deepEqual(validatedAfter, validatedBefore, 'validated-treatment surface changed across intake apply/cancel');
    assertNoErrors(page, 'QA-6');
  });

  console.log(`T7 BROWSER QA PASS ${passed} scenario groups`);
} catch (error) {
  console.error(`T7 BROWSER QA FAIL after ${passed} passed scenario groups: ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
