#!/usr/bin/env node
// tools/farmacia_fh_ea_manual_output_browser_check.mjs
// FH-EA-MANUAL-01 — testigo de navegador (Playwright Chromium) del requisito J:
// viaje real Inicio → paciente sintético → Seguimiento con 2 líneas activas,
// dispensación marcada con los controles soportados, sospechosos explícitos
// registrados y DOS EA incorporados; después se pulsan los botones reales y se
// comprueba el portapapeles (TXT JARA y TSV WO8), el conteo de filas, el
// contenido de las celdas G, la guardia negativa de CSV y la consola.
// Sin manipulación del DOM, sin fixtures imposibles y sin datos reales.
// Ejecutar: node tools/farmacia_fh_ea_manual_output_browser_check.mjs

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_ea_manual_loader.cjs'))('playwright');
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

await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${server.address().port}/`;

// Las capturas de este testigo van fuera del repositorio: no se versiona
// ninguna evidencia visual nueva por esta unidad.
const screenshotDir = process.env.FH_EA_MANUAL_SCREENSHOT_DIR
    || path.join(process.env.TMPDIR || '/tmp', 'fh-ea-manual-browser');
mkdirSync(screenshotDir, { recursive: true });

let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
const pageErrors = [];
const downloads = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(String(error)));
page.on('download', (download) => downloads.push(download.suggestedFilename()));

const countIn = (haystack, needle) => haystack.split(needle).length - 1;
const clipboardText = () => page.evaluate(() => navigator.clipboard.readText());
const guardNotice = () => page.evaluate(() => ({
    visible: !document.getElementById('fhSegEaExportGuardNotice').classList.contains('hidden'),
    text: document.getElementById('fhSegEaExportGuardNotice').textContent
}));

try {
    // ─── Viaje Inicio → paciente sintético → Seguimiento ────────────────────
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'domcontentloaded' });
    await page.fill('#fhCipInput', 'CIP-DEMO-FH-004');
    await page.click('#fhSearchBtn');
    const seguimientoAction = page.locator('a.btn-primary', { hasText: 'Seguimiento' }).first();
    await seguimientoAction.waitFor({ state: 'visible', timeout: 10000 });
    await seguimientoAction.click();
    await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-004', null, { timeout: 10000 });
    assert.ok(page.url().includes('farmacia_seguimiento.html'), 'search action navigates to Seguimiento with the selected synthetic patient');
    ok('journey Inicio → synthetic patient → Seguimiento reached through supported search and navigation');

    // ─── Dos líneas activas, dispensación por controles soportados ──────────
    const activeLines = await page.evaluate(() => window.FarmaciaSeguimiento.getCanonicalLinesForPatient({ cip: 'CIP-DEMO-FH-004', biologicos: [] })
        .filter((line) => line.estado_linea === 'active').map((line) => line.linea_id));
    const cardLineIds = await page.evaluate(() => Array.from(document.querySelectorAll('#fhSegLineCards input[name="fhSegLineCardSelection"]'))
        .filter((control) => !control.disabled).map((control) => control.value));
    assert.equal(activeLines.length, 2, 'the synthetic patient offers exactly two active lines');
    assert.deepEqual(cardLineIds.sort(), activeLines.slice().sort(), 'the visible line cards expose exactly those active lines');
    ok('two active lines available on the rendered Seguimiento act');

    for (const lineId of activeLines) {
        await page.check(`#fhSegLineCards input[name="fhSegLineCardSelection"][value="${lineId}"]`);
        await page.selectOption('#fhSegLineaPrincipal', lineId);
        await page.selectOption('#fhSegDispensado', 'si');
    }
    const dispensedFromModel = await page.evaluate(() => window.FarmaciaSeguimiento.buildFollowupVisitExportModel().dispensed_lines.map((item) => item.line_id));
    assert.deepEqual(dispensedFromModel.slice().sort(), activeLines.slice().sort(), 'both lines are marked as effectively dispensed by the supported controls');
    ok('dispensation marked on both lines through the visible card and dispensation controls');

    // ─── Dos EA incorporados con sospechosos explícitos ────────────────────
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');

    async function incorporateEa({ description, severity, evolution, suspectLineId }) {
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill(description);
        if (severity) await card.locator('[data-ea-field="severity"]').selectOption(severity);
        if (evolution) await card.locator('[data-ea-field="evolution"]').selectOption(evolution);
        await card.getByRole('button', { name: 'Incorporar al acto' }).click();
        if (suspectLineId) {
            // Los candidatos son medicamentos nombrados explícitamente en el
            // acto; se marca la línea dispensada concreta por su identidad.
            await card.locator(`.ea-suspect-list input[type="checkbox"][value="line:${suspectLineId}"]`).check();
        }
        return page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents().map((event) => ({ id: event.episode_id, suspects: event.suspect_ids.slice() })));
    }

    const [lineOne, lineTwo] = activeLines;
    await incorporateEa({ description: 'Cefalea intensa', severity: 'Grave', evolution: 'en_seguimiento', suspectLineId: lineOne });
    await incorporateEa({ description: 'Prurito de nueva aparición', severity: 'Leve', evolution: 'no_consta', suspectLineId: lineTwo });
    const eventsAfterEa3 = await incorporateEa({ description: 'Mareo sin sospechoso declarado' });
    assert.equal(eventsAfterEa3.length, 3, 'three EA incorporated in the same act');
    assert.deepEqual(eventsAfterEa3[0].suspects, ['line:' + lineOne], 'the first EA keeps its explicit line association');
    assert.deepEqual(eventsAfterEa3[1].suspects, ['line:' + lineTwo], 'the second EA keeps its own explicit line association');
    assert.deepEqual(eventsAfterEa3[2].suspects, [], 'the third EA stays without a selected suspect, never inferred');
    ok('three EA incorporated: two with distinct explicit line associations and one without a suspect');

    const eventIdentities = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot().events
        .map((event) => `${event.episode_id}/${event.observation_id}`));
    assert.equal(eventIdentities.length, 3, 'the prepared act exposes the three EA identities');
    const [identityLineOne, identityLineTwo, identityCommon] = eventIdentities;

    // ─── Botones reales: TXT JARA ──────────────────────────────────────────
    await page.click('#fhSegExportTxt');
    await page.waitForTimeout(250);
    const jara = await clipboardText();
    assert.ok(jara.includes('VISITA DE SEGUIMIENTO — EFECTOS ADVERSOS'), 'TXT JARA keeps the adverse-event section');
    assert.equal(countIn(jara, 'Cefalea intensa'), 1, 'TXT JARA presents the first EA exactly once');
    assert.equal(countIn(jara, 'Prurito de nueva aparición'), 1, 'TXT JARA presents the second EA exactly once');
    assert.equal(countIn(jara, 'Mareo sin sospechoso declarado'), 1, 'TXT JARA presents the third EA exactly once');
    eventIdentities.forEach((pair) => {
        const [episodeId, observationId] = pair.split('/');
        assert.ok(jara.includes(episodeId) && jara.includes(observationId), `TXT JARA preserves the explicit identity ${pair}`);
    });
    assert.ok(/Gravedad: Grave/.test(jara) && /Evolución: En seguimiento/.test(jara), 'TXT JARA keeps explicit severity and evolution');
    assert.ok(jara.includes('Causalidad Naranjo: No evaluada') && jara.includes('Causalidad Karch-Lasagna: No evaluada'), 'TXT JARA never exports the provisional G0 editors as a formal assessment');
    assert.ok(jara.includes('Medicamentos sospechosos explícitos:'), 'TXT JARA declares the explicit suspects');
    assert.ok(!(await guardNotice()).visible, 'TXT JARA: no refusal notice after a successful copy');
    ok('TXT JARA copy: one report per visit, each EA once, with identity, severity/evolution and explicit suspects');

    // ─── Botones reales: Excel WO8 manual ─────────────────────────────────
    const layout = await page.evaluate(() => ({
        columns: window.FarmaciaExcelRowExport.WO8_COLUMNS.length,
        eaId: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('ea_id'),
        eaDescription: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('ea_descripcion'),
        eaSeverity: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('ea_gravedad'),
        suspectIds: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('farmaco_sospechoso_id'),
        naranjo: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('causalidad_naranjo'),
        karch: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('causalidad_karch'),
        lineId: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('linea_id')
    }));
    await page.click('#fhSegExcelExportBtn');
    await page.waitForTimeout(250);
    const tsv = await clipboardText();
    const rows = tsv.split('\n').filter((row) => row.trim() !== '');
    const cells = rows.map((row) => row.split('\t'));
    assert.equal(cells.length, 2, 'Excel WO8 manual copies exactly one row per dispensed drug (two rows)');
    cells.forEach((row, index) => assert.equal(row.length, layout.columns, `Excel row ${index + 1} keeps the ${layout.columns} canonical WO8 cells`));
    assert.deepEqual(cells.map((row) => row[layout.lineId]).sort(), activeLines.slice().sort(), 'row identity matches the dispensed lines');
    cells.forEach((row, index) => {
        const rowLineId = row[layout.lineId];
        const ownIdentity = rowLineId === lineOne ? identityLineOne : identityLineTwo;
        const otherIdentity = rowLineId === lineOne ? identityLineTwo : identityLineOne;
        assert.ok(row[layout.eaId].includes(ownIdentity), `Excel row ${index + 1}: the EA explicitly associated with ${rowLineId} is present`);
        assert.ok(row[layout.eaId].includes(identityCommon), `Excel row ${index + 1}: the EA without a selected suspect is projected in the common part`);
        assert.ok(!row[layout.eaId].includes(otherIdentity), `Excel row ${index + 1}: the EA of the other line is NOT copied into this row`);
        assert.ok(row[layout.eaSeverity].includes('Gravedad:') && row[layout.eaSeverity].includes('Evolución:'), `Excel row ${index + 1}: severity/evolution labelled explicitly`);
        assert.ok(row[layout.suspectIds].includes('Sin sospechoso seleccionado'), `Excel row ${index + 1}: «sin sospechoso seleccionado» stays distinct from an evaluation`);
        assert.ok(/No evaluada/.test(row[layout.naranjo]) && /No evaluada/.test(row[layout.karch]), `Excel row ${index + 1}: causality stays «No evaluada»`);
        const fragmentScopes = row[layout.eaId].split(' | ').map((fragment) => fragment.slice(0, fragment.indexOf(': ')));
        assert.ok(fragmentScopes.every((scope) => scope === 'COMÚN' || scope.startsWith('LÍNEA ')), `Excel row ${index + 1}: every fragment carries a valid COMÚN / LÍNEA scope`);
        assert.deepEqual(fragmentScopes, ['COMÚN', 'LÍNEA ' + rowLineId], `Excel row ${index + 1}: common part first, then the line-specific part of that line`);
    });
    const commonDescriptionCells = cells.map((row) => row[layout.eaDescription].split(' | ')[0]);
    assert.equal(commonDescriptionCells[0], commonDescriptionCells[1], 'the common part is repeated identically on both rows and creates no new EA');
    assert.ok(commonDescriptionCells.every((cell) => cell.includes('Mareo sin sospechoso declarado')), 'the repeated common part is the EA without a selected suspect');
    assert.ok(!(await guardNotice()).visible, 'Excel WO8 manual: no refusal notice after a successful copy');
    ok('Excel WO8 copy: one row per dispensed line, 62 cells, aligned COMÚN / LÍNEA fragments and no inferred causality');

    // ─── Negativo: CSV y Export V2 conservan su frontera ──────────────────
    await page.click('#fhSegExportCsv');
    await page.waitForTimeout(200);
    const csvGuard = await guardNotice();
    assert.ok(csvGuard.visible && csvGuard.text.includes('3 EA incorporados') && csvGuard.text.includes('no se exporta solo el primer EA'), 'CSV keeps the previous singular frontier and refuses 0..N');
    assert.deepEqual(downloads, [], 'no file download fired while the CSV export is blocked');
    ok('CSV still refuses the 0..N collection without downloading anything');

    await page.evaluate(() => window.scrollTo(0, 0));
    writeFileSync(path.join(screenshotDir, 'FH_EA_MANUAL_01_seguimiento_1440x900.png'), await page.screenshot({ fullPage: false }));
    ok('viewport capture of the witnessed act stored outside the repository');

    assert.deepEqual(consoleErrors, [], 'console.error empty during the whole journey');
    assert.deepEqual(pageErrors, [], 'no uncaught pageerror during the whole journey');
    ok('console.error=0 pageerror=0 across the whole journey');
} catch (error) {
    bad('unexpected failure', error && error.message ? error.message : String(error));
} finally {
    await context.close();
    await browser.close();
    server.close();
}

console.log(`\nFH-EA-MANUAL-01-BROWSER: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
