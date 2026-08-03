#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SYNTHETIC_VISIT_DATE = '2026-09-15';
const MANUAL_CIP = 'CIP-SYN-FOLLOW-BROWSER-01';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_followup_v2_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_export_v2_followup_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache).filter(entry => entry.startsWith('chromium_headless_shell-')).sort().reverse()
    .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'farmacia_seguimiento.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(ROOT, relative);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not_file');
    response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
const BASE_URL = `http://127.0.0.1:${address.port}/`;

const FH001_LINES = [{
  rowKey: 'visible-main', treatmentId: 'treatment-browser-01', lineId: 'BIO-FH-001-L1', lineRole: 'principal',
  isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true,
  drugName: 'Fármaco sintético A', activeIngredient: 'Activo sintético A'
}];
const FH004_LINES = [
  { rowKey: 'visible-b', treatmentId: 'treatment-browser-04', lineId: 'BIO-FH-004-L2', lineRole: 'principal', isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true, drugName: 'Fármaco sintético B', activeIngredient: 'Activo sintético B' },
  { rowKey: 'visible-a', treatmentId: 'treatment-browser-05', lineId: 'BIO-FH-004-L3', lineRole: 'additional', isPrimaryLine: false, lineStatusAtEvent: 'active', activeAtEvent: true, drugName: 'Fármaco sintético C', activeIngredient: 'Activo sintético C' }
];
function technical(lines, overrides = {}) {
  return {
    eventId: 'evt-follow-browser-01', sourceEventId: 'src-follow-browser-01', visitId: 'visit-browser-01', patientId: 'patient-browser-01',
    occurredAt: '2026-08-03T12:00:00Z', recordedAt: '2026-08-03T12:02:00Z', demoFlag: true, eventStatus: 'recorded',
    hospitalCode: 'H-SYN', professionalRef: 'prof-browser', identifierSystem: 'urn:synthetic',
    serviceCode: 'REU', serviceLabel: 'Reumatología', pathologyCode: 'SYN-RA', pathologyLabel: 'Artritis reumatoide', professionalDisplay: 'Profesional sintético',
    identifierValue: 'CIP-DEMO-FH-004', visitDate: SYNTHETIC_VISIT_DATE, activeLines: lines, ...overrides
  };
}
async function bridgeFailure(page, context) {
  return page.evaluate(tc => {
    try { window.FarmaciaSeguimiento.buildFollowupV2Projection(tc); return null; }
    catch (error) { return { name: error.name, code: error.code, message: error.message, details: error.details || null }; }
  }, context);
}
async function switchCip(page, cip, enabledCards) {
  await page.locator('#fhSegCip').fill(cip);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fhSegCipSearchBtn').click();
  await page.waitForFunction(expected => {
    const enabled = Array.from(document.querySelectorAll('input[name="fhSegLineCardSelection"]')).filter(input => !input.disabled);
    return document.getElementById('fhSegCip')?.value.trim() === expected.cip && enabled.length === expected.enabled;
  }, { cip, enabled: enabledCards });
}

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && window.FarmaciaExportV2FollowupActiveLinesAdapter && window.FarmaciaExportV2Core);

  const singleCard = page.locator('input[name="fhSegLineCardSelection"]');
  assert.equal(await singleCard.count(), 1, 'FH-001 renders one line card');
  assert.equal(await singleCard.first().inputValue(), 'BIO-FH-001-L1');
  assert.equal(await singleCard.first().isChecked(), true, 'the single active line is auto-selected by the UI');

  const domDate = await page.locator('#fhSegFecha').inputValue();
  assert.ok(domDate, 'the DOM date control carries the UI-autofilled value');
  const noDateFailure = await bridgeFailure(page, technical(FH001_LINES, { identifierValue: 'CIP-DEMO-FH-001', visitDate: undefined }));
  assert.equal(noDateFailure?.name, 'FarmaciaExportV2FollowupActiveLinesAdapterError');
  assert.equal(noDateFailure?.code, 'INVALID_FOLLOWUP_INPUT');
  assert.ok(noDateFailure?.details?.some(error => error.field === 'visit.visitDate'), 'missing technical visit date is rejected with typed details');
  const fh001Projection = await page.evaluate(tc => window.FarmaciaSeguimiento.buildFollowupV2Projection(tc), technical(FH001_LINES, { identifierValue: 'CIP-DEMO-FH-001' }));
  assert.equal(fh001Projection.rows.length, 1);
  assert.equal(fh001Projection.rows[0].row_role, 'followup_line');
  assert.equal(fh001Projection.rows[0].bridge_status, 'PENDIENTE');
  assert.equal(fh001Projection.rows[0].line_id, 'BIO-FH-001-L1');
  assert.equal(fh001Projection.rows[0].visit_date, SYNTHETIC_VISIT_DATE, 'the technical visit date feeds v2, not the DOM-autofilled control');
  assert.notEqual(fh001Projection.rows[0].visit_date, domDate, 'the DOM-autofilled date is never copied into v2');
  assert.equal(fh001Projection.rows[0].identifier_value, 'CIP-DEMO-FH-001');
  assert.equal(fh001Projection.rows[0].service_label, 'Reumatología');

  await switchCip(page, 'CIP-DEMO-FH-004', 2);
  const enabled = await page.locator('input[name="fhSegLineCardSelection"]:not(:disabled)').evaluateAll(inputs => inputs.map(input => ({ value: input.value, checked: input.checked })));
  assert.deepEqual(enabled.map(item => item.value).sort(), ['BIO-FH-004-L2', 'BIO-FH-004-L3'], 'FH-004 exposes two active lines');
  assert.equal(enabled.every(item => !item.checked), true, 'two active lines are never auto-selected');

  const fh004Projection = await page.evaluate(tc => window.FarmaciaSeguimiento.buildFollowupV2Projection(tc), technical(FH004_LINES));
  assert.equal(fh004Projection.rows.length, 2);
  assert.deepEqual(Array.from(fh004Projection.rows, row => row.line_id), ['BIO-FH-004-L2', 'BIO-FH-004-L3'], 'explicit activeLines order is preserved');
  assert.deepEqual(Array.from(fh004Projection.rows, row => row.row_index), [1, 2]);
  assert.deepEqual(Array.from(fh004Projection.rows, row => row.row_count), [2, 2]);
  assert.deepEqual(Array.from(fh004Projection.rows, row => row.is_primary_line), [true, false]);
  assert.deepEqual(Array.from(fh004Projection.rows, row => row.line_role), ['principal', 'additional']);
  assert.equal(fh004Projection.rows[0].event_id, fh004Projection.rows[1].event_id);
  assert.equal(fh004Projection.rows[0].visit_id, fh004Projection.rows[1].visit_id);

  const partialProjection = await page.evaluate(tc => window.FarmaciaSeguimiento.buildFollowupV2Projection(tc), technical([FH004_LINES[0]]));
  assert.equal(partialProjection.rows.length, 1, 'an extra visible line is not incorporated');
  assert.equal(partialProjection.rows[0].line_id, 'BIO-FH-004-L2');
  assert.equal(await page.locator('input[name="fhSegLineCardSelection"]:not(:disabled)').count(), 2, 'the extra visible line stays visible');

  const notVisible = await bridgeFailure(page, technical([FH004_LINES[0], { ...FH004_LINES[1], lineId: 'BIO-FH-004-XX' }]));
  assert.equal(notVisible?.name, 'FarmaciaSeguimientoV2BridgeError');
  assert.equal(notVisible?.code, 'BRIDGE_LINE_NOT_VISIBLE');
  const otherPatientLine = await bridgeFailure(page, technical([FH004_LINES[0], { ...FH004_LINES[1], lineId: 'BIO-FH-001-L1' }]));
  assert.equal(otherPatientLine?.code, 'BRIDGE_LINE_NOT_VISIBLE', 'a line of another patient has no visible correspondence');

  const noMutation = await page.evaluate(tc => {
    const before = JSON.stringify({ tc, lines: tc.activeLines });
    window.FarmaciaSeguimiento.buildFollowupV2Projection(tc);
    return { unchanged: JSON.stringify({ tc, lines: tc.activeLines }) === before };
  }, technical(FH004_LINES));
  assert.equal(noMutation.unchanged, true, 'the bridge never mutates the technical context or activeLines');

  assert.ok((await page.locator('#fhSegAutocompleteBlock').getAttribute('class') || '').includes('hidden'), 'with visible lines the catalog search stays hidden');

  await page.locator('.seg-line-card:has(input[value="BIO-FH-004-L2"])').click();
  await page.locator('#fhSegDispensado').waitFor({ state: 'visible' });
  await page.locator('#fhSegDispensado').selectOption('si');
  await page.waitForFunction(() => window.FarmaciaSeguimiento.getCurrentVisit().dispensed_line_ids.includes('BIO-FH-004-L2'));
  const jara = await page.evaluate(() => window.FarmaciaSeguimiento.buildSegLines().join('\n'));
  const csv = await page.evaluate(() => window.FarmaciaSeguimiento.buildFollowupCsv(window.FarmaciaSeguimiento.buildFollowupVisitExportModel()));
  assert.ok(jara.includes('BIO-FH-004-L2'), 'JARA keeps the v1 selected line');
  assert.ok(csv.length > 0 && csv.includes('BIO-FH-004-L2'), 'CSV v1 still builds for the dispensed line');
  await page.evaluate(() => {
    window.__followupExcelCapture = null;
    window.FarmaciaExcelRowExport.copyTSVRowsToClipboard = (rows, options) => {
      window.__followupExcelCapture = { rows: rows.map(row => [...row]), options: { ...(options || {}) } };
      return Promise.resolve(true);
    };
  });
  await page.locator('#fhSegExcelExportBtn').click();
  const excelCapture = await page.evaluate(() => window.__followupExcelCapture);
  assert.ok(excelCapture && excelCapture.rows.length >= 1, 'visible v1 Excel action reaches its output boundary');
  assert.equal(excelCapture.rows[0].length, 61, 'v1 Excel output remains exactly 61 columns');

  assert.equal(await page.getByRole('button', { name: /v2/i }).count(), 0, 'there is no public v2 button');
  assert.equal(await page.locator('a[download*="v2"], button[download*="v2"]').count(), 0, 'there is no public v2 download');

  await switchCip(page, 'CIP-DEMO-FH-002', 0);
  const staleCip = await bridgeFailure(page, technical(FH004_LINES));
  assert.equal(staleCip?.name, 'FarmaciaSeguimientoV2BridgeError');
  assert.equal(staleCip?.code, 'BRIDGE_CIP_MISMATCH', 'stale patient context is rejected on CIP switch');
  const noVisibleLines = await bridgeFailure(page, technical(FH004_LINES, { identifierValue: 'CIP-DEMO-FH-002' }));
  assert.equal(noVisibleLines?.code, 'BRIDGE_LINE_NOT_VISIBLE', 'technical lines without visible correspondence are rejected');
  const zeroLines = await bridgeFailure(page, technical([], { identifierValue: 'CIP-DEMO-FH-002' }));
  assert.equal(zeroLines?.name, 'FarmaciaSeguimientoV2BridgeError');
  assert.equal(zeroLines?.code, 'BRIDGE_EMPTY_ACTIVE_LINES', 'zero active lines fail safely');

  await page.goto(new URL(`farmacia_seguimiento.html?cip=${MANUAL_CIP}`, BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && window.FarmaciaExportV2FollowupActiveLinesAdapter && window.FarmaciaExportV2Core);
  await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded === true, null, { timeout: 15000 });
  assert.equal(await page.locator('input[name="fhSegLineCardSelection"]').count(), 0, 'the manual patient has no visible lines');
  assert.ok(!(await page.locator('#fhSegAutocompleteBlock').getAttribute('class') || '').includes('hidden'), 'without lines the catalog search is visible');
  const catalogCandidate = await page.evaluate(() => {
    const drug = window.FarmaciaCatalog.drugs.find(item => item.drug_id && item.principio_activo && (item.display_name || item.nombre_comercial));
    if (!drug) return null;
    return { visibleName: drug.display_name || drug.nombre_comercial };
  });
  assert.ok(catalogCandidate, 'local synthetic/demo catalog exposes a selectable complete item');
  await page.locator('#fhSegDrugSearch').fill(catalogCandidate.visibleName);
  await page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first().waitFor({ state: 'visible' });
  await page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first().click();
  assert.equal(await page.locator('input[name="fhSegLineCardSelection"]').count(), 0, 'catalog selection never creates a line card');
  const zeroManual = await bridgeFailure(page, technical([], { identifierValue: MANUAL_CIP }));
  assert.equal(zeroManual?.code, 'BRIDGE_EMPTY_ACTIVE_LINES', 'zero active lines fail safely on a manual patient');
  const fabricatedLine = await bridgeFailure(page, technical([FH001_LINES[0]], { identifierValue: MANUAL_CIP }));
  assert.equal(fabricatedLine?.code, 'BRIDGE_LINE_NOT_VISIBLE', 'a fabricated line has no visible correspondence on a manual patient');

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('PASS: Followup Export v2 browser QA (Chromium, ephemeral server).');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
