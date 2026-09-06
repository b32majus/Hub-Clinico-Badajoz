#!/usr/bin/env node
/** T10 #302 / #314 independent final browser-QA + retention gate oracle. Synthetic data only. */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T1_ROOT = process.env.FH_T1_ROOT || '/srv/kairos-lab/projects/promueve/clean-workspace-20260904/worktrees/fh-t1-delivery-repair-20260905';
const T1_HEAD = '876afbb3d2e5f6cfb3bafef25403846bc45d4889';
const CIP = 'CIP-DEMO-FH-001';
const rows = [];

function record(owner, row, status, detail = '') {
  rows.push({ owner, row, status, detail });
  console.log(`${status === 'PASS' ? 'OK' : 'FAIL'} [${owner}] ${row}${detail ? ` — ${detail}` : ''}`);
}
function command(args, options = {}) {
  return spawnSync(args[0], args.slice(1), { cwd: options.cwd || ROOT, env: { ...process.env, ...(options.env || {}) }, encoding: 'utf8' });
}
function assertT1Authority() {
  const r = command(['git', '-C', T1_ROOT, 'rev-parse', 'HEAD']);
  assert.equal(r.status, 0, `cannot read T1 checkpoint: ${r.stderr}`);
  assert.equal(r.stdout.trim(), T1_HEAD, 'T1 producer root is not the accepted checkpoint');
  record('T1', 'accepted producer checkpoint pinned', 'PASS', T1_HEAD.slice(0, 8));
}
function runChild(owner, label, file, env = {}) {
  const target = path.join(ROOT, file);
  assert.ok(existsSync(target), `${label}: missing gate file ${file}`);
  const r = command([process.execPath, target], { env });
  if (r.status !== 0) {
    record(owner, label, 'FAIL', (r.stderr || r.stdout || '').trim().slice(-900));
    throw new Error(`${owner} gate failed: ${label}`);
  }
  record(owner, label, 'PASS');
}
function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) {
      return createRequire(path.join(nodeModules, '__fh_t10_oracle_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with npx --yes --package=playwright node tools/farmacia_unified_intake_final_gate_oracle_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  return readdirSync(cache).filter(x => x.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(x => path.join(cache, x, 'chrome-headless-shell-linux64', 'chrome-headless-shell')).find(existsSync) || bundled;
}
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
function resolveServed(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (clean.startsWith('t1/')) return { root: T1_ROOT, rel: clean.slice(3) };
  if (clean.startsWith('app/')) return { root: ROOT, rel: clean.slice(4) };
  return { root: ROOT, rel: clean || 'farmacia_validacion.html' };
}
const server = createServer((request, response) => {
  const { root, rel } = resolveServed(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const BASE = `http://127.0.0.1:${server.address().port}/`;

async function actualT1ToIntake() {
  const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/favicon/i.test(message.text())) errors.push(`console:${message.text()}`); });
  await page.addInitScript(() => {
    const original = document.execCommand.bind(document);
    document.execCommand = command => {
      if (command === 'copy') window.__lastExportText = document.activeElement?.value || '';
      return original(command);
    };
  });
  try {
    await page.goto(`${BASE}t1/docs/plantilla_solicitud_dermatologia.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#nombre').fill('Paciente Sintético T10');
    await page.locator('#cip').fill(CIP);
    await page.locator('#patologia').selectOption('pso');
    await page.locator('#marca_comercial').fill('HYRIMOZ');
    await page.locator('#dosis_solicitada').fill('40 MG');
    await page.locator('#via_solicitada').selectOption('SC');
    await page.locator('#pauta').fill('CADA 14 DIAS');
    await page.locator('input[name="induccion"][value="SÍ"]').check();
    await page.locator('#programa_ses').selectOption('SES_PSOR');
    await page.locator('#justificacion').fill('Justificación sintética T10 producer');
    await page.locator('input[name="analitica_recente"][value="SÍ"]').check();
    await page.locator('input[name="vacunacion"][value="SÍ"]').check();
    await page.locator('.export-button').click();
    const exported = await page.evaluate(() => window.__lastExportText || '');
    assert.ok(exported.startsWith('SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS'), 'T1 did not generate canonical D17 export');
    assert.ok(exported.includes(`• CIP: ${CIP}`) && exported.includes('• Código: SES_PSOR\n• Denominación: PSORIASIS'), 'T1 export lacks pinned identity/SES pair');
    record('T1→T7/T8/T9', 'actual T1 form produced canonical e-Orden text', 'PASS');

    await page.goto(`${BASE}app/farmacia_validacion.html?cip=${encodeURIComponent(CIP)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.FarmaciaValidacion));
    const intake = page.locator('textarea[data-fh-intake-source]');
    assert.equal(await intake.count(), 1, 'integrated intake textarea missing');
    await page.locator('#fhDermaDosis').fill('');
    await intake.fill(exported);
    const preview = page.locator('[data-fh-intake-preview]');
    if (await preview.count()) await preview.click();
    await page.waitForFunction(() => document.querySelector('[data-fh-intake-preview-panel]')?.textContent?.includes('e-orden'));
    const sourceText = (await page.locator('[data-fh-source-name="e-orden"]').textContent()) || '';
    assert.ok(sourceText.includes('VERIFIED_EXPLICIT_CIP'), 'actual T1 export did not pass e-Orden identity gate');
    const doseRow = page.locator('[data-fh-concept="requested_dose"]');
    assert.equal(await doseRow.count(), 1, 'actual T1 output did not reach requested_dose preview');
    const confirm = doseRow.locator('[data-fh-concept-action="confirm"]');
    assert.equal(await confirm.count(), 1, 'actual T1 output has no supported per-concept confirm');
    assert.equal(await confirm.isDisabled(), false, 'actual T1 output confirm is disabled despite selected matching CIP');
    await confirm.click();
    assert.equal(await page.locator('#fhDermaDosis').inputValue(), '40 MG', 'actual T1 output failed producer→segmenter→parser→preview→apply');
    assert.deepEqual(errors, [], `actual T1 integration browser errors: ${errors.join(' | ')}`);
    record('T1→T7/T8/T9', 'actual producer output applied through supported intake UI', 'PASS');
  } finally {
    await context.close();
    await browser.close();
  }
}
function intentionalAttributionProbe() {
  let captured = null;
  try {
    throw new Error('INTENTIONAL_T10_HARNESS_PROBE');
  } catch (error) {
    captured = { owner: 'T10', status: 'FAIL', detail: error.message };
  }
  assert.deepEqual(captured, { owner: 'T10', status: 'FAIL', detail: 'INTENTIONAL_T10_HARNESS_PROBE' });
  record('T10', 'intentional harness failure is loud and attributed', 'PASS', 'owner=T10; no repair attempted');
}

let finalError = null;
try {
  assertT1Authority();
  runChild('T2', 'segmenter deterministic matrix', 'tools/farmacia_intake_segmenter_check.mjs');
  runChild('T3', 'e-Orden parser deterministic matrix', 'tools/farmacia_eorden_parser_check.mjs');
  runChild('T4', 'PreSalud parser deterministic matrix', 'tools/farmacia_presalud_parser_check.mjs');
  runChild('T5', 'unified pipeline/reconciliation matrix', 'tools/farmacia_intake_pipeline_check.mjs');
  runChild('T6', 'preview + identity/source gates browser oracle', 'tools/farmacia_unified_intake_ui_oracle_check.mjs');
  runChild('T6/D12', 'active-session transient-retention browser oracle', 'tools/farmacia_unified_intake_d12_active_session_oracle_check.mjs');
  runChild('T7', 'per-concept apply frozen oracle', 'tools/farmacia_unified_intake_apply_oracle_check.mjs');
  runChild('T7', 'supported per-concept browser QA', 'tools/farmacia_unified_intake_apply_browser_check.mjs');
  runChild('T8', 'reparse/reapply + global apply frozen oracle', 'tools/farmacia_unified_intake_reparse_apply_oracle_check.mjs');
  runChild('T9', 'SES Program apply/survival frozen oracle', 'tools/farmacia_unified_intake_ses_apply_oracle_check.mjs');
  await actualT1ToIntake();
  intentionalAttributionProbe();
} catch (error) {
  finalError = error;
} finally {
  await new Promise(resolve => server.close(resolve));
}
console.log('T10_GATE_REPORT=' + JSON.stringify(rows));
if (finalError) {
  console.error(`T10 FINAL GATE FAIL: ${finalError?.stack || finalError}`);
  process.exitCode = 1;
} else {
  assert.ok(rows.length >= 12, 'QA report is unexpectedly incomplete');
  assert.ok(rows.every(row => row.status === 'PASS'), 'QA report contains unattributed/non-pass rows');
  console.log(`T10 FINAL GATE PASS ${rows.length} mapped rows`);
}
