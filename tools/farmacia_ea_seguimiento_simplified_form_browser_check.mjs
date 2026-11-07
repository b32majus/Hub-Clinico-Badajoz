#!/usr/bin/env node
// Check de navegador EA v1 demo (#869, B): formulario de EA simplificado.
//  - Cada EA es UNA fila: descripción, hueco «Término codificado: pendiente de
//    codificar» (solo lectura; nunca un código inventado), gravedad, evolución.
//  - Sin «Incorporar al acto»: escribir la descripción incorpora el EA.
//  - Sin controles de maqueta ni textos de ayuda redundantes en la fila.
//  - El sospechoso se marca UNA vez, en la fila; al marcarlo, su causalidad
//    (Naranjo/Karch) se abre en línea dentro de esa fila, sin selectores de
//    episodio ni de sospechoso y sin guardar antes.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-002';

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




const SUSPECT = 'line:FH-SES-L0001';
const cards = () => page.locator('#fhSegEaList .ea-t01-card');
const jara = async () => {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.click('#fhSegExportTxt');
    await page.waitForTimeout(250);
    return page.evaluate(() => navigator.clipboard.readText());
};
let drugLabel = '';

try {
    await test('un EA nuevo es una sola fila: sin «Incorporar al acto», sin maqueta y con el hueco de codificación', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        await page.fill('#fhSegDrugSearch', 'secukinumab');
        await page.locator('#fhSegDrugSearch').dispatchEvent('input');
        const item = page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first();
        await item.waitFor({ state: 'visible', timeout: 5000 });
        await item.click();
        await page.waitForTimeout(200);
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const card = cards().last();
        assert.equal(await card.getByRole('button', { name: 'Incorporar al acto' }).count(), 0, 'sin botón «Incorporar al acto»');
        assert.equal(await card.locator('[data-ea-demo-control]').count(), 0, 'sin controles de maqueta deshabilitados');
        const text = await card.innerText();
        assert.ok(!/información clínica adicional/i.test(text), 'sin bloque de información adicional de maqueta');
        assert.ok(!/no forma parte del acto preparado|presentación visual de la maqueta/i.test(text), 'sin textos de ayuda redundantes');
        const slot = card.locator('[data-ea-coding-slot]');
        assert.equal(await slot.count(), 1, 'hueco de codificación');
        assert.ok(/Término codificado:\s*pendiente de codificar/i.test(await slot.innerText()));
        assert.equal(await slot.locator('input, select, textarea').count(), 0, 'solo lectura: no se escribe ningún código');
        assert.ok(await card.locator('[data-ea-field="description"]').isVisible());
        assert.ok(await card.locator('[data-ea-field="severity"]').isVisible());
    });

    await test('escribir la descripción incorpora el EA sin botón; vaciarla lo devuelve a borrador', async () => {
        const card = cards().last();
        await card.locator('[data-ea-field="description"]').fill('Prurito sintético');
        assert.equal(await card.getAttribute('data-ea-status'), 'incorporated');
        assert.ok(!/BORRADOR/i.test(await card.locator('.status-badge').last().innerText()), 'ya no es borrador');
        assert.ok(/1 observación/.test(await page.locator('#fhSegEaSummary').innerText()), 'cuenta en el resumen del acto');
        await card.locator('[data-ea-field="description"]').fill('');
        assert.equal(await card.getAttribute('data-ea-status'), 'draft', 'sin descripción vuelve a borrador');
        await card.locator('[data-ea-field="description"]').fill('Prurito sintético');
        assert.equal(await card.getAttribute('data-ea-status'), 'incorporated');
    });

    await test('el sospechoso se marca una sola vez, en la fila', async () => {
        const visibleBoxes = page.locator(`input[type="checkbox"][value="${SUSPECT}"]:visible`);
        assert.equal(await visibleBoxes.count(), 1, 'una única casilla visible para el sospechoso');
        const box = cards().last().locator(`.ea-suspect-list input[type="checkbox"][value="${SUSPECT}"]`);
        assert.equal(await box.count(), 1);
        drugLabel = (await box.evaluate((node) => node.parentElement.textContent)).trim();
        await box.check();
        await page.waitForTimeout(150);
    });

    await test('al marcarlo, su causalidad se abre en línea dentro de esa fila, sin selectores de episodio ni de sospechoso', async () => {
        const card = cards().last();
        const inline = card.locator('#modSeguimientoCausalidad');
        assert.equal(await inline.count(), 1, 'la causalidad vive dentro de la fila');
        assert.ok(await inline.isVisible(), 'visible');
        assert.ok(!(await page.locator('#fhCausalityContextRow').isVisible()), 'sin selector de episodio ni de sospechoso');
        const context = (await page.locator('#fhSeguimientoEaContextoNaranjo').innerText()).trim();
        assert.ok(context !== '' && context !== '—', 'el fármaco evaluado es el sospechoso marcado: ' + context);
        assert.ok(drugLabel.includes(context.split(' ')[0]), 'coincide con el sospechoso marcado');
        assert.ok(await card.locator('#modNaranjo .causality-chip').first().isEnabled(), 'cuestionario editable sin guardar antes');
        assert.ok(await card.locator('#modKarchLasagna .causality-chip').first().isEnabled());
    });

    await test('las salidas no cambian: JARA nombra el EA y el sospechoso (la causalidad sin tocar sigue «No evaluada»)', async () => {
        const text = await jara();
        assert.ok(text.includes('Prurito sintético'), 'JARA incluye la descripción');
        assert.ok(/No evaluada/i.test(text), 'causalidad sin tocar: No evaluada');
    });

    await test('un segundo EA: la causalidad se abre en SU fila al marcar su sospechoso; solo hay un editor en la página', async () => {
        await page.click('#fhSegAddEaBtn');
        const second = cards().last();
        await second.locator('[data-ea-field="description"]').fill('Mareo sintético');
        await second.locator(`.ea-suspect-list input[type="checkbox"][value="${SUSPECT}"]`).check();
        await page.waitForTimeout(150);
        assert.equal(await page.locator('#modSeguimientoCausalidad').count(), 1, 'un único editor de causalidad');
        assert.equal(await second.locator('#modSeguimientoCausalidad').count(), 1, 'en la fila del segundo EA');
        assert.equal(await cards().first().locator('#modSeguimientoCausalidad').count(), 0, 'ya no en la primera');
    });

    await test('contestar una pregunta en línea calcula la puntuación; desmarcar el sospechoso cierra la causalidad de esa fila', async () => {
        const second = cards().last();
        await second.locator('#modNaranjo .causality-chip-group').first().locator('.causality-chip[data-value="si"]').click();
        assert.notEqual((await page.locator('#naranjoScore').innerText()).trim(), '—', 'puntuación calculada');
        await second.locator(`.ea-suspect-list input[type="checkbox"][value="${SUSPECT}"]`).uncheck();
        await page.waitForTimeout(150);
        assert.ok(!(await page.locator('#modSeguimientoCausalidad').isVisible()), 'sin sospechoso marcado no hay causalidad abierta');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_simplified_form_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
