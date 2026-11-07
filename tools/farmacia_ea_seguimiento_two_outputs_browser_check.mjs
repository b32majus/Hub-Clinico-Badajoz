#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo E3: Seguimiento ofrece SOLO dos
// salidas (decisión de Sil, 31-10-2026): «Copiar texto JARA» y «Copiar filas
// Excel FH», que es la copia 166 con la visita completa. CSV, Excel WO8 y
// «datos estructurados (demo)» desaparecen de Seguimiento (Validación y
// Primera Visita no se tocan). La copia 166 no exige línea dispensada: viajan
// todas las líneas revisadas, cada una con su dispensación.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, createReadStream, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { P1 } = mixed;
const REMOVED = ['fhSegExportCsv', 'fhSegExcelExportBtn', 'fhSegExportV2Btn', 'fhSegExportV2Status', 'fhSegDispenseExportNotice'];

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_e3_loader.cjs'))('playwright');
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

const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-e3-'));
const xlsxPath = path.join(workDir, 'mixto_sintetico.xlsx');
writeFileSync(xlsxPath, mixed.workbookBuffer());

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
const dialogs = [];
let dismissNextDialog = false;
page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    if (dismissNextDialog) { dismissNextDialog = false; dialog.dismiss(); } else { dialog.accept(); }
});
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

const copyButton = () => page.locator('#fhSegExportBridgeRawBtn');
const VISIT_FIELDS = ['stratification_review_status', 'previous_stratification_level', 'new_stratification_level',
    'stratification_change_reason', 'followup_proms_collection_status', 'visit_general_observations',
    'proms_json', 'related_treatments_json'];
const LINE_CONTENT_FIELDS = ['dispensation_status', 'dispensation_observations', 'specific_review_status',
    'specific_review_reason', 'therapeutic_movement_type', 'new_dose_text', 'new_schedule_code', 'new_schedule_label',
    'new_schedule_other_text', 'new_route', 'movement_reason', 'movement_effective_date', 'suspension_status',
    'suspension_reason', 'suspension_effective_date', 'line_observations', 'adherence_collection_status',
    'adherence_instrument', 'adherence_result', 'adherence_answers_json'];

async function openSeguimientoForP1() {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'load' });
    await page.setInputFiles('#inputExcelFarmacia', xlsxPath);
    await page.waitForFunction(() => {
        const runtime = window.FarmaciaPatientFlowRuntime;
        const port = runtime && runtime.getDataPort && runtime.getDataPort();
        return !!(port && typeof port.listPatients === 'function' && port.listPatients().length > 0);
    }, null, { timeout: 10000 });
    await page.fill('#fhCipInput', P1.cip);
    await page.click('#fhSearchBtn');
    const action = page.locator(`a.btn-primary[href*="cip=${P1.cip}"]`, { hasText: 'Seguimiento' }).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click();
    await page.waitForURL(/farmacia_seguimiento\.html/, { timeout: 10000 });
    await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, P1.cip, { timeout: 10000 });
    await page.fill('#fhSegFecha', '2026-10-31');
    await page.locator('#fhSegFecha').dispatchEvent('change');
    await page.waitForTimeout(200);
}

async function copyAndRead() {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await copyButton().click({ timeout: 5000 });
    await page.waitForFunction(() => /Preparado para transferencia manual/.test((document.getElementById('fhSegExportBridgeRawStatus') || {}).textContent || ''), null, { timeout: 5000 });
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    const header = await page.evaluate(() => window.FarmaciaBridgeRawEaV21Core.ROW_COLUMNS.slice());
    const rows = tsv.split('\n').filter((line) => line !== '').map((line) => {
        const cells = line.split('\t');
        assert.equal(cells.length, header.length, `cada fila copiada tiene ${header.length} celdas`);
        const decode = (cell) => { if (cell === '') return null; try { return JSON.parse(cell); } catch { return cell; } };
        return Object.fromEntries(header.map((name, index) => [name, decode(cells[index])]));
    });
    const act = rows.filter((row) => row.row_role === 'followup_act');
    assert.equal(act.length, 1, 'una sola fila de acto');
    const line = rows.filter((row) => row.row_role === 'followup_line' && row.line_id === P1.line);
    assert.equal(line.length, 1, 'la línea revisada viaja una vez');
    return { tsv, rows, act: act[0], line: line[0] };
}

const lineCard = () => page.locator(`input[name="fhSegLineCardSelection"][value="${P1.line}"]`);
const pick = async (id, value) => { await page.selectOption('#' + id, value); };

try {
    await test('la sección Exportación tiene exactamente dos botones: JARA y Filas Excel FH', async () => {
        await openSeguimientoForP1();
        const buttons = await page.locator('#modExportacion button').evaluateAll((nodes) => nodes.map((node) => ({ id: node.id, text: node.textContent.trim() })));
        assert.deepEqual(buttons, [
            { id: 'fhSegExportTxt', text: 'Copiar texto JARA' },
            { id: 'fhSegExportBridgeRawBtn', text: 'Copiar filas Excel FH' }
        ]);
        for (const id of REMOVED) assert.equal(await page.locator('#' + id).count(), 0, id + ' retirado');
        const visible = await page.locator('#modExportacion').innerText();
        for (const word of ['Bridge raw', 'datos estructurados', 'CSV', 'WO8']) {
            assert.ok(!visible.includes(word), `la sección no menciona «${word}»`);
        }
    });

    await test('«Copiar filas Excel FH» copia la visita 166 sin exigir línea dispensada', async () => {
        assert.equal(await copyButton().isDisabled(), false, 'con fecha anotada y sin dispensar, la copia está disponible');
        const { act, line, rows } = await copyAndRead();
        assert.equal(rows.length, 2, 'acto + la línea revisada');
        assert.equal(act.fh_patient_ref, P1.ref);
        assert.equal(line.dispensation_status, 'not_recorded');
    });

    await test('«Copiar texto JARA» sigue copiando el informe de la visita', async () => {
        await page.evaluate(() => navigator.clipboard.writeText(''));
        await page.click('#fhSegExportTxt');
        await page.waitForTimeout(250);
        const text = await page.evaluate(() => navigator.clipboard.readText());
        assert.ok(text.includes('SEGUIMIENTO'), 'informe JARA copiado');
        assert.ok(text.includes(P1.cip), 'con el CIP de la visita');
    });

    await test('el código de Seguimiento ya no cablea las salidas retiradas', async () => {
        const js = readFileSync(path.join(ROOT, 'scripts/farmacia_seguimiento.js'), 'utf8');
        const html = readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
        for (const id of REMOVED) {
            assert.ok(!html.includes(`id="${id}"`), `HTML sin ${id}`);
            assert.ok(!js.includes(`'${id}'`), `JS sin referencias a ${id}`);
        }
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_two_outputs_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
