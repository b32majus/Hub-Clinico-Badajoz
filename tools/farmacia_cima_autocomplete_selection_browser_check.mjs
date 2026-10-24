#!/usr/bin/env node
// tools/farmacia_cima_autocomplete_selection_browser_check.mjs
//
// CIMA autocomplete — Farmacia Validación (issue: autocompletado CIMA en Validación).
//
// Supported interaction only, real browser (Playwright chromium), synthetic
// catalogue injected through the product's own loader (XLSX stub + loadFromExcel):
// no DOM fabrication, no real patient data, no credentials.
//
// Covered behaviour (all three Validación autocompletes):
//  A. one click selects on the FIRST attempt, including a slow click whose
//     press lasts longer than the blur cleanup window;
//  B. after selecting, the list is closed and stays closed 500 ms later;
//  C. every form field with catalogue data is filled from the chosen product;
//  D. a second selection replaces every catalogue field, with no CIP context;
//  E. a professional edit survives a later selection (agreed product decision);
//  F. filled fields remain editable and the edited value is preserved;
//  G. keyboard ArrowDown + Enter still selects;
//  H. an entry that cannot be selected is not offered.

import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUERY = 'sintet';
const SLOW_PRESS_MS = 350;
const SETTLE_MS = 500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xlsx': 'application/octet-stream'
};

// Synthetic products. GAMMA has neither presentation nor dose, so it is not a
// concrete catalogue selection and must never be offered as selectable.
const CATALOG = {
  cima: [
    {
      codigo_nacional: '700001', nregistro: 'SYN/A', drug_source_id: 'CIMA-SYN-A',
      nombre_comercial: 'Producto Sintetico Alfa', principio_activo: 'Molecula Alfa',
      nombre_presentacion: '100 mg jeringa', dosis_presentacion: '100 mg', via: 'VIA SUBCUTANEA'
    },
    {
      codigo_nacional: '700002', nregistro: 'SYN/B', drug_source_id: 'CIMA-SYN-B',
      nombre_comercial: 'Producto Sintetico Beta', principio_activo: 'Molecula Beta',
      nombre_presentacion: '200 mg vial', dosis_presentacion: '200 mg', via: 'VIA INTRAVENOSA'
    },
    {
      codigo_nacional: '700003', nregistro: 'SYN/C', drug_source_id: 'CIMA-SYN-C',
      nombre_comercial: 'Producto Sintetico Gamma', principio_activo: 'Molecula Gamma',
      nombre_presentacion: '', dosis_presentacion: '', via: ''
    }
  ],
  local: []
};

const PRODUCT_A = { name: 'Producto Sintetico Alfa', ingredient: 'Molecula Alfa', presentation: '100 mg jeringa', dose: '100 mg', route: 'SC' };
const PRODUCT_B = { name: 'Producto Sintetico Beta', ingredient: 'Molecula Beta', presentation: '200 mg vial', dose: '200 mg', route: 'IV' };

function loadPlaywright() {
  for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
    for (const nodeModules of [path.resolve(binDirectory, '..'), path.resolve(binDirectory, '..', 'lib', 'node_modules')]) {
      if (!existsSync(path.join(nodeModules, 'playwright', 'package.json'))) continue;
      return createRequire(path.join(nodeModules, '__fh_cima_autocomplete_loader.cjs'))('playwright');
    }
  }
  throw new Error('Playwright not found. Run with: npx --yes --package=playwright node tools/farmacia_cima_autocomplete_selection_browser_check.mjs');
}

function chromiumExecutable(chromium) {
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

const server = createServer((request, response) => {
  const filePath = path.join(ROOT, decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname));
  if (!filePath.startsWith(ROOT) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  response.end(readFileSync(filePath));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable(chromium) });
const pageErrors = [];
const consoleErrors = [];

let passed = 0;
let failed = 0;
async function check(label, body) {
  try {
    await body();
    passed += 1;
    console.log('  \u2713 ' + label);
  } catch (error) {
    failed += 1;
    console.log('  \u2717 ' + label + '\n      ' + (error && error.message ? error.message.split('\n')[0] : error));
  }
}

function newPage() {
  return browser.newPage({ viewport: { width: 1400, height: 1000 } }).then((page) => {
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    return page;
  });
}

// The product loads its catalogue through its own loader; a stub XLSX workbook
// keeps the fixture synthetic and deterministic while still exercising the real
// normalize/search/isConcreteCatalogSelection pipeline.
async function seedCatalog(page) {
  const loaded = await page.evaluate((catalog) => {
    window.XLSX = {
      read: () => ({ Sheets: { CATALOGO_CIMA: { name: 'CIMA' }, CATALOGO_LOCAL_ESPECIAL: { name: 'LOCAL' } } }),
      utils: { sheet_to_json: (sheet) => (sheet.name === 'CIMA' ? catalog.cima : catalog.local) }
    };
    return window.FarmaciaCatalog.loadFromExcel(new ArrayBuffer(0));
  }, CATALOG);
  assert.equal(loaded.loaded, true, 'synthetic catalogue loaded through the product loader');
}

const readValues = async (page, ids) => Object.fromEntries(
  await Promise.all(ids.map(async (id) => [id, await page.locator(`#${id}`).inputValue()]))
);

// Route fields are plain text inputs except the route <select> controls, and
// some routes render a professional-readonly field the user cannot type into.
async function resetFields(page, surface) {
  for (const id of Object.keys(SURFACES[surface].fields)) {
    const control = page.locator(`#${id}`);
    if (id.endsWith('Via')) await control.selectOption('');
    else if (await control.isEditable()) await control.fill('');
  }
}

async function openList(page, { inputId, dropdownId }) {
  await seedCatalog(page);
  const input = page.locator(`#${inputId}`);
  await input.click();
  await input.fill('');
  await input.type(QUERY, { delay: 15 });
  const dropdown = page.locator(`#${dropdownId}`);
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(120);
  return dropdown;
}

const optionNames = async (dropdown) => (await dropdown.locator('.autocomplete-item .autocomplete-item-name').allTextContents())
  .map((text) => text.trim());

const optionFor = (dropdown, name) => dropdown.locator('.autocomplete-item', { hasText: name }).first();

// A slow press: mousedown and mouseup separated by more than the 150 ms blur
// cleanup window, exactly what a real user does when they click deliberately.
async function slowClick(page, locator) {
  const box = await locator.boundingBox();
  assert.ok(box, 'option has a clickable box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(SLOW_PRESS_MS);
  await page.mouse.up();
  await page.waitForTimeout(180);
}

const SURFACES = {
  validated: {
    inputId: 'fhValidadoFarmaco',
    dropdownId: 'autocompleteValidadoDropdown',
    fields: {
      fhValidadoFarmaco: 'name',
      fhValidadoPrincipioActivo: 'ingredient',
      fhValidadoPresentacion: 'presentation',
      fhValidadoDosis: 'dose',
      fhValidadoVia: 'route'
    }
  },
  manual: {
    inputId: 'fhManualFarmaco',
    dropdownId: 'fhManualAutocompleteDropdown',
    fields: {
      fhManualFarmaco: 'name',
      fhManualPrincipioActivo: 'ingredient',
      fhManualDosis: 'dose',
      fhManualVia: 'route'
    }
  },
  requested: {
    inputId: 'fhDermaFarmaco',
    dropdownId: 'autocompleteDropdown',
    fields: {
      fhDermaFarmaco: 'name',
      fhDermaPrincipioActivo: 'ingredient',
      fhDermaDosis: 'dose',
      fhDermaVia: 'route'
    }
  }
};

function assertProduct(values, surface, product, label) {
  for (const [id, key] of Object.entries(SURFACES[surface].fields)) {
    assert.equal(values[id], product[key], `${label}: ${id} must show ${key} "${product[key]}" (found "${values[id]}")`);
  }
}

try {
  // ── Manual Farmacia origin: validated treatment + manual requested request ──
  const page = await newPage();
  await page.goto(BASE + 'farmacia_validacion.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
  await page.locator('#fhServicioManual').selectOption('derma');
  await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
  await page.locator('#validationBlock').waitFor({ state: 'visible' });
  await page.locator('#fhManualCip').fill('');
  await seedCatalog(page);

  // ── Requested Dermatology surface: the supported no-patient route ──
  const dermaPage = await newPage();
  await dermaPage.goto(BASE + 'farmacia_validacion.html', { waitUntil: 'domcontentloaded' });
  await dermaPage.locator('#formDerma').waitFor({ state: 'visible' });
  await seedCatalog(dermaPage);
  const dermaCip = await dermaPage.locator('#fhDermaCip').inputValue();

  const surfaces = [
    { surface: 'validated', page },
    { surface: 'manual', page },
    { surface: 'requested', page: dermaPage }
  ];

  console.log('\n=== CIMA autocomplete — Validación ===');

  // H — a non-selectable entry is never offered.
  for (const { surface, page: surfacePage } of surfaces) {
    await check(`${surface}: an entry without presentation/dose is not offered as an option`, async () => {
      const dropdown = await openList(surfacePage, SURFACES[surface]);
      const names = await optionNames(dropdown);
      assert.deepEqual(names, [PRODUCT_A.name, PRODUCT_B.name],
        `${surface}: only concrete catalogue entries are listed (found ${JSON.stringify(names)})`);
    });
  }

  // A + B + C — a single slow click selects, fills every field, and the list stays closed.
  for (const { surface, page: surfacePage } of surfaces) {
    await check(`${surface}: one slow click selects the product and fills every catalogue field`, async () => {
      const { fields } = SURFACES[surface];
      await resetFields(surfacePage, surface);
      const dropdown = await openList(surfacePage, SURFACES[surface]);
      await slowClick(surfacePage, optionFor(dropdown, PRODUCT_A.name));
      const values = await readValues(surfacePage, Object.keys(fields));
      assertProduct(values, surface, PRODUCT_A, `${surface}: after one slow click`);
      assert.equal(await surfacePage.locator(`#${SURFACES[surface].dropdownId}`).isVisible(), false,
        `${surface}: the suggestion list is closed after selecting`);
      await surfacePage.waitForTimeout(SETTLE_MS);
      assert.equal(await surfacePage.locator(`#${SURFACES[surface].dropdownId}`).isVisible(), false,
        `${surface}: the suggestion list stays closed ${SETTLE_MS} ms after selecting`);
      const settled = await readValues(surfacePage, Object.keys(fields));
      assert.deepEqual(settled, values, `${surface}: filled values are stable ${SETTLE_MS} ms after selecting`);
    });
  }

  // D — a second product replaces every catalogue-written field, with no CIP context.
  for (const { surface, page: surfacePage } of surfaces) {
    await check(`${surface}: a second product replaces every catalogue field without a context CIP`, async () => {
      const { fields } = SURFACES[surface];
      await resetFields(surfacePage, surface);
      let dropdown = await openList(surfacePage, SURFACES[surface]);
      await optionFor(dropdown, PRODUCT_A.name).click();
      assertProduct(await readValues(surfacePage, Object.keys(fields)), surface, PRODUCT_A, `${surface}: first product`);
      dropdown = await openList(surfacePage, SURFACES[surface]);
      await optionFor(dropdown, PRODUCT_B.name).click();
      assertProduct(await readValues(surfacePage, Object.keys(fields)), surface, PRODUCT_B, `${surface}: second product`);
    });
  }

  // E — agreed product decision: a professional edit is never overwritten.
  await check('validated: a professional edit survives a later catalogue selection', async () => {
    const { fields } = SURFACES.validated;
    await resetFields(page, 'validated');
    let dropdown = await openList(page, SURFACES.validated);
    await optionFor(dropdown, PRODUCT_A.name).click();
    await page.locator('#fhValidadoDosis').fill('175 mg profesional');
    dropdown = await openList(page, SURFACES.validated);
    await optionFor(dropdown, PRODUCT_B.name).click();
    const values = await readValues(page, Object.keys(fields));
    assert.equal(values.fhValidadoDosis, '175 mg profesional', 'validated: the professional dose is preserved');
    assert.equal(values.fhValidadoPresentacion, PRODUCT_B.presentation, 'validated: the untouched presentation follows the second product');
    assert.equal(values.fhValidadoVia, PRODUCT_B.route, 'validated: the untouched route follows the second product');
  });

  // F — filled fields remain editable and the edited value is kept.
  for (const { surface, page: surfacePage } of surfaces) {
    await check(`${surface}: a filled field can be edited and keeps the edited value`, async () => {
      const { fields } = SURFACES[surface];
      const editableId = Object.keys(fields).find((id) => id.toLowerCase().includes('dosis') || id.toLowerCase().includes('presentacion'));
      assert.ok(editableId, `${surface}: surface exposes an editable therapeutic field`);
      await resetFields(surfacePage, surface);
      const dropdown = await openList(surfacePage, SURFACES[surface]);
      await optionFor(dropdown, PRODUCT_A.name).click();
      const field = surfacePage.locator(`#${editableId}`);
      assert.equal(await field.isEditable(), true, `${surface}: ${editableId} is editable after the catalogue fill`);
      await field.fill('valor editado por farmacia');
      await surfacePage.waitForTimeout(SETTLE_MS);
      assert.equal(await field.inputValue(), 'valor editado por farmacia', `${surface}: the edited value survives`);
      assert.equal(await surfacePage.locator(`#${SURFACES[surface].inputId}`).inputValue(), PRODUCT_A.name,
        `${surface}: editing a therapeutic field keeps the selected product in place`);
    });
  }

  // G — keyboard navigation still selects.
  for (const { surface, page: surfacePage } of surfaces) {
    await check(`${surface}: ArrowDown + Enter selects the highlighted option`, async () => {
      const { fields } = SURFACES[surface];
      await resetFields(surfacePage, surface);
      await seedCatalog(surfacePage);
      const input = surfacePage.locator(`#${SURFACES[surface].inputId}`);
      await input.click();
      await input.type(QUERY, { delay: 15 });
      await surfacePage.locator(`#${SURFACES[surface].dropdownId}`).waitFor({ state: 'visible', timeout: 5000 });
      await input.press('ArrowDown');
      await input.press('Enter');
      await surfacePage.waitForTimeout(200);
      const values = await readValues(surfacePage, Object.keys(fields));
      assertProduct(values, surface, PRODUCT_A, `${surface}: keyboard selection`);
    });
  }

  assert.equal(dermaCip, '', 'requested surface starts with no context CIP');
  assert.deepEqual(pageErrors, [], 'no page errors');
  assert.deepEqual(consoleErrors, [], 'no console errors');
  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}: CIMA autocomplete in Farmacia Validación (${passed} passed, ${failed} failed).`);
  if (failed > 0) process.exitCode = 1;
} catch (error) {
  console.error(`FAIL: ${error && error.message ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
