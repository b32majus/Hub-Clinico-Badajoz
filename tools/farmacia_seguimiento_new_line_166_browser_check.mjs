#!/usr/bin/env node
// Check de navegador EA v1 demo (#870, A2): la línea registrada en la visita
// viaja en la copia 166 como una `followup_line` normal del seguimiento.
//  - Paciente sin líneas (primera visita en la plataforma, ya en tratamiento):
//    el fármaco elegido es una línea de ESTA visita con identidad del acto
//    (`<actId>-LIN-0001`, tratamiento `<actId>-TRT-0001`).
//  - «Copiar filas Excel FH» funciona: la línea viaja con su foto (fármaco,
//    activa en el acto, principal) y sin pauta inferida; el sospechoso EA la
//    referencia.
//  - Pegada en el libro y releída, la línea es una línea activa del paciente.
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
const PATIENT_ID = 'patient-syn-c2b-beta';
const LINE_ID = ACT_ID + '-LIN-0001';
const TREATMENT_ID = ACT_ID + '-TRT-0001';
const mixed = createRequire(import.meta.url)('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();

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
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



let drugName = '';
let copied = null;

async function copyAndRead() {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.locator('#fhSegExportBridgeRawBtn').click({ timeout: 5000 });
    await page.waitForFunction(() => /Preparado para transferencia manual/.test((document.getElementById('fhSegExportBridgeRawStatus') || {}).textContent || ''), null, { timeout: 5000 });
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    const header = await page.evaluate(() => window.FarmaciaBridgeRawEaV21Core.ROW_COLUMNS.slice());
    const rows = tsv.split('\n').filter((line) => line !== '').map((line) => {
        const cells = line.split('\t');
        // El 166 escribe booleanos Excel-safe (TRUE/FALSE), como lee el lector canónico.
        const decode = (cell) => { if (cell === '') return null; if (cell === 'TRUE') return true; if (cell === 'FALSE') return false; try { return JSON.parse(cell); } catch { return cell; } };
        return Object.fromEntries(header.map((name, index) => [name, decode(cells[index])]));
    });
    return { tsv, rows };
}

try {
    await test('el fármaco elegido es una línea de esta visita con identidad del acto', async () => {
        await page.goto(base + 'farmacia_seguimiento.html?cip=' + CIP, { waitUntil: 'load' });
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, CIP, { timeout: 10000 });
        await page.waitForFunction(() => window.FarmaciaCatalog && window.FarmaciaCatalog.loaded, null, { timeout: 20000 });
        await page.fill('#fhSegDrugSearch', 'secukinumab');
        await page.locator('#fhSegDrugSearch').dispatchEvent('input');
        const item = page.locator('#fhSegAutocompleteDropdown .autocomplete-item').first();
        await item.waitFor({ state: 'visible', timeout: 5000 });
        await item.click();
        await page.waitForTimeout(200);
        drugName = await page.inputValue('#fhSegFarmaco');
        const cards = page.locator('#fhSegLineCards .seg-line-card');
        assert.equal(await cards.count(), 1);
        assert.equal(await cards.first().getAttribute('data-line-id'), LINE_ID);
    });

    await test('EA con la línea nueva como sospechoso', async () => {
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Prurito sintético');
        await card.locator(`.ea-suspect-list input[type="checkbox"][value="line:${LINE_ID}"]`).check();
        await page.waitForTimeout(150);
    });

    await test('«Copiar filas Excel FH» funciona: la línea viaja como followup_line con su foto y sin pauta inferida', async () => {
        assert.ok(await page.locator('#fhSegExportBridgeRawBtn').isEnabled(), 'botón habilitado');
        copied = await copyAndRead();
        const lines = copied.rows.filter((row) => row.row_role === 'followup_line');
        assert.equal(lines.length, 1, 'una fila de línea');
        const line = lines[0];
        assert.equal(line.event_type, 'pharmacy_followup', 'es un seguimiento normal');
        assert.equal(line.line_id, LINE_ID);
        assert.equal(line.treatment_id, TREATMENT_ID);
        assert.equal(line.line_drug_name, drugName);
        assert.equal(line.line_status_at_event, 'active');
        assert.equal(line.active_at_event, true);
        assert.equal(line.is_primary_line, true);
        assert.equal(line.line_role, 'principal');
        ['line_schedule_code', 'line_schedule_label', 'line_schedule_other_text'].forEach((field) => {
            assert.equal(line[field], null, field + ' no se infiere');
        });
        assert.equal(line.patient_id, PATIENT_ID);
        assert.equal(line.fh_act_id, ACT_ID);
        const suspicions = copied.rows.filter((row) => row.row_role === 'ea_suspicion');
        assert.equal(suspicions.length, 1);
        assert.equal(suspicions[0].ea_medication_ref, 'line:' + LINE_ID, 'el sospechoso referencia la línea nueva');
    });

    await test('el texto JARA sigue nombrando el fármaco', async () => {
        await page.evaluate(() => navigator.clipboard.writeText(''));
        await page.click('#fhSegExportTxt');
        await page.waitForTimeout(250);
        assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes(drugName));
    });

    await test('pegada en el libro y releída, la línea es una línea activa del paciente', async () => {
        const source = mixed.source({ extraDermaTsv: [copied.tsv] });
        const visits = source.getVisitsAndLines(PATIENT_ID);
        assert.ok(visits && Array.isArray(visits.lines), 'el libro releído tiene las líneas del paciente');
        const line = visits.lines.find((entry) => entry.line_id === LINE_ID);
        assert.ok(line, 'la línea nueva está en el libro');
        assert.equal(line.treatment_id, TREATMENT_ID);
        assert.equal(line.snapshot.active_at_event, true);
        assert.equal(line.snapshot.line_status_at_event, 'active');
        assert.equal(line.snapshot.line_drug_name, drugName);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_seguimiento_new_line_166_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
