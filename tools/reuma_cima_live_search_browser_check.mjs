#!/usr/bin/env node
// Check de navegador — buscador de fármacos en directo contra la AEMPS (CIMA)
// con el catálogo publicado como respaldo (Reuma, tramo 1 del buscador común).
// Qué comprueba: los campos de fármaco de Reuma buscan en la API REST de CIMA
// (nombre comercial y principio activo en paralelo, sin duplicados), ya sin
// filtro por categoría; si la AEMPS no responde (error o tiempo agotado) usan
// el catálogo local y lo avisan; una respuesta vacía de la AEMPS NO cae al
// catálogo; una respuesta lenta y vieja no pisa la consulta actual; a la AEMPS
// solo se le envía el texto buscado; elegir un fármaco solo escribe el nombre.
// La AEMPS se simula con page.route: el check nunca sale a internet.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import fs, { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

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

// Libro Reuma sintético mínimo para pasar la puerta de sesión.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-cima-live-'));
const workbookPath = path.join(tempDir, 'reuma_cima_live_synthetic.xlsx');
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

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.svg', 'image/svg+xml'], ['.png', 'image/png'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'reuma_index.html';
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

// ---- AEMPS simulada -------------------------------------------------------
// Respuestas sintéticas con la forma real de GET /cima/rest/medicamentos.
const AEMPS = {
    nombre: {
        humira: [{ nregistro: '99001', nombre: 'HUMIRA 40 MG SINTETICO' }],
        duplicado: [{ nregistro: '99003', nombre: 'DUPLICADO SINTETICO 10 MG' }],
        hu: [{ nregistro: '99009', nombre: 'VIEJO SINTETICO' }],
    },
    practiv1: {
        adalimumab: [
            { nregistro: '99001', nombre: 'HUMIRA 40 MG SINTETICO' },
            { nregistro: '99002', nombre: 'AMGEVITA 40 MG SINTETICO' },
        ],
        duplicado: [{ nregistro: '99003', nombre: 'DUPLICADO SINTETICO 10 MG' }],
        envases: [
            { nregistro: '99004', nombre: 'ENVASE SINTETICO 20 MG' },
            { nregistro: '99005', nombre: 'ENVASE SINTETICO 20 MG' },
        ],
    },
};
let aempsMode = 'ok'; // ok | abort | timeout
const aempsRequests = [];
function aempsBody(url) {
    const params = url.searchParams;
    const key = params.has('nombre') ? 'nombre' : (params.has('practiv1') ? 'practiv1' : '');
    const q = String(params.get(key) || '').toLowerCase();
    const rows = (AEMPS[key] && AEMPS[key][q]) || [];
    return JSON.stringify({ totalFilas: rows.length, pagina: 1, tamanioPagina: 25, resultados: rows });
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route('https://cima.aemps.es/**', async (route) => {
    const url = new URL(route.request().url());
    aempsRequests.push(url);
    if (aempsMode === 'abort') return route.abort('internetdisconnected');
    if (aempsMode === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, 9000));
        return route.fulfill({ status: 200, contentType: 'application/json', body: aempsBody(url) }).catch(() => {});
    }
    const q = String(url.searchParams.get('nombre') || url.searchParams.get('practiv1') || '').toLowerCase();
    if (q === 'hu') await new Promise((resolve) => setTimeout(resolve, 1500));
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: aempsBody(url) }).catch(() => {});
});

// Puerta de sesión Reuma (interacción real).
{
    const gate = await context.newPage();
    await gate.goto(base + 'reuma_index.html', { waitUntil: 'load', timeout: 45000 });
    await gate.setInputFiles('#gateExcelInput', workbookPath);
    await gate.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await gate.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await gate.selectOption('#gateProfessionalSelect', professional);
    await gate.click('#gateConfirmBtn');
    await gate.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    await gate.close();
}

const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

const SELECT_ID = 'previoSistemicoSelect'; // campo de Sistémicos: ya sin filtro por categoría
const DOSE_ID = 'previoSistemicoDose';
const inputSel = `.drug-autocomplete:has(#${SELECT_ID}) .drug-autocomplete__input`;
const itemsSel = `.drug-autocomplete:has(#${SELECT_ID}) .drug-autocomplete__item:not(.drug-autocomplete__item--clear)`;
const noticeSel = `.drug-autocomplete:has(#${SELECT_ID}) .drug-autocomplete__notice`;

async function openField() {
    // Abre las secciones plegables con clics reales en sus cabeceras.
    for (let attempt = 0; attempt < 4; attempt++) {
        const hit = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            el.scrollIntoView({ block: 'center' });
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return !!top && (top === el || el.contains(top));
        }, inputSel);
        if (hit) return;
        const headers = page.locator(inputSel).first().locator(
            'xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]'
        );
        const count = await headers.count();
        for (let i = 0; i < count; i++) {
            const header = headers.nth(i);
            if (!(await header.evaluate((el) => el.classList.contains('active')))) {
                await header.click();
                await page.waitForTimeout(650);
            }
        }
    }
    throw new Error('el campo de fármaco no es visible');
}
async function typeQuery(query) {
    const input = page.locator(inputSel);
    await input.click();
    await input.fill('');
    await input.fill(query);
}
async function itemTexts() {
    return (await page.locator(itemsSel).allTextContents()).map((t) => t.trim());
}
async function noticeText() {
    const notice = page.locator(noticeSel);
    if (await notice.count() === 0) return '';
    if (!(await notice.first().isVisible())) return '';
    return ((await notice.first().textContent()) || '').trim();
}

try {
    await page.goto(base + 'primera_visita.html', { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.HubTools && HubTools.catalog && HubTools.catalog.isLoaded && HubTools.catalog.isLoaded()), null, { timeout: 30000 });
    await page.waitForSelector(inputSel, { state: 'attached', timeout: 15000 });
    await openField();

    await test('el módulo común HubTools.cimaSearch existe', async () => {
        const ok = await page.evaluate(() => !!(window.HubTools && HubTools.cimaSearch && typeof HubTools.cimaSearch.search === 'function'));
        assert.equal(ok, true);
    });

    await test('busca en la AEMPS por nombre y por principio activo (en paralelo) y sin categoría', async () => {
        aempsMode = 'ok';
        aempsRequests.length = 0;
        await typeQuery('adalimumab');
        await page.locator(itemsSel).first().waitFor({ state: 'visible', timeout: 8000 });
        const texts = await itemTexts();
        assert.deepEqual([...texts].sort(), ['AMGEVITA 40 MG SINTETICO', 'HUMIRA 40 MG SINTETICO']);
        const keys = aempsRequests.map((u) => (u.searchParams.has('nombre') ? 'nombre' : (u.searchParams.has('practiv1') ? 'practiv1' : 'otro')) + '=' + (u.searchParams.get('nombre') || u.searchParams.get('practiv1') || ''));
        assert.ok(keys.includes('nombre=adalimumab'), JSON.stringify(keys));
        assert.ok(keys.includes('practiv1=adalimumab'), JSON.stringify(keys));
        assert.ok(aempsRequests.every((u) => u.pathname === '/cima/rest/medicamentos'), aempsRequests.map(String).join(' '));
        assert.equal(await noticeText(), '');
    });

    await test('a la AEMPS solo se le envía el texto buscado (sin datos del paciente)', async () => {
        assert.ok(aempsRequests.length >= 2, 'no se consultó la AEMPS');
        const allowed = new Set(['nombre', 'practiv1', 'pagesize']);
        const extra = aempsRequests.flatMap((u) => [...u.searchParams.keys()].filter((k) => !allowed.has(k)));
        assert.deepEqual(extra, []);
    });

    await test('elegir un resultado escribe solo el nombre y no toca la dosis', async () => {
        await page.locator(itemsSel, { hasText: 'HUMIRA 40 MG SINTETICO' }).first().click();
        await page.waitForTimeout(150);
        const value = await page.evaluate((id) => document.getElementById(id).value, SELECT_ID);
        assert.equal(value, 'HUMIRA 40 MG SINTETICO');
        assert.equal(await page.locator('#' + DOSE_ID).inputValue(), '');
    });

    await test('el mismo fármaco por nombre y por principio activo sale una sola vez', async () => {
        aempsMode = 'ok';
        await typeQuery('duplicado');
        await page.locator(itemsSel).first().waitFor({ state: 'visible', timeout: 8000 });
        await page.waitForTimeout(400);
        assert.deepEqual(await itemTexts(), ['DUPLICADO SINTETICO 10 MG']);
    });

    await test('dos registros con el mismo nombre se muestran una sola vez', async () => {
        aempsMode = 'ok';
        await typeQuery('envases');
        await page.locator(itemsSel).first().waitFor({ state: 'visible', timeout: 8000 });
        await page.waitForTimeout(400);
        assert.deepEqual(await itemTexts(), ['ENVASE SINTETICO 20 MG']);
    });

    await test('una respuesta vacía de la AEMPS no cae al catálogo local', async () => {
        aempsMode = 'ok';
        aempsRequests.length = 0;
        await typeQuery('cosentyx');
        await page.waitForTimeout(1500);
        assert.ok(aempsRequests.length >= 2, 'no se consultó la AEMPS');
        assert.deepEqual(await itemTexts(), []);
        assert.equal(await noticeText(), '');
    });

    await test('una respuesta vieja y lenta no pisa la consulta actual', async () => {
        aempsMode = 'ok';
        await typeQuery('hu');
        await page.waitForTimeout(450);
        await page.locator(inputSel).fill('humira');
        await page.waitForTimeout(2600);
        assert.deepEqual(await itemTexts(), ['HUMIRA 40 MG SINTETICO']);
    });

    await test('sin red con la AEMPS usa el catálogo local y lo avisa', async () => {
        aempsMode = 'abort';
        await typeQuery('cosentyx');
        await page.locator(itemsSel).first().waitFor({ state: 'visible', timeout: 8000 });
        const texts = await itemTexts();
        assert.ok(texts.length > 0 && texts.every((t) => /COSENTYX/i.test(t)), JSON.stringify(texts));
        assert.match(await noticeText(), /AEMPS/);
        assert.match(await noticeText(), /catálogo local/i);
    });

    await test('si la AEMPS tarda demasiado usa el catálogo local y lo avisa', async () => {
        aempsMode = 'timeout';
        const started = Date.now();
        await typeQuery('cosentyx');
        await page.waitForFunction((sel) => {
            const notice = document.querySelector(sel);
            return !!(notice && !notice.hidden && /catálogo local/i.test(notice.textContent || ''));
        }, noticeSel, { timeout: 8000 });
        const elapsed = Date.now() - started;
        assert.ok(elapsed < 7000, 'tardó ' + elapsed + ' ms');
        const texts = await itemTexts();
        assert.ok(texts.length > 0 && texts.every((t) => /COSENTYX/i.test(t)), JSON.stringify(texts));
    });

    await test('con la AEMPS y el catálogo local caídos no inventa opciones y avisa', async () => {
        aempsMode = 'abort';
        const forced = await page.evaluate(() => {
            // Simula el catálogo local no disponible a través de su API pública de estado.
            const original = HubTools.catalog.isLoaded;
            HubTools.catalog.isLoaded = function () { return false; };
            const originalSearch = HubTools.catalog.search;
            HubTools.catalog.search = function () { return []; };
            window.__restoreCatalog = function () { HubTools.catalog.isLoaded = original; HubTools.catalog.search = originalSearch; };
            return true;
        });
        assert.equal(forced, true);
        await typeQuery('cosentyx');
        await page.waitForFunction((sel) => {
            const notice = document.querySelector(sel);
            return !!(notice && !notice.hidden && /no disponible/i.test(notice.textContent || ''));
        }, noticeSel, { timeout: 8000 });
        assert.deepEqual(await itemTexts(), []);
        const options = await page.evaluate((id) => Array.from(document.getElementById(id).options).map((o) => o.value), SELECT_ID);
        assert.ok(options.every((v) => v === 'No' || v === 'HUMIRA 40 MG SINTETICO'), JSON.stringify(options));
        await page.evaluate(() => window.__restoreCatalog && window.__restoreCatalog());
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`reuma_cima_live_search_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
