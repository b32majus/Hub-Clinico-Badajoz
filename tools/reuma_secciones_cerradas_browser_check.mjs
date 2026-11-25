#!/usr/bin/env node
// Secciones cerradas sin colocar (#956, carga): en Primera visita y Seguimiento de Reuma el navegador no coloca
// el contenido de una sección cerrada (content-visibility) hasta abrirla; al abrirla se ve entera con su altura,
// al cerrarla la animación termina antes de ocultarla. Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

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
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'primera_visita.html';
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
await context.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Prueba'); } catch (e) { /* sin almacenamiento */ } });
await context.route('https://cima.aemps.es/**', (route) => route.abort('internetdisconnected'));
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

// Estado de la primera sección de primer nivel y de todas las cerradas.
function estado() {
    return page.evaluate(() => {
        const cerradas = [...document.querySelectorAll('.collapsible-header:not(.active) + .collapsible-content')];
        const header = document.querySelector('.collapsible-header');
        const content = header.nextElementSibling;
        const campo = content.querySelector('input:not([type=hidden]), select, textarea');
        const r = campo ? campo.getBoundingClientRect() : { width: 0, height: 0 };
        return {
            cerradasSinColocar: cerradas.filter((c) => getComputedStyle(c).contentVisibility === 'hidden').length,
            cerradas: cerradas.length,
            abierta: header.classList.contains('active'),
            cv: getComputedStyle(content).contentVisibility,
            alto: content.clientHeight,
            scroll: content.scrollHeight,
            maxHeight: parseInt(content.style.maxHeight) || 0,
            campoVisible: r.width > 0 && r.height > 0
        };
    });
}

try {
    for (const pagina of ['primera_visita.html', 'seguimiento.html']) {
        await test(`${pagina}: al entrar, ninguna sección cerrada se coloca`, async () => {
            await page.goto(base + pagina, { waitUntil: 'load' });
            await page.waitForTimeout(800);
            const e = await estado();
            assert.ok(e.cerradas >= 10, 'secciones cerradas: ' + e.cerradas);
            assert.equal(e.cerradasSinColocar, e.cerradas);
        });

        await test(`${pagina}: al abrir una sección se ve entera con su altura`, async () => {
            await page.locator('.collapsible-header').first().click();
            await page.waitForTimeout(700);
            const e = await estado();
            assert.equal(e.abierta, true);
            assert.equal(e.cv, 'visible');
            assert.ok(e.alto > 50, 'alto ' + e.alto);
            assert.ok(Math.abs(e.maxHeight - e.scroll) <= 10, `max-height ${e.maxHeight} vs contenido ${e.scroll}`);
            assert.equal(e.campoVisible, true, 'el primer campo de la sección se ve');
        });

        await test(`${pagina}: al cerrar, la animación termina antes de ocultar el contenido`, async () => {
            await page.locator('.collapsible-header').first().click();
            await page.waitForTimeout(100);
            const durante = await estado();
            assert.equal(durante.cv, 'visible', 'a mitad del cierre el contenido sigue colocado');
            await page.waitForTimeout(800);
            const despues = await estado();
            assert.equal(despues.abierta, false);
            assert.equal(despues.cv, 'hidden');
            assert.ok(despues.alto <= 2, 'alto al cerrar ' + despues.alto);
        });

        await test(`${pagina}: se puede volver a abrir`, async () => {
            await page.locator('.collapsible-header').first().click();
            await page.waitForTimeout(700);
            const e = await estado();
            assert.equal(e.cv, 'visible');
            assert.ok(e.alto > 50, 'alto ' + e.alto);
        });
    }

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`reuma_secciones_cerradas_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
