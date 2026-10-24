// Oráculo Metis FH-EA-03 · unidad 5/5 causality-export-guards.
//
// Guardias de no entrega y aviso visible de edición no guardada
// (farmacia_seguimiento.html real, Chromium/Playwright, datos sintéticos y
// SOLO interacciones soportadas; restoreEvaluationState solo como seam
// técnico identificado — tiene llamador real en farmacia_evaluation_ledger —
// para la visita reconstituida cuya máquina legacy singular apunta al
// sospechoso en edición):
//   · P1-3 (C09): sesión de UN único EA incorporado. ANTES de tocar un
//     cuestionario y DESPUÉS de registrar un borrador Naranjo G0, las
//     representaciones TXT (buildSegLines), Excel
//     (buildFollowupExcelRows(buildFollowupVisitExportModel())), CSV
//     (buildFollowupCsv(...)), la proyección v2 (seam de solo lectura
//     buildFollowupV2ProjectionFromCurrentContext) y el snapshot del acto
//     buildEaActBlockSnapshot() son ESTRUCTURALMENTE IGUALES: el borrador de
//     causalidad no cambia ninguna salida, no hay puntuación provisional ni
//     categoría formal presentada como evaluación, nada declara «persisted»
//     y el snapshot no contiene causalidad.
//   · C09: la causalidad en edición NO se guarda en sessionStorage ni
//     localStorage tras el recorrido completo de edición.
//   · Aviso visible en español con contexto de evaluación (sin interacción y
//     con borrador): reutiliza la semántica T01 (la edición no forma parte
//     del acto preparado ni se ha guardado/exportado) y añade que las
//     puntuaciones y categorías de Naranjo/Karch mostradas son provisionales
//     y NO constituyen evaluación clínica formal registrada.
//   · Visita reconstituida (seam): aunque la máquina legacy singular
//     (adverse_event.suspect_ids + causality_editing_id) apunte al sospechoso
//     en edición, NINGUNA exportación presenta el borrador G0 como causalidad
//     evaluada: antes y después del borrador las salidas son iguales y sin
//     puntuación/categoría formal; la proyección v2 falla cerrada o sale
//     limpia. En BASE el borrador entra como «Naranjo <n> · <categoría>» en
//     TXT/CSV/Excel (defecto reproducido).
//   · Negativo de cardinalidad conservado: con 2 EA incorporados y borrador,
//     los intentos reales de exportar (botones TXT/CSV/Excel) y de copiar v2
//     mantienen el bloqueo visible y NO pierden los borradores en memoria.
//
// En BASE este oráculo es RED por capacidad ausente (aserciones, no
// excepciones): el aviso está oculto con contexto en edición sin interacción
// y el borrador G0 se exporta como causalidad evaluada en la visita
// reconstituida.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_ea03_export_guards_loader.cjs'))('playwright');
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
        .filter(entry => entry.startsWith('chromium_headless_shell-'))
        .sort().reverse()
        .map(entry => path.join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
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

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

const ALFA = 'other:seg-other-1';
const EP = 'FH-EA-EP-0001';
const DRUG_LABEL = 'Medicamento Alfa Sintético';
const RESTORED_LINE_ID = 'SYN-EXPORT-GUARDS-L1';

async function openPage() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
    return { context, page, consoleErrors, pageErrors };
}

async function buildOneEaOneSuspect(page) {
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill('Cefalea');
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
    await page.click('#btnSegAddOtherDrug');
    await page.locator('#segOtrosFarmacosList .other-drug-card').first().locator('input[data-field="farmaco"]').fill(DRUG_LABEL);
    await card.locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
    await page.waitForFunction(() => {
        const suspect = document.getElementById('fhCausalitySuspect');
        return suspect && Array.from(suspect.options).some((option) => option.value !== '');
    }, null, { timeout: 5000 });
}

async function selectContext(page) {
    await page.selectOption('#fhCausalityEpisode', EP);
    await page.selectOption('#fhCausalitySuspect', ALFA);
}

async function selectAndDispenseFirstLine(page) {
    await page.locator('.seg-line-card__control').first().check();
    await page.selectOption('#fhSegDispensado', 'si');
    await page.waitForFunction(() => {
        const txt = document.getElementById('fhSegExportTxt');
        const csv = document.getElementById('fhSegExportCsv');
        const excel = document.getElementById('fhSegExcelExportBtn');
        return txt && !txt.disabled && csv && !csv.disabled && excel && !excel.disabled;
    }, null, { timeout: 5000 });
}

// Lectura estructural de las representaciones por el seam soportado de solo
// lectura: SIN crear acto, SIN guardar y SIN exportar (P1-3).
async function captureRepresentations(page) {
    return page.evaluate(() => {
        const S = window.FarmaciaSeguimiento;
        const columns = window.FarmaciaExcelRowExport.WO8_COLUMNS;
        const naranjoIndex = columns.indexOf('causalidad_naranjo');
        const karchIndex = columns.indexOf('causalidad_karch');
        const rows = S.buildFollowupExcelRows(S.buildFollowupVisitExportModel());
        let v2;
        try {
            v2 = 'OK:' + JSON.stringify(S.buildFollowupV2ProjectionFromCurrentContext());
        } catch (error) {
            v2 = 'THROW:' + String((error && error.message) || error);
        }
        return {
            txt: S.buildSegLines().join('\n'),
            excel: JSON.stringify(rows),
            excelCausalityCells: rows.map((row) => [row[naranjoIndex], row[karchIndex]]),
            csv: S.buildFollowupCsv(S.buildFollowupVisitExportModel()),
            v2: v2,
            eaBlock: JSON.stringify(S.buildEaActBlockSnapshot())
        };
    });
}

function parseCsvRows(csv) {
    return String(csv).split('\n').map((line) => {
        const cells = [];
        let current = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (quoted) {
                if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (char === '"') quoted = false;
                else current += char;
            } else if (char === '"') quoted = true;
            else if (char === ',') { cells.push(current); current = ''; }
            else current += char;
        }
        cells.push(current);
        return cells;
    });
}

// Ausencia de puntuación provisional o categoría formal presentada como
// evaluación en las columnas de causalidad de Excel/CSV (comparación
// estructural/semántica; sin aserciones frágiles tipo «ningún dígito»).
const FORMAL_CATEGORY = /\b(Posible|Probable|Definida|Cierta)\b/;
const SCORE_PATTERN = /\d+\s*·\s*\S/;
function causalityColumnsAreClean(cells) {
    return cells.every((pair) => pair.every((cell) => {
        const value = String(cell == null ? '' : cell);
        return !SCORE_PATTERN.test(value) && !FORMAL_CATEGORY.test(value);
    }));
}

async function storagesAreFreeOfCausality(page) {
    return page.evaluate(() => {
        const dump = (store) => Object.keys(store).map((key) => key + '=' + String(store.getItem(key)));
        const pattern = /causality|causalidad|naranjo|karch/i;
        return [].concat(dump(sessionStorage), dump(localStorage)).filter((entry) => pattern.test(entry));
    });
}

// ─── Sesión 1 · P1-3: un único EA — igualdad antes/después del borrador, ────
//     ausencia de evaluación formal, aviso visible, sin almacenamiento.

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        await buildOneEaOneSuspect(page);
        await selectContext(page);
        await page.waitForTimeout(200);

        // ── Aviso visible con contexto de evaluación SIN interacción ──
        const aviso = page.locator('#fhCausalityAvisoProvisional');
        assert.ok(await aviso.isVisible(), 'C09: el aviso de edición no guardada es visible con contexto de evaluación y sin interacción');
        const avisoText = (await aviso.textContent()).trim();
        assert.ok(/provisional/i.test(avisoText), 'el aviso declara la provisionalidad de las puntuaciones y categorías mostradas');
        assert.ok(/no constituyen una evaluación clínica formal registrada/i.test(avisoText), 'el aviso niega la evaluación clínica formal registrada');
        assert.ok(/no forman parte del acto preparado|no forma parte del acto preparado/i.test(avisoText), 'el aviso reutiliza la semántica T01: la edición no forma parte del acto preparado');
        assert.ok(/no se ha guardado ni exportado/i.test(avisoText), 'el aviso reutiliza la semántica T01: no se ha guardado ni exportado nada');
        ok('C09: the section shows a visible Spanish notice (editing not saved/exported, provisional Naranjo/Karch results are no formal clinical evaluation) as soon as an editing context exists');

        // Línea seleccionada y dispensada: la comparación Excel/CSV deja de ser trivial.
        await selectAndDispenseFirstLine(page);

        const before = await captureRepresentations(page);
        // Borrador Naranjo G0 registrado (dos respuestas explícitas).
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip[data-value="si"]');
        await page.waitForTimeout(200);
        const after = await captureRepresentations(page);

        // ── Igualdad estructural antes/después: el borrador no cambia salidas ──
        assert.equal(after.txt, before.txt, 'P1-3: buildSegLines() es idéntico antes y después del borrador Naranjo');
        assert.equal(after.excel, before.excel, 'P1-3: buildFollowupExcelRows(buildFollowupVisitExportModel()) es idéntico antes y después del borrador');
        assert.equal(after.csv, before.csv, 'P1-3: buildFollowupCsv(buildFollowupVisitExportModel()) es idéntico antes y después del borrador');
        assert.equal(after.v2, before.v2, 'P1-3: la proyección v2 (seam de solo lectura) es idéntica antes y después del borrador');
        assert.equal(after.eaBlock, before.eaBlock, 'P1-3: buildEaActBlockSnapshot() es idéntico antes y después del borrador');
        ok('P1-3: registering a Naranjo G0 draft changes none of the TXT/Excel/CSV/v2/act-block representations');

        // ── Ausencia de puntuación provisional / categoría formal en todas ──
        assert.ok(!/Naranjo\s+\d/.test(after.txt), 'el TXT no presenta ninguna puntuación de causalidad como evaluación');
        assert.ok(causalityColumnsAreClean(after.excelCausalityCells), 'las columnas causalidad_naranjo/causalidad_karch de Excel no contienen puntuación ni categoría formal');
        const csvRows = parseCsvRows(after.csv);
        const csvHeader = csvRows[0] || [];
        const csvNaranjoIndex = csvHeader.indexOf('causalidad_naranjo');
        const csvKarchIndex = csvHeader.indexOf('causalidad_karch');
        assert.ok(csvNaranjoIndex >= 0 && csvKarchIndex >= 0, 'el CSV conserva las columnas de causalidad del contrato WO8');
        assert.ok(causalityColumnsAreClean(csvRows.slice(1).map((row) => [row[csvNaranjoIndex], row[csvKarchIndex]])), 'las columnas de causalidad del CSV no contienen puntuación ni categoría formal');
        assert.ok(!/Naranjo|Karch|causalidad/i.test(after.v2.replace(/^OK:/, '').replace(/^THROW:[\s\S]*/, '')), 'la proyección v2 no contiene contenido de causalidad');
        const eaBlockParsed = JSON.parse(after.eaBlock);
        assert.ok(!/naranjo|karch|causal|final_assessment/i.test(Object.keys(eaBlockParsed).join('|')), 'el snapshot del acto preparado no contiene claves de causalidad');
        assert.equal(eaBlockParsed.event_count, 1, 'el snapshot representa exactamente el EA incorporado');
        ok('C09: no representation presents a provisional score or a formal category as an evaluated causality, and the prepared act block carries no causality');

        // ── Nada declara «persisted» ──
        const everything = [after.txt, after.csv, after.excel, after.v2, after.eaBlock].join('\n');
        assert.ok(!/persisted|persistido/i.test(everything), 'ninguna representación declara el estado como persisted/persistido');
        ok('C09: nothing in the representations declares itself persisted');

        // ── Sin almacenamiento de la causalidad en edición ──
        const storageHits = await storagesAreFreeOfCausality(page);
        assert.deepEqual(storageHits, [], 'sessionStorage/localStorage no contienen contenido de la causalidad en edición tras el recorrido completo');
        ok('C09: editing causality is never written to sessionStorage/localStorage during the full editing journey');

        // ── El borrador en memoria no se pierde por construir representaciones ──
        const draft = await page.evaluate(({ ep, alfa }) =>
            window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'), { ep: EP, alfa: ALFA });
        assert.equal(draft.status, 'borrador_en_edicion', 'el borrador G0 sigue en memoria de edición');
        assert.deepEqual(draft.answers, { q1: 'si', q2: 'si' }, 'las respuestas exactas del borrador se conservan tras construir todas las representaciones');
        assert.ok(await aviso.isVisible(), 'el aviso sigue visible con el borrador activo');
        ok('C09: export model builds never lose the in-memory draft; the notice remains visible');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 1: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 1 export guards', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión 2 · visita reconstituida (seam técnico identificado): la máquina ─
//     legacy singular apunta al sospechoso en edición y NINGUNA exportación
//     presenta el borrador G0 como causalidad evaluada.

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        await buildOneEaOneSuspect(page);
        const visitId = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit().visit_id);
        await page.evaluate(({ visitId, ep, alfa, lineId }) => {
            window.FarmaciaSeguimiento.restoreEvaluationState({
                current_visit: {
                    cip: 'CIP-DEMO-FH-001', visit_id: visitId,
                    selected_line_ids: [lineId], dispensed_line_ids: [lineId], editing_line_id: lineId,
                    adverse_event: { present: 'si', suspect_ids: [alfa], causality_editing_id: alfa },
                    adverse_events: [{ episode_id: ep, observation_id: 'FH-EA-OBS-0001', suspect_ids: [alfa], status: 'incorporated', description: 'Cefalea', evolution: 'no_consta', severity: '', expanded: true }],
                    causality_by_suspect: {}
                },
                canonical_lines: [{ linea_id: lineId, nombre_linea: 'Línea Sintética Export', farmaco_nombre: 'Línea Sintética Export', principio_activo: 'Sintetina', dosis: '10 mg', via: 'IV', estado_linea: 'active', tipo_relacion: 'principal', pauta_label: 'Semanal' }],
                related_treatments: [{ uid: 'seg-other-1', farmaco: 'Medicamento Alfa Sintético', relationType: 'relacionado' }]
            });
        }, { visitId, ep: EP, alfa: ALFA, lineId: RESTORED_LINE_ID });
        await page.waitForTimeout(300);
        await selectContext(page);
        const chip = page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        assert.ok(await chip.isEnabled(), 'el contexto reconstituido con la fuente idéntica mantiene la evaluación operativa');

        const before = await captureRepresentations(page);
        await chip.click();
        await page.waitForTimeout(200);
        const after = await captureRepresentations(page);

        // ── RED en BASE: el borrador entra como «Naranjo <n> · <categoría>» ──
        assert.equal(after.txt, before.txt, 'C09: buildSegLines() no cambia al registrarse el borrador en la visita reconstituida');
        assert.equal(after.excel, before.excel, 'C09: las filas Excel no cambian al registrarse el borrador en la visita reconstituida');
        assert.equal(after.csv, before.csv, 'C09: el CSV no cambia al registrarse el borrador en la visita reconstituida');
        assert.ok(!/Naranjo\s+\d/.test(after.txt), 'C09: el TXT no presenta la puntuación provisional del borrador G0 como causalidad evaluada');
        assert.ok(causalityColumnsAreClean(after.excelCausalityCells), 'C09: las columnas de causalidad de Excel no presentan el borrador G0 como evaluación formal');
        const csvRows = parseCsvRows(after.csv);
        const csvHeader = csvRows[0] || [];
        const csvNaranjoIndex = csvHeader.indexOf('causalidad_naranjo');
        const csvKarchIndex = csvHeader.indexOf('causalidad_karch');
        assert.ok(csvNaranjoIndex >= 0 && csvKarchIndex >= 0, 'el CSV conserva las columnas de causalidad del contrato WO8');
        assert.ok(causalityColumnsAreClean(csvRows.slice(1).map((row) => [row[csvNaranjoIndex], row[csvKarchIndex]])), 'C09: las columnas de causalidad del CSV no presentan el borrador G0 como evaluación formal');
        assert.ok(after.v2.indexOf('THROW:') === 0 || !/Naranjo|Karch|causalidad/i.test(after.v2.replace(/^OK:/, '')), 'C09: la proyección v2 falla cerrada o sale sin contenido de causalidad');
        assert.equal(JSON.parse(after.eaBlock).event_count, 1, 'el snapshot del acto sigue representando el EA incorporado');
        ok('C09: a reconstituted visit pointing the legacy singular machine at the editing suspect never exports the G0 draft as an evaluated causality');

        // ── El borrador en memoria no se pierde ──
        const draft = await page.evaluate(({ ep, alfa }) =>
            window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'), { ep: EP, alfa: ALFA });
        assert.equal(draft.status, 'borrador_en_edicion', 'el borrador G0 permanece en memoria de edición tras construir las representaciones');
        assert.deepEqual(draft.answers, { q1: 'si' }, 'la respuesta exacta del borrador se conserva');
        assert.ok(await page.locator('#fhCausalityAvisoProvisional').isVisible(), 'el aviso de edición no guardada sigue visible con el borrador activo');
        ok('C09: the in-memory draft survives every export representation build in the reconstituted visit');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 2: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 2 reconstituted visit', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión 3 · negativo de cardinalidad conservado: 2 EA + borrador, los ────
//     intentos reales de exportar mantienen el bloqueo sin perder borradores.

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        let card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Cefalea');
        await card.getByRole('button', { name: 'Incorporar al acto' }).click();
        await page.click('#btnSegAddOtherDrug');
        await page.locator('#segOtrosFarmacosList .other-drug-card').first().locator('input[data-field="farmaco"]').fill(DRUG_LABEL);
        await card.locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await page.click('#fhSegAddEaBtn');
        card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Mialgia');
        await card.getByRole('button', { name: 'Incorporar al acto' }).click();
        await page.waitForTimeout(200);
        await selectContext(page);
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await selectAndDispenseFirstLine(page);

        // ── Intento real de exportar TXT/CSV/Excel: bloqueo de cardinalidad ──
        await page.click('#fhSegExportTxt');
        await page.waitForTimeout(150);
        let notice = page.locator('#fhSegEaExportGuardNotice');
        assert.ok(await notice.isVisible(), 'el intento de exportar TXT con 2 EA mantiene el bloqueo visible');
        let noticeText = (await notice.textContent()).trim();
        assert.ok(/2 EA incorporados/.test(noticeText), 'el aviso de bloqueo explica la cardinalidad 0..N del formato singular');
        assert.ok(/Exportación no realizada/.test(noticeText), 'el aviso declara que no se ha entregado nada');
        await page.click('#fhSegExportCsv');
        await page.waitForTimeout(150);
        assert.ok(await notice.isVisible(), 'el intento de exportar CSV con 2 EA mantiene el bloqueo visible');
        await page.click('#fhSegExcelExportBtn');
        await page.waitForTimeout(150);
        assert.ok(await notice.isVisible(), 'el intento de exportar Excel con 2 EA mantiene el bloqueo visible');
        ok('negative: with two incorporated EA the real TXT/CSV/Excel export attempts stay visibly blocked (cardinality guard preserved)');

        // ── Intento real de copia v2: bloqueo por cobertura EA ──
        await page.click('#fhSegExportV2Btn');
        await page.waitForTimeout(300);
        const v2Status = (await page.locator('#fhSegExportV2Status').textContent()).trim();
        assert.ok(/Copia no realizada/.test(v2Status), 'el intento de copia v2 con cobertura EA mantiene su bloqueo visible');
        assert.ok(await notice.isVisible(), 'el aviso de frontera EA sigue visible tras el intento v2');
        ok('negative: the v2 copy attempt with EA coverage stays visibly blocked');

        // ── Los intentos no pierden borradores ni preparan el acto con causalidad ──
        const finalState = await page.evaluate(({ ep, alfa }) => ({
            draft: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            blockReason: window.FarmaciaSeguimiento.getEaSingularExportBlockReason(),
            snapshot: window.FarmaciaSeguimiento.buildEaActBlockSnapshot(),
            modelReason: (window.FarmaciaSeguimiento.buildFollowupVisitExportModel() || {}).ea_singular_export_block_reason || ''
        }), { ep: EP, alfa: ALFA });
        assert.equal(finalState.draft.status, 'borrador_en_edicion', 'los intentos de exportación no pierden el borrador en memoria');
        assert.deepEqual(finalState.draft.answers, { q1: 'si' }, 'las respuestas del borrador se conservan íntegras');
        assert.ok(finalState.blockReason.length > 0 && finalState.modelReason.length > 0, 'la frontera singular sigue activa por el seam y en el modelo de exportación');
        assert.equal(finalState.snapshot.event_count, 2, 'el acto preparado representa los 2 EA incorporados');
        assert.ok(!/naranjo|karch|causal|final_assessment/i.test(Object.keys(finalState.snapshot).join('|')), 'el snapshot del acto con borrador activo sigue sin contenido de causalidad');
        const storageHits = await storagesAreFreeOfCausality(page);
        assert.deepEqual(storageHits, [], 'tras los intentos de exportación sessionStorage/localStorage siguen sin contenido de causalidad');
        assert.ok(await page.locator('#fhCausalityAvisoProvisional').isVisible(), 'el aviso de edición no guardada sigue visible tras los intentos bloqueados');
        ok('C09: blocked export attempts keep the in-memory drafts, the act block and the storages free of editing causality');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 3: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 3 cardinality negative', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nCAUSALITY-EXPORT-GUARDS: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
