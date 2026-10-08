#!/usr/bin/env node
'use strict';
/**
 * Browser QA for the Reuma drug autocomplete backed by the published catalogue
 * (SIL-REV-016 / tickets #444 + #447, TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06).
 *
 * Real Chromium (Playwright) qualification of primera_visita.html and
 * seguimiento.html over a served repository root. Every assertion runs through
 * supported user-level interaction (real combobox typing, real result clicks,
 * real "+" buttons, real collapsible headers). page.evaluate is used only to
 * READ observable state (selected <select> value, option count, DOM structure).
 *
 * Scenarios on BOTH pages:
 *   S0  every medication field declares its category explicitly and the added
 *       treatment line inherits the same category;
 *   S1  partial search + selection scoped to the field's category writes only
 *       the medicine name to the value holder and leaves the therapeutic dose
 *       field empty (no side write);
 *   S2  changing the selected medicine does NOT overwrite an existing dose;
 *   S3  an additional treatment line exposes a working autocomplete without
 *       touching the primary line;
 *   S4  re-initialisation does not duplicate wrappers, inputs or options;
 *   S5  explicit clear is a supported action (sets the neutral value);
 *   S6  category isolation: a medicine from another category is not offered
 *       (no options), while a category-valid medicine is offered;
 *   S7  with the catalogue unavailable the field is disabled, comprehensible
 *       and offers no invented options;
 *   S8  with the classification source unavailable the fields fail visibly
 *       with no invented options and no unrestricted fallback;
 *   S9  an empty category fails visibly while other categories keep working;
 *   S10 console.error === 0 and pageerror === 0.
 *   S11 a field restored with an already-authoritative selection hydrates its
 *       visible input at initialization, without an incidental blur;
 *   S12 an in-progress query in a focused, visible input survives a catalogue
 *       state change (re-projection happens on blur, not mid-search).
 *
 * Synthetic data only. Exit code 0 = PASS, 1 = FAIL.
 * Usage: node tools/reuma_drug_catalog_browser_check.mjs
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const results = [];
function record(name, pass, detail) {
    results.push(pass);
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function loadPlaywrightFromNpx() {
    const tried = [];
    const tryNodeModules = (nodeModules) => {
        const pkg = path.join(nodeModules, 'playwright', 'package.json');
        tried.push(pkg);
        if (fs.existsSync(pkg)) {
            return createRequire(path.join(nodeModules, '__reuma_drug_catalog_loader.cjs'))('playwright');
        }
        return null;
    };
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        if (!binDirectory) continue;
        const prefix = path.resolve(binDirectory, '..');
        for (const nodeModules of [prefix, path.join(prefix, 'lib', 'node_modules')]) {
            const loaded = tryNodeModules(nodeModules);
            if (loaded) return loaded;
        }
    }
    const npxCache = path.join(process.env.HOME || '', '.npm', '_npx');
    if (fs.existsSync(npxCache)) {
        for (const entry of fs.readdirSync(npxCache).sort().reverse()) {
            const loaded = tryNodeModules(path.join(npxCache, entry, 'node_modules'));
            if (loaded) return loaded;
        }
    }
    const loaded = tryNodeModules(path.join(ROOT, 'node_modules'));
    if (loaded) return loaded;
    throw new Error('Playwright not found. Tried: ' + tried.join(', '));
}

let chromium;
try {
    ({ chromium } = loadPlaywrightFromNpx());
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    console.log('RESULTADO: 0 OK / 1 FALLIDO');
    process.exit(1);
}

function chromiumExecutable() {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const bundled = chromium.executablePath();
    if (fs.existsSync(bundled)) return bundled;
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    if (!fs.existsSync(cache)) return bundled;
    const candidates = fs.readdirSync(cache)
        .filter((entry) => entry.startsWith('chromium_headless_shell-'))
        .sort().reverse()
        .map((entry) => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    return candidates.find(fs.existsSync) || bundled;
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-drug-catalog-'));
const workbookPath = path.join(tempDir, 'reuma_drug_catalog_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    for (const sheetName of ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN']) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ ID_Paciente: 'SYN-000-000' }]), sheetName);
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
    ]), 'Profesionales');
    fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

// A valid workbook WITHOUT the expected catalogue sheets: used to simulate an
// unusable published catalogue with a 200 response (no fake network error).
const badCatalogPath = path.join(tempDir, 'bad_catalog_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ hoja: 'OTRA' }]), 'OTRA');
    fs.writeFileSync(badCatalogPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

async function passSupportedGate(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/reuma_index.html`, { waitUntil: 'load', timeout: 45000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    await page.close();
    return context;
}

const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function isReallyHitTestable(page, selector) {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!top && (top === el || el.contains(top));
    }, selector);
}

async function openAncestorCollapsibles(page, selector) {
    for (let attempt = 0; attempt < 4; attempt++) {
        if (await isReallyHitTestable(page, selector)) return true;
        const headers = page.locator(selector).first().locator(
            'xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]'
        );
        const count = await headers.count();
        if (!count) return false;
        let clicked = false;
        for (let i = 0; i < count; i++) {
            const header = headers.nth(i);
            const isActive = await header.evaluate((el) => el.classList.contains('active'));
            if (!isActive) {
                await header.click();
                clicked = true;
                await page.waitForTimeout(650);
            }
        }
        if (!clicked) return isReallyHitTestable(page, selector);
    }
    return isReallyHitTestable(page, selector);
}

function autocompleteInputSelector(selectId) {
    return `.drug-autocomplete:has(#${selectId}) .drug-autocomplete__input`;
}

async function awaitCatalogReady(page, selectId) {
    await page.waitForFunction((id) => {
        const select = document.getElementById(id);
        const wrapper = select ? select.closest('.drug-autocomplete') : null;
        const input = wrapper ? wrapper.querySelector('.drug-autocomplete__input') : null;
        return !!(input && !input.disabled);
    }, selectId, { timeout: 30000 });
}

async function readSelect(page, id) {
    return page.evaluate((selectId) => {
        const select = document.getElementById(selectId);
        if (!select) return null;
        return { value: select.value, options: Array.from(select.options).map((o) => o.value) };
    }, id);
}

async function selectDrug(page, selectId, query, expectSubstring) {
    const input = page.locator(autocompleteInputSelector(selectId));
    await input.click();
    await input.fill('');
    await input.fill(query);
    const items = page.locator(autocompleteInputSelector(selectId) + ' ~ .drug-autocomplete__list .drug-autocomplete__item');
    await items.first().waitFor({ state: 'visible', timeout: 10000 });
    const firstText = (await items.first().textContent()).trim();
    await items.first().click();
    await page.waitForTimeout(120);
    const value = (await readSelect(page, selectId)).value;
    const ok = value === firstText && (!expectSubstring || value.toUpperCase().includes(expectSubstring));
    return { ok, value, firstText };
}

async function runSuite(browser, label, pagePath, cfg) {
    console.log(`\n=== ${label} (${pagePath}) ===`);
    const context = await passSupportedGate(browser);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });

    try {
        await awaitCatalogReady(page, cfg.selectId);
        if (typeof cfg.prepare === 'function') await cfg.prepare(page);

        // Inventory: every supported drug field uses the same read-only search,
        // and non-drug fields are left untouched.
        const inventory = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            const wrapper = select ? select.closest('.drug-autocomplete') : null;
            const input = wrapper ? wrapper.querySelector('.drug-autocomplete__input') : null;
            return { id, wrapped: !!wrapper, inputs: wrapper ? wrapper.querySelectorAll('.drug-autocomplete__input').length : 0, enabled: input ? !input.disabled : false };
        }), cfg.allSelectIds);
        const inventoryOk = inventory.every((item) => item.wrapped && item.inputs === 1 && item.enabled);
        record(`${label}: todos los campos de fármaco comparten el mismo autocompletado`,
            inventoryOk, JSON.stringify(inventory));
        const nonDrug = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return { id, wrapped: !!(select && select.closest('.drug-autocomplete')) };
        }), cfg.nonDrugIds || []);
        record(`${label}: los campos no farmacológicos no se convierten`,
            nonDrug.every((item) => item.wrapped === false), JSON.stringify(nonDrug));

        // S0 — every medication field declares its functional category.
        const categories = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            return { id, category: select ? (select.dataset.drugCategory || '') : null };
        }), cfg.allSelectIds);
        const categoriesOk = categories.every((item) => item.category && item.category === cfg.expectedCategories[item.id]);
        record(`${label}: cada campo declara explícitamente su categoría`, categoriesOk, JSON.stringify(categories));

        const inputSel = autocompleteInputSelector(cfg.selectId);
        const visible = await openAncestorCollapsibles(page, inputSel);
        record(`${label}: el campo de fármaco (autocomplete) es visible por interacción soportada`, visible, 'no hit-testable');

        // S1 — partial search + selection (category-scoped) writes only the name,
        // dose untouched.
        const s1 = await selectDrug(page, cfg.selectId, cfg.query1, cfg.query1Expect);
        record(`${label}: búsqueda parcial + selección escribe el nombre esperado`, s1.ok, JSON.stringify(s1));
        const doseAfterS1 = await page.locator(`#${cfg.doseId}`).inputValue();
        const doseEnabledS1 = await page.locator(`#${cfg.doseId}`).isEnabled();
        record(`${label}: la selección no escribe dosis (campo vacío, habilitado)`, doseAfterS1 === '' && doseEnabledS1, `dose='${doseAfterS1}' enabled=${doseEnabledS1}`);

        // S2 — changing the selected medicine keeps an existing dose.
        await page.locator(`#${cfg.doseId}`).fill('40 mg / 2 sem');
        const s2 = await selectDrug(page, cfg.selectId, cfg.query2, cfg.query2Expect);
        record(`${label}: un segundo fármaco se selecciona correctamente`, s2.ok, JSON.stringify(s2));
        const doseAfterS2 = await page.locator(`#${cfg.doseId}`).inputValue();
        record(`${label}: cambiar de fármaco NO sobrescribe la dosis existente`, doseAfterS2 === '40 mg / 2 sem', `dose='${doseAfterS2}'`);

        // The supported collection API must expose exactly the selected name
        // and the explicitly typed dose — nothing else was written.
        const collectedDrug = await page.evaluate((fnName) => {
            const datos = HubTools.form[fnName]();
            if (fnName === 'recopilarDatosFormulario') {
                return (datos.previoSistemicosEntries || []).map((entry) => ({ farmaco: entry.farmaco, dosis: entry.dosis }));
            }
            const slot = datos.tratamientoData && datos.tratamientoData.cambio ? datos.tratamientoData.cambio.sistemicos : null;
            return slot ? [{ farmaco: slot.farmaco, dosis: slot.dosis }] : [];
        }, cfg.collectFnName);
        const collectedOk = collectedDrug.length === 1 && collectedDrug[0].farmaco.toUpperCase().includes(cfg.query2Expect) && collectedDrug[0].dosis === '40 mg / 2 sem';
        record(`${label}: la colección soportada refleja nombre + dosis explícita sin escritura lateral`, collectedOk, JSON.stringify(collectedDrug));

        // S3 — additional treatment line through the supported "+" button.
        await page.locator(`.add-treatment-line-btn[data-type="${cfg.addType}"]`).click();
        await page.waitForSelector(`#${cfg.extrasId} .drug-autocomplete__input:not([disabled])`, { timeout: 10000 });
        const extraCategory = await page.evaluate((containerId) => {
            const line = document.getElementById(containerId).querySelector('.treatment-extra');
            const select = line ? line.querySelector('select') : null;
            return select ? (select.dataset.drugCategory || '') : null;
        }, cfg.extrasId);
        record(`${label}: la línea adicional hereda la categoría explícita de su control principal`,
            extraCategory === cfg.expectedCategories[cfg.selectId], `extra='${extraCategory}'`);
        const extraInput = page.locator(`#${cfg.extrasId} .drug-autocomplete__input`).last();
        await extraInput.click();
        await extraInput.fill(cfg.query1);
        const extraItems = page.locator(`#${cfg.extrasId} .drug-autocomplete__item`);
        await extraItems.first().waitFor({ state: 'visible', timeout: 10000 });
        const extraName = (await extraItems.first().textContent()).trim();
        await extraItems.first().click();
        await page.waitForTimeout(120);
        const extraValue = await page.evaluate((containerId) => {
            const line = document.getElementById(containerId).querySelector('.treatment-extra');
            const select = line ? line.querySelector('select') : null;
            return select ? select.value : null;
        }, cfg.extrasId);
        record(`${label}: una línea adicional usa el autocomplete sin tocar la línea principal`, extraValue === extraName, `extra='${extraValue}' primary='${(await readSelect(page, cfg.selectId)).value}'`);

        // S4 — re-initialisation must not duplicate wrappers/inputs/options.
        const before = await page.evaluate((id) => {
            const select = document.getElementById(id);
            const wrapper = select ? select.closest('.drug-autocomplete') : null;
            return {
                wrappers: document.querySelectorAll('.drug-autocomplete').length,
                inputsForSelect: wrapper ? wrapper.querySelectorAll('.drug-autocomplete__input').length : -1,
                options: select ? select.options.length : -1,
            };
        }, cfg.selectId);
        await page.evaluate(() => {
            HubTools.ui.initDrugAutocomplete(document);
            HubTools.form.inicializarEventosTratamientos();
            HubTools.ui.initDrugAutocomplete(document);
            HubTools.form.inicializarEventosTratamientos();
        });
        const after = await page.evaluate((id) => {
            const select = document.getElementById(id);
            const wrapper = select ? select.closest('.drug-autocomplete') : null;
            return {
                wrappers: document.querySelectorAll('.drug-autocomplete').length,
                inputsForSelect: wrapper ? wrapper.querySelectorAll('.drug-autocomplete__input').length : -1,
                options: select ? select.options.length : -1,
            };
        }, cfg.selectId);
        record(`${label}: re-inicializar no duplica wrappers/inputs/opciones`,
            after.wrappers === before.wrappers && after.inputsForSelect === 1 && after.options === before.options,
            `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);

        // S5 — explicit clear is supported and neutral.
        const clearInput = page.locator(inputSel);
        await clearInput.click();
        await clearInput.fill('');
        const clearItem = page.locator(`${inputSel} ~ .drug-autocomplete__list .drug-autocomplete__item--clear`);
        await clearItem.waitFor({ state: 'visible', timeout: 10000 });
        await clearItem.click();
        await page.waitForTimeout(120);
        const cleared = await readSelect(page, cfg.selectId);
        record(`${label}: limpiar selección deja el valor neutro 'No'`, cleared.value === 'No', JSON.stringify(cleared));

        // S6 — category isolation through supported interaction: a medicine of
        // another category is never offered; a category-valid one is.
        await openAncestorCollapsibles(page, autocompleteInputSelector(cfg.crossCategorySelectId));
        const crossInput = page.locator(autocompleteInputSelector(cfg.crossCategorySelectId));
        await crossInput.click();
        await crossInput.fill('');
        await crossInput.fill('cosentyx');
        await page.waitForTimeout(250);
        const crossCount = await page.locator(autocompleteInputSelector(cfg.crossCategorySelectId) + ' ~ .drug-autocomplete__list .drug-autocomplete__item').count();
        record(`${label}: un fármaco de otra categoría no se ofrece (aislamiento)`, crossCount === 0, `items=${crossCount}`);
        const ownInput = page.locator(autocompleteInputSelector(cfg.ownCategorySelectId));
        await openAncestorCollapsibles(page, autocompleteInputSelector(cfg.ownCategorySelectId));
        await ownInput.click();
        await ownInput.fill('');
        await ownInput.fill('cosentyx');
        const ownItems = page.locator(autocompleteInputSelector(cfg.ownCategorySelectId) + ' ~ .drug-autocomplete__list .drug-autocomplete__item');
        await ownItems.first().waitFor({ state: 'visible', timeout: 10000 });
        const ownName = (await ownItems.first().textContent()).trim();
        record(`${label}: un fármaco de la propia categoría sí se ofrece`, /COSENTYX/i.test(ownName), `first='${ownName}'`);
        await ownInput.press('Escape');

        // S6/S7 — console hygiene.
        record(`${label}: console.error === 0`, consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record(`${label}: pageerror === 0`, pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await context.close();
    }
}

async function runUnavailableSuite(browser) {
    console.log('\n=== catálogo no disponible (primera_visita.html) ===');
    const context = await passSupportedGate(browser);
    await context.route('**/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            path: badCatalogPath,
        });
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/primera_visita.html`, { waitUntil: 'domcontentloaded' });

    try {
        const id = 'previoSistemicoSelect';
        await page.waitForFunction((selectId) => {
            const select = document.getElementById(selectId);
            const wrapper = select ? select.closest('.drug-autocomplete') : null;
            const input = wrapper ? wrapper.querySelector('.drug-autocomplete__input') : null;
            return !!(input && input.disabled && /no disponible/i.test(input.placeholder));
        }, id, { timeout: 30000 });

        const state = await page.evaluate((selectId) => {
            const select = document.getElementById(selectId);
            const wrapper = select ? select.closest('.drug-autocomplete') : null;
            const input = wrapper ? wrapper.querySelector('.drug-autocomplete__input') : null;
            return {
                disabled: input ? input.disabled : null,
                placeholder: input ? input.placeholder : '',
                options: select ? Array.from(select.options).map((o) => o.value) : [],
            };
        }, id);
        const comprehensible = state.disabled === true && /no disponible/i.test(state.placeholder);
        record('catálogo ausente: campo deshabilitado con estado comprensible', comprehensible, JSON.stringify(state));
        const invented = state.options.filter((value) => value && value !== 'No');
        record('catálogo ausente: no se inventan opciones de fármaco', invented.length === 0, JSON.stringify(state.options));
        record('catálogo ausente: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('catálogo ausente: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await context.close();
    }
}

// A versioned classification source that cannot be parsed (HTTP 200, invalid
// body): fields must fail visibly and safely, never fall back to the full
// catalogue.
async function runCategoriesUnavailableSuite(browser) {
    console.log('\n=== clasificación por categorías no disponible (primera_visita.html) ===');
    const context = await passSupportedGate(browser);
    await context.route('**/reuma_medication_categories.v1.json', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{ esta-no-es-json' });
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/primera_visita.html`, { waitUntil: 'domcontentloaded' });
    try {
        const fieldIds = [
            'previoSistemicoSelect', 'previoFameSelect', 'previoBiologicoSelect',
            'sistemicoSelect', 'fameSelect', 'biologicoSelect', 'psoriasisSistemicoSelect',
        ];
        await page.waitForFunction((ids) => ids.every((id) => {
            const select = document.getElementById(id);
            const wrapper = select ? select.closest('.drug-autocomplete') : null;
            const input = wrapper ? wrapper.querySelector('.drug-autocomplete__input') : null;
            return !!(input && input.disabled && /no disponible/i.test(input.placeholder));
        }), fieldIds, { timeout: 30000 });
        const fields = await page.evaluate((ids) => ids.map((id) => {
            const select = document.getElementById(id);
            const input = select.closest('.drug-autocomplete')?.querySelector('.drug-autocomplete__input');
            return { id, disabled: input ? input.disabled : null, placeholder: input ? input.placeholder : '', options: Array.from(select.options).map((o) => o.value) };
        }), fieldIds);
        record('clasificación ausente: todos los campos fallan visibles y seguros',
            fields.every((field) => field.disabled === true && /no disponible/i.test(field.placeholder)), JSON.stringify(fields));
        record('clasificación ausente: sin catálogo completo como fallback',
            fields.every((field) => field.options.filter((value) => value && value !== 'No').length === 0), JSON.stringify(fields));
        record('clasificación ausente: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('clasificación ausente: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await context.close();
    }
}

// S11 — a medication field restored/initialized with an already-authoritative
// selection must hydrate its VISIBLE input immediately, without waiting for an
// incidental blur. The fixture only builds the precondition (a real
// data-drug-autocomplete control whose authoritative option is already
// selected) and runs the PUBLIC init seam; the assertion READS the visible
// input and never writes it.
async function runRestoreHydrationSuite(browser) {
    console.log('\n=== restauración de medicamento preseleccionado (primera_visita.html) ===');
    const context = await passSupportedGate(browser);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/primera_visita.html`, { waitUntil: 'domcontentloaded' });
    try {
        await awaitCatalogReady(page, 'previoSistemicoSelect');
        const restored = await page.evaluate(() => {
            const host = document.createElement('div');
            host.id = 'restoredMedicationHost';
            const select = document.createElement('select');
            select.id = 'restoredMedicationSelect';
            select.setAttribute('data-drug-autocomplete', 'true');
            select.setAttribute('data-drug-category', 'Sistemicos');
            [['No', false], ['Prednisona', true]].forEach(([value, selected]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                option.selected = selected;
                select.appendChild(option);
            });
            host.appendChild(select);
            document.body.appendChild(host);

            // Supported initialization seam, invoked with the field already
            // carrying its authoritative restored selection.
            HubTools.ui.initDrugAutocomplete(host);

            const input = host.querySelector('.drug-autocomplete__input');
            return {
                wrapperBuilt: !!select.closest('.drug-autocomplete'),
                visibleInput: input ? input.value : null,
                focused: document.activeElement === input,
                authoritativeValue: select.value,
                authoritativeLabel: select.options[select.selectedIndex]
                    ? select.options[select.selectedIndex].textContent
                    : null,
            };
        });
        record('restauración: el input visible hidrata el fármaco preseleccionado sin blur',
            restored.wrapperBuilt && restored.visibleInput === 'Prednisona'
            && restored.visibleInput === restored.authoritativeLabel,
            JSON.stringify(restored));
        record('restauración: el valor autoritativo del control se preserva',
            restored.authoritativeValue === 'Prednisona', JSON.stringify(restored));
        record('restauración: la hidratación no depende de foco ni blur',
            restored.focused === false, JSON.stringify(restored));
        record('restauración: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('restauración: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await context.close();
    }
}

// S12 — a catalogue state change must NOT clobber the field the user is
// editing. The fixture establishes an authoritative selection and starts a
// real, unsent query through supported interaction (real typing); it then
// triggers a GENUINE catalogue change through the module's public loader
// (`HubTools.catalog.loadCategories`, which re-emits `hubcatalog:changed`) and
// only READS the visible input. Leaving the field must re-project the
// authoritative label. page.evaluate never writes the input under test.
async function runRefreshPreservesQuerySuite(browser) {
    console.log('\n=== un refresco de catálogo no pisa la búsqueda en curso (primera_visita.html) ===');
    const context = await passSupportedGate(browser);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/primera_visita.html`, { waitUntil: 'domcontentloaded' });
    try {
        await awaitCatalogReady(page, 'previoSistemicoSelect');
        const inputSel = autocompleteInputSelector('previoSistemicoSelect');
        if (!(await openAncestorCollapsibles(page, inputSel))) {
            throw new Error('no se pudo abrir el campo Sistemicos');
        }

        // Authoritative selection through supported interaction.
        const selected = await selectDrug(page, 'previoSistemicoSelect', 'prednisona', 'PREDNISONA');
        const authoritative = await readSelect(page, 'previoSistemicoSelect');

        // The user starts a new search: a real, in-progress, unsent query in
        // the visible, focused input.
        const input = page.locator(inputSel);
        await input.click();
        await input.fill('metil');
        const beforeRefresh = await input.inputValue();

        // Genuine catalogue state change via the module's public loader (same
        // published classification re-applied -> re-emits hubcatalog:changed).
        await page.evaluate(async () => {
            const response = await fetch('data/catalogos/reuma/reuma_medication_categories.v1.json');
            HubTools.catalog.loadCategories(await response.json());
        });
        await page.waitForTimeout(150);

        const afterRefresh = await input.inputValue();
        const stillFocused = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), inputSel);
        const selectAfterRefresh = await readSelect(page, 'previoSistemicoSelect');
        record('refresco de catálogo: la consulta en curso sigue visible y con foco',
            selected.ok && beforeRefresh === 'metil' && afterRefresh === 'metil' && stillFocused === true,
            JSON.stringify({ selected, beforeRefresh, afterRefresh, stillFocused }));
        record('refresco de catálogo: el valor autoritativo del control se preserva',
            selectAfterRefresh.value === authoritative.value,
            JSON.stringify({ before: authoritative.value, after: selectAfterRefresh.value }));

        // Leaving the field re-projects the authoritative label.
        await page.evaluate((sel) => { document.querySelector(sel).blur(); }, inputSel);
        await page.waitForTimeout(300);
        const afterBlur = await input.inputValue();
        record('refresco de catálogo: al salir del campo se resincroniza la etiqueta autoritativa',
            afterBlur === authoritative.value,
            JSON.stringify({ afterBlur, authoritative: authoritative.value }));

        record('refresco de catálogo: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('refresco de catálogo: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await context.close();
    }
}

// A versioned classification source that legitimately declares an empty
// category: that category fails visibly while the others keep working.
async function runEmptyCategorySuite(browser) {
    console.log('\n=== categoría sin cobertura declarada (primera_visita.html) ===');
    const context = await passSupportedGate(browser);
    const synthetic = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalogos', 'reuma', 'reuma_medication_categories.v1.json'), 'utf8'));
    synthetic.categories.Biologicos = { label: 'Biológicos', catalogue_tokens: [], explicit_entries: [] };
    await context.route('**/reuma_medication_categories.v1.json', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(synthetic) });
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto(`${baseUrl}/primera_visita.html`, { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForFunction(() => {
            const select = document.getElementById('previoBiologicoSelect');
            const input = select?.closest('.drug-autocomplete')?.querySelector('.drug-autocomplete__input');
            return !!(input && input.disabled && /sin fármacos disponibles/i.test(input.placeholder));
        }, null, { timeout: 30000 });
        const emptyCategory = await page.evaluate(() => {
            const select = document.getElementById('previoBiologicoSelect');
            const input = select.closest('.drug-autocomplete').querySelector('.drug-autocomplete__input');
            return { disabled: input.disabled, placeholder: input.placeholder, options: Array.from(select.options).map((o) => o.value) };
        });
        record('categoría vacía: falla visible y segura sin opciones inventadas',
            emptyCategory.disabled === true && /sin fármacos disponibles/i.test(emptyCategory.placeholder)
            && emptyCategory.options.every((value) => !value || value === 'No'), JSON.stringify(emptyCategory));
        await awaitCatalogReady(page, 'previoSistemicoSelect');
        const openedSistemicos = await openAncestorCollapsibles(page, autocompleteInputSelector('previoSistemicoSelect'));
        if (!openedSistemicos) throw new Error('no se pudo abrir el campo Sistemicos');
        const sistemicos = await selectDrug(page, 'previoSistemicoSelect', 'prednisona', 'PREDNISONA');
        record('categoría vacía: las demás categorías siguen operativas', sistemicos.ok, JSON.stringify(sistemicos));
        record('categoría vacía: console.error === 0', consoleErrors.length === 0, JSON.stringify(consoleErrors));
        record('categoría vacía: pageerror === 0', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally {
        await context.close();
    }
}

let browser;
try {
    browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable() });
    await runSuite(browser, 'primera_visita', 'primera_visita.html', {
        selectId: 'previoSistemicoSelect',
        doseId: 'previoSistemicoDose',
        addType: 'sistemico',
        extrasId: 'sistemicosExtras',
        collectFnName: 'recopilarDatosFormulario',
        query1: 'prednisona',
        query1Expect: 'PREDNISONA',
        query2: 'metilprednisolona',
        query2Expect: 'METILPREDNISOLONA',
        crossCategorySelectId: 'previoSistemicoSelect',
        ownCategorySelectId: 'previoBiologicoSelect',
        allSelectIds: [
            'previoSistemicoSelect', 'previoFameSelect', 'previoBiologicoSelect',
            'sistemicoSelect', 'fameSelect', 'biologicoSelect', 'psoriasisSistemicoSelect',
        ],
        expectedCategories: {
            previoSistemicoSelect: 'Sistemicos',
            previoFameSelect: 'FAMEs',
            previoBiologicoSelect: 'Biologicos',
            sistemicoSelect: 'Sistemicos',
            fameSelect: 'FAMEs',
            biologicoSelect: 'Biologicos',
            psoriasisSistemicoSelect: 'Sistemicos',
        },
        nonDrugIds: ['psoriasisTopicoSelect', 'psoriasisFototerapiaSelect'],
    });
    await runSuite(browser, 'seguimiento', 'seguimiento.html', {
        selectId: 'cambioSistemicoSelect',
        doseId: 'cambioSistemicoDose',
        addType: 'cambio-sistemico',
        extrasId: 'cambioSistemicosExtras',
        collectFnName: 'recopilarDatosFormularioSeguimiento',
        query1: 'prednisona',
        query1Expect: 'PREDNISONA',
        query2: 'metilprednisolona',
        query2Expect: 'METILPREDNISOLONA',
        crossCategorySelectId: 'cambioSistemicoSelect',
        ownCategorySelectId: 'cambioBiologicoSelect',
        allSelectIds: ['cambioSistemicoSelect', 'cambioFameSelect', 'cambioBiologicoSelect'],
        expectedCategories: {
            cambioSistemicoSelect: 'Sistemicos',
            cambioFameSelect: 'FAMEs',
            cambioBiologicoSelect: 'Biologicos',
        },
        nonDrugIds: [],
        prepare: async (page) => {
            const opened = await openAncestorCollapsibles(page, '#btnCambiarTratamiento');
            if (!opened) throw new Error('no se pudo abrir el bloque de tratamiento en seguimiento');
            await page.locator('#btnCambiarTratamiento').click();
            await page.waitForTimeout(300);
        },
    });
    await runUnavailableSuite(browser);
    await runCategoriesUnavailableSuite(browser);
    await runEmptyCategorySuite(browser);
    await runRestoreHydrationSuite(browser);
    await runRefreshPreservesQuerySuite(browser);
} catch (err) {
    console.error('ENVIRONMENT FAILURE: ' + err.message);
    results.push(false);
} finally {
    if (browser) await browser.close();
    server.close();
}

const passed = results.filter(Boolean).length;
const total = results.length;
console.log(`\nRESULTADO: ${passed} OK / ${total - passed} FALLIDO`);
if (passed !== total) {
    console.log('reuma_drug_catalog_browser_check FAILED');
    process.exit(1);
}
console.log('reuma_drug_catalog_browser_check PASS');
