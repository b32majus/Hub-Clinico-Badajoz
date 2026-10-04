#!/usr/bin/env node
'use strict';
/**
 * Supported-interaction browser QA for C3 #520
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1, parent #517).
 *
 * In real Chromium, with synthetic data and only supported interactions
 * (pathology selectOption, homunculus region clicks, real EVA/PASI fills, real
 * `.haq-score` selects, collapsible headers), drives the three visible MDA
 * verdicts and READS what the visit collector + legacy row/note producers
 * derive from them:
 *
 *   Primera Visita: ALCANZADO -> mdaCumple true (+ 'MDA: true' in the note),
 *                   NO ALCANZADO -> false (+ 'MDA: false'),
 *                   PENDIENTE    -> false (+ 'MDA: false').
 *   Seguimiento: the same three verdicts additionally mapped to legacy 497
 *                   column 193 ('SI' only for ALCANZADO, 'NO' otherwise) with
 *                   the row keeping 497 columns.
 *
 * page.evaluate only reads observables or runs production read/derivation code
 * (`HubTools.form.recopilar*`, `HubTools.export.generarFilaCSV_*`,
 * `HubTools.export.generarNotaClinica`); no result field is ever written.
 * console.error === 0 and pageerror === 0 are asserted per scenario.
 *
 * Not part of `verify:nexus` (browser dependency).
 * Usage: node tools/reuma_mda_cumple_browser_check.mjs
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json'))) {
      return createRequire(path.join(nm, '__loader_cumple.cjs'))('playwright');
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-mda-cumple-'));
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
function check(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

async function gate() {
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
  await page.waitForTimeout(130);
}

async function markRegions(page, mode, regions) {
  const btnSel = `.homunculus-mode-btn[data-mode="${mode}"]`;
  await openCollapsibles(page, btnSel);
  await page.locator(btnSel).first().scrollIntoViewIfNeeded();
  await page.locator(btnSel).first().click({ timeout: 8000 });
  await page.waitForTimeout(120);
  for (const region of regions) {
    const regSel = `[data-region-id="${region}"]`;
    await openCollapsibles(page, regSel);
    await page.locator(regSel).first().click({ timeout: 8000 });
    await page.waitForTimeout(180);
  }
}

async function answerHAQ(page, value) {
  await openCollapsibles(page, '.haq-score');
  const total = await page.locator('.haq-score').count();
  for (let i = 0; i < Math.min(6, total); i++) {
    await page.locator('.haq-score').nth(i).selectOption(value);
  }
  await page.waitForTimeout(150);
}

const READ = (collector, builder, note) => `(() => {
  const datos = HubTools.form.${collector}();
  const row = HubTools.export.${builder}(JSON.parse(JSON.stringify(datos))).split('\\t');
  const nota = HubTools.export.generarNotaClinica(JSON.parse(JSON.stringify(datos)));
  const mdaLinea = (nota.match(/MDA: [^\\n]*/) || [''])[0];
  return {
    final: (document.getElementById('mdaResultadoFinal') || {}).textContent || '',
    mdaCumple: datos.mdaCumple,
    col193: row[192],
    len: row.length,
    notaMda: mdaLinea
  };
})()`;

async function scenario(pagePath) {
  const ctx = await gate();
  const page = await ctx.newPage();
  const errs = [];
  const perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));
  await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });
  await page.selectOption('#diagnosticoPrimario', 'aps');
  await page.waitForTimeout(300);
  await openCollapsibles(page, '#mdaSection');
  return { ctx, page, errs, perrs };
}

const isSeg = (p) => p === 'seguimiento.html';
const collectorFor = (p) => (isSeg(p) ? 'recopilarDatosFormularioSeguimiento' : 'recopilarDatosFormulario');
const builderFor = (p) => (isSeg(p) ? 'generarFilaCSV_APs_Seguimiento' : 'generarFilaCSV_APs_PrimeraVisita');
const rowMappingApplies = (p) => isSeg(p);

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

for (const pagePath of ['primera_visita.html', 'seguimiento.html']) {
  console.log(`\n=== ${pagePath} (APs) — mdaCumple / col 193 ===`);

  // --- Scenario 1: MDA ALCANZADO -----------------------------------------
  {
    const { ctx, page, errs, perrs } = await scenario(pagePath);
    try {
      await markRegions(page, 'nat', ['hombro-derecho']);
      await markRegions(page, 'nad', ['hombro-izquierdo']);
      await fill(page, '#evaDolor', '1');
      await fill(page, '#evaGlobal', '1');
      await answerHAQ(page, '0');
      if (isSeg(pagePath)) {
        // Seguimiento also needs PASI/BSA resolved or pending: 5 cumplidos is
        // already >= 5, the psoriasis/LEI rows may stay pending.
        await fill(page, '#pasiValue', '5');
      }
      const read = await page.evaluate(READ(collectorFor(pagePath), builderFor(pagePath)));
      check(`${pagePath} ALCANZADO -> mdaCumple true`,
        read.final.trim() === 'MDA ALCANZADO ✓' && read.mdaCumple === true, JSON.stringify(read));
      check(`${pagePath} ALCANZADO -> nota clínica 'MDA: true'`,
        read.notaMda === 'MDA: true', `nota='${read.notaMda}'`);
      if (rowMappingApplies(pagePath)) {
        check(`${pagePath} ALCANZADO -> legacy col 193 'SI' y 497 columnas`,
          read.col193 === 'SI' && read.len === 497, JSON.stringify({ col193: read.col193, len: read.len }));
      } else {
        check(`${pagePath} Primera Visita: layout 497 intacto (bloque MDA vacío en col 193)`,
          read.len === 497 && read.col193 === '', JSON.stringify({ col193: read.col193, len: read.len }));
      }
      check(`${pagePath} ALCANZADO console.error=0 pageerror=0`,
        errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
    } finally {
      await ctx.close();
    }
  }

  // --- Scenario 2: MDA NO ALCANZADO --------------------------------------
  {
    const { ctx, page, errs, perrs } = await scenario(pagePath);
    try {
      // Two regions per joint count -> NAT/NAD no cumplidos (2 + 2 no).
      await markRegions(page, 'nat', ['hombro-izquierdo', 'codo-derecho']);
      await markRegions(page, 'nad', ['hombro-derecho', 'codo-izquierdo']);
      await fill(page, '#evaDolor', '9');
      await fill(page, '#evaGlobal', '1');
      await answerHAQ(page, '0');
      if (isSeg(pagePath)) await fill(page, '#pasiValue', '5');
      const read = await page.evaluate(READ(collectorFor(pagePath), builderFor(pagePath)));
      check(`${pagePath} NO ALCANZADO -> mdaCumple false`,
        read.final.trim() === 'MDA NO ALCANZADO' && read.mdaCumple === false, JSON.stringify(read));
      check(`${pagePath} NO ALCANZADO -> nota clínica sin 'MDA: true'`,
        read.notaMda === 'MDA: false', `nota='${read.notaMda}'`);
      if (rowMappingApplies(pagePath)) {
        check(`${pagePath} NO ALCANZADO -> legacy col 193 'NO' y 497 columnas`,
          read.col193 === 'NO' && read.len === 497, JSON.stringify({ col193: read.col193, len: read.len }));
      } else {
        check(`${pagePath} NO ALCANZADO: layout 497 intacto`,
          read.len === 497 && read.col193 === '', JSON.stringify({ col193: read.col193, len: read.len }));
      }
      check(`${pagePath} NO ALCANZADO console.error=0 pageerror=0`,
        errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
    } finally {
      await ctx.close();
    }
  }

  // --- Scenario 3: MDA PENDIENTE -----------------------------------------
  {
    const { ctx, page, errs, perrs } = await scenario(pagePath);
    try {
      if (isSeg(pagePath)) {
        // NAT with two regions (not fulfilled) keeps fulfilled at 4 while
        // psoriasis + HAQ stay pending -> 4 + 2 >= 5 -> PENDIENTE.
        await markRegions(page, 'nat', ['hombro-izquierdo', 'codo-derecho']);
        await markRegions(page, 'nad', ['hombro-derecho']);
      } else {
        await markRegions(page, 'nat', ['hombro-derecho']);
        await markRegions(page, 'nad', ['hombro-izquierdo']);
      }
      await fill(page, '#evaDolor', '1');
      await fill(page, '#evaGlobal', '1');
      // HAQ intentionally left unanswered -> PENDIENTE.
      const read = await page.evaluate(READ(collectorFor(pagePath), builderFor(pagePath)));
      check(`${pagePath} PENDIENTE -> mdaCumple false`,
        read.final.trim().startsWith('MDA PENDIENTE') && read.mdaCumple === false, JSON.stringify(read));
      check(`${pagePath} PENDIENTE -> nota clínica sin 'MDA: true'`,
        read.notaMda === 'MDA: false', `nota='${read.notaMda}'`);
      if (rowMappingApplies(pagePath)) {
        check(`${pagePath} PENDIENTE -> legacy col 193 'NO' y 497 columnas`,
          read.col193 === 'NO' && read.len === 497, JSON.stringify({ col193: read.col193, len: read.len }));
      } else {
        check(`${pagePath} PENDIENTE: layout 497 intacto`,
          read.len === 497 && read.col193 === '', JSON.stringify({ col193: read.col193, len: read.len }));
      }
      check(`${pagePath} PENDIENTE console.error=0 pageerror=0`,
        errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();
server.close();
fs.rmSync(tempDir, { recursive: true, force: true });

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? 'reuma_mda_cumple_browser_check PASS' : 'reuma_mda_cumple_browser_check FAILED');
if (failed > 0) process.exit(1);
