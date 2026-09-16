#!/usr/bin/env node
// tools/farmacia_reconcil_handoff_browser_check.mjs
// Issue #367 (N4 of train #364) — REAL browser navigation QA for the
// solicitud_id handoff Inicio (farmacia_index.html) → Validación
// (farmacia_validacion.html), with a CIP that has TWO distinct requests.
//
// Supported interaction only (no DOM manipulation, no readonly state changes):
//  1) serve the worktree over http;
//  2) load the synthetic Enfermería v6 handoff workbook (real file input);
//  3) load the synthetic Farmacia FH workbook (real file input), including a
//     pendiente act for request A and an anti-heuristic decoy validado with
//     NO solicitud_id;
//  4) click the supported "Abrir validación" action of request A
//     (SOL-DER-000901) and verify on farmacia_validacion.html that the EXACT
//     request is resolved (origin excel_enfermeria, resolved solicitud_id)
//     and exported via the clipboard TSV (last column = solicitud_id);
//  5) negative case: navigate back, click the OTHER request of the same CIP
//     (SOL-DER-000902) and verify IT resolves its OWN id — never the first;
//  6) manual-origin control: farmacia_validacion.html without context
//     resolves no patient and the exported TSV carries an empty solicitud_id;
//  7) console.error = 0, pageerror = 0.
// All data synthetic — no real patients, no real CIPs, no credentials.

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
      return createRequire(path.join(nodeModules, '__fh_reconcil_handoff_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_reconcil_handoff_browser_check.mjs');
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
  return candidates.find(existsSync) || bundled;
}

const FIX_NURSING = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_handoff_enfermeria_v6_sintetico_v1.xlsx');
const FIX_FH = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_handoff_fh_sintetico_v1.xlsx');
if (!existsSync(FIX_NURSING) || !existsSync(FIX_FH)) {
  console.error('FATAL: faltan fixtures sintéticos N4; ejecutar antes tools/farmacia_reconcil_fixtures_generate.mjs');
  process.exit(1);
}

const SHARED_CIP = 'CIP-RECON-HANDOFF';
const REQUEST_A = 'SOL-REU-000901';
const REQUEST_B = 'SOL-REU-000902';

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

const consoleErrors = [];
const pageErrors = [];

let passed = 0;
let failed = 0;
function assert(condition, label) {
  if (condition) { passed++; console.log('  \u2713 ' + label); }
  else { failed++; console.log('  \u2717 ' + label); }
}

async function readClipboard(page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

// Exports the FH validation row through the supported button and returns the
// full clipboard TSV. Estado is chosen through the supported result select.
async function exportValidationRow(page, estadoValue) {
  await page.selectOption('#fhValEstado', estadoValue);
  await page.click('#fhValExcelExportBtn');
  await page.waitForTimeout(400);
  return readClipboard(page);
}

function lastTsvColumn(tsv) {
  const line = String(tsv || '').split('\n').find(l => l.trim().length);
  if (!line) return null;
  const cols = line.split('\t');
  return cols[cols.length - 1];
}

async function openRequestAndVerify(page, requestLabel, expectedSid) {
  // Supported navigation: click the "Abrir validación" link of THIS request card.
  const card = page.locator(`[data-enf-solicitud="${expectedSid}"]`);
  assert(await card.count() === 1, `${requestLabel}: tarjeta visible en el board Enfermería`);
  const link = card.locator('[data-enf-action="validar"]');
  assert(await link.count() === 1, `${requestLabel}: ofrece la acción soportada Abrir validación`);
  const href = await link.getAttribute('href');
  assert(href.includes('solicitud_id=' + encodeURIComponent(expectedSid)), `${requestLabel}: el href soportado transporta SU solicitud_id (${href})`);

  await Promise.all([
    page.waitForURL('**/farmacia_validacion.html*', { timeout: 15000 }),
    link.click()
  ]);
  const url = page.url();
  assert(url.includes('farmacia_validacion.html') && url.includes('solicitud_id=' + encodeURIComponent(expectedSid)),
    `${requestLabel}: navegación real a farmacia_validacion.html con la identidad en la URL`);

  // The destination page resolves THIS request through the persisted dataset.
  await page.waitForFunction((sid) => {
    const F = window.FarmaciaDemo;
    if (!F || !F.getQueryContext) return false;
    const ctx = F.getQueryContext();
    return ctx.patient && ctx.patient.solicitud_id === sid;
  }, expectedSid, { timeout: 15000 });
  const resolved = await page.evaluate(() => {
    const ctx = window.FarmaciaDemo.getQueryContext();
    return { sid: ctx.patient.solicitud_id, cip: ctx.patient.cip, estado: ctx.patient.estado };
  });
  assert(resolved.sid === expectedSid, `${requestLabel}: página destino resuelve SU solicitud_id (${resolved.sid})`);
  assert(resolved.cip === SHARED_CIP, `${requestLabel}: el registro resuelto pertenece al CIP compartido`);
  const origin = await page.inputValue('#fhOrigenEntrada');
  assert(origin === 'excel_enfermeria', `${requestLabel}: origen reconocido excel_enfermeria (recibido ${origin})`);

  // Exported FH row via supported button: last TSV column carries the request identity.
  const tsv = await exportValidationRow(page, 'pending');
  const sidColumn = lastTsvColumn(tsv);
  assert(sidColumn === expectedSid, `${requestLabel}: TSV exportado transporta la identidad exacta (última columna=${sidColumn})`);
  return { url, resolved, tsvColumn: sidColumn };
}

try {
  console.log('\n=== N4 handoff: Inicio → Validación (navegación soportada real) ===');
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // 1) Supported import of both synthetic workbooks on farmacia_index.html.
  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });
  await page.setInputFiles('#inputExcelEnfermeria', FIX_NURSING);
  await page.waitForFunction(
    () => /importad|cargad|registrad|actualiz/i.test((document.getElementById('estadoCargaEnfermeria') || {}).textContent || ''),
    { timeout: 15000 }
  );
  await page.setInputFiles('#inputExcelFarmacia', FIX_FH);
  await page.waitForFunction(
    () => /importad|cargad|registrad|actualiz/i.test((document.getElementById('estadoCargaFarmacia') || {}).textContent || ''),
    { timeout: 15000 }
  );
  assert(true, 'Carga soportada de los dos Excel sintéticos en farmacia_index.html');

  await page.waitForFunction(() => {
    const text = document.getElementById('enfermeriaBoardCards')?.textContent || '';
    return text.includes('SOL-REU-000901') && text.includes('SOL-REU-000902');
  }, { timeout: 15000 });

  // Same CIP with two distinct requests: two independent cards, both openable.
  const sharedCards = page.locator(`[data-enf-cip="${SHARED_CIP}"][data-enf-solicitud]`);
  assert(await sharedCards.count() === 2, 'Misma CIP con dos solicitudes → dos tarjetas independientes');
  const cardA = page.locator(`[data-enf-solicitud="${REQUEST_A}"]`);
  const cardB = page.locator(`[data-enf-solicitud="${REQUEST_B}"]`);
  assert((await cardA.textContent()).includes('Abrir validación') && (await cardB.textContent()).includes('Abrir validación'),
    'Ambas solicitudes del mismo CIP siguen pendientes (PENDING_FH) y ofrecen Abrir validación');

  // 2) Open request A of the shared CIP → resolves ITS OWN id.
  await openRequestAndVerify(page, 'Solicitud A (' + REQUEST_A + ')', REQUEST_A);

  // 3) Negative case: navigate back to Inicio, open the OTHER request → its own id.
  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });
  await page.waitForFunction((sid) => {
    return !!document.querySelector(`[data-enf-solicitud="${sid}"]`);
  }, REQUEST_B, { timeout: 15000 });
  await openRequestAndVerify(page, 'Solicitud B (' + REQUEST_B + ')', REQUEST_B);

  // 4) Manual-origin control: validación without supported context resolves
  //    NO patient and the exported FH row carries an EMPTY solicitud_id.
  await page.goto(BASE + 'farmacia_validacion.html', { waitUntil: 'load' });
  const manualOrigin = await page.inputValue('#fhOrigenEntrada');
  assert(manualOrigin === 'manual_farmacia', 'Origen manual reconocido sin contexto (control)');
  const manualPatient = await page.evaluate(() => (window.FarmaciaDemo.getQueryContext().patient === null));
  assert(manualPatient, 'Sin contexto no resuelve ningún paciente (la ausencia no se sustituye por heurística)');
  // Supported manual interaction: servicio + patología + CIP sintético, resultado validado.
  await page.selectOption('#fhServicioManual', 'derma');
  await page.selectOption('#fhPatologiaManual', 'Psoriasis');
  await page.fill('#fhManualCip', 'CIP-SYN-HANDOFF-MANUAL');
  const manualTsv = await exportValidationRow(page, 'validated');
  const manualSidColumn = lastTsvColumn(manualTsv);
  assert(manualSidColumn === '', 'Origen manual de Farmacia exporta solicitud_id VACÍO (última columna sin identidad)');

  await context.close();
} finally {
  await browser.close();
  server.close();
}

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
console.log(`CONSOLE_ERRORS=${consoleErrors.length}`);
console.log(`PAGE_ERRORS=${pageErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.join('\n'));
if (pageErrors.length) console.log(pageErrors.join('\n'));
process.exitCode = (failed || consoleErrors.length || pageErrors.length) ? 1 : 0;
