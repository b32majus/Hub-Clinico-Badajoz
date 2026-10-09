#!/usr/bin/env node
'use strict';
/**
 * Focused falsification checker for TRAIN-NEXUS-REUMA-UX-CLOSEOUT-17 T2 /
 * GitHub issue #611 (Atenea C-087, volume):
 *
 *   "Sustituir la presentación visible de exactamente 4 selects discretos de
 *    Anamnesis/exploración (dolorAxial, rigidezMatutina, irradiacionNalgas,
 *    maniobrasSacroiliacas) por chips accesibles, con el <select> original como
 *    única autoridad de valores/eventos; ausencia != no."
 *
 * The four fields are cubes:
 *   dolorAxial            {""/inflamatorio/mecanico/mixto}
 *   rigidezMatutina       {""/si/no}
 *   irradiacionNalgas     {""/no/dcha/izq/ambas}
 *   maniobrasSacroiliacas {""/positivas/negativas/dudosas}
 *
 * What this checker falsifies:
 *   S1 static: the four selects still exist exactly once, opt out of the shared
 *      decorator via data-no-custom-select="true", and keep their authored option
 *      values/labels/order plus the blank/Seleccionar option.
 *   S2 static: the chip presentation is local (a small CSS vocabulary + an inline
 *      page locale script); no second select is authored and the shared
 *      modules/customSelect.js is not relied upon for these fields.
 *   1  EspA + APs: each field has exactly ONE visible control (chips visible, the
 *      native select hidden, no decorated .custom-select wrapper -> no duplicate
 *      dropdown). Chip values/labels/order mirror the select exactly.
 *   2  real mouse: pick every non-blank value then RETURN TO BLANK through real
 *      locator clicks; the select stays the single authority and
 *      recopilarDatosFormulario() returns the same value at every step.
 *   3  real keyboard: focus + Enter/Space activates a chip (semantic buttons).
 *   4  pathology switch EspA<->APs keeps the chips in sync; the section (and the
 *      conditional duracionRigidezContainer) hides on AR and returns on APs,
 *      i.e. the conditional response is unchanged.
 *   5  [AUTHORITY PROPERTY] restore/hydration re-sync: assigning a synthetic
 *      saved state directly to select.value (the writer shape used by
 *      prefillSeguimientoForm) re-syncs the derived chips without any polling
 *      loop. Primera Visita has NO supported restore path (see below), so this
 *      is a lower-level contract check, NOT supported browser-interaction proof.
 *   6a real mouse: clicking every blank chip exports blank and never "no".
 *   6b [AUTHORITY PROPERTY] an out-of-set option value is rejected by the
 *      authority and no chip invents it.
 *   6c [AUTHORITY PROPERTY] a disabled authority renders the chips
 *      non-interactive.
 *   7  console.error === 0 and pageerror === 0 over every journey.
 *   1b G4-1 regression (real mouse clicks, computed styles): the SELECTED BLANK
 *      chip ([data-value=""][aria-pressed="true"], label "Seleccionar") must be
 *      visually NEUTRAL - no green/success surface, no greenish border, no white
 *      "active" text and NO visible checkmark - while a nonblank selected chip
 *      keeps the supported active surface (#008777) and the checkmark. Nonvacuity:
 *      reverting the blank-chip CSS makes this block fail.
 *
 * SUPPORTED INTERACTION vs AUTHORITY PROPERTY
 * -------------------------------------------
 * Checks tagged [AUTHORITY PROPERTY] (5, 6b, 6c) cannot be produced by any
 * supported UI in Primera Visita: no supported state disables these four
 * selects, the UI can never submit an out-of-set value, and there is no product
 * restore/hydration path that writes these fields. They assign
 * select.value/.disabled directly inside page.evaluate purely to falsify the
 * underlying authority contract; they are NOT counted as supported
 * browser-interaction proof. Every other check (static contract, real mouse,
 * real keyboard, real pathology switch, real blank-chip clicks, real export
 * reads via recopilarDatosFormulario) is exercised through supported
 * interaction.
 *
 * RESTORE DEMONSTRATION GAP: Primera Visita has no supported mechanism to
 * restore/hydrate saved form state. scripts/script_primera_visita.js reads no
 * query parameter and calls no prefill, primera_visita.html has no inline
 * restore, and the ?id= links emitted by the shared sidebar quick-view are
 * ignored by PV. The only product-side programmatic writer,
 * HubTools.form.prefillSeguimientoForm (modules/formController.js), is wired
 * solely from scripts/script_seguimiento.js. The required "restore of saved
 * synthetic form state" is therefore NOT demonstrated through supported
 * interaction here; only the derived re-sync contract is covered (check 5).
 *
 * Reads observables via page.evaluate. Supported-interaction checks never tamper
 * the DOM or inject a second control; the bounded [AUTHORITY PROPERTY] checks
 * assign select.value/.disabled directly. Synthetic data only. Not part of
 * `verify:nexus` (browser dependency).
 *
 * Usage: node tools/reuma_reuma_ux17_chips_browser_check.mjs
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
const CHIP_FIELDS = {
  dolorAxial: { values: ['', 'inflamatorio', 'mecanico', 'mixto'], labels: ['Seleccionar', 'Inflamatorio', 'Mecánico', 'Mixto'] },
  rigidezMatutina: { values: ['', 'si', 'no'], labels: ['Seleccionar', 'Sí', 'No'] },
  irradiacionNalgas: { values: ['', 'no', 'dcha', 'izq', 'ambas'], labels: ['Seleccionar', 'No', 'Derecha', 'Izquierda', 'Ambas (Alt.)'] },
  maniobrasSacroiliacas: { values: ['', 'positivas', 'negativas', 'dudosas'], labels: ['Seleccionar', 'Positivas', 'Negativas', 'Dudosas'] }
};
const FIELD_IDS = Object.keys(CHIP_FIELDS);
const ACTIVE_GREEN = 'rgb(0, 135, 119)'; // .pv-chip[aria-pressed="true"] surface
function parseRgb(str) {
  const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(str || '');
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
}
// A surface reads as green/success when green clearly dominates red and is at
// least as strong as blue (catches the teal active chip AND the shared green).
function isGreenish(str) {
  const c = parseRgb(str);
  return !!c && c.g > c.r + 20 && c.g >= c.b;
}

// ---------------------------------------------------------------------------
// S1/S2 — static inspection (no browser): authored contract + local mechanism.
// ---------------------------------------------------------------------------
const staticFindings = [];
const pvHtml = fs.readFileSync(path.join(ROOT, PV_FILE), 'utf8');
const pvCss = fs.readFileSync(path.join(ROOT, 'style_primera_visita.css'), 'utf8');

function extractSelect(html, id) {
  const re = new RegExp(`<select\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)<\\/select>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const openTag = m[0].slice(0, m[0].indexOf('>'));
  const options = Array.from(m[1].matchAll(/<option\b([^>]*)>([^<]*)<\/option>/gi)).map((om) => {
    const value = (om[1].match(/\bvalue="([^"]*)"/) || ['', ''])[1];
    return { value, label: om[2].trim() };
  });
  return { openTag, options };
}

for (const id of FIELD_IDS) {
  const spec = CHIP_FIELDS[id];
  const select = extractSelect(pvHtml, id);
  if (!select) { staticFindings.push(`#${id} select not found`); continue; }
  if (!/data-no-custom-select="true"/.test(select.openTag)) staticFindings.push(`#${id} missing data-no-custom-select="true"`);
  const values = select.options.map((o) => o.value);
  const labels = select.options.map((o) => o.label);
  if (JSON.stringify(values) !== JSON.stringify(spec.values)) staticFindings.push(`#${id} option values ${JSON.stringify(values)} != ${JSON.stringify(spec.values)}`);
  if (JSON.stringify(labels) !== JSON.stringify(spec.labels)) staticFindings.push(`#${id} option labels ${JSON.stringify(labels)} != ${JSON.stringify(spec.labels)}`);
  const occurrences = Array.from(pvHtml.matchAll(new RegExp(`<select\\b[^>]*\\bid="${id}"`, 'gi'))).length;
  if (occurrences !== 1) staticFindings.push(`#${id} authored ${occurrences} times (expected 1 select)`);
}
// The local presentation vocabulary must exist and stay local (PV CSS only).
for (const marker of ['.pv-chip-native', '.pv-chips', '.pv-chip[aria-pressed="true"]', '.pv-chip:focus-visible']) {
  if (!pvCss.includes(marker)) staticFindings.push(`style_primera_visita.css missing ${marker}`);
}
if (!/\.pv-chip-native\s*\{[^}]*display:\s*none/s.test(pvCss)) staticFindings.push('.pv-chip-native does not hide the native select (display:none)');
// The four IDs must remain in the shared decorator whitelist (so the ONLY thing
// preventing a duplicate dropdown is the local opt-out, not a whitelist edit).
const customSelectSrc = fs.readFileSync(path.join(ROOT, 'modules', 'customSelect.js'), 'utf8');
for (const id of FIELD_IDS) {
  if (!customSelectSrc.includes(`#${id}`)) staticFindings.push(`modules/customSelect.js whitelist lost #${id}`);
}

// ---------------------------------------------------------------------------
// Playwright bootstrap (same documented resolution as other browser checkers).
// ---------------------------------------------------------------------------
function loadPlaywright() {
  const tryNM = (nm) => {
    if (fs.existsSync(path.join(nm, 'playwright', 'package.json'))) {
      return createRequire(path.join(nm, '__loader_chips.cjs'))('playwright');
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-chips-'));
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

// Open (only) the closed ancestor collapsibles through their real header buttons
// so the chips become truly hit-testable (Playwright otherwise reports a clipped
// ancestor as intercepting pointer events).
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

const READ_FIELDS_FN = (ids) => {
  const out = {};
  for (const id of ids) {
    const select = document.getElementById(id);
    if (!select) { out[id] = { missing: true }; continue; }
    const group = document.querySelector(`[data-chip-group-for="${id}"]`);
    const chips = group ? Array.from(group.querySelectorAll('.pv-chip')) : [];
    out[id] = {
      tag: select.tagName,
      selectValue: select.value,
      selectDisplay: getComputedStyle(select).display,
      decorated: !!select.closest('.custom-select'),
      selectCount: document.querySelectorAll(`select#${id}`).length,
      groupCount: document.querySelectorAll(`[data-chip-group-for="${id}"]`).length,
      groupVisible: group ? getComputedStyle(group).display !== 'none' : false,
      groupRole: group ? group.getAttribute('role') : null,
      groupLabelledby: group ? group.getAttribute('aria-labelledby') : null,
      options: Array.from(select.options).map((o) => ({ value: o.value, label: o.textContent })),
      chips: chips.map((c) => ({
        value: c.dataset.value,
        label: (c.querySelector('.pv-chip__label') || {}).textContent || '',
        pressed: c.getAttribute('aria-pressed'),
        disabled: c.disabled,
        tag: c.tagName,
        type: c.type
      }))
    };
  }
  const section = document.getElementById('dolorAxialSection');
  const duration = document.getElementById('duracionRigidezContainer');
  out.__meta = {
    sectionDisplay: section ? getComputedStyle(section).display : null,
    durationDisplay: duration ? getComputedStyle(duration).display : null,
    durationTag: duration ? (document.getElementById('duracionRigidez') || {}).tagName || null : null,
    sectionVisible: section ? (section.getBoundingClientRect().width > 0 && section.getBoundingClientRect().height > 0) : null,
    durationVisible: duration ? (duration.getBoundingClientRect().width > 0 && duration.getBoundingClientRect().height > 0) : null
  };
  return out;
};

const chipSel = (id, value) => `[data-chip-group-for="${id}"] .pv-chip[data-value="${value}"]`;

// Read the computed, RENDERED style of every chip in one field (background,
// border, text colour, and whether the ✓ mark is actually visible). Read-only:
// no DOM mutation, no injected control.
const READ_CHIP_DISPLAY = (id) => {
  const group = document.querySelector(`[data-chip-group-for="${id}"]`);
  const chips = group ? Array.from(group.querySelectorAll('.pv-chip')) : [];
  const snap = (c) => {
    const cs = getComputedStyle(c);
    const mark = c.querySelector('.pv-chip__mark');
    const mcs = mark ? getComputedStyle(mark) : null;
    const rect = mark ? mark.getBoundingClientRect() : null;
    return {
      value: c.dataset.value,
      label: (c.querySelector('.pv-chip__label') || {}).textContent || '',
      pressed: c.getAttribute('aria-pressed'),
      bg: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderTopColor,
      markDisplay: mcs ? mcs.display : null,
      markVisible: !!(mark && mcs && mcs.display !== 'none' && rect && rect.width > 0 && rect.height > 0),
      markContent: mark ? getComputedStyle(mark, '::before').content : null
    };
  };
  const select = document.getElementById(id);
  return { selectValue: select ? select.value : null, chips: chips.map(snap) };
};

async function activatePathology(page, code) {
  await page.selectOption('#diagnosticoPrimario', { value: code });
  await page.waitForTimeout(400);
}

async function journey(browser, code) {
  console.log(`\n=== PV ${code} — accessible chips ===`);
  const ctx = await gatedContext(browser);
  const page = await ctx.newPage();
  const errs = []; const perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));
  const label = `PV/${code}`;
  try {
    await page.goto(`${baseUrl}/${PV_FILE}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(900);
    await activatePathology(page, code);
    const reachable = [];
    for (const id of FIELD_IDS) reachable.push(await openAncestorCollapsibles(page, `[data-chip-group-for="${id}"]`));
    check(`${label} chips reachable through supported interaction`, reachable.every(Boolean), JSON.stringify(reachable));

    // 1. single visible control per field + Gate 2 (values/order/labels/blank).
    const state = await page.evaluate(READ_FIELDS_FN, FIELD_IDS);
    for (const id of FIELD_IDS) {
      const spec = CHIP_FIELDS[id];
      const s = state[id];
      const tag = `${label} #${id}`;
      if (s.missing) { check(`${tag} present`, false, 'missing'); continue; }
      check(`${tag} exactly one select, undecorated`, s.tag === 'SELECT' && s.selectCount === 1 && !s.decorated, JSON.stringify({ tag: s.tag, count: s.selectCount, decorated: s.decorated }));
      check(`${tag} exactly one visible chip group`, s.groupCount === 1 && s.groupVisible && s.groupRole === 'group' && !!s.groupLabelledby, JSON.stringify({ groups: s.groupCount, visible: s.groupVisible, role: s.groupRole }));
      check(`${tag} native select hidden (no orphan dropdown)`, s.selectDisplay === 'none', s.selectDisplay);
      const chipValues = s.chips.map((c) => c.value);
      const chipLabels = s.chips.map((c) => c.label);
      check(`${tag} chip values = authored options`, JSON.stringify(chipValues) === JSON.stringify(spec.values), JSON.stringify(chipValues));
      check(`${tag} chip labels = authored labels`, JSON.stringify(chipLabels) === JSON.stringify(spec.labels), JSON.stringify(chipLabels));
      check(`${tag} chips are semantic buttons`, s.chips.every((c) => c.tag === 'BUTTON' && c.type === 'button'), JSON.stringify(s.chips.map((c) => `${c.tag}/${c.type}`)));
    }

    // 1b. G4-1 (real mouse clicks): the SELECTED BLANK chip must look neutral,
    //     while a nonblank selected chip keeps its supported active surface/mark.
    //     The pointer is moved off the chip before reading so :hover does not
    //     mask the settled active/neutral surface.
    for (const id of FIELD_IDS) {
      const spec = CHIP_FIELDS[id];
      const nonblankValue = spec.values.find((v) => v !== '');
      const tag = `${label} #${id} G4-1 blank neutral`;
      await openAncestorCollapsibles(page, `[data-chip-group-for="${id}"]`);
      await page.locator(chipSel(id, nonblankValue)).click();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(350);
      const nb = await page.evaluate(READ_CHIP_DISPLAY, id);
      const nbChip = nb.chips.find((c) => c.value === nonblankValue);
      await page.locator(chipSel(id, '')).click();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(350);
      const bl = await page.evaluate(READ_CHIP_DISPLAY, id);
      const blank = bl.chips.find((c) => c.value === '');
      const exported = await page.evaluate((fid) => HubTools.form.recopilarDatosFormulario()[fid], id);
      check(`${tag}: real click back to blank keeps select blank + label + pressed + export`,
        bl.selectValue === '' && !!blank && blank.pressed === 'true' && blank.label === 'Seleccionar' && exported === '',
        JSON.stringify({ selectValue: bl.selectValue, pressed: blank && blank.pressed, label: blank && blank.label, exported }));
      check(`${tag}: no green/success surface or border on the selected blank chip`,
        !!blank && !isGreenish(blank.bg) && blank.bg !== ACTIVE_GREEN && !isGreenish(blank.borderColor) && blank.color !== 'rgb(255, 255, 255)',
        JSON.stringify(blank && { bg: blank.bg, borderColor: blank.borderColor, color: blank.color }));
      check(`${tag}: no visible checkmark on the selected blank chip`,
        !!blank && blank.markDisplay === 'none' && blank.markVisible === false,
        JSON.stringify(blank && { markDisplay: blank.markDisplay, markVisible: blank.markVisible, markContent: blank.markContent }));
      check(`${tag}: nonblank selected chip keeps active surface + checkmark`,
        !!nbChip && nbChip.pressed === 'true' && nbChip.bg === ACTIVE_GREEN && nbChip.markVisible === true && String(nbChip.markContent).includes('\u2713'),
        JSON.stringify(nbChip && { pressed: nbChip.pressed, bg: nbChip.bg, markVisible: nbChip.markVisible, markContent: nbChip.markContent }));
    }

    // 2. real mouse: pick every non-blank value then RETURN TO BLANK through a
    //    real locator click; export parity per step.
    for (const id of FIELD_IDS) {
      const spec = CHIP_FIELDS[id];
      const tag = `${label} #${id} mouse`;
      let ok = true; let detail = '';
      await openAncestorCollapsibles(page, `[data-chip-group-for="${id}"]`);
      const sequence = spec.values.filter((v) => v !== '').concat(''); // values..., then blank
      for (const value of sequence) {
        await page.locator(chipSel(id, value)).click();
        await page.waitForTimeout(60);
        const s = await page.evaluate(READ_FIELDS_FN, FIELD_IDS);
        const ref = s[id];
        const pressed = ref.chips.filter((c) => c.pressed === 'true').map((c) => c.value);
        const exported = await page.evaluate((ids) => {
          const datos = HubTools.form.recopilarDatosFormulario();
          const pick = {}; for (const x of ids) pick[x] = datos[x]; return pick;
        }, [id]);
        const good = ref.selectValue === value && JSON.stringify(pressed) === JSON.stringify([value]) && exported[id] === value;
        if (!good) { ok = false; detail = JSON.stringify({ want: value, select: ref.selectValue, pressed, exported: exported[id] }); break; }
      }
      check(`${tag} pick every value + real return-to-blank, export parity`, ok, detail);
    }

    // 3. real keyboard activation (semantic buttons, Enter/Space).
    {
      const tag = `${label} keyboard`;
      await page.locator(chipSel('dolorAxial', 'mecanico')).focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(60);
      const afterEnter = await page.evaluate(() => document.getElementById('dolorAxial').value);
      await page.locator(chipSel('dolorAxial', 'mixto')).focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(60);
      const afterSpace = await page.evaluate(() => document.getElementById('dolorAxial').value);
      check(`${tag} Enter/Space activate chips`, afterEnter === 'mecanico' && afterSpace === 'mixto', JSON.stringify({ afterEnter, afterSpace }));
    }

    // 4. pathology switch keeps chips in sync; section + conditional duration follow the same conditions.
    {
      const tag = `${label} pathology switch`;
      // set a known value, then switch APs -> EspA -> APs and re-open if needed.
      await page.locator(chipSel('rigidezMatutina', 'si')).click();
      const beforeSwitch = await page.evaluate(() => document.getElementById('rigidezMatutina').value);
      const other = code === 'aps' ? 'espa' : 'aps';
      await activatePathology(page, other);
      await openAncestorCollapsibles(page, `[data-chip-group-for="${FIELD_IDS[0]}"]`);
      const back = await page.evaluate(READ_FIELDS_FN, FIELD_IDS);
      const synced = back.rigidezMatutina.selectValue === beforeSwitch
        && back.rigidezMatutina.chips.some((c) => c.value === beforeSwitch && c.pressed === 'true');
      // AR hides the shared section (and, with it, the conditional duration container).
      await activatePathology(page, 'ar');
      const ar = await page.evaluate(READ_FIELDS_FN, FIELD_IDS);
      const arHidden = ar.__meta.sectionVisible === false && ar.__meta.durationVisible === false;
      // Back to the tested pathology restores them.
      await activatePathology(page, code);
      await openAncestorCollapsibles(page, `[data-chip-group-for="${FIELD_IDS[0]}"]`);
      const restored = await page.evaluate(READ_FIELDS_FN, FIELD_IDS);
      const returned = restored.__meta.sectionVisible === true && restored.__meta.durationVisible === true;
      check(`${tag} value + chips sync across EspA<->APs`, synced, JSON.stringify({ beforeSwitch, after: back.rigidezMatutina.selectValue }));
      check(`${tag} AR hides section + conditional duracionRigidez`, arHidden, JSON.stringify(ar.__meta));
      check(`${tag} return restores section + conditional duracionRigidez`, returned, JSON.stringify(restored.__meta));
      check(`${tag} duracionRigidezContainer visibility tracks the section`, back.__meta.sectionVisible === back.__meta.durationVisible, JSON.stringify(back.__meta));
    }

    // 5. [AUTHORITY PROPERTY — NOT UI proof] restore/hydration re-sync.
    //    Primera Visita exposes no supported restore path (see header); this
    //    applies a synthetic saved state through the product-side writer shape
    //    (select.value = ..., as prefillSeguimientoForm does) directly and
    //    verifies the derived chips re-sync with no event/polling loop.
    {
      const tag = `${label} [AUTHORITY PROPERTY] restore`;
      const saved = { dolorAxial: 'inflamatorio', rigidezMatutina: 'no', irradiacionNalgas: 'ambas', maniobrasSacroiliacas: 'dudosas' };
      const res = await page.evaluate((payload) => {
        // Same programmatic assignment the product uses when prefilling
        // (e.g. prefillSeguimientoForm writes select.value directly).
        for (const [id, v] of Object.entries(payload)) document.getElementById(id).value = v;
        const pressed = {};
        for (const id of Object.keys(payload)) {
          pressed[id] = Array.from(document.querySelectorAll(`[data-chip-group-for="${id}"] .pv-chip[data-value="${payload[id]}"]`))
            .map((c) => c.getAttribute('aria-pressed'))[0];
        }
        const datos = HubTools.form.recopilarDatosFormulario();
        const exported = {};
        for (const id of Object.keys(payload)) exported[id] = datos[id];
        return { pressed, exported };
      }, saved);
      const chipsSynced = Object.keys(saved).every((id) => res.pressed[id] === 'true');
      const exportOk = Object.keys(saved).every((id) => res.exported[id] === saved[id]);
      check(`${tag} chips re-sync from programmatic value (no polling)`, chipsSynced, JSON.stringify(res.pressed));
      check(`${tag} restored values exported exactly`, exportOk, JSON.stringify(res.exported));
    }

    // 6. negative witnesses.
    {
      // 6a. SUPPORTED interaction: click every blank chip through the real mouse,
      //     then read the export. Blank is a real selectable state; absence is
      //     never coerced to "no".
      const tag = `${label} blank`;
      for (const id of FIELD_IDS) {
        await openAncestorCollapsibles(page, `[data-chip-group-for="${id}"]`);
        await page.locator(chipSel(id, '')).click();
        await page.waitForTimeout(60);
      }
      const blank = await page.evaluate((ids) => {
        const datos = HubTools.form.recopilarDatosFormulario();
        const exported = {}; const pressed = {};
        for (const id of ids) {
          exported[id] = datos[id];
          pressed[id] = Array.from(document.querySelectorAll(`[data-chip-group-for="${id}"] .pv-chip`))
            .filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.value);
        }
        return { exported, pressed };
      }, FIELD_IDS);
      const blankExportOk = FIELD_IDS.every((id) => blank.exported[id] === '' && JSON.stringify(blank.pressed[id]) === JSON.stringify(['']));
      const neverNo = blank.exported.rigidezMatutina !== 'no';
      const blankDetail = blankExportOk ? (neverNo ? '' : `rigidezMatutina exported ${JSON.stringify(blank.exported.rigidezMatutina)}`) : JSON.stringify(blank);
      check(`${tag} real blank-chip click -> blank export, never "no"`, blankExportOk && neverNo, blankDetail);

      // 6b. [AUTHORITY PROPERTY — NOT UI proof] an out-of-set option value can
      //     never be submitted by the UI; falsify the authority contract directly.
      const bogus = await page.evaluate(() => {
        const select = document.getElementById('dolorAxial');
        select.value = '';
        select.value = 'valor-inexistente';
        return {
          value: select.value,
          blankPressed: document.querySelector('[data-chip-group-for="dolorAxial"] .pv-chip[data-value=""]').getAttribute('aria-pressed'),
          hasBogusChip: !!document.querySelector('[data-chip-group-for="dolorAxial"] .pv-chip[data-value="valor-inexistente"]')
        };
      });
      check(`${label} [AUTHORITY PROPERTY] out-of-set value not accepted (fail closed)`, bogus.value === '' && bogus.blankPressed === 'true' && !bogus.hasBogusChip, JSON.stringify(bogus));

      // 6c. [AUTHORITY PROPERTY — NOT UI proof] no supported state disables these
      //     four selects in PV; falsify the disabled-mirroring contract directly.
      const disabled = await page.evaluate(() => {
        const select = document.getElementById('maniobrasSacroiliacas');
        select.value = 'positivas';
        select.disabled = true;
        return new Promise((resolve) => {
          // allow the attribute MutationObserver to run
          setTimeout(() => {
            const chips = Array.from(document.querySelectorAll('[data-chip-group-for="maniobrasSacroiliacas"] .pv-chip'));
            resolve({ allDisabled: chips.every((c) => c.disabled), value: select.value });
          }, 30);
        });
      });
      const chipInteractive = await page.locator(chipSel('maniobrasSacroiliacas', 'dudosas')).isEnabled();
      await page.evaluate(() => { document.getElementById('maniobrasSacroiliacas').disabled = false; });
      check(`${label} [AUTHORITY PROPERTY] disabled authority renders non-interactive chips`, disabled.allDisabled && !chipInteractive && disabled.value === 'positivas', JSON.stringify({ allDisabled: disabled.allDisabled, chipInteractive, value: disabled.value }));
    }

    check(`${label} console.error=0 pageerror=0`, errs.length === 0 && perrs.length === 0, JSON.stringify([...errs, ...perrs].slice(0, 5)));
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
check('S1/S2 static: authored options + local opt-out/mechanism preserved', staticFindings.length === 0, staticFindings.join('; '));

await journey(browser, 'espa');
await journey(browser, 'aps');

await browser.close();
server.close();
fs.rmSync(tempDir, { recursive: true, force: true });

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? 'reuma_reuma_ux17_chips_browser_check PASS' : 'reuma_reuma_ux17_chips_browser_check FAILED');
if (failed > 0) process.exit(1);
