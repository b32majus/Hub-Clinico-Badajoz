#!/usr/bin/env node
// Check de navegador (#877, C2): lo optimizado pasa a ser el tratamiento actual
// en la visita siguiente, con insignia «optimizado».
//  - La fila 166 de la optimización NO cambia: line_* = foto de la línea al
//    empezar el acto; new_* = el cambio.
//  - Releído el libro, la línea vigente toma la dosis/pauta de new_* de su
//    última fila (sin tocar la foto cruda) y queda marcada como optimizada.
//  - La visita siguiente muestra esa dosis/pauta y la insignia; su copia 166
//    lleva lo optimizado en line_* y nada en new_*. Una visita más tarde la
//    insignia desaparece. La vía nunca cambia.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';

const mixed = createRequire(import.meta.url)('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { P1, P2 } = mixed;
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

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-c2-'));
const writeBook = (name, extra) => { const file = path.join(workDir, name); writeFileSync(file, mixed.workbookBuffer({ extraDermaTsv: extra })); return file; };

async function openSeguimiento(cip, xlsx) {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'load' });
    await page.setInputFiles('#inputExcelFarmacia', xlsx);
    await page.waitForFunction(() => {
        const runtime = window.FarmaciaPatientFlowRuntime;
        const port = runtime && runtime.getDataPort && runtime.getDataPort();
        return !!(port && typeof port.listPatients === 'function' && port.listPatients().length > 0);
    }, null, { timeout: 10000 });
    await page.fill('#fhCipInput', cip);
    await page.click('#fhSearchBtn');
    const action = page.locator(`a.btn-primary[href*="cip=${cip}"]`, { hasText: 'Seguimiento' }).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click();
    await page.waitForURL(/farmacia_seguimiento\.html/, { timeout: 10000 });
    await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, cip, { timeout: 10000 });
    await page.waitForTimeout(300);
}

async function selectLine(lineId) {
    const control = page.locator(`#fhSegLineCards .seg-line-card[data-line-id="${lineId}"] input.seg-line-card__control`);
    if (!(await control.isChecked())) await control.check();
    await page.waitForTimeout(150);
}

async function setDate(date) {
    await page.fill('#fhSegFecha', date);
    await page.locator('#fhSegFecha').dispatchEvent('change');
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
    return { tsv, rows };
}
const lineRow = (copy, lineId) => copy.rows.find((row) => row.row_role === 'followup_line' && row.line_id === lineId);

const NEW_DOSE = '42 mg';
let pauta = null;
let viaBefore = null;
let visit1 = null;
let visit2 = null;

try {
    await test('visita 1: optimizar dosis y pauta de la línea del libro', async () => {
        await openSeguimiento(P1.cip, writeBook('libro1.xlsx', []));
        await selectLine(P1.line);
        assert.equal(await page.isVisible('#fhSegOptimizadoBadge'), false, 'sin optimización previa no hay insignia');
        viaBefore = await page.inputValue('#fhSegVia');
        await setDate('2026-11-01');
        await page.selectOption('#fhSegTipoRelacionTerapia', 'optimizacion');
        await page.selectOption('#fhSegOptimiza', 'Sí');
        await page.fill('#fhSegNuevaDosis', NEW_DOSE);
        await page.locator('#fhSegNuevaDosis').dispatchEvent('input');
        pauta = await page.evaluate(() => {
            const option = Array.from(document.getElementById('fhSegNuevaPauta').options).find((o) => o.value && o.value !== 'OTRO');
            return { code: option.value };
        });
        await page.selectOption('#fhSegNuevaPauta', pauta.code);
        await page.locator('#fhSegNuevaPauta').dispatchEvent('change');
        await page.waitForTimeout(150);
        visit1 = await copyAndRead();
        const row = lineRow(visit1, P1.line);
        assert.ok(row, 'la línea viaja');
        assert.equal(row.new_dose_text, NEW_DOSE, 'el cambio viaja en new_dose_text');
        assert.equal(row.new_schedule_code, pauta.code, 'el cambio viaja en new_schedule_code');
        assert.equal(row.line_dose_text, null, 'la foto de la línea no cambia (antes no tenía dosis)');
        assert.equal(row.line_schedule_code, null, 'la foto de la línea no cambia (antes no tenía pauta)');
        pauta.label = row.new_schedule_label;
    });

    await test('releído el libro: la línea vigente toma lo optimizado sin tocar la foto cruda', async () => {
        const visits = mixed.source({ extraDermaTsv: [visit1.tsv] }).getVisitsAndLines(P1.pid);
        const line = visits.lines.find((entry) => entry.line_id === P1.line);
        assert.equal(line.snapshot.line_dose_text, null, 'la foto cruda sigue igual');
        assert.equal(line.snapshot.new_dose_text, NEW_DOSE);
        assert.deepEqual(line.current_line, {
            dose_text: NEW_DOSE,
            schedule_code: pauta.code,
            schedule_label: pauta.label,
            schedule_other_text: null,
            optimized: true
        });
        const other = mixed.source({ extraDermaTsv: [visit1.tsv] }).getVisitsAndLines(P2.pid).lines.find((entry) => entry.line_id === P2.line);
        assert.equal(other.current_line.optimized, false, 'una línea sin optimizar no queda marcada');
        assert.equal(other.current_line.dose_text, other.snapshot.line_dose_text ?? null, 'sin optimizar, la dosis vigente es la de la foto');
    });

    await test('visita 2: «Tratamiento actual» muestra lo optimizado con la insignia; la vía no cambia', async () => {
        await openSeguimiento(P1.cip, writeBook('libro2.xlsx', [visit1.tsv]));
        await selectLine(P1.line);
        assert.equal(await page.inputValue('#fhSegDosisActual'), NEW_DOSE);
        assert.equal(await page.inputValue('#fhSegPautaActual'), pauta.code);
        assert.equal(await page.inputValue('#fhSegVia'), viaBefore, 'la vía no cambia');
        assert.equal(await page.isVisible('#fhSegOptimizadoBadge'), true, 'insignia visible');
        assert.equal((await page.locator('#fhSegOptimizadoBadge').innerText()).trim(), 'Optimizado en la visita anterior');
        const card = page.locator(`#fhSegLineCards .seg-line-card[data-line-id="${P1.line}"] [data-line-optimized]`);
        assert.equal(await card.count(), 1, 'la tarjeta de la línea lo indica');
        assert.equal((await card.innerText()).trim(), 'Optimizada en la visita anterior');
    });

    await test('visita 2 sin cambios: la copia 166 lleva lo optimizado en line_* y nada en new_*', async () => {
        await setDate('2026-11-15');
        await page.selectOption('#fhSegTipoRelacionTerapia', 'sin_cambios');
        await page.waitForTimeout(150);
        visit2 = await copyAndRead();
        const row = lineRow(visit2, P1.line);
        assert.ok(row, 'la línea viaja');
        assert.equal(row.line_dose_text, NEW_DOSE);
        assert.equal(row.line_schedule_code, pauta.code);
        assert.equal(row.line_schedule_label, pauta.label);
        assert.equal(row.new_dose_text, null);
        assert.equal(row.new_schedule_code, null);
    });

    await test('visita 3: la dosis optimizada sigue y la insignia desaparece', async () => {
        await openSeguimiento(P1.cip, writeBook('libro3.xlsx', [visit1.tsv, visit2.tsv]));
        await selectLine(P1.line);
        assert.equal(await page.inputValue('#fhSegDosisActual'), NEW_DOSE);
        assert.equal(await page.inputValue('#fhSegPautaActual'), pauta.code);
        assert.equal(await page.isVisible('#fhSegOptimizadoBadge'), false);
        assert.equal(await page.locator(`#fhSegLineCards [data-line-optimized]`).count(), 0);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_seguimiento_optimizado_next_visit_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
