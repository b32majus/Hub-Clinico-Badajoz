#!/usr/bin/env node
// tools/farmacia_estratificacion_sefh_browser_check.mjs
// WO-FH-ESTRATIFICACION-SEFH-20260916 — supported-route browser QA.
// 1. Primera Visita: the three controls of the first "Registro de primera visita"
//    row (Fecha / ¿Se realiza inducción? / Estratificación) stay visually aligned
//    (same top and bottom edges, 1px tolerance).
// 2. Primera Visita + Seguimiento: a single secondary access "Acceso a Estratificación SEFH"
//    points exactly to the SEFH external tool, opens a new tab safely
//    (target="_blank" + rel="noopener noreferrer") and never navigates away.
// 3. Seguimiento: selecting "Sí" in "¿Cambia nivel de estratificación?" still reveals
//    "Nuevo nivel si cambia" with exactly Nivel 1 / Nivel 2 / Nivel 3; the SEFH access
//    does not alter that circuit.
// Console/page errors must stay at zero. Synthetic data only; no clinical inference.
// Run with: npx --yes --package=playwright node tools/farmacia_estratificacion_sefh_browser_check.mjs

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEFH_URL = 'https://ramonmorillo.github.io/hub-estratificacionCMO/';
const BUTTON_TEXT = 'Acceso a Estratificación SEFH';
const INITIAL_CIP = 'CIP-DEMO-FH-001';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_estratificacion_sefh_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_estratificacion_sefh_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache).filter(entry => entry.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml']
]);
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'farmacia_primera_visita.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
const BASE_URL = `http://127.0.0.1:${address.port}/`;

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

// The external SEFH tool is never fetched during QA: the outgoing navigation is
// fulfilled locally so the supported interaction (click → new tab) is proven
// without embedding or loading external content.
await context.route('**ramonmorillo.github.io/**', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'sefh-stub' }));

async function newInstrumentedPage() {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  return { page, consoleErrors, pageErrors };
}

function assertSameBox(actual, expected, label) {
  for (const key of Object.keys(expected)) {
    assert.ok(Math.abs(actual[key] - expected[key]) <= 1, `${label} ${key} aligned (${actual[key]} vs ${expected[key]})`);
  }
}

async function assertSefhAccess(page, scopeSelector) {
  const link = page.locator(`${scopeSelector} a.btn`, { hasText: BUTTON_TEXT });
  assert.equal(await link.count(), 1, `exactly one "${BUTTON_TEXT}" access in scope`);
  assert.equal(await link.getAttribute('href'), SEFH_URL, 'href points exactly to the SEFH tool');
  assert.equal(await link.getAttribute('target'), '_blank', 'opens in a new tab');
  const rel = await link.getAttribute('rel');
  assert.ok(rel && rel.split(/\s+/).includes('noopener') && rel.split(/\s+/).includes('noreferrer'), `rel protects the new tab (${rel})`);
  assert.equal(await link.isVisible(), true, 'SEFH access is visible');
  return link;
}

try {
  // ---------- Primera Visita ----------
  const pv = await newInstrumentedPage();
  await pv.page.goto(new URL(`farmacia_primera_visita.html?cip=${INITIAL_CIP}`, BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await pv.page.waitForFunction(() => window.FarmaciaPrimeraVisita);

  const rowSelector = 'section:has(h2.section-title:text("Registro de primera visita")) .form-grid--align-end';
  const pvRow = pv.page.locator(rowSelector);
  assert.equal(await pvRow.count(), 1, 'exactly one aligned first-visit row');

  const fechaBox = await pv.page.locator('#fhPvFecha').boundingBox();
  const induccionBox = await pv.page.locator('#fhPvInduccionRealizada').boundingBox();
  const estratBox = await pv.page.locator('#fhPvEstratificacion').boundingBox();
  assert.ok(fechaBox && induccionBox && estratBox, 'the three controls are rendered');
  const expected = { y: fechaBox.y, height: fechaBox.height };
  assertSameBox(induccionBox, expected, 'induccion control vs fecha control');
  assertSameBox(estratBox, expected, 'estratificacion control vs fecha control');

  const pvHint = pv.page.locator('small.form-hint', { hasText: 'Fecha canónica única' });
  assert.equal(await pvHint.count(), 1, 'the fecha hint stays present exactly once');

  // The three selects keep working through supported interaction.
  await pv.page.locator('#fhPvInduccionRealizada').selectOption({ label: 'Sí' });
  await pv.page.locator('#fhPvEstratificacion').selectOption({ label: 'Nivel 2' });
  assert.equal(await pv.page.locator('#fhPvInduccionRealizada').inputValue(), 'Sí');
  assert.equal(await pv.page.locator('#fhPvEstratificacion').inputValue(), 'Nivel 2');

  const pvLink = await assertSefhAccess(pv.page, 'section:has(h2.section-title:text("Registro de primera visita"))');

  // Keyboard: the access is reachable by keyboard focus.
  await pvLink.focus();
  assert.equal(await pv.page.evaluate(() => document.activeElement?.textContent?.trim()), BUTTON_TEXT, 'SEFH access is keyboard-focusable');

  // Click proves a new tab opens and the form never navigates away.
  const [pvPopup] = await Promise.all([
    pv.page.waitForEvent('popup'),
    pvLink.click()
  ]);
  await pvPopup.waitForLoadState('domcontentloaded');
  assert.equal(new URL(pvPopup.url()).origin + new URL(pvPopup.url()).pathname, 'https://ramonmorillo.github.io/hub-estratificacionCMO/', 'popup opens the SEFH tool URL');
  assert.equal(pv.page.url().includes('farmacia_primera_visita.html'), true, 'the form page stays on itself');
  await pvPopup.close();

  assert.deepEqual(pv.consoleErrors, [], `first visit console errors: ${pv.consoleErrors.join('\n')}`);
  assert.deepEqual(pv.pageErrors, [], `first visit page errors: ${pv.pageErrors.join('\n')}`);
  await pv.page.close();

  // ---------- Seguimiento ----------
  const seg = await newInstrumentedPage();
  await seg.page.goto(new URL(`farmacia_seguimiento.html?cip=${INITIAL_CIP}`, BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await seg.page.waitForFunction(() => window.FarmaciaSeguimiento);

  const evoHeading = seg.page.locator('h2.section-title', { hasText: 'Evolución farmacoterapéutica' });
  assert.equal(await evoHeading.count(), 1, '"Evolución farmacoterapéutica" block is present');
  const evoSection = seg.page.locator('section.dashboard-card', { has: evoHeading });

  const segLink = evoSection.locator('a.btn', { hasText: BUTTON_TEXT });
  assert.equal(await segLink.count(), 1, 'exactly one SEFH access in the evolución block');
  assert.equal(await segLink.getAttribute('href'), SEFH_URL, 'seguimiento href points exactly to the SEFH tool');
  assert.equal(await segLink.getAttribute('target'), '_blank', 'seguimiento access opens in a new tab');
  assert.equal(await segLink.isVisible(), true, 'seguimiento SEFH access is visible');

  // The existing stratification-change circuit is intact and unaffected.
  const nuevoNivel = seg.page.locator('#fhSegNuevoNivel');
  assert.equal(await nuevoNivel.isVisible(), false, '"Nuevo nivel si cambia" starts hidden');
  await seg.page.locator('#fhSegCambiaNivel').selectOption({ label: 'Sí' });
  assert.equal(await nuevoNivel.isVisible(), true, 'selecting "Sí" reveals "Nuevo nivel si cambia"');
  const nivelOptions = await nuevoNivel.locator('option').evaluateAll(options => options.map(option => option.textContent).filter(Boolean));
  assert.deepEqual(nivelOptions, ['Nivel 1', 'Nivel 2', 'Nivel 3'], 'levels stay exactly Nivel 1 / Nivel 2 / Nivel 3');
  await nuevoNivel.selectOption({ label: 'Nivel 3' });
  assert.equal(await nuevoNivel.inputValue(), 'Nivel 3');
  await seg.page.locator('#fhSegCambiaNivel').selectOption({ label: 'No' });
  assert.equal(await nuevoNivel.isVisible(), false, 'selecting "No" hides "Nuevo nivel si cambia" again');

  const [segPopup] = await Promise.all([
    seg.page.waitForEvent('popup'),
    segLink.click()
  ]);
  await segPopup.waitForLoadState('domcontentloaded');
  assert.equal(new URL(segPopup.url()).origin + new URL(segPopup.url()).pathname, 'https://ramonmorillo.github.io/hub-estratificacionCMO/', 'seguimiento popup opens the SEFH tool URL');
  assert.equal(seg.page.url().includes('farmacia_seguimiento.html'), true, 'the seguimiento page stays on itself');
  await segPopup.close();

  assert.deepEqual(seg.consoleErrors, [], `seguimiento console errors: ${seg.consoleErrors.join('\n')}`);
  assert.deepEqual(seg.pageErrors, [], `seguimiento page errors: ${seg.pageErrors.join('\n')}`);
  await seg.page.close();

  console.log('PASS: Estratificación SEFH browser QA (alignment + access in both routes, Chromium, ephemeral server).');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
