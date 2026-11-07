#!/usr/bin/env node
// Check de navegador EA v1 demo (#867), Tramo E2: la copia 166 de Seguimiento
// lleva la visita completa (decisiones de Sil, 31-10-2026; adenda C1,
// «Ampliación 31-10-2026»). Viaje real: Inicio importa el libro mixto
// sintético → CIP-MIX-001 → Seguimiento → botón «Copiar Bridge raw EA 0..N».
//  - Lo que el clínico no toca viaja como «no registrado» (o vacío): un valor
//    por defecto de la pantalla nunca es un dato. Ausente ≠ NO.
//  - Un «No» elegido por el clínico SÍ es un dato y viaja como «no».
//  - La visita (estratificación, PROMs) va UNA vez, en la fila del acto; cada
//    línea revisada lleva su dispensación, movimiento, suspensión,
//    observaciones y Morisky-Green en su propia fila.
//  - El TSV pegado en el libro se relee por el camino antiguo y por el EA.
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
                return createRequire(path.join(candidate, '__fh_e2_loader.cjs'))('playwright');
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

const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-e2-'));
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

let valuesCopy = null;

try {
    await test('sin tocar nada: la visita y la línea viajan como «no registrado», nunca como el valor por defecto', async () => {
        await openSeguimientoForP1();
        assert.equal(await lineCard().isChecked(), true, 'la línea activa declarada está marcada');
        // Desmarcar y volver a marcar la línea repinta el editor con eventos
        // sintéticos: eso no es el clínico registrando nada.
        await lineCard().uncheck();
        await lineCard().check();
        await page.waitForTimeout(200);
        const { act, line, rows } = await copyAndRead();
        assert.equal(act.stratification_review_status, 'not_recorded');
        assert.equal(act.new_stratification_level, null);
        assert.equal(act.followup_proms_collection_status, 'not_recorded');
        assert.equal(act.proms_json, null);
        assert.equal(act.related_treatments_json, null);
        assert.equal(line.dispensation_status, 'not_recorded');
        assert.equal(line.therapeutic_movement_type, 'not_recorded');
        assert.equal(line.suspension_status, 'not_recorded');
        assert.equal(line.adherence_collection_status, 'not_recorded');
        ['new_dose_text', 'new_schedule_code', 'movement_reason', 'suspension_reason', 'line_observations',
            'adherence_instrument', 'adherence_result', 'adherence_answers_json'].forEach((field) => {
            assert.equal(line[field], null, field + ' vacío');
        });
        assert.equal(act.professional_display, 'Profesional FH-01', 'profesional del acto');
        const service = (await page.inputValue('#fhSegServicio')).trim() || null;
        const pathology = (await page.inputValue('#fhSegPatologia')).trim() || null;
        rows.forEach((row) => {
            assert.equal(row.service_label, service, 'servicio de la pantalla en cada fila del acto');
            assert.equal(row.pathology_label, pathology, 'patología de la pantalla en cada fila del acto');
        });
    });

    await test('un «No» elegido por el clínico sí es un dato y viaja como «no»', async () => {
        await pick('fhSegCambiaNivel', 'Sí');
        await pick('fhSegCambiaNivel', 'No');
        await pick('fhSegProms', 'No recogido');
        await pick('fhSegDispensado', 'no');
        await pick('fhSegTipoRelacionTerapia', 'sin_cambios');
        await pick('fhSegSuspension', 'No');
        const { act, line } = await copyAndRead();
        assert.equal(act.stratification_review_status, 'no');
        assert.equal(act.new_stratification_level, null);
        assert.equal(act.followup_proms_collection_status, 'no');
        assert.equal(act.proms_json, null);
        assert.equal(line.dispensation_status, 'not_dispensed');
        assert.equal(line.therapeutic_movement_type, 'no_change_recorded');
        assert.equal(line.suspension_status, 'no');
        assert.equal(line.adherence_collection_status, 'not_recorded', 'Morisky sin responder sigue sin registrar');
    });

    await test('un «No» registrado en la línea cuenta como dato al desmarcarla (pide confirmación)', async () => {
        dialogs.length = 0;
        dismissNextDialog = true;
        // clic (no uncheck): al cancelar, la tarjeta se repinta marcada al instante.
        await lineCard().click();
        await page.waitForTimeout(200);
        assert.equal(dialogs.length, 1, 'se pide confirmación antes de descartar');
        assert.match(dialogs[0], /contiene datos introducidos/);
        assert.equal(await lineCard().isChecked(), true, 'al cancelar, la línea sigue revisada');
        const { line } = await copyAndRead();
        assert.equal(line.suspension_status, 'no', 'y conserva su «No»');
    });

    await test('valores registrados: estratificación y PROMs en el acto; dispensación, movimiento y Morisky en la línea', async () => {
        // Independiente del caso anterior: la línea vuelve a estar revisada.
        if (!(await lineCard().isChecked())) { await lineCard().check(); await page.waitForTimeout(200); }
        await pick('fhSegCambiaNivel', 'Sí');
        await pick('fhSegNuevoNivel', 'Nivel 2');
        await pick('fhSegProms', 'Sí, recoger DLQI + EVA dolor/prurito');
        await page.waitForSelector('#fhSegPromsExpanded:not(.hidden)');
        await page.locator('input[name="dlqi_q1"]').first().check();
        await page.locator('#fhSegEvaDolorRange').fill('6');
        await pick('fhSegDispensado', 'si');
        await pick('fhSegTipoRelacionTerapia', 'optimizacion');
        await pick('fhSegOptimiza', 'Sí');
        await page.fill('#fhSegNuevaDosis', '80 mg sintético');
        await pick('fhSegMotivoOpt', 'Ajuste por peso');
        await page.fill('#fhSegObservacionesLinea', 'Observación sintética de línea');
        for (const [name, value] of [['mg1', 'no'], ['mg2', 'si'], ['mg3', 'no'], ['mg4', 'no']]) {
            await page.click(`.mg-chip[data-mg-name="${name}"][data-mg-value="${value}"]`);
        }
        valuesCopy = await copyAndRead();
        const { act, line, rows } = valuesCopy;
        assert.equal(act.stratification_review_status, 'yes');
        assert.equal(act.new_stratification_level, 'Nivel 2');
        assert.equal(act.followup_proms_collection_status, 'yes');
        assert.ok(Array.isArray(act.proms_json), 'proms_json es una lista');
        assert.deepEqual(act.proms_json.map((prom) => prom.instrument), ['DLQI', 'EVA_DOLOR'], 'EVA prurito sin tocar no viaja');
        const dlqi = act.proms_json[0];
        assert.equal(dlqi.complete, false);
        assert.equal(dlqi.answeredCount, 1);
        assert.equal(dlqi.answers.length, 1);
        assert.equal(dlqi.answers[0].item, 1);
        assert.equal(dlqi.value, dlqi.answers[0].score);
        assert.deepEqual(act.proms_json[1], { instrument: 'EVA_DOLOR', value: 6, complete: true, answeredCount: 1, answers: null });
        assert.equal(line.dispensation_status, 'dispensed');
        assert.equal(line.therapeutic_movement_type, 'dose_change');
        assert.equal(line.new_dose_text, '80 mg sintético');
        assert.equal(line.new_schedule_code, null, 'sin pauta nueva anotada');
        assert.equal(line.movement_reason, 'Ajuste por peso');
        assert.equal(line.suspension_status, 'no');
        assert.equal(line.line_observations, 'Observación sintética de línea');
        assert.equal(line.adherence_collection_status, 'yes');
        assert.equal(line.adherence_instrument, 'morisky_green');
        assert.equal(line.adherence_result, 'alta adherencia');
        assert.deepEqual(line.adherence_answers_json, { mg1: 'no', mg2: 'si', mg3: 'no', mg4: 'no' });
        rows.filter((row) => row.row_role !== 'followup_act').forEach((row) => {
            VISIT_FIELDS.forEach((field) => assert.equal(row[field], null, `${row.row_role} no repite ${field}`));
        });
        rows.filter((row) => row.row_role !== 'followup_line').forEach((row) => {
            LINE_CONTENT_FIELDS.forEach((field) => assert.equal(row[field], null, `${row.row_role} no lleva ${field}`));
        });
    });

    await test('el TSV pegado en el libro se relee: visita y línea por el camino antiguo, EA por el nuevo', async () => {
        const src = mixed.source({ extraDermaTsv: [valuesCopy.tsv] });
        const sourceEventId = valuesCopy.act.source_event_id;
        const proms = (src.getProms(P1.pid) || []).filter((record) => record.source_event_id === sourceEventId && record.values.proms_json !== null);
        assert.equal(proms.length, 1, 'PROMs del acto una sola vez');
        assert.deepEqual(proms[0].values.proms_json, valuesCopy.act.proms_json);
        const latest = (src.getVisitsAndLines(P1.pid) || {}).latest_followup;
        assert.ok(latest && latest.source_event_id === sourceEventId, 'el acto copiado es el último seguimiento');
        const canonical = (latest.rows || []).map((row) => row.canonical_row);
        const lineRow = canonical.find((row) => row.line_id === P1.line);
        assert.equal(lineRow.dispensation_status, 'dispensed');
        assert.equal(lineRow.adherence_result, 'alta adherencia');
        const reread = global.FarmaciaPatientReadContractV2.create({ source: src }).readAdverseEventEpisodes(P1.pid);
        assert.equal(reread.outcome, 'ok');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_seguimiento_visit_content_166_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
