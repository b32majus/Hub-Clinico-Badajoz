#!/usr/bin/env node
// #956 tramo 5, colocación: <nx-shell> en las 17 páginas de Reuma y Farmacia (ver nexus_shell_paginas_check.mjs).
// Comprueba en navegador: la barra se monta con su menú y la página actual marcada, los ids que usa el código
// siguen en su sitio, el pie (Terminar) se ve sin desplazar, nada desborda en 1440 y 360 px, el aviso de cambios
// sin guardar sigue frenando los enlaces, Terminar pide confirmación, el enlace al panel del paciente conserva el
// CIP y la Home no lleva barra. Local (no corre en CI).
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
// Sin profesional elegido, las páginas de Reuma redirigen a reuma_index.html (pantalla de carga): se simula uno elegido.
await context.addInitScript(() => { try { if (!localStorage.getItem('hubSelectedProfessional') && !sessionStorage.getItem('t5SinProfesional')) localStorage.setItem('hubSelectedProfessional', 'Dra. DEMO'); } catch (e) { /* sin almacenamiento */ } });
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



const REUMA = ['reuma_index', 'primera_visita', 'seguimiento', 'estadisticas', 'manage_professionals', 'dashboard_paciente', 'dashboard_search'];
const FARMACIA = ['farmacia_index', 'farmacia_validacion', 'farmacia_primera_visita', 'farmacia_seguimiento', 'farmacia_dashboard_paciente',
    'farmacia_dashboard_longitudinal', 'farmacia_actividad_servicio', 'farmacia_estadisticas', 'farmacia_farmacos', 'farmacia_profesionales'];
// Ya desbordaba antes de la barra nueva (204 px en la base): deuda H-13 de docs/deuda-tecnica.
const DESBORDE_PREVIO_MOVIL = new Set(['manage_professionals']);
const SIN_MENU = new Set(['dashboard_paciente', 'dashboard_search', 'farmacia_dashboard_longitudinal']);
const IDS = ['currentProfessional', 'patientSearch', 'clearPatientSearch', 'dbStatusIndicator', 'dbStatusIcon', 'dbStatusLabel', 'dbStatusTime'];
const IDS_FARM = ['catalogSidebarStatus', 'catalogSidebarNote', 'sidebarLoadCatalog', 'sidebarFileCatalog'];

try {
    await test('B1 las 17 páginas montan la barra, con sus ids dentro, la actual marcada y el pie a la vista', async () => {
        const problemas = [];
        for (const [p, modulo] of [...REUMA.map((x) => [x, 'reuma']), ...FARMACIA.map((x) => [x, 'farmacia'])]) {
            await page.setViewportSize({ width: 1440, height: 900 });
            await page.goto(`${base}${p}.html`, { waitUntil: 'load' });
            await page.waitForSelector('nx-shell nav.nx-shell__nav', { timeout: 10000 });
            const r = await page.evaluate(({ ids, extra }) => {
                const shell = document.querySelector('nx-shell');
                const actuales = [...shell.querySelectorAll('a[aria-current="page"]')].map((a) => a.getAttribute('href'));
                const faltan = [...ids, ...extra].filter((id) => !shell.querySelector('#' + id));
                const terminar = shell.querySelector('.nx-shell__terminar');
                const caja = terminar ? terminar.getBoundingClientRect() : null;
                return { actuales, faltan, enlaces: shell.querySelectorAll('a.nx-shell__enlace[data-nav-link]').length,
                    terminarVisible: !!caja && caja.bottom <= window.innerHeight && caja.top >= 0,
                    main: !!document.querySelector('main.main-content.nx-marco__contenido'), cols: getComputedStyle(document.querySelector('.nx-marco')).gridTemplateColumns.split(' ').length,
                    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
            }, { ids: IDS, extra: modulo === 'farmacia' ? IDS_FARM : [] });
            if (r.faltan.length) problemas.push(`${p}: faltan ${r.faltan.join(',')}`);
            if (r.enlaces < 5) problemas.push(`${p}: ${r.enlaces} enlaces`);
            if (SIN_MENU.has(p) ? r.actuales.length !== 0 : (r.actuales.length !== 1 || r.actuales[0] !== p + '.html')) problemas.push(`${p}: aria-current=${r.actuales}`);
            if (!r.terminarVisible) problemas.push(`${p}: Terminar fuera de la vista a 900 px`);
            if (!r.main) problemas.push(`${p}: sin main.main-content.nx-marco__contenido`);
            if (r.cols !== 2) problemas.push(`${p}: marco en ${r.cols} columnas a 1440`);
            if (r.desborde > 0) problemas.push(`${p}: desborde ${r.desborde}px a 1440`);
            await page.setViewportSize({ width: 360, height: 800 });
            await page.waitForTimeout(150);
            const mov = await page.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.nx-marco')).gridTemplateColumns.split(' ').length,
                desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
            if (mov.cols !== 1) problemas.push(`${p}: marco en ${mov.cols} columnas a 360`);
            if (mov.desborde > 0 && !DESBORDE_PREVIO_MOVIL.has(p)) problemas.push(`${p}: desborde ${mov.desborde}px a 360`);
        }
        assert.deepEqual(problemas, []);
    });

    await test('B2 el aviso de cambios sin guardar sigue frenando los enlaces de la barra (Reuma)', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(`${base}primera_visita.html`, { waitUntil: 'load' });
        await page.waitForSelector('nx-shell a.nx-shell__enlace[data-nav-link]');
        await page.addStyleTag({ content: '#sessionGate { display: none !important; }' });
        const mensajes = [];
        const gestor = async (d) => { mensajes.push(d.message()); await d.dismiss(); };
        page.removeAllListeners('dialog');
        page.on('dialog', gestor);
        await page.evaluate(() => { window.isFormDirty = true; });
        await page.click('nx-shell a.nx-shell__enlace[href="reuma_index.html"]');
        await page.waitForTimeout(400);
        page.removeListener('dialog', gestor);
        page.on('dialog', (d) => d.accept());
        assert.ok(mensajes.length >= 1 && /sin guardar/i.test(mensajes[0]), `sin aviso de cambios sin guardar: ${JSON.stringify(mensajes)}`);
        assert.ok(page.url().endsWith('primera_visita.html'), `la página cambió: ${page.url()}`);
    });

    await test('B3 Terminar pide confirmación; «Seguir aquí» no hace nada y «Terminar» olvida al profesional y va a la Home', async () => {
        await page.goto(`${base}farmacia_index.html`, { waitUntil: 'load' });
        await page.waitForSelector('nx-shell .nx-shell__terminar');
        await page.evaluate(() => localStorage.setItem('hubSelectedProfessional', 'Dra. DEMO'));
        await page.click('nx-shell .nx-shell__terminar');
        await page.waitForSelector('dialog[open]');
        await page.click('dialog[open] button:has-text("Seguir aquí")');
        assert.equal(await page.evaluate(() => localStorage.getItem('hubSelectedProfessional')), 'Dra. DEMO');
        assert.ok(page.url().endsWith('farmacia_index.html'));
        await page.evaluate(() => sessionStorage.setItem('t5SinProfesional', '1'));
        await page.click('nx-shell .nx-shell__terminar');
        await page.waitForSelector('dialog[open]');
        await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('dialog[open] button:has-text("Terminar")')]);
        assert.equal(await page.evaluate(() => localStorage.getItem('hubSelectedProfessional')), null);
        assert.ok(/\/(index\.html)?$/.test(new URL(page.url()).pathname), page.url());
    });

    await test('B4 el enlace «Dashboard Paciente» de la barra conserva el CIP en el Seguimiento de Farmacia', async () => {
        await page.goto(`${base}farmacia_seguimiento.html?cip=${CIP}`, { waitUntil: 'load' });
        await page.waitForFunction((cip) => {
            const a = document.querySelector('nx-shell a.nx-shell__enlace[href*="farmacia_dashboard_paciente.html"]');
            return !!a && a.getAttribute('href').includes('cip=' + cip);
        }, CIP, { timeout: 10000 });
    });

    await test('B5 la Home no lleva barra', async () => {
        for (const p of ['index', 'nexus_home']) {
            await page.goto(`${base}${p}.html`, { waitUntil: 'load' });
            assert.equal(await page.locator('nx-shell').count(), 0, p);
        }
    });

    await test('B6 sin errores de consola en ninguna página', async () => {
        // «No hay datos cargados» es el mensaje propio de Estadísticas sin Excel (ya existía).
        assert.deepEqual(consoleErrors.filter((m) => !/No hay datos cargados/.test(m)), []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_shell_paginas_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
