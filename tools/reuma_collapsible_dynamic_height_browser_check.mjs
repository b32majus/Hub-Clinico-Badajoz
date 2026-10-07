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
// withGeometry=true additionally measures rendered clipping and reachability;
// those assertions are made on rendered geometry AFTER the transition settles.
const READ_INDICES_FN = (withGeometry) => {
  const headers = Array.from(document.querySelectorAll('.collapsible-header'));
  const h = headers.find((x) => x.textContent.includes('Índices de Actividad'));
  if (!h) return { found: false };
  const c = h.nextElementSibling;
  const maxH = parseInt(c.style.maxHeight) || 0;
  const rapid = document.getElementById('rapid3Section');
  const contentBox = c.getBoundingClientRect();
  const out = {
    found: true,
    active: h.classList.contains('active'),
    maxH, scrollH: c.scrollHeight,
    stale: c.scrollHeight - maxH,
    overflowY: getComputedStyle(c).overflowY,
    renderedH: Math.round(contentBox.height),
    rapidDisplay: rapid ? getComputedStyle(rapid).display : 'n/a',
  };
  if (withGeometry) {
    const rapidBox = rapid ? rapid.getBoundingClientRect() : null;
    out.rapidClipped = rapidBox ? rapidBox.bottom > contentBox.bottom + 2 : null;
    const target = document.getElementById('rapid3Total');
    let hit = null;
    if (target) {
      target.scrollIntoView({ block: 'center' });
      const r = target.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      hit = !!el && (el === target || target.contains(el));
    }
    out.rapidResultHit = hit;
  }
  return out;
};

const ACTIVE_HEADERS = `Array.from(document.querySelectorAll('.collapsible-header.active')).map((h) => h.textContent.trim().slice(0, 40))`;
const MDHAQ_HEIGHTS = `Array.from(document.querySelectorAll('#rapid3Section .mdhaq-item')).map((e) => Math.round(e.getBoundingClientRect().height))`;

async function settle(page, ms) { await page.waitForTimeout(ms); }

// --- Independent storm observable (finding F2) ------------------------------
// The sizing signature (maxH/scrollH/renderedH) proves "the dimensions stop
// moving"; it CANNOT falsify a page that keeps re-writing style / invalidating
// layout while those measured dimensions happen to stay constant (e.g. writing
// a layout-affecting property between two values that parse and render the
// same). This second, independent observable installs a MutationObserver over
// the collapsible-content subtrees and counts post-settle style/class attribute
// writes and childList churn, so such a storm fails even with constant
// dimensions. (A truly identical style write does not mutate the attribute and
// does not invalidate layout, so it is correctly not counted.)
//
// Mutations whose target lives inside a pre-existing .custom-select widget are
// bucketed separately: modules/customSelect.js (DO NOT TOUCH) runs a 300ms
// setInterval that unconditionally rewrites custom-select labels, so that churn
// is pre-existing and unrelated to the #545 seam. The seam-attributable bucket
// must be exactly 0 after settle; the pre-existing bucket is reported as
// evidence, not asserted.
const INSTALL_STORM_PROBE_FN = () => {
  const contents = Array.from(document.querySelectorAll('.collapsible-content'));
  const counts = { style: 0, class: 0, childList: 0, total: 0 };
  const preExisting = { style: 0, class: 0, childList: 0, total: 0 };
  const samples = [];
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      let kind = null;
      if (m.type === 'attributes') {
        if (m.attributeName === 'style') kind = 'style';
        else if (m.attributeName === 'class') kind = 'class';
      } else if (m.type === 'childList') {
        kind = 'childList';
      }
      if (!kind) continue;
      const el = m.target && m.target.nodeType === 1 ? m.target : (m.target && m.target.parentElement);
      const inCustom = !!(el && el.closest && el.closest('.custom-select'));
      const bucket = inCustom ? preExisting : counts;
      bucket[kind] += 1;
      bucket.total += 1;
      if (samples.length < 12) samples.push(`${kind}@${(m.target && m.target.className) || (m.target && m.target.nodeName) || '?'}${inCustom ? '#pre-existing-custom-select' : ''}`);
    }
  });
  for (const c of contents) {
    obs.observe(c, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });
  }
  window.__stormProbe = { obs, counts, preExisting, samples, observed: contents.length };
  return { observed: contents.length };
};

const READ_STORM_PROBE_FN = () => {
  const p = window.__stormProbe;
  if (!p) return { installed: false, counts: null, preExisting: null, samples: [] };
  return { installed: true, observed: p.observed, counts: { ...p.counts }, preExisting: { ...p.preExisting }, samples: p.samples.slice() };
};

const STOP_STORM_PROBE_FN = () => {
  const p = window.__stormProbe;
  if (p && p.obs) p.obs.disconnect();
  window.__stormProbe = null;
  return true;
};

// --- Independent idle-coupling observable (finding F3) ----------------------
// The #545 seam's MutationObserver is registered on document.body. The
// pre-existing modules/customSelect.js setInterval(300) rewrites
// .custom-select labels/classes on every tick; those mutations live INSIDE
// .collapsible-content, so a naive body observer is re-armed ~3x/second and
// calls syncOpenCollapsibleHeights indefinitely while the page is idle (each
// call performs a forced-layout scrollHeight read per open section). Counting
// sizing signatures cannot see this because the dimensions happen to stay
// constant; the only direct observable is the seam's own invocation count.
//
// Instrument the global seam functions from the page (classic-script function
// declarations resolve through the global object, so the production observer /
// transitionend callbacks hit these wrappers) and count invocations across a
// bounded pure-idle window. A correct decoupling must yield 0; the pre-F3
// candidate yields ~10 in 3s. Instrumentation failure fails explicitly.
const INSTALL_SEAM_PROBE_FN = () => {
  const probe = { sync: 0, schedule: 0, installed: false };
  const wrap = (name, key) => {
    const orig = window[name];
    if (typeof orig !== 'function') return false;
    window[name] = function () { probe[key] += 1; return orig.apply(this, arguments); };
    return true;
  };
  const a = wrap('syncOpenCollapsibleHeights', 'sync');
  const b = wrap('scheduleOpenCollapsibleSync', 'schedule');
  probe.installed = a && b;
  window.__seamProbe = probe;
  return { installed: probe.installed };
};

const RESET_SEAM_PROBE_FN = () => {
  const p = window.__seamProbe;
  if (!p) return false;
  p.sync = 0;
  p.schedule = 0;
  return true;
};

const READ_SEAM_PROBE_FN = () => {
  const p = window.__seamProbe;
  if (!p) return { installed: false, sync: null, schedule: null };
  return { installed: p.installed, sync: p.sync, schedule: p.schedule };
};

const IDLE_COUPLING_MS = 3000;

// The production sync writes the inline maxHeight target immediately, while
// the .collapsible-content CSS transition animates the rendered box for up to
// 0.4s and delayed/transitionend re-measures can rewrite the target again
// (MutationObserver debounce 250ms). Reading only `stale === 0` at the instant
// the inline target first matches scrollHeight therefore adopted a transient
// intermediate as the assertion state. Instead, require the inline target,
// scrollHeight AND rendered box height to be unchanged across a quiet window
// that exceeds both the debounce and the transition: that is the settled state.
const QUIET_MS = 500;
const POLL_MS = 80;

async function waitForSettled(page, timeoutMs = 9000) {
  const start = Date.now();
  let prev = await page.evaluate(READ_INDICES_FN, false);
  let last = prev;
  let stableSince = null;
  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(POLL_MS);
    const s = await page.evaluate(READ_INDICES_FN, false);
    last = s;
    const stable = s.found && s.maxH === prev.maxH && s.scrollH === prev.scrollH && s.renderedH === prev.renderedH;
    if (stable && s.stale === 0) {
      if (stableSince === null) stableSince = Date.now();
      if (Date.now() - stableSince >= QUIET_MS) { s.settled = true; s.elapsedMs = Date.now() - start; return s; }
    } else {
      stableSince = null;
    }
    prev = s;
  }
  last.settled = false;
  last.elapsedMs = Date.now() - start;
  return last;
}

// Bounded wait for the outer section to end closed (inline maxHeight 0) with a
// stable rendered box (border-top leaves ~1px). Same fail-explicitly contract.
async function waitForClosed(page, timeoutMs = 6000) {
  const start = Date.now();
  let prev = null;
  let last = null;
  let stableSince = null;
  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(POLL_MS);
    const s = await page.evaluate(READ_INDICES_FN, false);
    last = s;
    const closed = s.found && !s.active && s.maxH === 0 && s.renderedH <= 2;
    const same = prev !== null && s.active === prev.active && s.maxH === prev.maxH && s.renderedH === prev.renderedH;
    if (closed && same) {
      if (stableSince === null) stableSince = Date.now();
      if (Date.now() - stableSince >= 300) { s.settled = true; s.elapsedMs = Date.now() - start; return s; }
    } else {
      stableSince = null;
    }
    prev = s;
  }
  last.settled = false;
  last.elapsedMs = Date.now() - start;
  return last;
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

    // 1. Open outer Indices and wait for the rendered state to settle.
    await clickHeader(page, 'Índices de Actividad');
    let s = await waitForSettled(page, 9000);
    check(`${tag} Indices opens healthy`, s.found && s.active && s.settled === true && s.stale === 0, JSON.stringify({ active: s.active, settled: s.settled, stale: s.stale, maxH: s.maxH, scrollH: s.scrollH, elapsedMs: s.elapsedMs }));

    // 2. Grow: open nested HAQ-DI (the #545 trigger). The nested 0.4s CSS
    // transition cascades into a parent re-measure, so wait for the container
    // to SETTLE (bounded; fails explicitly on timeout), then assert the
    // rendered geometry rather than the transient inline target.
    await clickHeader(page, 'HAQ-DI');
    s = await waitForSettled(page, 12000);
    check(`${tag} nested HAQ-DI growth: maxHeight settles exact`, s.active && s.settled === true && s.stale === 0, JSON.stringify({ maxH: s.maxH, scrollH: s.scrollH, stale: s.stale, settled: s.settled, elapsedMs: s.elapsedMs }));
    const geo = await page.evaluate(READ_INDICES_FN, true);
    check(`${tag} RAPID3 block not clipped`, geo.rapidClipped === false, JSON.stringify({ rapidClipped: geo.rapidClipped, renderedH: geo.renderedH, maxH: geo.maxH }));
    check(`${tag} RAPID3 result reachable`, geo.rapidResultHit === true, JSON.stringify({ hit: geo.rapidResultHit }));
    check(`${tag} no artificial inner scrollbar`, geo.overflowY === 'hidden', geo.overflowY);
    const mdhaq = await page.evaluate(MDHAQ_HEIGHTS);
    check(`${tag} MDHAQ rows laid out (not #541 collapse)`, mdhaq.length >= 10 && mdhaq.every((h) => h > 0), JSON.stringify(mdhaq.slice(0, 4)));

    // 2b. Idle decoupling (finding F3). At this point TWO sections are open
    // (outer Índices + nested HAQ-DI). Install the seam-invocation probe, drain
    // any in-flight debounce, then hold a bounded pure-idle window with zero
    // user interaction. The seam must NOT be re-armed by pre-existing
    // .custom-select polling churn: 0 syncOpenCollapsibleHeights and 0
    // scheduleOpenCollapsibleSync invocations. Fails explicitly if the probe
    // cannot instrument the seam or if any invocation occurs.
    const seamInstall = await page.evaluate(INSTALL_SEAM_PROBE_FN);
    await settle(page, 400); // drain any in-flight debounce before the window
    await page.evaluate(RESET_SEAM_PROBE_FN);
    await settle(page, IDLE_COUPLING_MS);
    const seamIdle = await page.evaluate(READ_SEAM_PROBE_FN);
    check(`${tag} idle: seam not re-armed by customSelect churn (0 invocations/3s)`, seamInstall.installed && seamIdle.installed && seamIdle.sync === 0 && seamIdle.schedule === 0, JSON.stringify({ installed: seamInstall.installed, ...seamIdle }));

    // 3. Shrink: close nested HAQ-DI, parent must track down and settle.
    await clickHeader(page, 'HAQ-DI');
    s = await waitForSettled(page, 12000);
    check(`${tag} nested close: parent tracks shrink`, s.active && s.settled === true && s.stale === 0, JSON.stringify({ maxH: s.maxH, scrollH: s.scrollH, settled: s.settled, elapsedMs: s.elapsedMs }));

    // 4a. No resize storm (sizing): after settle, the full sizing signature
    // must be unchanged across 5 idle samples (~1.5s). A genuine indefinite
    // reflow loop that keeps changing maxH/scrollH/renderedH fails this, and
    // would also have failed the settle deadline above.
    const samples = [];
    // 4b. No resize/reflow storm (independent observable): install a
    // MutationObserver over the collapsible-content surfaces BEFORE the idle
    // window and count post-settle style/class writes and childList churn
    // during it. This is NOT a restatement of the implementation: constant
    // dimensions are insufficient, so a same-value write/reflow storm passes
    // 4a but must fail here. Bounded (fixed idle window); read then disconnect.
    const stormInstall = await page.evaluate(INSTALL_STORM_PROBE_FN);
    for (let i = 0; i < 5; i++) {
      await settle(page, 300);
      const r = await page.evaluate(READ_INDICES_FN, false);
      samples.push(`${r.maxH}/${r.scrollH}/${r.renderedH}`);
    }
    const storm = await page.evaluate(READ_STORM_PROBE_FN);
    await page.evaluate(STOP_STORM_PROBE_FN);
    check(`${tag} maxHeight stable when idle (no storm)`, samples.every((x) => x === samples[0]), JSON.stringify(samples));
    check(`${tag} no post-settle style/layout writes (storm probe)`, storm.installed && stormInstall.observed > 0 && storm.counts.total === 0, JSON.stringify(storm));

    // 5. Close outer; reopen: stable, and untouched sections never auto-opened.
    await clickHeader(page, 'Índices de Actividad');
    s = await waitForClosed(page, 6000);
    check(`${tag} Indices closes`, s.settled === true && !s.active && s.maxH === 0, JSON.stringify({ active: s.active, maxH: s.maxH, renderedH: s.renderedH, settled: s.settled }));
    await clickHeader(page, 'Índices de Actividad');
    s = await waitForSettled(page, 9000);
    check(`${tag} Indices reopens healthy`, s.active && s.settled === true && s.stale === 0, JSON.stringify({ active: s.active, settled: s.settled, stale: s.stale, maxH: s.maxH, scrollH: s.scrollH }));
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
