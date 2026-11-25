#!/usr/bin/env node
// Librería de Excel (SheetJS) solo cuando se usa (#956, carga): ninguna pantalla la pide al entrar; se baja
// una sola vez al importar (Reuma y Farmacia) o al leer el catálogo de respaldo, aunque se pida a la vez;
// un mismo fichero lleva la misma versión (?v=) en todas las páginas. Con caché se miden los tiempos de cada
// pantalla y se imprimen; solo se falla por encima de 2 s (freno a un desastre: este servidor va cargado y
// 300 ms no es estable; la medida fina se hace con red lenta antes/después, no aquí).
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, createReadStream } from 'node:fs';
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
// Por defecto sin caché; el caso de navegación con caché activa `conCache` (como Pages: caché corta).
let conCache = false;
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': conCache ? 'max-age=600' : 'no-store' });
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

const SHEETJS = /vendor\/sheetjs\/xlsx[^/]*\.js/;
const PAGINAS = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const XLSXnode = createRequire(import.meta.url)(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

// Libro de Reuma sintético (el mismo corpus que usa reuma_read_harness).
function libroReuma() {
    const corpus = JSON.parse(readFileSync(path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json'), 'utf8'));
    const wb = XLSXnode.utils.book_new();
    for (const [nombre, filas] of Object.entries(corpus.sheets)) XLSXnode.utils.book_append_sheet(wb, XLSXnode.utils.json_to_sheet(filas), nombre);
    return Array.from(XLSXnode.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
const BYTES_REUMA = libroReuma();

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await context.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Prueba'); } catch (e) { /* sin almacenamiento */ } });
// CIMA caída: así Reuma necesita su catálogo de respaldo (que también usa la librería de Excel).
await context.route('https://cima.aemps.es/**', (route) => route.abort('internetdisconnected'));
let pedidasSheetjs = [];
context.on('request', (request) => { if (SHEETJS.test(request.url())) pedidasSheetjs.push(request.url()); });
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1 && !/^\[Estadísticas\] No hay datos cargados/.test(message.text())) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

async function abrir(pagina) {
    await page.goto(base + pagina, { waitUntil: 'load' });
    await page.waitForTimeout(400);
}

try {
    await test('ninguna página lleva la etiqueta <script> de la librería de Excel', async () => {
        const con = PAGINAS.filter((p) => /<script[^>]+vendor\/sheetjs\//.test(readFileSync(path.join(ROOT, p), 'utf8')));
        assert.deepEqual(con, []);
    });

    await test('un mismo fichero lleva la misma versión (?v=) en todas las páginas', async () => {
        const versiones = new Map();
        for (const p of PAGINAS) {
            for (const m of readFileSync(path.join(ROOT, p), 'utf8').matchAll(/(?:src|href)="([^"#?]+\.(?:js|css))(?:\?v=([^"]*))?"/g)) {
                if (!versiones.has(m[1])) versiones.set(m[1], new Set());
                versiones.get(m[1]).add(m[2] || '(sin versión)');
            }
        }
        const distintos = [...versiones].filter(([, v]) => v.size > 1).map(([f, v]) => f + ': ' + [...v].join(' / '));
        assert.deepEqual(distintos, []);
    });

    await test('ninguna de las 19 pantallas pide la librería de Excel al entrar', async () => {
        const piden = [];
        for (const p of PAGINAS) {
            pedidasSheetjs = [];
            await abrir(p);
            const cargada = await page.evaluate(() => typeof window.XLSX !== 'undefined');
            if (pedidasSheetjs.length || cargada) piden.push(p);
        }
        assert.deepEqual(piden, []);
        consoleErrors.length = 0; // los avisos propios de cada pantalla sin datos no son de este cambio
    });

    await test('Reuma: importar el Excel de pacientes baja la librería una vez y carga los datos', async () => {
        await abrir('reuma_index.html');
        pedidasSheetjs = [];
        const ok = await page.evaluate(async (bytes) => {
            const file = new File([new Uint8Array(bytes)], 'reuma_sintetico.xlsx');
            return await window.HubTools.data.loadDatabase(file);
        }, BYTES_REUMA);
        assert.equal(ok, true);
        assert.equal(pedidasSheetjs.length, 1, 'peticiones a la librería: ' + pedidasSheetjs.length);
    });

    await test('Reuma: catálogo de respaldo e importación a la vez piden la librería una sola vez', async () => {
        await abrir('primera_visita.html');
        pedidasSheetjs = [];
        const r = await page.evaluate(async (bytes) => {
            const file = new File([new Uint8Array(bytes)], 'reuma_sintetico.xlsx');
            const [estado, ok] = await Promise.all([window.HubTools.catalog.ensureLoaded(), window.HubTools.data.loadDatabase(file)]);
            return { estado, ok };
        }, BYTES_REUMA);
        assert.equal(r.ok, true);
        assert.equal(r.estado && r.estado.state, 'loaded');
        assert.equal(pedidasSheetjs.length, 1, 'peticiones a la librería: ' + pedidasSheetjs.length);
    });

    await test('Farmacia: importar el Excel de Enfermería baja la librería una vez y queda importado', async () => {
        await abrir('farmacia_index.html');
        pedidasSheetjs = [];
        await page.locator('#inputExcelEnfermeria').setInputFiles(path.join(ROOT, 'tools', 'fixtures', 'enfermeria_v6_sintetico_v1.xlsx'));
        await page.waitForFunction(() => window.FarmaciaDataImports && window.FarmaciaDataImports.getState('enfermeria'), null, { timeout: 20000 });
        assert.equal(pedidasSheetjs.length, 1, 'peticiones a la librería: ' + pedidasSheetjs.length);
    });

    await test('Farmacia Estadísticas: el informe Cosentyx se descarga en Excel', async () => {
        await abrir('farmacia_estadisticas.html');
        pedidasSheetjs = [];
        // Mismo recorrido que farmacia_cosentyx_informe_browser_check: Reportes → fármaco → tipo → «Ver reporte».
        await page.locator('#informes-view-btn').click();
        await page.locator('#informes-drug-select').selectOption('cosentyx');
        await page.locator('#informes-report-select').selectOption('cosentyx');
        await page.locator('#informes-view-report').click();
        const descarga = page.waitForEvent('download', { timeout: 20000 });
        await page.locator('#informes-download-xlsx').click();
        const d = await descarga;
        assert.match(d.suggestedFilename(), /^informe_trimestral_cosentyx_.*\.xlsx$/);
        assert.equal(pedidasSheetjs.length, 1, 'peticiones a la librería: ' + pedidasSheetjs.length);
    });

    await test('con caché, ninguna pantalla tarda 2 s o más en abrir', async () => {
        conCache = true;
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await ctx.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Prueba'); } catch (e) { /* sin almacenamiento */ } });
        await ctx.route('https://cima.aemps.es/**', (route) => route.abort('internetdisconnected'));
        const p2 = await ctx.newPage();
        const lentas = [];
        try {
            for (const p of PAGINAS) {
                await p2.goto(base + p, { waitUntil: 'load' }); // primera visita: llena la caché
                let mejor = Infinity;
                for (let i = 0; i < 3; i++) {
                    await p2.goto('about:blank');
                    await p2.goto(base + p, { waitUntil: 'load' });
                    const ms = await p2.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n.loadEventEnd || n.domContentLoadedEventEnd; });
                    mejor = Math.min(mejor, ms);
                }
                console.log('  ' + p + ' ' + Math.round(mejor) + ' ms');
                if (mejor >= 2000) lentas.push(p + ' ' + Math.round(mejor) + ' ms');
            }
        } finally {
            await ctx.close();
            conCache = false;
        }
        assert.deepEqual(lentas, []);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_excel_perezoso_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
