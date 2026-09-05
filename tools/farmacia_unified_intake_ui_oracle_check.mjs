#!/usr/bin/env node
/**
 * T6 #298 independent acceptance oracle — frozen before implementation.
 *
 * Authority: live #298 + SPEC D3/D5/D8/D9/D10/D12 + existing identifier
 * comparison contract. Synthetic/demo data only.
 *
 * Minimal semantic hook contract introduced by this oracle:
 * - textarea[data-fh-intake-source]                     intake surface
 * - [data-fh-intake-preview]                            optional preview trigger
 * - [data-fh-intake-apply]                              T6 apply gate (must stay disabled)
 * - [data-fh-intake-preview-panel]                      rendered preview
 * - [data-fh-source-name="e-orden"|"presalud"]       per-source unit
 * - [data-fh-provenance] inside recognized source unit visible provenance
 *
 * Hooks only identify semantic surfaces. Gate states required by #298 must
 * also be visible user-facing text inside the corresponding source unit.
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEP = '═'.repeat(55);
const SELECTED_CIP = 'CIP-DEMO-FH-001';
const RAW_MARKER = 'ORA298MARK-X7K9';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
const EORDEN_CIPLESS_CONFIRM = 'Asociar esta e-Orden sin CIP al paciente seleccionado.';
const CLINICAL_CONTROL_IDS = [
  'fhDermaCip', 'fhDermaPatologia', 'fhDermaFarmaco', 'fhDermaDosis',
  'fhDermaVia', 'fhDermaPauta', 'fhDermaPautaOtro', 'fhDermaInduccion',
  'fhDermaJustificacion'
];

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_t6_oracle_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_unified_intake_ui_oracle_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter(entry => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_validacion.html';
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;

function eordenRaw({ cip = SELECTED_CIP, includeCip = true, extraCip = null, code = 'SES_PSOR', label = 'PSORIASIS', brand = 'HYRIMOZ', dose = '40 MG', route = 'SC', schedule = 'CADA 14 DIAS', induction = 'NO' } = {}) {
  const lines = [
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS', SEP,
    ...(includeCip ? [`• CIP: ${cip}`] : []),
    ...(extraCip !== null ? [`• CIP: ${extraCip}`] : []),
    `• Marca comercial solicitada: ${brand}`,
    `• Dosis solicitada: ${dose}`,
    `• Vía solicitada: ${route}`,
    `• Pauta: ${schedule}`,
    `• Inducción solicitada: ${induction}`,
    `• Justificación clínica: ${RAW_MARKER} Justificación sintética.`,
    'PROGRAMA SES', `• Código: ${code}`, `• Denominación: ${label}`
  ];
  return lines.join('\n');
}
const PRESALUD = ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
const PRESALUD_MULTI = ';ADALIMUMAB (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n;ETANERCEPT (BENEPALI);Oral;80 MG;CADA 28 DIAS;28';
const UNKNOWN_RAW = 'NOTA_DESCONOCIDA_ORA298_SIN_FORMATO';

function selectedUrl() { return new URL(`farmacia_validacion.html?cip=${encodeURIComponent(SELECTED_CIP)}`, BASE).href; }
function noPatientUrl() { return new URL('farmacia_validacion.html', BASE).href; }

async function snapshotClinicalControls(page) {
  return page.evaluate(ids => {
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) out[id] = { checked: el.checked };
      else if ('value' in el) out[id] = { value: el.value };
    }
    return out;
  }, CLINICAL_CONTROL_IDS);
}

async function snapshotStorage(page) {
  return page.evaluate(() => ({
    local: Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(Boolean).sort().map(key => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)).filter(Boolean).sort().map(key => [key, sessionStorage.getItem(key)]))
  }));
}

async function assertApplyDisabled(page, label) {
  const apply = page.locator('[data-fh-intake-apply]');
  assert.equal(await apply.count(), 1, `${label}: exactly one T6 apply gate must exist`);
  const disabled = await apply.evaluate(el => ('disabled' in el && Boolean(el.disabled)) || el.getAttribute('aria-disabled') === 'true');
  assert.equal(disabled, true, `${label}: T6 apply gate must remain disabled`);
}

async function pasteAndPreview(page, raw, label, { minUnits = 1, allowNoUnit = false } = {}) {
  const intake = page.locator('textarea[data-fh-intake-source]');
  assert.equal(await intake.count(), 1, `${label}: single intake textarea hook missing`);
  await intake.fill(raw);
  const previewTrigger = page.locator('[data-fh-intake-preview]');
  if (await previewTrigger.count()) await previewTrigger.first().click();
  await page.waitForFunction(({ allowNoUnit, minUnits }) => {
    const panel = document.querySelector('[data-fh-intake-preview-panel]');
    if (!panel || !panel.textContent?.trim()) return false;
    if (allowNoUnit) return true;
    return panel.querySelectorAll('[data-fh-source-name]').length >= minUnits;
  }, { allowNoUnit, minUnits }, { timeout: 8000 });
  await assertApplyDisabled(page, label);
}

function sourceUnit(page, source) { return page.locator(`[data-fh-intake-preview-panel] [data-fh-source-name="${source}"]`); }
async function unitText(page, source, label) {
  const unit = sourceUnit(page, source);
  assert.equal(await unit.count(), 1, `${label}: expected one ${source} source unit`);
  return (await unit.textContent()) || '';
}
async function assertVisibleState(page, source, state, label) {
  const text = await unitText(page, source, label);
  assert.ok(text.includes(state), `${label}: ${source} must visibly show ${state}`);
}
async function assertNotVisibleState(page, source, state, label) {
  const text = await unitText(page, source, label);
  assert.ok(!text.includes(state), `${label}: ${source} must not claim ${state}`);
}
async function assertProvenance(page, source, label) {
  const unit = sourceUnit(page, source);
  const provenance = unit.locator('[data-fh-provenance]');
  assert.ok(await provenance.count() > 0, `${label}: ${source} must render provenance`);
  const texts = await provenance.allTextContents();
  assert.ok(texts.some(text => text.trim().length > 0), `${label}: ${source} provenance must be visible`);
}
async function panelText(page) { return (await page.locator('[data-fh-intake-preview-panel]').textContent()) || ''; }

async function confirmationControl(page, sentence, label) {
  for (const role of ['button', 'checkbox', 'radio', 'switch']) {
    const locator = page.getByRole(role, { name: sentence, exact: true });
    if (await locator.count()) return locator.first();
  }
  const labelled = page.getByLabel(sentence, { exact: true });
  if (await labelled.count()) return labelled.first();
  throw new Error(`${label}: confirmation control not found for exact contractual sentence: ${sentence}`);
}

async function withScenario(name, url, fn) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.FarmaciaValidacion));
    const beforeClinical = await snapshotClinicalControls(page);
    const beforeStorage = await snapshotStorage(page);
    const beforeUrl = page.url();
    await fn(page, beforeClinical);
    const afterClinical = await snapshotClinicalControls(page);
    const afterStorage = await snapshotStorage(page);
    assert.deepEqual(afterClinical, beforeClinical, `${name}: intake review must not write clinical form controls or change selected patient`);
    assert.deepEqual(afterStorage, beforeStorage, `${name}: intake review must not persist to localStorage/sessionStorage`);
    assert.equal(page.url(), beforeUrl, `${name}: intake review must not write state to URL`);
    assert.deepEqual(pageErrors, [], `${name}: uncaught browser errors`);
    for (const text of consoleErrors) {
      assert.ok(!text.includes(RAW_MARKER), `${name}: raw intake marker leaked to console error`);
      assert.ok(!text.includes(PRESALUD), `${name}: raw PreSalud record leaked to console error`);
    }
    console.log(`OK ${name}`);
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
let passed = 0;
try {
  await withScenario('1 no selected patient previews but never verifies/applies', noPatientUrl(), async page => {
    await pasteAndPreview(page, eordenRaw(), 'no-patient');
    await assertNotVisibleState(page, 'e-orden', 'VERIFIED_EXPLICIT_CIP', 'no-patient');
  }); passed++;

  await withScenario('2 exact e-Orden CIP verifies with provenance', selectedUrl(), async page => {
    await pasteAndPreview(page, eordenRaw(), 'exact-cip');
    await assertVisibleState(page, 'e-orden', 'VERIFIED_EXPLICIT_CIP', 'exact-cip');
    await assertProvenance(page, 'e-orden', 'exact-cip');
  }); passed++;

  await withScenario('3 peripheral trim is the only allowed transport normalization', selectedUrl(), async page => {
    await pasteAndPreview(page, eordenRaw({ cip: `  ${SELECTED_CIP}  ` }), 'trim-cip');
    await assertVisibleState(page, 'e-orden', 'VERIFIED_EXPLICIT_CIP', 'trim-cip');
  }); passed++;

  for (const [label, raw] of [
    ['different-cip', eordenRaw({ cip: 'CIP-DEMO-FH-002' })],
    ['case-different-cip', eordenRaw({ cip: 'cip-demo-fh-001' })],
    ['similar-cip', eordenRaw({ cip: 'CIP-DEMO-FH-001X' })]
  ]) {
    await withScenario(`4 ${label} conflicts without fuzzy association`, selectedUrl(), async page => {
      await pasteAndPreview(page, raw, label);
      await assertVisibleState(page, 'e-orden', 'CONFLICT', label);
      await assertNotVisibleState(page, 'e-orden', 'VERIFIED_EXPLICIT_CIP', label);
    }); passed++;
  }

  await withScenario('5 multiple CIP never verifies', selectedUrl(), async page => {
    const raw = eordenRaw({ extraCip: 'CIP-DEMO-FH-002' });
    await pasteAndPreview(page, raw, 'multiple-cip', { allowNoUnit: true });
    const text = await panelText(page);
    assert.ok(text.includes('CONFLICT') || text.includes('MULTIPLE') || text.includes('UNRECOGNIZED'), 'multiple-cip: structured blocked/conflict reason must be visible');
    assert.ok(!text.includes('VERIFIED_EXPLICIT_CIP'), 'multiple-cip: must never verify');
    assert.ok(text.includes('CIP-DEMO-FH-002') || text.includes('CIP'), 'multiple-cip: raw/conflicting identifier must stay visible');
  }); passed++;

  await withScenario('6 whitespace-only CIP never verifies and remains inspectable', selectedUrl(), async page => {
    await pasteAndPreview(page, eordenRaw({ cip: '   ' }), 'empty-cip', { allowNoUnit: true });
    const text = await panelText(page);
    assert.ok(!text.includes('VERIFIED_EXPLICIT_CIP'), 'empty-cip: must never verify');
    assert.ok(/EMPTY|UNRECOGNIZED|BLOCK|CIP/i.test(text), 'empty-cip: structured reason must be visible');
  }); passed++;

  await withScenario('7 PreSalud is UNBOUND until exact explicit confirmation', selectedUrl(), async page => {
    await pasteAndPreview(page, PRESALUD, 'presalud');
    await assertVisibleState(page, 'presalud', 'UNBOUND', 'presalud');
    await assertProvenance(page, 'presalud', 'presalud');
    const control = await confirmationControl(page, PRESALUD_CONFIRM, 'presalud');
    await control.click();
    await page.waitForFunction(() => document.querySelector('[data-fh-source-name="presalud"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'));
    await assertVisibleState(page, 'presalud', 'MANUALLY_CONFIRMED_SELECTED_PATIENT', 'presalud-confirmed');
  }); passed++;

  await withScenario('8 CIP-less e-Orden is UNBOUND until exact explicit confirmation', selectedUrl(), async page => {
    await pasteAndPreview(page, eordenRaw({ includeCip: false }), 'cipless-eorden');
    await assertVisibleState(page, 'e-orden', 'UNBOUND', 'cipless-eorden');
    const control = await confirmationControl(page, EORDEN_CIPLESS_CONFIRM, 'cipless-eorden');
    await control.click();
    await page.waitForFunction(() => document.querySelector('[data-fh-source-name="e-orden"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'));
    await assertVisibleState(page, 'e-orden', 'MANUALLY_CONFIRMED_SELECTED_PATIENT', 'cipless-eorden-confirmed');
  }); passed++;

  await withScenario('9 mixed exact-CIP e-Orden never auto-associates PreSalud', selectedUrl(), async page => {
    await pasteAndPreview(page, `${eordenRaw()}\n${PRESALUD}`, 'mixed-exact', { minUnits: 2 });
    await assertVisibleState(page, 'e-orden', 'VERIFIED_EXPLICIT_CIP', 'mixed-exact');
    await assertVisibleState(page, 'presalud', 'UNBOUND', 'mixed-exact');
    await assertProvenance(page, 'e-orden', 'mixed-exact');
    await assertProvenance(page, 'presalud', 'mixed-exact');
  }); passed++;

  await withScenario('10 mixed identifier-less confirmations are independent', selectedUrl(), async page => {
    await pasteAndPreview(page, `${eordenRaw({ includeCip: false })}\n${PRESALUD}`, 'mixed-unbound', { minUnits: 2 });
    await assertVisibleState(page, 'e-orden', 'UNBOUND', 'mixed-unbound');
    await assertVisibleState(page, 'presalud', 'UNBOUND', 'mixed-unbound');
    const presaludControl = await confirmationControl(page, PRESALUD_CONFIRM, 'mixed-unbound');
    const eordenControl = await confirmationControl(page, EORDEN_CIPLESS_CONFIRM, 'mixed-unbound');
    await presaludControl.click();
    await page.waitForFunction(() => document.querySelector('[data-fh-source-name="presalud"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'));
    await assertVisibleState(page, 'presalud', 'MANUALLY_CONFIRMED_SELECTED_PATIENT', 'mixed-after-presalud');
    await assertVisibleState(page, 'e-orden', 'UNBOUND', 'mixed-after-presalud');
    await eordenControl.click();
    await page.waitForFunction(() => document.querySelector('[data-fh-source-name="e-orden"]')?.textContent?.includes('MANUALLY_CONFIRMED_SELECTED_PATIENT'));
    await assertVisibleState(page, 'e-orden', 'MANUALLY_CONFIRMED_SELECTED_PATIENT', 'mixed-after-eorden');
  }); passed++;

  await withScenario('11 blocked SES still previews raw plus structured reason', selectedUrl(), async page => {
    const raw = eordenRaw({ code: 'SES_NOT_ALLOWED', label: 'NO AUTORIZADO' });
    await pasteAndPreview(page, raw, 'blocked-ses', { allowNoUnit: true });
    const text = await panelText(page);
    assert.ok(text.includes('SES_NOT_ALLOWED') || text.includes('NO AUTORIZADO'), 'blocked-ses: raw must remain visible');
    assert.ok(/OUT_OF_ALLOWLIST|BLOCK|UNRECOGNIZED|SES/i.test(text), 'blocked-ses: structured reason must be visible');
  }); passed++;

  await withScenario('12 PreSalud multi-record fails closed and remains visible', selectedUrl(), async page => {
    await pasteAndPreview(page, PRESALUD_MULTI, 'presalud-multi', { allowNoUnit: true });
    const text = await panelText(page);
    assert.ok(text.includes('MULTI_RECORD_UNSUPPORTED_V0'), 'presalud-multi: required structured reason visible');
    assert.ok(text.includes('BENEPALI') || text.includes('ETANERCEPT'), 'presalud-multi: raw second record remains visible');
  }); passed++;

  await withScenario('13 unknown fragment remains visible', selectedUrl(), async page => {
    await pasteAndPreview(page, `${eordenRaw()}\n${UNKNOWN_RAW}`, 'unknown-fragment', { allowNoUnit: true });
    assert.ok((await panelText(page)).includes(UNKNOWN_RAW), 'unknown-fragment: raw unknown fragment must remain visible');
  }); passed++;

  console.log(`T6 ORACLE PASS ${passed} scenario groups`);
} catch (error) {
  console.error(`T6 ORACLE FAIL after ${passed} passed scenario groups: ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
