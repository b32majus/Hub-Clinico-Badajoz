#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const BASE_URL = process.env.FH_LEDGER_BASE_URL || 'http://127.0.0.1:48796/';

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_ledger_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_evaluation_ledger_browser_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
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

async function configureValidation(page, cip) {
  await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
  await page.locator('#fhServicioManual').selectOption('derma');
  await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#fhManualCip').fill(cip);
  await page.locator('#fhManualFecha').fill('2026-08-01');
}

async function resetOutputCapture(page) {
  await page.evaluate(() => {
    const mark = () => ({
      eventCount: window.FarmaciaEvaluationLedger ? window.FarmaciaEvaluationLedger.listEvents().length : -1,
      ledgerEventId: new URL(location.href).searchParams.get('ledger_event_id') || ''
    });
    window.__ledgerOutputs = {};
    window.FarmaciaDemo.copyTextToClipboard = (text) => {
      window.__ledgerOutputs.text = { text, ...mark() };
      return Promise.resolve(true);
    };
    window.FarmaciaDemo.downloadFile = (filename, content, mime) => {
      window.__ledgerOutputs.download = { filename, content, mime, ...mark() };
    };
    window.FarmaciaExcelRowExport.copyTSVRowToClipboard = (row, options) => {
      window.__ledgerOutputs.excelRow = { row: JSON.parse(JSON.stringify(row)), options: { ...(options || {}) }, ...mark() };
      return Promise.resolve(true);
    };
    window.FarmaciaExcelRowExport.copyTSVRowsToClipboard = (rows, options) => {
      window.__ledgerOutputs.excelRows = { rows: JSON.parse(JSON.stringify(rows)), options: { ...(options || {}) }, ...mark() };
      return Promise.resolve(true);
    };
  });
}

function stableOutput(text) {
  return String(text || '').replace(/^Identificador demo: .*$/m, 'Identificador demo: <dynamic>');
}

function stableExcelRows(rows, columns) {
  const dynamic = new Set(['visita_id', 'validacion_id', 'created_at', 'updated_at']);
  return rows.map(row => row.map((value, index) => dynamic.has(columns[index]) ? '<dynamic>' : value));
}

function stableCsv(csv) {
  return String(csv || '').replace(/"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/g, '"<dynamic-datetime>"');
}

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(new URL('farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => typeof window.FarmaciaEvaluationLedger), 'undefined', 'Inicio has no ledger runtime');
  assert.equal(await page.evaluate(() => typeof window.FarmaciaEvaluationWorkbook), 'undefined', 'Inicio has no workbook runtime');
  assert.equal(await page.locator('#fhEvaluationLedgerIndex, #fhEvaluationLedgerPanel, #fhEvaluationWorkbookDownload').count(), 0, 'Inicio has no parallel cohort/workbook UI');
  assert.equal(await page.locator('#patientSearch').count(), 1, 'Inicio keeps search');
  assert.equal(await page.locator('#enfermeriaBoard').count(), 1, 'Inicio keeps normal trays');
  assert.ok(await page.locator('.action-grid .action-card').count() > 0, 'Inicio keeps quick access cards');

  await page.goto(new URL('farmacia_validacion.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaEvaluationLedger && document.querySelector('#fhEvaluationLedgerFeedback'));
  await page.evaluate(() => FarmaciaEvaluationLedger.clearAll());
  assert.equal(await page.locator('#fhEvaluationLedgerPanel, #fhEvaluationLedgerSyntheticConfirm, #fhEvaluationLedgerSave').count(), 0, 'clinical page has no injected consent/fake-save panel');
  await configureValidation(page, 'CIP-REALIGN-001');
  await page.locator('#fhValidadoJustificacion').fill('Observación sintética inicial');
  await page.locator('#fhValEstado').selectOption('validated');
  assert.equal(await page.locator('#fhValExportCsv').isVisible(), false, 'hidden Validation CSV remains outside supported visible outputs');
  const validationExpectedText = await page.evaluate(() => FarmaciaValidacion.buildValidationLines().join('\n'));
  await resetOutputCapture(page);
  await page.locator('#fhValExportTxt').click();
  const validationTextOutput = await page.evaluate(() => window.__ledgerOutputs.text);
  assert.equal(stableOutput(validationTextOutput.text), stableOutput(validationExpectedText), 'ledger leaves Validation TXT unchanged apart from the output handler own dynamic identifier');
  assert.equal(validationTextOutput.eventCount, 1, 'Validation is persisted before the normal TXT bubble handler runs');
  assert.ok(validationTextOutput.ledgerEventId, 'capture-phase persistence updates the URL before Validation TXT output');
  assert.match(await page.locator('#fhEvaluationLedgerStatus').textContent(), /conservado localmente/);
  const validationFirst = await page.evaluate(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_validation' })[0]);
  assert.ok(validationFirst.event_id && validationFirst.source_event_id);
  assert.ok(validationFirst.payload.form_state.length > 10, 'normal output stores the full structured form event');

  const validationExcelExpected = await page.evaluate(() => {
    const exp = FarmaciaExcelRowExport;
    const exportData = FarmaciaValidacion.buildValidationExcelExportData();
    const query = FarmaciaDemo.getQueryContext ? FarmaciaDemo.getQueryContext() : {};
    const opts = {
      patientId: exportData.cip, cip: exportData.cip, servicio: exportData.servicio, patologia: exportData.patologia,
      tipoActo: 'validacion_inicial', tipoValidacion: exportData.tipoValidacion, resultado: exportData.resultadoValidacion,
      estadoRegistro: exportData.estadoRegistro, lineaActual: exportData.lineaActual,
      fechaActo: new Date().toISOString().substring(0, 10), profesional: exportData.profesional,
      motivo: exportData.motivo, obsValidacion: exportData.obsValidacion, demoFlag: true
    };
    const built = exp.buildContextFromValidacion(query.patient || null, opts);
    built.observaciones = FarmaciaValidacion.buildExcelGeneralObservations(built, exportData.dermaClinicalSummary);
    return { row: exp.buildExcelRowArray(exp.buildExcelRowObject(built)), columns: exp.WO8_COLUMNS, sheetName: exp.getServiceSheetName(exportData.servicio) || 'hoja correspondiente' };
  });
  await resetOutputCapture(page);
  await page.locator('#fhValExcelExportBtn').click();
  const validationExcelOutput = await page.evaluate(() => window.__ledgerOutputs.excelRow);
  assert.equal(validationExcelOutput.row.length, 61, 'Validation Excel emits the essential 61-column row');
  assert.deepEqual(stableExcelRows([validationExcelOutput.row], validationExcelExpected.columns), stableExcelRows([validationExcelExpected.row], validationExcelExpected.columns), 'ledger leaves Validation Excel row unchanged');
  assert.equal(validationExcelOutput.options.sheetName, validationExcelExpected.sheetName);
  assert.equal(validationExcelOutput.eventCount, 1, 'Validation Excel updates the same persisted act before output');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Acto local restaurado/.test(document.querySelector('#fhEvaluationLedgerStatus')?.textContent || ''));
  assert.equal(await page.locator('#fhManualCip').inputValue(), 'CIP-REALIGN-001');
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), 'Observación sintética inicial');

  await page.goto(new URL('farmacia_validacion.html?cip=CIP-REALIGN-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaEvaluationLedger && document.querySelector('#fhEvaluationLedgerFeedback'));
  await configureValidation(page, 'CIP-REALIGN-001');
  await page.locator('#fhEvaluationLedgerPrevious').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fhEvaluationLedgerPrevious').textContent(), /Existe un acto local anterior de este tipo para este paciente/);
  await page.setViewportSize({ width: 1024, height: 768 });
  const responsiveNotice = await page.locator('#fhEvaluationLedgerPrevious').boundingBox();
  assert.ok(responsiveNotice && responsiveNotice.x >= 0 && responsiveNotice.x + responsiveNotice.width <= 1024, 'compact prior-act notice fits the 1024px viewport');
  assert.equal(await page.locator('#fhEvaluationLedgerRecoverLatest').isVisible(), true);
  assert.equal(await page.locator('#fhEvaluationLedgerContinueNew').isVisible(), true);
  await page.locator('#fhEvaluationLedgerContinueNew').click();
  await page.locator('#fhValidadoJustificacion').fill('Observación sintética de acto nuevo');
  await resetOutputCapture(page);
  await page.locator('#fhValExportTxt').click();
  await page.waitForFunction(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_validation' }).length === 2);
  const validationActs = await page.evaluate(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_validation' }));
  assert.notEqual(validationActs[0].source_event_id, validationActs[1].source_event_id, 'Continue creates a distinct source identity without overwrite');

  await page.goto(new URL('farmacia_validacion.html?cip=CIP-REALIGN-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaEvaluationLedger && document.querySelector('#fhEvaluationLedgerFeedback'));
  await configureValidation(page, 'CIP-REALIGN-001');
  await page.locator('#fhEvaluationLedgerPrevious').waitFor({ state: 'visible' });
  const latestSource = validationActs[0].source_event_id;
  await page.locator('#fhEvaluationLedgerRecoverLatest').click();
  await page.waitForFunction(() => /Acto local restaurado/.test(document.querySelector('#fhEvaluationLedgerStatus')?.textContent || ''));
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), 'Observación sintética de acto nuevo');
  assert.equal(await page.evaluate(() => new URL(location.href).searchParams.has('ledger_event_id')), true, 'explicit recovery updates URL');
  await resetOutputCapture(page);
  await page.locator('#fhValExportTxt').click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_validation' }).length), 2, 'recovered act updates idempotently');
  assert.equal((await page.evaluate(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_validation' })[0].source_event_id)), latestSource);

  await page.goto(new URL('farmacia_primera_visita.html?cip=CIP-DEMO-FH-001', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaEvaluationLedger && document.querySelector('#fhEvaluationLedgerFeedback'));
  assert.ok(await page.evaluate(() => Boolean(FarmaciaDemo.getQueryContext().patient)), 'First Visit Excel uses a supported selected synthetic patient context');
  await page.locator('#fhPvCip').fill('CIP-DEMO-FH-001');
  await page.locator('#fhPvServicio').selectOption({ label: 'Dermatología' });
  await page.locator('#fhPvPatologia').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#fhPvProms').selectOption({ label: 'Sí' });
  await page.locator('#fhPvNotas').fill('Notas sintéticas primera visita');
  const dlqi = page.locator('input[name="dlqi_q1"]');
  await dlqi.nth(2).locator('xpath=..').click();
  assert.equal(await page.locator('#fhPvExportCsv').isVisible(), false, 'hidden First Visit CSV remains outside supported visible outputs');
  await resetOutputCapture(page);
  await page.locator('#fhPvExportTxt').click();
  const firstVisitTextOutput = await page.evaluate(() => window.__ledgerOutputs.text);
  assert.match(firstVisitTextOutput.text, /PRIMERA VISITA|Primera visita/i, 'First Visit normal TXT output runs');
  assert.match(firstVisitTextOutput.text, /CIP-DEMO-FH-001/);
  assert.match(firstVisitTextOutput.text, /Notas sintéticas primera visita/);
  assert.equal(firstVisitTextOutput.eventCount, 3, 'First Visit is persisted before its TXT bubble handler');
  assert.ok(firstVisitTextOutput.ledgerEventId);

  const firstVisitExcelExpected = await page.evaluate(() => {
    const exp = FarmaciaExcelRowExport;
    const query = FarmaciaDemo.getQueryContext();
    const treatment = FarmaciaPrimeraVisita.getCurrentPrimaryTreatment();
    const opts = {
      tipoActo: 'primera_visita', visitaId: '<dynamic>', lineaActual: treatment,
      fechaActo: new Date().toISOString().substring(0, 10),
      proms: { morisky_green: '', haq: '', eva_dolor: '', dlqi: '' }, demoFlag: true
    };
    const built = exp.buildContextFromPrimeraVisita(query.patient, opts);
    return { row: exp.buildExcelRowArray(exp.buildExcelRowObject(built)), columns: exp.WO8_COLUMNS, sheetName: exp.getServiceSheetName(query.patient.servicio || '') || 'hoja correspondiente' };
  });
  await resetOutputCapture(page);
  await page.locator('#fhPvExcelExportBtn').click();
  const firstVisitExcelOutput = await page.evaluate(() => window.__ledgerOutputs.excelRow);
  assert.equal(firstVisitExcelOutput.row.length, 61, 'First Visit Excel emits the essential 61-column row');
  assert.deepEqual(stableExcelRows([firstVisitExcelOutput.row], firstVisitExcelExpected.columns), stableExcelRows([firstVisitExcelExpected.row], firstVisitExcelExpected.columns), 'ledger leaves First Visit Excel row unchanged');
  assert.equal(firstVisitExcelOutput.options.sheetName, firstVisitExcelExpected.sheetName);
  assert.equal(firstVisitExcelOutput.eventCount, 3);
  const firstVisitEventId = await page.evaluate(() => new URL(location.href).searchParams.get('ledger_event_id'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Acto local restaurado/.test(document.querySelector('#fhEvaluationLedgerStatus')?.textContent || ''));
  assert.equal(await page.locator('input[name="dlqi_q1"]').nth(2).isChecked(), true, 'name_index restores the exact dynamic DLQI radio');
  assert.equal(await page.evaluate(() => new URL(location.href).searchParams.get('ledger_event_id')), firstVisitEventId);

  await page.goto(new URL('farmacia_seguimiento.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FarmaciaEvaluationLedger && window.FarmaciaSeguimiento && document.querySelector('#fhEvaluationLedgerFeedback'));
  await page.locator('#fhSegCip').fill('CIP-REALIGN-SEG');
  await page.evaluate(() => FarmaciaSeguimiento.restoreEvaluationState({
    current_visit: {
      cip: 'CIP-REALIGN-SEG', visit_id: 'VISIT-REALIGN-1', selected_line_ids: ['LINE-REALIGN-1'],
      dispensed_line_ids: ['LINE-REALIGN-1'], editing_line_id: 'LINE-REALIGN-1',
      line_state: { 'LINE-REALIGN-1': { controls: { fhSegObservacionesLinea: 'Línea sintética exacta', fhSegTipoRelacionTerapia: 'revision_linea', fhSegVia: 'SC' }, morisky: { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' } } },
      adverse_event: { present: 'si', severity: 'Moderado', resolved: 'en_seguimiento', corrected: 'tratamiento_sintomatico', observations: 'EA sintético exacto', suspect_ids: ['line:LINE-REALIGN-1'], causality_editing_id: 'line:LINE-REALIGN-1' },
      causality_by_suspect: { 'line:LINE-REALIGN-1': { naranjo_answers: { q1: 'si' }, naranjo_score: 1, naranjo_category: 'Posible', karch_answers: { temporal: 'si' }, karch_category: 'Posible', final_assessment: 'Posible' } }
    },
    canonical_lines: [{ linea_id: 'LINE-REALIGN-1', estado_linea: 'active', nombre_linea: 'Línea sintética', nombre_comercial: 'Fármaco sintético', principio_activo: 'Activo sintético', candidate_explicit: true }],
    selected_line: { linea_id: 'LINE-REALIGN-1', estado_linea: 'active', nombre_linea: 'Línea sintética', nombre_comercial: 'Fármaco sintético' },
    related_treatments: [{ uid: 'REL-REALIGN-1', farmaco: 'Concomitante sintético', principioActivo: 'Activo concomitante', relationType: 'Concomitante', via: 'Oral' }]
  }));
  const followupExpectedText = await page.evaluate(() => FarmaciaSeguimiento.buildSegLines().join('\n'));
  await resetOutputCapture(page);
  await page.locator('#fhSegExportTxt').click();
  const followupTextOutput = await page.evaluate(() => window.__ledgerOutputs.text);
  assert.equal(stableOutput(followupTextOutput.text), stableOutput(followupExpectedText), 'ledger leaves Follow-up TXT unchanged');
  assert.equal(followupTextOutput.eventCount, 4, 'Follow-up is persisted before its TXT bubble handler');
  assert.ok(followupTextOutput.ledgerEventId);

  const storedFollowup = await page.evaluate(() => FarmaciaEvaluationLedger.listEvents({ event_type: 'pharmacy_follow_up' })[0]);
  assert.equal(storedFollowup.payload.domain.current_visit.visit_id, 'VISIT-REALIGN-1');
  assert.deepEqual(storedFollowup.payload.domain.current_visit.selected_line_ids, ['LINE-REALIGN-1']);
  assert.equal(storedFollowup.payload.domain.current_visit.editing_line_id, 'LINE-REALIGN-1');
  assert.deepEqual(storedFollowup.payload.domain.current_visit.dispensed_line_ids, ['LINE-REALIGN-1']);
  assert.equal(storedFollowup.payload.domain.current_visit.line_state['LINE-REALIGN-1'].controls.fhSegObservacionesLinea, 'Línea sintética exacta');
  assert.equal(storedFollowup.payload.domain.current_visit.line_state['LINE-REALIGN-1'].controls.fhSegTipoRelacionTerapia, 'revision_linea');
  assert.equal(storedFollowup.payload.domain.canonical_lines[0].linea_id, 'LINE-REALIGN-1');
  assert.equal(storedFollowup.payload.domain.selected_line.linea_id, 'LINE-REALIGN-1');
  assert.equal(storedFollowup.payload.domain.related_treatments[0].uid, 'REL-REALIGN-1');
  assert.equal(storedFollowup.payload.domain.current_visit.adverse_event.severity, 'Moderado');
  assert.equal(storedFollowup.payload.domain.current_visit.adverse_event.resolved, 'en_seguimiento');
  assert.equal(storedFollowup.payload.domain.current_visit.adverse_event.corrected, 'tratamiento_sintomatico');
  assert.equal(storedFollowup.payload.domain.current_visit.adverse_event.observations, 'EA sintético exacto');
  assert.deepEqual(storedFollowup.payload.domain.current_visit.adverse_event.suspect_ids, ['line:LINE-REALIGN-1']);
  const storedCausality = storedFollowup.payload.domain.current_visit.causality_by_suspect['line:LINE-REALIGN-1'];
  assert.equal(storedCausality.naranjo_answers.q1, 'si');
  assert.equal(storedCausality.naranjo_score, 1);
  assert.equal(storedCausality.naranjo_category, 'Posible');
  assert.equal(storedCausality.karch_answers.temporal, 'si');
  assert.equal(storedCausality.karch_category, 'Posible');
  assert.equal(storedCausality.final_assessment, 'Posible');

  const followupExpectedCsv = await page.evaluate(() => FarmaciaSeguimiento.buildFollowupCsv(FarmaciaSeguimiento.buildFollowupVisitExportModel()));
  await resetOutputCapture(page);
  assert.equal(await page.locator('#fhSegExportCsv').isDisabled(), false, 'Follow-up CSV is enabled for a dispensed line');
  await page.locator('#fhSegExportCsv').click();
  const followupCsvOutput = await page.evaluate(() => window.__ledgerOutputs.download);
  assert.equal(stableCsv(followupCsvOutput.content), stableCsv(followupExpectedCsv), 'ledger leaves Follow-up CSV unchanged apart from intrinsic generated timestamps');
  assert.match(followupCsvOutput.filename, /^seguimientos_FH_\d{4}-\d{2}-\d{2}\.csv$/);
  assert.match(followupCsvOutput.mime, /text\/csv/);
  assert.equal(followupCsvOutput.eventCount, 4);

  const followupExcelExpected = await page.evaluate(() => {
    const model = FarmaciaSeguimiento.buildFollowupVisitExportModel();
    return {
      rows: FarmaciaSeguimiento.buildFollowupExcelRows(model),
      columns: FarmaciaExcelRowExport.WO8_COLUMNS,
      sheetName: FarmaciaExcelRowExport.getServiceSheetName(model.common_visit.servicio || '') || 'hoja correspondiente'
    };
  });
  await resetOutputCapture(page);
  await page.locator('#fhSegExcelExportBtn').click();
  const followupExcelOutput = await page.evaluate(() => window.__ledgerOutputs.excelRows);
  assert.ok(followupExcelOutput.rows.length >= 1, 'Follow-up Excel emits at least one dispensed-line row');
  assert.ok(followupExcelOutput.rows.every(row => row.length === 61), 'every Follow-up Excel row preserves the 61-column contract');
  assert.deepEqual(stableExcelRows(followupExcelOutput.rows, followupExcelExpected.columns), stableExcelRows(followupExcelExpected.rows, followupExcelExpected.columns), 'ledger leaves Follow-up Excel rows unchanged');
  assert.equal(followupExcelOutput.options.sheetName, followupExcelExpected.sheetName);
  assert.equal(followupExcelOutput.eventCount, 4);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Acto local restaurado/.test(document.querySelector('#fhEvaluationLedgerStatus')?.textContent || ''));
  const restoredFollowup = await page.evaluate(() => ({ visit: FarmaciaSeguimiento.getCurrentVisit(), lines: FarmaciaSeguimiento.getCurrentCanonicalLines(), related: FarmaciaSeguimiento.getFollowupOtherDrugs() }));
  assert.equal(restoredFollowup.visit.visit_id, 'VISIT-REALIGN-1');
  assert.deepEqual(restoredFollowup.visit.selected_line_ids, ['LINE-REALIGN-1']);
  assert.equal(restoredFollowup.visit.editing_line_id, 'LINE-REALIGN-1');
  assert.deepEqual(restoredFollowup.visit.dispensed_line_ids, ['LINE-REALIGN-1']);
  assert.equal(restoredFollowup.visit.line_state['LINE-REALIGN-1'].controls.fhSegObservacionesLinea, 'Línea sintética exacta');
  assert.equal(restoredFollowup.visit.line_state['LINE-REALIGN-1'].controls.fhSegTipoRelacionTerapia, 'revision_linea');
  assert.equal(restoredFollowup.lines[0].linea_id, 'LINE-REALIGN-1');
  assert.equal(restoredFollowup.related[0].uid, 'REL-REALIGN-1');
  assert.equal(restoredFollowup.visit.adverse_event.severity, 'Moderado');
  assert.equal(restoredFollowup.visit.adverse_event.resolved, 'en_seguimiento');
  assert.equal(restoredFollowup.visit.adverse_event.corrected, 'tratamiento_sintomatico');
  assert.equal(restoredFollowup.visit.adverse_event.observations, 'EA sintético exacto');
  assert.deepEqual(restoredFollowup.visit.adverse_event.suspect_ids, ['line:LINE-REALIGN-1']);
  const restoredCausality = restoredFollowup.visit.causality_by_suspect['line:LINE-REALIGN-1'];
  assert.equal(restoredCausality.naranjo_answers.q1, 'si');
  assert.equal(restoredCausality.naranjo_score, 1);
  assert.equal(restoredCausality.naranjo_category, 'Posible');
  assert.equal(restoredCausality.karch_answers.temporal, 'si');
  assert.equal(restoredCausality.karch_category, 'Posible');
  assert.equal(restoredCausality.final_assessment, 'Posible');
  assert.equal(await page.locator('#fhSegLineaPrincipal').inputValue(), 'LINE-REALIGN-1', 'exact linea_id is restored into the supported editor');

  const fallbackContext = await browser.newContext();
  await fallbackContext.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes('promueve.fh.synthetic-evaluation-ledger')) throw new Error('storage blocked');
      return original.call(this, key, value);
    };
  });
  const fallbackPage = await fallbackContext.newPage();
  const fallbackErrors = [];
  fallbackPage.on('pageerror', error => fallbackErrors.push(error.message));
  await fallbackPage.goto(new URL('farmacia_validacion.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await fallbackPage.waitForFunction(() => window.FarmaciaEvaluationLedger && document.querySelector('#fhEvaluationLedgerFeedback'));
  await configureValidation(fallbackPage, 'CIP-MEMORY-ONLY');
  const fallbackExpectedText = await fallbackPage.evaluate(() => FarmaciaValidacion.buildValidationLines().join('\n'));
  await resetOutputCapture(fallbackPage);
  await fallbackPage.locator('#fhValExportTxt').click();
  await fallbackPage.waitForFunction(() => /Retención temporal/.test(document.querySelector('#fhEvaluationLedgerStatus')?.textContent || ''));
  assert.equal(stableOutput(await fallbackPage.evaluate(() => window.__ledgerOutputs.text.text)), stableOutput(fallbackExpectedText), 'storage failure does not block or alter normal output');
  assert.equal(await fallbackPage.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 1, 'memory fallback remains available until reload');
  assert.equal(await fallbackPage.evaluate(() => new URL(location.href).searchParams.has('ledger_event_id')), false, 'temporary memory retention does not claim a reloadable URL event');
  await fallbackPage.reload({ waitUntil: 'domcontentloaded' });
  await fallbackPage.waitForFunction(() => window.FarmaciaEvaluationLedger);
  assert.equal(await fallbackPage.evaluate(() => FarmaciaEvaluationLedger.listEvents().length), 0, 'fallback truthfully does not survive reload');
  assert.deepEqual(fallbackErrors, []);
  await fallbackContext.close();

  await page.goto(new URL('previews/caceres-fh/farmacia_index.html', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => typeof window.FarmaciaEvaluationLedger), 'undefined', 'Cáceres snapshot remains outside ledger runtime');
  assert.equal(await page.locator('#fhEvaluationLedgerFeedback, #fhEvaluationLedgerIndex').count(), 0);

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('\n')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`);
  console.log('farmacia_evaluation_ledger_browser_check: PASSED');
  console.log('all 7 visible outputs unchanged; capture-phase persistence; URL restore; explicit recover/continue; exact DLQI/follow-up domain; memory fallback; Inicio/Cáceres clean; console/pageerror 0.');
} finally {
  await browser.close();
}
