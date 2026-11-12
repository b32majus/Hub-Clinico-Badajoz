#!/usr/bin/env node
// Check de navegador (#881, tramo 2b): Validación (manual y validado) y Primera
// visita usan el buscador común y la política común al elegir OTRO fármaco:
// sin datos escritos → reemplaza sin avisar; con dosis, vía o pauta escritas a
// mano → pide confirmación y, si se acepta, las borra. En estos formularios no
// existe «dispensado» ni vínculo EA por línea, así que no hay bloqueos.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream, readFileSync } from 'node:fs';
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
// Buscador común (tramo 3): la AEMPS «no responde» → respaldo del catálogo de Farmacia; el check nunca sale a internet.
await context.route('https://cima.aemps.es/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
let dialogMode = 'accept';
const dialogs = [];
page.on('dialog', (dialog) => { dialogs.push(dialog.message()); return dialogMode === 'accept' ? dialog.accept() : dialog.dismiss(); });
page.setDefaultTimeout(8000);
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



const FORMS = [
    {
        name: 'Primera visita', url: 'farmacia_primera_visita.html', html: 'farmacia_primera_visita.html', script: 'scripts/farmacia_primera_visita.js',
        input: '#fhPvFarmaco', dropdown: '#fhPvAutocompleteDropdown', dosis: '#fhPvDosis', via: '#fhPvVia', pauta: '#fhPvPauta',
        setup: async () => {}
    },
    {
        name: 'Validación manual', url: 'farmacia_validacion.html', html: 'farmacia_validacion.html', script: 'scripts/farmacia_validacion.js',
        input: '#fhManualFarmaco', dropdown: '#fhManualAutocompleteDropdown', dosis: '#fhManualDosis', via: '#fhManualVia', pauta: '#fhManualPauta',
        setup: async () => {
            await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
            await page.locator('#fhServicioManual').selectOption('derma');
            await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
            await page.locator('#formManualSolicitud').waitFor({ state: 'visible' });
        }
    },
    {
        name: 'Validación validado', url: 'farmacia_validacion.html', html: 'farmacia_validacion.html', script: 'scripts/farmacia_validacion.js',
        input: '#fhValidadoFarmaco', dropdown: '#autocompleteValidadoDropdown', dosis: '#fhValidadoDosis', via: '#fhValidadoVia', pauta: '#fhValidadoPauta',
        setup: async () => {
            await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
            await page.locator('#fhServicioManual').selectOption('derma');
            await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
            await page.locator('#validationBlock').waitFor({ state: 'visible' });
            await page.locator('#fhValEstado').selectOption('validated');
        }
    }
];
const WRITTEN_DOSE = '777 mg profesional';

async function pick(form, query) {
    await page.locator(form.input).click();
    await page.locator(form.input).fill('');
    await page.keyboard.type(query, { delay: 30 });
    const first = page.locator(form.dropdown + ' .autocomplete-item').first();
    await first.waitFor({ state: 'visible' });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
}
async function setPauta(form) {
    await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        const option = Array.from(el.options).find((o) => o.value && o.value !== 'OTRA');
        el.value = option.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, form.pauta);
}
async function open(form) {
    await page.goto(base + form.url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
    await form.setup();
    dialogs.length = 0;
}

try {
    await test('el widget común está cargado antes del script de cada formulario y no queda teclado duplicado', async () => {
        for (const file of ['farmacia_primera_visita.html', 'farmacia_validacion.html']) {
            const html = readFileSync(path.join(ROOT, file), 'utf8');
            const w = html.indexOf('scripts/farmacia_drug_autocomplete.js');
            assert.ok(w > -1, file + ' carga el widget');
            const own = html.indexOf(file === 'farmacia_validacion.html' ? 'scripts/farmacia_validacion.js' : 'scripts/farmacia_primera_visita.js');
            assert.ok(w < own, file + ': el widget va antes del script del formulario');
        }
        for (const file of ['scripts/farmacia_validacion.js', 'scripts/farmacia_primera_visita.js']) {
            const source = readFileSync(path.join(ROOT, file), 'utf8');
            assert.ok(!source.includes("'ArrowDown'") && !source.includes('"ArrowDown"'), file + ' ya no tiene teclado propio');
        }
        const validation = readFileSync(path.join(ROOT, 'scripts/farmacia_validacion.js'), 'utf8');
        for (const gone of ['renderValidadoAutocompleteDropdown', 'renderManualRequestedAutocompleteDropdown', 'renderRequestedAutocompleteDropdown']) {
            assert.ok(!validation.includes('function ' + gone), 'Validación: ' + gone + ' sustituido por el widget');
        }
        assert.ok(!readFileSync(path.join(ROOT, 'scripts/farmacia_primera_visita.js'), 'utf8').includes('function renderDrugAutocompleteDropdown'), 'Primera visita: render propio sustituido por el widget');
        const widget = readFileSync(path.join(ROOT, 'scripts/farmacia_drug_autocomplete.js'), 'utf8');
        assert.ok(widget.includes('hasWrittenData'), 'el widget publica hasWrittenData');
    });

    for (const form of FORMS) {
        await test(form.name + ': sin datos escritos, elegir otro fármaco reemplaza sin avisar (teclado)', async () => {
            dialogMode = 'accept';
            await open(form);
            await pick(form, 'secuk');
            const first = await page.inputValue(form.input);
            assert.match(first, /cosentyx|secukinumab/i);
            await pick(form, 'adalim');
            const second = await page.inputValue(form.input);
            assert.match(second, /humira|adalimumab|amgevita|hyrimoz|idacio|hulio|yuflyma/i, 'cambia de fármaco: ' + second);
            assert.deepEqual(dialogs, [], 'sin diálogos');
        });

        await test(form.name + ': con dosis escrita pide confirmación; descartar conserva todo', async () => {
            dialogMode = 'accept';
            await open(form);
            await pick(form, 'secuk');
            const before = await page.inputValue(form.input);
            await page.locator(form.dosis).fill(WRITTEN_DOSE);
            dialogMode = 'dismiss';
            await pick(form, 'adalim');
            assert.equal(dialogs.length, 1, 'un confirm');
            assert.match(dialogs[0], /se borrar/i);
            assert.equal(await page.inputValue(form.input), before, 'sigue el fármaco anterior');
            assert.equal(await page.inputValue(form.dosis), WRITTEN_DOSE, 'la dosis escrita se conserva');
        });

        await test(form.name + ': aceptar cambia el fármaco y borra dosis, vía y pauta escritas', async () => {
            dialogMode = 'accept';
            await open(form);
            await pick(form, 'secuk');
            const before = await page.inputValue(form.input);
            await page.locator(form.dosis).fill(WRITTEN_DOSE);
            await setPauta(form);
            dialogMode = 'accept';
            await pick(form, 'adalim');
            assert.equal(dialogs.length, 1, 'un confirm');
            const after = await page.inputValue(form.input);
            assert.notEqual(after, before, 'cambia el fármaco');
            assert.notEqual(await page.inputValue(form.dosis), WRITTEN_DOSE, 'la dosis escrita se borra');
            assert.equal(await page.inputValue(form.pauta), '', 'la pauta se borra');
        });

        await test(form.name + ': solo la pauta escrita también pide confirmación', async () => {
            dialogMode = 'accept';
            await open(form);
            await pick(form, 'secuk');
            await setPauta(form);
            dialogMode = 'dismiss';
            await pick(form, 'adalim');
            assert.equal(dialogs.length, 1, 'un confirm por la pauta');
        });
    }

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_drug_autocomplete_replace_2b_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
