#!/usr/bin/env node
/**
 * T8 #300 manual browser QA (supported UI, synthetic data only).
 * Exercises the mandated reparse/reapply + safe global-apply paths on
 * farmacia_validacion.html through real supported interactions:
 * paste -> preview -> per-concept confirm -> edit -> re-paste (reparse) ->
 * REAPPLY_IMPORTED -> fresh review -> confirm-for-global -> global apply.
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEP = '═'.repeat(55);
const CIP = 'CIP-DEMO-FH-001';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_t8_browser_qa.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_unified_intake_reparse_apply_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  return readdirSync(cache).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(x => path.join(cache, x, 'chrome-headless-shell-linux64', 'chrome-headless-shell')).find(existsSync) || bundled;
}
const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json']]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_validacion.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try { if (!statSync(file).isFile()) throw new Error(); response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(file).pipe(response); }
  catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;

function eordenRaw({ dose = '40 MG', route = 'SC' } = {}) {
  return ['SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP, `• CIP: ${CIP}`, '• Marca comercial solicitada: HYRIMOZ', `• Dosis solicitada: ${dose}`, `• Vía solicitada: ${route}`, '• Pauta: CADA 14 DIAS', '• Inducción solicitada: NO', '• Justificación clínica: Justificación sintética QA T8.', 'PROGRAMA SES', '• Código: SES_PSOR', '• Denominación: PSORIASIS'].join('\n');
}
const selectedUrl = () => new URL(`farmacia_validacion.html?cip=${encodeURIComponent(CIP)}`, BASE).href;

async function pageSetup(browser) {
  const page = await browser.newPage();
  page.on('pageerror', e => { page.__errs = page.__errs || []; page.__errs.push(e.message); });
  page.on('console', m => { if (m.type() === 'error') { page.__errs = page.__errs || []; page.__errs.push(m.text()); } });
  await page.goto(selectedUrl(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.FarmaciaValidacion));
  return page;
}
async function preview(page, raw, minUnits = 1) {
  const ta = page.locator('textarea[data-fh-intake-source]');
  assert.equal(await ta.count(), 1, 'intake surface missing');
  await ta.fill(raw);
  const t = page.locator('[data-fh-intake-preview]');
  if (await t.count()) await t.first().click();
  await page.waitForFunction(n => document.querySelectorAll('[data-fh-intake-preview-panel] [data-fh-source-name]').length >= n, minUnits, { timeout: 8000 });
}
function row(page, c = 'requested_dose') { return page.locator(`[data-fh-concept="${c}"]`); }
async function rowState(page, c) { return (await row(page, c).textContent()) || ''; }
async function actionAvailable(page, kind, c = 'requested_dose') { const a = row(page, c).locator(`[data-fh-concept-action="${kind}"]`); if (await a.count() !== 1) return false; return !(await a.first().isDisabled()); }
async function clickAction(page, kind, c = 'requested_dose') { const a = row(page, c).locator(`[data-fh-concept-action="${kind}"]`); assert.equal(await a.count(), 1, `${c}: ${kind} missing`); assert.equal(await a.first().isDisabled(), false, `${c}: ${kind} disabled`); await a.first().click(); }
async function ids(page) {
  const panel = page.locator('[data-fh-intake-preview-panel]');
  const review = await panel.getAttribute('data-fh-intake-review-id');
  const parse = await panel.getAttribute('data-fh-parse-run-id');
  assert.ok(review && parse, 'lifecycle ids missing');
  return { review, parse };
}
function assertNoErrors(page, label) {
  const errs = (page.__errs || []).filter(t => !/favicon/i.test(t));
  assert.deepEqual(errs, [], `${label}: browser/console errors: ${errs.join(' | ')}`);
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
let passed = 0;
async function scenario(name, fn) {
  const page = await pageSetup(browser);
  try { await fn(page); console.log(`OK ${name}`); passed += 1; }
  finally { await page.close(); }
}

try {
  // BQA-1 supported re-paste after manual edit: no silent overwrite, edited value survives.
  await scenario('BQA-1 reparse after manual edit protects the edited value', async page => {
    const dose = page.locator('#fhDermaDosis');
    await dose.fill('');
    await preview(page, eordenRaw());
    const first = await ids(page);
    assert.ok((await rowState(page)).includes('CURRENT_EMPTY'));
    await clickAction(page, 'confirm');
    assert.equal(await dose.inputValue(), '40 MG');
    await dose.fill('45 MG');
    await preview(page, eordenRaw());
    const second = await ids(page);
    assert.equal(second.review, first.review, 'reparse must keep same intake_review_id');
    assert.notEqual(second.parse, first.parse, 'reparse must advance parse_run_id');
    assert.equal(await dose.inputValue(), '45 MG', 'reparse silently overwrote the manual edit');
    const text = await rowState(page);
    assert.ok(text.includes('MANUALLY_EDITED_AFTER_APPLY') && text.includes('PROTECTED_EXISTING'), 'manual-edit + protection states visible');
    assert.equal(await actionAvailable(page, 'reapply-imported'), true, 'explicit REAPPLY_IMPORTED missing');
    await clickAction(page, 'reapply-imported');
    assert.equal(await dose.inputValue(), '40 MG', 'explicit REAPPLY_IMPORTED did not restore the imported value');
    assertNoErrors(page, 'BQA-1');
  });

  // BQA-2 fresh review via navigation: brand-new ids and zero inherited confirmations.
  await scenario('BQA-2 fresh review is decisionally blank', async page => {
    await preview(page, ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;');
    const first = await ids(page);
    await page.goto(selectedUrl(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.FarmaciaValidacion));
    await preview(page, ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;');
    const second = await ids(page);
    assert.notEqual(second.review, first.review, 'fresh review must get a new intake_review_id');
    const text = (await page.locator('[data-fh-source-name="presalud"]').textContent()) || '';
    assert.ok(text.includes('UNBOUND'), 'fresh review inherited a source confirmation');
    assertNoErrors(page, 'BQA-2');
  });

  // BQA-3 supported global-apply proof: one confirmed eligible applies; the
  // protected route (never explicitly replaced) survives byte-identical.
  await scenario('BQA-3 global apply executes only the confirmed eligible subset', async page => {
    const dose = page.locator('#fhDermaDosis');
    const via = page.locator('#fhDermaVia');
    await dose.fill('');
    await via.selectOption({ label: 'IV' });
    await preview(page, eordenRaw({ dose: '40 MG', route: 'SC' }));
    assert.ok((await rowState(page, 'requested_dose')).includes('CURRENT_EMPTY'));
    assert.ok((await rowState(page, 'requested_route')).includes('PROTECTED_EXISTING'));
    assert.equal(await actionAvailable(page, 'confirm-for-global', 'requested_dose'), true, 'staging action missing for eligible dose');
    await clickAction(page, 'confirm-for-global', 'requested_dose');
    assert.equal(await dose.inputValue(), '', 'staging must not write before global apply');
    assert.equal(await via.inputValue(), 'IV', 'protected route changed before global apply');
    const global = page.locator('[data-fh-intake-global-apply]');
    assert.equal(await global.count(), 1, 'global apply control missing');
    assert.equal(await global.first().isDisabled(), false, 'global apply should be enabled with a staged eligible concept');
    await global.first().click();
    assert.equal(await dose.inputValue(), '40 MG', 'global apply did not execute the confirmed eligible concept');
    assert.equal(await via.inputValue(), 'IV', 'global apply overwrote the unconfirmed PROTECTED_EXISTING concept');
    assertNoErrors(page, 'BQA-3');
  });

  // BQA-4 global apply cannot blanket-confirm a CONFLICT/REQUIRES_SELECTION concept.
  await scenario('BQA-4 global apply cannot stage conflict/selection', async page => {
    const dose = page.locator('#fhDermaDosis');
    await dose.fill('');
    await preview(page, `${eordenRaw({ dose: '40 MG' })}\n;ADALIMUMAB (BENEPALI);SC;80 MG;CADA 14 DIAS;`, 2);
    assert.equal(await actionAvailable(page, 'confirm-for-global', 'requested_dose'), false, 'conflict/selection must not be stageable');
    const global = page.locator('[data-fh-intake-global-apply]');
    assert.equal(await global.first().isDisabled(), true, 'global apply must stay disabled with nothing staged');
    assert.equal(await dose.inputValue(), '', 'conflict concept must not be written');
    assertNoErrors(page, 'BQA-4');
  });

  console.log(`T8 REPARSE/GLOBAL BROWSER QA PASS ${passed} scenario groups`);
} catch (error) {
  console.error(`T8 REPARSE/GLOBAL BROWSER QA FAIL after ${passed} passed scenario groups: ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
