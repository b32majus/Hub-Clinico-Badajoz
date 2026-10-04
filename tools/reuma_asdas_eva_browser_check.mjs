#!/usr/bin/env node
'use strict';
/**
 * Supported-interaction browser QA for T2 #514
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12, parent #512).
 *
 * Ledger 3.2 #6: the patient's captured EVA Global must feed ASDAS in both
 * Primera Visita and Seguimiento, without manual re-entry into ASDAS. Absence
 * must stay absent (never 0 / inferred); an explicit 0 is a value.
 *
 * Every assertion runs through supported user-level interaction: real
 * selectOption, real inputs, real homunculus region clicks and real collapsible
 * headers. The only page.evaluate calls READ observables. No result field is
 * ever written by the harness.
 *
 * Scenarios on BOTH pages (EspA unless stated):
 *   (a) capture EVA Global = 4 only -> #asdasEvaGlobal mirrors 4 and
 *       ASDAS-CRP = 2.98, without writing #asdasEvaGlobal.
 *   (b) empty EVA Global -> #asdasEvaGlobal empty and ASDAS-CRP empty (never 0).
 *   (c) explicit EVA Global = 0 -> ASDAS-CRP = 2.54.
 *   (d) #asdasEvaGlobal is genuinely readonly in the browser (a typing attempt
 *       is refused by the control; the attempt is wrapped so it cannot fake it).
 *   (e) APs still shows no ASDAS and computes no ASDAS-CRP/ESR.
 *   S7 console.error === 0 and pageerror === 0 on both pages.
 *
 * This check is NOT part of `verify:nexus` (browser dependency); it is the
 * durable evidence for the T2 supported-interaction acceptance.
 *
 * Synthetic data only. Exit 0 = PASS, 1 = FAIL / environment failure.
 * Usage: node tools/reuma_asdas_eva_browser_check.mjs
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const results = [];
function record(name, pass, detail) {
  results.push(pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function loadPlaywrightFromNpx() {
  const tried = [];
  const tryNodeModules = (nodeModules) => {
    const pkg = path.join(nodeModules, 'playwright', 'package.json');
    tried.push(pkg);
    if (fs.existsSync(pkg)) {
      return createRequire(path.join(nodeModules, '__reuma_asdas_eva_loader.cjs'))('playwright');
    }
    return null;
  };
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    if (!binDirectory) continue;
    const prefix = path.resolve(binDirectory, '..');
    for (const nodeModules of [prefix, path.join(prefix, 'lib', 'node_modules')]) {
      const loaded = tryNodeModules(nodeModules);
      if (loaded) return loaded;
    }
  }
  const npxCache = path.join(process.env.HOME || '', '.npm', '_npx');
  if (fs.existsSync(npxCache)) {
    for (const entry of fs.readdirSync(npxCache).sort().reverse()) {
      const loaded = tryNodeModules(path.join(npxCache, entry, 'node_modules'));
      if (loaded) return loaded;
    }
  }
  const loaded = tryNodeModules(path.join(ROOT, 'node_modules'));
  if (loaded) return loaded;
  throw new Error('Playwright not found. Tried: ' + tried.join(', '));
}

let chromium;
try {
  ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  console.log('RESULTADO: 0 OK / 1 FALLIDO');
  process.exit(1);
}

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (fs.existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) return bundled;
  const candidates = fs.readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(fs.existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-asdas-eva-'));
const workbookPath = path.join(tempDir, 'reuma_asdas_eva_synthetic.xlsx');
{
  const workbook = XLSX.utils.book_new();
  for (const sheetName of ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN']) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ ID_Paciente: 'SYN-000-000' }]), sheetName);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
  ]), 'Profesionales');
  fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

async function passSupportedGate(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load', timeout: 45000 });
  await page.setInputFiles('#gateExcelInput', workbookPath);
  await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
  const professional = await page.evaluate(() => {
    const select = document.getElementById('gateProfessionalSelect');
    return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
  });
  await page.selectOption('#gateProfessionalSelect', professional);
  await page.click('#gateConfirmBtn');
  await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
  await page.close();
  return context;
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

// Independent recomputation of the published ASDAS formula (oracle).
function asdascrp(d, r, e, n, p) {
  return ((0.121 * d) + (0.058 * r) + (0.110 * e) + (0.073 * n) + (0.579 * Math.log(p + 1))).toFixed(2);
}

async function isReallyHitTestable(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!top && (top === el || el.contains(top));
  }, selector);
}

async function openAncestorCollapsibles(page, selector) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await isReallyHitTestable(page, selector)) return true;
    const headers = page.locator(selector).first().locator(
      'xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]'
    );
    const count = await headers.count();
    if (!count) return false;
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const header = headers.nth(i);
      const isActive = await header.evaluate((el) => el.classList.contains('active'));
      if (!isActive) {
        await header.click();
        clicked = true;
        await page.waitForTimeout(650);
      }
    }
    if (!clicked) return isReallyHitTestable(page, selector);
  }
  return isReallyHitTestable(page, selector);
}

async function runPage(label, pagePath) {
  console.log(`\n=== ${label} (${pagePath}) ===`);
  const context = await passSupportedGate(browser);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  try {
    await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(300);
    for (const sel of ['#evaGlobal', '#asdasCrpResult', '.homunculus-svg-wrapper']) {
      const visible = await openAncestorCollapsibles(page, sel);
      if (!visible) throw new Error(`no fue posible hacer visible ${sel} mediante interacción soportada`);
    }

    const fill = async (sel, value) => {
      await page.locator(sel).first().fill(value);
      await page.waitForTimeout(100);
    };

    // Sources other than the ASDAS EVA mirror. #asdasEvaGlobal is NEVER written.
    await fill('#pcrValue', '30');
    await fill('#asdasDolorEspalda', '3');
    await fill('#asdasDuracionRigidez', '2');
    await page.locator('.homunculus-mode-btn[data-mode="nad"]').click();
    await page.locator('[data-region-id="hombro-derecho"]').first().click();
    await page.waitForTimeout(150);

    // (a) capture the patient EVA Global only.
    await fill('#evaGlobal', '4');
    const mirror4 = await page.locator('#asdasEvaGlobal').inputValue();
    const crp4 = await page.locator('#asdasCrpResult').inputValue();
    const esperado4 = asdascrp(3, 2, 4, 1, 30);
    record(`(a) ${label}: EVA Global=4 => espejo '${mirror4}' y ASDAS-CRP '${crp4}' (esperado ${esperado4})`,
      mirror4 === '4' && crp4 === esperado4, `espejo='${mirror4}', crp='${crp4}'`);

    // (d) readonly is enforced by the control, not by the harness.
    const editable = await page.locator('#asdasEvaGlobal').isEditable();
    let typingRefused = false;
    try {
      await page.locator('#asdasEvaGlobal').fill('9', { timeout: 2000 });
    } catch (err) {
      typingRefused = true;
    }
    const mirrorAfterTyping = await page.locator('#asdasEvaGlobal').inputValue();
    record(`(d) ${label}: #asdasEvaGlobal readonly (isEditable=${editable}, intento de tecleo rechazado=${typingRefused}, valor='${mirrorAfterTyping}')`,
      editable === false && mirrorAfterTyping === mirror4, `editable=${editable}, refuse=${typingRefused}, valor='${mirrorAfterTyping}'`);

    // (b) empty EVA Global stays absent, never 0.
    await fill('#evaGlobal', '');
    const mirrorEmpty = await page.locator('#asdasEvaGlobal').inputValue();
    const crpEmpty = await page.locator('#asdasCrpResult').inputValue();
    record(`(b) ${label}: EVA Global vacía => espejo '' y ASDAS-CRP '' (nunca 0)`,
      mirrorEmpty === '' && crpEmpty === '', `espejo='${mirrorEmpty}', crp='${crpEmpty}'`);

    // (c) explicit zero is a value.
    await fill('#evaGlobal', '0');
    const crp0 = await page.locator('#asdasCrpResult').inputValue();
    const esperado0 = asdascrp(3, 2, 0, 1, 30);
    record(`(c) ${label}: EVA Global=0 => ASDAS-CRP '${crp0}' (esperado ${esperado0}, distinto de vacío)`,
      crp0 === esperado0 && crp0 !== '', `crp='${crp0}'`);

    // (e) APs still shows no ASDAS.
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(350);
    const asdasSectionDisplay = await page.locator('#asdasSection').evaluate((el) => getComputedStyle(el).display);
    const crpAps = await page.locator('#asdasCrpResult').inputValue();
    const esrAps = await page.locator('#asdasEsrResult').inputValue();
    record(`(e) ${label}: APs sin ASDAS (display='${asdasSectionDisplay}', CRP '', ESR '')`,
      asdasSectionDisplay === 'none' && crpAps === '' && esrAps === '', `display='${asdasSectionDisplay}', crp='${crpAps}', esr='${esrAps}'`);

    record(`S7 ${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
    record(`S7 ${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
  } finally {
    await context.close();
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  await runPage('primera_visita', 'primera_visita.html');
  await runPage('seguimiento', 'seguimiento.html');
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  results.push(false);
} finally {
  if (browser) await browser.close();
  server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}

const passed = results.filter(Boolean).length;
const total = results.length;
console.log(`\nRESULTADO: ${passed} OK / ${total - passed} FALLIDO`);
if (passed !== total) {
  console.log('reuma_asdas_eva_browser_check FAILED');
  process.exit(1);
}
console.log('reuma_asdas_eva_browser_check PASS');
