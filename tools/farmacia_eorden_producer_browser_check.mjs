#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) return createRequire(path.join(nodeModules, '__fh_eorden_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_eorden_producer_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache).filter(entry => entry.startsWith('chromium_headless_shell-')).sort().reverse().map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
  try { if (!statSync(file).isFile()) throw new Error('not_file'); response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); createReadStream(file).pipe(response); }
  catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
await page.addInitScript(() => {
  const original = document.execCommand.bind(document);
  document.execCommand = command => { if (command === 'copy') window.__lastExportText = document.activeElement?.value || ''; return original(command); };
});
const alerts = [];
page.on('dialog', dialog => { alerts.push(dialog.message()); dialog.accept(); });
let passed = 0; let failed = 0;
function check(condition, label) { console.log(`  ${condition ? '✓' : '✗'} ${label}`); condition ? passed++ : failed++; }
try {
  await page.goto(`${base}docs/plantilla_solicitud_dermatologia.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#nombre').fill('Paciente Sintético');
  await page.locator('#cip').fill('CIP-SINTETICO-PSO');
  await page.locator('#patologia').selectOption('pso');
  await page.locator('#marca_comercial').fill('Marca PSO');
  await page.locator('#dosis_solicitada').fill('300 mg');
  await page.locator('#via_solicitada').selectOption('SC');
  await page.locator('#pauta').fill('Cada 14 días');
  await page.locator('input[name="induccion"][value="SÍ"]').check();
  await page.locator('#programa_ses').selectOption('SES_PSOR');
  await page.locator('#justificacion').fill('Justificación sintética');
  await page.locator('input[name="analitica_recente"][value="SÍ"]').check();
  await page.locator('input[name="vacunacion"][value="SÍ"]').check();
  await page.locator('.export-button').click();
  const expected = 'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n═══════════════════════════════════════════════════════\n• CIP: CIP-SINTETICO-PSO\n• Marca comercial solicitada: Marca PSO\n• Dosis solicitada: 300 mg\n• Vía solicitada: SC\n• Pauta: Cada 14 días\n• Inducción solicitada: SÍ\n• Justificación clínica: Justificación sintética\nPROGRAMA SES\n• Código: SES_PSOR\n• Denominación: PSORIASIS';
  check(await page.evaluate(() => window.__lastExportText) === expected, 'browser export matches exact PSORIASIS D17 fixture');
  await page.evaluate(() => { window.__lastExportText = null; });
  await page.locator('#marca_comercial').fill(''); await page.locator('.export-button').click();
  check(alerts.at(-1) === '⚠️ Falta: Marca comercial del fármaco solicitado' && await page.evaluate(() => window.__lastExportText) === null, 'browser blank brand blocks and emits no text');
  await page.locator('#marca_comercial').fill('Marca PSO'); await page.locator('#via_solicitada').selectOption('Otra'); await page.locator('.export-button').click();
  check(alerts.at(-1) === '⚠️ Otra requiere especificación de vía', 'browser Otra without specification blocks');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log(`\nTotal: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
