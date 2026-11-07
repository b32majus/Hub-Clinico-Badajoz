#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo A1: fármaco en la primera visita.
//  - Un paciente sin líneas (primera vez en la plataforma, ya en tratamiento)
//    elige su fármaco en el buscador y queda como LÍNEA de esta visita
//    («ya en tratamiento»; nunca alta ni validación).
//  - Esa línea sirve como sospechoso en EA y aparece en el texto JARA.
//  - «Copiar filas Excel FH» se bloquea con motivo claro: la línea aún no
//    está en el libro (el formato 166 solo admite líneas declaradas).
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-002';
const SESSION_LINE = 'FH-SES-L0001';

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
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

const lineCards = () => page.locator('#fhSegLineCards .seg-line-card');
let drugName = '';

try {
    await test('paciente sin líneas: buscador visible y sin tarjetas de línea', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForTimeout(300);
        assert.equal(await lineCards().count(), 0);
        assert.ok(await page.locator('#fhSegAutocompleteBlock').isVisible(), 'buscador de fármaco visible');
    });

    await test('elegir el fármaco en el buscador lo añade como línea de esta visita, seleccionada', async () => {
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        await page.fill('#fhSegDrugSearch', 'secukinumab');
        await page.locator('#fhSegDrugSearch').dispatchEvent('input');
        const item = page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first();
        await item.waitFor({ state: 'visible', timeout: 5000 });
        await item.click();
        await page.waitForTimeout(200);
        drugName = await page.inputValue('#fhSegFarmaco');
        assert.ok(drugName.trim() !== '', 'el fármaco elegido rellena el tratamiento');
        assert.equal(await lineCards().count(), 1, 'una línea');
        const cardEl = lineCards().first();
        assert.equal(await cardEl.getAttribute('data-line-id'), SESSION_LINE);
        assert.ok(await cardEl.locator('input[type="checkbox"]').isChecked(), 'seleccionada en la visita');
        const text = await cardEl.innerText();
        assert.ok(text.includes(drugName), 'la tarjeta nombra el fármaco');
        assert.ok(/aún no está en el libro/i.test(text), 'la tarjeta avisa de que aún no está en el libro');
        assert.ok(!/validad|alta/i.test(text), 'nunca la presenta como alta ni validación');
        assert.ok(!(await page.locator('#fhSegAutocompleteBlock').isVisible()), 'el buscador se oculta al haber línea');
    });

    await test('la línea nueva es candidata a sospechoso en un EA nuevo', async () => {
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        const box = card.locator(`.ea-suspect-list input[type="checkbox"][value="line:${SESSION_LINE}"]`);
        assert.equal(await box.count(), 1, 'la línea aparece como candidato');
        await box.check();
        await card.locator('[data-ea-field="description"]').fill('Prurito sintético');
        await page.waitForTimeout(200);
    });

    await test('el texto JARA incluye el fármaco de la línea nueva', async () => {
        await page.evaluate(() => navigator.clipboard.writeText(''));
        await page.click('#fhSegExportTxt');
        await page.waitForTimeout(250);
        const jara = await page.evaluate(() => navigator.clipboard.readText());
        assert.ok(jara.includes(drugName), 'JARA nombra el fármaco');
    });

    await test('«Copiar filas Excel FH» bloqueado con motivo: la línea aún no está en el libro', async () => {
        await page.evaluate(() => navigator.clipboard.writeText('SIN-TOCAR'));
        const button = page.locator('#fhSegExportBridgeRawBtn');
        if (await button.isEnabled()) await button.click();
        await page.waitForTimeout(250);
        assert.ok(await button.isDisabled(), 'botón deshabilitado');
        const status = await page.locator('#fhSegExportBridgeRawStatus').innerText();
        assert.ok(/aún no está en el libro/i.test(status), 'motivo visible: ' + status);
        assert.ok(status.includes(drugName), 'el motivo nombra el fármaco');
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'SIN-TOCAR', 'portapapeles intacto');
    });

    await test('pacientes demo con líneas no cambian: FH-001 sigue con su línea BIO-FH-001-L1 y sin aviso', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'load' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        await page.waitForTimeout(300);
        assert.equal(await lineCards().count(), 1);
        assert.equal(await lineCards().first().getAttribute('data-line-id'), 'BIO-FH-001-L1');
        assert.ok(!/aún no está en el libro/i.test(await lineCards().first().innerText()));
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_seguimiento_first_visit_drug_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
