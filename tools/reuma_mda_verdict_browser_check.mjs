#!/usr/bin/env node
'use strict';
/**
 * Supported-interaction browser QA for C2 #519
 * (TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1, parent #517).
 *
 * Proves the three visible MDA verdicts in real Chromium with synthetic data
 * and ONLY supported interactions (pathology selectOption, real homunculus
 * region clicks for NAT/NAD, real EVA/PASI/BSA fills, real `.haq-score`
 * selects, real collapsible headers). page.evaluate only READS observables.
 *
 *   Primera Visita (no PASI/BSA/LEI controls exist there; nothing is invented):
 *     P1 5 cumplidos + 2 pendientes -> MDA ALCANZADO ✓
 *     P2 2 cumplidos + 2 pendientes + 3 no -> MDA NO ALCANZADO
 *     P3 4 cumplidos + 3 pendientes -> MDA PENDIENTE naming the sources
 *   Seguimiento:
 *     S1 5 cumplidos + 2 pendientes -> MDA ALCANZADO ✓
 *     S2 4 cumplidos + 1 pendiente + 2 no -> MDA PENDIENTE (never a
 *        definitive NO ALCANZADO while the pending criterion could still
 *        reach >= 5)
 *     S3 3 cumplidos + 1 pendiente + 3 no -> MDA NO ALCANZADO
 *   Both pages: no manual controls in #mdaSection, console.error=0,
 *   pageerror=0.
 *
 * Not part of `verify:nexus` (browser dependency).
 * Usage: node tools/reuma_mda_verdict_browser_check.mjs
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
      return createRequire(path.join(nm, '__loader_verdict.cjs'))('playwright');
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-mda-verdict-'));
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
  await page.goto(`${baseUrl}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
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

async function readMDA(page) {
  return page.evaluate(() => {
    const txt = (id) => {
      const el = document.getElementById(id);
      return el ? el.textContent.trim() : null;
    };
    const statuses = [];
    const estados = [];
    for (let i = 1; i <= 7; i++) {
      const el = document.getElementById('mdaStatus' + i);
      statuses.push(el ? el.textContent.trim() : null);
      estados.push(el ? el.getAttribute('data-estado') : null);
    }
    const controls = document.querySelectorAll('#mdaSection input, #mdaSection select, #mdaSection textarea, #mdaSection button').length;
    return { final: txt('mdaResultadoFinal'), cumplidos: txt('mdaCumplidos'), statuses, estados, controls };
  });
}

function freshScenario(pagePath) {
  return gate().then(async (ctx) => {
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
  });
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

// ---------------------------------------------------------------------------
// Primera Visita: ALCANZADO / NO ALCANZADO / PENDIENTE
// ---------------------------------------------------------------------------
{
  console.log('\n=== primera_visita.html (APs) ===');
  const { ctx, page, errs, perrs } = await freshScenario('primera_visita.html');
  try {
    const d1 = await readMDA(page);
    check('PV sin controles manuales en #mdaSection', d1.controls === 0, `controls=${d1.controls}`);

    // P1: NAT/NAD 1 región, EVA Dolor 1, EVA Global 1, HAQ 0 -> 5 cumplidos;
    // psoriasis y LEI sin fuente -> pendientes.
    await markRegions(page, 'nat', ['hombro-derecho']);
    await markRegions(page, 'nad', ['hombro-izquierdo']);
    await fill(page, '#evaDolor', '1');
    await fill(page, '#evaGlobal', '1');
    await answerHAQ(page, '0');
    const p1 = await readMDA(page);
    check('P1 PV 5 cumplidos + 2 pendientes -> MDA ALCANZADO ✓',
      p1.final === 'MDA ALCANZADO ✓' && p1.cumplidos === '5' &&
        p1.estados[2] === 'pendiente' && p1.estados[3] === 'pendiente',
      JSON.stringify(p1));

    // P2: NAT/NAD 2 regiones, EVA Dolor 9, EVA Global 1, HAQ 0 ->
    // 2 cumplidos + 2 pendientes + 3 no -> NO ALCANZADO.
    await markRegions(page, 'nat', ['hombro-izquierdo']);
    await markRegions(page, 'nad', ['codo-derecho']);
    await fill(page, '#evaDolor', '9');
    const p2 = await readMDA(page);
    check('P2 PV 2 cumplidos + 2 pendientes + 3 no -> MDA NO ALCANZADO',
      p2.final === 'MDA NO ALCANZADO' && p2.cumplidos === '2',
      JSON.stringify(p2));

    check('primera_visita console.error=0 pageerror=0 (P1/P2)', errs.length === 0 && perrs.length === 0,
      JSON.stringify([...errs, ...perrs].slice(0, 5)));
  } finally {
    await ctx.close();
  }

  // P3 needs HAQ still unanswered, so it runs on a fresh page: 4 cumplidos +
  // 3 pendientes -> PENDIENTE naming every missing source.
  const second = await freshScenario('primera_visita.html');
  try {
    await markRegions(second.page, 'nat', ['hombro-derecho']);
    await markRegions(second.page, 'nad', ['hombro-izquierdo']);
    await fill(second.page, '#evaDolor', '1');
    await fill(second.page, '#evaGlobal', '1');
    const p3 = await readMDA(second.page);
    check('P3 PV 4 cumplidos + 3 pendientes -> MDA PENDIENTE con fuentes nombradas',
      p3.final.startsWith('MDA PENDIENTE') && !p3.final.toUpperCase().includes('ALCANZADO') &&
        p3.cumplidos === '—' &&
        p3.final.includes('PASI o BSA') && p3.final.includes('LEI') && p3.final.includes('HAQ'),
      JSON.stringify(p3));
    check('primera_visita console.error=0 pageerror=0 (P3)',
      second.errs.length === 0 && second.perrs.length === 0,
      JSON.stringify([...second.errs, ...second.perrs].slice(0, 5)));
  } finally {
    await second.ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Seguimiento: ALCANZADO / PENDIENTE / NO ALCANZADO
// ---------------------------------------------------------------------------
{
  console.log('\n=== seguimiento.html (APs) ===');
  const { ctx, page, errs, perrs } = await freshScenario('seguimiento.html');
  try {
    const d1 = await readMDA(page);
    check('seguimiento sin controles manuales en #mdaSection', d1.controls === 0, `controls=${d1.controls}`);

    // S1: NAT/NAD 1 región, EVA Dolor 1, EVA Global 1 -> 5 cumplidos
    // (incluye LEI 0), psoriasis y HAQ pendientes -> ALCANZADO.
    await markRegions(page, 'nat', ['hombro-derecho']);
    await markRegions(page, 'nad', ['hombro-izquierdo']);
    await fill(page, '#evaDolor', '1');
    await fill(page, '#evaGlobal', '1');
    const s1 = await readMDA(page);
    check('S1 seguimiento 5 cumplidos + 2 pendientes -> MDA ALCANZADO ✓',
      s1.final === 'MDA ALCANZADO ✓' && s1.cumplidos === '5' &&
        s1.estados[2] === 'pendiente' && s1.estados[6] === 'pendiente',
      JSON.stringify(s1));

    // S2: PASI 5 con BSA ausente -> psoriasis pendiente; 4 cumplidos + 2 no.
    await fill(page, '#pasiValue', '5');
    await fill(page, '#evaGlobal', '9');
    await answerHAQ(page, '3');
    const s2 = await readMDA(page);
    check('S2 seguimiento 4 cumplidos + 1 pendiente + 2 no -> MDA PENDIENTE (nunca NO ALCANZADO)',
      s2.final.startsWith('MDA PENDIENTE') && !s2.final.toUpperCase().includes('ALCANZADO') &&
        s2.cumplidos === '—' && s2.estados[2] === 'pendiente' && s2.final.includes('PASI o BSA'),
      JSON.stringify(s2));

    // S3: NAT/NAD 2 regiones, EVA Dolor 9, EVA Global 1, HAQ 0 ->
    // 3 cumplidos (EVA Global, LEI, HAQ) + 1 pendiente + 3 no.
    await markRegions(page, 'nat', ['hombro-izquierdo']);
    await markRegions(page, 'nad', ['codo-derecho']);
    await fill(page, '#evaDolor', '9');
    await fill(page, '#evaGlobal', '1');
    await answerHAQ(page, '0');
    const s3 = await readMDA(page);
    check('S3 seguimiento 3 cumplidos + 1 pendiente + 3 no -> MDA NO ALCANZADO',
      s3.final === 'MDA NO ALCANZADO' && s3.cumplidos === '3' && s3.estados[2] === 'pendiente',
      JSON.stringify(s3));

    // S4: psoriasis reglas (PASI 0.5 con BSA ausente -> cumplido).
    await markRegions(page, 'nat', ['hombro-derecho']);
    await markRegions(page, 'nad', ['hombro-izquierdo']);
    await fill(page, '#evaDolor', '1');
    await fill(page, '#pasiValue', '0.5');
    await answerHAQ(page, '0');
    const s4 = await readMDA(page);
    check('S4 seguimiento PASI 0.5 conocido positivo + BSA ausente -> psoriasis cumplido',
      s4.estados[2] === 'cumplido' && s4.statuses[2] === '✓' && s4.final === 'MDA ALCANZADO ✓',
      JSON.stringify(s4));

    check('seguimiento console.error=0 pageerror=0', errs.length === 0 && perrs.length === 0,
      JSON.stringify([...errs, ...perrs].slice(0, 5)));
  } finally {
    await ctx.close();
  }
}

await browser.close();
server.close();
fs.rmSync(tempDir, { recursive: true, force: true });

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? 'reuma_mda_verdict_browser_check PASS' : 'reuma_mda_verdict_browser_check FAILED');
if (failed > 0) process.exit(1);
