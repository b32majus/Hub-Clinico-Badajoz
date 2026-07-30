#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const TARGET_URL = process.env.FH_VALIDACION_URL || 'http://127.0.0.1:4174/farmacia_validacion.html';
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

page.on('console', (message) => {
  observations.push(`console.${message.type()}: ${message.text()}`);
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('dialog', (dialog) => dialog.dismiss());

try {
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

  const catalogScenario = await page.evaluate((query) => {
    const catalog = window.FarmaciaCatalog;
    const association = (drug) => ({
      farmaco: String(drug.display_name || drug.nombre_comercial || '').trim(),
      principioActivo: String(drug.principio_activo || '').trim(),
      dosis: String(drug.dosis || '').trim(),
      via: String(typeof catalog.mapCatalogViaToSelect === 'function' ? catalog.mapCatalogViaToSelect(drug.via) : (drug.via || '')).trim()
    });
    const products = catalog.search(query)
      .filter((drug) => drug.source_type === 'CIMA')
      .map(association)
      .filter((product) => Object.values(product).every(Boolean))
      .filter((product, index, candidates) => candidates.findIndex((candidate) => candidate.farmaco === product.farmaco) === index);
    return { query, products: products.slice(0, 2), completeDistinctCount: products.length };
  }, SEARCH_QUERY);
  assert.ok(
    catalogScenario.completeDistinctCount >= 2,
    `catalog must provide at least two distinct complete CIMA products for exactly "${SEARCH_QUERY}"; found ${catalogScenario.completeDistinctCount}`
  );

  const pauta = page.locator('#fhManualPauta');
  const induccion = page.locator('#fhManualInduccion');
  await pauta.selectOption('CADA_4_SEMANAS');
  await induccion.selectOption('si');

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

  const chooseFirst = async ({ cip, childSelector, label }) => {
    await page.locator('#fhManualCip').fill(cip);
    await requestedFields.principioActivo.fill('');
    await requestedFields.dosis.fill('');
    await requestedFields.via.selectOption('');
    await requested.fill('');
    await requested.fill(SEARCH_QUERY);
    await dropdown.waitFor({ state: 'visible' });
    const first = dropdown.locator('.autocomplete-item').first();
    await first.waitFor({ state: 'visible' });
    const expectedName = (await first.locator('.autocomplete-item-name').textContent()).trim();
    const expected = catalogScenario.products[0];
    assert.equal(expectedName, expected.farmaco, `${label}: first result matches dynamically selected catalog product`);
    assert.equal((await first.locator('.drug-source-tag').textContent()).trim(), 'CIMA', `${label}: first result source`);
    const eventStart = await page.evaluate(() => window.__fhCimaRuntime.events.length);

    await first.locator(childSelector).click();
    const immediate = await readRequested();
    const summaryImmediate = await copyRequestedSummary();
    await page.waitForTimeout(500);
    const delayed = await readRequested();
    const summaryDelayed = await copyRequestedSummary();
    const clickEvents = await page.evaluate((start) => window.__fhCimaRuntime.events.slice(start), eventStart);

    observations.push(`${label}: immediate=${JSON.stringify(immediate)}`);
    observations.push(`${label}: after500ms=${JSON.stringify(delayed)}`);
    observations.push(`${label}: selection-events=${JSON.stringify(clickEvents)}`);
    assert.equal(immediate.farmaco, expectedName, `${label}: product visible immediately`);
    assertAssociatedFields(immediate, expected, `${label}: immediately after click`);
    assert.deepEqual(delayed, immediate, `${label}: values stable after 500 ms`);
    assertAssociatedFields(delayed, expected, `${label}: after 500 ms`);
    assert.equal(immediate.pauta, 'CADA_4_SEMANAS', `${label}: pauta preserved`);
    assert.equal(immediate.induccion, 'si', `${label}: induccion preserved`);
    const sectionImmediate = requestedSection(summaryImmediate);
    const sectionDelayed = requestedSection(summaryDelayed);
    assertRequestedSummary(sectionImmediate, expected, `${label}: immediately after click`);
    assertRequestedSummary(sectionDelayed, expected, `${label}: after 500 ms`);
    assert.equal(sectionDelayed, sectionImmediate, `${label}: requested summary stable after 500 ms`);
    return { expectedName, clickEvents };
  };

  const emptyCip = await chooseFirst({ cip: '', childSelector: '.autocomplete-item-name', label: 'empty CIP / first result name' });
  const keyedTag = await chooseFirst({ cip: 'CIP-MANUAL-CIMA-001', childSelector: '.drug-source-tag', label: 'keyed CIP / first result CIMA tag' });
  const keyedDetail = await chooseFirst({ cip: 'CIP-MANUAL-CIMA-001', childSelector: '.autocomplete-item-detail', label: 'keyed CIP / first result detail' });

  await page.locator('#fhPatologiaManual').selectOption({ label: 'Psoriasis' });
  assert.equal(await page.locator('#fhManualPatologiaDisplay').inputValue(), 'Psoriasis', 'pathology rerender is visible');
  await requested.fill('');
  await requested.fill(SEARCH_QUERY);
  await dropdown.waitFor({ state: 'visible' });
  const items = dropdown.locator('.autocomplete-item');
  assert.ok(await items.count() > 1, 'demo catalog offers a second secu product');
  const second = items.nth(1);
  const secondName = (await second.locator('.autocomplete-item-name').textContent()).trim();
  const secondExpected = catalogScenario.products[1];
  assert.equal(secondName, secondExpected.farmaco, 'second result matches dynamically selected catalog product after rerender');
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
  assert.equal(secondImmediate.pauta, 'CADA_4_SEMANAS', 'second product preserves pauta');
  assert.equal(secondImmediate.induccion, 'si', 'second product preserves induccion');
  const secondSectionImmediate = requestedSection(secondSummaryImmediate);
  const secondSectionDelayed = requestedSection(secondSummaryDelayed);
  assertRequestedSummary(secondSectionImmediate, secondExpected, 'second product summary immediately after rerender click');
  assertRequestedSummary(secondSectionDelayed, secondExpected, 'second product summary after rerender and 500 ms');
  assert.equal(secondSectionDelayed, secondSectionImmediate, 'second product requested summary stable after 500 ms');

  const validated = page.locator('#fhValidadoFarmaco');
  await validated.fill('');
  await validated.fill(SEARCH_QUERY);
  const validatedDropdown = page.locator('#autocompleteValidadoDropdown');
  await validatedDropdown.waitFor({ state: 'visible' });
  const validatedFirst = validatedDropdown.locator('.autocomplete-item').first();
  const validatedExpected = (await validatedFirst.locator('.autocomplete-item-name').textContent()).trim();
  await validatedFirst.locator('.autocomplete-item-name').click();
  observations.push(`validated comparison: value=${await validated.inputValue()}`);
  assert.equal(await validated.inputValue(), validatedExpected, 'fhValidadoFarmaco selects the same first catalog result');
  assert.equal(emptyCip.expectedName, validatedExpected, 'empty-CIP requested and validated first result match');
  assert.equal(keyedTag.expectedName, validatedExpected, 'CIMA-tag requested and validated first result match');
  assert.equal(keyedDetail.expectedName, validatedExpected, 'detail requested and validated first result match');

  const requestedSelectionEvents = [...[emptyCip, keyedTag, keyedDetail].flatMap((result) => result.clickEvents), ...secondClickEvents];
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
