#!/usr/bin/env node
// Check de navegador — línea de tratamiento de Reuma con pauta (issue #919,
// tramo 2 del buscador común). Decisión de Sil (12-11): la línea es igual en
// Reuma y Farmacia: fármaco (presentación AEMPS) + dosis (texto libre) + pauta
// del catálogo común `scripts/farmacia_pautas_catalog.js` («Otra pauta» abre
// un texto libre). Sin unidad y sin vía (la presentación ya la fija; no se
// deduce). Alcance: plan actual (primera visita) y cambio de tratamiento
// (seguimiento), 3 huecos por categoría; previos sin cambios.
// Export: 36 columnas al final (…_Pauta_N con el código, …_Pauta_Otro_N con el
// texto), fila de 497 → 533. Ausente = vacío (no consta); nada se infiere.
// La AEMPS se simula con page.route. Solo datos sintéticos.

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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuma-pauta-'));
const workbookPath = path.join(tempDir, 'reuma_pauta_synthetic.xlsx');
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

// ---- Contrato esperado ------------------------------------------------------
const GROUPS = ['Trat_Sistemico', 'Trat_FAME', 'Trat_Biologico', 'Cambio_Sistemico', 'Cambio_FAME', 'Cambio_Biologico'];
const EXPECTED_PAUTA_HEADERS = [];
for (const group of GROUPS) {
    for (const slot of [1, 2, 3]) {
        EXPECTED_PAUTA_HEADERS.push(`${group}_Pauta_${slot}`, `${group}_Pauta_Otro_${slot}`);
    }
}
const EXPECTED_COLUMNS = 533;

// ---- AEMPS simulada (una presentación sintética por consulta) ------------------
const AEMPS = {
    humira: 'HUMIRA 40 MG SINTETICO',
    metotrexato: 'METOTREXATO 25 MG SINTETICO',
    prednisona: 'PREDNISONA 5 MG SINTETICO',
    leflunomida: 'LEFLUNOMIDA 20 MG SINTETICO',
};
function aempsBody(url) {
    const q = String(url.searchParams.get('nombre') || url.searchParams.get('practiv1') || '').toLowerCase();
    const name = AEMPS[q];
    const rows = name ? [{ nregistro: '9' + Object.keys(AEMPS).indexOf(q) + '000', nombre: name }] : [];
    return JSON.stringify({ totalFilas: rows.length, pagina: 1, tamanioPagina: 25, resultados: rows });
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route('https://cima.aemps.es/**', async (route) => {
    const url = new URL(route.request().url());
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

// Abre las secciones plegables que contienen `selector` con clics reales.
async function reveal(selector) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const hit = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            el.scrollIntoView({ block: 'center' });
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return !!top && (top === el || el.contains(top));
        }, selector);
        if (hit) return;
        const headers = page.locator(selector).first().locator(
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
    throw new Error('no visible: ' + selector);
}

// Elige en el buscador del ámbito `scope` (selector CSS de la línea) el
// resultado que contiene `expect`.
async function pickDrug(scope, query, expect) {
    const inputSel = `${scope} .drug-autocomplete__input`;
    await reveal(inputSel);
    const input = page.locator(inputSel).first();
    await input.click();
    await input.fill('');
    await input.fill(query);
    const items = page.locator(`${scope} .drug-autocomplete__item:not(.drug-autocomplete__item--clear)`);
    await items.first().waitFor({ state: 'visible', timeout: 8000 });
    const texts = (await items.allTextContents()).map((t) => t.trim());
    const pick = texts.findIndex((t) => t.includes(expect));
    assert.ok(pick >= 0, `sin resultado ${expect}: ${JSON.stringify(texts)}`);
    await items.nth(pick).click();
    await page.waitForTimeout(150);
}

async function pautaState(id) {
    return page.evaluate((pautaId) => {
        const select = document.getElementById(pautaId);
        const otro = document.getElementById(pautaId + 'Otro');
        if (!select) return null;
        const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.hidden;
        return {
            tag: select.tagName,
            cls: select.classList.contains('treatment-pauta-select'),
            value: select.value,
            disabled: select.disabled,
            options: Array.from(select.options).map((o) => [o.value, o.textContent.trim()]),
            otroExists: !!otro,
            otroCls: !!otro && otro.classList.contains('treatment-pauta-otro'),
            otroVisible: visible(otro),
            otroValue: otro ? otro.value : null,
        };
    }, id);
}

function catalogOptions() {
    return page.evaluate(() => (window.FarmaciaPautasCatalog && typeof window.FarmaciaPautasCatalog.getPautaOptions === 'function')
        ? window.FarmaciaPautasCatalog.getPautaOptions().map((o) => [o.value, o.label]) : null);
}

async function headerIndex(name) {
    return page.evaluate((header) => {
        const list = HubTools.export.FINAL_V2_EXPORT_HEADERS;
        const i = list.indexOf(header);
        return i < 0 ? -1 : 220 + i;
    }, name);
}

async function exportRow(pathology, tipoVisita, collector) {
    return page.evaluate(({ pathology, tipoVisita, collector }) => {
        const datos = HubTools.form[collector]();
        const result = HubTools.reumaExportBoundary.generateLegacyRow497({ datos, pathology, tipoVisita });
        return { datos, ok: !!(result && result.ok), code: result && result.code, fields: result && result.ok ? result.row.split('\t') : [] };
    }, { pathology, tipoVisita, collector });
}

try {
    // ======================= PRIMERA VISITA (plan actual) =======================
    await page.goto(base + 'primera_visita.html', { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.HubTools && HubTools.cimaSearch && HubTools.form), null, { timeout: 30000 });
    await page.waitForSelector('.drug-autocomplete:has(#sistemicoSelect) .drug-autocomplete__input', { state: 'attached', timeout: 15000 });
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await page.waitForTimeout(300);

    await test('PV: el catálogo común de pautas (FarmaciaPautasCatalog) está cargado', async () => {
        const options = await catalogOptions();
        assert.ok(Array.isArray(options) && options.length >= 5, JSON.stringify(options));
        assert.ok(options.some(([value]) => value === 'OTRO'), 'falta OTRO');
    });

    await test('PV: cada línea principal del plan tiene un selector de pauta con las opciones del catálogo y una opción vacía', async () => {
        const options = await catalogOptions();
        for (const id of ['sistemicoPauta', 'famePauta', 'biologicoPauta']) {
            const state = await pautaState(id);
            assert.ok(state, `falta #${id}`);
            assert.equal(state.tag, 'SELECT', id);
            assert.equal(state.cls, true, `${id} sin clase treatment-pauta-select`);
            assert.equal(state.options[0][0], '', `${id}: la primera opción debe ser vacía (no consta)`);
            assert.deepEqual(state.options.slice(1), options, `${id}: opciones distintas del catálogo`);
            assert.equal(state.otroExists, true, `falta #${id}Otro`);
            assert.equal(state.otroCls, true, `#${id}Otro sin clase treatment-pauta-otro`);
        }
    });

    await test('PV: sin fármaco, pauta deshabilitada y vacía; «Otra pauta» oculta', async () => {
        const state = await pautaState('sistemicoPauta');
        assert.equal(state.disabled, true);
        assert.equal(state.value, '');
        assert.equal(state.otroVisible, false);
    });

    await test('PV: el campo de dosis se llama «Dosis» (la frecuencia es la pauta)', async () => {
        for (const id of ['sistemicoDose', 'fameDose', 'biologicoDose']) {
            assert.equal(await page.locator('#' + id).getAttribute('placeholder'), 'Dosis', id);
        }
    });

    await test('PV: los tratamientos previos NO llevan pauta', async () => {
        const n = await page.evaluate(() => ['previoSistemicoPauta', 'previoFamePauta', 'previoBiologicoPauta'].filter((id) => document.getElementById(id)).length);
        assert.equal(n, 0);
        const inPrevios = await page.evaluate(() => {
            const sel = document.getElementById('previoSistemicoSelect');
            const line = sel ? sel.closest('.treatment-line, .treatment-line-improved') : null;
            return line ? line.querySelectorAll('.treatment-pauta-select').length : -1;
        });
        assert.equal(inPrevios, 0);
    });

    await test('PV: elegir fármaco habilita la pauta sin rellenarla (nada se infiere)', async () => {
        await pickDrug('.drug-autocomplete:has(#biologicoSelect)', 'humira', 'HUMIRA');
        const state = await pautaState('biologicoPauta');
        assert.equal(state.disabled, false);
        assert.equal(state.value, '');
        assert.equal(await page.locator('#biologicoDose').inputValue(), '');
    });

    await test('PV: «Otra pauta» muestra el texto libre; volver a una pauta del catálogo lo oculta y lo vacía', async () => {
        await page.selectOption('#biologicoPauta', 'OTRO');
        let state = await pautaState('biologicoPauta');
        assert.equal(state.otroVisible, true, 'el texto libre no se ve con OTRO');
        await page.fill('#biologicoPautaOtro', 'pauta sintetica libre');
        await page.selectOption('#biologicoPauta', 'SEMANAL');
        state = await pautaState('biologicoPauta');
        assert.equal(state.otroVisible, false);
        assert.equal(state.otroValue, '');
    });

    await test('PV: quitar el fármaco (No) vacía y deshabilita dosis y pauta', async () => {
        await pickDrug('.drug-autocomplete:has(#fameSelect)', 'leflunomida', 'LEFLUNOMIDA');
        await page.selectOption('#famePauta', 'DIARIA');
        await page.evaluate(() => {
            const select = document.getElementById('fameSelect');
            select.value = 'No';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(150);
        const state = await pautaState('famePauta');
        assert.equal(state.value, '');
        assert.equal(state.disabled, true);
    });

    await test('PV: una línea añadida con «+» en el plan lleva su propia pauta y su «Otra pauta»', async () => {
        await reveal('.add-treatment-line-btn[data-type="plan-biologico"]');
        await page.click('.add-treatment-line-btn[data-type="plan-biologico"]');
        await page.waitForTimeout(250);
        const extra = await page.evaluate(() => {
            const line = document.querySelector('#planBiologicosExtras .treatment-extra');
            if (!line) return null;
            const pauta = line.querySelector('select.treatment-pauta-select');
            const otro = line.querySelector('input.treatment-pauta-otro');
            const dose = line.querySelector('.treatment-dose-input, .treatment-dose-input-improved');
            return {
                pauta: !!pauta, options: pauta ? pauta.options.length : 0, disabled: pauta ? pauta.disabled : null,
                otro: !!otro, dosePlaceholder: dose ? dose.placeholder : null,
            };
        });
        const options = await catalogOptions();
        assert.ok(extra, 'no se creó la línea extra');
        assert.equal(extra.pauta, true, 'sin selector de pauta');
        assert.equal(extra.options, options.length + 1);
        assert.equal(extra.disabled, true, 'pauta habilitada sin fármaco');
        assert.equal(extra.otro, true, 'sin texto «Otra pauta»');
        assert.equal(extra.dosePlaceholder, 'Dosis');
    });

    await test('PV: una línea añadida con «+» en previos NO lleva pauta', async () => {
        await reveal('.add-treatment-line-btn[data-type="biologico"]');
        await page.click('.add-treatment-line-btn[data-type="biologico"]');
        await page.waitForTimeout(250);
        const n = await page.evaluate(() => {
            const line = document.querySelector('#biologicosExtras .treatment-extra');
            return line ? line.querySelectorAll('.treatment-pauta-select, .treatment-pauta-otro').length : -1;
        });
        assert.equal(n, 0);
    });

    await test('PV: la recogida guarda fármaco, dosis, pauta y pautaOtro por línea (también en la línea añadida)', async () => {
        // Hueco 1: HUMIRA, dosis escrita, pauta del catálogo.
        await page.fill('#biologicoDose', '40 mg');
        await page.selectOption('#biologicoPauta', 'CADA_2_SEMANAS');
        // Hueco 2 (línea añadida): otra presentación con «Otra pauta».
        await pickDrug('#planBiologicosExtras .treatment-extra', 'metotrexato', 'METOTREXATO');
        const line = '#planBiologicosExtras .treatment-extra';
        await page.fill(`${line} .treatment-dose-input, ${line} .treatment-dose-input-improved`, '15 mg');
        await page.selectOption(`${line} select.treatment-pauta-select`, 'OTRO');
        await page.fill(`${line} input.treatment-pauta-otro`, 'texto sintetico de pauta');
        // Sistémico con fármaco y sin pauta: pauta vacía (no consta).
        await pickDrug('.drug-autocomplete:has(#sistemicoSelect)', 'prednisona', 'PREDNISONA');

        const datos = await page.evaluate(() => HubTools.form.recopilarDatosFormulario());
        assert.deepEqual(datos.planBiologicosEntries, [
            { farmaco: 'HUMIRA 40 MG SINTETICO', dosis: '40 mg', pauta: 'CADA_2_SEMANAS', pautaOtro: '' },
            { farmaco: 'METOTREXATO 25 MG SINTETICO', dosis: '15 mg', pauta: 'OTRO', pautaOtro: 'texto sintetico de pauta' },
        ]);
        assert.deepEqual(datos.planSistemicosEntries, [
            { farmaco: 'PREDNISONA 5 MG SINTETICO', dosis: '', pauta: '', pautaOtro: '' },
        ]);
        assert.deepEqual(datos.planFamesEntries, []);
    });

    await test('export: 533 columnas y las 36 cabeceras de pauta al final, en orden', async () => {
        const meta = await page.evaluate(() => ({
            count: HubTools.export.FINAL_V2_EXPORT_COLUMN_COUNT,
            tail: HubTools.export.FINAL_V2_EXPORT_HEADERS.slice(-36),
            total: 220 + HubTools.export.FINAL_V2_EXPORT_HEADERS.length,
        }));
        assert.equal(meta.count, EXPECTED_COLUMNS);
        assert.equal(meta.total, EXPECTED_COLUMNS);
        assert.deepEqual(meta.tail, EXPECTED_PAUTA_HEADERS);
    });

    await test('export: sin columnas nuevas de vía ni de unidad', async () => {
        const offending = await page.evaluate(() => HubTools.export.FINAL_V2_EXPORT_HEADERS.slice(-36)
            .filter((h) => /via|unidad/i.test(h)));
        assert.deepEqual(offending, []);
    });

    await test('export PV: la fila (533) lleva el código de pauta y el texto de «Otra pauta» en su hueco; lo demás vacío', async () => {
        const out = await exportRow('espa', 'primera', 'recopilarDatosFormulario');
        assert.equal(out.ok, true, 'frontera: ' + out.code);
        assert.equal(out.fields.length, EXPECTED_COLUMNS);
        const expect = {
            Trat_Biologico_Pauta_1: 'CADA_2_SEMANAS', Trat_Biologico_Pauta_Otro_1: '',
            Trat_Biologico_Pauta_2: 'OTRO', Trat_Biologico_Pauta_Otro_2: 'texto sintetico de pauta',
            Trat_Biologico_Pauta_3: '', Trat_Sistemico_Pauta_1: '', Trat_Sistemico_Pauta_Otro_1: '',
            Trat_FAME_Pauta_1: '', Cambio_Biologico_Pauta_1: '', Cambio_Sistemico_Pauta_Otro_3: '',
        };
        for (const [header, value] of Object.entries(expect)) {
            const i = await headerIndex(header);
            assert.ok(i >= 0, 'falta cabecera ' + header);
            assert.equal(out.fields[i], value, header);
        }
        // Las dosis siguen en sus columnas de siempre.
        assert.equal(out.fields[await headerIndex('Trat_Biologico_Dosis_2')], '15 mg');
    });

    // ===================== SEGUIMIENTO (cambio de tratamiento) ====================
    await page.goto(base + 'seguimiento.html', { waitUntil: 'load' });
    await page.waitForFunction(() => !!(window.HubTools && HubTools.cimaSearch && HubTools.form), null, { timeout: 30000 });
    await page.waitForSelector('.drug-autocomplete:has(#cambioSistemicoSelect) .drug-autocomplete__input', { state: 'attached', timeout: 15000 });
    await page.selectOption('#diagnosticoPrimario', 'espa');
    await reveal('#btnCambiarTratamiento');
    await page.click('#btnCambiarTratamiento');
    await page.waitForTimeout(300);

    await test('SEG: cada línea principal del cambio tiene selector de pauta del catálogo y «Otra pauta»', async () => {
        const options = await catalogOptions();
        assert.ok(Array.isArray(options), 'catálogo de pautas no cargado en seguimiento');
        for (const id of ['cambioSistemicoPauta', 'cambioFamePauta', 'cambioBiologicoPauta']) {
            const state = await pautaState(id);
            assert.ok(state, `falta #${id}`);
            assert.equal(state.cls, true, id);
            assert.equal(state.options[0][0], '', id);
            assert.deepEqual(state.options.slice(1), options, id);
            assert.equal(state.otroCls, true, `#${id}Otro`);
            assert.equal(state.disabled, true, `${id} habilitada sin fármaco`);
        }
        for (const id of ['cambioSistemicoDose', 'cambioFameDose', 'cambioBiologicoDose']) {
            assert.equal(await page.locator('#' + id).getAttribute('placeholder'), 'Dosis', id);
        }
    });

    await test('SEG: la recogida y la fila (533) llevan la pauta del cambio en las columnas Cambio_*', async () => {
        await pickDrug('.drug-autocomplete:has(#cambioFameSelect)', 'metotrexato', 'METOTREXATO');
        await page.fill('#cambioFameDose', '20 mg');
        await page.selectOption('#cambioFamePauta', 'SEMANAL');
        await reveal('.add-treatment-line-btn[data-type="cambio-fame"]');
        await page.click('.add-treatment-line-btn[data-type="cambio-fame"]');
        await page.waitForTimeout(250);
        const line = '#cambioFamesExtras .treatment-extra';
        await pickDrug(line, 'leflunomida', 'LEFLUNOMIDA');
        await page.selectOption(`${line} select.treatment-pauta-select`, 'OTRO');
        await page.fill(`${line} input.treatment-pauta-otro`, 'otra pauta sintetica');

        const datos = await page.evaluate(() => HubTools.form.recopilarDatosFormularioSeguimiento());
        assert.deepEqual(datos.cambioFamesEntries, [
            { farmaco: 'METOTREXATO 25 MG SINTETICO', dosis: '20 mg', pauta: 'SEMANAL', pautaOtro: '' },
            { farmaco: 'LEFLUNOMIDA 20 MG SINTETICO', dosis: '', pauta: 'OTRO', pautaOtro: 'otra pauta sintetica' },
        ]);

        const out = await exportRow('espa', 'seguimiento', 'recopilarDatosFormularioSeguimiento');
        assert.equal(out.ok, true, 'frontera: ' + out.code);
        assert.equal(out.fields.length, EXPECTED_COLUMNS);
        const expect = {
            Cambio_FAME_Pauta_1: 'SEMANAL', Cambio_FAME_Pauta_Otro_1: '',
            Cambio_FAME_Pauta_2: 'OTRO', Cambio_FAME_Pauta_Otro_2: 'otra pauta sintetica',
            Cambio_FAME_Pauta_3: '', Cambio_Sistemico_Pauta_1: '', Trat_FAME_Pauta_1: '',
        };
        for (const [header, value] of Object.entries(expect)) {
            assert.equal(out.fields[await headerIndex(header)], value, header);
        }
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(`reuma_treatment_pauta_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
