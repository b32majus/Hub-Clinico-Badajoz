#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const TARGET_URL = process.env.FH_VALIDACION_URL || 'http://127.0.0.1:4174/farmacia_validacion.html';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEARCH_QUERY = 'secu';
const MANUAL_SELECTION_IDS = ['fhManualFarmaco', 'fhManualPrincipioActivo', 'fhManualDosis', 'fhManualVia'];
const TRACKED_IDS = [...MANUAL_SELECTION_IDS];

function loadPlaywrightFromNpx() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    const nodeModules = path.resolve(binDirectory, '..');
    if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
    return createRequire(path.join(nodeModules, '__fh_cima_loader.cjs'))('playwright');
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_validacion_manual_requested_cima_check.mjs');
}

const { chromium } = loadPlaywrightFromNpx();

function availableChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) return bundled;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (!existsSync(cache)) return bundled;
  const candidates = readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium_headless_shell-'))
    .sort().reverse()
    .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
  return candidates.find(existsSync) || bundled;
}

const browser = await chromium.launch({ headless: true, executablePath: availableChromiumExecutable() });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const observations = [];
let dialogAction = 'dismiss';

page.on('console', (message) => {
  observations.push(`console.${message.type()}: ${message.text()}`);
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('dialog', (dialog) => dialogAction === 'accept' ? dialog.accept() : dialog.dismiss());

try {
  const validationSource = readFileSync(path.join(ROOT, 'scripts', 'farmacia_validacion.js'), 'utf8');
  assert.match(validationSource, /function selectManualRequestedDrug\(drug\)/, 'manual requested selection has a dedicated consumer');
  assert.match(validationSource, /function enableAutocompleteManualRequested\(\)/, 'manual requested autocomplete has a dedicated binder');
  assert.match(validationSource, /enableRequestedAutocomplete\("fhDermaFarmaco"\);\s*enableAutocompleteManualRequested\(\);/, 'top-level wiring keeps Dermatology generic and manual dedicated');
  assert.doesNotMatch(validationSource, /enableRequestedAutocomplete\("fhManualFarmaco"\)/, 'manual requested field is not wired through the generic binder');
  const manualSelectionSource = validationSource.slice(
    validationSource.indexOf('function selectManualRequestedDrug'),
    validationSource.indexOf('function renderManualRequestedAutocompleteDropdown')
  );
  assert.match(manualSelectionSource, /cipEl \? cipEl\.value\.trim\(\) : ""/, 'manual selection reads the direct literal CIP');
  assert.doesNotMatch(manualSelectionSource, /selectedCip|catalogContext/, 'manual selection does not use fallback patient context');
  assert.match(manualSelectionSource, /Boolean\(context\.cip\)[\s\S]*if \(contextValid[\s\S]*C\.selectDrug/, 'manual persistence requires a valid non-empty context');
  assert.match(manualSelectionSource, /var previous = manualRequestedTransientProposal \|\| contextualPrevious;/, 'visible transient proposal takes priority over a contextual snapshot');
  assert.match(manualSelectionSource, /if \(contextValid && typeof C\.selectDrug[\s\S]*manualRequestedTransientProposal = \{\s*proposal_values: Object\.assign\(\{\}, reconciled\.proposal_values\)/, 'every explicit selection retains its reconciled proposal after optional persistence');
  const requestedConfigSource = validationSource.slice(
    validationSource.indexOf('function requestedAutocompleteConfig'),
    validationSource.indexOf('function renderRequestedAutocompleteDropdown')
  );
  assert.doesNotMatch(requestedConfigSource, /fhManual/, 'generic requested config contains no manual branch');

  await page.addInitScript((trackedIds) => {
    window.__fhCimaRuntime = { events: [], dropdown: [] };
    for (const type of ['input', 'change']) {
      document.addEventListener(type, (event) => {
        if (!event.target || !trackedIds.includes(event.target.id)) return;
        window.__fhCimaRuntime.events.push({
          type,
          id: event.target.id,
          value: event.target.value,
          trusted: event.isTrusted
        });
      }, true);
    }
    document.addEventListener('DOMContentLoaded', () => {
      const dropdown = document.getElementById('fhManualAutocompleteDropdown');
      if (!dropdown) return;
      const record = (reason) => window.__fhCimaRuntime.dropdown.push({
        reason,
        hidden: dropdown.classList.contains('hidden'),
        items: dropdown.querySelectorAll('.autocomplete-item').length
      });
      record('DOMContentLoaded');
      new MutationObserver(() => record('mutation')).observe(dropdown, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true
      });
    });
  }, TRACKED_IDS);

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(TARGET_URL).origin });
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
  await page.locator('#fhServicioManual').selectOption('derma');
  await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#formManualSolicitud').waitFor({ state: 'visible' });
  await page.locator('#validationBlock').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded);

  const pauta = page.locator('#fhManualPauta');
  const induccion = page.locator('#fhManualInduccion');
  const requested = page.locator('#fhManualFarmaco');
  const dropdown = page.locator('#fhManualAutocompleteDropdown');
  const requestedFields = {
    farmaco: requested,
    principioActivo: page.locator('#fhManualPrincipioActivo'),
    dosis: page.locator('#fhManualDosis'),
    via: page.locator('#fhManualVia'),
    pauta,
    induccion
  };
  const readRequested = async () => Object.fromEntries(await Promise.all(
    Object.entries(requestedFields).map(async ([key, locator]) => [key, await locator.inputValue()])
  ));
  const validatedFields = {
    farmaco: page.locator('#fhValidadoFarmaco'),
    principioActivo: page.locator('#fhValidadoPrincipioActivo'),
    presentacion: page.locator('#fhValidadoPresentacion'),
    dosis: page.locator('#fhValidadoDosis'),
    via: page.locator('#fhValidadoVia'),
    pauta: page.locator('#fhValidadoPauta'),
    pautaOtro: page.locator('#fhValidadoPautaOtro'),
    induccion: page.locator('#fhValidadoInduccion')
  };
  const readValidated = async () => Object.fromEntries(await Promise.all(
    Object.entries(validatedFields).map(async ([key, locator]) => [key, await locator.inputValue()])
  ));
  const initialized = await readRequested();
  assert.deepEqual(initialized, {
    farmaco: '', principioActivo: '', dosis: '', via: '', pauta: '', induccion: ''
  }, 'initialization leaves manual requested controls at their declared preload values');
  assert.deepEqual({
    manual: await page.locator('#fhManualInduccion').inputValue(),
    derma: await page.locator('#fhDermaInduccion').inputValue(),
    validated: await page.locator('#fhValidadoInduccion').inputValue()
  }, { manual: '', derma: '', validated: '' }, 'all three induction controls start with empty value');
  for (const id of ['fhManualInduccion', 'fhDermaInduccion', 'fhValidadoInduccion']) {
    assert.equal((await page.locator(`#${id} option:checked`).textContent()).trim(), 'No informado', `${id} starts visibly as No informado`);
  }
  assert.deepEqual(await readValidated(), {
    farmaco: '', principioActivo: '', presentacion: '', dosis: '', via: '', pauta: '', pautaOtro: '', induccion: ''
  }, 'validated treatment starts empty');
  await page.locator('#fhValEstado').selectOption('pending');
  assert.ok(await page.locator('#fhValPendingReasonRow').isVisible(), 'pending shows its pending-reason row');
  assert.ok(await page.locator('#fhValMotivoRow').isHidden(), 'pending hides denial reason');
  await page.locator('#fhValEstado').selectOption('denied');
  assert.ok(await page.locator('#fhValPendingReasonRow').isHidden(), 'denied hides pending reason');
  assert.ok(await page.locator('#fhValMotivoRow').isVisible(), 'denied shows denial reason');
  await page.locator('#fhValEstado').selectOption('pending');
  assert.equal(await page.locator('button[id*="v2" i], a[id*="v2" i], a[download][href*="v2" i]').count(), 0, 'no public v2 button or download exists');
  assert.equal(await dropdown.locator('.autocomplete-item').count(), 0, 'initialization does not search or create suggestions');
  assert.ok(await dropdown.isHidden(), 'initialization keeps the dropdown closed');
  await page.waitForTimeout(500);
  assert.deepEqual(await readRequested(), initialized, 'initialization does not erase, select, or infer values after 500 ms');

  await page.locator('#fhManualCip').fill('');
  assert.ok(await page.locator('#fhValExportTxt').isDisabled(), 'empty visible CIP disables JARA export');
  assert.ok(await page.locator('#fhValExportCsv').isDisabled(), 'empty visible CIP disables CSV export');
  assert.ok(await page.locator('#fhValExcelExportBtn').isDisabled(), 'empty visible CIP disables Excel export');
  await pauta.selectOption('CADA_3_SEMANAS');
  await induccion.selectOption('si');

  const copyRequestedSummary = async () => {
    const sentinel = `FH-CIMA-SENTINEL-${Date.now()}-${Math.random()}`;
    await page.evaluate((value) => navigator.clipboard.writeText(value), sentinel);
    await page.locator('#fhValExportTxt').click();
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const value = await page.evaluate(() => navigator.clipboard.readText());
      if (value !== sentinel) return value;
      await page.waitForTimeout(50);
    }
    throw new Error('requested summary was not copied through the visible JARA button');
  };

  const requestedSection = (report) => {
    const match = report.match(/TRATAMIENTO SOLICITADO\n([\s\S]*?)\n\nTRATAMIENTO VALIDADO POR FARMACIA/);
    assert.ok(match, 'copied JARA report exposes the requested-treatment summary');
    return match[1];
  };

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const assertAssociatedFields = (actual, expected, label) => {
    for (const key of ['principioActivo', 'dosis', 'via']) {
      assert.ok(actual[key].trim(), `${label}: ${key} is non-empty`);
      assert.equal(actual[key], expected[key], `${label}: ${key} is associated with selected product`);
    }
  };
  const assertRequestedSummary = (section, expected, label) => {
    assert.match(section, new RegExp(`Fármaco solicitado: ${escapeRegExp(expected.farmaco)}`), `${label}: requested summary product`);
    assert.match(section, new RegExp(`Principio activo: ${escapeRegExp(expected.principioActivo)}`), `${label}: requested summary active ingredient`);
    assert.match(section, new RegExp(`Dosis solicitada: ${escapeRegExp(expected.dosis)}`), `${label}: requested summary dose/concentration`);
    assert.match(section, new RegExp(`Vía: ${escapeRegExp(expected.via)}`), `${label}: requested summary route`);
  };

  const routeFromVisibleDetail = (value) => {
    const normalized = String(value || '').toLocaleLowerCase('es');
    if (normalized.includes('subcut') || /(^|\s)sc($|\s)/.test(normalized)) return 'SC';
    if (normalized.includes('intraven') || /(^|\s)iv($|\s)/.test(normalized)) return 'IV';
    if (normalized.includes('intramus') || /(^|\s)im($|\s)/.test(normalized)) return 'IM';
    if (normalized.includes('oral')) return 'Oral';
    return value ? 'Otra' : '';
  };
  const visibleCandidate = async (item) => {
    const parts = (await item.locator('.autocomplete-item-detail').textContent()).split(' · ').map((part) => part.trim());
    return {
      farmaco: (await item.locator('.autocomplete-item-name').textContent()).trim(),
      principioActivo: parts[0] || '',
      dosis: parts[1] || '',
      via: routeFromVisibleDetail(parts[2] || '')
    };
  };
  const snapshotRegistry = () => page.evaluate(() => {
    const raw = sessionStorage.getItem('farmacia_drug_snapshot_registry_v2');
    return raw ? JSON.parse(raw) : { version: 2, snapshots: {} };
  });
  const requestedSnapshot = async (cip) => Object.values((await snapshotRegistry()).snapshots)
    .find((snapshot) => snapshot.context?.slot === 'validacion.solicitado' && snapshot.context?.cip === cip);

  const chooseFirst = async ({ cip, childSelector, label, query = SEARCH_QUERY }) => {
    await page.locator('#fhManualCip').fill(cip);
    await requestedFields.principioActivo.fill('');
    await requestedFields.dosis.fill('');
    await requestedFields.via.selectOption('');
    await requested.fill('');
    await requested.fill(query);
    await dropdown.waitFor({ state: 'visible' });
    const first = dropdown.locator('.autocomplete-item').first();
    await first.waitFor({ state: 'visible' });
    const expected = await visibleCandidate(first);
    const expectedName = expected.farmaco;
    assert.ok(Object.values(expected).every(Boolean), `${label}: visible result exposes all associated therapeutic values`);
    assert.equal((await first.locator('.drug-source-tag').textContent()).trim(), 'CIMA', `${label}: first result source`);
    const eventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);

    await first.locator(childSelector).click();
    const immediate = await readRequested();
    const summaryImmediate = cip ? await copyRequestedSummary() : null;
    await page.waitForTimeout(500);
    const delayed = await readRequested();
    const summaryDelayed = cip ? await copyRequestedSummary() : null;
    const clickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), eventStart);

    observations.push(`${label}: immediate=${JSON.stringify(immediate)}`);
    observations.push(`${label}: after500ms=${JSON.stringify(delayed)}`);
    observations.push(`${label}: selection-events=${JSON.stringify(clickEvents)}`);
    assert.equal(immediate.farmaco, expectedName, `${label}: product visible immediately`);
    assertAssociatedFields(immediate, expected, `${label}: immediately after click`);
    assert.deepEqual(delayed, immediate, `${label}: values stable after 500 ms`);
    assertAssociatedFields(delayed, expected, `${label}: after 500 ms`);
    assert.equal(immediate.pauta, 'CADA_3_SEMANAS', `${label}: pauta preserved`);
    assert.equal(immediate.induccion, 'si', `${label}: induccion preserved`);
    if (cip) {
      const sectionImmediate = requestedSection(summaryImmediate);
      const sectionDelayed = requestedSection(summaryDelayed);
      assertRequestedSummary(sectionImmediate, expected, `${label}: immediately after click`);
      assertRequestedSummary(sectionDelayed, expected, `${label}: after 500 ms`);
      assert.match(sectionDelayed, /Pauta: Cada 3 semanas/, `${label}: JARA exports Cada 3 semanas`);
      assert.equal(sectionDelayed, sectionImmediate, `${label}: requested summary stable after 500 ms`);
    } else {
      assert.ok(await page.locator('#fhValExportTxt').isDisabled(), `${label}: empty CIP keeps JARA disabled`);
      assert.ok(await page.locator('#fhValExportCsv').isDisabled(), `${label}: empty CIP keeps CSV disabled`);
      assert.ok(await page.locator('#fhValExcelExportBtn').isDisabled(), `${label}: empty CIP keeps Excel disabled`);
    }
    return { expected, expectedName, clickEvents };
  };

  const professionalValues = {
    principioActivo: 'Principio activo profesional previo',
    dosis: '777 mg profesional',
    via: 'Oral'
  };
  await page.locator('#fhManualCip').fill('');
  await requestedFields.principioActivo.fill(professionalValues.principioActivo);
  await requestedFields.dosis.fill(professionalValues.dosis);
  await requestedFields.via.selectOption(professionalValues.via);
  const professionalPreload = await readRequested();
  await page.waitForTimeout(500);
  assert.deepEqual(await readRequested(), professionalPreload, 'professional preloads remain unchanged before any drug search');
  assert.ok(await dropdown.isHidden(), 'professional dose/route preloads do not trigger a drug search');
  await requested.fill(SEARCH_QUERY);
  await dropdown.waitFor({ state: 'visible' });
  const professionalItem = dropdown.locator('.autocomplete-item').first();
  const professionalCatalogExpected = await visibleCandidate(professionalItem);
  const professionalEventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);
  const registryBeforeProfessionalSelection = await snapshotRegistry();
  await professionalItem.locator('.autocomplete-item-name').click();
  const professionalImmediate = await readRequested();
  await page.waitForTimeout(500);
  const professionalDelayed = await readRequested();
  const professionalClickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), professionalEventStart);
  const professionalExpected = {
    ...professionalCatalogExpected,
    dosis: professionalValues.dosis,
    via: professionalValues.via
  };
  observations.push(`professional preload selection: immediate=${JSON.stringify(professionalImmediate)}`);
  observations.push(`professional preload selection: after500ms=${JSON.stringify(professionalDelayed)}`);
  assert.equal(professionalImmediate.farmaco, professionalExpected.farmaco, 'explicit selection replaces preloaded partial identity');
  assert.equal(professionalImmediate.principioActivo, professionalExpected.principioActivo, 'explicit selection replaces preloaded active ingredient');
  assert.equal(professionalImmediate.dosis, professionalValues.dosis, 'explicit selection preserves professional dose');
  assert.equal(professionalImmediate.via, professionalValues.via, 'explicit selection preserves professional route');
  assert.equal(professionalImmediate.pauta, 'CADA_3_SEMANAS', 'explicit selection preserves professional pauta');
  assert.equal(professionalImmediate.induccion, 'si', 'explicit selection preserves professional induction');
  assert.deepEqual(professionalDelayed, professionalImmediate, 'professional values remain stable after 500 ms');
  assert.deepEqual(await snapshotRegistry(), registryBeforeProfessionalSelection, 'empty-CIP professional selection does not persist a snapshot');
  assert.deepEqual(await readValidated(), {
    farmaco: '', principioActivo: '', presentacion: '', dosis: '', via: '', pauta: '', pautaOtro: '', induccion: ''
  }, 'selecting requested treatment does not populate any validated field');

  const registryBeforeEmpty = await snapshotRegistry();
  const emptyCip = await chooseFirst({ cip: '', childSelector: '.autocomplete-item-name', label: 'empty CIP / first result name' });
  assert.deepEqual(await snapshotRegistry(), registryBeforeEmpty, 'empty CIP remains visible without creating or changing a snapshot');
  await requested.fill('');
  await requested.fill('tociliz');
  await dropdown.waitFor({ state: 'visible' });
  const emptySecondItem = dropdown.locator('.autocomplete-item').nth(1);
  const emptySecondExpected = await visibleCandidate(emptySecondItem);
  assert.notEqual(emptySecondExpected.dosis, emptyCip.expected.dosis, 'empty-CIP second fixture has a distinct catalog dose');
  const emptySecondEventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);
  await emptySecondItem.locator('.autocomplete-item-name').click();
  const emptySecondImmediate = await readRequested();
  await page.waitForTimeout(500);
  const emptySecondDelayed = await readRequested();
  const emptySecondClickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), emptySecondEventStart);
  observations.push(`empty CIP second distinct product: immediate=${JSON.stringify(emptySecondImmediate)}`);
  observations.push(`empty CIP second distinct product: after500ms=${JSON.stringify(emptySecondDelayed)}`);
  assertAssociatedFields(emptySecondImmediate, emptySecondExpected, 'empty CIP second distinct product');
  assert.deepEqual(emptySecondDelayed, emptySecondImmediate, 'empty CIP second distinct product remains stable after 500 ms');
  assert.equal(emptySecondImmediate.pauta, 'CADA_3_SEMANAS', 'empty CIP second product preserves pauta');
  assert.equal(emptySecondImmediate.induccion, 'si', 'empty CIP second product preserves induction');
  assert.deepEqual(await snapshotRegistry(), registryBeforeEmpty, 'empty CIP second product still creates no snapshot');
  const transientProfessionalEdit = { dosis: '888 mg edición profesional', via: 'Oral' };
  await requestedFields.dosis.fill(transientProfessionalEdit.dosis);
  await requestedFields.via.selectOption(transientProfessionalEdit.via);
  await requested.fill('');
  await requested.fill(SEARCH_QUERY);
  await dropdown.waitFor({ state: 'visible' });
  const emptyEditedThirdItem = dropdown.locator('.autocomplete-item').first();
  const emptyEditedThirdExpected = await visibleCandidate(emptyEditedThirdItem);
  const emptyEditedThirdEventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);
  await emptyEditedThirdItem.locator('.autocomplete-item-name').click();
  const emptyEditedThirdImmediate = await readRequested();
  await page.waitForTimeout(500);
  const emptyEditedThirdDelayed = await readRequested();
  const emptyEditedThirdClickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), emptyEditedThirdEventStart);
  observations.push(`empty CIP product after professional edit: immediate=${JSON.stringify(emptyEditedThirdImmediate)}`);
  observations.push(`empty CIP product after professional edit: after500ms=${JSON.stringify(emptyEditedThirdDelayed)}`);
  assert.equal(emptyEditedThirdImmediate.farmaco, emptyEditedThirdExpected.farmaco, 'empty CIP later selection replaces product identity after professional edit');
  assert.equal(emptyEditedThirdImmediate.principioActivo, emptyEditedThirdExpected.principioActivo, 'empty CIP later selection replaces active ingredient after professional edit');
  assert.equal(emptyEditedThirdImmediate.dosis, transientProfessionalEdit.dosis, 'empty CIP later selection preserves professionally edited dose');
  assert.equal(emptyEditedThirdImmediate.via, transientProfessionalEdit.via, 'empty CIP later selection preserves professionally edited route');
  assert.equal(emptyEditedThirdImmediate.pauta, 'CADA_3_SEMANAS', 'empty CIP later selection preserves pauta after professional edit');
  assert.equal(emptyEditedThirdImmediate.induccion, 'si', 'empty CIP later selection preserves induction after professional edit');
  assert.deepEqual(emptyEditedThirdDelayed, emptyEditedThirdImmediate, 'empty CIP professional edits remain stable after 500 ms');
  assert.deepEqual(await snapshotRegistry(), registryBeforeEmpty, 'empty CIP professional-edit selection creates no snapshot');
  const transitionSeed = await chooseFirst({
    cip: '', childSelector: '.autocomplete-item-name', label: 'empty CIP seed before new synthetic context'
  });
  const transitionSyntheticCip = `CIP-MANUAL-TRANSIENT-${Date.now()}`;
  await page.locator('#fhManualCip').fill(transitionSyntheticCip);
  await requested.fill('');
  await requested.fill('tociliz');
  await dropdown.waitFor({ state: 'visible' });
  const transitionItem = dropdown.locator('.autocomplete-item').nth(1);
  const transitionExpected = await visibleCandidate(transitionItem);
  assert.notEqual(transitionExpected.dosis, transitionSeed.expected.dosis, 'new-context fixture has a distinct proposed dose');
  const transitionEventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);
  await transitionItem.locator('.autocomplete-item-name').click();
  const transitionImmediate = await readRequested();
  await page.waitForTimeout(500);
  const transitionDelayed = await readRequested();
  const transitionClickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), transitionEventStart);
  observations.push(`empty CIP to new synthetic context: immediate=${JSON.stringify(transitionImmediate)}`);
  observations.push(`empty CIP to new synthetic context: after500ms=${JSON.stringify(transitionDelayed)}`);
  assertAssociatedFields(transitionImmediate, transitionExpected, 'new synthetic CIP uses transient proposals for distinct selection');
  assert.deepEqual(transitionDelayed, transitionImmediate, 'new synthetic CIP distinct selection remains stable after 500 ms');
  assert.equal(transitionImmediate.pauta, 'CADA_3_SEMANAS', 'new synthetic CIP transition preserves pauta');
  assert.equal(transitionImmediate.induccion, 'si', 'new synthetic CIP transition preserves induction');
  const transitionRegistry = await snapshotRegistry();
  const transitionSnapshots = Object.values(transitionRegistry.snapshots).filter((snapshot) => snapshot.context?.slot === 'validacion.solicitado' && snapshot.context?.cip === transitionSyntheticCip);
  assert.equal(transitionSnapshots.length, 1, 'new synthetic CIP transition persists exactly one contextual snapshot');
  assert.equal(transitionSnapshots[0].nombre_snapshot, transitionExpected.farmaco, 'new synthetic CIP transition snapshot records the distinct product');

  const selectVisibleProduct = async ({ cip, query, index, label }) => {
    await page.locator('#fhManualCip').fill(cip);
    await page.waitForTimeout(200);
    await requested.fill('');
    await requested.fill(query);
    await dropdown.waitFor({ state: 'visible' });
    const item = dropdown.locator('.autocomplete-item').nth(index);
    await item.waitFor({ state: 'visible' });
    const expected = await visibleCandidate(item);
    assert.ok(Object.values(expected).every(Boolean), `${label}: visible candidate is complete`);
    const eventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);
    await item.locator('.autocomplete-item-name').click();
    const actual = await readRequested();
    const clickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), eventStart);
    observations.push(`${label}: selected=${JSON.stringify(actual)}`);
    return { expected, actual, clickEvents };
  };
  const assertFullProduct = (actual, expected, label) => {
    assert.equal(actual.farmaco, expected.farmaco, `${label}: product identity`);
    assert.equal(actual.principioActivo, expected.principioActivo, `${label}: active ingredient identity`);
    assert.equal(actual.dosis, expected.dosis, `${label}: proposed dose`);
    assert.equal(actual.via, expected.via, `${label}: proposed route`);
  };
  const cipA = `CIP-MANUAL-PRIORITY-A-${Date.now()}`;
  const cipB = `CIP-MANUAL-PRIORITY-B-${Date.now()}`;
  const clinicalControls = {
    pauta,
    induccion,
    estado: page.locator('#fhValEstado'),
    peso: page.locator('#fhManualPeso'),
    justificacion: page.locator('#fhManualJustificacion'),
    observaciones: page.locator('#fhManualObservaciones')
  };
  await clinicalControls.estado.selectOption('pending');
  assert.ok(!(await page.locator('#fhValExportTxt').isDisabled()), 'non-empty synthetic CIP enables JARA export');
  assert.ok(!(await page.locator('#fhValExportCsv').isDisabled()), 'non-empty synthetic CIP enables CSV export');
  assert.ok(!(await page.locator('#fhValExcelExportBtn').isDisabled()), 'non-empty synthetic CIP plus status enables Excel export');
  await page.locator('#fhValidadoJustificacion').fill('Observación FH sintética navegador');
  await page.locator('#fhValObservaciones').fill('Otra observación del acto sintética navegador');
  const separatedObservationsReport = await copyRequestedSummary();
  assert.match(separatedObservationsReport, /Observaciones de Farmacia Hospitalaria: Observación FH sintética navegador/, 'JARA labels the visible FH observation');
  assert.match(separatedObservationsReport, /Otras observaciones del acto de validación: Otra observación del acto sintética navegador/, 'JARA keeps other act observations separate');
  await clinicalControls.peso.fill('71 kg sintéticos');
  await clinicalControls.justificacion.fill('Justificación profesional preservada');
  await clinicalControls.observaciones.fill('Observación profesional preservada');
  const readClinical = async () => Object.fromEntries(await Promise.all(
    Object.entries(clinicalControls).map(async ([key, locator]) => [key, await locator.inputValue()])
  ));
  const clinicalBaseline = await readClinical();
  const assertClinicalUnchanged = async (label) => assert.deepEqual(await readClinical(), clinicalBaseline, `${label}: pauta, induction, validation status, and other clinical fields stay unchanged`);

  await requestedFields.principioActivo.fill('');
  await requestedFields.dosis.fill('');
  await requestedFields.via.selectOption('');
  const priorityA = await selectVisibleProduct({ cip: cipA, query: SEARCH_QUERY, index: 0, label: 'priority A' });
  assertFullProduct(priorityA.actual, priorityA.expected, 'priority A');
  const snapshotAFirst = await requestedSnapshot(cipA);
  assert.equal(snapshotAFirst?.nombre_snapshot, priorityA.expected.farmaco, 'priority A snapshot records product A');
  assert.equal(snapshotAFirst?.principio_activo_snapshot, priorityA.expected.principioActivo, 'priority A snapshot records full identity');
  await assertClinicalUnchanged('priority A');

  const priorityB = await selectVisibleProduct({ cip: cipB, query: 'adal', index: 0, label: 'direct A-to-B transition' });
  assert.notEqual(priorityB.expected.farmaco, priorityA.expected.farmaco, 'A-to-B fixture uses a distinct product');
  assertFullProduct(priorityB.actual, priorityB.expected, 'direct A-to-B transition');
  const snapshotB = await requestedSnapshot(cipB);
  assert.equal(snapshotB?.nombre_snapshot, priorityB.expected.farmaco, 'CIP-B snapshot records product B');
  assert.equal(snapshotB?.principio_activo_snapshot, priorityB.expected.principioActivo, 'CIP-B snapshot records B identity');
  assert.equal(snapshotB?.proposal_values?.dosis_texto, priorityB.expected.dosis, 'CIP-B snapshot records B proposed dose');
  assert.equal(snapshotB?.proposal_values?.via, priorityB.expected.via, 'CIP-B snapshot records B proposed route');
  await assertClinicalUnchanged('direct A-to-B transition');

  const priorityThird = await selectVisibleProduct({ cip: cipA, query: 'tociliz', index: 1, label: 'return B-to-A with third product' });
  assert.notEqual(priorityThird.expected.farmaco, priorityA.expected.farmaco, 'return fixture is not historical product A');
  assert.notEqual(priorityThird.expected.farmaco, priorityB.expected.farmaco, 'return fixture is not visible product B');
  assert.notEqual(priorityThird.expected.dosis, priorityA.expected.dosis, 'third-product fixture dose differs from historical A proposal');
  assert.notEqual(priorityThird.expected.dosis, priorityB.expected.dosis, 'third-product fixture dose differs from visible B proposal');
  assertFullProduct(priorityThird.actual, priorityThird.expected, 'return B-to-A with third product');
  const snapshotAThird = await requestedSnapshot(cipA);
  assert.equal(snapshotAThird?.nombre_snapshot, priorityThird.expected.farmaco, 'CIP-A snapshot is replaced by the third product');
  assert.equal(snapshotAThird?.proposal_values?.dosis_texto, priorityThird.expected.dosis, 'CIP-A snapshot replaces historical and visible dose proposals');
  assert.equal(snapshotAThird?.proposal_values?.via, priorityThird.expected.via, 'CIP-A snapshot applies the third-product route proposal');
  await assertClinicalUnchanged('return B-to-A with third product');

  const professionalTransition = { dosis: '919 mg profesional', via: 'Oral' };
  await requestedFields.dosis.fill(professionalTransition.dosis);
  await requestedFields.via.selectOption(professionalTransition.via);
  const priorityEdited = await selectVisibleProduct({ cip: cipB, query: SEARCH_QUERY, index: 0, label: 'valid CIP transition after professional edits' });
  assert.equal(priorityEdited.actual.farmaco, priorityEdited.expected.farmaco, 'professional transition changes product identity');
  assert.equal(priorityEdited.actual.principioActivo, priorityEdited.expected.principioActivo, 'professional transition changes active ingredient identity');
  assert.equal(priorityEdited.actual.dosis, professionalTransition.dosis, 'professional transition preserves manually edited dose');
  assert.equal(priorityEdited.actual.via, professionalTransition.via, 'professional transition preserves manually edited route');
  assert.equal((await requestedSnapshot(cipB))?.nombre_snapshot, priorityEdited.expected.farmaco, 'professional transition updates CIP-B snapshot identity');
  await assertClinicalUnchanged('valid CIP transition after professional edits');

  const syntheticCip = `CIP-MANUAL-CIMA-${Date.now()}`;
  const keyedTag = await chooseFirst({ cip: syntheticCip, childSelector: '.drug-source-tag', label: 'new synthetic CIP / first result CIMA tag' });
  const keyedRegistry = await snapshotRegistry();
  const keyedSnapshots = Object.values(keyedRegistry.snapshots).filter((snapshot) => snapshot.context?.slot === 'validacion.solicitado' && snapshot.context?.cip === syntheticCip);
  assert.equal(keyedSnapshots.length, 1, 'new synthetic CIP persists exactly one requested-slot snapshot');
  assert.equal(keyedSnapshots[0].nombre_snapshot, keyedTag.expectedName, 'new synthetic CIP snapshot records the explicitly selected product');
  const keyedDetail = await chooseFirst({ cip: syntheticCip, childSelector: '.autocomplete-item-detail', label: 'new synthetic CIP / first result detail' });

  await page.locator('#fhPatologiaManual').selectOption({ label: 'Psoriasis' });
  assert.equal(await page.locator('#fhManualPatologiaDisplay').inputValue(), 'Psoriasis', 'pathology rerender is visible');
  await requested.fill('');
  await requested.fill(SEARCH_QUERY);
  await dropdown.waitFor({ state: 'visible' });
  const items = dropdown.locator('.autocomplete-item');
  assert.ok(await items.count() > 1, 'demo catalog offers a second secu product');
  const second = items.nth(1);
  const secondExpected = await visibleCandidate(second);
  const secondName = secondExpected.farmaco;
  assert.ok(Object.values(secondExpected).every(Boolean), 'second visible result exposes all associated therapeutic values');
  const secondEventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);
  await second.locator('.autocomplete-item-name').click();
  const secondImmediate = await readRequested();
  const secondSummaryImmediate = await copyRequestedSummary();
  await page.waitForTimeout(500);
  const secondDelayed = await readRequested();
  const secondSummaryDelayed = await copyRequestedSummary();
  const secondClickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), secondEventStart);
  observations.push(`second product after pathology rerender: immediate=${JSON.stringify(secondImmediate)}`);
  observations.push(`second product after pathology rerender: after500ms=${JSON.stringify(secondDelayed)}`);
  observations.push(`second product after pathology rerender: selection-events=${JSON.stringify(secondClickEvents)}`);
  assert.equal(secondImmediate.farmaco, secondName, 'second product visible after rerender');
  assertAssociatedFields(secondImmediate, secondExpected, 'second product immediately after rerender click');
  assert.deepEqual(secondDelayed, secondImmediate, 'second product stable after 500 ms');
  assertAssociatedFields(secondDelayed, secondExpected, 'second product after rerender and 500 ms');
  assert.equal(secondImmediate.pauta, 'CADA_3_SEMANAS', 'second product preserves pauta');
  assert.equal(secondImmediate.induccion, 'si', 'second product preserves induccion');
  const secondSectionImmediate = requestedSection(secondSummaryImmediate);
  const secondSectionDelayed = requestedSection(secondSummaryDelayed);
  assertRequestedSummary(secondSectionImmediate, secondExpected, 'second product summary immediately after rerender click');
  assertRequestedSummary(secondSectionDelayed, secondExpected, 'second product summary after rerender and 500 ms');
  assert.equal(secondSectionDelayed, secondSectionImmediate, 'second product requested summary stable after 500 ms');

  const validated = page.locator('#fhValidadoFarmaco');
  await validatedFields.pauta.selectOption('CADA_3_SEMANAS');
  await validatedFields.induccion.selectOption('no');
  await validated.fill('');
  await validated.fill(SEARCH_QUERY);
  const validatedDropdown = page.locator('#autocompleteValidadoDropdown');
  await validatedDropdown.waitFor({ state: 'visible' });
  const validatedFirst = validatedDropdown.locator('.autocomplete-item').first();
  const validatedExpected = (await validatedFirst.locator('.autocomplete-item-name').textContent()).trim();
  await validatedFirst.locator('.autocomplete-item-name').click();
  const validatedAssociated = {
    farmaco: await validated.inputValue(),
    principioActivo: await page.locator('#fhValidadoPrincipioActivo').inputValue(),
    dosis: await page.locator('#fhValidadoDosis').inputValue(),
    via: await page.locator('#fhValidadoVia').inputValue()
  };
  observations.push(`validated comparison: value=${JSON.stringify(validatedAssociated)}`);
  assert.equal(await validated.inputValue(), validatedExpected, 'fhValidadoFarmaco selects the same first catalog result');
  assert.deepEqual(validatedAssociated, emptyCip.expected, 'manual requested clone matches the validated visible selection contract');
  assert.equal(emptyCip.expectedName, validatedExpected, 'empty-CIP requested and validated first result match');
  assert.equal(keyedTag.expectedName, validatedExpected, 'CIMA-tag requested and validated first result match');
  assert.equal(keyedDetail.expectedName, validatedExpected, 'detail requested and validated first result match');
  assert.equal(await validatedFields.pauta.inputValue(), 'CADA_3_SEMANAS', 'validated catalog selection preserves professional schedule');
  assert.equal(await validatedFields.induccion.inputValue(), 'no', 'validated catalog selection preserves professional induction');

  await page.locator('#fhValEstado').selectOption('validated');
  const validatedBeforeExplicitCopy = await readValidated();
  const relationBeforeExplicitCopy = await page.locator('#fhValidatedTreatmentRelation').inputValue();
  const validationObservationBeforeCopy = await page.locator('#fhValidadoJustificacion').inputValue();
  const requestedSnapshotForCopy = await requestedSnapshot(syntheticCip);
  assert.ok(requestedSnapshotForCopy, 'explicit copy has an exact requested-slot snapshot for the visible CIP');
  dialogAction = 'dismiss';
  await page.locator('#btnValidateRequestedSame').click();
  assert.deepEqual(await readValidated(), validatedBeforeExplicitCopy, 'cancelled visible explicit-copy action mutates no validated field');
  assert.equal(await page.locator('#fhValidatedTreatmentRelation').inputValue(), relationBeforeExplicitCopy, 'cancelled visible action preserves relation');
  dialogAction = 'accept';
  await page.locator('#btnValidateRequestedSame').click();
  dialogAction = 'dismiss';
  assert.equal(await page.locator('#fhValidatedTreatmentRelation').inputValue(), 'same_as_requested', 'explicit copy sets canonical relation');
  assert.equal(await page.locator('#fhValidadoFarmaco').inputValue(), await requested.inputValue(), 'explicit copy aligns visible drug');
  assert.equal(await page.locator('#fhValidadoPrincipioActivo').inputValue(), await requestedFields.principioActivo.inputValue(), 'explicit copy aligns active ingredient');
  assert.equal(await page.locator('#fhValidadoDosis').inputValue(), await requestedFields.dosis.inputValue(), 'explicit copy aligns dose');
  assert.equal(await page.locator('#fhValidadoVia').inputValue(), await requestedFields.via.inputValue(), 'explicit copy aligns route');
  assert.equal(await page.locator('#fhValidadoPauta').inputValue(), await requestedFields.pauta.inputValue(), 'explicit copy aligns schedule code');
  assert.equal(await page.locator('#fhValidadoInduccion').inputValue(), await requestedFields.induccion.inputValue(), 'explicit copy aligns explicit induction');
  assert.equal(await page.locator('#fhValidadoPautaOtro').inputValue(), '', 'explicit copy leaves absent free-text schedule absent');
  assert.equal(await page.locator('#fhValidadoPresentacion').inputValue(), requestedSnapshotForCopy.presentacion_snapshot, 'explicit copy transfers presentation only from the exact requested snapshot');
  assert.equal(await page.locator('#fhValidadoJustificacion').inputValue(), validationObservationBeforeCopy, 'explicit treatment copy does not alter unrelated validation observations');

  await page.locator('#btnAddOtherDrug').click();
  await page.locator('#btnAddOtherDrug').click();
  await page.locator('#btnAddOtherDrug').click();
  const relatedCards = page.locator('.other-drug-card');
  await relatedCards.nth(0).locator('input[type="text"]').nth(0).fill('Relacionado sintético A');
  await relatedCards.nth(1).locator('input[type="text"]').nth(1).fill('Activo relacionado sintético B');
  const relatedV2 = await page.evaluate(() => window.FarmaciaValidacion.buildValidationRelatedTreatmentsV2());
  assert.equal(relatedV2.length, 2, 'related-treatment builder preserves 1:N and omits relation/uid-only card');
  assert.ok(relatedV2.every((row) => row.source_row_uid && !('selected_drug_id' in row) && !('line_id' in row)), 'related treatments contain source UID but no catalog/line IDs');

  const internalProjection = await page.evaluate(() => window.FarmaciaValidacion.buildValidationV2Projection({
    eventId: 'evt-browser-synthetic', sourceEventId: 'src-browser-synthetic', rowKey: 'validation-main', validationId: 'val-browser-synthetic',
    patientId: 'patient-browser-synthetic', occurredAt: '2026-08-02', recordedAt: '2026-08-02T12:00:00Z', demoFlag: true,
    eventStatus: 'draft', lineCreationStatus: 'not_created'
  }));
  assert.equal(internalProjection.rows.length, 1, 'DOM builder delegates one-row projection');
  assert.equal(internalProjection.event.validation_result, 'validated', 'same-as-requested projection uses the supported validated result');
  assert.equal(internalProjection.row.bridge_status, 'PENDIENTE', 'DOM projection keeps core bridge boundary');
  assert.equal(internalProjection.row.requested_drug_name, internalProjection.row.validated_drug_name, 'same-as-requested projection remains separated but equal');
  const validatedDoseSnapshot = await page.locator('#fhValidadoDosis').inputValue();
  await requestedFields.dosis.fill('Cambio solicitado posterior sintético');
  assert.equal(await page.locator('#fhValidadoDosis').inputValue(), validatedDoseSnapshot, 'later requested edits do not synchronize into validated controls');
  const validatedBeforeModifiedRelation = await readValidated();
  await page.locator('#fhValidatedTreatmentRelation').selectOption('modified_from_requested');
  assert.deepEqual(await readValidated(), validatedBeforeModifiedRelation, 'selecting modified_from_requested copies no treatment field');

  await page.locator('#fhValidatedTreatmentRelation').selectOption('');
  await page.locator('#fhValEstado').selectOption('pending');
  const excelSentinel = `FH-EXCEL-SENTINEL-${Date.now()}-${Math.random()}`;
  await page.evaluate((value) => navigator.clipboard.writeText(value), excelSentinel);
  await page.locator('#fhValExcelExportBtn').click();
  const excelDeadline = Date.now() + 5_000;
  let excelTsv = excelSentinel;
  while (Date.now() < excelDeadline && excelTsv === excelSentinel) {
    excelTsv = await page.evaluate(() => navigator.clipboard.readText());
    if (excelTsv === excelSentinel) await page.waitForTimeout(50);
  }
  assert.notEqual(excelTsv, excelSentinel, 'visible public Excel button writes clipboard TSV');
  assert.equal(excelTsv.split('\t').length, 61, 'public Excel clipboard row contains exactly 61 TSV cells');
  assert.equal(await page.getByRole('button', { name: /v2/i }).count(), 0, 'no public button is labelled as v2');

  const reumaPage = await context.newPage();
  reumaPage.on('console', (message) => {
    observations.push(`reuma.console.${message.type()}: ${message.text()}`);
    if (message.type() === 'error') consoleErrors.push(`reuma: ${message.text()}`);
  });
  reumaPage.on('pageerror', (error) => pageErrors.push(`reuma: ${error.message}`));
  reumaPage.on('dialog', (dialog) => dialog.accept());
  await reumaPage.addInitScript(() => {
    let farmaciaDemo;
    Object.defineProperty(window, 'FarmaciaDemo', {
      configurable: true,
      get() { return farmaciaDemo; },
      set(value) {
        farmaciaDemo = value;
        if (!value || !value.patients) return;
        value.patients['CIP-REUMA-SCHEDULE-BROWSER-SYN'] = {
          cip: 'CIP-REUMA-SCHEDULE-BROWSER-SYN',
          nombre: 'Paciente sintético pauta Reuma',
          servicio: 'Reuma', servicioSlug: 'reumatologia', patologia: 'AR',
          farmaco_solicitado: 'Tratamiento solicitado sintético', principioActivo: 'Activo sintético',
          dosis: '40 mg', via: 'SC', pauta: 'Cada 2 semanas',
          estado: 'pending', origen_solicitud: 'enfermeria',
          tipo_origen: 'enfermeria_inicio_biologico', source_type: 'ENFERMERIA'
        };
      }
    });
  });
  const reumaUrl = new URL(TARGET_URL);
  reumaUrl.searchParams.set('cip', 'CIP-REUMA-SCHEDULE-BROWSER-SYN');
  reumaUrl.searchParams.set('servicio', 'reuma');
  reumaUrl.searchParams.set('patologia', 'AR');
  reumaUrl.searchParams.set('entrada', 'validacion');
  await reumaPage.goto(reumaUrl.toString(), { waitUntil: 'domcontentloaded' });
  await reumaPage.locator('#formReuma').waitFor({ state: 'visible' });
  await reumaPage.locator('#validationBlock').waitFor({ state: 'visible' });
  assert.equal((await reumaPage.locator('#fhReumaPauta').textContent()).trim(), 'Cada 2 semanas', 'reachable Enfermería/Reuma fixture exposes explicit requested schedule label');
  assert.equal(await reumaPage.locator('#fhValidadoPauta').inputValue(), '', 'Reuma validated schedule starts empty');
  await reumaPage.locator('#fhValEstado').selectOption('validated');
  await reumaPage.locator('#btnValidateRequestedSame').click();
  assert.equal(await reumaPage.locator('#fhValidatedTreatmentRelation').inputValue(), 'same_as_requested', 'visible Reuma action sets same_as_requested');
  assert.equal(await reumaPage.locator('#fhValidadoPauta').inputValue(), 'CADA_2_SEMANAS', 'visible Reuma action copies canonical schedule code');
  assert.equal((await reumaPage.locator('#fhValidadoPauta option:checked').textContent()).trim(), 'Cada 2 semanas', 'visible Reuma action preserves canonical schedule label');
  assert.equal(await reumaPage.locator('#fhValidadoPautaOtro').inputValue(), '', 'recognized Reuma schedule keeps other text empty');
  const reumaProjection = await reumaPage.evaluate(() => window.FarmaciaValidacion.buildValidationV2Projection({
    eventId: 'evt-reuma-schedule-browser-syn', sourceEventId: 'src-reuma-schedule-browser-syn', rowKey: 'validation-main',
    validationId: 'val-reuma-schedule-browser-syn', patientId: 'patient-reuma-schedule-browser-syn',
    occurredAt: '2026-08-02', recordedAt: '2026-08-02T13:00:00Z', demoFlag: true,
    eventStatus: 'draft', lineCreationStatus: 'not_created'
  }));
  assert.equal(reumaProjection.row.requested_schedule_code, 'CADA_2_SEMANAS', 'Reuma projection preserves requested schedule code');
  assert.equal(reumaProjection.row.requested_schedule_label, 'Cada 2 semanas', 'Reuma projection preserves requested schedule label');
  assert.equal(reumaProjection.row.validated_schedule_code, 'CADA_2_SEMANAS', 'Reuma projection preserves validated schedule code');
  assert.equal(reumaProjection.row.validated_schedule_label, 'Cada 2 semanas', 'Reuma same-as-requested projection validates without schedule mismatch');
  await reumaPage.close();

  const requestedSelectionEvents = [
    ...professionalClickEvents,
    ...emptyCip.clickEvents,
    ...emptySecondClickEvents,
    ...emptyEditedThirdClickEvents,
    ...transitionSeed.clickEvents,
    ...transitionClickEvents,
    ...priorityA.clickEvents,
    ...priorityB.clickEvents,
    ...priorityThird.clickEvents,
    ...priorityEdited.clickEvents,
    ...keyedTag.clickEvents,
    ...keyedDetail.clickEvents,
    ...secondClickEvents
  ];
  const dropdownRuntime = await page.evaluate(() => window.__fhCimaRuntime.dropdown);
  observations.push(`requested dropdown mutations=${JSON.stringify(dropdownRuntime)}`);
  console.log(`TARGET ${TARGET_URL}`);
  for (const observation of observations) console.log(`OBS ${observation}`);
  console.log(`CAPTURE consoleErrors=${JSON.stringify(consoleErrors)} pageErrors=${JSON.stringify(pageErrors)}`);

  assert.deepEqual(consoleErrors, [], 'browser console errors');
  assert.deepEqual(pageErrors, [], 'uncaught page errors');
  assert.ok(requestedSelectionEvents.every((event) => MANUAL_SELECTION_IDS.includes(event.id)), 'selection event assertions remain limited to manual requested fields');
  for (const id of MANUAL_SELECTION_IDS) {
    assert.ok(requestedSelectionEvents.some((event) => event.id === id && event.type === 'input' && !event.trusted), `${id} must emit input after requested CIMA selection`);
    assert.ok(requestedSelectionEvents.some((event) => event.id === id && event.type === 'change' && !event.trusted), `${id} must emit change after requested CIMA selection`);
  }

  console.log('PASS: manual requested CIMA browser regression.');
} finally {
  await browser.close();
}
