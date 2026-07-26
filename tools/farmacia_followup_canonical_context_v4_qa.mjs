#!/usr/bin/env node

import {
  assert, browser, page, consoleErrors, pageErrors, clearSession, importNursingWorkbook,
  waitValidation, assertRealImportBoard
} from './farmacia_v4_validation_browser_qa_helpers.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const START_DATE = '2026-07-26';
const downloads = [];
page.on('download', (download) => downloads.push(download.suggestedFilename()));

async function clipboard(value) {
  if (value !== undefined) await page.evaluate((next) => navigator.clipboard.writeText(next), value);
  return page.evaluate(() => navigator.clipboard.readText());
}

async function waitContext(code) {
  await page.waitForFunction((expected) => document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode === expected, code);
  return page.evaluate(() => ({
    code: document.getElementById('fhSegCanonicalStatus')?.dataset.statusCode,
    state: document.getElementById('fhSegCanonicalContext')?.dataset.contextState,
    patientId: document.getElementById('fhSegCanonicalContext')?.dataset.patientId,
    lineId: document.getElementById('fhSegCanonicalContext')?.dataset.lineId,
    status: document.getElementById('fhSegCanonicalLineStatus')?.textContent.trim(),
    relationship: document.getElementById('fhSegCanonicalRelationship')?.textContent.trim(),
    provenance: document.getElementById('fhSegCanonicalProvenance')?.textContent.trim()
  }));
}

async function assertPermanentGate() {
  for (const id of ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn']) {
    assert.equal(await page.locator(`#${id}`).isDisabled(), true, `${id} disabled`);
    assert.equal(await page.locator(`#${id}`).getAttribute('aria-disabled'), 'true');
    assert.match(await page.locator(`#${id}`).getAttribute('title'), /Contexto canónico de línea preparado/);
  }
  for (const selector of ['#btnSegAddOtherDrug', '#fhSegFecha', '#fhSegOptimiza', '#fhSegProms', '#fhSeguimientoEaPresente', '#fhCausalidadFinal']) {
    assert.equal(await page.locator(selector).isDisabled(), true, `${selector} disabled`);
  }
  assert.equal(await page.locator('#fhSegCip').isDisabled(), false);
  assert.equal(await page.locator('#fhSegCipSearchBtn').isDisabled(), false);
}

async function assertOutputsCannotExecute(label) {
  await clipboard(`sentinel-${label}`);
  const before = downloads.length;
  for (const id of ['fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn']) {
    await page.locator(`#${id}`).dispatchEvent('click');
  }
  const directResults = await page.evaluate(() => [
    window.FarmaciaDemo.copyTextToClipboard('DIRECT-COPY-MUST-BE-BLOCKED'),
    window.FarmaciaDemo.downloadFile('direct-must-not-download.csv', 'blocked', 'text/csv'),
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard(['DIRECT-EXCEL-MUST-BE-BLOCKED'])
  ]);
  assert.deepEqual(directResults, [false, false, false], `${label}: downstream guards return safely`);
  await page.waitForTimeout(100);
  assert.equal(await clipboard(), `sentinel-${label}`, `${label}: clipboard unchanged`);
  assert.equal(downloads.length, before, `${label}: no download`);
}

async function searchCip(cip, mode = 'click') {
  await page.fill('#fhSegCip', cip);
  if (mode === 'enter') await page.press('#fhSegCip', 'Enter');
  else await page.click('#fhSegCipSearchBtn');
}

async function manipulate(patientId, lineId, expectedCode, cip = '', reload = false) {
  const url = new URL('/farmacia_seguimiento.html', BASE_URL);
  url.searchParams.set('patient_id', patientId);
  url.searchParams.set('line_id', lineId);
  if (cip) url.searchParams.set('cip', cip);
  url.searchParams.set('entrada', 'seguimiento');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  let result = await waitContext(expectedCode);
  assert.equal(result.state, 'blocked');
  await assertPermanentGate();
  if (reload) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    result = await waitContext(expectedCode);
    assert.equal(result.state, 'blocked');
  }
}

async function verifyInicioQuickViewLinks() {
  await page.goto(`${BASE_URL}/farmacia_index.html?qa_fixture=v4`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaDemo?.ready);
  await page.evaluate(() => window.FarmaciaDemo.ready);
  const scenarios = [
    ['FH-V4-0009', 'fhv4-patient-s09', 'fhv4-line-s09'],
    ['FH-V4-0010', 'fhv4-patient-s10', 'fhv4-line-s10-active'],
    ['FH-V4-0011', 'fhv4-patient-s11', null]
  ];
  for (const [cip, patientId, lineId] of scenarios) {
    await page.fill('#fhCipInput', cip);
    await page.click('#fhSearchBtn');
    await page.waitForSelector('#fhQuickViewPanel:not(.hidden)');
    await page.waitForFunction((expected) => document.getElementById('fhSubtitle')?.textContent === expected, cip);
    await page.waitForFunction((expected) => document.querySelector('#fhQvActions [data-v4-action="seguimiento"]')?.getAttribute('href')?.includes(expected), patientId);
    const href = await page.locator('#fhQvActions [data-v4-action="seguimiento"]').getAttribute('href');
    const target = new URL(href, BASE_URL);
    assert.equal(target.pathname.endsWith('/farmacia_seguimiento.html'), true);
    assert.equal(target.searchParams.get('patient_id'), patientId);
    assert.equal(target.searchParams.get('line_id'), lineId);
    assert.equal(target.searchParams.get('line_id')?.includes('historical') || false, false);
    await page.locator('[data-fh-qv-close]').last().click();
  }
}

try {
  // S08: supported import -> validation -> First Visit -> explicit start -> Continue.
  await clearSession();
  await importNursingWorkbook();
  const importedC = await assertRealImportBoard();
  await importedC.locator('[data-enf-action="validar"]').click();
  await waitValidation();
  await page.selectOption('#fhValEstado', 'validated');
  await page.click('#fhValSaveV4');
  await page.waitForFunction(() => /Validado · pendiente de inicio/.test(document.getElementById('fhValV4Status')?.textContent || ''));
  const validated = await page.evaluate(() => window.FarmaciaValidationTransitionGuardV4.canonicalSnapshot());
  const validatedPatientId = await page.evaluate(() => window.FarmaciaDemo.getQueryContext().patient.patient_id);
  assert.ok(validatedPatientId);
  assert.ok(validated.produced_line_id);

  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/farmacia_primera_visita.html')),
    page.locator('#fhValGoFirstVisitV4:not(.hidden)').click()
  ]);
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="ready"]');
  await page.fill('#fhPvFecha', START_DATE);
  await page.click('#fhPvConfirmStart');
  await page.waitForSelector('#fhPvCanonicalContext[data-context-state="active"]');
  const handoffHref = await page.locator('#fhPvGoFollowup:not(.hidden)').getAttribute('href');
  const handoffUrl = new URL(handoffHref, BASE_URL);
  const supportedCip = handoffUrl.searchParams.get('cip');
  assert.ok(supportedCip);
  assert.equal(handoffUrl.searchParams.get('patient_id'), validatedPatientId);
  assert.equal(handoffUrl.searchParams.get('line_id'), validated.produced_line_id);
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/farmacia_seguimiento.html')),
    page.locator('#fhPvGoFollowup').click()
  ]);
  let context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.patientId, validatedPatientId);
  assert.equal(context.lineId, validated.produced_line_id);
  assert.equal(context.status, 'active');
  assert.match(context.provenance, /validated_in_hub/);
  await assertPermanentGate();
  await assertOutputsCannotExecute('s08-ready');

  await page.reload({ waitUntil: 'domcontentloaded' });
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.patientId, validatedPatientId);
  assert.equal(context.lineId, validated.produced_line_id);

  // The supported imported Hub identity must be recoverable from CIP alone by click and Enter.
  for (const mode of ['click', 'enter']) {
    await page.goto(`${BASE_URL}/farmacia_seguimiento.html`, { waitUntil: 'domcontentloaded' });
    await waitContext('PATIENT_NOT_FOUND');
    await searchCip(supportedCip, mode);
    context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
    assert.equal(context.patientId, validatedPatientId);
    assert.equal(context.lineId, validated.produced_line_id);
    assert.equal(new URL(page.url()).searchParams.get('patient_id'), validatedPatientId);
    assert.equal(new URL(page.url()).searchParams.get('line_id'), validated.produced_line_id);
    await assertPermanentGate();
    await assertOutputsCannotExecute(`s08-cip-${mode}`);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.patientId, validatedPatientId);
  assert.equal(context.lineId, validated.produced_line_id);

  // A resolvable CIP from another imported patient must block the Hub pair and remain blocked on reload.
  await manipulate(validatedPatientId, validated.produced_line_id, 'PATIENT_MISMATCH', '000000004', true);
  await manipulate(validatedPatientId, validated.produced_line_id, 'PATIENT_MISMATCH', 'UNKNOWN-HUB-CIP', true);

  // S09: real CIP button search selects the exact sole active line.
  await searchCip('FH-V4-0009', 'click');
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.patientId, 'fhv4-patient-s09');
  assert.equal(context.lineId, 'fhv4-line-s09');
  assert.equal(new URL(page.url()).searchParams.get('line_id'), 'fhv4-line-s09');
  assert.equal(await page.inputValue('#fhSegPrincipioActivo'), '');
  assert.equal(await page.inputValue('#fhSegDosisActual'), '');
  await assertPermanentGate();

  // S10: Enter search, historical visible/disabled, exact active selected.
  await searchCip('FH-V4-0010', 'enter');
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.lineId, 'fhv4-line-s10-active');
  assert.equal(await page.locator('#fhSegLineaPrincipal option[value="fhv4-line-s10-historical"]').isDisabled(), true);
  assert.equal(await page.inputValue('#fhSegLineaPrincipal'), 'fhv4-line-s10-active');
  await assertOutputsCannotExecute('s10-ready');

  // S11: real search never auto-selects; each active exact selection updates URL.
  await searchCip('FH-V4-0011', 'click');
  context = await waitContext('SELECTION_REQUIRED');
  assert.equal(context.patientId, 'fhv4-patient-s11');
  assert.equal(context.lineId, '');
  assert.equal(new URL(page.url()).searchParams.has('line_id'), false);
  assert.equal(await page.inputValue('#fhSegLineaPrincipal'), '');
  assert.equal(await page.locator('#fhSegLineaPrincipal option[value="fhv4-line-s11-historical"]').isDisabled(), true);
  await page.selectOption('#fhSegLineaPrincipal', 'fhv4-line-s11-primary');
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.lineId, 'fhv4-line-s11-primary');
  assert.equal(new URL(page.url()).searchParams.get('line_id'), 'fhv4-line-s11-primary');
  await page.selectOption('#fhSegLineaPrincipal', 'fhv4-line-s11-additional');
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.lineId, 'fhv4-line-s11-additional');
  assert.equal(new URL(page.url()).searchParams.get('line_id'), 'fhv4-line-s11-additional');
  await page.reload({ waitUntil: 'domcontentloaded' });
  context = await waitContext('CANONICAL_ACTIVE_CONTEXT_READY');
  assert.equal(context.lineId, 'fhv4-line-s11-additional');
  assert.equal(await page.inputValue('#fhSegLineaPrincipal'), 'fhv4-line-s11-additional');

  // Unknown CIP is neutral and strips canonical identity.
  await searchCip('FH-V4-UNKNOWN', 'enter');
  context = await waitContext('PATIENT_NOT_FOUND');
  assert.equal(context.state, 'blocked');
  assert.equal(new URL(page.url()).searchParams.has('patient_id'), false);
  assert.equal(new URL(page.url()).searchParams.has('line_id'), false);
  assert.equal(await page.locator('#fhSegAutocompleteBlock').isVisible(), false);

  // Explicit manipulated URLs fail closed.
  await manipulate('fhv4-patient-s09', 'fhv4-line-s10-active', 'PATIENT_MISMATCH');
  await manipulate('fhv4-patient-s10', 'fhv4-line-s10-historical', 'LINE_NOT_ACTIVE');
  await manipulate('fhv4-patient-s09', 'fhv4-line-nonexistent', 'LINE_NOT_FOUND');
  await manipulate('fhv4-patient-s07', 'fhv4-line-s07', 'LINE_NOT_ACTIVE');
  await manipulate('fhv4-patient-s09', 'fhv4-line-s09', 'PATIENT_MISMATCH', 'FH-V4-0010', true);
  await assertOutputsCannotExecute('manipulated-blocked');

  // Inicio supported search/Quick View must produce canonical Follow-up identity links.
  await verifyInicioQuickViewLinks();

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
  console.log('farmacia_followup_canonical_context_v4_qa: PASSED_SUPPORTED_S08_S11_GATE_URL_RELOAD_AND_OUTPUT_BLOCKS');
} finally {
  await browser.close();
}
