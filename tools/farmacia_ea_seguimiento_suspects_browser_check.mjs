#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo F1: sospechosos en Seguimiento.
//  - Los sospechosos marcados en una ficha viajan como filas ea_suspicion en
//    la copia 166 (columna ea_medication_ref), solo los marcados.
//  - Ficha longitudinal (Continúa/Resuelto/Recurrencia): los sospechosos de la
//    visita anterior se muestran como REFERENCIA, sin marcar, con un aviso para
//    que el profesional pregunte activamente y marque los que sigan activos.
//  - Se retiran los botones de maqueta «Ver estructura simulada» y
//    «Reiniciar ejemplo» y el texto que los cita.
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
const { P1 } = mixed;

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

const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-d4b2-'));
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

async function openP1(workbookPath) {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'load' });
    await page.setInputFiles('#inputExcelFarmacia', workbookPath);
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
    await page.fill('#fhSegFecha', '2026-11-07');
    await page.locator('#fhSegFecha').dispatchEvent('change');
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    await page.waitForTimeout(200);
}

const priorItem = (episodeId) => page.locator(`#fhSegEaPriorEpisodes [data-episode-id="${episodeId}"]`);
const priorActions = (episodeId) => priorItem(episodeId).locator('button[data-ea-prior-action]').evaluateAll((nodes) =>
    nodes.map((node) => ({ action: node.getAttribute('data-ea-prior-action'), text: node.textContent.trim(), disabled: node.disabled })));
const card = (episodeId) => page.locator(`#fhSegEaList .ea-t01-card[data-episode-id="${episodeId}"]`);

async function finishCard(locator, description) {
    await locator.locator('[data-ea-field="description"]').fill(description);
    await locator.getByRole('button', { name: 'Incorporar al acto' }).click();
}

async function addNewEa(description) {
    await page.click('#fhSegAddEaBtn');
    await finishCard(page.locator('#fhSegEaList .ea-t01-card').last(), description);
}

async function copyAndRead() {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await copyButton().click({ timeout: 5000 });
    await page.waitForFunction(() => /Preparado para transferencia manual/.test((document.getElementById('fhSegExportBridgeRawStatus') || {}).textContent || ''), null, { timeout: 5000 });
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    const header = await page.evaluate(() => window.FarmaciaBridgeRawEaV21Core.ROW_COLUMNS.slice());
    const rows = tsv.split('\n').filter((line) => line !== '').map((line) => {
        const cells = line.split('\t');
        const decode = (cell) => { if (cell === '') return null; try { return JSON.parse(cell); } catch { return cell; } };
        return Object.fromEntries(header.map((name, index) => [name, decode(cells[index])]));
    });
    const actId = rows[0].fh_act_id;
    return { tsv, rows, actId, observations: rows.filter((row) => row.row_role === 'ea_observation') };
}

async function jaraText() {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.click('#fhSegExportTxt');
    await page.waitForTimeout(250);
    return page.evaluate(() => navigator.clipboard.readText());
}

let marked = null;

try {
    await test('maqueta retirada: sin «Ver estructura simulada», sin «Reiniciar ejemplo» y sin texto que los cite', async () => {
        await openP1(xlsxPath);
        assert.equal(await page.locator('#fhSegEaShowStructureBtn').count(), 0);
        assert.equal(await page.locator('#fhSegEaResetDemoBtn').count(), 0);
        const zone = await page.locator('#fhSegEaZone').innerText();
        assert.ok(!/estructura simulada|reiniciar ejemplo/i.test(zone), 'la zona EA no cita los botones retirados');
    });

    await test('ficha longitudinal: sospechosos de la visita anterior como referencia, sin marcar, con aviso', async () => {
        await priorItem('E1').locator('button[data-ea-prior-action="continuation"]').click();
        const reference = card('E1').locator('.ea-prior-suspects');
        assert.equal(await reference.count(), 1, 'bloque de referencia presente');
        const text = await reference.innerText();
        assert.ok(text.includes('LINE-A'), 'muestra el sospechoso de la visita anterior');
        assert.ok(/pregunte/i.test(text) && /marque/i.test(text), 'aviso para preguntar y marcar activamente');
        assert.equal(await card('E1').locator('.ea-suspect-list input:checked').count(), 0, 'nada preseleccionado');
        assert.equal(await reference.locator('input').count(), 0, 'la referencia no es interactiva');
    });

    await test('ficha de EA nuevo: sin bloque de referencia', async () => {
        await page.click('#fhSegAddEaBtn');
        const fresh = page.locator('#fhSegEaList .ea-t01-card').last();
        assert.equal(await fresh.locator('.ea-prior-suspects').count(), 0);
        await finishCard(fresh, 'Mareo sintético');
    });

    await test('el profesional marca un sospechoso en la ficha longitudinal y viaja como ea_suspicion en la 166', async () => {
        const boxes = card('E1').locator('.ea-suspect-list input[type="checkbox"]');
        assert.ok(await boxes.count() >= 1, 'hay candidatos');
        const value = await boxes.first().getAttribute('value');
        await boxes.first().check();
        await finishCard(card('E1'), 'Cefalea persiste');
        marked = await copyAndRead();
        const suspicions = marked.rows.filter((row) => row.row_role === 'ea_suspicion');
        assert.equal(suspicions.length, 1, 'solo el sospechoso marcado');
        assert.equal(suspicions[0].ea_medication_ref, value);
        assert.equal(suspicions[0].ea_episode_id, 'E1');
        assert.equal(marked.observations.length, 2);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_suspects_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
