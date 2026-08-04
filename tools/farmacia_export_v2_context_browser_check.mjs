#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (existsSync(path.join(nodeModules, 'playwright', 'package.json'))) return createRequire(path.join(nodeModules, '__fh_v2_context_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_export_v2_context_browser_check.mjs');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache).filter(entry => entry.startsWith('chromium_headless_shell-')).sort().reverse().map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}
const mime = new Map([['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]);
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
const expectedFh004 = {
  eventId: 'evt-syn-v2-followup-fh004', sourceEventId: 'src-syn-v2-followup-fh004', visitId: 'visit-syn-v2-followup-fh004',
  patientId: 'patient-syn-v2-delta', occurredAt: '2026-08-04T11:00:00Z', recordedAt: '2026-08-04T11:01:00Z', visitDate: '2026-08-04',
  demoFlag: true, eventStatus: 'recorded', identifierValue: 'CIP-DEMO-FH-004',
  activeLines: [
    {
      rowKey: 'row-syn-v2-followup-fh004-l2', treatmentId: 'TRAT-FH-004-B', lineId: 'BIO-FH-004-L2', lineRole: 'principal', isPrimaryLine: true,
      lineStatusAtEvent: 'active', activeAtEvent: true, drugName: 'Belimumab', activeIngredient: 'Belimumab', presentation: null, doseText: '200 mg', route: 'SC',
      scheduleCode: null, scheduleLabel: 'Semanal', scheduleOtherText: null, selectedDrugId: null, catalogSource: null, nationalCode: null, registrationNumber: null
    },
    {
      rowKey: 'row-syn-v2-followup-fh004-l3', treatmentId: 'TRAT-FH-004-C', lineId: 'BIO-FH-004-L3', lineRole: 'additional', isPrimaryLine: false,
      lineStatusAtEvent: 'active', activeAtEvent: true, drugName: 'Rituximab', activeIngredient: 'Rituximab', presentation: null, doseText: '1 g', route: 'IV',
      scheduleCode: null, scheduleLabel: 'Días 1 y 15 cada 6 meses', scheduleOtherText: null, selectedDrugId: null, catalogSource: null, nationalCode: null, registrationNumber: null
    }
  ]
};
const projectionIdentity = projection => ({
  eventId: projection.event.event_id,
  sourceEventId: projection.event.source_event_id,
  rows: projection.rows.map(row => ({ rowId: row.row_id, treatmentId: row.treatment_id, lineId: row.line_id }))
});
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
const browserContext = await browser.newContext();
const page = await browserContext.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

async function assertNoPublicV2() {
  assert.equal(await page.getByRole('button', { name: /v2/i }).count(), 0);
  assert.equal(await page.locator('a[download*="v2"], button[download*="v2"]').count(), 0);
}
async function wrapperFailure(apiName, wrapperName, overrides = {}) {
  return page.evaluate(({ apiName, wrapperName, overrides }) => {
    const originalProvider = window.FarmaciaExportV2TechnicalContext;
    const adapterName = overrides.adapterName || '';
    const originalAdapter = adapterName ? window[adapterName] : null;
    if (overrides.providerUnavailable) window.FarmaciaExportV2TechnicalContext = undefined;
    if (overrides.providerContext) {
      window.FarmaciaExportV2TechnicalContext = { PROVIDER_VERSION: '1.0.0-draft.1', getContext: () => overrides.providerContext };
    }
    if (overrides.adapterUnavailable && adapterName) window[adapterName] = undefined;
    try { window[apiName][wrapperName](); return null; }
    catch (error) { return { name: error.name, code: error.code }; }
    finally {
      window.FarmaciaExportV2TechnicalContext = originalProvider;
      if (adapterName) window[adapterName] = originalAdapter;
    }
  }, { apiName, wrapperName, overrides });
}
async function switchFollowup(cip, expectedLines) {
  await page.locator('#fhSegCip').fill(cip);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#fhSegCipSearchBtn').click();
  await page.waitForFunction(expected => document.getElementById('fhSegCip')?.value === expected.cip && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === expected.lines, { cip, lines: expectedLines });
}

try {
  await page.goto(new URL('farmacia_validacion.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion && window.FarmaciaExportV2TechnicalContext);
  const validation = await page.evaluate(() => {
    const first = window.FarmaciaValidacion.buildValidationV2ProjectionFromCurrentContext();
    const second = window.FarmaciaValidacion.buildValidationV2ProjectionFromCurrentContext();
    return { first, second, context: window.FarmaciaValidacion.getValidationV2TechnicalContext() };
  });
  assert.equal(validation.first.event.event_id, 'evt-syn-v2-validation-fh001');
  assert.equal(validation.first.tsv, validation.second.tsv);
  assert.equal(validation.context.demoFlag, true);
  assert.deepEqual(await wrapperFailure('FarmaciaValidacion', 'buildValidationV2ProjectionFromCurrentContext', { providerUnavailable: true }), { name: 'FarmaciaValidacionV2ContextError', code: 'V2_CONTEXT_PROVIDER_UNAVAILABLE' });
  assert.deepEqual(await wrapperFailure('FarmaciaValidacion', 'buildValidationV2ProjectionFromCurrentContext', { providerContext: { demoFlag: true } }), { name: 'FarmaciaValidacionV2ContextError', code: 'V2_CONTEXT_INCOMPLETE' });
  assert.deepEqual(await wrapperFailure('FarmaciaValidacion', 'buildValidationV2ProjectionFromCurrentContext', { adapterName: 'FarmaciaExportV2ValidationAdapter', adapterUnavailable: true }), { name: 'FarmaciaValidacionV2ContextError', code: 'V2_ADAPTER_UNAVAILABLE' });
  assert.ok(await page.locator('#fhValExportTxt').count());
  assert.ok(await page.locator('#fhValExportCsv').count());
  assert.ok(await page.locator('#fhValExcelExportBtn').count());
  await assertNoPublicV2();

  await page.goto(new URL('farmacia_validacion.html?cip=CIP-DEMO-FH-002', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaValidacion && document.getElementById('fhDermaCip')?.value === 'CIP-DEMO-FH-002');
  await page.locator('#fhDermaCip').fill('CIP-DEMO-FH-001');
  assert.deepEqual(await wrapperFailure('FarmaciaValidacion', 'buildValidationV2ProjectionFromCurrentContext'), { name: 'FarmaciaValidacionV2ContextError', code: 'V2_CONTEXT_STALE' });

  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && window.FarmaciaExportV2TechnicalContext);
  await page.locator('#fhPvFecha').fill('2026-08-04');
  const firstVisit = await page.evaluate(() => {
    const first = window.FarmaciaPrimeraVisita.buildFirstVisitV2ProjectionFromCurrentContext();
    const second = window.FarmaciaPrimeraVisita.buildFirstVisitV2ProjectionFromCurrentContext();
    return { first, second, context: window.FarmaciaPrimeraVisita.getFirstVisitV2TechnicalContext() };
  });
  assert.equal(firstVisit.first.rows.length, 1);
  assert.equal(firstVisit.first.event.event_id, 'evt-syn-v2-first-visit-fh001');
  assert.deepEqual(await wrapperFailure('FarmaciaPrimeraVisita', 'buildFirstVisitV2ProjectionFromCurrentContext', { providerUnavailable: true }), { name: 'FarmaciaPrimeraVisitaV2ContextError', code: 'V2_CONTEXT_PROVIDER_UNAVAILABLE' });
  assert.deepEqual(await wrapperFailure('FarmaciaPrimeraVisita', 'buildFirstVisitV2ProjectionFromCurrentContext', { providerContext: { demoFlag: true } }), { name: 'FarmaciaPrimeraVisitaV2ContextError', code: 'V2_CONTEXT_INCOMPLETE' });
  assert.deepEqual(await wrapperFailure('FarmaciaPrimeraVisita', 'buildFirstVisitV2ProjectionFromCurrentContext', { adapterName: 'FarmaciaExportV2FirstVisitAdapter', adapterUnavailable: true }), { name: 'FarmaciaPrimeraVisitaV2ContextError', code: 'V2_ADAPTER_UNAVAILABLE' });
  assert.ok(await page.locator('#fhPvExportTxt').count());
  assert.ok(await page.locator('#fhPvExportCsv').count());
  await assertNoPublicV2();

  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-002', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaPrimeraVisita && document.getElementById('fhPvCip')?.value === 'CIP-DEMO-FH-002');
  await page.locator('#fhPvCip').fill(' cip-demo-fh-001 ');
  assert.deepEqual(await wrapperFailure('FarmaciaPrimeraVisita', 'buildFirstVisitV2ProjectionFromCurrentContext'), { name: 'FarmaciaPrimeraVisitaV2ContextError', code: 'V2_CONTEXT_STALE' });

  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && window.FarmaciaExportV2TechnicalContext);
  const fh001 = await page.evaluate(() => {
    const first = window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext();
    const second = window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext();
    return { first, second, context: window.FarmaciaSeguimiento.getFollowupV2TechnicalContext() };
  });
  assert.equal(fh001.first.rows.length, 1);
  assert.equal(fh001.first.event.event_id, 'evt-syn-v2-followup-fh001');
  assert.deepEqual(
    [validation.context.patientId, firstVisit.context.patientId, fh001.context.patientId],
    Array(3).fill('patient-syn-v2-alpha'),
    'FH-001 Validation, First Visit and Follow-up share patientId'
  );
  assert.deepEqual(
    [firstVisit.context.lineContext.treatmentId, fh001.context.activeLines[0].treatmentId],
    Array(2).fill('treatment-syn-v2-fh001-l1'),
    'FH-001 First Visit and Follow-up share treatmentId'
  );
  assert.deepEqual(
    [firstVisit.context.lineContext.lineId, fh001.context.activeLines[0].lineId],
    Array(2).fill('BIO-FH-001-L1'),
    'FH-001 First Visit and Follow-up share lineId'
  );
  assert.equal(new Set([validation.context.eventId, firstVisit.context.eventId, fh001.context.eventId]).size, 3, 'FH-001 eventId remains event-specific');
  assert.equal(new Set([validation.context.sourceEventId, firstVisit.context.sourceEventId, fh001.context.sourceEventId]).size, 3, 'FH-001 sourceEventId remains event-specific');
  assert.equal(new Set([validation.context.occurredAt, firstVisit.context.occurredAt, fh001.context.occurredAt]).size, 3, 'FH-001 occurredAt remains event-specific');
  assert.equal(new Set([validation.context.recordedAt, firstVisit.context.recordedAt, fh001.context.recordedAt]).size, 3, 'FH-001 recordedAt remains event-specific');
  assert.notEqual(firstVisit.context.firstVisitId, fh001.context.visitId, 'FH-001 act IDs remain event-specific');
  assert.equal(validation.context.rowKey, 'row-syn-v2-validation-fh001', 'Validation FH-001 rowKey remains exact');
  assert.equal(firstVisit.context.lineContext.rowKey, 'row-syn-v2-first-visit-fh001-l1', 'First Visit FH-001 rowKey remains exact');
  assert.equal(fh001.context.activeLines[0].rowKey, 'row-syn-v2-followup-fh001-l1', 'Follow-up FH-001 rowKey remains exact');
  assert.equal(new Set([
    validation.context.rowKey,
    firstVisit.context.lineContext.rowKey,
    fh001.context.activeLines[0].rowKey
  ]).size, 3, 'Validation, First Visit and Follow-up FH-001 rowKeys remain event-specific');
  assert.deepEqual(
    [firstVisit.first.rows[0].treatment_id, firstVisit.first.rows[0].line_id],
    [fh001.first.rows[0].treatment_id, fh001.first.rows[0].line_id],
    'FH-001 projections retain the same treatment_id and line_id'
  );
  assert.deepEqual(projectionIdentity(firstVisit.first), projectionIdentity(firstVisit.second), 'repeated First Visit projection IDs remain stable');
  assert.equal(firstVisit.first.tsv, firstVisit.second.tsv, 'repeated First Visit TSV remains stable');
  assert.deepEqual(projectionIdentity(fh001.first), projectionIdentity(fh001.second), 'repeated Follow-up projection IDs remain stable');
  assert.equal(fh001.first.tsv, fh001.second.tsv, 'repeated Follow-up TSV remains stable');
  assert.deepEqual(await wrapperFailure('FarmaciaSeguimiento', 'buildFollowupV2ProjectionFromCurrentContext', { providerUnavailable: true }), { name: 'FarmaciaSeguimientoV2BridgeError', code: 'V2_CONTEXT_PROVIDER_UNAVAILABLE' });
  assert.deepEqual(await wrapperFailure('FarmaciaSeguimiento', 'buildFollowupV2ProjectionFromCurrentContext', { adapterName: 'FarmaciaExportV2FollowupActiveLinesAdapter', adapterUnavailable: true }), { name: 'FarmaciaSeguimientoV2BridgeError', code: 'V2_ADAPTER_UNAVAILABLE' });
  const directFollowupAdapterFailure = await page.evaluate(() => {
    const original = window.FarmaciaExportV2FollowupActiveLinesAdapter;
    const context = window.FarmaciaExportV2TechnicalContext.getContext('followup', 'CIP-DEMO-FH-001');
    window.FarmaciaExportV2FollowupActiveLinesAdapter = undefined;
    try { window.FarmaciaSeguimiento.buildFollowupV2Projection(context); return null; }
    catch (error) { return { name: error.name, code: error.code }; }
    finally { window.FarmaciaExportV2FollowupActiveLinesAdapter = original; }
  });
  assert.deepEqual(directFollowupAdapterFailure, { name: 'FarmaciaSeguimientoV2BridgeError', code: 'BRIDGE_ADAPTER_UNAVAILABLE' });
  const malformedFollowup = await page.evaluate(() => {
    const original = window.FarmaciaExportV2TechnicalContext;
    const base = original.getContext('followup', 'CIP-DEMO-FH-001');
    const variants = [
      context => { delete context.eventId; },
      context => { context.visitId = 42; },
      context => { context.patientId = ''; },
      context => { context.demoFlag = 'true'; },
      context => { context.activeLines[0].activeAtEvent = undefined; },
      context => { context.activeLines[0].lineRole = ''; },
      context => { context.activeLines[0].presentation = 42; }
    ];
    return variants.map(mutate => {
      const malformed = JSON.parse(JSON.stringify(base));
      mutate(malformed);
      window.FarmaciaExportV2TechnicalContext = { PROVIDER_VERSION: '1.0.0-draft.1', getContext: () => malformed };
      try { window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext(); return null; }
      catch (error) { return { name: error.name, code: error.code }; }
      finally { window.FarmaciaExportV2TechnicalContext = original; }
    });
  });
  malformedFollowup.forEach(failure => assert.deepEqual(failure, { name: 'FarmaciaSeguimientoV2BridgeError', code: 'V2_CONTEXT_INCOMPLETE' }));
  const semanticFollowup = await page.evaluate(() => {
    const original = window.FarmaciaExportV2TechnicalContext;
    const cases = [
      { field: 'lineRole', value: 'primary', semanticCode: 'INVALID_LINE_ROLE' },
      { field: 'lineStatusAtEvent', value: 'inactive', semanticCode: 'FOLLOWUP_LINE_STATUS' }
    ];
    return cases.map(testCase => {
      const context = original.getContext('followup', 'CIP-DEMO-FH-001');
      context.activeLines[0][testCase.field] = testCase.value;
      window.FarmaciaExportV2TechnicalContext = { PROVIDER_VERSION: '1.0.0-draft.1', getContext: () => context };
      try {
        const getterContext = window.FarmaciaSeguimiento.getFollowupV2TechnicalContext();
        try { window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext(); return { getterPassed: getterContext === context, failure: null, semanticCode: testCase.semanticCode }; }
        catch (error) { return { getterPassed: getterContext === context, failure: { name: error.name, code: error.code, detailCodes: (error.details || []).map(detail => detail.code) }, semanticCode: testCase.semanticCode }; }
      } finally {
        window.FarmaciaExportV2TechnicalContext = original;
      }
    });
  });
  semanticFollowup.forEach(result => {
    assert.equal(result.getterPassed, true);
    assert.equal(result.failure?.name, 'FarmaciaExportV2FollowupActiveLinesAdapterError');
    assert.equal(result.failure?.code, 'INVALID_FOLLOWUP_INPUT');
    assert.ok(result.failure?.detailCodes.includes(result.semanticCode));
  });

  await switchFollowup('CIP-DEMO-FH-004', 2);
  const fh004Context = await page.evaluate(() => window.FarmaciaSeguimiento.getFollowupV2TechnicalContext());
  const fh004 = await page.evaluate(() => {
    const first = window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext();
    const second = window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext();
    return { first, second };
  });
  assert.deepEqual(fh004Context, expectedFh004, 'FH-004 identity and values remain intact');
  assert.deepEqual(
    Array.from(fh004.first.rows, row => [row.treatment_id, row.line_id]),
    [['TRAT-FH-004-B', 'BIO-FH-004-L2'], ['TRAT-FH-004-C', 'BIO-FH-004-L3']],
    'FH-004 projection identities remain intact'
  );
  assert.deepEqual(Array.from(fh004.first.rows, row => row.line_id), ['BIO-FH-004-L2', 'BIO-FH-004-L3']);
  assert.equal(fh004.first.tsv, fh004.second.tsv);
  assert.deepEqual(Array.from(fh004.first.rows, row => row.row_index), [1, 2]);
  const lineFailures = await page.evaluate(() => {
    const provider = window.FarmaciaExportV2TechnicalContext;
    function failure(context) {
      try { window.FarmaciaSeguimiento.buildFollowupV2Projection(context); return null; }
      catch (error) { return { name: error.name, code: error.code, detailCodes: Array.isArray(error.details) ? error.details.map(detail => detail.code) : [] }; }
    }
    const absent = provider.getContext('followup', 'CIP-DEMO-FH-004');
    absent.activeLines[0].lineId = 'BIO-FH-004-ABSENT';
    const duplicateTechnical = provider.getContext('followup', 'CIP-DEMO-FH-004');
    duplicateTechnical.activeLines[1].lineId = duplicateTechnical.activeLines[0].lineId;
    const duplicateFailure = failure(duplicateTechnical);
    window.FarmaciaSeguimiento.syncLinesForPatient({
      cip: 'CIP-SYN-VISIBLE-AMBIGUOUS',
      biologicos: [
        { linea_id: 'BIO-FH-004-L2', estado_linea: 'active', tipo_relacion: 'base', nombre_linea: 'Visible sintética A', principio_activo: 'Activo sintético A' },
        { linea_id: 'BIO-FH-004-L2', estado_linea: 'active', tipo_relacion: 'tratamiento_añadido', nombre_linea: 'Visible sintética B', principio_activo: 'Activo sintético B' }
      ]
    });
    const ambiguous = failure(provider.getContext('followup', 'CIP-DEMO-FH-004'));
    return { absent: failure(absent), duplicateTechnical: duplicateFailure, ambiguous };
  });
  assert.deepEqual(lineFailures.absent, { name: 'FarmaciaSeguimientoV2BridgeError', code: 'BRIDGE_LINE_NOT_VISIBLE', detailCodes: [] });
  assert.equal(lineFailures.duplicateTechnical.name, 'FarmaciaExportV2FollowupActiveLinesAdapterError');
  assert.equal(lineFailures.duplicateTechnical.code, 'INVALID_FOLLOWUP_INPUT');
  assert.ok(lineFailures.duplicateTechnical.detailCodes.includes('DUPLICATE_LINE_ID'));
  assert.deepEqual(lineFailures.ambiguous, { name: 'FarmaciaSeguimientoV2BridgeError', code: 'BRIDGE_AMBIGUOUS_LINE', detailCodes: [] });

  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-004', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === 2);

  await switchFollowup('CIP-DEMO-FH-002', 0);
  const stale = await page.evaluate(context => {
    try { window.FarmaciaSeguimiento.buildFollowupV2Projection(context); return null; }
    catch (error) { return { name: error.name, code: error.code }; }
  }, fh004Context);
  assert.deepEqual(stale, { name: 'FarmaciaSeguimientoV2BridgeError', code: 'BRIDGE_CIP_MISMATCH' });

  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-SYN-MANUAL-UNREGISTERED', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && window.FarmaciaExportV2TechnicalContext);
  const unavailable = await page.evaluate(() => {
    try { window.FarmaciaSeguimiento.buildFollowupV2ProjectionFromCurrentContext(); return null; }
    catch (error) { return { name: error.name, code: error.code }; }
  });
  assert.deepEqual(unavailable, { name: 'FarmaciaSeguimientoV2BridgeError', code: 'V2_CONTEXT_UNAVAILABLE' });
  assert.ok(await page.locator('#fhSegExportTxt').count());
  assert.ok(await page.locator('#fhSegExportCsv').count());
  assert.ok(await page.locator('#fhSegExcelExportBtn').count());
  await assertNoPublicV2();

  await page.goto(new URL('farmacia_seguimiento.html?cip=CIP-DEMO-FH-004', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaSeguimiento && document.querySelectorAll('input[name="fhSegLineCardSelection"]:not(:disabled)').length === 2);
  await page.locator('.seg-line-card:has(input[value="BIO-FH-004-L2"])').click();
  await page.locator('#fhSegDispensado').selectOption('si');
  await page.waitForFunction(() => window.FarmaciaSeguimiento.getCurrentVisit().dispensed_line_ids.includes('BIO-FH-004-L2'));
  const v1 = await page.evaluate(() => ({
    jara: window.FarmaciaSeguimiento.buildSegLines().join('\n'),
    csv: window.FarmaciaSeguimiento.buildFollowupCsv(window.FarmaciaSeguimiento.buildFollowupVisitExportModel())
  }));
  assert.ok(v1.jara.includes('BIO-FH-004-L2'));
  assert.ok(v1.csv.includes('BIO-FH-004-L2'));
  await page.evaluate(() => {
    window.__contextExcelCapture = null;
    window.FarmaciaExcelRowExport.copyTSVRowsToClipboard = rows => { window.__contextExcelCapture = rows.map(row => [...row]); return Promise.resolve(true); };
  });
  await page.locator('#fhSegExcelExportBtn').click();
  const excelRows = await page.evaluate(() => window.__contextExcelCapture);
  assert.ok(excelRows?.length);
  assert.equal(excelRows[0].length, 61);
  await assertNoPublicV2();

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('PASS: Farmacia Export v2 technical-context joint browser QA (Chromium, ephemeral server).');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
