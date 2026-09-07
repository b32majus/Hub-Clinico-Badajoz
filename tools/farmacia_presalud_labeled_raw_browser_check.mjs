#!/usr/bin/env node
/**
 * Issue #327 — labeled PreSalud raw browser QA on farmacia_validacion.html.
 *
 * Supported interaction only (real textarea paste, real preview trigger, real
 * association confirmation, real per-concept apply decision). No DOM/readonly
 * manipulation. Synthetic fixtures exclusively — no real patient data.
 *
 * The real demonstrated PreSalud export is six `;`-delimited LABELED fields:
 *   Estado: <v> ; Medicamento: <v> ; Vía: <v> ; Dosis: <v> ; Pauta: <v> ; Días: <v>
 * A labeled record must parse into recognized concepts (commercial_name /
 * requested_route / requested_dose ...) with NO unrecognized fragment for the
 * contractual record, then flow through the existing gates: PreSalud starts
 * UNBOUND (PreSalud exports no CIP), explicit source-aware confirmation enables
 * per-concept apply of the exact proposed value.
 *
 * Run: npx --yes --package=playwright node tools/farmacia_presalud_labeled_raw_browser_check.mjs
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-001';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) return createRequire(path.join(nodeModules, '__fh_327_labeled_browser_qa.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_presalud_labeled_raw_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  return readdirSync(cache).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse().map(x => path.join(cache, x, 'chrome-headless-shell-linux64', 'chrome-headless-shell')).find(existsSync) || bundled;
}

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

// Issue #327 exact demonstrated labeled serialization (synthetic ALFA/MARCA-A).
const LABELED_PRESALUD =
  'Estado: ; Medicamento: ALFA (MARCA-A) ; Vía: SC ; Dosis: 40 MG ; Pauta: CADA 14 DIAS ; Días: 18 meses';
// A second fully-labeled record (multi-record must fail closed with zero
// proposals even when labeled).
const LABELED_PRESALUD_2 =
  'Estado: Activo ; Medicamento: BETA (MARCA-B) ; Vía: SC ; Dosis: 80 MG ; Pauta: CADA 14 DIAS ; Días: 10';

const selectedUrl = () => new URL(`farmacia_validacion.html?cip=${encodeURIComponent(CIP)}`, BASE).href;

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
  try { await fn(page); console.log(`OK ${name}`); passed += 1; }
  finally { await page.close(); }
}

try {
  // QA-327-1: labeled PreSalud preview recognizes concepts (no UNRECOGNIZED
  // fragment for the contractual record); UNBOUND prevents write; explicit
  // source-aware confirmation enables apply of the exact labeled values.
  await scenario('QA-327-1 labeled PreSalud preview -> recognize -> confirm -> apply (40 MG)', async page => {
    await page.locator('#fhDermaDosis').fill('');
    await preview(page, LABELED_PRESALUD);
    // The contractual labeled record is RECOGNIZED: its raw is rendered as the
    // source, never as an unrecognized fragment.
    const sourcePanel = page.locator('[data-fh-source-name="presalud"]');
    assert.ok(await sourcePanel.count() === 1, 'labeled PreSalud source unit present');
    const panelText = await sourcePanel.textContent();
    assert.ok(panelText.includes('RECOGNIZED'), 'labeled PreSalud unit state RECOGNIZED');
    assert.ok(panelText.includes('Fuente original'), 'labeled record raw preserved as source (no UNRECOGNIZED_FRAGMENT for the record)');
    assert.ok(!panelText.includes('Fragmento no reconocido'), 'labeled record produces no unrecognized fragment');
    // Concept rows are driven by the same reconciled pipeline as positional.
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), false, 'UNBOUND labeled PreSalud cannot write');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '', 'unchanged while UNBOUND');
    await confirmPresalud(page);
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), true, 'confirmed labeled PreSalud may apply');
    await clickAction(page, 'confirm', 'requested_dose');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '40 MG', 'labeled 40 MG applied to fhDermaDosis');
    assertNoErrors(page, 'QA-327-1');
  });

  // QA-327-2: labeled multi-record fails closed with zero proposals and the raw
  // blocked unit remains visible (MULTI_RECORD_UNSUPPORTED_V0).
  await scenario('QA-327-2 labeled multi-record fails closed (zero proposals, raw visible)', async page => {
    await page.locator('#fhDermaDosis').fill('');
    await preview(page, `${LABELED_PRESALUD}\n${LABELED_PRESALUD_2}`);
    const panelText = await page.locator('[data-fh-source-name="presalud"]').textContent();
    assert.ok(panelText.includes('MULTI_RECORD_UNSUPPORTED_V0') || panelText.includes('PARTIALLY_RECOGNIZED') || panelText.includes('bloqueada'), 'labeled multi-record blocked state surfaced');
    assert.equal(await actionAvailable(page, 'confirm', 'requested_dose'), false, 'multi-record labeled PreSalud never writable');
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '', 'multi-record labeled PreSalud writes nothing');
    assertNoErrors(page, 'QA-327-2');
  });

  console.log(`#327 LABELED PRE-SALUD BROWSER QA PASS ${passed} scenario groups`);
} catch (error) {
  console.error(`#327 LABELED PRE-SALUD BROWSER QA FAIL after ${passed} passed scenario groups: ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
