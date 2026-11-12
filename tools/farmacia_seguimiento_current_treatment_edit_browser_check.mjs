#!/usr/bin/env node
// Check de navegador EA v1 demo, Tramo C1 (#876): «Tratamiento actual» editable.
//  - En una línea creada en la visita (primer fármaco A1, otro fármaco activo A3) el
//    clínico edita dosis, vía y pauta; lo editado se guarda en la línea y viaja a
//    JARA y a la copia 166. Fármaco, principio activo y presentación siguen de solo lectura.
//  - En una línea del libro esos tres campos no se editan (se cambian con la optimización).
//  - Nada se infiere: dosis vaciada = vacía en el 166.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-002';
const LINE1 = 'ACT-DEMO-FH-002-LIN-0001';
const LINE2 = 'ACT-DEMO-FH-002-LIN-0002';

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

const cards = () => page.locator('#fhSegLineCards .seg-line-card');
const otherCards = () => page.locator('#segOtrosFarmacosList .other-drug-card');
let pautaValue = '';

async function copyAndRead() {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.locator('#fhSegExportBridgeRawBtn').click({ timeout: 5000 });
    await page.waitForFunction(() => /Preparado para transferencia manual/.test((document.getElementById('fhSegExportBridgeRawStatus') || {}).textContent || ''), null, { timeout: 5000 });
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    const header = await page.evaluate(() => window.FarmaciaBridgeRawEaV21Core.ROW_COLUMNS.slice());
    const rows = tsv.split('\n').filter((line) => line !== '').map((line) => {
        const cells = line.split('\t');
        const decode = (cell) => { if (cell === '') return null; if (cell === 'TRUE') return true; if (cell === 'FALSE') return false; try { return JSON.parse(cell); } catch { return cell; } };
        return Object.fromEntries(header.map((name, index) => [name, decode(cells[index])]));
    });
    return { rows, lines: rows.filter((row) => row.row_role === 'followup_line') };
}
const lineRow = (copied, id) => copied.lines.find((row) => row.line_id === id);



try {
    await test('línea del libro (FH-001): dosis, vía y pauta no se editan; se cambian con la optimización', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'load' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        await page.waitForTimeout(300);
        assert.equal(await cards().count(), 1);
        assert.ok(await page.locator('#fhSegDosisActual').evaluate((el) => el.readOnly), 'dosis de solo lectura');
        assert.ok(await page.locator('#fhSegVia').isDisabled(), 'vía no editable');
        assert.ok(await page.locator('#fhSegPautaActual').isDisabled(), 'pauta no editable');
    });

    await test('el buscador de fármaco acepta un clic lento (pulsar y mantener) en el principal y en Otros fármacos', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        const slowClick = async (item) => {
            await item.waitFor({ state: 'visible', timeout: 5000 });
            const box = await item.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(400);
            await page.mouse.up();
            await page.waitForTimeout(300);
        };
        await page.click('#fhSegDrugSearch');
        await page.keyboard.type('secuk', { delay: 40 });
        await slowClick(page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first());
        assert.ok((await page.inputValue('#fhSegFarmaco')).trim() !== '', 'el buscador principal elige con clic lento');
        assert.equal(await cards().count(), 1);
        await page.click('#btnSegAddOtherDrug');
        const other = otherCards().last();
        await other.locator('select').first().selectOption('Concomitante');
        await other.locator('input[data-field="farmaco"]').click();
        await page.keyboard.type('adalim', { delay: 40 });
        await slowClick(other.locator('.autocomplete-dropdown .autocomplete-item').first());
        assert.ok((await other.locator('input[data-field="farmaco"]').inputValue()).trim() !== '', 'Otros fármacos elige con clic lento');
        assert.equal(await cards().count(), 2, 'el otro fármaco activo es línea');
    });

    await test('línea creada en la visita (A1): dosis, vía y pauta editables; fármaco, principio y presentación de solo lectura', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        await page.fill('#fhSegDrugSearch', 'secukinumab');
        await page.locator('#fhSegDrugSearch').dispatchEvent('input');
        const item = page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first();
        await item.waitFor({ state: 'visible', timeout: 5000 });
        await item.click();
        await page.waitForTimeout(200);
        assert.equal(await cards().first().getAttribute('data-line-id'), LINE1);
        assert.ok(!(await page.locator('#fhSegDosisActual').evaluate((el) => el.readOnly)), 'dosis editable');
        assert.ok(await page.locator('#fhSegVia').isEnabled(), 'vía editable');
        assert.ok(await page.locator('#fhSegPautaActual').isEnabled(), 'pauta editable');
        for (const id of ['fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion']) {
            assert.ok(await page.locator('#' + id).evaluate((el) => el.readOnly), id + ' de solo lectura');
        }
    });

    await test('lo editado en el panel viaja a la copia 166 de la línea', async () => {
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Prurito sintético');
        await card.locator(`.ea-suspect-list input[type="checkbox"][value="line:${LINE1}"]`).check();
        pautaValue = await page.locator('#fhSegPautaActual option').evaluateAll((options) => {
            const found = options.map((o) => o.value).find((v) => v && v !== 'OTRO');
            return found || '';
        });
        assert.ok(pautaValue, 'el desplegable de pauta tiene opciones');
        await page.fill('#fhSegDosisActual', '42 mg');
        await page.selectOption('#fhSegVia', 'SC');
        await page.selectOption('#fhSegPautaActual', pautaValue);
        await page.waitForTimeout(200);
        const row = lineRow(await copyAndRead(), LINE1);
        assert.ok(row, 'fila de la línea');
        assert.equal(row.line_dose_text, '42 mg');
        assert.equal(row.line_route, 'SC');
        assert.equal(row.line_schedule_code, pautaValue);
        assert.ok(row.line_schedule_label, 'la pauta lleva su etiqueta');
    });

    await test('el texto JARA lleva la dosis editada', async () => {
        await page.evaluate(() => navigator.clipboard.writeText(''));
        await page.click('#fhSegExportTxt');
        await page.waitForTimeout(250);
        assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('42 mg'), 'JARA con 42 mg');
    });

    await test('un otro fármaco activo es línea y su dosis se edita en el mismo panel (la fuente sigue siendo Otros fármacos)', async () => {
        await page.click('#btnSegAddOtherDrug');
        const other = otherCards().last();
        await other.locator('select').first().selectOption('Concomitante');
        await other.locator('input[data-field="farmaco"]').fill('Metotrexato sintético');
        await page.waitForTimeout(200);
        assert.equal(await cards().count(), 2);
        await page.selectOption('#fhSegLineaPrincipal', LINE2);
        await page.waitForTimeout(150);
        assert.ok(!(await page.locator('#fhSegDosisActual').evaluate((el) => el.readOnly)), 'dosis editable en la línea del otro fármaco');
        await page.fill('#fhSegDosisActual', '17 mg');
        await page.waitForTimeout(200);
        assert.equal(await other.locator('input[data-field="dosis"]').inputValue(), '17 mg', 'el formulario de Otros fármacos refleja la dosis');
        const row = lineRow(await copyAndRead(), LINE2);
        assert.equal(row.line_dose_text, '17 mg');
    });

    await test('al volver a la primera línea sus valores editados siguen ahí', async () => {
        await page.selectOption('#fhSegLineaPrincipal', LINE1);
        await page.waitForTimeout(150);
        assert.equal(await page.inputValue('#fhSegDosisActual'), '42 mg');
        assert.equal(await page.inputValue('#fhSegVia'), 'SC');
        assert.equal(await page.inputValue('#fhSegPautaActual'), pautaValue);
    });

    await test('vaciar la dosis la deja vacía en el 166 (nada se infiere)', async () => {
        await page.fill('#fhSegDosisActual', '');
        await page.waitForTimeout(200);
        const row = lineRow(await copyAndRead(), LINE1);
        assert.equal(row.line_dose_text, null);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_seguimiento_current_treatment_edit_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
