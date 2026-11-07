#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo F2: causalidad (EA × sospechoso ×
// método) en las dos salidas manuales, sin botón adicional (decisión de Sil):
//  - Sin tocar: «No evaluada»; no viaja ninguna fila ea_evaluation.
//  - A medias (alguna pregunta sin contestar): las DOS salidas se bloquean con
//    motivo; nunca sale una causalidad parcial. El valor por defecto no cuenta.
//  - Completa: viaja ea_evaluation (id <actId>-EV-####, estado completado) con
//    respuestas, puntuación y categoría del algoritmo existente; Naranjo y
//    Karch-Lasagna son independientes; JARA lo cuenta por sospechoso.
//  - «Valoración final» opcional por pareja EA × sospechoso, viaja con ella.
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

const NARANJO_N = 10;
const KARCH_N = 7;
const payloadOf = (row) => {
    let value = row.ea_payload_json;
    for (let i = 0; i < 3 && typeof value === 'string'; i += 1) { try { value = JSON.parse(value); } catch { break; } }
    if (value && typeof value === 'object' && value.undefinedPaths && 'value' in value) value = value.value;
    return value;
};
const clickChips = async (scope, count, skip) => {
    const groups = page.locator(`${scope} .causality-chip-group`);
    assert.equal(await groups.count(), count, `${scope}: ${count} preguntas`);
    for (let i = 0; i < count; i += 1) {
        if (i === skip) continue;
        await groups.nth(i).locator('.causality-chip').first().click();
    }
};
const evaluationRows = (out) => out.rows.filter((row) => row.row_role === 'ea_evaluation');
const copyStatus = async () => {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await copyButton().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    return page.evaluate(() => (document.getElementById('fhSegExportBridgeRawStatus') || {}).textContent || '');
};
let suspectValue = null;
let fullOut = null;
const envelopeOf = (extra) => global.FarmaciaPatientReadContractV2.create({ source: mixed.source({ extraDermaTsv: extra }) }).readAdverseEventEpisodes(P1.pid);

try {
    await test('preparación: EA nuevo con un sospechoso marcado e incorporado; sin tocar causalidad → «No evaluada» y ninguna ea_evaluation', async () => {
        await openP1(xlsxPath);
        await page.click('#fhSegAddEaBtn');
        const fresh = page.locator('#fhSegEaList .ea-t01-card').last();
        const box = fresh.locator('.ea-suspect-list input[type="checkbox"]').first();
        suspectValue = await box.getAttribute('value');
        await box.check();
        await finishCard(fresh, 'Mareo sintético');
        const out = await copyAndRead();
        assert.equal(evaluationRows(out).length, 0);
        const jara = await jaraText();
        assert.ok(jara.includes('Causalidad Naranjo: No evaluada'));
        assert.ok(jara.includes('Causalidad Karch-Lasagna: No evaluada'));
    });

    await test('pareja abierta en línea al marcar y a medias: Naranjo con 9 de 10 preguntas bloquea las DOS salidas con motivo', async () => {
        assert.ok(await page.locator('#fhSegEaList .ea-t01-card').last().locator('#modSeguimientoCausalidad').isVisible(), 'la causalidad del sospechoso marcado está abierta en su fila');
        await clickChips('#modNaranjo', NARANJO_N, 4);
        const status = await copyStatus();
        assert.ok(!/Preparado para transferencia manual/.test(status), 'la copia 166 no sale');
        assert.ok(/faltan 1/i.test(status) && /naranjo/i.test(status), 'motivo con método y preguntas que faltan: ' + status);
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '', 'nada en el portapapeles');
        const jara = await jaraText();
        assert.equal(jara, '', 'JARA tampoco sale');
        assert.ok(/faltan 1/i.test(await page.locator('#fhSegEaExportGuardNotice').innerText()), 'aviso visible con el motivo');
    });

    await test('Naranjo completo: viaja una ea_evaluation con id del acto, estado completado, respuestas, puntuación y categoría', async () => {
        await page.locator('#modNaranjo .causality-chip-group').nth(4).locator('.causality-chip').first().click();
        const score = (await page.locator('#naranjoScore').innerText()).trim();
        const category = (await page.locator('#naranjoCategoria').innerText()).trim();
        const out = await copyAndRead();
        const evals = evaluationRows(out);
        assert.equal(evals.length, 1);
        assert.equal(evals[0].ea_evaluation_method, 'naranjo');
        assert.equal(evals[0].ea_evaluation_status, 'completado');
        assert.equal(evals[0].ea_medication_ref, suspectValue);
        assert.equal(evals[0].ea_evaluation_id, out.actId + '-EV-0001');
        const payload = payloadOf(evals[0]);
        const text = JSON.stringify(payload);
        assert.ok(text.includes(category) && text.includes(String(score)), 'categoría y puntuación en el payload: ' + text);
        assert.equal(Object.keys(payload.answers || {}).length, NARANJO_N, '10 respuestas elegidas');
        const jara = await jaraText();
        assert.ok(jara.includes(`Causalidad Naranjo: `) && jara.includes(`${score} · ${category}`), 'JARA con puntuación y categoría');
        assert.ok(jara.includes('Causalidad Karch-Lasagna: No evaluada'), 'Karch sigue sin evaluar, independiente');
    });

    await test('Karch-Lasagna completo y valoración final: dos evaluaciones independientes con ids distintos; la valoración final viaja', async () => {
        await clickChips('#modKarchLasagna', KARCH_N, -1);
        await page.selectOption('#fhCausalidadFinal', 'Definida');
        const kl = (await page.locator('#klCategoria').innerText()).trim();
        const out = await copyAndRead();
        fullOut = out;
        const evals = evaluationRows(out);
        assert.equal(evals.length, 2);
        assert.deepEqual(evals.map((row) => row.ea_evaluation_method).sort(), ['karch_lasagna', 'naranjo']);
        assert.equal(new Set(evals.map((row) => row.ea_evaluation_id)).size, 2);
        evals.forEach((row) => assert.ok(row.ea_evaluation_id.startsWith(out.actId + '-EV-')));
        const karch = evals.find((row) => row.ea_evaluation_method === 'karch_lasagna');
        assert.ok(JSON.stringify(payloadOf(karch)).includes(kl), 'categoría Karch en el payload');
        evals.forEach((row) => assert.ok(JSON.stringify(payloadOf(row)).includes('Definida'), 'valoración final en la evaluación'));
        const jara = await jaraText();
        assert.ok(jara.includes(`Causalidad Karch-Lasagna: `) && jara.includes(kl));
        assert.ok(jara.includes('Valoración final'), 'JARA recoge la valoración final');
    });

    await test('ida y vuelta: pegadas en el libro y releídas, las evaluaciones aparecen en el estado de episodios y en el modelo de pantalla', async () => {
        const envelope = envelopeOf([fullOut.tsv]);
        assert.equal(envelope.outcome, 'ok', 'el libro con la visita se lee: ' + JSON.stringify(envelope).slice(0, 300));
        const episode = envelope.value.state.episodes.find((item) => item.episode_id === fullOut.observations[0].ea_episode_id);
        assert.ok(episode, 'el episodio nuevo está en el estado');
        const model = global.HubTools.farmaciaEaScreenModel.fromEnvelope(envelope);
        assert.equal(model.status, 'ok');
        const shown = model.model.episodes.find((item) => item.episode_id === episode.episode_id);
        assert.ok(shown, 'el episodio está en el modelo de pantalla');
        assert.deepEqual([...shown.methods].sort(), ['karch_lasagna', 'naranjo'], 'métodos evaluados: ' + JSON.stringify(shown));
        assert.deepEqual(shown.suspects, [suspectValue], 'sospechoso releído: ' + JSON.stringify(shown));
    });

    await test('desmarcar el sospechoso retira su causalidad: ya no viaja ninguna ea_evaluation', async () => {
        const card0 = page.locator('#fhSegEaList .ea-t01-card').last();
        const box = card0.locator('.ea-suspect-list input[type="checkbox"]').first();
        page.once('dialog', (d) => d.accept());
        await box.uncheck();
        await page.waitForTimeout(300);
        const out = await copyAndRead();
        assert.equal(evaluationRows(out).length, 0);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_causality_outputs_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
