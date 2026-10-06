#!/usr/bin/env node
// tools/farmacia_pendientes_queue_browser_check.mjs
// WO #549 (WO-NEXUS-FARMACIA-PENDIENTES-V1-20261005) — supported browser QA
// for the `Pendientes` surface (farmacia_actividad_servicio.html).
// Synthetic data only. Real Chromium (headless) over a local static server,
// following the repo tools/*browser_check.mjs pattern:
//   1. Demo-only queue: summary counters visible and consistent with the
//      rendered rows; demo pending row present; no per-card indicator
//      action; no removed KPI/indicator content; console/pageerror = 0.
//   2. Real sidebar navigation: Inicio Farmacia -> `Pendientes` link lands
//      on farmacia_actividad_servicio.html with the queue visible.
//   3. With import: supported synthetic Excel Enfermería upload on Inicio,
//      then sidebar navigation to Pendientes; the queue reflects the
//      imported population (more rows than the demo baseline, Enfermería
//      provenance on cards); detail expand / prebiológico / Abrir
//      validación through supported controls; console/pageerror = 0.
//   4. Tray-E boundary: the hermetic broad-only fixture (enfermer-ish
//      importSource, none of the three explicit origin fields,
//      OK_FARMACIA admitted by the published pending read) flows into
//      the queue through the real seams, counts ONLY in total, renders
//      as a general card with the verbatim origin — never the
//      Enfermería card. The tray-E-only expectation makes a
//      broad-predicate regression fail this scenario.
// Ejecutar: node tools/farmacia_pendientes_queue_browser_check.mjs

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_pendientes_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with a PATH exposing a playwright node_modules.');
}

const { chromium } = loadPlaywrightFromNpx();

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.svg', 'image/svg+xml']
]);

const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

async function newPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String((error && error.message) || error)));
  return { context, page, consoleErrors, pageErrors };
}

function filterRealErrors(consoleErrors) {
  return consoleErrors.filter((text) => text.indexOf('Failed to load resource') === -1);
}

function assertNoPageFailure(pageErrors, consoleErrors) {
  assert.deepEqual(pageErrors, [], 'pageerror');
  assert.deepEqual(filterRealErrors(consoleErrors), [], 'console.error');
}

async function summaryAndQueue(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('#actividadCards [data-summary]')].map((el) => ({
      key: el.getAttribute('data-summary'),
      value: Number(String(el.textContent).replace(/[^0-9]/g, ''))
    }));
    const rows = [...document.querySelectorAll('#actividadPendientesPanel .pending-validation-card')].map((el) => ({
      estado: el.getAttribute('data-pendientes-estado'),
      text: el.textContent
    }));
    return { cards, rows };
  });
}

async function expectedQueueLength(page) {
  // Independent read of the published sync population through the published
  // seams only (no page internals): the rendered queue must be EXACTLY
  // tray E ∪ tray G — the identity key-sets of
  // getEnfermeriaVisiblePatients() and readPendingValidationPatientsSync()
  // in a single pass over readAvailablePatientsSync(), mirroring the
  // product's readSolicitudesQueue(). The broad importSource predicate
  // (isEnfermeriaPatient) is NEVER part of this expectation: a row
  // admitted only by importSource belongs to neither key-set here.
  return page.evaluate(() => {
    const F = window.FarmaciaDemo;
    const keyOf = (p) => {
      const sid = p && p.solicitud_id ? String(p.solicitud_id).trim().toUpperCase() : '';
      return sid ? `SID:${sid}` : `CIP:${String((p && p.cip) || '').trim().toUpperCase()}`;
    };
    const population = F.readAvailablePatientsSync();
    const trayEKeys = {};
    F.getEnfermeriaVisiblePatients().forEach((p) => { trayEKeys[keyOf(p)] = true; });
    const pendingKeys = {};
    F.readPendingValidationPatientsSync().forEach((p) => { pendingKeys[keyOf(p)] = true; });
    const queueKeys = {};
    for (const key of Object.keys(trayEKeys)) queueKeys[key] = true;
    for (const key of Object.keys(pendingKeys)) queueKeys[key] = true;
    return population.filter((p) => queueKeys[keyOf(p)]).length;
  });
}

// Hermetic broad-only fixture (tray-E boundary proof): enfermer-ish
// importSource, NONE of the three explicit origin fields
// (origen_solicitud / tipo_origen / source_type), OK_FARMACIA so the
// published pending read admits it into tray G. Injected below the
// published read seams (appended to the FarmaciaDataImports source the
// real getAvailablePatients() merge consumes), so admission, counting
// and card type all flow through the real product path. Synthetic CIP:
// never collides with demo or Excel-fixture data.
const BROAD_ONLY_CIP = 'CIP-SINT-BROAD-ONLY-001';
const BROAD_ONLY_ORIGIN = 'Enfermería externa (solo importSource)';
const BROAD_ONLY_FIXTURE = {
  cip: BROAD_ONLY_CIP,
  nombre: 'Paciente sintético solo importSource',
  servicio: 'Reumatología',
  patologia: 'Artritis Reumatoide (AR)',
  farmaco: 'Fármaco sintético',
  fechaSolicitud: '2026-10-01',
  importSource: BROAD_ONLY_ORIGIN,
  estado: 'OK_FARMACIA',
  estado_prebiologico_enfermeria: 'OK_FARMACIA',
  estadoLabel: 'OK Farmacia'
};

async function queueCards(page) {
  return page.evaluate(() => [...document.querySelectorAll('#actividadPendientesPanel .pending-validation-card')].map((el) => ({
    enfCip: el.getAttribute('data-enf-cip'),
    cip: el.getAttribute('data-pendientes-cip'),
    solicitud: el.getAttribute('data-pendientes-solicitud'),
    estado: el.getAttribute('data-pendientes-estado'),
    text: el.textContent
  })));
}

// ─── 1. Demo-only queue: summary consistent with rendered rows ───────────────

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadCards [data-summary]').length === 4, null, { timeout: 15000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadPendientesPanel .pending-validation-card').length > 0,
      null, { timeout: 15000 });
    const { cards, rows } = await summaryAndQueue(page);
    const byKey = Object.fromEntries(cards.map((c) => [c.key, c.value]));
    assert.equal(cards.length, 4, 'four summary counters rendered');
    assert.ok(Number.isInteger(byKey.total) && byKey.total === rows.length,
      `summary total matches rendered rows: total=${byKey.total} rows=${rows.length}`);
    assert.ok(byKey.listas + byKey.vigilancia + byKey.bloqueadas <= byKey.total,
      'category counters never exceed the total');
    assert.equal(await expectedQueueLength(page), rows.length, 'rendered queue reflects the published sync population');
    const queueText = rows.map((r) => r.text).join('\n');
    assert.ok(queueText.includes('CIP-DEMO-FH-002'), 'demo pending row visible without import');
    assert.ok(!queueText.includes('Dashboard'), 'no per-card indicator action on demo rows');
    const bodyText = await page.locator('body').innerText();
    for (const removed of ['Validaciones pendientes', 'PROMs pendientes', 'Optimizaciones',
      'Fármacos frecuentes', 'En seguimiento', 'solicitudes generales']) {
      assert.ok(!bodyText.includes(removed), `removed indicator content absent: ${removed}`);
    }
    const sidebarHref = await page.evaluate(() =>
      [...document.querySelectorAll('.sidebar a')].find((a) => a.textContent.trim() === 'Pendientes')?.getAttribute('href'));
    assert.equal(sidebarHref, 'farmacia_actividad_servicio.html', 'sidebar Pendientes keeps its href');
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('demo-only queue renders a consistent summary with no indicator actions');
  } catch (error) {
    bad('demo-only queue renders a consistent summary with no indicator actions', error && error.message);
  } finally {
    await context.close();
  }
}

// ─── 2. Real sidebar navigation: Inicio -> Pendientes ────────────────────────

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDemo, null, { timeout: 15000 });
    const link = page.locator('.sidebar a[href="farmacia_actividad_servicio.html"]');
    assert.equal((await link.innerText()).trim(), 'Pendientes', 'sidebar entry renamed to Pendientes');
    await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
    assert.ok(page.url().endsWith('farmacia_actividad_servicio.html'), `landed on Pendientes: ${page.url()}`);
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadCards [data-summary]').length === 4, null, { timeout: 15000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadPendientesPanel .pending-validation-card').length > 0,
      null, { timeout: 15000 });
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('real sidebar navigation from Inicio to the renamed Pendientes entry');
  } catch (error) {
    bad('real sidebar navigation from Inicio to the renamed Pendientes entry', error && error.message);
  } finally {
    await context.close();
  }
}

// ─── 3. With import: supported Excel upload flows into the single queue ──────

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    const fixture = readFileSync(path.join(ROOT, 'tools/fixtures/enfermeria_v6_sintetico_v1.xlsx'));
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.FarmaciaDataImports, null, { timeout: 15000 });
    await page.locator('#inputExcelEnfermeria').setInputFiles({
      name: 'enfermeria_v6_sintetico_v1.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: fixture
    });
    await page.waitForFunction(
      () => (window.FarmaciaDataImports?.getState('enfermeria')?.rows?.length || 0) > 0, null, { timeout: 30000 });
    const link = page.locator('.sidebar a[href="farmacia_actividad_servicio.html"]');
    await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
    assert.ok(page.url().endsWith('farmacia_actividad_servicio.html'), `landed on Pendientes: ${page.url()}`);
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadPendientesPanel .pending-validation-card').length > 1,
      null, { timeout: 15000 });
    const { cards, rows } = await summaryAndQueue(page);
    const byKey = Object.fromEntries(cards.map((c) => [c.key, c.value]));
    assert.equal(await expectedQueueLength(page), rows.length, 'imported queue reflects the published sync population');
    assert.equal(byKey.total, rows.length, 'summary total matches rendered rows with import');
    assert.ok(rows.length > 1, `imported rows visible in the single queue: ${rows.length}`);
    const queueText = rows.map((r) => r.text).join('\n');
    assert.ok(queueText.includes('Origen: Excel Enfermería'), 'Enfermería origin present as card provenance');
    assert.ok(!queueText.includes('Dashboard'), 'no per-card indicator action on imported rows');
    assert.ok(!queueText.toLowerCase().includes('solicitudes generales'), 'no second inbox with import');
    // Supported interaction: expand the first detail toggle.
    const toggle = page.locator('#actividadPendientesPanel [data-pendientes-toggle]').first();
    await toggle.waitFor({ timeout: 10000 });
    const panelId = await toggle.getAttribute('aria-controls');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'toggle starts collapsed');
    await toggle.click();
    await page.waitForFunction((id) => document.getElementById(id)?.classList.contains('open'), panelId, { timeout: 10000 });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'toggle reports its expanded state');
    const detailText = await page.evaluate((id) => document.getElementById(id)?.textContent || '', panelId);
    assert.ok(detailText.includes('Detalle prebiológico Enfermería'), 'prebiológico detail rendered on expand');
    // Supported interaction: open Validación through the card link.
    const validar = page.locator('#actividadPendientesPanel a[data-enf-action="validar"]').first();
    await validar.waitFor({ timeout: 10000 });
    const href = await validar.getAttribute('href');
    assert.ok(href && href.startsWith('farmacia_validacion.html?') && href.includes('cip='),
      `validación link carries the supported context: ${href}`);
    await Promise.all([page.waitForLoadState('domcontentloaded'), validar.click()]);
    assert.ok(page.url().includes('farmacia_validacion.html?') && page.url().includes('cip='),
      `supported navigation reaches Validación with context: ${page.url()}`);
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('supported import flows into the single queue with expand and validación navigation');
  } catch (error) {
    bad('supported import flows into the single queue with expand and validación navigation', error && error.message);
  } finally {
    await context.close();
  }
}

// ─── 4. Tray-E boundary: broad-only fixture counts only in total ──────────

{
  const { context, page, consoleErrors, pageErrors } = await newPage();
  try {
    await page.goto(base + 'farmacia_actividad_servicio.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadCards [data-summary]').length === 4, null, { timeout: 15000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#actividadPendientesPanel .pending-validation-card').length > 0,
      null, { timeout: 15000 });
    const before = await summaryAndQueue(page);
    const beforeByKey = Object.fromEntries(before.cards.map((c) => [c.key, c.value]));
    assert.equal(await expectedQueueLength(page), before.rows.length, 'baseline queue reflects the tray-E ∪ pending union');
    // Hermetic injection below the published read seams: the broad-only
    // row joins the FarmaciaDataImports source consumed by the real
    // getAvailablePatients() merge, then the page re-renders through its
    // own farmacia:data-imported listener. Synthetic data only.
    await page.evaluate((fixture) => {
      const imports = window.FarmaciaDataImports;
      const original = imports.getImportedPatients.bind(imports);
      imports.getImportedPatients = () => original().concat([fixture]);
      document.dispatchEvent(new CustomEvent('farmacia:data-imported'));
    }, BROAD_ONLY_FIXTURE);
    await page.waitForFunction(
      (cip) => [...document.querySelectorAll('#actividadPendientesPanel .pending-validation-card')]
        .some((el) => (el.textContent || '').includes(cip)),
      BROAD_ONLY_CIP, { timeout: 15000 });
    // The published seams admit the row into tray G but never into tray E.
    const trayMembership = await page.evaluate((cip) => {
      const F = window.FarmaciaDemo;
      const match = (p) => String((p && p.cip) || '').trim().toUpperCase() === String(cip).toUpperCase();
      return {
        inPending: F.readPendingValidationPatientsSync().some(match),
        inTrayE: F.getEnfermeriaVisiblePatients().some(match)
      };
    }, BROAD_ONLY_CIP);
    assert.equal(trayMembership.inPending, true, 'broad-only fixture admitted by the published pending read');
    assert.equal(trayMembership.inTrayE, false, 'broad-only fixture never in the published tray E');
    const { cards, rows } = await summaryAndQueue(page);
    const byKey = Object.fromEntries(cards.map((c) => [c.key, c.value]));
    assert.equal(await expectedQueueLength(page), rows.length, 'queue with the broad-only row reflects the tray-E ∪ pending union');
    assert.equal(byKey.total, beforeByKey.total + 1, 'broad-only row joins the queue (total + 1)');
    assert.equal(byKey.listas, beforeByKey.listas, 'broad-only OK_FARMACIA row never feeds Listas');
    assert.equal(byKey.vigilancia, beforeByKey.vigilancia, 'broad-only row never feeds En vigilancia');
    assert.equal(byKey.bloqueadas, beforeByKey.bloqueadas, 'broad-only row never feeds Bloqueadas');
    assert.ok(byKey.listas + byKey.vigilancia + byKey.bloqueadas <= byKey.total,
      'category counters never exceed the total with the broad-only row');
    const rendered = await queueCards(page);
    const broadCard = rendered.find((card) => (card.text || '').includes(BROAD_ONLY_CIP));
    assert.ok(broadCard, 'broad-only row renders a card in the queue');
    assert.equal(broadCard.estado, 'general', 'broad-only row renders as a general card');
    assert.equal(broadCard.enfCip, null, 'broad-only row never receives the Enfermería card');
    assert.ok(broadCard.text.includes(`Origen: ${BROAD_ONLY_ORIGIN}`), 'broad-only card shows the verbatim origin');
    assert.ok(!broadCard.text.includes('Origen: Excel Enfermería'), 'broad-only card never carries the hardcoded Enfermería origin');
    assert.ok(!broadCard.text.includes('Dashboard'), 'no per-card indicator action on the broad-only card');
    assertNoPageFailure(pageErrors, consoleErrors);
    ok('broad-only fixture counts only in total as a general card with verbatim origin');
  } catch (error) {
    bad('broad-only fixture counts only in total as a general card with verbatim origin', error && error.message);
  } finally {
    await context.close();
  }
}

await browser.close();
server.close();

console.log(`\nFARMACIA-PENDIENTES-QUEUE-BROWSER: ${failures.length === 0 ? 'PASS' : 'FAIL'} ${passed} scenarios`);
if (failures.length > 0) process.exit(1);
