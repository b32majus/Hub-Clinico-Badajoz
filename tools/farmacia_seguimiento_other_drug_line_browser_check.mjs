#!/usr/bin/env node
// Check de navegador EA v1 demo (#871, A3): un «otro fármaco» ACTIVO de la
// visita (Concomitante o Tratamiento activo previo / línea existente) tiene la
// misma entidad que el primero: es una línea de la visita.
//  - Aparece en «Líneas de tratamiento del paciente» (marcar dispensado, editar).
//  - Es sospechoso como `line:<id>` (no `other:<uid>`).
//  - Viaja en «Copiar filas Excel FH» como `followup_line` adicional y NO se
//    duplica en `related_treatments_json`.
//  - Histórico y Exposición (no activos) siguen en `related_treatments_json`.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIP = 'CIP-DEMO-FH-002';
const ACT_ID = 'ACT-DEMO-FH-002';
const LINE1 = ACT_ID + '-LIN-0001';
const LINE2 = ACT_ID + '-LIN-0002';

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
// Buscador común (tramo 3): la AEMPS «no responde» → respaldo del catálogo de Farmacia; el check nunca sale a internet.
await context.route('https://cima.aemps.es/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



const cards = () => page.locator('#fhSegLineCards .seg-line-card');
const otherCards = () => page.locator('#segOtrosFarmacosList .other-drug-card');
let mainDrug = '';

async function addOtherDrug(type, name) {
    await page.click('#btnSegAddOtherDrug');
    const card = otherCards().last();
    if (type) await card.locator('select').first().selectOption(type);
    await card.locator('input[data-field="farmaco"]').fill(name);
    await page.waitForTimeout(150);
}

async function copyAndRead() {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.locator('#fhSegExportBridgeRawBtn').click({ timeout: 5000 });
    await page.waitForFunction(() => /Preparado para transferencia manual/.test((document.getElementById('fhSegExportBridgeRawStatus') || {}).textContent || ''), null, { timeout: 5000 });
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    const header = await page.evaluate(() => window.FarmaciaBridgeRawEaV21Core.ROW_COLUMNS.slice());
    const rows = tsv.split('\n').filter((line) => line !== '').map((line) => {
        const cells = line.split('\t');
        const decode = (cell) => { if (cell === '') return null; if (cell === 'TRUE') return true; if (cell === 'FALSE') return false; try { return JSON.parse(cell); } catch { return cell; } };
        return Object.fromEntries(header.map((name, index) => [name, decode(cells[index])]));
    });
    return { tsv, rows, lines: rows.filter((row) => row.row_role === 'followup_line'), act: rows.find((row) => row.row_role === 'followup_act') };
}
const relatedOf = (out) => {
    let value = out.act.related_treatments_json;
    for (let i = 0; i < 3 && typeof value === 'string'; i += 1) { try { value = JSON.parse(value); } catch { break; } }
    return Array.isArray(value) ? value : [];
};

try {
    await test('preparación: primer fármaco de la visita (A1) como LIN-0001', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        await page.fill('#fhSegDrugSearch', 'secukinumab');
        await page.locator('#fhSegDrugSearch').dispatchEvent('input');
        const item = page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first();
        await item.waitFor({ state: 'visible', timeout: 5000 });
        await item.click();
        await page.waitForTimeout(200);
        mainDrug = await page.inputValue('#fhSegFarmaco');
        assert.equal(await cards().count(), 1);
        assert.equal(await cards().first().getAttribute('data-line-id'), LINE1);
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
    });

    await test('un «otro fármaco» Concomitante aparece como línea de la visita, seleccionada, con la misma entidad que el primero', async () => {
        await addOtherDrug('Concomitante', 'Metotrexato sintético');
        assert.equal(await cards().count(), 2, 'dos tarjetas de línea');
        const second = cards().nth(1);
        assert.equal(await second.getAttribute('data-line-id'), LINE2);
        const text = await second.innerText();
        assert.ok(text.includes('Metotrexato sintético'), 'nombra el fármaco');
        assert.ok(/Registrada en esta visita/i.test(text), 'registrada en esta visita');
        assert.ok(!/validad|alta/i.test(text), 'nunca alta ni validación');
        assert.ok(await second.locator('input[type="checkbox"]').isChecked(), 'seleccionada en la visita');
        assert.equal(await cards().first().getAttribute('data-line-id'), LINE1, 'la primera no cambia');
    });

    await test('se puede editar esa línea y marcarla como dispensada en la visita', async () => {
        await page.selectOption('#fhSegLineaPrincipal', LINE2);
        assert.ok(await page.locator('#fhSegDispensado').isEnabled(), 'control de dispensación activo');
        await page.selectOption('#fhSegDispensado', 'si');
        const visit = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit());
        assert.ok(visit.dispensed_line_ids.includes(LINE2), 'dispensada en esta visita');
        assert.ok(!visit.dispensed_line_ids.includes(LINE1), 'la primera no');
    });

    await test('como sospechoso del EA es la línea (`line:`), no `other:`', async () => {
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Mareo sintético');
        assert.equal(await card.locator('.ea-suspect-list input[value^="other:"]').count(), 0, 'sin candidato other: para un fármaco activo');
        const box = card.locator(`.ea-suspect-list input[type="checkbox"][value="line:${LINE2}"]`);
        assert.equal(await box.count(), 1, 'candidato line:<id>');
        await box.check();
        await page.waitForTimeout(150);
    });

    await test('«Copiar filas Excel FH»: dos followup_line (LIN-0001 principal, LIN-0002 adicional dispensada), sospecha sobre LIN-0002 y sin duplicar en related_treatments_json', async () => {
        const out = await copyAndRead();
        assert.equal(out.lines.length, 2, 'dos filas de línea');
        const byId = Object.fromEntries(out.lines.map((row) => [row.line_id, row]));
        assert.ok(byId[LINE1] && byId[LINE2]);
        assert.equal(byId[LINE1].is_primary_line, true);
        assert.equal(byId[LINE1].line_role, 'principal');
        assert.equal(byId[LINE2].is_primary_line, false);
        assert.equal(byId[LINE2].line_role, 'additional');
        assert.equal(byId[LINE2].line_status_at_event, 'active');
        assert.equal(byId[LINE2].active_at_event, true);
        assert.equal(byId[LINE2].line_drug_name, 'Metotrexato sintético');
        assert.equal(byId[LINE2].treatment_id, ACT_ID + '-TRT-0002');
        assert.equal(byId[LINE2].dispensation_status, 'dispensed');
        assert.notEqual(byId[LINE1].dispensation_status, 'dispensed', 'la primera no se marcó');
        ['line_schedule_code', 'line_schedule_label', 'line_schedule_other_text'].forEach((field) => assert.equal(byId[LINE2][field], null, field + ' no se infiere'));
        const suspicions = out.rows.filter((row) => row.row_role === 'ea_suspicion');
        assert.equal(suspicions.length, 1);
        assert.equal(suspicions[0].ea_medication_ref, 'line:' + LINE2);
        assert.equal(relatedOf(out).length, 0, 'un fármaco activo viaja como línea, no como tratamiento relacionado');
    });

    await test('Histórico y Exposición (no activos) no son líneas: siguen en related_treatments_json y como `other:`', async () => {
        await addOtherDrug('Biológico previo/histórico', 'Adalimumab histórico sintético');
        assert.equal(await cards().count(), 2, 'no añade tarjeta de línea');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        assert.equal(await card.locator('.ea-suspect-list input[value^="other:"]').count(), 1, 'candidato other: para el histórico');
        const out = await copyAndRead();
        assert.equal(out.lines.length, 2);
        const related = relatedOf(out);
        assert.equal(related.length, 1);
        assert.ok(JSON.stringify(related).includes('Adalimumab histórico sintético'));
        assert.ok(!JSON.stringify(related).includes('Metotrexato'), 'el activo no se duplica');
    });

    await test('cambiar de tipo un fármaco que es sospechoso se bloquea; sin sospecha, deja de ser línea (con aviso al perder la dispensación)', async () => {
        const first = otherCards().first();
        await first.locator('select').first().selectOption('Exposición');
        await page.waitForTimeout(150);
        assert.equal(await cards().count(), 2, 'bloqueado: sigue siendo línea');
        assert.equal(await otherCards().first().locator('select').first().inputValue(), 'Concomitante', 'el tipo vuelve a Concomitante');
        // La identidad del fármaco tampoco se puede cambiar detrás de una sospecha.
        await otherCards().first().locator('input[data-field="farmaco"]').fill('Otro nombre distinto');
        await page.waitForTimeout(150);
        assert.equal(await otherCards().first().locator('input[data-field="farmaco"]').inputValue(), 'Metotrexato sintético', 'el nombre vuelve al original');
        await page.locator('#fhSegEaList .ea-t01-card').last().locator(`.ea-suspect-list input[value="line:${LINE2}"]`).uncheck();
        await page.waitForTimeout(150);
        await otherCards().first().locator('select').first().selectOption('Exposición');
        await page.waitForTimeout(200);
        assert.equal(await cards().count(), 1, 'ya no es línea');
        const visit = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit());
        assert.ok(!visit.selected_line_ids.includes(LINE2) && !visit.dispensed_line_ids.includes(LINE2));
        const out = await copyAndRead();
        assert.equal(out.lines.length, 1);
        assert.equal(relatedOf(out).length, 2, 'pasa a tratamientos relacionados con el histórico');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_seguimiento_other_drug_line_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
