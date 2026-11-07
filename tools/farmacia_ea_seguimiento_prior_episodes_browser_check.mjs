#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo D4b-2: historia de EA en
// Seguimiento (decisiones de Sil, 31-10-2026). Viaje real con el libro mixto:
//  - Visita 1: la lista de episodios anteriores del libro ofrece, por
//    episodio, «Continúa»/«Resuelto» (abierto). Continúa en E1, Resuelto en
//    E9 y un EA nuevo; copia 166 → se pega en el libro.
//  - Visita 2 (libro reimportado): E9 está cerrado y solo ofrece
//    «Recurrencia»; recurrencia + otro EA nuevo; copia 166.
//  - Los EA de cada visita llevan identificadores propios de esa visita: dos
//    visitas pegadas nunca repiten episodio ni observación y el libro se
//    relee entero.
//  - La evolución declarada se ve en la ficha y en JARA; nunca «No consta».
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

const envelopeOf = (extra) => global.FarmaciaPatientReadContractV2.create({ source: mixed.source({ extraDermaTsv: extra }) }).readAdverseEventEpisodes(P1.pid);
const stateOf = (envelope, episodeId) => envelope.value.state.episodes.find((episode) => episode.episode_id === episodeId);

let visit1 = null;
let visit2 = null;

try {
    await test('visita 1: la lista del libro ofrece Continúa/Resuelto por episodio abierto; la maqueta antigua ya no está', async () => {
        await openP1(xlsxPath);
        for (const old of ['#fhSegEaPriorEpisodeSelect', '#fhSegEaUpdatePriorBtn', '#fhSegEaRecurrenceBtn']) {
            assert.equal(await page.locator(old).count(), 0, `${old} retirado`);
        }
        assert.ok((await priorItem('E1').innerText()).includes('Cefalea persiste'), 'E1 con su última descripción');
        assert.deepEqual(await priorActions('E1'), [
            { action: 'continuation', text: 'Continúa', disabled: false },
            { action: 'resolution', text: 'Resuelto', disabled: false }
        ]);
        assert.deepEqual((await priorActions('E9')).map((item) => item.action), ['continuation', 'resolution']);
    });

    await test('visita 1: Continúa en E1 crea su ficha sobre E1, sin selector de evolución, y bloquea repetir', async () => {
        await priorItem('E1').locator('button[data-ea-prior-action="continuation"]').click();
        assert.equal(await card('E1').count(), 1, 'ficha sobre el episodio E1');
        assert.equal(await card('E1').locator('[data-ea-field="evolution"]').count(), 0, 'la evolución declarada no se edita');
        assert.ok((await card('E1').innerText()).includes('Continúa'), 'la ficha dice que continúa');
        assert.ok((await priorActions('E1')).every((item) => item.disabled), 'un episodio, una ficha por visita');
        await finishCard(card('E1'), 'Cefalea persiste leve');
        await priorItem('E9').locator('button[data-ea-prior-action="resolution"]').click();
        await finishCard(card('E9'), 'Náuseas resueltas');
        await addNewEa('Mareo sintético visita 1');
        for (const episodeId of ['E1', 'E9']) {
            assert.ok(!/no consta/i.test(await card(episodeId).locator('.status-badge--ea-card').innerText()), `la insignia de ${episodeId} muestra la evolución declarada`);
        }
        assert.ok((await card('E9').innerText()).includes('Resuelto'), 'la ficha dice que se resuelve');
    });

    await test('visita 1: la copia 166 lleva cada ficha sobre su episodio e identidades propias del acto', async () => {
        visit1 = await copyAndRead();
        const byEpisode = Object.fromEntries(visit1.observations.map((row) => [row.ea_episode_id, row]));
        assert.equal(byEpisode.E1.ea_basis_observation_id, 'O2', 'Continúa se apoya en la última observación de E1');
        assert.equal(byEpisode.E9.ea_basis_observation_id, 'O9');
        const fresh = visit1.observations.filter((row) => row.ea_episode_id !== 'E1' && row.ea_episode_id !== 'E9');
        assert.equal(fresh.length, 1, 'un EA nuevo');
        assert.ok(fresh[0].ea_episode_id.startsWith(visit1.actId), 'el episodio nuevo lleva la identidad del acto');
        assert.equal(fresh[0].ea_basis_observation_id, null);
        visit1.observations.forEach((row) => assert.ok(row.ea_observation_id.startsWith(visit1.actId), 'cada observación lleva la identidad del acto'));
    });

    await test('visita 1: JARA dice Continúa y Resuelto, nunca «No consta» para esas fichas', async () => {
        const jara = await jaraText();
        assert.ok(jara.includes('Evolución: Continúa'), 'continúa en JARA');
        assert.ok(jara.includes('Evolución: Resuelto (cierra el episodio)'), 'resuelto en JARA');
    });

    await test('releído el libro con la visita 1: E1 continúa, E9 queda cerrado y aparece el episodio nuevo', async () => {
        const envelope = envelopeOf([visit1.tsv]);
        assert.equal(envelope.outcome, 'ok');
        assert.equal(stateOf(envelope, 'E1').observationCount, 3);
        assert.equal(stateOf(envelope, 'E1').lastEvolution, 'continuation');
        assert.equal(stateOf(envelope, 'E9').closed, true);
        assert.equal(envelope.value.state.episodes.length, 3);
    });

    await test('visita 2 (libro reimportado): E9 cerrado solo ofrece Recurrencia; la recurrencia abre un episodio nuevo', async () => {
        const xlsx2 = path.join(workDir, 'mixto_con_visita1.xlsx');
        writeFileSync(xlsx2, mixed.workbookBuffer({ extraDermaTsv: [visit1.tsv] }));
        await openP1(xlsx2);
        assert.deepEqual(await priorActions('E9'), [{ action: 'recurrence', text: 'Recurrencia', disabled: false }]);
        assert.deepEqual((await priorActions('E1')).map((item) => item.action), ['continuation', 'resolution']);
        const before = await page.locator('#fhSegEaList .ea-t01-card').count();
        await priorItem('E9').locator('button[data-ea-prior-action="recurrence"]').click();
        const recurrence = page.locator('#fhSegEaList .ea-t01-card').nth(before);
        assert.notEqual(await recurrence.getAttribute('data-episode-id'), 'E9', 'la recurrencia no reutiliza el episodio cerrado');
        assert.ok((await recurrence.innerText()).includes('Recurrencia'));
        await finishCard(recurrence, 'Náuseas de nuevo');
        await addNewEa('Mareo sintético visita 2');
        visit2 = await copyAndRead();
        assert.notEqual(visit2.actId, visit1.actId, 'otra visita, otro acto');
        const rec = visit2.observations.find((row) => row.ea_basis_observation_id !== null);
        assert.ok(rec, 'la recurrencia se apoya en la última observación de E9');
        assert.equal(rec.ea_basis_observation_id, visit1.observations.find((row) => row.ea_episode_id === 'E9').ea_observation_id);
        const ids1 = new Set(visit1.observations.flatMap((row) => [row.ea_episode_id, row.ea_observation_id]));
        visit2.observations.forEach((row) => {
            assert.ok(!ids1.has(row.ea_observation_id), 'ninguna observación repite la visita 1');
            assert.ok(!ids1.has(row.ea_episode_id), 'ningún episodio nuevo repite la visita 1');
        });
    });

    await test('las dos visitas pegadas se releen enteras: E9 sigue cerrado y la recurrencia es un episodio nuevo', async () => {
        const envelope = envelopeOf([visit1.tsv, visit2.tsv]);
        assert.equal(envelope.outcome, 'ok', 'el libro con dos visitas se lee');
        assert.equal(stateOf(envelope, 'E9').closed, true);
        assert.equal(envelope.value.state.episodes.length, 5, 'E1, E9, nuevo v1, recurrencia, nuevo v2');
    });

    await test('descartar una ficha de continuidad vuelve a ofrecer los botones de su episodio', async () => {
        await priorItem('E1').locator('button[data-ea-prior-action="continuation"]').click();
        assert.ok((await priorActions('E1')).every((item) => item.disabled));
        await card('E1').getByRole('button', { name: /Descartar/ }).click();
        await page.waitForTimeout(150);
        assert.equal(await card('E1').count(), 0);
        assert.ok((await priorActions('E1')).every((item) => !item.disabled), 'botones de E1 disponibles otra vez');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_prior_episodes_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
