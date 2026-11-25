#!/usr/bin/env node
// Check de navegador: el CIP sale de la URL de Farmacia (issue #714, tramo 1).
// Qué comprueba: ninguna dirección ni enlace de Farmacia lleva cip, patient_id, identifier_system,
// generation, fh_session ni patologia; el paciente pasa de pantalla a pantalla por la memoria de la
// pestaña; una dirección antigua con ?cip= se acepta una vez y se limpia; F5 pregunta «continuar o
// empezar de cero» (Aceptar sigue, Cancelar olvida); solicitud_id, servicio y entrada se quedan.
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
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message.split('\n')[0]}`); }
}

const PATIENT_KEYS = ['cip', 'id', 'patient_id', 'identifier_system', 'generation', 'fh_session', 'patologia'];
const CIP_B = 'CIP-DEMO-FH-003';
const CIP_LONG = 'CIP-DEMO-FH-004';
const PATIENT_PAGES = ['farmacia_index.html', 'farmacia_dashboard_paciente.html', 'farmacia_seguimiento.html',
    'farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_dashboard_longitudinal.html'];

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const consoleErrors = [];
// Diálogos: por defecto se aceptan y se apuntan; un caso puede pedir que el siguiente se cancele.
const dialogs = [];
let dismissNext = false;
async function freshPage() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        if (dismissNext) { dismissNext = false; dialog.dismiss(); } else { dialog.accept(); }
    });
    page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(String(error)));
    return page;
}

function patientKeysIn(url) {
    const params = new URL(url, base).searchParams;
    return PATIENT_KEYS.filter((key) => params.has(key));
}
async function waitCleanUrl(page) {
    await page.waitForFunction((keys) => {
        const params = new URLSearchParams(window.location.search);
        return keys.every((key) => !params.has(key));
    }, PATIENT_KEYS, { timeout: 10000 });
}
async function currentCip(page) {
    return page.evaluate(() => {
        const F = window.FarmaciaDemo;
        return F && typeof F.getQueryContext === 'function' ? F.getQueryContext().cip : null;
    });
}
async function waitCip(page, expected) {
    await page.waitForFunction((value) => {
        const F = window.FarmaciaDemo;
        return !!F && typeof F.getQueryContext === 'function' && F.getQueryContext().cip === value;
    }, expected, { timeout: 10000 });
}
async function linksWithPatientKeys(page) {
    return page.evaluate((keys) => Array.from(document.querySelectorAll('a[href]'))
        .map((link) => link.getAttribute('href') || '')
        .filter((href) => /farmacia_[a-z_]+\.html/.test(href))
        .filter((href) => {
            const query = href.split('#')[0].split('?')[1] || '';
            const params = new URLSearchParams(query);
            return keys.some((key) => params.has(key));
        }), PATIENT_KEYS);
}

try {
    // 1. Dirección antigua con el CIP: se acepta una vez, el paciente queda puesto y la dirección se limpia.
    for (const pageName of PATIENT_PAGES) {
        const cip = pageName === 'farmacia_dashboard_longitudinal.html' ? CIP_LONG : CIP;
        await test(`${pageName}: ?cip= antiguo se acepta, se limpia y ningún enlace lleva datos del paciente`, async () => {
            const page = await freshPage();
            await page.goto(`${base}${pageName}?cip=${cip}&patologia=AR&servicio=reumatologia&entrada=dashboard`, { waitUntil: 'load' });
            await waitCleanUrl(page);
            const params = new URL(page.url()).searchParams;
            assert.equal(params.get('servicio'), 'reumatologia', 'servicio debe quedarse en la dirección');
            assert.equal(params.get('entrada'), 'dashboard', 'entrada debe quedarse en la dirección');
            if (pageName === 'farmacia_dashboard_longitudinal.html') {
                await page.waitForFunction((value) => (document.getElementById('longitudinalPatientSelect') || {}).value === value, cip, { timeout: 10000 });
            } else {
                await waitCip(page, cip);
            }
            await page.waitForTimeout(300);
            assert.deepEqual(await linksWithPatientKeys(page), [], 'enlaces con datos del paciente');
            await page.context().close();
        });
    }

    // 2. Navegar sin datos en la dirección conserva al paciente; F5 pregunta; Aceptar sigue; Cancelar olvida.
    await test('panel → seguimiento: el paciente pasa sin ir en la dirección', async () => {
        const page = await freshPage();
        await page.goto(`${base}farmacia_dashboard_paciente.html?cip=${CIP}&entrada=dashboard`, { waitUntil: 'load' });
        await waitCip(page, CIP);
        const link = page.locator('#navToSeguimiento');
        await link.waitFor({ timeout: 10000 });
        assert.deepEqual(patientKeysIn(await link.getAttribute('href')), []);
        dialogs.length = 0;
        await Promise.all([page.waitForURL(/farmacia_seguimiento\.html/, { timeout: 15000 }), link.click()]);
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        assert.deepEqual(patientKeysIn(page.url()), []);
        assert.deepEqual(dialogs, [], 'navegar dentro de Farmacia no pregunta nada');
        const pointer = await page.evaluate(() => JSON.parse(sessionStorage.getItem('promueve.fh.currentPatientPointer.v1') || 'null'));
        assert.equal(pointer && pointer.cip, CIP, 'el paciente actual está en sessionStorage promueve.fh.currentPatientPointer.v1');

        dialogs.length = 0;
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        assert.equal(dialogs.length, 1, 'F5 pregunta una vez');
        assert.match(dialogs[0], /continuar/i);
        assert.match(dialogs[0], /empezar de cero/i);

        dialogs.length = 0;
        dismissNext = true;
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(800);
        assert.equal(dialogs.length, 1, 'F5 pregunta otra vez');
        assert.equal(await currentCip(page), '', 'Cancelar empieza de cero');
        assert.equal((await page.inputValue('#fhSegCip')).trim(), '');
        const left = await page.evaluate(() => ['promueve.fh.currentPatientPointer.v1', 'promueve.fh.currentPatientSession.v1']
            .filter((key) => sessionStorage.getItem(key) !== null));
        assert.deepEqual(left, [], 'tras Cancelar no queda paciente actual en la memoria de la pestaña');

        dialogs.length = 0;
        await page.goto(`${base}farmacia_dashboard_paciente.html?entrada=dashboard`, { waitUntil: 'load' });
        await page.waitForTimeout(800);
        assert.equal(await currentCip(page), '', 'tras empezar de cero no vuelve el paciente anterior');
        assert.deepEqual(dialogs, []);
        await page.context().close();
    });

    // 3. Enlace a OTRO paciente (caso destacado de Inicio): abre ese paciente, no el que estaba puesto.
    await test('Inicio: el caso destacado FH-004 abre FH-004 aunque hubiera otro paciente puesto', async () => {
        const page = await freshPage();
        await page.goto(`${base}farmacia_seguimiento.html?cip=${CIP}`, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.goto(`${base}farmacia_index.html`, { waitUntil: 'load' });
        const link = page.locator('#demoCaseFh004 a[href*="farmacia_dashboard_paciente.html"]');
        assert.deepEqual(patientKeysIn(await link.getAttribute('href')), []);
        await Promise.all([page.waitForURL(/farmacia_dashboard_paciente\.html/, { timeout: 15000 }), link.click()]);
        await waitCip(page, CIP_LONG);
        assert.deepEqual(patientKeysIn(page.url()), []);
        await page.context().close();
    });

    // 4. Búsqueda lateral por CIP: va a Inicio con ese paciente y sin el CIP en la dirección.
    await test('búsqueda lateral: Intro lleva a Inicio con ese paciente y sin CIP en la dirección', async () => {
        const page = await freshPage();
        await page.goto(`${base}farmacia_seguimiento.html?cip=${CIP}`, { waitUntil: 'load' });
        await waitCip(page, CIP);
        const search = page.locator('#patientSearch');
        if (await search.count() === 0) throw new Error('no hay #patientSearch en Seguimiento');
        await search.fill(CIP_B);
        await Promise.all([page.waitForURL(/farmacia_index\.html/, { timeout: 15000 }), search.press('Enter')]);
        await waitCip(page, CIP_B);
        assert.deepEqual(patientKeysIn(page.url()), []);
        await page.waitForFunction((value) => (document.getElementById('fhCipInput') || {}).value === value, CIP_B, { timeout: 10000 });
        // Volver a Inicio después NO relanza la búsqueda (el aviso es de un solo uso).
        await page.goto(`${base}farmacia_index.html`, { waitUntil: 'load' });
        await page.waitForTimeout(800);
        assert.equal(await page.inputValue('#fhCipInput'), '', 'volver a Inicio no reabre la ficha');
        await page.context().close();
    });

    // 5. solicitud_id se queda en la dirección (regla N4; se decidirá aparte).
    await test('makeContextUrl conserva servicio, entrada y solicitud_id y quita cip y patologia', async () => {
        const page = await freshPage();
        await page.goto(`${base}farmacia_index.html`, { waitUntil: 'load' });
        const url = await page.evaluate(() => window.FarmaciaDemo.makeContextUrl('farmacia_validacion.html', {
            cip: 'CIP-DEMO-FH-002', servicio: 'reumatologia', patologia: 'AR', entrada: 'validacion', solicitud_id: 'SOL-DER-TEST-1'
        }));
        const params = new URL(url, base).searchParams;
        assert.deepEqual(patientKeysIn(url), []);
        assert.equal(params.get('servicio'), 'reumatologia');
        assert.equal(params.get('entrada'), 'validacion');
        assert.equal(params.get('solicitud_id'), 'SOL-DER-TEST-1');
        await page.context().close();
    });

    // 6. Nada del paciente en localStorage.
    await test('el CIP nunca va a localStorage', async () => {
        const page = await freshPage();
        await page.goto(`${base}farmacia_dashboard_paciente.html?cip=${CIP}`, { waitUntil: 'load' });
        await waitCip(page, CIP);
        const inLocal = await page.evaluate((value) => Object.keys(localStorage).filter((key) => (localStorage.getItem(key) || '').indexOf(value) !== -1), CIP);
        assert.deepEqual(inLocal, []);
        await page.context().close();
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_cip_fuera_url_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
