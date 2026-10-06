#!/usr/bin/env node
'use strict';
/**
 * Focused falsification checker for WO-NEXUS-COLLAPSIBLE-DYNAMIC-HEIGHT-545 (#545).
 *
 * Shared-seam repair in modules/formController.js only: an already-open
 * collapsible section must adapt when supported interaction grows/shrinks its
 * content (nested HAQ-DI inside Indices clipping the RAPID3 block below it).
 *
 * Supported interactions only: real pathology selectOption, real
 * .collapsible-header clicks, real treatment-switch clicks. Reads observables
 * via page.evaluate; never writes result fields, never tampers DOM.
 * console.error === 0 and pageerror === 0 are asserted per journey.
 *
 * Not part of `verify:nexus` (browser dependency).
 * Usage: node tools/reuma_collapsible_dynamic_height_browser_check.mjs
 */
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

// --- Static guard: no persistent polling/timer loop in the shared seam ------
const seamSrc = fs.readFileSync(path.join(ROOT, 'modules', 'formController.js'), 'utf8');
const staticFindings = [];
if (/setInterval\s*\(/.test(seamSrc)) staticFindings.push('setInterval present in modules/formController.js');
if (!/transitionend/.test(seamSrc)) staticFindings.push('transitionend sync missing');
if (!/MutationObserver/.test(seamSrc)) staticFindings.push('MutationObserver sync missing');

function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json'))) {
      return createRequire(path.join(nm, '__loader_dynheight.cjs'))('playwright');
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-dynheight-'));
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
const evidenceDir = path.join(ROOT, '.atl', 'evidence', 'collapsible-dynamic-height-545');

const results = [];
function check(name, pass, detail) {
  results.push(!!pass);
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

async function gate() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
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

async function clickHeader(page, text) {
  const h = page.locator('.collapsible-header', { hasText: text }).first();
  await h.scrollIntoViewIfNeeded();
  await h.click({ timeout: 8000 });
}

// Reads the open/closed + sizing state of the outer Indices section.
const READ_INDICES = `(() => {
  const headers = Array.from(document.querySelectorAll('.collapsible-header'));
  const h = headers.find((x) => x.textContent.includes('Índices de Actividad'));
  if (!h) return { found: false };
  const c = h.nextElementSibling;
  const maxH = parseInt(c.style.maxHeight) || 0;
  const rapid = document.getElementById('rapid3Section');
  const rapidBox = rapid ? rapid.getBoundingClientRect() : null;
  const contentBox = c.getBoundingClientRect();
  const target = document.getElementById('rapid3Total');
  let hit = null;
  if (target) {
    target.scrollIntoView({ block: 'center' });
    const r = target.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    hit = !!el && (el === target || target.contains(el));
  }
  return {
    found: true,
    active: h.classList.contains('active'),
    maxH, scrollH: c.scrollHeight,
    stale: c.scrollHeight - maxH,
    overflowY: getComputedStyle(c).overflowY,
    rapidDisplay: rapid ? getComputedStyle(rapid).display : 'n/a',
    rapidClipped: rapidBox ? rapidBox.bottom > contentBox.bottom + 2 : null,
    rapidResultHit: hit,
  };
})()`;

const ACTIVE_HEADERS = `Array.from(document.querySelectorAll('.collapsible-header.active')).map((h) => h.textContent.trim().slice(0, 40))`;
const MDHAQ_HEIGHTS = `Array.from(document.querySelectorAll('#rapid3Section .mdhaq-item')).map((e) => Math.round(e.getBoundingClientRect().height))`;

async function settle(page, ms) { await page.waitForTimeout(ms); }

// Polls until the open Indices container measures exactly (stale === 0) or
// the deadline expires. Returns the last reading plus time-to-exact.
async function waitForExact(page, timeoutMs) {
  const start = Date.now();
  let s = await page.evaluate(READ_INDICES);
  while (Math.abs(s.stale) > 0 && Date.now() - start < timeoutMs) {
    await page.waitForTimeout(250);
    s = await page.evaluate(READ_INDICES);
  }
  s.elapsedMs = Date.now() - start;
  return s;
}

async function visitJourney(pagePath, pathology, tag) {
  console.log(`\n=== ${tag} (${pagePath} ${pathology.toUpperCase()}) ===`);
  const ctx = await gate();
  const page = await ctx.newPage();
  const errs = []; const perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));
  try {
    await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);
    await page.selectOption('#diagnosticoPrimario', pathology);
    await settle(page, 600);

    // 1. Open outer Indices.
    await clickHeader(page, 'Índices de Actividad');
    let s = await waitForExact(page, 2000);
    check(`${tag} Indices opens healthy`, s.found && s.active && s.stale === 0, JSON.stringify(s));

    // 2. Grow: open nested HAQ-DI (the #545 trigger). The nested 0.4s CSS
    // transition can cascade into a parent re-measure, so wait for the
    // container to settle exactly (deadline-bounded), then assert.
    await clickHeader(page, 'HAQ-DI');
    s = await waitForExact(page, 4000);
    check(`${tag} nested HAQ-DI growth: maxHeight settles exact`, s.active && s.stale === 0, JSON.stringify({ maxH: s.maxH, scrollH: s.scrollH, stale: s.stale, elapsedMs: s.elapsedMs }));
    check(`${tag} RAPID3 block not clipped`, s.rapidClipped === false, JSON.stringify({ rapidClipped: s.rapidClipped }));
    check(`${tag} RAPID3 result reachable`, s.rapidResultHit === true, JSON.stringify({ hit: s.rapidResultHit }));
    check(`${tag} no artificial inner scrollbar`, s.overflowY === 'hidden', s.overflowY);
    const mdhaq = await page.evaluate(MDHAQ_HEIGHTS);
    check(`${tag} MDHAQ rows laid out (not #541 collapse)`, mdhaq.length >= 10 && mdhaq.every((h) => h > 0), JSON.stringify(mdhaq.slice(0, 4)));

    // 3. Shrink: close nested HAQ-DI, parent must track down exactly.
    await clickHeader(page, 'HAQ-DI');
    s = await waitForExact(page, 4000);
    check(`${tag} nested close: parent tracks shrink`, s.active && s.stale === 0, JSON.stringify({ maxH: s.maxH, scrollH: s.scrollH, elapsedMs: s.elapsedMs }));

    // 4. No resize storm: maxHeight stable across idle samples.
    const samples = [];
    for (let i = 0; i < 3; i++) { await settle(page, 400); samples.push((await page.evaluate(READ_INDICES)).maxH); }
    check(`${tag} maxHeight stable when idle (no storm)`, samples[0] === samples[1] && samples[1] === samples[2], JSON.stringify(samples));

    // 5. Close outer; reopen: stable, and untouched sections never auto-opened.
    await clickHeader(page, 'Índices de Actividad');
    await settle(page, 700);
    s = await page.evaluate(READ_INDICES);
    check(`${tag} Indices closes`, !s.active && s.maxH === 0, JSON.stringify({ active: s.active, maxH: s.maxH }));
    await clickHeader(page, 'Índices de Actividad');
    s = await waitForExact(page, 2000);
    check(`${tag} Indices reopens healthy`, s.active && s.stale === 0, JSON.stringify({ maxH: s.maxH, scrollH: s.scrollH }));
    const active = await page.evaluate(ACTIVE_HEADERS);
    const autoOpened = active.filter((t) => !t.includes('Índices de Actividad'));
    check(`${tag} no auto-open of untouched sections`, autoOpened.length === 0, JSON.stringify(active));

    await page.screenshot({ path: path.join(evidenceDir, `fixed_${tag}.png`) });
    check(`${tag} console.error=0 pageerror=0`, errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

check('static: no setInterval polling in shared seam', staticFindings.length === 0, staticFindings.join('; '));

await visitJourney('primera_visita.html', 'aps', 'PV_APS');
await visitJourney('primera_visita.html', 'ar', 'PV_AR');
await visitJourney('seguimiento.html', 'aps', 'SEGUIMIENTO_APS');
await visitJourney('seguimiento.html', 'ar', 'SEGUIMIENTO_AR');

// --- Estadísticas: custom controller must open/close normally ---------------
console.log('\n=== ESTADISTICAS ===');
{
  // Same-tab journey: gate on index.html, then estadisticas.html in the SAME
  // tab so the session corpus persists (supported happy path per
  // reuma_estadisticas_read_browser_check.mjs). A fresh tab would have empty
  // sessionStorage and the page correctly reports console.error 'No hay datos'.
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; const perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));
  try {
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
    await page.goto(`${baseUrl}/estadisticas.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);
    const state0 = await page.evaluate(() => {
      const h = document.getElementById('filtersHeader');
      const c = document.querySelector('.filters-panel .collapsible-content');
      return { active: h.classList.contains('active'), h: Math.round(c.getBoundingClientRect().height) };
    });
    await page.locator('#filtersHeader').first().scrollIntoViewIfNeeded();
    await page.locator('#filtersHeader').first().click({ timeout: 8000 });
    await settle(page, 900);
    const state1 = await page.evaluate(() => {
      const h = document.getElementById('filtersHeader');
      const c = document.querySelector('.filters-panel .collapsible-content');
      return { active: h.classList.contains('active'), h: Math.round(c.getBoundingClientRect().height) };
    });
    check('ESTADISTICAS opens normally', state1.active && state1.h > 50, JSON.stringify({ state0, state1 }));
    await page.locator('#filtersHeader').first().click({ timeout: 8000 });
    await settle(page, 900);
    const state2 = await page.evaluate(() => {
      const h = document.getElementById('filtersHeader');
      const c = document.querySelector('.filters-panel .collapsible-content');
      return { active: h.classList.contains('active'), h: Math.round(c.getBoundingClientRect().height) };
    });
    check('ESTADISTICAS closes normally', !state2.active && state2.h < 50, JSON.stringify(state2));
    await page.screenshot({ path: path.join(evidenceDir, 'fixed_ESTADISTICAS.png') });
    check('ESTADISTICAS console.error=0 pageerror=0', errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
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
console.log(failed === 0 ? 'reuma_collapsible_dynamic_height_browser_check PASS' : 'reuma_collapsible_dynamic_height_browser_check FAILED');
if (failed > 0) process.exit(1);
