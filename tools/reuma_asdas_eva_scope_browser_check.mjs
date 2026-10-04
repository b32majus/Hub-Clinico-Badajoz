#!/usr/bin/env node
'use strict';
/**
 * Supported-interaction browser QA for C1 #518
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1, parent #517).
 *
 * Mandatory evidence from #518, on Primera Visita and Seguimiento with
 * synthetic data and real Chromium:
 *   (1) under APs the ASDAS block is not visible/executable;
 *   (2) capturing EVA Global = 4 does NOT populate #asdasEvaGlobal;
 *   (3) the legacy ASDAS slot of the produced row stays empty;
 *   (4) switching APs -> EspA reuses the captured EVA Global with no
 *       re-entry and reaches the frozen ASDAS-CRP literal;
 *   (5) going back to APs leaves no residual mirror/legacy ASDAS state;
 *   (6) console.error === 0 and pageerror === 0.
 *
 * The harness only performs supported interactions (selectOption, fill,
 * real homunculus region clicks, real collapsible headers). Every
 * page.evaluate call READS observables or runs production read/derivation
 * code (`HubTools.form.recopilar*`, `HubTools.export.generarFilaCSV_*`);
 * no result field, mirror or readonly control is ever written by the harness.
 *
 * Not part of `verify:nexus` (browser dependency).
 * Usage: node tools/reuma_asdas_eva_scope_browser_check.mjs
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

function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json'))) {
      return createRequire(path.join(nm, '__loader_scope.cjs'))('playwright');
    }
    return null;
  };
  for (const b of String(process.env.PATH || '').split(path.delimiter)) {
    if (!b) continue;
    const prefix = path.resolve(b, '..');
    for (const nm of [prefix, path.join(prefix, 'lib', 'node_modules')]) {
      const l = tryNM(nm);
      if (l) return l;
    }
  }
  const npx = path.join(process.env.HOME || '', '.npm', '_npx');
  if (fs.existsSync(npx)) {
    for (const e of fs.readdirSync(npx).sort().reverse()) {
      const l = tryNM(path.join(npx, e, 'node_modules'));
      if (l) return l;
    }
  }
  const l = tryNM(path.join(ROOT, 'node_modules'));
  if (l) return l;
  throw new Error('playwright not found');
}

const { chromium } = loadPlaywright();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (fs.existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) return bundled;
  const c = fs.readdirSync(cache).filter((e) => e.startsWith('chromium_headless_shell-')).sort().reverse()
    .map((e) => path.join(cache, e, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return c.find(fs.existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.xlsx', 'application/octet-stream']
]);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-asdas-scope-'));
const workbookPath = path.join(tempDir, 'synthetic.xlsx');
{
  const wb = XLSX.utils.book_new();
  for (const s of ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN']) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ ID_Paciente: 'SYN-000-000' }]), s);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' }]), 'Profesionales');
  fs.writeFileSync(workbookPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

const server = createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent((req.url || '/').split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': mime.get(path.extname(p)) || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const results = [];
function record(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function asdascrp(d, r, e, n, p) {
  return ((0.121 * d) + (0.058 * r) + (0.110 * e) + (0.073 * n) + (0.579 * Math.log(p + 1))).toFixed(2);
}

async function gate(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load', timeout: 45000 });
  await page.setInputFiles('#gateExcelInput', workbookPath);
  await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
  const prof = await page.evaluate(() => {
    const s = document.getElementById('gateProfessionalSelect');
    return s ? Array.from(s.options).map((o) => o.value).find(Boolean) || '' : '';
  });
  await page.selectOption('#gateProfessionalSelect', prof);
  await page.click('#gateConfirmBtn');
  await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
  await page.close();
  return ctx;
}

async function isHit(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { exists: false };
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { exists: true, box: false };
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { exists: true, box: true, hit: !!top && (top === el || el.contains(top)) };
  }, sel);
}

async function openCollapsibles(page, sel) {
  for (let i = 0; i < 6; i++) {
    const info = await isHit(page, sel);
    if (info.hit) return info;
    const headers = page.locator(sel).first().locator(
      'xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]'
    );
    const n = await headers.count();
    let clicked = false;
    for (let k = 0; k < n; k++) {
      const h = headers.nth(k);
      if (!(await h.evaluate((e) => e.classList.contains('active')))) {
        await h.click({ timeout: 5000 });
        clicked = true;
        await page.waitForTimeout(650);
      }
    }
    if (!clicked) return info;
  }
  return isHit(page, sel);
}

async function fill(page, sel, value) {
  await page.locator(sel).first().fill(value);
  await page.waitForTimeout(120);
}

async function markHomunculus(page, mode, region) {
  const btnSel = `.homunculus-mode-btn[data-mode="${mode}"]`;
  await openCollapsibles(page, btnSel);
  await page.locator(btnSel).first().scrollIntoViewIfNeeded();
  await page.locator(btnSel).first().click({ timeout: 8000 });
  await page.waitForTimeout(120);
  const regSel = `[data-region-id="${region}"]`;
  await openCollapsibles(page, regSel);
  await page.locator(regSel).first().click({ timeout: 8000 });
  await page.waitForTimeout(220);
}

const MIRROR = 'document.getElementById("asdasEvaGlobal").value';
const LEGACY = (builder, collector) => `(() => {
  const datos = HubTools.form.${collector}();
  const row = HubTools.export.${builder}(JSON.parse(JSON.stringify(datos))).split('\\t');
  return {
    collected: datos.asdasEvaGlobal,
    crp: datos.asdasCrpResult,
    esr: datos.asdasEsrResult,
    len: row.length,
    block: row.slice(155, 160)
  };
})()`;

async function runPage(browser, pagePath) {
  console.log(`\n=== ${pagePath} ===`);
  const ctx = await gate(browser);
  const page = await ctx.newPage();
  const errs = [];
  const perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));

  const isSeg = pagePath === 'seguimiento.html';
  const collector = isSeg ? 'recopilarDatosFormularioSeguimiento' : 'recopilarDatosFormulario';
  const builderSeg = isSeg ? 'generarFilaCSV_APs_Seguimiento' : null;

  try {
    await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });
    // --- APs: capture EVA Global = 4 -------------------------------------
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(350);
    for (const sel of ['#evaGlobal', '#asdasSection', '.homunculus-svg-wrapper']) {
      const info = await openCollapsibles(page, sel);
      if (!info.hit && sel !== '#asdasSection') {
        throw new Error(`no fue posible hacer visible ${sel} mediante interacción soportada`);
      }
    }

    const asdasDisplay = await page.evaluate(() => getComputedStyle(document.getElementById('asdasSection')).display);
    record(`(1) ${pagePath} APs: bloque ASDAS no visible (display='${asdasDisplay}')`,
      asdasDisplay === 'none', `display='${asdasDisplay}'`);
    const asdasExecutable = await page.evaluate(() => {
      const el = document.getElementById('asdasDolorEspalda');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!top && (top === el || el.contains(top));
    });
    record(`(1) ${pagePath} APs: entrada ASDAS no ejecutable por interacción soportada`,
      asdasExecutable === false, `ejecutable=${asdasExecutable}`);

    await fill(page, '#evaGlobal', '4');
    const mirrorAps = await page.evaluate(() => document.getElementById('asdasEvaGlobal').value);
    record(`(2) ${pagePath} APs con EVA Global=4: #asdasEvaGlobal vacío (mirror='${mirrorAps}')`,
      mirrorAps === '', `mirror='${mirrorAps}'`);
    const crpAps = await page.evaluate(() => ({
      crp: document.getElementById('asdasCrpResult').value,
      esr: document.getElementById('asdasEsrResult').value
    }));
    record(`(2) ${pagePath} APs sin ASDAS computado (CRP '' y ESR '')`,
      crpAps.crp === '' && crpAps.esr === '', JSON.stringify(crpAps));

    const apsRead = await page.evaluate(LEGACY(builderSeg || 'generarFilaCSV_APs_PrimeraVisita', collector));
    record(`(3) ${pagePath} APs: recopilado asdasEvaGlobal '' y ${apsRead.len} columnas`,
      apsRead.collected === '' && apsRead.len === 497, JSON.stringify(apsRead));
    record(`(3) ${pagePath} APs: slot legacy ASDAS (cols 156-160) vacío`,
      apsRead.block.every((v) => v === ''), JSON.stringify(apsRead.block));

    // --- APs -> EspA: reuse without re-entry ------------------------------
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(400);
    const mirrorEspa = await page.evaluate(() => document.getElementById('asdasEvaGlobal').value);
    record(`(4) ${pagePath} APs -> EspA reutiliza EVA Global sin reentrada (mirror='${mirrorEspa}')`,
      mirrorEspa === '4', `mirror='${mirrorEspa}'`);
    const untouched = await page.evaluate(() => [
      document.getElementById('asdasDolorEspalda').value,
      document.getElementById('asdasDuracionRigidez').value
    ]);
    record(`(4) ${pagePath} entradas ASDAS intactas tras el cambio de patología`,
      untouched.every((v) => v === ''), JSON.stringify(untouched));

    await fill(page, '#pcrValue', '30');
    await fill(page, '#asdasDolorEspalda', '3');
    await fill(page, '#asdasDuracionRigidez', '2');
    await markHomunculus(page, 'nad', 'hombro-derecho');
    const crpEspa = await page.locator('#asdasCrpResult').inputValue();
    const esperado = asdascrp(3, 2, 4, 1, 30);
    record(`(4) ${pagePath} ASDAS-CRP '${esperado}' alimentado por el espejo reutilizado`,
      crpEspa === esperado, `crp='${crpEspa}', esperado='${esperado}'`);

    const espaRead = await page.evaluate(LEGACY(builderSeg || 'generarFilaCSV_EspA_PrimeraVisita', collector));
    record(`(4) ${pagePath} EspA: recopilado asdasEvaGlobal '4' y ${espaRead.len} columnas`,
      espaRead.collected === '4' && espaRead.len === 497, JSON.stringify(espaRead));
    if (isSeg) {
      record(`(4) ${pagePath} EspA: slot legacy ASDAS EVA (col 158) = '4'`,
        espaRead.block[2] === '4', JSON.stringify(espaRead.block));
    } else {
      record(`(4) ${pagePath} Primera Visita: slots ASDAS legacy vacíos en el layout publicado`,
        espaRead.block.every((v) => v === ''), JSON.stringify(espaRead.block));
    }

    // --- EspA -> APs: no residual state ----------------------------------
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(400);
    const mirrorBack = await page.evaluate(() => document.getElementById('asdasEvaGlobal').value);
    record(`(5) ${pagePath} EspA -> APs sin espejo residual (mirror='${mirrorBack}')`,
      mirrorBack === '', `mirror='${mirrorBack}'`);
    const backRead = await page.evaluate(LEGACY(builderSeg || 'generarFilaCSV_APs_PrimeraVisita', collector));
    // Slot 158 is the EVA Global mirror (C1 #518). Columns 156/157 hold the
    // ASDAS questionnaire answers the clinician typed while in EspA: T1 #513
    // froze them as user input that is never cleared by the pathology gate,
    // so they are observed here but deliberately not asserted empty.
    record(`(5) ${pagePath} EspA -> APs: recopilado '' y slot legacy ASDAS EVA (col 158) vacío`,
      backRead.collected === '' && backRead.block[2] === '' && backRead.len === 497,
      JSON.stringify(backRead));
    if (isSeg) {
      record(`(5) ${pagePath} EspA -> APs: derivados ASDAS legacy (cols 159/160) vacíos`,
        backRead.block[3] === '' && backRead.block[4] === '', JSON.stringify(backRead.block));
      record(`(5) ${pagePath} observación: cols 156/157 conservan la entrada del usuario (T1 #513)`,
        true, `block=${JSON.stringify(backRead.block)}`);
    }

    record(`(6) ${pagePath} console.error=0 pageerror=0`,
      errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
  } finally {
    await ctx.close();
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  await runPage(browser, 'primera_visita.html');
  await runPage(browser, 'seguimiento.html');
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
  console.log('reuma_asdas_eva_scope_browser_check FAILED');
  process.exit(1);
}
console.log('reuma_asdas_eva_scope_browser_check PASS');
