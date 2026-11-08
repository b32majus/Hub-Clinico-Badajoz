#!/usr/bin/env node
// tools/farmacia_qa680_morisky_browser_check.mjs
// QA #680 — Morisky-Green en Seguimiento: completo/incompleto, etiqueta de
// pantalla (texto + clase) y surfaces de export (bridge raw EA, informe de
// texto y filas Excel / proms.morisky_green).
// Check de solo lectura: OBSERVA y afirma el comportamiento esperado; nunca
// arregla la app ni relaja aserciones (un fallo queda visible como
// «FALLO <paso>: <detalle>» con ambos valores cuando procede).
// Sin visión: se afirma con DOM/texto/consola. Las capturas van a
// /tmp/nexus_checks/qa/qa680_<paso>.png solo para humanos; el check no las lee.
// Patrón (servidor estático + Playwright/chromium + consola) copiado de
// tools/farmacia_ea_seguimiento_visit_content_166_browser_check.mjs.
// Solo datos sintéticos (fixture demo). No se infiere dosis, pauta, vía,
// inducción ni validación: ausencia != valor. Requiere PATH con Playwright:
//   run_checks.sh -w <worktree> -t qa farmacia_qa680_morisky_browser_check.mjs

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream, mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
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
                return createRequire(path.join(candidate, '__fh_qa680_loader.cjs'))('playwright');
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
    ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.xlsx', 'application/octet-stream']
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

const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-qa680-'));
const xlsxPath = path.join(workDir, 'mixto_sintetico.xlsx');
writeFileSync(xlsxPath, mixed.workbookBuffer());

let okCount = 0;
const failLines = [];
const summary = [];
function ok(step) { okCount += 1; summary.push(`OK ${step}`); console.log(`OK ${step}`); }
function fail(step, detail) { failLines.push(step); console.log(`FALLO ${step}: ${detail}`); summary.push(`FALLO ${step}: ${detail}`); }
function info(step, detail) { console.log(`INFO ${step}: ${detail}`); summary.push(`INFO ${step}: ${detail}`); }
async function paso(step, fn) { try { await fn(); ok(step); } catch (error) { fail(step, (error && error.message) ? error.message : String(error)); } }

const SHOT_DIR = '/tmp/nexus_checks/qa';
try { mkdirSync(SHOT_DIR, { recursive: true }); } catch { /* evidencia para humanos; no condiciona el check */ }

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(String(error)));

async function shot(stepTag) {
    try { await page.screenshot({ path: path.join(SHOT_DIR, `qa680_${stepTag}.png`) }); } catch { /* solo para humanos */ }
}

const copyButton = () => page.locator('#fhSegExportBridgeRawBtn');
const lineCard = () => page.locator(`input[name="fhSegLineCardSelection"][value="${P1.line}"]`);
const pick = (id, value) => page.selectOption('#' + id, value);
const clickChip = (name, value) => page.click(`.mg-chip[data-mg-name="${name}"][data-mg-value="${value}"]`);
const SCREEN_PREFIX = /^Resultado Morisky-Green:\s*/;
const screenLabelsSeen = new Set();

async function moriskyScreen() {
    const state = await page.evaluate(() => {
        const el = document.getElementById('fhSegMoriskyResultado');
        return {
            text: el ? (el.textContent || '').trim() : null,
            classes: el ? Array.prototype.slice.call(el.classList).filter((name) => name.indexOf('mg-result--') === 0) : []
        };
    });
    assert.ok(state.text !== null, 'visible #fhSegMoriskyResultado');
    const label = state.text.replace(SCREEN_PREFIX, '');
    screenLabelsSeen.add(label);
    return { label, classes: state.classes };
}

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
    const rows = tsv.split('\n').filter((text) => text !== '').map((text) => {
        const cells = text.split('\t');
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

async function exportSurfaces() {
    const model = await page.evaluate(() => {
        const built = window.FarmaciaSeguimiento.buildFollowupVisitExportModel();
        return (built && built.evaluated_lines || []).map((item) => ({ line_id: item.line_id, morisky: item.morisky, morisky_result: item.morisky_result }));
    });
    const mineModel = model.filter((item) => item.line_id === P1.line);
    assert.equal(mineModel.length, 1, 'la línea aparece una vez en el modelo de export');
    const informe = await page.evaluate(() => window.FarmaciaSeguimiento.buildSegLines()
        .map(String).filter((text) => text.indexOf('Adherencia Morisky-Green:') === 0));
    assert.equal(informe.length, 1, 'una línea de Morisky en el informe de texto');
    const csv = await page.evaluate(() => {
        const S = window.FarmaciaSeguimiento;
        const header = window.FarmaciaExcelRowExport.WO8_COLUMNS.slice();
        const rows = S.buildFollowupExcelRows(S.buildFollowupVisitExportModel(), { eaLegacyProjection: true }).map((row) => row.slice());
        return { header, rows };
    });
    const idIndex = csv.header.indexOf('linea_id');
    const moriskyIndex = csv.header.indexOf('adherencia_morisky');
    assert.ok(idIndex >= 0 && moriskyIndex >= 0, 'columnas linea_id y adherencia_morisky presentes');
    const mineRows = csv.rows.filter((row) => row[idIndex] === P1.line);
    assert.equal(mineRows.length, 1, 'una fila de la plantilla Excel para la línea');
    return {
        modelResult: mineModel[0].morisky_result,
        informe: informe[0].split('Adherencia Morisky-Green:')[1].trim(),
        csvMorisky: mineRows[0][moriskyIndex]
    };
}

const caseRecords = [];
async function assertCompleteCase(caso, expected) {
    const screen = await moriskyScreen();
    assert.equal(screen.label, expected.label, `etiqueta de pantalla '${screen.label}'`);
    assert.deepEqual(screen.classes, [expected.cls], `clases de pantalla ${JSON.stringify(screen.classes)}`);
    const bridge = await copyAndRead();
    assert.equal(bridge.line.adherence_result, expected.label, `bridge adherence_result '${bridge.line.adherence_result}'`);
    const surfaces = await exportSurfaces();
    caseRecords.push({
        caso,
        pantalla: screen.label,
        modelo_moriskyResultFromAnswers: surfaces.modelResult,
        informe: surfaces.informe,
        excel_adherencia_morisky: surfaces.csvMorisky,
        bridge: bridge.line.adherence_result
    });
    return { bridge, surfaces };
}

try {
    await openSeguimientoForP1();

    await paso('paso 1 sin responder: pendiente de completar, sin clase y export «not_recorded»', async () => {
        assert.equal(await lineCard().isChecked(), true, 'la línea activa declarada está marcada');
        await shot('paso1');
        const screen = await moriskyScreen();
        assert.equal(screen.label, 'pendiente de completar', `etiqueta '${screen.label}'`);
        assert.deepEqual(screen.classes, [], `clases ${JSON.stringify(screen.classes)}`);
        const { tsv, line } = await copyAndRead();
        assert.equal(line.adherence_collection_status, 'not_recorded', `adherence_collection_status '${line.adherence_collection_status}'`);
        assert.equal(line.adherence_result, null, `adherence_result '${line.adherence_result}'`);
        assert.ok(!tsv.includes('alta adherencia'), 'no aparece «alta adherencia» en el export');
    });

    await paso('paso 2 incompleto (solo mg1 y mg2): sigue pendiente y el export no trae resultado de adherencia', async () => {
        await clickChip('mg1', 'no');
        await clickChip('mg2', 'si');
        await shot('paso2');
        const screen = await moriskyScreen();
        assert.equal(screen.label, 'pendiente de completar', `etiqueta '${screen.label}'`);
        assert.deepEqual(screen.classes, [], `clases ${JSON.stringify(screen.classes)}`);
        const { tsv, line } = await copyAndRead();
        assert.equal(line.adherence_result, null, `bridge adherence_result '${line.adherence_result}'`);
        assert.ok(!tsv.includes('alta adherencia'), 'no se convierte en adherencia buena');
    });

    await paso('paso 3 completo con las 4 correctas: alta adherencia y mg-result--high', async () => {
        await pick('fhSegDispensado', 'si'); // para que la línea entre en las filas Excel (proms.morisky_green)
        await clickChip('mg3', 'no');
        await clickChip('mg4', 'no');
        await shot('paso3');
        const { bridge } = await assertCompleteCase('C0 4 correctas', { label: 'alta adherencia', cls: 'mg-result--high' });
        assert.deepEqual(bridge.line.adherence_answers_json, { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' }, 'respuestas exactas en el export');
        assert.equal(bridge.line.adherence_instrument, 'morisky_green', `instrumento '${bridge.line.adherence_instrument}'`);
    });

    await paso('paso 4 completo con 1 y con 2 incorrectas: adherencia media / parcial y mg-result--medium', async () => {
        await clickChip('mg4', 'si');
        await shot('paso4a');
        const conUna = await assertCompleteCase('C1 1 incorrecta', { label: 'adherencia media / parcial', cls: 'mg-result--medium' });
        assert.equal(conUna.bridge.line.adherence_answers_json.mg4, 'si', 'la incorrecta registrada viaja');
        await clickChip('mg3', 'si');
        await shot('paso4b');
        const conDos = await assertCompleteCase('C2 2 incorrectas', { label: 'adherencia media / parcial', cls: 'mg-result--medium' });
        assert.equal(conDos.bridge.line.adherence_answers_json.mg3, 'si', 'la segunda incorrecta viaja');
    });

    await paso('paso 5 (1/2) completo con 3 incorrectas: baja adherencia y mg-result--low', async () => {
        await clickChip('mg2', 'no');
        await shot('paso5a');
        await assertCompleteCase('C3 3 incorrectas', { label: 'baja adherencia', cls: 'mg-result--low' });
    });

    await paso('paso 7 cambiar una respuesta tras completar: etiqueta y export actualizados, sin valor viejo', async () => {
        await clickChip('mg2', 'si'); // vuelve a la correcta: 3 -> 2 incorrectas, baja -> media con UN cambio
        await shot('paso7');
        const screen = await moriskyScreen();
        assert.equal(screen.label, 'adherencia media / parcial', `etiqueta tras cambiar '${screen.label}'`);
        assert.deepEqual(screen.classes, ['mg-result--medium'], `clases tras cambiar ${JSON.stringify(screen.classes)}`);
        const { tsv, line } = await copyAndRead();
        assert.equal(line.adherence_answers_json.mg2, 'si', 'el export trae la respuesta nueva');
        assert.equal(line.adherence_result, 'adherencia media / parcial', `resultado tras cambiar '${line.adherence_result}'`);
        assert.ok(!tsv.includes('baja adherencia'), 'no queda el valor viejo en el export');
        await assertCompleteCase('C7 tras cambiar mg2', { label: 'adherencia media / parcial', cls: 'mg-result--medium' });
    });

    await paso('paso 5 (2/2) completo con 4 incorrectas: baja adherencia y mg-result--low', async () => {
        await clickChip('mg1', 'si');
        await clickChip('mg2', 'no');
        await shot('paso5b');
        const { bridge } = await assertCompleteCase('C4 4 incorrectas', { label: 'baja adherencia', cls: 'mg-result--low' });
        assert.deepEqual(bridge.line.adherence_answers_json, { mg1: 'si', mg2: 'no', mg3: 'si', mg4: 'si' }, 'respuestas exactas (4 incorrectas)');
    });

    await paso('paso 6 etiqueta de pantalla == export en cada caso completo', async () => {
        assert.ok(caseRecords.length >= 5, `casos completos registrados: ${caseRecords.length}`);
        const mismatches = [];
        for (const record of caseRecords) {
            for (const surface of ['modelo_moriskyResultFromAnswers', 'informe', 'excel_adherencia_morisky', 'bridge']) {
                if (record[surface] !== record.pantalla) mismatches.push(`${record.caso}: pantalla '${record.pantalla}' vs ${surface} '${record[surface]}'`);
            }
        }
        assert.deepEqual(mismatches, [], mismatches.join(' ; '));
    });

    try {
        const python = readFileSync(path.join(ROOT, 'scripts', 'build_excel_template.py'), 'utf8');
        const match = python.match(/["']adherencia_morisky["']\s*:\s*\[([^\]]*)\]/);
        assert.ok(match, 'lista «adherencia_morisky» no encontrada en scripts/build_excel_template.py');
        const accepted = match[1].split(',').map((piece) => piece.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        const seguimiento = Array.from(screenLabelsSeen).sort();
        const coincide = accepted.length === seguimiento.length && accepted.every((value) => seguimiento.indexOf(value) >= 0);
        info('paso 8', `plantilla Excel acepta adherencia_morisky [${accepted.join(', ')}] | Seguimiento produce [${seguimiento.join(', ')}] | coinciden: ${coincide ? 'SÍ' : 'NO (sospecha confirmada: Alta/Media/Baja/No evaluada vs alta adherencia/...)'}`);
    } catch (error) {
        fail('paso 8', (error && error.message) ? error.message : String(error));
    }

    try {
        const html = readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
        const htmlHits = (html.match(/educaci/gi) || []).length;
        const domHits = await page.evaluate(() => {
            const found = [];
            document.querySelectorAll('label, [id], [for]').forEach((el) => {
                const id = el.id || '';
                const labelFor = el.getAttribute('for') || '';
                const text = el.tagName === 'LABEL' ? (el.textContent || '').trim() : '';
                if (/educaci/i.test(id) || /educaci/i.test(labelFor) || /educaci/i.test(text)) {
                    found.push(el.tagName.toLowerCase() + (id ? '#' + id : ''));
                }
            });
            return found;
        });
        info('paso 9', `campo de educación en farmacia_seguimiento.html: ${htmlHits === 0 && domHits.length === 0 ? 'NO existe (0 coincidencias de «educaci» en el HTML y en el DOM)' : `coincidencias: ${htmlHits} en HTML; DOM: ${domHits.join(', ')}`}`);
    } catch (error) {
        fail('paso 9', (error && error.message) ? error.message : String(error));
    }

    await paso('consola sin errores (console.error y pageerror)', async () => {
        assert.deepEqual(consoleErrors, [], 'console.error');
        assert.deepEqual(pageErrors, [], 'pageerror');
    });
} finally {
    await browser.close();
    server.close();
}

console.log('RESUMEN qa680 (Morisky-Green Seguimiento):');
summary.forEach((text) => console.log('  ' + text));
console.log(`farmacia_qa680_morisky_browser_check: ${okCount} OK, ${failLines.length} FALLO`);
process.exit(failLines.length > 0 ? 1 : 0);
