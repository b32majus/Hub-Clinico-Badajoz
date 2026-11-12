#!/usr/bin/env node
// PLANTILLA — check de navegador (copiar a tools/<nombre>_browser_check.mjs y rellenar).
// Qué comprueba (límite de A3): el panel «Tratamiento actual» se repinta al editar dosis o vía
// de un «otro fármaco» activo que es la línea seleccionada, sin reseleccionar la línea.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-002';
const ACT_ID = 'ACT-DEMO-FH-002';
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
// Buscador común (tramo 3): la AEMPS «no responde» → respaldo del catálogo de Farmacia; el check nunca sale a internet.
await context.route('https://cima.aemps.es/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



try {
    await test('preparación: primer fármaco (A1) y un otro fármaco Concomitante seleccionado como línea 2', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        await page.fill('#fhSegDrugSearch', 'secukinumab');
        await page.locator('#fhSegDrugSearch').dispatchEvent('input');
        const item = page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first();
        await item.waitFor({ state: 'visible', timeout: 5000 });
        await item.click();
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.click('#btnSegAddOtherDrug');
        const card = page.locator('#segOtrosFarmacosList .other-drug-card').last();
        await card.locator('select').first().selectOption('Concomitante');
        await card.locator('input[data-field="farmaco"]').fill('Metotrexato sintético');
        await page.waitForTimeout(150);
        await page.selectOption('#fhSegLineaPrincipal', LINE2);
        assert.equal(await page.inputValue('#fhSegFarmaco'), 'Metotrexato sintético');
    });

    await test('editar la dosis del otro fármaco repinta el panel sin reseleccionar la línea', async () => {
        const card = page.locator('#segOtrosFarmacosList .other-drug-card').last();
        await card.locator('input[data-field="dosis"]').fill('15 mg semanal');
        await page.waitForTimeout(200);
        assert.equal(await page.inputValue('#fhSegDosisActual'), '15 mg semanal');
    });

    await test('editar la vía del otro fármaco repinta el panel', async () => {
        const card = page.locator('#segOtrosFarmacosList .other-drug-card').last();
        await card.locator('select[data-field="via"]').selectOption('Oral');
        await page.waitForTimeout(200);
        assert.equal(await page.inputValue('#fhSegVia'), 'Oral');
    });

    await test('editar otro fármaco NO toca el panel si la línea seleccionada es otra', async () => {
        const first = await page.evaluate(() => Array.from(document.querySelectorAll('#fhSegLineaPrincipal option')).map((o) => o.value).filter(Boolean)[0]);
        await page.selectOption('#fhSegLineaPrincipal', first);
        const farmaco = await page.inputValue('#fhSegFarmaco');
        const card = page.locator('#segOtrosFarmacosList .other-drug-card').last();
        await card.locator('input[data-field="dosis"]').fill('20 mg semanal');
        await page.waitForTimeout(200);
        assert.equal(await page.inputValue('#fhSegFarmaco'), farmaco);
        assert.notEqual(await page.inputValue('#fhSegDosisActual'), '20 mg semanal');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`seguimiento panel otro fármaco: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
