#!/usr/bin/env node
// Ayuda emergente <nx-ayuda> junto a «Unidad PCR» (issue #717, pieza nueva del catálogo).
// Comprueba, en Primera visita y Seguimiento de Reuma (escritorio, tableta y móvil): el botón «i» y su texto
// con las unidades por hospital (Mérida y Cáceres mg/L, Badajoz mg/dL); que se abre con el ratón, el teclado
// y el toque; que Escape y el toque fuera lo cierran; que el texto cabe en pantalla; y que la unidad NO
// tiene valor por defecto (el #717 lo prohíbe sin fuente SES). Y el recordatorio «indica la unidad», que sale
// solo cuando hay valor de PCR y falta la unidad. Solo datos sintéticos.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
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


const PAGINAS = ['primera_visita.html', 'seguimiento.html'];
const PANTALLAS = [
    ['escritorio', { width: 1440, height: 900 }, false],
    ['tableta', { width: 768, height: 1024 }, false],
    ['movil', { width: 390, height: 844 }, true]
];

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const consoleErrors = [];

async function abrir(contexto, archivo) {
    const page = await contexto.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && m.text().indexOf('Failed to load resource') === -1) consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    await page.goto(base + archivo, { waitUntil: 'networkidle' });
    await page.waitForSelector('nx-ayuda .nx-ayuda__boton', { state: 'attached', timeout: 10000 });
    await page.evaluate(() => document.querySelectorAll('.collapsible-header').forEach((b) => b.click()));
    await page.locator('#pcrUnit').scrollIntoViewIfNeeded();
    return page;
}
const visible = async (page) => { await page.waitForTimeout(350); return page.evaluate(() => getComputedStyle(document.querySelector('.nx-ayuda__texto')).visibility === 'visible'); };

try {
    for (const archivo of PAGINAS) {
        for (const [nombre, viewport, tactil] of PANTALLAS) {
            const contexto = await browser.newContext({ viewport, hasTouch: tactil, isMobile: tactil });
            await contexto.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Dra. DEMO Sintética'); } catch {} });
            const page = await abrir(contexto, archivo);
            const boton = page.locator('nx-ayuda .nx-ayuda__boton');
            const etiqueta = `${archivo} ${nombre}`;

            await test(`${etiqueta}: botón accesible con el texto de las unidades, oculto al principio`, async () => {
                assert.equal(await page.locator('nx-ayuda').count(), 1);
                assert.equal(await boton.getAttribute('aria-label'), 'Unidades de PCR por hospital');
                assert.equal(await boton.getAttribute('aria-expanded'), 'false');
                const idTexto = await boton.getAttribute('aria-describedby');
                const texto = page.locator(`#${idTexto}`);
                assert.equal(await texto.getAttribute('role'), 'tooltip');
                const t = await texto.textContent();
                for (const parte of ['Mérida', 'Cáceres', 'mg/L', 'Badajoz', 'mg/dL']) assert.ok(t.includes(parte), 'falta ' + parte);
                assert.equal(await visible(page), false);
            });

            await test(`${etiqueta}: la unidad sigue sin valor por defecto`, async () => {
                assert.equal(await page.locator('#pcrUnit').inputValue(), '');
            });

            await test(`${etiqueta}: el texto cabe en pantalla, sin desborde horizontal`, async () => {
                if (tactil) await boton.tap(); else await boton.hover();
                assert.equal(await visible(page), true);
                const medidas = await page.evaluate(() => {
                    const r = document.querySelector('.nx-ayuda__texto').getBoundingClientRect();
                    return { izq: r.left, der: r.right, ancho: window.innerWidth, desborde: document.documentElement.scrollWidth - window.innerWidth };
                });
                assert.ok(medidas.izq >= 0 && medidas.der <= medidas.ancho, JSON.stringify(medidas));
                assert.ok(medidas.desborde <= 0, 'desborde ' + medidas.desborde);
                // Que ninguna tarjeta lo recorte: el punto del borde derecho y el de abajo pertenecen al texto
                const recortado = await page.evaluate(() => {
                    const t = document.querySelector('.nx-ayuda__texto');
                    const r = t.getBoundingClientRect();
                    return [[r.right - 4, r.top + r.height / 2], [r.left + r.width / 2, r.bottom - 4]]
                        .filter(([x, y]) => !t.contains(document.elementFromPoint(x, y))).length;
                });
                assert.equal(recortado, 0, 'el texto aparece recortado por otro elemento');
            });

            if (!tactil) {
                await test(`${etiqueta}: ratón — se abre al pasar, el ratón puede bajar al texto, se cierra al salir`, async () => {
                    await page.mouse.move(5, 5);
                    assert.equal(await visible(page), false);
                    await boton.hover();
                    assert.equal(await visible(page), true);
                    const t = await page.locator('.nx-ayuda__texto').boundingBox();
                    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 });
                    assert.equal(await visible(page), true, 'se cerró al bajar al texto');
                    await page.mouse.move(5, 5);
                    assert.equal(await visible(page), false);
                });

                await test(`${etiqueta}: teclado — se abre al enfocar, Escape lo oculta y al volver reaparece`, async () => {
                    await page.mouse.move(5, 5);
                    await page.locator('#pcrValue').focus();
                    await page.keyboard.press('Tab');
                    assert.equal(await page.evaluate(() => document.activeElement.className), 'nx-ayuda__boton');
                    assert.equal(await visible(page), true);
                    await page.keyboard.press('Escape');
                    assert.equal(await visible(page), false);
                    await page.keyboard.press('Shift+Tab');
                    await page.keyboard.press('Tab');
                    assert.equal(await visible(page), true);
                    await page.keyboard.press('Tab');
                    assert.equal(await visible(page), false);
                });
            }

            await test(`${etiqueta}: clic o toque alterna, y tocar fuera lo cierra`, async () => {
                await page.mouse.move(5, 5);
                await page.locator('#pcrValue').click({ force: true }); // parte de «cerrada» (el caso de toque anterior pudo dejarla abierta)
                assert.equal(await boton.getAttribute('aria-expanded'), 'false');
                if (tactil) await boton.tap(); else await boton.click();
                assert.equal(await boton.getAttribute('aria-expanded'), 'true');
                assert.equal(await visible(page), true);
                await page.mouse.move(5, 5);
                await page.locator('#pcrValue').click({ force: true });
                assert.equal(await boton.getAttribute('aria-expanded'), 'false');
                assert.equal(await visible(page), false);
            });

            await test(`${etiqueta}: recordatorio de unidad solo con valor de PCR y sin unidad; el texto fijo ya no está`, async () => {
                assert.equal(await page.locator('#pcrUnitHelp').count(), 0);
                const aviso = page.locator('#pcrUnitAviso');
                assert.equal(await aviso.isVisible(), false, 'visible sin valor');
                await page.locator('#pcrValue').fill('4.5');
                assert.equal(await aviso.isVisible(), true, 'no sale con valor y sin unidad');
                assert.ok((await aviso.textContent()).includes('unidad'));
                await page.locator('#pcrUnit').selectOption('mg/L');
                assert.equal(await aviso.isVisible(), false, 'sigue con unidad elegida');
                await page.locator('#pcrUnit').selectOption('');
                assert.equal(await aviso.isVisible(), true, 'no vuelve al quitar la unidad');
                await page.locator('#pcrValue').fill('');
                assert.equal(await aviso.isVisible(), false, 'sigue sin valor');
            });

            await test(`${etiqueta}: el icono es el círculo de información estándar, no una letra`, async () => {
                assert.equal(await boton.locator('i.fa-info-circle').count(), 1);
                assert.equal((await boton.textContent()).trim(), '');
            });

            await page.close();
            await contexto.close();
        }
    }

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_ayuda_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
