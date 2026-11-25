#!/usr/bin/env node
// Catálogo de fármacos de respaldo solo cuando hace falta (#956, carga): ninguna pantalla baja el Excel
// al entrar; con CIMA en directo no se lee; si CIMA no responde se lee una vez y el aviso lo dice;
// Farmacia saca sus fármacos propios de un JSON pequeño. Solo datos sintéticos.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
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

// ---- AEMPS simulada: 'ok' responde, 'caida' corta la conexión ----
let aemps = 'caida';
const FILAS = { adalimumab: [{ nregistro: '99001', nombre: 'HUMIRA 40 MG SINTETICO' }], experimental: [] };
const EXCEL = /hub_catalogo_farmacologico[^/]*\.xlsx/;
let pedidasExcel = [];

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Prueba'); } catch (e) { /* sin almacenamiento */ } });
await context.route('https://cima.aemps.es/**', async (route) => {
    if (aemps === 'caida') return route.abort('internetdisconnected');
    const url = new URL(route.request().url());
    const q = String(url.searchParams.get('nombre') || url.searchParams.get('practiv1') || '').toLowerCase();
    const rows = FILAS[q] || [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ totalFilas: rows.length, pagina: 1, tamanioPagina: 15, resultados: rows }) }).catch(() => {});
});
context.on('request', (request) => { if (EXCEL.test(request.url())) pedidasExcel.push(request.url()); });
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

const PAGINAS = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

// Reuma: campo de Sistémicos de Primera visita.
const R_INPUT = '.drug-autocomplete:has(#previoSistemicoSelect) .drug-autocomplete__input';
const R_ITEMS = '.drug-autocomplete:has(#previoSistemicoSelect) .drug-autocomplete__item:not(.drug-autocomplete__item--clear)';
async function abrirCampoReuma() {
    for (let intento = 0; intento < 4; intento++) {
        const visible = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            el.scrollIntoView({ block: 'center' });
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return false;
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return !!top && (top === el || el.contains(top));
        }, R_INPUT);
        if (visible) return;
        const cabeceras = page.locator(R_INPUT).first().locator('xpath=ancestor::*[contains(@class,"collapsible-section")]/button[contains(@class,"collapsible-header")]');
        for (let i = 0; i < await cabeceras.count(); i++) {
            const h = cabeceras.nth(i);
            if (!(await h.evaluate((el) => el.classList.contains('active')))) { await h.click(); await page.waitForTimeout(650); }
        }
    }
    throw new Error('el campo de fármaco de Reuma no es visible');
}
async function buscarReuma(texto) {
    const input = page.locator(R_INPUT);
    await input.click();
    await input.fill('');
    await input.fill(texto);
    await page.locator(R_ITEMS).first().waitFor({ state: 'visible', timeout: 20000 });
    return (await page.locator(R_ITEMS).allTextContents()).map((t) => t.trim());
}
// Farmacia: fármaco principal de Primera visita.
async function buscarFarmacia(texto) {
    const input = page.locator('#fhPvFarmaco');
    await input.click();
    await input.fill('');
    await input.type(texto, { delay: 15 });
    const lista = page.locator('#fhPvAutocompleteDropdown');
    await lista.locator('.autocomplete-item').first().waitFor({ state: 'visible', timeout: 20000 });
    return (await lista.locator('.autocomplete-item .autocomplete-item-name').allTextContents()).map((t) => t.trim());
}
const estadoCatalogo = () => page.evaluate(() => ((document.querySelector('[data-catalog-status]') || {}).textContent || '').trim());
const estadoSesion = () => page.evaluate(() => sessionStorage.getItem('nexusCimaEstado'));

try {
    await test('ninguna pantalla baja el Excel del catálogo al entrar (CIMA caída)', async () => {
        assert.ok(PAGINAS.length >= 19, 'faltan páginas: ' + PAGINAS.length);
        const culpables = [];
        for (const pagina of PAGINAS) {
            pedidasExcel = [];
            await page.goto(base + pagina, { waitUntil: 'load', timeout: 60000 });
            await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(400);
            if (pedidasExcel.length) culpables.push(pagina);
        }
        // Las pantallas sin datos cargados avisan por consola (p. ej. Estadísticas): no es de este check.
        consoleErrors.length = 0;
        assert.deepEqual(culpables, []);
    });

    await test('Reuma: con CIMA en directo busca sin leer el Excel', async () => {
        aemps = 'ok';
        await page.goto(base + 'primera_visita.html', { waitUntil: 'load' });
        await page.evaluate(() => sessionStorage.removeItem('nexusCimaEstado'));
        pedidasExcel = [];
        await abrirCampoReuma();
        const nombres = await buscarReuma('adalimumab');
        assert.deepEqual(nombres, ['HUMIRA 40 MG SINTETICO']);
        assert.equal(pedidasExcel.length, 0, 'leyó el Excel con CIMA en directo');
        assert.equal(await estadoSesion(), 'directo');
    });

    await test('Reuma: si CIMA no responde lee el respaldo una sola vez y avisa', async () => {
        aemps = 'caida';
        pedidasExcel = [];
        const nombres = await buscarReuma('metotrexato');
        assert.ok(nombres.length > 0, 'el respaldo no dio resultados');
        const aviso = await page.locator('.drug-autocomplete:has(#previoSistemicoSelect) .drug-autocomplete__notice').first().textContent();
        assert.match(aviso || '', /Sin respuesta de la AEMPS: resultados del catálogo local\./);
        await buscarReuma('leflunomida');
        assert.equal(pedidasExcel.length, 1, 'Excel pedido ' + pedidasExcel.length + ' veces');
        assert.equal(await estadoSesion(), 'respaldo');
    });

    await test('Farmacia: con CIMA en directo salen los fármacos propios del hospital sin leer el Excel', async () => {
        aemps = 'ok';
        await page.goto(base + 'farmacia_primera_visita.html', { waitUntil: 'load' });
        await page.evaluate(() => sessionStorage.removeItem('nexusCimaEstado'));
        await page.reload({ waitUntil: 'load' });
        pedidasExcel = [];
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 15000 });
        assert.equal(await estadoCatalogo(), 'CIMA en directo');
        const nombres = await buscarFarmacia('experimental');
        assert.ok(nombres.some((n) => /Comprimido experimental X \(DEMO\)/.test(n)), JSON.stringify(nombres));
        assert.equal(pedidasExcel.length, 0, 'leyó el Excel con CIMA en directo');
        assert.equal(await estadoSesion(), 'directo');
        assert.match(await page.evaluate(() => (document.getElementById('catalogSidebarNote') || {}).textContent || ''), /2 fármacos propios del hospital/);
    });

    await test('Farmacia: si CIMA no responde usa el respaldo, lo lee una vez y el aviso lo dice', async () => {
        aemps = 'caida';
        pedidasExcel = [];
        const nombres = await buscarFarmacia('metotrexato');
        assert.ok(nombres.length > 0, 'el respaldo no dio resultados');
        await buscarFarmacia('leflunomida');
        assert.equal(pedidasExcel.length, 1, 'Excel pedido ' + pedidasExcel.length + ' veces');
        assert.equal(await estadoCatalogo(), 'CIMA no responde: respaldo en uso');
        assert.match(await page.evaluate(() => (document.getElementById('catalogSidebarNote') || {}).textContent || ''), /Catálogo guardado: \d+ fármacos/);
        assert.equal(await estadoSesion(), 'respaldo');
    });

    await test('Farmacia: la pantalla siguiente recuerda el respaldo sin bajar el Excel', async () => {
        pedidasExcel = [];
        await page.goto(base + 'farmacia_index.html', { waitUntil: 'load' });
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        assert.equal(await estadoCatalogo(), 'CIMA no responde: respaldo en uso');
        assert.equal(pedidasExcel.length, 0);
    });

    await test('Farmacia: cuando CIMA vuelve a responder el aviso vuelve a «CIMA en directo»', async () => {
        aemps = 'ok';
        await page.goto(base + 'farmacia_primera_visita.html', { waitUntil: 'load' });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 15000 });
        await buscarFarmacia('experimental');
        assert.equal(await estadoCatalogo(), 'CIMA en directo');
        assert.equal(await estadoSesion(), 'directo');
    });

    await test('ningún texto de la barra dice que CIMA «se carga al abrir»', async () => {
        const malos = PAGINAS.filter((p) => /se carga automáticamente al abrir|cargando automáticamente|Catálogo CIMA cargado/.test(readFileSync(path.join(ROOT, p), 'utf8')));
        assert.deepEqual(malos, []);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_catalogo_perezoso_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
