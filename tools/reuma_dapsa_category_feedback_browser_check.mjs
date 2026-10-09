#!/usr/bin/env node
'use strict';
/**
 * Focused falsification checker for TRAIN-NEXUS-REUMA-UX-CLOSEOUT-17 T3 /
 * GitHub issue #612 (Atenea C-087, volume):
 *
 *   "Reforzar el feedback textual y visual accesible de la categoría DAPSA en
 *    Primera Visita y Seguimiento APs, preservando el valor numérico
 *    derivado/read-only, umbrales, fuente PCR/unidades, categoría y export
 *    legacy. No confundir color con una decisión terapéutica. Mostrar también
 *    estados Incompleto/desconocido de forma neutral."
 *
 * What this checker falsifies (supported interaction only: real session gate,
 * real pathology select, real collapsible headers, real homunculus NAD/NAT
 * clicks and real input fill; page.evaluate is used to READ observables and the
 * product's own collection API — never to fake state, mutate readonly or tamper
 * the DOM). Synthetic data only.
 *
 *   S1 static: on both pages the DAPSA category element is a live region
 *      (role=status + aria-live=polite), keeps the shared .indice-categoria
 *      class plus the DAPSA-scoped .dapsa-categoria hook, and is preceded by an
 *      explicit "Categoría:" label. The readonly numeric field is preserved.
 *   S2 static: the presentation vocabulary is DAPSA-scoped in both Reuma
 *      stylesheets and does not edit the shared .indice-categoria base rule.
 *   1  APs initial/incomplete: no inference, category reads "Incompleto", no
 *      fabricated category text; the numeric field is empty and still readonly.
 *   2  real sources -> total + category update: remission / baja / moderada /
 *      alta witnesses, with the total independently recomputed here.
 *   3  category is legible as TEXT next to the total (non-empty, expected
 *      label), and colour no longer encodes a category: the computed colour is
 *      identical for remission/low/moderate/high and is not the good/bad palette.
 *   4  a non-colour cue distinguishes the non-evaluable state: the pill uses a
 *      dashed outline when incomplete and a solid one when computed.
 *   5  export/score parity: the product's own collection API returns the exact
 *      on-screen total and the exact on-screen category text (byte-identical),
 *      for every witness.
 *   6  missing source value returns to the neutral "Incompleto" (never a
 *      manufactured category).
 *   7  other indices are unaffected: the DAPSA-scoped class/attributes do not
 *      leak onto BASDAI/ASDAS/CDAI/HAQ category elements.
 *   8  pathology switch: the DAPSA section is APs-only (hidden on EspA/AR,
 *      visible again on APs) and the neutral treatment survives.
 *   9  console.error === 0 and pageerror === 0 over the whole journey.
 *   10 G4-2 regression: #dapsaResult.indice-resultado (the DAPSA numeric total)
 *      has a neutral, non-green background/border and legible text at initial
 *      missing/incomplete AND at every computed category, in BOTH PV and
 *      Seguimiento; other .indice-resultado fields keep the shared style (the
 *      DAPSA override did not leak). Nonvacuity: reverting the neutral DAPSA CSS
 *      makes these computed-style assertions fail.
 *
 * Not part of `verify:nexus` (browser dependency).
 * Usage: node tools/reuma_dapsa_category_feedback_browser_check.mjs
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

const PAGES = [
  { file: 'primera_visita.html', collectFn: 'recopilarDatosFormulario', label: 'PV' },
  { file: 'seguimiento.html', collectFn: 'recopilarDatosFormularioSeguimiento', label: 'SEG' }
];

// ---------------------------------------------------------------------------
// S1/S2 — static inspection (no browser): authored accessible contract + scope.
// ---------------------------------------------------------------------------
const staticFindings = [];
function openingTag(html, id) {
  const m = html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`, 'i'));
  return m ? m[0] : null;
}
function classTokens(html, id) {
  const tag = openingTag(html, id);
  if (!tag) return null;
  const m = tag.match(/\bclass="([^"]*)"/i);
  return m ? m[1].split(/\s+/).filter(Boolean) : [];
}
for (const { file, collectFn } of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const catTag = openingTag(html, 'dapsaCategoria');
  if (!catTag) { staticFindings.push(`${file}: #dapsaCategoria not found`); continue; }
  if (!/\brole="status"/.test(catTag)) staticFindings.push(`${file}: #dapsaCategoria missing role="status"`);
  if (!/\baria-live="polite"/.test(catTag)) staticFindings.push(`${file}: #dapsaCategoria missing aria-live="polite"`);
  const tokens = classTokens(html, 'dapsaCategoria') || [];
  if (!tokens.includes('indice-categoria')) staticFindings.push(`${file}: #dapsaCategoria lost shared .indice-categoria`);
  if (!tokens.includes('dapsa-categoria')) staticFindings.push(`${file}: #dapsaCategoria missing DAPSA-scoped hook`);
  const resultTag = openingTag(html, 'dapsaResult');
  if (!resultTag || !/\breadonly\b/.test(resultTag)) staticFindings.push(`${file}: #dapsaResult lost readonly`);
  if (!/class="dapsa-categoria-prefix">\s*Categoría:\s*</.test(html)) staticFindings.push(`${file}: explicit "Categoría:" label missing`);
  void collectFn;
}
for (const cssFile of ['style_primera_visita.css', 'style_seguimiento.css']) {
  const css = fs.readFileSync(path.join(ROOT, cssFile), 'utf8');
  for (const marker of ['.dapsa-categoria-feedback', '#dapsaCategoria.dapsa-categoria',
    '#dapsaCategoria.dapsa-categoria[data-dapsa-estado="incompleto"]', 'border-style: dashed']) {
    if (!css.includes(marker)) staticFindings.push(`${cssFile}: missing ${marker}`);
  }
  // The shared base rule must not have been repurposed for DAPSA.
  const baseRule = css.match(/\.indice-categoria\s*\{[^}]*\}/);
  if (baseRule && /data-dapsa-estado|dapsa-categoria/.test(baseRule[0])) {
    staticFindings.push(`${cssFile}: base .indice-categoria rule contaminated with DAPSA hooks`);
  }
}

// ---------------------------------------------------------------------------
// Playwright bootstrap (same documented resolution as other browser checkers).
// ---------------------------------------------------------------------------
function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json'))) {
      return createRequire(path.join(nm, '__loader_dapsa.cjs'))('playwright');
    }
    return null;
  };
  for (const b of String(process.env.PATH || '').split(path.delimiter)) {
    if (!b) continue;
    const prefix = path.resolve(b, '..');
    for (const nm of [prefix, path.join(prefix, 'lib', 'node_modules')]) {
      const l = tryNM(nm); if (l) return l;
    }
  }
  const npx = path.join(process.env.HOME || '', '.npm', '_npx');
  if (fs.existsSync(npx)) {
    for (const e of fs.readdirSync(npx).sort().reverse()) {
      const l = tryNM(path.join(npx, e, 'node_modules')); if (l) return l;
    }
  }
  const l = tryNM(path.join(ROOT, 'node_modules')); if (l) return l;
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-dapsa-feedback-'));
const workbookPath = path.join(tempDir, 'synthetic.xlsx');
{
  const wb = XLSX.utils.book_new();
  for (const s of ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN']) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ ID_Paciente: 'SYN-000-000' }]), s);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' }
  ]), 'Profesionales');
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

async function gatedContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
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

async function openAncestorCollapsibles(page, selector) {
  const isHitTestable = () => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!top && (top === el || el.contains(top));
  }, selector);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await isHitTestable()) return true;
    const headers = page.locator(selector).first().locator(
      'xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]'
    );
    const count = await headers.count();
    if (!count) return isHitTestable();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const header = headers.nth(i);
      const isActive = await header.evaluate((el) => el.classList.contains('active'));
      if (!isActive) { await header.click(); clicked = true; await page.waitForTimeout(650); }
    }
    if (!clicked) return isHitTestable();
  }
  return isHitTestable();
}

const EXPECTED = {
  remission: { nad: 1, nat: 1, evaDolor: 0, evaGlobal: 0, pcr: 0, total: '2.0', label: 'Remisión' },
  low: { nad: 1, nat: 1, evaDolor: 4, evaGlobal: 3, pcr: 1, total: '10.0', label: 'Baja Actividad' },
  moderate: { nad: 1, nat: 1, evaDolor: 5, evaGlobal: 5, pcr: 8, total: '20.0', label: 'Actividad Moderada' },
  high: { nad: 1, nat: 1, evaDolor: 10, evaGlobal: 10, pcr: 20, total: '42.0', label: 'Actividad Alta' }
};
const GOOD_BAD_COLORS = ['rgb(40, 167, 69)', 'rgb(220, 53, 69)', 'rgb(255, 193, 7)'];

function parseRgb(str) {
  const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(str || '');
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
}
// Green/success when green clearly dominates red and is at least as strong as
// blue (catches the shared .indice-resultado #d4edda/#28a745 palette).
function isGreenish(str) {
  const c = parseRgb(str);
  return !!c && c.g > c.r + 20 && c.g >= c.b;
}
function relLum(str) {
  const c = parseRgb(str);
  if (!c) return null;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrastRatio(a, b) {
  const la = relLum(a), lb = relLum(b);
  if (la == null || lb == null) return null;
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
// A numeric-result surface is neutral when neither its background nor its border
// is a green/success colour of the shared palette.
function isNeutralSurface(bg, border) {
  const greens = ['rgb(40, 167, 69)', 'rgb(212, 237, 218)'];
  return !isGreenish(bg) && !isGreenish(border) && !greens.includes(bg) && !greens.includes(border);
}

const READ_FEEDBACK = () => {
  const cat = document.getElementById('dapsaCategoria');
  const res = document.getElementById('dapsaResult');
  const cs = cat ? getComputedStyle(cat) : null;
  const rcs = res ? getComputedStyle(res) : null;
  const prefix = document.querySelector('.dapsa-categoria-feedback .dapsa-categoria-prefix');
  return {
    resultValue: res ? res.value : null,
    resultReadonly: res ? res.readOnly : null,
    resultBg: rcs ? rcs.backgroundColor : null,
    resultBorderColor: rcs ? rcs.borderTopColor : null,
    resultColor: rcs ? rcs.color : null,
    catText: cat ? cat.textContent : null,
    catEstado: cat ? cat.dataset.dapsaEstado : null,
    catRole: cat ? cat.getAttribute('role') : null,
    catLive: cat ? cat.getAttribute('aria-live') : null,
    catColor: cs ? cs.color : null,
    catBorderStyle: cs ? cs.borderTopStyle : null,
    catBorderWidth: cs ? cs.borderTopWidth : null,
    prefixText: prefix ? prefix.textContent.trim() : null,
    sectionDisplay: (() => { const s = document.getElementById('dapsaSection'); return s ? getComputedStyle(s).display : null; })()
  };
};

function independentTotal(w) {
  return (w.nad + w.nat + w.evaDolor + w.evaGlobal + w.pcr).toFixed(1);
}

async function journey(browser, { file, collectFn, label }) {
  console.log(`\n=== ${label} (${file}) — DAPSA category feedback (APs) ===`);
  const ctx = await gatedContext(browser);
  const page = await ctx.newPage();
  const errs = []; const perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));
  try {
    await page.goto(`${baseUrl}/${file}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(900);
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(400);
    for (const sel of ['#pcrValue', '#dapsaResult', '.homunculus-svg-wrapper']) {
      const visible = await openAncestorCollapsibles(page, sel);
      if (!visible) throw new Error(`no fue posible hacer visible ${sel} mediante interacción soportada`);
    }
    await page.selectOption('#pcrUnit', 'mg/dL');

    // 1. initial / incomplete: neutral, no inference.
    const initial = await page.evaluate(READ_FEEDBACK);
    check(`${label} initial: no fabricated category, reads "Incompleto"`,
      initial.catText === 'Incompleto' && initial.catEstado === 'incompleto' && initial.resultValue === '',
      JSON.stringify(initial));
    check(`${label} initial: numeric field empty and readonly`,
      initial.resultValue === '' && initial.resultReadonly === true, JSON.stringify(initial));
    check(`${label} initial: DAPSA numeric field neutral (no green surface/border)`,
      isNeutralSurface(initial.resultBg, initial.resultBorderColor),
      JSON.stringify({ bg: initial.resultBg, border: initial.resultBorderColor }));
    check(`${label} initial: DAPSA numeric field text legible`,
      contrastRatio(initial.resultColor, initial.resultBg) >= 4.5,
      JSON.stringify({ color: initial.resultColor, bg: initial.resultBg, contrast: contrastRatio(initial.resultColor, initial.resultBg) }));
    check(`${label} live region + explicit label present`,
      initial.catRole === 'status' && initial.catLive === 'polite' && initial.prefixText === 'Categoría:',
      JSON.stringify({ role: initial.catRole, live: initial.catLive, prefix: initial.prefixText }));
    const initialDashed = initial.catBorderStyle === 'dashed';
    check(`${label} initial: non-colour cue (dashed) for the non-evaluable state`,
      initialDashed && parseFloat(initial.catBorderWidth) > 0, JSON.stringify({ style: initial.catBorderStyle, width: initial.catBorderWidth }));

    // Real homunculus clicks: 1 tender (NAD) + 1 swollen (NAT).
    await page.locator('.homunculus-mode-btn[data-mode="nad"]').click();
    await page.locator('[data-region-id="hombro-derecho"]').first().click();
    await page.locator('.homunculus-mode-btn[data-mode="nat"]').click();
    await page.locator('[data-region-id="hombro-izquierdo"]').first().click();
    await page.waitForTimeout(120);

    // Waits past the .indice-categoria colour transition (0.3s) so the read
    // observables reflect the settled computed style, not a mid-transition hue.
    const fill = async (sel, value) => { await page.locator(sel).first().fill(value); await page.waitForTimeout(450); };

    // 2/3/4/5. Each witness: supported input -> total + category + parity.
    const computedColors = [];
    for (const [estado, w] of Object.entries(EXPECTED)) {
      await fill('#evaDolor', String(w.evaDolor));
      await fill('#evaGlobal', String(w.evaGlobal));
      await fill('#pcrValue', String(w.pcr));
      const snap = await page.evaluate(READ_FEEDBACK);
      const total = independentTotal(w);
      check(`${label} ${estado}: total ${total} (independent recomputation)`,
        snap.resultValue === total, JSON.stringify({ got: snap.resultValue, want: total }));
      check(`${label} ${estado}: category reads "${w.label}" as text`,
        snap.catText === w.label && snap.catEstado === estado, JSON.stringify({ text: snap.catText, estado: snap.catEstado }));
      check(`${label} ${estado}: numeric field readonly preserved`, snap.resultReadonly === true, String(snap.resultReadonly));
      check(`${label} ${estado}: DAPSA numeric field neutral (no green surface/border)`,
        isNeutralSurface(snap.resultBg, snap.resultBorderColor),
        JSON.stringify({ bg: snap.resultBg, border: snap.resultBorderColor }));
      check(`${label} ${estado}: DAPSA numeric field text legible`,
        contrastRatio(snap.resultColor, snap.resultBg) >= 4.5,
        JSON.stringify({ color: snap.resultColor, bg: snap.resultBg, contrast: contrastRatio(snap.resultColor, snap.resultBg) }));
      check(`${label} ${estado}: non-colour cue (solid outline)`,
        snap.catBorderStyle === 'solid' && parseFloat(snap.catBorderWidth) > 0, JSON.stringify({ style: snap.catBorderStyle, width: snap.catBorderWidth }));
      // export/score parity via the product's own collection API.
      const collected = await page.evaluate((fn) => {
        const datos = HubTools.form[fn]();
        return { dapsaResult: datos.dapsaResult, dapsaCategoria: datos.dapsaCategoria };
      }, collectFn);
      check(`${label} ${estado}: export parity (total + category byte-identical to screen)`,
        collected.dapsaResult === snap.resultValue && collected.dapsaCategoria === snap.catText,
        JSON.stringify({ collected, screen: { r: snap.resultValue, c: snap.catText } }));
      computedColors.push(snap.catColor);
    }

    // 3. colour no longer differentiates categories; not the good/bad palette.
    const uniform = computedColors.every((c) => c === computedColors[0]);
    check(`${label} colour is neutral/uniform across categories (no good/bad encoding)`,
      uniform && !GOOD_BAD_COLORS.includes(computedColors[0]),
      JSON.stringify(computedColors));

    // 6. missing source value -> neutral Incompleto again, no fabricated category.
    await fill('#evaDolor', '');
    const missing = await page.evaluate(READ_FEEDBACK);
    check(`${label} missing source -> neutral "Incompleto" (never a manufactured category)`,
      missing.resultValue === '' && missing.catText === 'Incompleto' && missing.catEstado === 'incompleto' && missing.catBorderStyle === 'dashed',
      JSON.stringify(missing));
    const missingExport = await page.evaluate((fn) => {
      const datos = HubTools.form[fn]();
      return { dapsaResult: datos.dapsaResult, dapsaCategoria: datos.dapsaCategoria };
    }, collectFn);
    check(`${label} missing source -> export parity (empty total, "Incompleto")`,
      missingExport.dapsaResult === '' && missingExport.dapsaCategoria === 'Incompleto', JSON.stringify(missingExport));
    check(`${label} missing source -> DAPSA numeric field neutral (no green)`,
      isNeutralSurface(missing.resultBg, missing.resultBorderColor),
      JSON.stringify({ bg: missing.resultBg, border: missing.resultBorderColor }));

    // 7. other indices do not receive the DAPSA-scoped class/attributes.
    const others = await page.evaluate(() => {
      const ids = ['basdaiCategoria', 'asdasCrpCategoria', 'asdasEsrCategoria', 'cdaiCategoria', 'sdaiCategoria', 'haqCategoria'];
      return ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, missing: true };
        return {
          id,
          hasDapsaClass: el.classList.contains('dapsa-categoria'),
          role: el.getAttribute('role'),
          live: el.getAttribute('aria-live'),
          estado: el.dataset.dapsaEstado || null
        };
      });
    });
    const leaks = others.filter((o) => o.missing || o.hasDapsaClass || o.role || o.live || o.estado);
    check(`${label} other indices untouched by the DAPSA-scoped feedback`,
      leaks.length === 0, JSON.stringify(leaks.length ? leaks : others));

    // 7b. G4-2 scope guard: the neutral override is scoped to #dapsaResult; every
    //     other numeric .indice-resultado field keeps the shared green style.
    const otherResultStyles = await page.evaluate(() => {
      const ids = ['basdaiResult', 'asdasCrpResult', 'asdasEsrResult', 'das28CrpResult', 'das28EsrResult', 'cdaiResult', 'sdaiResult'];
      return ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, missing: true };
        const cs = getComputedStyle(el);
        return { id, bg: cs.backgroundColor, border: cs.borderTopColor };
      });
    });
    const styleLeaks = otherResultStyles.filter((o) => o.missing || o.bg !== 'rgb(212, 237, 218)' || o.border !== 'rgb(40, 167, 69)');
    check(`${label} other .indice-resultado fields keep the shared style (DAPSA override scoped)`,
      styleLeaks.length === 0, JSON.stringify(styleLeaks.length ? styleLeaks : otherResultStyles));

    // 8. pathology switch: DAPSA remains APs-only; neutral treatment survives.
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(300);
    const espa = await page.evaluate(READ_FEEDBACK);
    await page.selectOption('#diagnosticoPrimario', 'ar');
    await page.waitForTimeout(300);
    const ar = await page.evaluate(READ_FEEDBACK);
    await page.selectOption('#diagnosticoPrimario', 'aps');
    await page.waitForTimeout(300);
    const back = await page.evaluate(READ_FEEDBACK);
    check(`${label} DAPSA section is APs-only (hidden on EspA/AR, visible on APs)`,
      espa.sectionDisplay === 'none' && ar.sectionDisplay === 'none' && back.sectionDisplay !== 'none',
      JSON.stringify({ espa: espa.sectionDisplay, ar: ar.sectionDisplay, back: back.sectionDisplay }));
    check(`${label} neutral treatment survives the pathology switch`,
      back.catRole === 'status' && back.catLive === 'polite'
        && back.catEstado === 'incompleto' && back.catBorderStyle === 'dashed'
        && back.catColor === missing.catColor,
      JSON.stringify(back));

    check(`${label} console.error=0 pageerror=0`, errs.length === 0 && perrs.length === 0,
      JSON.stringify([...errs, ...perrs].slice(0, 5)));
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
check('S1/S2 static: accessible contract + DAPSA-scoped presentation, shared base intact',
  staticFindings.length === 0, staticFindings.join('; '));

for (const p of PAGES) await journey(browser, p);

await browser.close();
server.close();
fs.rmSync(tempDir, { recursive: true, force: true });

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? 'reuma_dapsa_category_feedback_browser_check PASS' : 'reuma_dapsa_category_feedback_browser_check FAILED');
if (failed > 0) process.exit(1);
