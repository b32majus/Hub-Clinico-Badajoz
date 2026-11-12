#!/usr/bin/env node
// Check de navegador — Farmacia usa el buscador común de fármacos (tramo 3 del
// buscador, decisiones de Sil 12-11):
//  - busca en directo en la AEMPS (API CIMA, `HubTools.cimaSearch`) por nombre y
//    por principio activo; a la AEMPS solo va el texto buscado;
//  - debajo de la AEMPS salen los fármacos dados de alta a mano (LOCAL) del
//    catálogo de Farmacia; el resto del catálogo de Farmacia (CIMA) solo es
//    respaldo cuando la AEMPS no responde, y entonces se avisa;
//  - al elegir un fármaco de la AEMPS: nombre comercial, dosis y vía del
//    medicamento precompletadas y editables (como hasta ahora en Farmacia);
//    vía solo si la AEMPS da UNA vía; sin principio activo; origen «CIMA»,
//    nº de registro y código nacional vacío (la búsqueda no lo da).
// La AEMPS se simula con context.route: el check nunca sale a internet.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-002';
const MANUAL_CIP = 'CIP-SYN-TRAMO3-01';
const QUERY = 'sintet';

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

// ---- AEMPS simulada ---------------------------------------------------------
const AEMPS_A = {
    nregistro: '990001', nombre: 'SINTETICOMAB 40 MG SOLUCION INYECTABLE EN PLUMA PRECARGADA',
    dosis: '40 mg', viasAdministracion: [{ id: 58, nombre: 'VÍA SUBCUTÁNEA' }],
    vtm: { id: 1, nombre: 'sinteticomab' }, biosimilar: false
};
const AEMPS_B = {
    nregistro: '990002', nombre: 'SINTETICOMAB 100 MG POLVO PARA SOLUCION INYECTABLE',
    dosis: '100 mg', viasAdministracion: [{ id: 48, nombre: 'VÍA INTRAVENOSA' }, { id: 58, nombre: 'VÍA SUBCUTÁNEA' }],
    vtm: { id: 1, nombre: 'sinteticomab' }
};
// por principio activo vuelve A (duplicado: sale una vez)
const AEMPS_ROWS = { nombre: { [QUERY]: [AEMPS_A, AEMPS_B], zqsint: [AEMPS_A] }, practiv1: { [QUERY]: [AEMPS_A], zqsint: [] } };
let aempsMode = 'ok'; // ok | empty | invalid
const aempsRequests = [];

// ---- Catálogo sintético de Farmacia (se carga con el propio cargador) ------
const CATALOG = {
    cima: [{
        codigo_nacional: '700001', nregistro: 'SYN/A', drug_source_id: 'CIMA-SYN-A',
        nombre_comercial: 'Producto Sintetico Catalogo', principio_activo: 'Molecula Catalogo',
        nombre_presentacion: '100 mg jeringa', dosis_presentacion: '100 mg', via: 'VIA SUBCUTANEA'
    }],
    local: [{
        local_drug_id: 'LOC-SYN-1', display_name: 'Sintetico Local Especial (DEMO)',
        principio_activo_o_molecula: 'Molecula Local', presentacion_texto: 'Comp 10mg',
        via: 'Oral', dosis_texto: '10 mg', tipo_situacion: 'uso_compasivo', activo_en_catalogo: 'SI'
    }]
};

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route('https://cima.aemps.es/**', async (route) => {
    const url = new URL(route.request().url());
    aempsRequests.push(url);
    const headers = { 'access-control-allow-origin': '*' };
    if (aempsMode === 'invalid') {
        return route.fulfill({ status: 200, contentType: 'application/json', headers, body: '{}' }).catch(() => {});
    }
    const key = url.searchParams.has('nombre') ? 'nombre' : 'practiv1';
    const q = url.searchParams.get(key) || '';
    const rows = aempsMode === 'empty' ? [] : ((AEMPS_ROWS[key] && AEMPS_ROWS[key][q]) || []);
    return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ totalFilas: rows.length, pagina: 1, tamanioPagina: 15, resultados: rows }) }).catch(() => {});
});
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

async function waitCatalogSettled(target) {
    await target.waitForFunction(() => window.FarmaciaCatalog && (window.FarmaciaCatalog.loaded
        || /no disponible|error/i.test((document.querySelector('[data-catalog-status]') || {}).textContent || '')), null, { timeout: 20000 });
}

async function seedCatalog(target) {
    const loaded = await target.evaluate((catalog) => {
        window.XLSX = {
            read: () => ({ Sheets: { CATALOGO_CIMA: { name: 'CIMA' }, CATALOGO_LOCAL_ESPECIAL: { name: 'LOCAL' } } }),
            utils: { sheet_to_json: (sheet) => (sheet.name === 'CIMA' ? catalog.cima : catalog.local) }
        };
        return window.FarmaciaCatalog.loadFromExcel(new ArrayBuffer(0));
    }, CATALOG);
    assert.equal(loaded.loaded, true, 'catálogo sintético cargado con el cargador del producto');
}

async function typeQuery(target, inputId, dropdownId, query) {
    const input = target.locator('#' + inputId);
    await input.click();
    await input.fill('');
    await input.type(query, { delay: 15 });
    const dropdown = target.locator('#' + dropdownId);
    await dropdown.waitFor({ state: 'visible', timeout: 6000 });
    await target.waitForTimeout(700);
    return dropdown;
}

const optionNames = async (dropdown) => (await dropdown.locator('.autocomplete-item .autocomplete-item-name').allTextContents()).map((t) => t.trim());
const noticeText = async (dropdown) => (await dropdown.locator('.autocomplete-notice').allTextContents()).map((t) => t.trim()).join(' ');

async function openManualValidation() {
    await page.goto(base + 'farmacia_validacion.html', { waitUntil: 'load' });
    await waitCatalogSettled(page);
    await page.locator('#fhOrigenEntrada').selectOption('manual_farmacia');
    await page.locator('#fhServicioManual').selectOption('derma');
    await page.locator('#fhPatologiaManual').selectOption({ label: 'Hidradenitis supurativa' });
    await page.locator('#validationBlock').waitFor({ state: 'visible' });
    await page.locator('#fhManualCip').fill(MANUAL_CIP);
    await seedCatalog(page);
}

async function readSnapshot(target, cip) {
    return target.evaluate((wantedCip) => {
        const raw = sessionStorage.getItem('farmacia_drug_snapshot_registry_v2');
        if (!raw) return null;
        const registry = JSON.parse(raw);
        const found = Object.values(registry.snapshots || {}).filter((s) => s && s.context && s.context.cip === wantedCip);
        return found.length ? found[found.length - 1] : null;
    }, cip);
}

try {
    await test('las tres páginas de Farmacia cargan el buscador común (HubTools.cimaSearch con búsqueda de presentaciones)', async () => {
        for (const url of ['farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html?cip=' + CIP]) {
            await page.goto(base + url, { waitUntil: 'load' });
            const ok = await page.evaluate(() => Boolean(window.HubTools && window.HubTools.cimaSearch
                && typeof window.HubTools.cimaSearch.search === 'function'
                && typeof window.HubTools.cimaSearch.searchPresentations === 'function'));
            assert.ok(ok, url + ': HubTools.cimaSearch.search y searchPresentations disponibles');
        }
    });

    await test('Validación: primero la AEMPS (sin duplicados), después los fármacos locales; el catálogo CIMA de Farmacia no sale', async () => {
        aempsMode = 'ok';
        aempsRequests.length = 0;
        await openManualValidation();
        const dropdown = await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', QUERY);
        assert.deepEqual(await optionNames(dropdown), [AEMPS_A.nombre, AEMPS_B.nombre, 'Sintetico Local Especial (DEMO)']);
        assert.equal(await noticeText(dropdown), '', 'con respuesta de la AEMPS no hay aviso');
        const tags = (await dropdown.locator('.autocomplete-item .drug-source-tag').allTextContents()).map((t) => t.trim());
        assert.deepEqual(tags, ['CIMA', 'CIMA', 'LOCAL']);
    });

    await test('a la AEMPS solo va el texto buscado (nombre y principio activo, más el tamaño de página)', async () => {
        const ours = aempsRequests.filter((u) => (u.searchParams.get('nombre') || u.searchParams.get('practiv1')) === QUERY);
        assert.ok(ours.some((u) => u.searchParams.has('nombre')), 'busca por nombre');
        assert.ok(ours.some((u) => u.searchParams.has('practiv1')), 'busca por principio activo');
        for (const u of aempsRequests) {
            const keys = [...u.searchParams.keys()].sort();
            assert.ok(JSON.stringify(keys) === '["nombre","pagesize"]' || JSON.stringify(keys) === '["pagesize","practiv1"]', 'parámetros: ' + keys.join(','));
            assert.ok(!u.search.includes(MANUAL_CIP), 'el CIP no viaja a la AEMPS');
        }
    });

    await test('elegir un fármaco de la AEMPS: nombre comercial, dosis y vía precompletadas y editables; sin principio activo', async () => {
        const dropdown = page.locator('#fhManualAutocompleteDropdown');
        await dropdown.locator('.autocomplete-item', { hasText: AEMPS_A.nombre }).first().click();
        await page.waitForTimeout(300);
        assert.equal(await page.inputValue('#fhManualFarmaco'), AEMPS_A.nombre);
        assert.equal(await page.inputValue('#fhManualDosis'), '40 mg');
        assert.equal(await page.inputValue('#fhManualVia'), 'SC');
        assert.equal(await page.inputValue('#fhManualPrincipioActivo'), '', 'la molécula no se guarda');
        assert.equal(await page.locator('#fhManualDosis').isEditable(), true, 'la dosis sigue editable');
        assert.equal(await page.locator('#fhManualVia').isEnabled(), true, 'la vía sigue editable');
    });

    await test('lo guardado de un fármaco de la AEMPS: origen CIMA, nº de registro, código nacional vacío, sin molécula', async () => {
        const snapshot = await readSnapshot(page, MANUAL_CIP);
        assert.ok(snapshot, 'hay selección guardada para el CIP sintético');
        assert.equal(snapshot.source_type, 'CIMA');
        assert.equal(snapshot.selected_drug_id, 'AEMPS:990001');
        assert.equal(snapshot.nregistro_snapshot, '990001');
        assert.equal(snapshot.codigo_nacional_snapshot, '');
        assert.equal(snapshot.principio_activo_snapshot, '');
        assert.equal(snapshot.nombre_snapshot, AEMPS_A.nombre);
    });

    await test('con varias vías en la AEMPS la vía no se elige (queda vacía); la dosis sí se precompleta', async () => {
        const dropdown = await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', QUERY);
        await dropdown.locator('.autocomplete-item', { hasText: AEMPS_B.nombre }).first().click();
        await page.waitForTimeout(300);
        assert.equal(await page.inputValue('#fhManualFarmaco'), AEMPS_B.nombre);
        assert.equal(await page.inputValue('#fhManualDosis'), '100 mg');
        assert.equal(await page.inputValue('#fhManualVia'), '');
    });

    await test('un fármaco local se sigue eligiendo como hasta ahora (origen LOCAL)', async () => {
        const dropdown = await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', QUERY);
        await dropdown.locator('.autocomplete-item', { hasText: 'Sintetico Local Especial (DEMO)' }).first().click();
        await page.waitForTimeout(300);
        assert.equal(await page.inputValue('#fhManualFarmaco'), 'Sintetico Local Especial (DEMO)');
        assert.equal(await page.inputValue('#fhManualDosis'), '10 mg');
        const snapshot = await readSnapshot(page, MANUAL_CIP);
        assert.equal(snapshot && snapshot.source_type, 'LOCAL');
    });

    await test('respuesta vacía de la AEMPS: solo los locales, sin respaldo del catálogo y sin aviso', async () => {
        aempsMode = 'empty';
        const dropdown = await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', QUERY);
        assert.deepEqual(await optionNames(dropdown), ['Sintetico Local Especial (DEMO)']);
        assert.equal(await noticeText(dropdown), '');
    });

    await test('sin respuesta de la AEMPS: catálogo de Farmacia (CIMA + locales) y aviso en pantalla', async () => {
        aempsMode = 'invalid';
        const dropdown = await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', 'sintetico');
        const names = await optionNames(dropdown);
        assert.ok(names.includes('Producto Sintetico Catalogo'), 'sale el catálogo CIMA de Farmacia: ' + JSON.stringify(names));
        assert.ok(names.includes('Sintetico Local Especial (DEMO)'), 'salen los locales');
        assert.ok(!names.includes(AEMPS_A.nombre), 'nada de la AEMPS');
        assert.equal(await noticeText(dropdown), 'Sin respuesta de la AEMPS: resultados del catálogo de Farmacia.');
        await dropdown.locator('.autocomplete-item', { hasText: 'Producto Sintetico Catalogo' }).first().click();
        await page.waitForTimeout(300);
        assert.equal(await page.inputValue('#fhManualDosis'), '100 mg', 'el respaldo precompleta como hasta ahora');
        assert.equal(await page.inputValue('#fhManualVia'), 'SC');
        aempsMode = 'ok';
    });

    await test('al elegir, el desplegable se cierra y no se vuelve a abrir solo', async () => {
        const dropdown = await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', QUERY);
        await dropdown.locator('.autocomplete-item', { hasText: AEMPS_A.nombre }).first().click();
        await page.waitForTimeout(900);
        assert.equal(await page.locator('#fhManualAutocompleteDropdown').isVisible(), false);
    });

    await test('teclado: flecha abajo + Enter elige el primer resultado de la AEMPS', async () => {
        const input = page.locator('#fhManualFarmaco');
        await typeQuery(page, 'fhManualFarmaco', 'fhManualAutocompleteDropdown', QUERY);
        await input.press('ArrowDown');
        await input.press('Enter');
        await page.waitForTimeout(300);
        assert.equal(await page.inputValue('#fhManualFarmaco'), AEMPS_A.nombre);
    });

    await test('Primera visita: el buscador ofrece la AEMPS y precompleta como hasta ahora', async () => {
        aempsMode = 'ok';
        await page.goto(base + 'farmacia_primera_visita.html', { waitUntil: 'load' });
        await waitCatalogSettled(page);
        const dropdown = await typeQuery(page, 'fhPvFarmaco', 'fhPvAutocompleteDropdown', 'zqsint');
        assert.deepEqual(await optionNames(dropdown), [AEMPS_A.nombre]);
        await dropdown.locator('.autocomplete-item').first().click();
        await page.waitForTimeout(300);
        assert.equal(await page.inputValue('#fhPvFarmaco'), AEMPS_A.nombre);
        assert.notEqual(await page.inputValue('#fhPvDosis'), '', 'la dosis se precompleta');
        assert.equal(await page.inputValue('#fhPvVia'), 'SC');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_buscador_comun_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
