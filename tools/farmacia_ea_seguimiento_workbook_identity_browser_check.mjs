#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo D4a-2: Seguimiento copia el
// acto 0..N con la identidad DECLARADA por el libro (decisiones de Sil,
// 31-10-2026). Viaje real: Inicio importa el libro mixto sintético →
// paciente → Seguimiento → fecha del acto anotada → EA incorporado → botón
// «Copiar Bridge raw EA 0..N». El TSV copiado se añade al libro en Node y se
// relee como un acto más del paciente.
//  - Consultar no crea nada: sin patientRef declarado (CIP-LEGACY-003) la
//    copia queda bloqueada con motivo.
//  - El acto emite su identidad UNA vez al abrirse; copiar dos veces da el
//    mismo actId; otro paciente, otro acto.
//  - Sin fecha anotada por el profesional no hay copia (la autorrellenada no
//    cuenta).
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { P1, P2, LEGACY_CIP } = mixed;

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_d4a2_loader.cjs'))('playwright');
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

const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-d4a2-'));
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
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

const status = () => page.locator('#fhSegExportBridgeRawStatus').innerText();
const copyButton = () => page.locator('#fhSegExportBridgeRawBtn');

async function openSeguimientoFor(cip, { importWorkbook = false } = {}) {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'load' });
    if (importWorkbook) {
        await page.setInputFiles('#inputExcelFarmacia', xlsxPath);
        await page.waitForFunction(() => {
            const runtime = window.FarmaciaPatientFlowRuntime;
            const port = runtime && runtime.getDataPort && runtime.getDataPort();
            return !!(port && typeof port.listPatients === 'function' && port.listPatients().length > 0);
        }, null, { timeout: 10000 });
    }
    await page.fill('#fhCipInput', cip);
    await page.click('#fhSearchBtn');
    const action = page.locator(`a.btn-primary[href*="cip=${cip}"]`, { hasText: 'Seguimiento' }).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click();
    await page.waitForURL(/farmacia_seguimiento\.html/, { timeout: 10000 });
    await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, cip, { timeout: 10000 });
}

async function recordActDate(date) {
    await page.fill('#fhSegFecha', date);
    await page.locator('#fhSegFecha').dispatchEvent('change');
}

async function incorporateEa(description) {
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill(description);
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
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
        // Cada celda del TSV 166 es JSON canónico (cadena entrecomillada); vacía = null.
        const decode = (cell) => { if (cell === '') return null; try { return JSON.parse(cell); } catch { return cell; } };
        return Object.fromEntries(header.map((name, index) => [name, decode(cells[index])]));
    });
    return { tsv, rows };
}

const sameCell = (rows, name) => {
    const values = [...new Set(rows.map((row) => row[name]))];
    assert.equal(values.length, 1, `todas las filas del acto comparten ${name}`);
    return values[0];
};

let firstCopy = null;

try {
    await test('paciente del libro: sin fecha anotada no hay copia (la autorrellenada no cuenta)', async () => {
        await openSeguimientoFor(P1.cip, { importWorkbook: true });
        await page.waitForTimeout(300);
        assert.equal(await copyButton().isDisabled(), true);
        assert.match(await status(), /Copia no disponible: anota la fecha del acto/);
    });

    await test('paciente del libro: copia con la identidad declarada y el acto emitido una vez', async () => {
        await recordActDate('2026-10-31');
        await incorporateEa('Mareo sintético');
        await page.waitForTimeout(200);
        assert.equal(await copyButton().isDisabled(), false, 'con fecha anotada la copia se habilita');
        firstCopy = await copyAndRead();
        const { rows } = firstCopy;
        assert.ok(rows.length >= 2, 'acto + al menos una fila más');
        assert.equal(sameCell(rows, 'fh_patient_ref'), P1.ref, 'patientRef declarado por el libro');
        assert.equal(sameCell(rows, 'patient_id'), P1.pid);
        assert.equal(sameCell(rows, 'identifier_value'), P1.cip);
        assert.equal(sameCell(rows, 'identifier_system'), 'DEMO');
        assert.equal(sameCell(rows, 'visit_date'), '2026-10-31', 'fecha anotada por el profesional');
        const actId = sameCell(rows, 'fh_act_id');
        assert.match(actId, /^FH-ACT-/, 'actId emitido por el acto');
        assert.notEqual(actId, sameCell(rows, 'event_id'));
        assert.notEqual(actId, sameCell(rows, 'visit_id'));
        assert.notEqual(actId, sameCell(rows, 'source_event_id'));
        assert.match(sameCell(rows, 'event_id'), /^FH-EVT-/);
        assert.match(sameCell(rows, 'source_event_id'), /^FH-SRC-/);
        assert.match(sameCell(rows, 'visit_id'), /^FH-VISIT-/, 'la visita abierta en Seguimiento');
        assert.ok(rows.some((row) => row.row_role === 'followup_line' && row.line_id === P1.line), 'viaja la línea declarada y marcada');
    });

    await test('copiar dos veces el mismo acto da la misma identidad', async () => {
        const again = await copyAndRead();
        assert.equal(sameCell(again.rows, 'fh_act_id'), sameCell(firstCopy.rows, 'fh_act_id'));
        assert.equal(sameCell(again.rows, 'event_id'), sameCell(firstCopy.rows, 'event_id'));
        assert.equal(sameCell(again.rows, 'source_event_id'), sameCell(firstCopy.rows, 'source_event_id'));
    });

    await test('el TSV copiado, pegado en el libro, se relee como un acto más del paciente', async () => {
        const reread = global.FarmaciaPatientReadContractV2
            .create({ source: mixed.source({ extraDermaTsv: [firstCopy.tsv] }) })
            .readAdverseEventEpisodes(P1.pid);
        assert.equal(reread.outcome, 'ok');
        const actId = sameCell(firstCopy.rows, 'fh_act_id');
        assert.equal(reread.value.actDates[actId], '2026-10-31');
        assert.equal(reread.value.state.episodes.length, 3, 'E1, E9 y el episodio nuevo');
    });

    await test('otro paciente del libro: otro acto con su propio patientRef', async () => {
        await openSeguimientoFor(P2.cip, { importWorkbook: true });
        await recordActDate('2026-10-31');
        await incorporateEa('Prurito sintético');
        await page.waitForTimeout(200);
        const { rows } = await copyAndRead();
        assert.equal(sameCell(rows, 'fh_patient_ref'), P2.ref);
        assert.equal(sameCell(rows, 'patient_id'), P2.pid);
        assert.notEqual(sameCell(rows, 'fh_act_id'), sameCell(firstCopy.rows, 'fh_act_id'));
    });

    await test('sin patientRef declarado en el libro: bloqueo con motivo, nada inventado', async () => {
        await openSeguimientoFor(LEGACY_CIP, { importWorkbook: true });
        await recordActDate('2026-10-31');
        await page.waitForTimeout(300);
        assert.equal(await copyButton().isDisabled(), true);
        assert.match(await status(), /Copia no disponible: el libro no declara el patientRef de este paciente/);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_workbook_identity_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
