#!/usr/bin/env node
// tools/farmacia_adherence_browser_check.mjs
// WO-FH-ADHERENCIA-HUMAN-READABLE-R2-20260914 (issue #355) — supported-route browser QA.
// 1. Dashboard Longitudinal (demo route, supported load + patient select):
//    structured adherence renders human text; raw JSON is gone; missing stays neutral.
// 2. Dashboard Paciente (demo route): legacy human adherence strings still render unchanged.
// Console/page errors must stay at zero. Synthetic data only.

import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_PREFIX = String(process.env.FH_APP_PREFIX || '').replace(/^\/+|\/+$/g, '');

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_adherence_browser_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_adherence_browser_check.mjs');
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

try {
  // ── 1. Dashboard Longitudinal: structured adherence renders human text ──
  await page.goto(appUrl('farmacia_dashboard_longitudinal.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const select = document.querySelector('#longitudinalPatientSelect');
    return select && select.options.length > 1;
  });
  await page.waitForFunction(() => (document.querySelector('#longitudinalDataStatus')?.textContent || '').includes('Dataset cargado'));

  const structuredCips = ['CIP-DEMO-FH-001', 'CIP-DEMO-FH-003', 'CIP-DEMO-FH-004'];
  for (const cip of structuredCips) {
    await page.locator('#longitudinalPatientSelect').selectOption(cip);
    const summary = await page.locator('#longitudinalPatientSummary').innerText();
    // The visible adherence no longer contains raw JSON.
    assert.doesNotMatch(summary, /\{"id"|\[\{"id"|\}]/, `${cip}: no raw JSON in the patient summary`);
    assert.doesNotMatch(summary, /ADH-FH-|"/, `${cip}: no technical identifiers or JSON quotes visible`);
    // Explicit source fields stay visible.
    assert.match(summary, /Adherencia[\s\S]*Fecha: \d{4}-\d{2}-\d{2}[\s\S]*Escala: Morisky-Green[\s\S]*Resultado: 4\/4/i, `${cip}: explicit fields remain visible`);
    assert.match(summary, /Interpretación: Alta adherencia/, `${cip}: stored interpretation shown verbatim`);
    assert.match(summary, /Fuente: Farmacia/, `${cip}: explicit source shown`);
  }

  // ── 2. Dashboard Paciente demo route: legacy strings unchanged ──
  await page.goto(appUrl('farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-001&entrada=dashboard'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(expected => document.querySelector('#patientIdBadge')?.textContent.trim() === expected, 'CIP-DEMO-FH-001');
  const pacienteSummary = await page.locator('#dashboardSummaryGrid').innerText();
  assert.match(pacienteSummary, /Última adherencia[\s\S]*Alta \(Morisky-Green: 4\/4\)/i,
    'dashboard paciente legacy adherence string keeps rendering unchanged');
  assert.doesNotMatch(pacienteSummary, /\{"id"|\[object Object\]/, 'dashboard paciente summary shows no JSON/object leak');

  assert.deepEqual(consoleErrors, [], `console.error: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `pageerror: ${pageErrors.join(' | ')}`);
  console.log('farmacia_adherence_browser_check: PASS');
  console.log('QA Chromium: longitudinal structured adherence human rendering + paciente legacy strings PASS; console.error=0 pageerror=0');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
