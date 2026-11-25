#!/usr/bin/env node
// Check de navegador — Validación: envase (código nacional) y acceso a BIFIMED
// (issue #954, decisiones de Sil 25-11):
//  - en «Tratamiento validado por Farmacia», al elegir un fármaco de la AEMPS,
//    Nexus pide a CIMA sus envases (`/cima/rest/presentaciones?nregistro=`) y los
//    ofrece en el selector «Envase (código nacional)», sin elegir ninguno salvo
//    que haya UNO solo elegible;
//  - los no comercializados salen marcados y NO se pueden elegir; los que tienen
//    problema de suministro sí, marcados; una fila sin CN no sale;
//  - con envase elegido: enlace a la ficha BIFIMED de ese CN en otra pestaña, y
//    el CN se guarda en la selección (`codigo_nacional_snapshot`);
//  - sin CN inequívoco (sin fármaco, fármaco local, nada comercializado, CIMA
//    no responde, texto escrito a mano): enlace al buscador general de BIFIMED
//    y una ayuda que dice por qué; nunca un CN inventado;
//  - elegir envase o abrir BIFIMED no toca dosis, vía, pauta, presentación ni
//    el estado de la validación.
// La AEMPS y BIFIMED se simulan con context.route: el check nunca sale a internet.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANUAL_CIP = 'CIP-SYN-BIFIMED-01';
const QUERY = 'sintet';
const BIFIMED_GENERAL = 'https://www.sanidad.gob.es/profesionales/medicamentos.do';
const bifimedFicha = (cn) => `https://www.sanidad.gob.es/profesionales/medicamentos.do?cn=${cn}&metodo=verDetalle`;

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
const MED = {
    varios: { nregistro: '990001', nombre: 'SINTETICOMAB 40 MG SOLUCION INYECTABLE EN PLUMA PRECARGADA', dosis: '40 mg', viasAdministracion: [{ id: 58, nombre: 'VÍA SUBCUTÁNEA' }] },
    uno: { nregistro: '990002', nombre: 'SINTETICOMAB 100 MG POLVO PARA SOLUCION PARA PERFUSION', dosis: '100 mg', viasAdministracion: [{ id: 48, nombre: 'VÍA INTRAVENOSA' }] },
    ninguno: { nregistro: '990003', nombre: 'SINTETICOLIZ 10 MG COMPRIMIDOS RECUBIERTOS', dosis: '10 mg', viasAdministracion: [{ id: 25, nombre: 'VÍA ORAL' }] },
    falla: { nregistro: '990004', nombre: 'SINTETICANIB 5 MG CAPSULAS DURAS', dosis: '5 mg', viasAdministracion: [{ id: 25, nombre: 'VÍA ORAL' }] }
};
// El orden de CIMA no decide nada: el no comercializado va primero a propósito.
const PRESENTACIONES = {
    990001: [
        { cn: '700101', nombre: 'SINTETICOMAB 40 MG SOLUCION INYECTABLE EN PLUMA PRECARGADA, 1 pluma', comerc: false, psum: false },
        { cn: '700102', nombre: 'SINTETICOMAB 40 MG SOLUCION INYECTABLE EN PLUMA PRECARGADA, 2 plumas', comerc: true, psum: false },
        { cn: '', nombre: 'SINTETICOMAB 40 MG SOLUCION INYECTABLE EN PLUMA PRECARGADA, envase sin codigo', comerc: true, psum: false },
        { cn: '700103', nombre: 'SINTETICOMAB 40 MG SOLUCION INYECTABLE EN PLUMA PRECARGADA, 4 plumas', comerc: true, psum: true }
    ],
    990002: [
        { cn: '700202', nombre: 'SINTETICOMAB 100 MG POLVO PARA SOLUCION PARA PERFUSION, 2 viales', comerc: false, psum: false },
        { cn: '700201', nombre: 'SINTETICOMAB 100 MG POLVO PARA SOLUCION PARA PERFUSION, 1 vial', comerc: true, psum: false }
    ],
    990003: [
        { cn: '700301', nombre: 'SINTETICOLIZ 10 MG COMPRIMIDOS RECUBIERTOS, 28 comprimidos', comerc: false, psum: false }
    ]
};
const presDelay = {};
const presRequests = [];

// ---- Catálogo sintético de Farmacia (solo para el fármaco local) -----------
const CATALOG = {
    cima: [],
    local: [{
        local_drug_id: 'LOC-SYN-BIF', display_name: 'Sintetico Local Formula Magistral (DEMO)',
        principio_activo_o_molecula: 'Molecula Local', presentacion_texto: 'Suspension 10 mg/ml',
        via: 'Oral', dosis_texto: '10 mg', tipo_situacion: 'formula_magistral', activo_en_catalogo: 'SI'
    }]
};

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route('https://cima.aemps.es/**', async (route) => {
    const url = new URL(route.request().url());
    const headers = { 'access-control-allow-origin': '*' };
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) }).catch(() => {});
    if (url.pathname === '/cima/rest/presentaciones') {
        const nregistro = url.searchParams.get('nregistro') || '';
        presRequests.push(nregistro);
        if (presDelay[nregistro]) await new Promise((resolve) => setTimeout(resolve, presDelay[nregistro]));
        if (nregistro === MED.falla.nregistro) return route.fulfill({ status: 500, headers, body: 'error' }).catch(() => {});
        const rows = (PRESENTACIONES[nregistro] || []).map((row) => Object.assign({ nregistro }, row));
        return json({ totalFilas: rows.length, pagina: 1, tamanioPagina: 200, resultados: rows });
    }
    if (url.pathname === '/cima/rest/medicamentos') {
        const rows = url.searchParams.get('nombre') === QUERY ? Object.values(MED) : [];
        return json({ totalFilas: rows.length, pagina: 1, tamanioPagina: 15, resultados: rows });
    }
    return json({});
});
await context.route('https://www.sanidad.gob.es/**', (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>BIFIMED simulado</title><p>Ficha simulada</p>' }).catch(() => {}));
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

async function choose(inputId, dropdownId, name) {
    const input = page.locator('#' + inputId);
    await input.click();
    await input.fill('');
    await input.type(QUERY, { delay: 15 });
    const dropdown = page.locator('#' + dropdownId);
    await dropdown.waitFor({ state: 'visible', timeout: 6000 });
    const item = dropdown.locator('.autocomplete-item', { hasText: name }).first();
    await item.waitFor({ state: 'visible', timeout: 6000 });
    await item.click();
}
const chooseValidated = (name) => choose('fhValidadoFarmaco', 'autocompleteValidadoDropdown', name);

// Estado visible del envase y del enlace a BIFIMED.
async function envaseState() {
    return page.evaluate(() => {
        const select = document.getElementById('fhValidadoEnvase');
        const link = document.getElementById('fhValidadoBifimed');
        const help = document.getElementById('fhValidadoBifimedAviso');
        return {
            exists: Boolean(select && link && help),
            disabled: select ? select.disabled : null,
            busy: select ? select.getAttribute('aria-busy') === 'true' : null,
            value: select ? select.value : null,
            options: select ? Array.from(select.options).map((o) => ({ value: o.value, text: o.textContent.trim(), disabled: o.disabled })) : [],
            href: link ? link.getAttribute('href') : null,
            target: link ? link.getAttribute('target') : null,
            rel: link ? (link.getAttribute('rel') || '') : null,
            linkText: link ? link.textContent.replace(/\s+/g, ' ').trim() : null,
            help: help ? help.textContent.replace(/\s+/g, ' ').trim() : null
        };
    });
}

async function waitEnvase(predicate, label) {
    const deadline = Date.now() + 8000;
    let state = await envaseState();
    while (Date.now() < deadline) {
        if (state.exists && !state.busy && predicate(state)) return state;
        await page.waitForTimeout(100);
        state = await envaseState();
    }
    throw new Error(`${label}: estado ${JSON.stringify(state)}`);
}

const cnOptions = (state) => state.options.filter((o) => o.value !== '');
const eligible = (state) => cnOptions(state).filter((o) => !o.disabled).map((o) => o.value);

async function readValidatedSnapshot() {
    return page.evaluate((wantedCip) => {
        const raw = sessionStorage.getItem('farmacia_drug_snapshot_registry_v2');
        if (!raw) return null;
        const registry = JSON.parse(raw);
        const found = Object.values(registry.snapshots || {}).filter((s) => s && s.context
            && s.context.cip === wantedCip && s.context.slot === 'validacion.validado');
        return found.length ? found[found.length - 1] : null;
    }, MANUAL_CIP);
}

// Todo lo que el profesional ve escrito en la validación, menos el envase.
async function validationValues() {
    return page.evaluate(() => {
        const out = {};
        document.querySelectorAll('#validationBlock input, #validationBlock select, #validationBlock textarea').forEach((el, index) => {
            if (el.id === 'fhValidadoEnvase') return;
            out[el.id || el.name || ('campo-' + index)] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
        });
        return out;
    });
}

try {
    await openManualValidation();

    await test('sin fármaco: selector de envase desactivado y enlace al buscador general de BIFIMED en otra pestaña', async () => {
        const state = await waitEnvase((s) => s.disabled === true, 'estado inicial');
        assert.equal(state.href, BIFIMED_GENERAL);
        assert.equal(state.target, '_blank');
        assert.ok(/\bnoopener\b/.test(state.rel), 'rel lleva noopener');
        assert.ok(state.linkText.startsWith('Buscar en BIFIMED'), `texto del enlace: ${state.linkText}`);
        assert.ok(/otra pestaña/.test(state.linkText), 'el enlace dice que se abre en otra pestaña (aunque sea solo para lector)');
        assert.ok(state.help.length > 0, 'hay una ayuda que explica por qué no hay ficha directa');
        assert.equal(cnOptions(state).length, 0, 'sin envases');
    });

    await test('fármaco local: no se pregunta a CIMA y queda el buscador general', async () => {
        const before = presRequests.length;
        await chooseValidated('Sintetico Local Formula Magistral');
        await page.waitForTimeout(600);
        const state = await waitEnvase((s) => s.disabled === true, 'fármaco local');
        assert.equal(presRequests.length, before, 'no hay consulta de envases para un fármaco local');
        assert.equal(state.href, BIFIMED_GENERAL);
        assert.equal(cnOptions(state).length, 0);
    });

    await test('fármaco de la AEMPS con varios envases: se piden a CIMA por su nº de registro y no se elige ninguno', async () => {
        await chooseValidated(MED.varios.nombre);
        const state = await waitEnvase((s) => cnOptions(s).length > 0, 'envases de 990001');
        assert.equal(presRequests[presRequests.length - 1], '990001');
        assert.equal(state.disabled, false);
        assert.equal(state.value, '', 'ningún envase elegido de antemano');
        assert.deepEqual(eligible(state).sort(), ['700102', '700103'], 'solo los comercializados se pueden elegir');
        const noComerc = state.options.find((o) => o.value === '700101');
        assert.ok(noComerc, 'el no comercializado sale en la lista');
        assert.equal(noComerc.disabled, true, 'el no comercializado no se puede elegir');
        assert.ok(/no comercializado/.test(noComerc.text), `marca de no comercializado: ${noComerc.text}`);
        const psum = state.options.find((o) => o.value === '700103');
        assert.ok(/problema de suministro/.test(psum.text), `marca de problema de suministro: ${psum.text}`);
        assert.equal(state.options.find((o) => o.value === '700102').text, '2 plumas · CN 700102', 'cada envase muestra lo que lo distingue y su CN, sin repetir el nombre del medicamento');
        assert.equal(state.options.some((o) => /envase sin codigo/.test(o.text)), false, 'una fila sin CN no sale');
        assert.equal(state.href, BIFIMED_GENERAL, 'sin envase elegido no hay ficha directa');
        assert.equal(state.help, 'Elige el envase para ir a su ficha.');
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot && snapshot.codigo_nacional_snapshot, '', 'todavía no hay CN guardado');
    });

    await test('elegir un envase: ficha BIFIMED de ese CN y CN guardado, sin tocar nada más de la validación', async () => {
        const before = await validationValues();
        await page.locator('#fhValidadoEnvase').selectOption('700103');
        const state = await waitEnvase((s) => s.href === bifimedFicha('700103'), 'ficha de 700103');
        assert.ok(state.linkText.startsWith('Consultar financiación en BIFIMED'), `texto del enlace: ${state.linkText}`);
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot.codigo_nacional_snapshot, '700103');
        assert.equal(snapshot.nregistro_snapshot, '990001');
        assert.deepEqual(await validationValues(), before, 'dosis, vía, pauta, presentación y estado siguen igual');
    });

    await test('abrir BIFIMED: otra pestaña con la ficha del mismo CN; la validación no cambia', async () => {
        const before = await validationValues();
        const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 8000 }), page.locator('#fhValidadoBifimed').click()]);
        await popup.waitForLoadState('load');
        assert.equal(popup.url(), bifimedFicha('700103'));
        await popup.close();
        assert.equal(page.url().startsWith(base), true, 'la validación sigue en su pestaña');
        assert.deepEqual(await validationValues(), before);
    });

    await test('volver a «sin envase»: buscador general y CN vacío', async () => {
        await page.locator('#fhValidadoEnvase').selectOption('');
        const state = await waitEnvase((s) => s.href === BIFIMED_GENERAL, 'sin envase');
        assert.equal(state.help, 'Elige el envase para ir a su ficha.');
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot.codigo_nacional_snapshot, '');
    });

    await test('un solo envase comercializado: se usa ese; cambiar de fármaco borra los envases anteriores', async () => {
        await chooseValidated(MED.uno.nombre);
        const state = await waitEnvase((s) => s.value === '700201', 'envase único de 990002');
        assert.equal(state.options.some((o) => /^7001/.test(o.value)), false, 'no quedan envases del fármaco anterior');
        assert.deepEqual(eligible(state), ['700201']);
        assert.equal(state.href, bifimedFicha('700201'));
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot.codigo_nacional_snapshot, '700201');
        assert.equal(snapshot.nregistro_snapshot, '990002');
    });

    await test('ningún envase comercializado: no se puede elegir y queda el buscador general', async () => {
        await chooseValidated(MED.ninguno.nombre);
        const state = await waitEnvase((s) => s.options.some((o) => o.value === '700301'), 'envases de 990003');
        assert.deepEqual(eligible(state), []);
        assert.equal(state.value, '');
        assert.equal(state.href, BIFIMED_GENERAL);
        assert.ok(/comercializado/.test(state.help), `ayuda: ${state.help}`);
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot.codigo_nacional_snapshot, '');
    });

    await test('CIMA no responde a los envases: buscador general, aviso y nada de la validación cambia', async () => {
        await chooseValidated(MED.falla.nombre);
        await page.waitForTimeout(300);
        const before = await validationValues();
        const state = await waitEnvase((s) => /CIMA/.test(s.help), 'fallo de CIMA');
        assert.equal(state.href, BIFIMED_GENERAL);
        assert.deepEqual(eligible(state), []);
        assert.equal(state.value, '');
        assert.deepEqual(await validationValues(), before);
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot.codigo_nacional_snapshot, '');
        assert.equal(snapshot.nregistro_snapshot, '990004');
    });

    await test('respuesta tardía de un fármaco anterior: no pisa los envases del fármaco elegido después', async () => {
        presDelay['990001'] = 1500;
        await chooseValidated(MED.varios.nombre);
        await chooseValidated(MED.uno.nombre);
        await page.waitForTimeout(2200);
        delete presDelay['990001'];
        const state = await waitEnvase((s) => s.value === '700201', 'tras la respuesta tardía');
        assert.equal(state.options.some((o) => /^7001/.test(o.value)), false, 'no salen los envases del fármaco anterior');
        assert.equal(state.href, bifimedFicha('700201'));
        const snapshot = await readValidatedSnapshot();
        assert.equal(snapshot.codigo_nacional_snapshot, '700201');
    });

    await test('escribir a mano otro fármaco: el envase se vacía y vuelve el buscador general', async () => {
        await page.locator('#fhValidadoFarmaco').fill('Texto libre sin catalogo');
        await page.keyboard.press('Escape');
        const state = await waitEnvase((s) => s.disabled === true, 'texto libre');
        assert.equal(cnOptions(state).length, 0);
        assert.equal(state.href, BIFIMED_GENERAL);
    });

    await test('«Validar tratamiento solicitado sin cambios» con un fármaco de la AEMPS: se piden sus envases', async () => {
        await choose('fhManualFarmaco', 'fhManualAutocompleteDropdown', MED.varios.nombre);
        await page.waitForTimeout(300);
        await page.locator('#btnValidateRequestedSame').click();
        const state = await waitEnvase((s) => eligible(s).length === 2, 'envases tras validar el solicitado');
        assert.equal(presRequests[presRequests.length - 1], '990001');
        assert.equal(state.value, '');
        assert.equal(state.href, BIFIMED_GENERAL);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_validacion_bifimed_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
