#!/usr/bin/env node
// tools/farmacia_import_persistence_browser_check.mjs
// Issue #368 (N5 of train #364) — supported browser QA for the fail-closed
// import persistence property: FAILED PERSISTENCE => NEW DATASET NOT ACTIVE.
// Fault injection touches ONLY the Storage API (sessionStorage.setItem is made
// to throw QuotaExceededError via a wrapper installed before app scripts run);
// the clinical DOM is never manipulated and no readonly state is changed.
//  1) No previous source + failing persistence => explicit visible rejection
//     message, no "Excel cargado" claim, no imported cards, console/page
//     errors 0 (the managed expected failure is handled by the app).
//  2) Valid previous source A (confirmed persistence) + failing persistence
//     for workbook B => "Nuevo archivo rechazado ... Sigue activo el Excel
//     anterior", board still derived from A only (no A/B mixing).
//  3) Happy path control: persistence success keeps current behavior and the
//     sessionStorage snapshot is really written.

import fs from 'fs';
import path from 'path';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
  const roots = [];
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    roots.push(path.resolve(binDirectory, '..'));
    roots.push(path.join(path.resolve(binDirectory, '..'), 'lib', 'node_modules'));
  }
  for (const nodeModules of roots) {
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_persist_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_import_persistence_browser_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter(entry => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.filter(existsSync)[0] || bundled;
}

const FIX_A = path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_v1.xlsx');
const FIX_B = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx');
if (!existsSync(FIX_A) || !existsSync(FIX_B)) {
  console.error('FATAL: faltan fixtures sintéticos (enfermería v6).');
  process.exit(1);
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.svg', 'image/svg+xml'], ['.xlsx', 'application/octet-stream']
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
const BASE = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

let passed = 0;
let failed = 0;
function assert(condition, label) {
  if (condition) { passed++; console.log('  \u2713 ' + label); }
  else { failed++; console.log('  \u2717 ' + label); }
}

/* Wrapper installed before app scripts run. Reads/removals delegate to the
   real sessionStorage so nothing else changes; writes throw when the fault
   flag is on (deterministic quota failure). The clinical DOM is untouched. */
const STORAGE_FAULT_SCRIPT = `
  window.__n5PersistenceFail = false;
  const realStorage = window.sessionStorage;
  const failingStorage = {
    getItem: (k) => realStorage.getItem(k),
    setItem: () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); },
    removeItem: (k) => realStorage.removeItem(k),
    clear: () => realStorage.clear(),
    key: (i) => realStorage.key(i),
    get length() { return realStorage.length; }
  };
  Object.defineProperty(window, 'sessionStorage', {
    get: () => (window.__n5PersistenceFail ? failingStorage : realStorage),
    configurable: true
  });
`;

const consoleErrors = [];
const pageErrors = [];

async function newPage(label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`[${label}] ${message.text()}`); });
  page.on('pageerror', (error) => pageErrors.push(`[${label}] ${error.message}`));
  return { context, page };
}

async function importEnfermeria(page, file) {
  await page.setInputFiles('#inputExcelEnfermeria', file);
}

// ─── 1) No previous source + failing persistence ─────────────────────────────
console.log('\n=== 1) Sin fuente previa + persistencia fallida => importación rechazada, sin activación engañosa ===');
{
  const { context, page } = await newPage('A-fallo-sin-previa');
  await context.addInitScript(STORAGE_FAULT_SCRIPT);
  // Fault from the very start: no previous source can exist.
  await context.addInitScript(() => { window.__n5PersistenceFail = true; });
  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });

  await importEnfermeria(page, FIX_A);
  await page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').indexOf('no pudo conservar') !== -1;
  }, null, { timeout: 15000 });

  const status = await page.locator('#estadoCargaEnfermeria').textContent();
  assert(status.includes('Error al cargar Excel de Enfermería'), 'mensaje de rechazo explícito visible');
  assert(status.includes('almacenamiento de sesión'), 'mensaje explica el almacenamiento de sesión');
  assert(status.includes('no se ha activado ningún Excel nuevo'), 'mensaje declara que no hay Excel nuevo activo');
  assert(!status.includes('cargado ·'), 'sin afirmación "Excel cargado"');

  const cardCount = await page.locator('[data-enf-solicitud]').count();
  assert(cardCount === 0, 'cero tarjetas importadas (sin identidad fabricada)');

  const dbTime = await page.locator('#dbStatusTime').textContent().catch(() => '');
  assert(!(dbTime || '').includes('Enfermería cargada'), 'indicador DB no reclama Enfermería cargada');

  await context.close();
}

// ─── 2) Replacement over a valid previous source ─────────────────────────────
console.log('\n=== 2) Sustitución con fuente previa válida => B rechazado, A sigue activo byte-for-byte ===');
{
  const { context, page } = await newPage('B-reemplazo');
  await context.addInitScript(STORAGE_FAULT_SCRIPT);
  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });

  await importEnfermeria(page, FIX_A);
  await page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').includes('cargado · 5 registros');
  }, null, { timeout: 15000 });
  assert((await page.locator('[data-enf-solicitud]').count()) === 5, 'fuente A activa: 5 tarjetas');

  const statusBefore = await page.locator('#estadoCargaEnfermeria').textContent();

  // Fault on from now on: only writes fail; existing persisted data survives.
  await page.evaluate(() => { window.__n5PersistenceFail = true; });

  await importEnfermeria(page, FIX_B);
  await page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').indexOf('Nuevo archivo rechazado') !== -1;
  }, null, { timeout: 15000 });

  const status = await page.locator('#estadoCargaEnfermeria').textContent();
  assert(status.includes('Nuevo archivo rechazado'), 'mensaje "Nuevo archivo rechazado" visible');
  assert(status.includes('no pudo conservar'), 'mensaje explica el fallo de persistencia');
  assert(status.includes('Sigue activo el Excel anterior'), 'mensaje declara la fuente anterior activa');
  assert(status.includes('enfermeria_v6_sintetico_v1.xlsx'), 'mensaje nombra el archivo anterior (A)');

  const cardCount = await page.locator('[data-enf-solicitud]').count();
  assert(cardCount === 5, `tablero sigue derivado de A: 5 tarjetas (recibido ${cardCount})`);
  assert((await page.locator('[data-enf-solicitud="SOL-DER-000007"]').count()) === 0, 'ninguna tarjeta del candidato B (SOL-DER-000007)');
  assert((await page.locator('[data-enf-solicitud="SOL-REU-000008"]').count()) === 0, 'ninguna tarjeta del candidato B (SOL-REU-000008)');
  assert((await page.locator('[data-enf-solicitud="SOL-DER-000001"]').count()) === 1, 'tarjeta de A (SOL-DER-000001) sigue presente');

  // Functional state of A preserved byte-for-byte in real sessionStorage.
  const raw = await page.evaluate(() => window.sessionStorage.getItem('farmaciaDemo.enfermeriaImport'));
  assert(!!raw && JSON.parse(raw).fileName === 'enfermeria_v6_sintetico_v1.xlsx' && JSON.parse(raw).rowCount === 5, 'snapshot persistido de A intacto (fileName + rowCount)');
  assert(statusBefore.includes('cargado · 5 registros'), 'estado previo verificado');

  await context.close();
}

// ─── 3) Happy path control ───────────────────────────────────────────────────
console.log('\n=== 3) Camino válido: persistencia confirmada sigue funcionando ===');
{
  const { context, page } = await newPage('C-camino-feliz');
  await context.addInitScript(STORAGE_FAULT_SCRIPT); // fault stays OFF
  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });

  await importEnfermeria(page, FIX_A);
  await page.waitForFunction(() => {
    const el = document.getElementById('estadoCargaEnfermeria');
    return el && (el.textContent || '').includes('cargado · 5 registros');
  }, null, { timeout: 15000 });
  assert((await page.locator('#estadoCargaEnfermeria').textContent()).includes('Excel Enfermería cargado · 5 registros'), 'UI de carga correcta conservada');
  assert((await page.locator('[data-enf-solicitud]').count()) === 5, 'tablero deriva del Excel cargado (5 tarjetas)');

  const raw = await page.evaluate(() => window.sessionStorage.getItem('farmaciaDemo.enfermeriaImport'));
  assert(!!raw && JSON.parse(raw).rowCount === 5, 'persistencia real confirmada en sessionStorage');

  await context.close();
}

await browser.close();
server.close();

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
console.log(`CONSOLE_ERRORS=${consoleErrors.length}`);
console.log(`PAGE_ERRORS=${pageErrors.length}`);
if (consoleErrors.length) consoleErrors.forEach((e) => console.error('  console.error: ' + e));
if (pageErrors.length) pageErrors.forEach((e) => console.error('  pageerror: ' + e));
process.exit(failed > 0 || consoleErrors.length > 0 || pageErrors.length > 0 ? 1 : 0);
