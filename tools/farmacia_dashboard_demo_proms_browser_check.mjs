#!/usr/bin/env node
// tools/farmacia_dashboard_demo_proms_browser_check.mjs
// WO-FH-DASHBOARD-PROMS-SHAPE-P1-01 (Issue #288 / F-01-F-04)
// Chromium QA sobre los cuatro CIP demo del Dashboard Paciente:
//   1. CIP-DEMO-FH-001..004 abren el Dashboard sin pageerror y con summary no vacío.
//   2. CIP-DEMO-FH-002 (string legacy sin entrada longitudinal) no genera tile/label
//      `undefined`; el texto legacy se muestra literal como contexto demo.
//   3. El string legacy NO se convierte en PROMs estructurados (sin parseo clínico).
//   4. El flujo raw (array estructurado) conserva el renderer estructurado actual.
// Ruta soportada: el enlace directo publicado del caso demo (Inicio Farmacia → Dashboard).

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_PREFIX = String(process.env.FH_APP_PREFIX || '').replace(/^\/+|\/+$/g, '');
const DEMO_CIPS = ['CIP-DEMO-FH-001', 'CIP-DEMO-FH-002', 'CIP-DEMO-FH-003', 'CIP-DEMO-FH-004'];

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_dashboard_proms_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_dashboard_demo_proms_browser_check.mjs');
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

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml']
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
const appUrl = file => new URL(`${APP_PREFIX ? `${APP_PREFIX}/` : ''}${file}`, BASE).href;

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${page.url()}: ${message.text()}`); });
page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));

async function openDashboard(cip) {
  await page.goto(appUrl(`farmacia_dashboard_paciente.html?cip=${cip}&entrada=dashboard`), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(expected => document.querySelector('#patientIdBadge')?.textContent.trim() === expected, cip);
}

try {
  // ── 1. Los cuatro CIP demo abren Dashboard sin pageerror y con summary no vacío ──
  for (const cip of DEMO_CIPS) {
    await openDashboard(cip);
    const gridChildren = await page.locator('#dashboardSummaryGrid > *').count();
    assert(gridChildren > 0, `${cip}: #dashboardSummaryGrid no vacío`);
    const summaryText = await page.locator('#dashboardSummaryGrid').innerText();
    assert.doesNotMatch(summaryText, /\bundefined\b/, `${cip}: summary sin 'undefined'`);
    assert.match(summaryText, /Últimos PROMs Farmacia/i, `${cip}: campo Últimos PROMs Farmacia presente`);
    assert.match(summaryText, /No registrado|PROMs demo \(contexto\)/, `${cip}: campo proms fail-safe o contexto demo`);
    const bodyText = await page.locator('body').innerText();
    assert.doesNotMatch(bodyText, /\[object Object\]/, `${cip}: sin serialización de objeto basura`);
    // El contenedor de PROMs no puede quedar con basura undefined
    const promsText = await page.locator('#promsDashboardContainer').innerText();
    assert.doesNotMatch(promsText, /\bundefined\b/, `${cip}: PROMs sin 'undefined'`);
  }

  // ── 2. CIP-DEMO-FH-002 (string legacy sin dataset longitudinal) ──
  await openDashboard('CIP-DEMO-FH-002');
  await page.waitForFunction(() => document.querySelector('#dbStatusTime')?.textContent.includes('Longitudinal cargado')
    || document.querySelector('#dbStatusTime')?.textContent.includes('CSV sintetico'));
  const fh002Summary = await page.locator('#dashboardSummaryGrid').innerText();
  // El texto legacy se muestra literal como contexto demo, sin interpretación clínica
  assert.match(fh002Summary, /PROMs demo \(contexto\): Basal pendiente/, 'FH-002: summary conserva el string legacy literal como contexto demo');
  assert.doesNotMatch(fh002Summary, /\bundefined\b/, 'FH-002: summary sin undefined tile');
  const fh002Proms = await page.locator('#promsDashboardContainer').innerText();
  assert.match(fh002Proms, /Contexto demo: Basal pendiente/, 'FH-002: PROMs muestra el contexto demo literal');
  assert.doesNotMatch(fh002Proms, /\bundefined\b/, 'FH-002: sin tile/label undefined');
  // No se fabrican tarjetas PROM estructuradas desde el string
  assert.equal(await page.locator('#promsDashboardContainer .prom-card').count(), 0, 'FH-002: el string legacy no genera prom-cards estructurados');

  // ── 3. El string legacy de otros CIP demo tampoco se parsea ──
  await openDashboard('CIP-DEMO-FH-003');
  await page.waitForFunction(() => document.querySelector('#dbStatusTime')?.textContent.includes('Longitudinal cargado'));
  // FH-003 SÍ tiene dataset longitudinal: tras la fusión su proms es array estructurado.
  const fh003Proms = await page.locator('#promsDashboardContainer').innerText();
  assert.match(fh003Proms, /HAQ/, 'FH-003: tras fusión longitudinal renderiza HAQ estructurado');
  assert.doesNotMatch(fh003Proms, /\bundefined\b/, 'FH-003: sin undefined');

  // ── 4. Flujo raw: el array estructurado conserva el renderer actual ──
  // El browser check raw existente (farmacia_patient_flow_cutover_browser_check.mjs)
  // ya cubre el dashboard raw con array estructurado y pageerror=0; aquí se revalida
  // la huella estática del renderer estructurado a través del dashboard demo con array.
  await openDashboard('CIP-DEMO-FH-004');
  await page.waitForFunction(() => document.querySelector('#dbStatusTime')?.textContent.includes('Longitudinal cargado'));
  const fh004Proms = await page.locator('#promsDashboardContainer').innerText();
  assert.match(fh004Proms, /HAQ/, 'FH-004: renderer estructurado para el array del dataset longitudinal');
  assert.doesNotMatch(fh004Proms, /\bundefined\b/, 'FH-004: sin undefined');

  // ── 5. Ruta soportada (Escenario A): Inicio Farmacia → tarjeta demo FH-004 → Dashboard ──
  await page.goto(appUrl('farmacia_index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDemo && window.FarmaciaPatientFlowRuntime);
  const demoCard = page.locator('#demoCaseFh004 .demo-case-card__actions a', { hasText: 'Ver dashboard FH-004' });
  assert.equal(await demoCard.count(), 1, 'Inicio tiene la tarjeta demo FH-004 con enlace directo al Dashboard');
  await Promise.all([page.waitForLoadState('domcontentloaded'), demoCard.click()]);
  await page.waitForFunction(expected => document.querySelector('#patientIdBadge')?.textContent.trim() === expected, 'CIP-DEMO-FH-004');
  assert.equal(await page.locator('#dashboardSummaryGrid > *').count(), 7, 'FH-004 vía tarjeta demo: summary con campos + checks (no vacío)');
  assert((await page.locator('#dashboardSummaryGrid').innerText()).length > 50, 'FH-004 vía tarjeta demo: summary con texto visible');
  assert.doesNotMatch(await page.locator('body').innerText(), /\bundefined\b/, 'FH-004 vía tarjeta demo: sin undefined');

  // ── 6. Ruta soportada (Escenario B): búsqueda demo FH-002 → Quick View → Dashboard ──
  await page.goto(appUrl('farmacia_index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDemo && window.FarmaciaPatientFlowRuntime);
  await page.locator('#fhCipInput').fill('CIP-DEMO-FH-002');
  await page.locator('#fhSearchBtn').click();
  await page.waitForFunction(expected => document.querySelector('#fhSubtitle')?.textContent === expected, 'CIP-DEMO-FH-002');
  const fh002QuickView = await page.locator('#fhQvGrid').innerText();
  assert.doesNotMatch(fh002QuickView, /\bundefined\b/, 'FH-002 Quick View sin undefined');
  const qvDashboardLink = page.locator('#fhQvActions').getByRole('link', { name: 'Dashboard', exact: false });
  await Promise.all([page.waitForLoadState('domcontentloaded'), qvDashboardLink.click()]);
  await page.waitForFunction(expected => document.querySelector('#patientIdBadge')?.textContent.trim() === expected, 'CIP-DEMO-FH-002');
  const fh002ViaSearch = await page.locator('#promsDashboardContainer').innerText();
  assert.match(fh002ViaSearch, /Contexto demo: Basal pendiente/, 'FH-002 vía Quick View: string legacy como contexto demo');
  assert.doesNotMatch(fh002ViaSearch, /\bundefined\b/, 'FH-002 vía Quick View: sin undefined');

  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  console.log('farmacia_dashboard_demo_proms_browser_check: PASS');
  console.log('QA Chromium: CIP-DEMO-FH-001..004 dashboard sin pageerror; summary no vacío; FH-002 sin undefined y string legacy como contexto demo; tarjeta demo FH-004 y Quick View FH-002 soportadas; raw array con renderer estructurado; console.error=0 pageerror=0');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
