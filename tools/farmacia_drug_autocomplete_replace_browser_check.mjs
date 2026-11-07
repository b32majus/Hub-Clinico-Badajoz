#!/usr/bin/env node
// Qué comprueba (tramo 2a, buscador de fármaco común): el widget común
// `FarmaciaDrugAutocomplete` sirve los dos buscadores de Seguimiento (primer
// fármaco y otros fármacos) y aplica la política común al elegir otro fármaco:
// sospecha EA → bloquea; dispensado → bloquea; datos escritos → confirma y los
// borra; sin datos → reescribe. La línea conserva su `linea_id`.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { readFileSync } from 'node:fs';
const CIP = 'CIP-DEMO-FH-002';
const ACT_ID = 'ACT-DEMO-FH-002';
const LINE1 = ACT_ID + '-LIN-0001';
const LINE2 = ACT_ID + '-LIN-0002';

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_d4b2_loader.cjs'))('playwright');
            }
        }
    }
    throw new Error('Playwright not found. Run with a PATH exposing a playwright node_modules.');
}
const { chromium } = loadPlaywrightFromNpx();
function chromiumExecutable() {
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

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.svg', 'image/svg+xml'], ['.png', 'image/png']
]);
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': 'no-store' });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end('Not found');
    }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}/`;

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.setDefaultTimeout(8000);
let dialogMode = 'accept';
let dialogs = [];
page.on('dialog', (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    return dialogMode === 'accept' ? dialog.accept() : dialog.dismiss();
});
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



const cards = () => page.locator('#fhSegLineCards .seg-line-card');
const otherCard = () => page.locator('#segOtrosFarmacosList .other-drug-card').last();
const lineOptions = () => page.evaluate(() => Array.from(document.querySelectorAll('#fhSegLineaPrincipal option')).map((o) => o.value).filter(Boolean));
const mainItems = () => page.locator('#fhSegAutocompleteDropdown .autocomplete-item');
const cardItems = () => otherCard().locator('.autocomplete-dropdown .autocomplete-item');
const itemNames = (items) => items.locator('.autocomplete-item-name').allTextContents();
async function searchMain(query) {
    await page.fill('#fhSegDrugSearch', query);
    await mainItems().first().waitFor({ state: 'visible', timeout: 5000 });
}
async function pickMain(query) {
    await searchMain(query);
    const name = (await mainItems().first().locator('.autocomplete-item-name').textContent()).trim();
    await mainItems().first().click();
    await page.waitForTimeout(200);
    return name;
}
async function pickCard(query) {
    await otherCard().locator('input[data-field="farmaco"]').fill(query);
    await cardItems().first().waitFor({ state: 'visible', timeout: 5000 });
    const name = (await cardItems().first().locator('.autocomplete-item-name').textContent()).trim();
    await cardItems().first().click();
    await page.waitForTimeout(200);
    return name;
}
const has = (type, text) => dialogs.some((d) => d.type === type && d.message.includes(text));

try {
    await test('el widget común existe y Seguimiento lo usa (sin teclado duplicado)', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        const html = readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
        const widgetAt = html.indexOf('scripts/farmacia_drug_autocomplete.js');
        assert.ok(widgetAt > 0, 'Seguimiento carga scripts/farmacia_drug_autocomplete.js');
        assert.ok(widgetAt < html.indexOf('scripts/farmacia_seguimiento.js'), 'el widget se carga antes que farmacia_seguimiento.js');
        const seg = readFileSync(path.join(ROOT, 'scripts', 'farmacia_seguimiento.js'), 'utf8');
        assert.ok(!seg.includes("'ArrowDown'"), 'la navegación con teclado vive solo en el widget común');
        const api = await page.evaluate(() => {
            const W = window.FarmaciaDrugAutocomplete;
            return W ? { attach: typeof W.attach, decision: typeof W.replacementDecision, confirm: typeof W.confirmReplacement } : null;
        });
        assert.deepEqual(api, { attach: 'function', decision: 'function', confirm: 'function' });
    });

    await test('política común: EA > dispensado > datos escritos > reescribir', async () => {
        const out = await page.evaluate(() => {
            const d = window.FarmaciaDrugAutocomplete.replacementDecision;
            return [
                d({ eaSuspect: true, dispensed: true, writtenData: true }),
                d({ dispensed: true, writtenData: true }),
                d({ writtenData: true }),
                d({})
            ];
        });
        assert.deepEqual(out, ['blocked_ea', 'blocked_dispensed', 'confirm', 'replace']);
    });

    await test('primer fármaco: tras elegirlo el buscador sigue visible', async () => {
        await pickMain('secukinumab');
        assert.deepEqual(await lineOptions(), [LINE1]);
        assert.ok(!(await page.locator('#fhSegAutocompleteBlock').evaluate((el) => el.classList.contains('hidden'))), 'buscador visible');
    });

    await test('primer fármaco sin datos: nueva búsqueda (teclado) reescribe la MISMA línea sin preguntar', async () => {
        dialogs = [];
        await searchMain('adalim');
        const name = (await mainItems().first().locator('.autocomplete-item-name').textContent()).trim();
        await page.locator('#fhSegDrugSearch').press('ArrowDown');
        await page.locator('#fhSegDrugSearch').press('Enter');
        await page.waitForTimeout(200);
        assert.deepEqual(dialogs, []);
        assert.equal(await page.inputValue('#fhSegFarmaco'), name);
        assert.deepEqual(await lineOptions(), [LINE1]);
        assert.equal(await cards().count(), 1);
        assert.equal(await cards().first().getAttribute('data-line-id'), LINE1);
    });

    await test('primer fármaco con dosis/pauta escritas: cancelar no cambia nada; aceptar reescribe y las borra', async () => {
        const before = await page.inputValue('#fhSegFarmaco');
        await page.fill('#fhSegDosisActual', '999 mg prueba');
        const pauta = await page.locator('#fhSegPautaActual option').evaluateAll((o) => (o.map((x) => x.value).find((v) => v && v !== 'OTRO') || ''));
        await page.selectOption('#fhSegPautaActual', pauta);
        await page.waitForTimeout(150);
        dialogMode = 'dismiss'; dialogs = [];
        await pickMain('secuk');
        assert.ok(has('confirm', 'se borrarán'), 'pide confirmación');
        assert.equal(await page.inputValue('#fhSegFarmaco'), before);
        assert.equal(await page.inputValue('#fhSegDosisActual'), '999 mg prueba');
        dialogMode = 'accept'; dialogs = [];
        const name = await pickMain('secuk');
        assert.ok(has('confirm', 'se borrarán'), 'pide confirmación');
        assert.equal(await page.inputValue('#fhSegFarmaco'), name);
        assert.notEqual(await page.inputValue('#fhSegDosisActual'), '999 mg prueba');
        assert.equal(await page.inputValue('#fhSegPautaActual'), '');
        assert.deepEqual(await lineOptions(), [LINE1]);
    });

    await test('primer fármaco dispensado: bloquea con aviso', async () => {
        await page.selectOption('#fhSegDispensado', 'si');
        const before = await page.inputValue('#fhSegFarmaco');
        dialogs = [];
        await pickMain('adalim');
        assert.ok(has('alert', 'dispensado'), 'avisa de la dispensación');
        assert.ok(!dialogs.some((d) => d.type === 'confirm'), 'no ofrece confirmar');
        assert.equal(await page.inputValue('#fhSegFarmaco'), before);
    });

    await test('primer fármaco sospechoso en una ficha EA: bloquea (y gana al aviso de dispensado)', async () => {
        await page.fill('#fhSegFecha', '2026-11-08');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const ea = page.locator('#fhSegEaList .ea-t01-card').last();
        await ea.locator('[data-ea-field="description"]').fill('Prurito sintético');
        await ea.locator(`.ea-suspect-list input[type="checkbox"][value="line:${LINE1}"]`).check();
        const before = await page.inputValue('#fhSegFarmaco');
        dialogs = [];
        await pickMain('adalim');
        assert.ok(has('alert', 'sospechoso'), 'avisa de la sospecha EA');
        assert.ok(!dialogs.some((d) => d.message.includes('dispensado')), 'la sospecha EA va primero');
        assert.equal(await page.inputValue('#fhSegFarmaco'), before);
        await page.locator('#fhSegDrugSearch').press('Escape');
    });

    await test('otros fármacos: el mismo widget da los mismos resultados que el buscador principal', async () => {
        await searchMain('adalim');
        const mainNames = await itemNames(mainItems());
        await page.locator('#fhSegDrugSearch').press('Escape');
        await page.click('#btnSegAddOtherDrug');
        await otherCard().locator('select').first().selectOption('Concomitante');
        await otherCard().locator('input[data-field="farmaco"]').fill('adalim');
        await cardItems().first().waitFor({ state: 'visible', timeout: 5000 });
        assert.deepEqual(await itemNames(cardItems()), mainNames);
        assert.ok(await cardItems().first().locator('.autocomplete-item-detail').count() === 1, 'misma ficha de resultado');
    });

    await test('otros fármacos con dosis escrita: cancelar no cambia; aceptar reescribe, borra la dosis y conserva la línea', async () => {
        dialogMode = 'accept'; dialogs = [];
        await pickCard('adalim');
        assert.deepEqual(dialogs, [], 'sin datos no pregunta');
        assert.deepEqual(await lineOptions(), [LINE1, LINE2]);
        await otherCard().locator('input[data-field="dosis"]').fill('77 mg prueba');
        await page.waitForTimeout(150);
        const principio = await otherCard().locator('input[data-field="principioActivo"]').inputValue();
        dialogMode = 'dismiss'; dialogs = [];
        await pickCard('secuk');
        assert.ok(has('confirm', 'se borrarán'), 'pide confirmación');
        assert.equal(await otherCard().locator('input[data-field="dosis"]').inputValue(), '77 mg prueba');
        assert.equal(await otherCard().locator('input[data-field="principioActivo"]').inputValue(), principio);
        dialogMode = 'accept'; dialogs = [];
        await pickCard('secuk');
        assert.ok(has('confirm', 'se borrarán'), 'pide confirmación');
        assert.notEqual(await otherCard().locator('input[data-field="dosis"]').inputValue(), '77 mg prueba');
        assert.notEqual(await otherCard().locator('input[data-field="principioActivo"]').inputValue(), principio);
        assert.deepEqual(await lineOptions(), [LINE1, LINE2]);
        assert.equal(await cards().count(), 2);
    });

    await test('otros fármacos dispensado: bloquea con aviso', async () => {
        await page.selectOption('#fhSegLineaPrincipal', LINE2);
        await page.selectOption('#fhSegDispensado', 'si');
        const principio = await otherCard().locator('input[data-field="principioActivo"]').inputValue();
        dialogs = [];
        await pickCard('adalim');
        assert.ok(has('alert', 'dispensado'), 'avisa de la dispensación');
        assert.equal(await otherCard().locator('input[data-field="principioActivo"]').inputValue(), principio);
    });

    await test('paciente con líneas del libro (FH-001): el buscador principal sigue oculto', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'load' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        await page.waitForTimeout(300);
        assert.ok(await page.locator('#fhSegAutocompleteBlock').evaluate((el) => el.classList.contains('hidden')), 'buscador oculto');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`buscador de fármaco común (2a): ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
