#!/usr/bin/env node
// tools/farmacia_reconcil_browser_check.mjs
// Issue #367 (N3 of train #364) — supported browser QA for the solicitud_id
// reconciliation on farmacia_index.html with synthetic workbooks:
//  1) load the synthetic Enfermería v6 workbook (real file input);
//  2) load the synthetic Farmacia FH workbook (real file input);
//  3) verify visible states: vigilancia / bloqueado / pendiente / listo para
//     citar / denegado / conflicto;
//  4) confirm only PENDING_FH offers "Abrir validación";
//  5) verify the pending card link keeps its supported context (cip/servicio)
//     — cross-page solicitud_id conservation (N4) is unit-verified in
//     tools/farmacia_solicitud_id_transport_check.mjs and exercised with real
//     navigation in tools/farmacia_reconcil_handoff_browser_check.mjs (the
//     former single-use dataset handoff limitation was fixed in N4);
//  6) same CIP with two solicitudes does not mix;
//  7) repeat with reversed load order (Farmacia first);
//  8) console.error = 0, pageerror = 0.
// No DOM manipulation, no readonly state changes, no impossible fixtures.

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
      return createRequire(path.join(nodeModules, '__fh_reconcil_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_reconcil_browser_check.mjs');
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

const FIX_NURSING = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_enfermeria_v6_sintetico_v1.xlsx');
const FIX_FH = path.join(ROOT, 'tools', 'fixtures', 'farmacia_reconcil_fh_sintetico_v1.xlsx');
if (!existsSync(FIX_NURSING) || !existsSync(FIX_FH)) {
  console.error('FATAL: faltan fixtures sintéticos; ejecutar antes tools/farmacia_reconcil_fixtures_generate.mjs');
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

const consoleErrors = [];
const pageErrors = [];

let passed = 0;
let failed = 0;
function assert(condition, label) {
  if (condition) { passed++; console.log('  \u2713 ' + label); }
  else { failed++; console.log('  \u2717 ' + label); }
}

async function runFlow(label, loadOrder) {
  console.log(`\n=== ${label} (orden: ${loadOrder === 'enf-first' ? 'Enfermería → Farmacia' : 'Farmacia → Enfermería'}) ===`);
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`[${label}] ${message.text()}`); });
  page.on('pageerror', (error) => pageErrors.push(`[${label}] ${error.message}`));

  await page.goto(BASE + 'farmacia_index.html', { waitUntil: 'load' });

  const steps = loadOrder === 'enf-first'
    ? [['#inputExcelEnfermeria', FIX_NURSING, 'Enfermería'], ['#inputExcelFarmacia', FIX_FH, 'Farmacia']]
    : [['#inputExcelFarmacia', FIX_FH, 'Farmacia'], ['#inputExcelEnfermeria', FIX_NURSING, 'Enfermería']];

  for (const [input, file, kind] of steps) {
    await page.setInputFiles(input, file);
    await page.waitForFunction(
      (k) => {
        const el = document.getElementById(k === 'Enfermería' ? 'estadoCargaEnfermeria' : 'estadoCargaFarmacia');
        return el && /importad|cargad|registrad|actualiz/i.test(el.textContent || '');
      },
      kind,
      { timeout: 15000 }
    );
  }
  // Both boards re-render on every import event; wait for reconciled groups.
  await page.waitForFunction(
    () => {
      const text = document.getElementById('enfermeriaBoardCards')?.textContent || '';
      return text.includes('Listo para citar') && text.includes('Conflicto de reconciliación');
    },
    { timeout: 15000 }
  );

  const boardText = await page.locator('#enfermeriaBoardCards').textContent();
  const groupCounts = await page.locator('.enfermeria-group__header').allTextContents();
  const groupText = groupCounts.join(' | ');

  assert(groupText.includes('Listos para validación (4)'), `PENDING_FH visible como pendiente de validación (4) — ${groupText}`);
  assert(groupText.includes('Listo para citar (2)'), 'READY_TO_CITE visible en verde positivo como Listo para citar (2)');
  assert(groupText.includes('Validación denegada · No citar (1)'), 'DENIED_DO_NOT_CITE visible (1)');
  assert(groupText.includes('Conflicto de reconciliación (1)'), 'RECONCILIATION_CONFLICT visible como incidencia (1)');
  assert(groupText.includes('En vigilancia prebiológica (2)'), 'EN VIGILANCIA visible como tal (2)');
  assert(groupText.includes('Bloqueados (1)'), 'BLOQUEADO visible como tal (1)');

  const abrirValidarCount = await page.locator('[data-enf-action="validar"]').count();
  assert(abrirValidarCount === 4, 'Solo PENDING_FH (4 tarjetas) ofrece Abrir validación');

  const pendCard1 = page.locator('[data-enf-solicitud="SOL-DER-000001"]');
  const pendCard2 = page.locator('[data-enf-solicitud="SOL-DER-000002"]');
  assert(await pendCard1.count() === 1 && (await pendCard1.textContent()).includes('Abrir validación'), 'PENDING_FH sin actos mantiene Abrir validación + detalles');
  assert((await pendCard1.textContent()).includes('solicitud_id: SOL-DER-000001'), 'Identidad solicitud_id explícita en tarjeta pendiente');
  assert(await pendCard2.count() === 1 && (await pendCard2.textContent()).includes('Abrir validación'), 'PENDING_FH con acto pendiente mantiene Abrir validación');

  // Pending card keeps its supported context link (cip/servicio transport).
  const pendHref = await pendCard1.locator('[data-enf-action="validar"]').getAttribute('href');
  assert(pendHref.includes('farmacia_validacion.html') && pendHref.includes('cip='), 'Abrir validación transporta el contexto soportado (cip)');

  const readyCard = page.locator('[data-enf-solicitud="SOL-DER-000003"]');
  const readyText = await readyCard.textContent();
  assert(readyText.includes('Listo para citar'), 'READY_TO_CITE visible como Listo para citar');
  assert(readyText.includes('Validación FH: validado'), 'READY_TO_CITE con terminal explícito visible');
  assert(!(await readyCard.locator('[data-enf-action="validar"]').count()), 'READY_TO_CITE sin acción Abrir validación');

  const deniedCard = page.locator('[data-enf-solicitud="SOL-DER-000004"]');
  const deniedText = await deniedCard.textContent();
  assert(deniedText.includes('Validación denegada · No citar'), 'DENIED visible como validación denegada / no citar');
  assert(deniedText.includes('Validación FH denegada · No citar · SOL-DER-000004'), 'DENIED con detalle explícito (alias rechazado → denegado)');
  assert(!(await deniedCard.locator('[data-enf-action="validar"]').count()), 'DENIED sin acción Abrir validación');

  const conflictCard = page.locator('[data-enf-solicitud="SOL-DER-000007"]');
  const conflictText = await conflictCard.textContent();
  assert(conflictText.includes('Conflicto de reconciliación'), 'CONFLICT visible como conflicto no accionable');
  assert(conflictText.includes('Terminales incompatibles: validado + denegado'), 'CONFLICT con terminales explícitos');
  assert(!conflictText.includes('Listo para citar'), 'CONFLICT nunca se muestra como listo para citar');
  assert(!(await conflictCard.locator('[data-enf-action="validar"]').count()), 'CONFLICT sin acción pendiente');

  // Incident: EN VIGILANCIA + terminal FH stays surveillance, non-actionable
  const incCard = page.locator('[data-enf-solicitud="SOL-REU-000008"]');
  const incText = await incCard.textContent();
  assert(incText.includes('En vigilancia'), 'Incidencia sigue visible como EN VIGILANCIA (Excel leído)');
  assert(incText.includes('Incidencia de reconciliación') && incText.includes('No accionable'), 'Incidencia explícita y no accionable');
  assert(!incText.includes('Listo para citar'), 'Incidencia NUNCA lista para citar');

  const vigilanceCard = page.locator('[data-enf-solicitud="SOL-REU-000005"]');
  const blockedCard = page.locator('[data-enf-solicitud="SOL-DIG-000006"]');
  assert((await vigilanceCard.textContent()).includes('Ver pendientes prebiológicos'), 'EN VIGILANCIA con detalles explícitos disponibles');
  assert((await blockedCard.textContent()).includes('Ver bloqueantes'), 'BLOQUEADO con detalles explícitos disponibles');
  assert((await vigilanceCard.textContent()).includes('solicitud_id: SOL-REU-000005') && (await blockedCard.textContent()).includes('solicitud_id: SOL-DIG-000006'), 'Vigilancia/bloqueado muestran su identidad explícita');

  // Same CIP, two solicitudes: independent cards, no mixing
  const sharedCards = page.locator('[data-enf-cip="CIP-RECON-SHARED"][data-enf-solicitud]');
  assert(await sharedCards.count() === 2, 'Misma CIP con dos solicitudes → dos tarjetas');
  assert((await page.locator('[data-enf-solicitud="SOL-DER-000008"]').textContent()).includes('Listo para citar'), 'ID A (validado) resuelto');
  assert((await page.locator('[data-enf-solicitud="SOL-DER-000009"]').textContent()).includes('Abrir validación'), 'ID B del mismo CIP sigue pendiente');

  // Non-validation acts only → stays pending
  assert((await page.locator('[data-enf-solicitud="SOL-DER-000010"]').textContent()).includes('Abrir validación'), 'Solo actos no validación (primera visita/seguimiento) sigue pendiente');

  // Anti-heuristic decoy: explicit validado with same CIP+drug but no
  // solicitud_id does NOT close SOL-DER-000001
  assert((await page.locator('[data-enf-solicitud="SOL-DER-000001"]').textContent()).includes('Abrir validación'), 'Decoy sin solicitud_id NO cierra por CIP/fármaco');

  // General tray: farmacia pending act present, no nursing duplication
  const generalText = await page.locator('#pendingValidationCards').textContent();
  assert(generalText.includes('FH-SYN-RECON-002') && generalText.includes('Pendiente de validación'), 'Bandeja general mantiene el acto Farmacia pendiente explícito (sin duplicar la solicitud v6)');
  assert(!generalText.includes('SOL-DER-'), 'Ninguna solicitud v6 duplicada en la bandeja general');

  const boardCount = await page.locator('#enfermeriaBoardCount').textContent();
  assert(boardCount === '11', 'Contador Enfermería = 11 solicitudes v6 visibles');

  await context.close();
}

try {
  await runFlow('Flujo soportado N3', 'enf-first');
  await runFlow('Flujo soportado N3 (orden invertido)', 'fh-first');
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
