#!/usr/bin/env node
'use strict';
/**
 * Focused falsification checker for TRAIN-NEXUS-REUMA-UX-CLOSEOUT-17 T1 /
 * GitHub issue #610 (Atenea C-087, volume):
 *
 *   "Eliminar el ancho excesivo de los campos fecha ya existentes, sin
 *    reemplazar controles ni cambiar valores/fechas, validación, read-only,
 *    formato, almacenamiento o exportación."
 *
 * Scope (authority-listed date inputs only):
 *   primera_visita.html  -> #fechaVisita #inicioSintomas #inicioPsoriasis #fechaProximaRevision
 *   seguimiento.html     -> #fechaVisita #fechaInicioTratamiento(readonly) #fechaProximaRevision
 *
 * The fix is presentational only (style_primera_visita.css, imported by
 * style_seguimiento.css): date inputs keep width:100% for narrow containers but
 * gain a contained max-width. This checker falsifies the observable contract:
 *
 *   S1 static: every in-scope input is still a native input[type=date] with its
 *      exact ID, the field count is unchanged (no added/removed dates), and
 *      #fechaInicioTratamiento keeps its readonly attribute.
 *   S2 static: the compact rule is date-scoped (a max-width on the existing
 *      date selectors) — not a global width seam.
 *   1  desktop: each in-scope date input renders compact and contained
 *      (w <= 240, w <= container) but still legible (w >= 120, h >= 28).
 *   2  mobile: each renders within the viewport and not clipped.
 *   3  no clipping: input right edge stays inside its container.
 *   4  readonly baseline: #fechaInicioTratamiento is read-only and a keyboard
 *      interaction cannot change its value.
 *   5  value round-trip: filling a supported synthetic date reads back
 *      identically, survives a desktop->mobile resize, and clears to blank.
 *   6  no global drift: sibling text/select fields in the same form keep their
 *      full width (the compaction only touched date inputs).
 *   7  console.error === 0 and pageerror === 0 on every journey.
 *
 * Supported interactions only (session gate, real selectOption, real fill,
 * real keyboard); reads observables via page.evaluate; never writes result
 * fields, never tampers the DOM, never mutates readonly state. Synthetic data
 * only. Not part of `verify:nexus` (browser dependency).
 *
 * Usage: node tools/reuma_compact_dates_browser_check.mjs
 */
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const PV_FILE = 'primera_visita.html';
const SEG_FILE = 'seguimiento.html';
const PV_DATES = ['fechaVisita', 'inicioSintomas', 'inicioPsoriasis', 'fechaProximaRevision'];
const SEG_DATES = ['fechaVisita', 'fechaInicioTratamiento', 'fechaProximaRevision'];
const READONLY_ID = 'fechaInicioTratamiento';
const COMPACT_MAX = 240; // contained ceiling (implementation target is 200)
const LEGIBLE_MIN = 120;
const DESKTOP = { width: 1366, height: 900 };
const MOBILE = { width: 390, height: 844 };
// Pre-existing mobile horizontal overflow comes from the shared hub-shell
// sidebar chrome (not the form). We assert the date change never exceeds the
// already-present ceiling instead of pretending the page is overflow-free.
const PREEXISTING_SCROLL_CEILING = { [PV_FILE]: 700, [SEG_FILE]: 500 };

const IDS_IN = (html) => Array.from(html.matchAll(/<input\b[^>]*\btype="date"[^>]*>/g)).map((m) => (m[0].match(/\bid="([^"]+)"/) || [])[1]).filter(Boolean);

const staticFindings = [];
const pvHtml = fs.readFileSync(path.join(ROOT, PV_FILE), 'utf8');
const segHtml = fs.readFileSync(path.join(ROOT, SEG_FILE), 'utf8');
const pvIds = IDS_IN(pvHtml);
const segIds = IDS_IN(segHtml);
const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
if (!sameSet(pvIds, PV_DATES)) staticFindings.push(`primera_visita.html date ids ${JSON.stringify(pvIds)} != ${JSON.stringify(PV_DATES)}`);
if (!sameSet(segIds, SEG_DATES)) staticFindings.push(`seguimiento.html date ids ${JSON.stringify(segIds)} != ${JSON.stringify(SEG_DATES)}`);
if (!/<input\b[^>]*\bid="fechaInicioTratamiento"[^>]*\breadonly\b/.test(segHtml)) staticFindings.push('seguimiento.html #fechaInicioTratamiento lost readonly');

// S2: the compact presentation must be a max-width on date selectors, not a
// global width seam. It lives in style_primera_visita.css (imported by
// style_seguimiento.css) and must not touch text/number/textarea/select.
const baseCss = fs.readFileSync(path.join(ROOT, 'style_primera_visita.css'), 'utf8');
const segCss = fs.readFileSync(path.join(ROOT, 'style_seguimiento.css'), 'utf8');
const compactRule = /\.form-group\s+input\[type="date"\][^{]*\{[^}]*max-width\s*:/s;
if (!compactRule.test(baseCss) && !compactRule.test(segCss)) staticFindings.push('date-scoped max-width rule not found');
if (!/\.plan-date-input\b/.test(baseCss)) staticFindings.push('.plan-date-input rule missing');

function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json'))) {
      return createRequire(path.join(nm, '__loader_compactdates.cjs'))('playwright');
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-compact-dates-'));
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

async function gatedContext(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
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

const READ_FN = (ids) => {
  const doc = document.documentElement;
  const inputs = ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return { id, missing: true };
    const r = el.getBoundingClientRect();
    const pr = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
    return {
      id, tag: el.tagName, type: el.type, readOnly: el.readOnly,
      hasReadonlyAttr: el.hasAttribute('readonly'),
      w: Math.round(r.width), h: Math.round(r.height),
      left: Math.round(r.left), right: Math.round(r.right),
      parentW: pr ? Math.round(pr.width) : null, parentRight: pr ? Math.round(pr.right) : null,
      value: el.value,
    };
  });
  const sib = {};
  for (const id of ['nombrePaciente', 'sexoPaciente']) {
    const el = document.getElementById(id);
    if (el) sib[id] = Math.round(el.getBoundingClientRect().width);
  }
  return { inputs, siblings: sib, scrollW: doc.scrollWidth, clientW: doc.clientWidth, innerW: window.innerWidth };
};

async function journey(browser, file, ids, tag) {
  console.log(`\n=== ${tag} (${file}) ===`);
  for (const vp of [{ name: 'desktop', ...DESKTOP }, { name: 'mobile', ...MOBILE }]) {
    const ctx = await gatedContext(browser, vp);
    const page = await ctx.newPage();
    const errs = []; const perrs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => perrs.push(String(e)));
    try {
      await page.goto(`${baseUrl}/${file}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(900);
      const hasDx = await page.evaluate(() => !!document.getElementById('diagnosticoPrimario'));
      if (hasDx) {
        const aps = await page.evaluate(() => {
          const s = document.getElementById('diagnosticoPrimario');
          return Array.from(s.options).map((o) => o.value).find((v) => /aps/i.test(v)) || Array.from(s.options).map((o) => o.value).find(Boolean);
        });
        if (aps) { await page.selectOption('#diagnosticoPrimario', aps); await page.waitForTimeout(500); }
      }
      const d = await page.evaluate(READ_FN, ids);
      const label = `${tag}/${vp.name}`;

      for (const inp of d.inputs) {
        const idTag = `${label} #${inp.id}`;
        if (inp.missing) { check(`${idTag} present`, false, 'missing'); continue; }
        check(`${idTag} native input[type=date]`, inp.tag === 'INPUT' && inp.type === 'date', JSON.stringify(inp));
        check(`${idTag} compact/contained (w=${inp.w} <= ${COMPACT_MAX}, <= container ${inp.parentW})`, inp.w <= COMPACT_MAX && inp.w <= (inp.parentW ?? inp.w) + 1, JSON.stringify(inp));
        check(`${idTag} legible (w=${inp.w} >= ${LEGIBLE_MIN}, h=${inp.h} >= 28)`, inp.w >= LEGIBLE_MIN && inp.h >= 28, JSON.stringify(inp));
        check(`${idTag} not clipped (right=${inp.right} <= containerRight=${inp.parentRight})`, inp.parentRight === null || inp.right <= inp.parentRight + 1, JSON.stringify(inp));
        if (vp.name === 'mobile') {
          check(`${idTag} within viewport (right=${inp.right} <= innerW=${d.innerW})`, inp.right <= d.innerW + 1, JSON.stringify(inp));
        }
        const expectReadonly = inp.id === READONLY_ID && file === SEG_FILE;
        check(`${idTag} readonly=${expectReadonly} preserved`, inp.readOnly === expectReadonly && inp.hasReadonlyAttr === expectReadonly, JSON.stringify({ readOnly: inp.readOnly, attr: inp.hasReadonlyAttr }));
      }

      // Sibling non-date controls must keep full width (no global drift).
      if (vp.name === 'desktop') {
        for (const [sid, w] of Object.entries(d.siblings)) {
          check(`${label} sibling #${sid} keeps full width (w=${w})`, w > COMPACT_MAX, JSON.stringify(d.siblings));
        }
      }

      const overflowOk = vp.name === 'desktop'
        ? d.scrollW <= d.clientW + 1
        : d.scrollW <= PREEXISTING_SCROLL_CEILING[file];
      const ceilingNote = vp.name === 'mobile' ? ` <= ${PREEXISTING_SCROLL_CEILING[file]} pre-existing ceiling` : '';
      check(`${label} no date-induced overflow (scrollW=${d.scrollW}, clientW=${d.clientW}${ceilingNote})`, overflowOk, JSON.stringify({ scrollW: d.scrollW, clientW: d.clientW }));

      // Value round-trip on the (editable) visit date + resize persistence.
      await page.fill('#fechaVisita', '2026-03-15');
      const v1 = await page.inputValue('#fechaVisita');
      check(`${label} #fechaVisita value round-trip`, v1 === '2026-03-15', v1);
      await page.setViewportSize(vp.name === 'desktop' ? MOBILE : DESKTOP);
      await page.waitForTimeout(300);
      const v2 = await page.inputValue('#fechaVisita');
      check(`${label} #fechaVisita value survives resize`, v2 === '2026-03-15', v2);
      await page.setViewportSize(vp.name === 'desktop' ? DESKTOP : MOBILE);
      await page.waitForTimeout(200);
      await page.fill('#fechaVisita', '');
      check(`${label} #fechaVisita clears to blank`, (await page.inputValue('#fechaVisita')) === '', 'not blank');

      // Readonly negative witness: keyboard interaction must not mutate value.
      if (file === SEG_FILE) {
        const before = await page.inputValue(`#${READONLY_ID}`);
        await page.locator(`#${READONLY_ID}`).focus();
        await page.keyboard.type('03/15/2026');
        await page.keyboard.press('Enter');
        const after = await page.inputValue(`#${READONLY_ID}`);
        check(`${label} #${READONLY_ID} keyboard cannot mutate (RO)`, after === before && after === '', JSON.stringify({ before, after }));
      }

      check(`${label} console.error=0 pageerror=0`, errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
    } finally {
      await ctx.close();
    }
  }
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });

check('S1 static: date-field identity/count preserved', staticFindings.length === 0, staticFindings.join('; '));

await journey(browser, PV_FILE, PV_DATES, 'PV');
await journey(browser, SEG_FILE, SEG_DATES, 'SEGUIMIENTO');

await browser.close();
server.close();
fs.rmSync(tempDir, { recursive: true, force: true });

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? 'reuma_compact_dates_browser_check PASS' : 'reuma_compact_dates_browser_check FAILED');
if (failed > 0) process.exit(1);
