#!/usr/bin/env node
'use strict';
/**
 * Browser QA for the explicit PCR unit contract (SIL-REV-006 / ticket #443, T1).
 *
 * Real-browser (Playwright + Chromium) qualification of primera_visita.html and
 * seguimiento.html over a served repository root. Every assertion runs through
 * supported user-level interaction: real selects, real inputs, real homunculus
 * region clicks and real collapsible headers. No DOM manipulation is used to
 * fake state; the only page.evaluate calls READ observables (score result
 * values, the public HubTools.form collection API and the conversion notes).
 *
 * Scenarios (must PASS on BOTH pages unless stated):
 *   EspA pass (ASDAS-CRP is EspA-only, T1 #513):
 *     S1 No conversion (source mg/L = ASDAS-CRP expected unit): score computed,
 *        conversion note hidden, unit mirror shows (mg/L).
 *     S2 Conversion (source mg/dL -> ASDAS-CRP mg/L): identical score to S1 for
 *        the equivalent value, note visible naming the conversion, readonly
 *        source field keeps the raw 3 (not the derived 30).
 *     S5 ASDAS half: unknown unit ("Sin unidad") clears ASDAS-CRP (fail safe)
 *        and the ASDAS note explains the fail-safe state.
 *   APs pass (DAPSA is APs-only):
 *     S3 Conversion (DAPSA: source mg/L -> expected mg/dL, homunculus NAD/NAT
 *        through real region clicks): score computed, note visible, readonly
 *        dapsaPCR keeps the raw 30 (not the derived 3).
 *     S4 No conversion (DAPSA with source mg/dL): same score as S3, note hidden.
 *     S5 DAPSA half: unknown unit clears DAPSA (fail safe) and the DAPSA note
 *        explains the fail-safe state.
 *     S6 Traceability through the supported collection API: the collected data
 *        keeps the raw source value and the explicit unit (pcr + pcrUnit).
 *   S7 console.error === 0 and pageerror === 0 on both pages (both passes).
 *
 * Fixtures are synthetic only (no patient data). The only external requests are
 * the page's own CDN assets (cdnjs), which must be reachable.
 *
 * Exit code 0 = every case PASS, 1 = at least one FAIL or environment failure.
 * Usage: node tools/reuma_pcr_units_browser_check.mjs
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

// Playwright loader (identical approach to tools/nexus_home_f33_browser_check.mjs).
function loadPlaywrightFromNpx() {
  const tried = [];
  const tryNodeModules = (nodeModules) => {
    const pkg = path.join(nodeModules, 'playwright', 'package.json');
    tried.push(pkg);
    if (fs.existsSync(pkg)) {
      return createRequire(path.join(nodeModules, '__reuma_pcr_units_loader.cjs'))('playwright');
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

// Synthetic session fixture (temporary, outside the repository): a minimal
// workbook with a Profesionales row and header-only pathology sheets so the
// REAL session gate on reuma_index.html (file input -> professional select ->
// confirm) can be passed through supported interaction, exactly like
// tools/reuma_read_vertical_browser_check.mjs. No patient data is used.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-pcr-units-'));
const workbookPath = path.join(tempDir, 'reuma_pcr_units_synthetic.xlsx');
{
  const workbook = XLSX.utils.book_new();
  for (const sheetName of ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN']) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { ID_Paciente: 'SYN-000-000' },
    ]), sheetName);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
  ]), 'Profesionales');
  fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

// Real supported gate on reuma_index.html: establishes the professional session the
// same way a user does; never writes the storage key directly.
async function passSupportedGate(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
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
function expectedASDASCRP(dolor, rigidez, eva, nad, pcrMgL) {
  return ((0.121 * dolor) + (0.058 * rigidez) + (0.110 * eva) + (0.073 * nad) + (0.579 * Math.log(pcrMgL + 1))).toFixed(2);
}

async function openPage(browser, pagePath) {
  const context = await passSupportedGate(browser);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });
  return { context, page, consoleErrors, pageErrors };
}

async function isReallyHitTestable(page, selector) {
  // Playwright's isVisible reports clipped (overflow:hidden, closed collapsible)
  // elements as visible because their layout box is non-empty. Verify real
  // hit-testability instead: scroll into view and probe elementFromPoint.
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
  // Open (only) the closed ancestor collapsibles through their real header
  // buttons, waiting for the 0.4s max-height transition to settle.
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

// EspA pass: ASDAS-CRP is EspA-only (T1 #513 / ledger 3.2 #5), so every ASDAS
// scenario must run under `espa`. The DAPSA scenarios live in the APs pass.
async function runEspaSuite(label, pagePath) {
  console.log(`\n=== ${label} (${pagePath}) — EspA / ASDAS ===`);
  const { context, page, consoleErrors, pageErrors } = await openPage(browser, pagePath);

  try {
    // Supported interaction: adapt the form to EspA (ASDAS surface).
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(300);
    for (const sel of ['#pcrValue', '#asdasCrpResult', '.homunculus-svg-wrapper']) {
      const visible = await openAncestorCollapsibles(page, sel);
      if (!visible) throw new Error(`no fue posible hacer visible ${sel} mediante interacción soportada`);
    }

    // Real homunculus clicks: 1 dolorosa (NAD) + 1 tumefacta (NAT).
    await page.locator('.homunculus-mode-btn[data-mode="nad"]').click();
    await page.locator('[data-region-id="hombro-derecho"]').first().click();
    await page.locator('.homunculus-mode-btn[data-mode="nat"]').click();
    await page.locator('[data-region-id="hombro-izquierdo"]').first().click();

    const fill = async (sel, value) => {
      await page.locator(sel).first().fill(value);
      await page.waitForTimeout(80);
    };

    // S1 — No conversion: source mg/L (default) == ASDAS-CRP expected unit.
    await fill('#pcrValue', '30');
    await fill('#asdasDolorEspalda', '3');
    await fill('#asdasDuracionRigidez', '2');
    // T2 #514: #asdasEvaGlobal es readonly; la interacción soportada es capturar
    // la EVA Global del paciente en su campo fuente.
    await fill('#evaGlobal', '4');
    const esperado = expectedASDASCRP(3, 2, 4, 1, 30);
    const s1Score = await page.locator('#asdasCrpResult').inputValue();
    record(`S1 ${label}: sin conversión (30 mg/L) => ASDAS-CRP ${esperado}`, s1Score === esperado, `obtenido '${s1Score}'`);
    const s1NoteHidden = await page.locator('#asdasPcrConversionNote').isHidden();
    const s1Mirror = await page.locator('#asdasPcrUnitMirror').textContent();
    record(`S1 ${label}: nota de conversión oculta y espejo (mg/L)`, s1NoteHidden && s1Mirror.includes('mg/L'), `note hidden=${s1NoteHidden}, mirror='${s1Mirror}'`);

    // S2 — Conversion mg/dL -> mg/L for ASDAS-CRP (equivalent case 3 mg/dL).
    await page.selectOption('#pcrUnit', 'mg/dL');
    await fill('#pcrValue', '3');
    const s2Score = await page.locator('#asdasCrpResult').inputValue();
    record(`S2 ${label}: 3 mg/dL equivale a 30 mg/L (mismo score)`, s2Score === esperado, `obtenido '${s2Score}'`);
    const s2Note = await page.locator('#asdasPcrConversionNote').textContent();
    const s2NoteVisible = await page.locator('#asdasPcrConversionNote').isVisible();
    record('S2: nota visible nombra la conversión mg/dL -> mg/L y ASDAS-CRP',
      s2NoteVisible && s2Note.includes('mg/dL') && s2Note.includes('mg/L') && s2Note.includes('ASDAS-CRP') && s2Note.includes('Valor fuente preservado'),
      `nota='${s2Note}'`);
    const s2Source = await page.locator('#asdasPCR').inputValue();
    record('S2: el campo fuente readonly conserva 3 (no el derivado 30)', s2Source === '3', `obtenido '${s2Source}'`);

    // S5 (ASDAS half) — Unknown unit => fail safe, no silent numeric.
    await page.selectOption('#pcrUnit', '');
    await page.waitForTimeout(120);
    const s5Asdas = await page.locator('#asdasCrpResult').inputValue();
    record(`S5 ${label}: unidad desconocida => ASDAS-CRP vacío (sin score silencioso)`,
      s5Asdas === '', `asdas='${s5Asdas}'`);
    const s5NoteA = await page.locator('#asdasPcrConversionNote').textContent();
    record('S5: nota ASDAS explica el fallo seguro', s5NoteA.includes('fallo seguro'),
      `asdas='${s5NoteA}'`);
    const s5Mirror = await page.locator('#asdasPcrUnitMirror').textContent();
    record('S5: espejo de unidad muestra estado sin unidad', s5Mirror.includes('unidad no informada'), `mirror='${s5Mirror}'`);

    // S7 — Console/page errors.
    record(`S7 ${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
    record(`S7 ${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
  } finally {
    await context.close();
  }
}

// APs pass: DAPSA is APs-only, so every DAPSA and PCR-source-traceability
// scenario must run under `aps`.
async function runApsSuite(label, pagePath, collectFnName) {
  console.log(`\n=== ${label} (${pagePath}) — APs / DAPSA ===`);
  const { context, page, consoleErrors, pageErrors } = await openPage(browser, pagePath);

  try {
    // Supported interaction: adapt the form to APs (DAPSA surface).
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(300);
    for (const sel of ['#pcrValue', '#dapsaResult', '.homunculus-svg-wrapper']) {
      const visible = await openAncestorCollapsibles(page, sel);
      if (!visible) throw new Error(`no fue posible hacer visible ${sel} mediante interacción soportada`);
    }

    // Real homunculus clicks: 1 dolorosa (NAD) + 1 tumefacta (NAT).
    await page.locator('.homunculus-mode-btn[data-mode="nad"]').click();
    await page.locator('[data-region-id="hombro-derecho"]').first().click();
    await page.locator('.homunculus-mode-btn[data-mode="nat"]').click();
    await page.locator('[data-region-id="hombro-izquierdo"]').first().click();

    const fill = async (sel, value) => {
      await page.locator(sel).first().fill(value);
      await page.waitForTimeout(80);
    };

    // S3 — DAPSA conversion mg/L -> mg/dL (real NAD/NAT homunculus marks).
    await page.selectOption('#pcrUnit', 'mg/L');
    await fill('#pcrValue', '30');
    await fill('#evaDolor', '2');
    await fill('#evaGlobal', '3');
    const s3Total = await page.locator('#dapsaResult').inputValue();
    record(`S3 ${label}: DAPSA con 30 mg/L => 1+1+2+3+3 = 10.0`, s3Total === '10.0', `obtenido '${s3Total}'`);
    const s3Note = await page.locator('#dapsaPcrConversionNote').textContent();
    const s3NoteVisible = await page.locator('#dapsaPcrConversionNote').isVisible();
    record('S3: nota visible nombra la conversión mg/L -> mg/dL y DAPSA',
      s3NoteVisible && s3Note.includes('mg/L') && s3Note.includes('mg/dL') && s3Note.includes('DAPSA') && s3Note.includes('Valor fuente preservado'),
      `nota='${s3Note}'`);
    const s3Source = await page.locator('#dapsaPCR').inputValue();
    record('S3: el campo fuente readonly dapsaPCR conserva 30 (no el derivado 3)', s3Source === '30', `obtenido '${s3Source}'`);

    // S4 — DAPSA no conversion when source unit is the expected mg/dL.
    await page.selectOption('#pcrUnit', 'mg/dL');
    await fill('#pcrValue', '3');
    const s4Total = await page.locator('#dapsaResult').inputValue();
    record(`S4 ${label}: DAPSA con 3 mg/dL => mismo total 10.0 sin conversión`, s4Total === '10.0', `obtenido '${s4Total}'`);
    const s4NoteHidden = await page.locator('#dapsaPcrConversionNote').isHidden();
    record('S4: nota de conversión oculta cuando no hay conversión', s4NoteHidden, `visible=${!s4NoteHidden}`);

    // S5 (DAPSA half) — Unknown unit => fail safe, no silent numeric.
    await page.selectOption('#pcrUnit', '');
    await page.waitForTimeout(120);
    const s5Dapsa = await page.locator('#dapsaResult').inputValue();
    record(`S5 ${label}: unidad desconocida => DAPSA vacío (sin score silencioso)`,
      s5Dapsa === '', `dapsa='${s5Dapsa}'`);
    const s5NoteD = await page.locator('#dapsaPcrConversionNote').textContent();
    record('S5: nota DAPSA explica el fallo seguro', s5NoteD.includes('fallo seguro'),
      `dapsa='${s5NoteD}'`);

    // S6 — Traceability via the supported collection API (read-only evaluate).
    await page.selectOption('#pcrUnit', 'mg/dL');
    await fill('#pcrValue', '30');
    const collected = await page.evaluate((fnName) => {
      const datos = HubTools.form[fnName]();
      return { pcr: datos.pcr, pcrUnit: datos.pcrUnit, dapsaPCR: datos.dapsaPCR };
    }, collectFnName);
    record('S6: la colección soportada preserva valor fuente y unidad explícita',
      collected.pcr === '30' && collected.pcrUnit === 'mg/dL' && collected.dapsaPCR === '30',
      JSON.stringify(collected));

    // S7 — Console/page errors.
    record(`S7 ${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
    record(`S7 ${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
  } finally {
    await context.close();
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  await runEspaSuite('primera_visita', 'primera_visita.html');
  await runApsSuite('primera_visita', 'primera_visita.html', 'recopilarDatosFormulario');
  await runEspaSuite('seguimiento', 'seguimiento.html');
  await runApsSuite('seguimiento', 'seguimiento.html', 'recopilarDatosFormularioSeguimiento');
} catch (err) {
  console.error('ENVIRONMENT FAILURE: ' + err.message);
  results.push(false);
} finally {
  if (browser) await browser.close();
  server.close();
}

const passed = results.filter(Boolean).length;
const total = results.length;
console.log(`\nRESULTADO: ${passed} OK / ${total - passed} FALLIDO`);
if (passed !== total) {
  console.log('reuma_pcr_units_browser_check FAILED');
  process.exit(1);
}
console.log('reuma_pcr_units_browser_check PASS');
