// Oráculo Metis FH-EA-03 · unidad 4/5 causality-status-rules.
//
// Reglas de estado del editor G0 de causalidad en Seguimiento
// (farmacia_seguimiento.html real, Chromium/Playwright, datos sintéticos y
// SOLO interacciones soportadas; restoreEvaluationState solo como seam
// técnico identificado para estados sin controles UI propios):
//   · P1-1 (C03/C04): en contexto de evaluación sin NINGUNA interacción, los
//     resúmenes visibles #resumenNaranjo y #resumenKl leen «No evaluado» y
//     excluyen «0 · Dudosa», «Dudosa» y cualquier resultado causal atribuido;
//     elegir «Causalidad final farmacéutica» NO convierte en evaluados los
//     métodos. Tras usar restoreEvaluationState con contexto sin interacción,
//     ambos resúmenes siguen en «No evaluado» sin cero/categoría por defecto
//     y SIN chips preactivados.
//   · P1-2 (C08): la restitución con un borrador legacy ajeno
//     (causality_by_suspect con final_assessment «Definida») NO presenta
//     «Definida» como valor vigente de #fhCausalidadFinal: queda «No
//     evaluada», sin contaminación del legacy en el control, en los chips ni
//     en las categorías.
//   · P2 (C06): cambio de paciente A→B→A con IDENTIFICADORES DE EPISODIO Y
//     REFERENCIA IGUALES: B no muestra cuestionarios, categorías, chips,
//     selección activa ni borradores de A; A→B→A no simula relectura de A
//     (estado no_evaluado, historial destruido, registro fail-closed); la
//     salida de A por CIP conserva la confirmación existente de datos no
//     guardados.
//   · Regresión C05: desmarcar conserva el borrador como historial en memoria
//     distinguible y volver a marcar no reactiva nada; una marca «Referencia
//     pendiente de reconciliación» mantiene la evaluación inhabilitada.
//   · Regresiones UI C01/C02/C06: presencia «No» con 0 EA (valor real del
//     select) deja la sección y los cuestionarios inactivos con explicación en
//     español; dos candidatos con la MISMA etiqueta visible y referencias
//     distintas mantienen opciones y borradores aislados (A/X vs A/Y); la
//     guardia de contradicción Sí→No con EA incorporados se conserva.
//
// En BASE este oráculo es RED por capacidad ausente: la restitución de estado
// presenta el borrador legacy («Definida», respuestas ajenas) y los valores
// por defecto como evaluación activa (aserciones, no excepciones).
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
                return createRequire(path.join(candidate, '__fh_ea03_status_rules_loader.cjs'))('playwright');
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
const ALFA_2 = 'other:seg-other-2';
const EP = 'FH-EA-EP-0001';
const NARANJO = 'naranjo';
const KARCH = 'karch_lasagna';
const SIN_EVALUADO = 'No evaluado';
const SIN_EVALUAR = 'No evaluado';

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

async function buildOneEaOneSuspect(page, drugName) {
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill('Cefalea');
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
    await page.click('#btnSegAddOtherDrug');
    await page.locator('#segOtrosFarmacosList .other-drug-card').first().locator('input[data-field="farmaco"]').fill(drugName);
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

function activeChipValues(page) {
    return page.evaluate(() => Array.prototype.map.call(
        document.querySelectorAll('#modNaranjo .causality-chip--active, #modKarchLasagna .causality-chip--active'),
        (chip) => chip.closest('.causality-chip-group').getAttribute('data-answer-id') + '=' + chip.getAttribute('data-value')
    ));
}

// ─── Sesión 1: provisionalidad sin interacción + restitución sin legacy ──────

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        // ── P1-1 · falsador 1: contexto sin NINGUNA interacción ──
        await buildOneEaOneSuspect(page, 'Medicamento Alfa Sintético');
        await selectContext(page);
        await page.waitForTimeout(200);
        const resumenNaranjo = (await page.locator('#resumenNaranjo').textContent()).trim();
        const resumenKl = (await page.locator('#resumenKl').textContent()).trim();
        assert.ok(await page.locator('#resumenNaranjo').isVisible(), '#resumenNaranjo es visible en el contexto de evaluación');
        assert.ok(await page.locator('#resumenKl').isVisible(), '#resumenKl es visible en el contexto de evaluación');
        assert.equal(resumenNaranjo, SIN_EVALUAR, 'sin interacción #resumenNaranjo lee exactamente «No evaluado»');
        assert.equal(resumenKl, SIN_EVALUAR, 'sin interacción #resumenKl lee exactamente «No evaluado»');
        for (const text of [resumenNaranjo, resumenKl]) {
            assert.ok(text.indexOf('0 · Dudosa') === -1, 'el resumen excluye «0 · Dudosa»');
            assert.ok(text.indexOf('Dudosa') === -1, 'el resumen excluye «Dudosa»');
            assert.ok(text.indexOf('Posible') === -1 && text.indexOf('Probable') === -1 && text.indexOf('Definida') === -1, 'el resumen excluye cualquier resultado causal atribuido');
        }
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), SIN_EVALUAR, 'categoría Naranjo «No evaluado» sin interacción');
        assert.notEqual((await page.locator('#naranjoScore').textContent()).trim(), '0', 'la puntuación sin interacción no se presenta como «0»');
        assert.equal(await activeChipValues(page).then(v => v.length), 0, 'sin interacción ningún chip aparece como contestado');
        ok('P1-1: untouched context shows visible «No evaluado» summaries; never 0 · Dudosa nor an attributed result');

        // ── C04: elegir «Causalidad final farmacéutica» NO completa métodos ──
        await page.selectOption('#fhCausalidadFinal', 'Definida');
        await page.waitForTimeout(150);
        const finalAlone = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            karch: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'karch_lasagna')
        }), { ep: EP, alfa: ALFA });
        assert.equal(finalAlone.naranjo.status, 'no_evaluado', 'la elección de causalidad final NO convierte Naranjo en evaluado');
        assert.equal(finalAlone.karch.status, 'no_evaluado', 'la elección de causalidad final NO convierte Karch en evaluado');
        assert.deepEqual(finalAlone.naranjo.answers, {}, 'sin respuestas explícitas Naranjo no registra nada');
        assert.equal((await page.locator('#resumenNaranjo').textContent()).trim(), SIN_EVALUAR, 'el resumen Naranjo sigue «No evaluado» tras elegir la final');
        assert.equal((await page.locator('#resumenKl').textContent()).trim(), SIN_EVALUAR, 'el resumen Karch sigue «No evaluado» tras elegir la final');
        ok('C04: choosing the optional final assessment alone never completes either method');

        // ── P1-2 · restitución con borrador legacy ajeno «Definida» ──
        // Seam técnico identificado (restoreEvaluationState): representa la
        // restitución de una visita con máquina legacy singular previa; no
        // existe control UI propio para este estado.
        const visitId = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit().visit_id);
        await page.evaluate(({ visitId, ep, alfa }) => {
            window.FarmaciaSeguimiento.restoreEvaluationState({
                current_visit: {
                    cip: 'CIP-DEMO-FH-001', visit_id: visitId,
                    adverse_event: { present: 'si', suspect_ids: [alfa], causality_editing_id: alfa },
                    adverse_events: [{ episode_id: ep, observation_id: 'FH-EA-OBS-0001', suspect_ids: [alfa], status: 'incorporated', description: 'Cefalea', evolution: 'no_consta', severity: '', expanded: true }],
                    causality_by_suspect: {
                        [alfa]: {
                            naranjo_answers: { q3: 'si' }, naranjo_score: 5, naranjo_category: 'Posible',
                            karch_answers: { temporal: 'si' }, karch_category: 'Probable',
                            final_assessment: 'Definida'
                        }
                    }
                },
                related_treatments: [{ uid: 'seg-other-1', farmaco: 'Medicamento Alfa Sintético', relationType: 'relacionado' }]
            });
        }, { visitId, ep: EP, alfa: ALFA });
        await page.waitForTimeout(300);
        const finalValue = await page.inputValue('#fhCausalidadFinal');
        assert.notEqual(finalValue, 'Definida', 'P1-2: el borrador legacy ajeno NO se presenta como valor vigente de #fhCausalidadFinal');
        assert.ok(finalValue === 'No evaluada' || finalValue === '', '#fhCausalidadFinal queda en su valor propio documentado del contexto actual o vacío');
        const chipsAfterRestore = await activeChipValues(page);
        assert.deepEqual(chipsAfterRestore, [], 'la restitución NO activa chips desde el borrador legacy (q3/temporal ajenos sin contestación propia)');
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), SIN_EVALUAR, 'sin categoría por defecto «Dudosa» ni heredada del legacy tras restituir');
        assert.notEqual((await page.locator('#naranjoScore').textContent()).trim(), '0', 'sin puntuación cero por defecto tras restituir');
        assert.equal((await page.locator('#klCategoria').textContent()).trim(), SIN_EVALUAR, 'Karch «No evaluado» tras restituir');
        assert.equal((await page.locator('#resumenNaranjo').textContent()).trim(), SIN_EVALUAR, 'P1-1 · falsador 2: #resumenNaranjo «No evaluado» tras restoreEvaluationState sin interacción');
        assert.equal((await page.locator('#resumenKl').textContent()).trim(), SIN_EVALUAR, 'P1-1 · falsador 2: #resumenKl «No evaluado» tras restoreEvaluationState sin interacción');
        const stateAfterRestore = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            karch: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'karch_lasagna')
        }), { ep: EP, alfa: ALFA });
        assert.equal(stateAfterRestore.naranjo.status, 'no_evaluado', 'el borrador legacy NO activa una evaluación G0 del contexto');
        assert.equal(stateAfterRestore.karch.status, 'no_evaluado', 'el borrador legacy NO activa Karch');
        ok('P1-2 + P1-1: restored state never presents the foreign legacy draft (final, answers, defaults) as an active evaluation');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 1: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 1 status rules', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión 2: desmarcado con historial, re-marcado sin restauración, ────────
//     referencia pendiente de reconciliación inhabilitada.

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        await buildOneEaOneSuspect(page, 'Medicamento Alfa Sintético');
        await selectContext(page);
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.waitForTimeout(150);

        // ── C05: desmarcar conserva historial distinguible, sin evaluación activa ──
        await page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await page.waitForTimeout(300);
        const afterUnmark = await page.evaluate(({ ep, alfa }) => ({
            state: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            history: window.FarmaciaSeguimientoEaCausalityState.getInactiveHistory()
        }), { ep: EP, alfa: ALFA });
        assert.equal(afterUnmark.state.status, 'no_evaluado', 'desmarcar deja el contexto en «No evaluado» (no evaluación activa)');
        assert.deepEqual(afterUnmark.state.answers, {}, 'el borrador desmarcado no sigue expuesto como vigente');
        const naranjoHistory = afterUnmark.history.filter((entry) => entry.method === 'naranjo' && entry.suspectRef === ALFA && entry.episodeId === EP);
        assert.equal(naranjoHistory.length, 1, 'el borrador desmarcado queda identificable como historial en memoria');
        assert.deepEqual(naranjoHistory[0].answers, { q1: 'si' }, 'el historial conserva las respuestas exactas del borrador');
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'desmarcar no deja chips activos');
        const suspectOptions = await page.locator('#fhCausalitySuspect option').evaluateAll((options) => options.map((option) => ({ value: option.value, text: option.textContent })));
        assert.ok(suspectOptions.every((option) => option.value !== ALFA), 'el sospechoso desmarcado deja de ser evaluable');
        ok('C05: unmarking keeps the draft as distinguishable in-memory history and stops active evaluation');

        // ── C05: volver a marcar NO reactiva ni sobreescribe ──
        await page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await page.waitForTimeout(300);
        const afterRemark = await page.evaluate(({ ep, alfa }) => ({
            state: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            history: window.FarmaciaSeguimientoEaCausalityState.getInactiveHistory()
        }), { ep: EP, alfa: ALFA });
        assert.equal(afterRemark.state.status, 'no_evaluado', 'volver a marcar NO restaura automáticamente una causalidad completada');
        assert.deepEqual(afterRemark.state.answers, {}, 'ningún borrador histórico se presenta como vigente al re-marcar');
        const historyAfterRemark = afterRemark.history.filter((entry) => entry.method === 'naranjo' && entry.suspectRef === ALFA);
        assert.equal(historyAfterRemark.length, 1, 'el historial histórico no se sobreescribe ni se duplica al re-marcar');
        assert.deepEqual(historyAfterRemark[0].answers, { q1: 'si' }, 'el borrador histórico permanece íntegro y distinguible');
        ok('C05: re-marking the same reference never auto-restores the completed causality nor overwrites history');

        // ── C05/C03: marca «pendiente de reconciliación» mantiene la evaluación inhabilitada ──
        // Seam técnico identificado: la fuente de la referencia cambia durante
        // la restitución (identidad ya no verificable); no existe control UI
        // propio para esa transición de fuente.
        const visitId = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit().visit_id);
        await page.evaluate(({ visitId, ep, alfa }) => {
            window.FarmaciaSeguimiento.restoreEvaluationState({
                current_visit: {
                    cip: 'CIP-DEMO-FH-001', visit_id: visitId,
                    adverse_event: { present: 'si', suspect_ids: [alfa], causality_editing_id: '' },
                    adverse_events: [{ episode_id: ep, observation_id: 'FH-EA-OBS-0001', suspect_ids: [alfa], status: 'incorporated', description: 'Cefalea', evolution: 'no_consta', severity: '', expanded: true }],
                    causality_by_suspect: {}
                },
                related_treatments: [{ uid: 'seg-other-1', farmaco: 'Medicamento Alfa Sintético ALTERADO', relationType: 'relacionado' }]
            });
        }, { visitId, ep: EP, alfa: ALFA });
        await page.waitForTimeout(300);
        const cardText = await page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list').textContent();
        assert.ok(cardText.indexOf('pendiente de reconciliación') !== -1, 'la tarjeta EA rotula la referencia como «pendiente de reconciliación»');
        const pendingEval = await page.evaluate(() => ({
            suspectDisabled: document.getElementById('fhCausalitySuspect').disabled,
            suspectValues: Array.prototype.map.call(document.getElementById('fhCausalitySuspect').options, (option) => option.value).filter(Boolean),
            chipsDisabled: Array.prototype.every.call(document.querySelectorAll('#modNaranjo .causality-chip, #modKarchLasagna .causality-chip'), (chip) => chip.disabled),
            noticeVisible: !document.getElementById('fhCausalityContextoVacio').classList.contains('hidden')
        }));
        assert.equal(pendingEval.suspectDisabled, true, 'con identidad pendiente el selector de sospechoso está inhabilitado');
        assert.deepEqual(pendingEval.suspectValues, [], 'la referencia no verificada no se ofrece como opción evaluable');
        assert.ok(pendingEval.chipsDisabled, 'los cuestionarios permanecen inhabilitados sobre identidad no verificada');
        assert.ok(pendingEval.noticeVisible, 'se muestra la explicación de que no se activa evaluación');
        const pendingState = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            history: window.FarmaciaSeguimientoEaCausalityState.getInactiveHistory()
        }), { ep: EP, alfa: ALFA });
        assert.equal(pendingState.naranjo.status, 'no_evaluado', 'la evaluación nunca se activa sobre una identidad sin verificar');
        assert.equal(pendingState.history.filter((entry) => entry.suspectRef === ALFA && entry.method === 'naranjo').length, 1, 'el historial en memoria del desmarcado se conserva');
        ok('C05: a «pendiente de reconciliación» mark keeps evaluation disabled and the in-memory history intact');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 2: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 2 journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión 3: A→B→A con IDENTIFICADORES IGUALES (P2 · C06) ──────────────────

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        await buildOneEaOneSuspect(page, 'Medicamento Alfa Sintético');
        await selectContext(page);
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.click('#modKarchLasagna .causality-chip-group[data-answer-id="klTemporal"] .causality-chip[data-value="si"]');
        await page.waitForTimeout(150);
        const before = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            karch: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'karch_lasagna')
        }), { ep: EP, alfa: ALFA });
        assert.equal(before.naranjo.status, 'borrador_en_edicion', 'A tiene borrador Naranjo propio antes del cambio');
        assert.equal(before.karch.status, 'borrador_en_edicion', 'A tiene borrador Karch propio antes del cambio');
        const visitId = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit().visit_id);

        // B con los MISMOS identificadores de episodio y referencia (pueden
        // coincidir: los efímeros de A y B no están obligados a diferir).
        await page.evaluate(({ visitId, ep, alfa }) => {
            window.FarmaciaSeguimiento.restoreEvaluationState({
                current_visit: {
                    cip: 'CIP-ORACLE-B', visit_id: visitId,
                    adverse_event: { present: 'si', suspect_ids: [alfa], causality_editing_id: '' },
                    adverse_events: [{ episode_id: ep, observation_id: 'FH-EA-OBS-0001', suspect_ids: [alfa], status: 'incorporated', description: 'Cefalea', evolution: 'no_consta', severity: '', expanded: true }],
                    causality_by_suspect: {}
                },
                related_treatments: [{ uid: 'seg-other-1', farmaco: 'Medicamento Alfa Sintético', relationType: 'relacionado' }]
            });
        }, { visitId, ep: EP, alfa: ALFA });
        await page.waitForTimeout(300);
        const inB = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            karch: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'karch_lasagna'),
            marked: window.FarmaciaSeguimientoEaCausalityState.isSuspectMarked(ep, alfa),
            history: window.FarmaciaSeguimientoEaCausalityState.getInactiveHistory()
        }), { ep: EP, alfa: ALFA });
        assert.equal(inB.naranjo.status, 'no_evaluado', 'B (IDs iguales) NO hereda el borrador Naranjo de A');
        assert.deepEqual(inB.naranjo.answers, {}, 'sin respuestas de A en B');
        assert.equal(inB.karch.status, 'no_evaluado', 'B (IDs iguales) NO hereda el borrador Karch de A');
        assert.equal(inB.marked, false, 'las marcas de A se destruyen al cambiar a B');
        assert.deepEqual(inB.history, [], 'el historial en memoria de A se destruye al cambiar a B');
        assert.deepEqual(await activeChipValues(page), [], 'B no muestra chips activos heredados de A (ni defaults presentados como contestados)');
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), SIN_EVALUAR, 'B muestra categoría «No evaluado», no la de A');
        assert.equal((await page.locator('#klCategoria').textContent()).trim(), SIN_EVALUAR, 'B muestra categoría Karch «No evaluado»');
        assert.equal((await page.locator('#resumenNaranjo').textContent()).trim(), SIN_EVALUAR, 'B muestra resumen Naranjo «No evaluado»');
        assert.equal((await page.locator('#resumenKl').textContent()).trim(), SIN_EVALUAR, 'B muestra resumen Karch «No evaluado»');
        assert.notEqual(await page.inputValue('#fhCausalidadFinal'), 'Definida', 'B no hereda una valoración final ajena');
        ok('P2: patient switch A→B with identical IDs shows no questionnaires, categories, chips, drafts or history from A');

        // A→B→A: sin relectura simulada de A.
        await page.evaluate(({ visitId, ep, alfa }) => {
            window.FarmaciaSeguimiento.restoreEvaluationState({
                current_visit: {
                    cip: 'CIP-DEMO-FH-001', visit_id: visitId,
                    adverse_event: { present: 'si', suspect_ids: [alfa], causality_editing_id: '' },
                    adverse_events: [{ episode_id: ep, observation_id: 'FH-EA-OBS-0001', suspect_ids: [alfa], status: 'incorporated', description: 'Cefalea', evolution: 'no_consta', severity: '', expanded: true }],
                    causality_by_suspect: {}
                },
                related_treatments: [{ uid: 'seg-other-1', farmaco: 'Medicamento Alfa Sintético', relationType: 'relacionado' }]
            });
        }, { visitId, ep: EP, alfa: ALFA });
        await page.waitForTimeout(300);
        const backInA = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            karch: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'karch_lasagna'),
            history: window.FarmaciaSeguimientoEaCausalityState.getInactiveHistory()
        }), { ep: EP, alfa: ALFA });
        assert.equal(backInA.naranjo.status, 'no_evaluado', 'A→B→A NO finge relectura: el borrador de A no reaparece');
        assert.deepEqual(backInA.karch.answers, {}, 'sin respuestas resucitadas al volver a A');
        assert.deepEqual(backInA.history, [], 'sin historial resucitado al volver a A');
        assert.deepEqual(await activeChipValues(page), [], 'al volver a A no hay chips presentados como contestados');
        // Fail-closed: sin marca viva, tocar un chip NO registra evaluación.
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.waitForTimeout(150);
        const afterTouch = await page.evaluate(({ ep, alfa }) => window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'), { ep: EP, alfa: ALFA });
        assert.deepEqual(afterTouch.answers, {}, 'sin marca expresa re-creada, la respuesta tocada no se registra (fail-closed)');
        ok('P2: A→B→A does not fake re-reading A; recording stays fail-closed until an explicit re-mark');

        // La salida de A por CIP conserva la confirmación existente.
        const dialogMessages = [];
        page.removeAllListeners('dialog');
        page.on('dialog', (dialog) => { dialogMessages.push(dialog.message()); dialog.accept(); });
        await page.fill('#fhSegCip', 'CIP-ORACLE-B');
        await page.click('#fhSegCipSearchBtn');
        await page.waitForTimeout(500);
        assert.ok(dialogMessages.some((message) => /datos no guardados/i.test(message)), 'salir de A mediante cambio de CIP conserva la confirmación existente de datos no guardados');
        const afterCipSwitch = await page.evaluate(({ ep, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(ep, alfa, 'naranjo'),
            history: window.FarmaciaSeguimientoEaCausalityState.getInactiveHistory()
        }), { ep: EP, alfa: ALFA });
        assert.equal(afterCipSwitch.naranjo.status, 'no_evaluado', 'el contexto de A no reaparece tras el cambio de paciente por CIP');
        assert.deepEqual(afterCipSwitch.history, [], 'sin historial de A tras el cambio de paciente por CIP');
        ok('C06: leaving A through the existing CIP switch keeps the unsaved-data confirmation and destroys the editing memory');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 3: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 3 journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión 4: regresiones UI — presencia «No» con 0 EA, candidatos con la ───
//     misma etiqueta, guardia de contradicción Sí→No.

{
    const { context, page, consoleErrors, pageErrors } = await openPage();
    try {
        // ── C01 · regresión: presencia «No» con 0 EA (valor real del DOM) ──
        const presenceValue = await page.inputValue('#fhSeguimientoEaPresente');
        assert.equal(presenceValue, 'no_consta', 'la presencia inicial real del select es «No consta»');
        await page.selectOption('#fhSeguimientoEaPresente', 'no');
        await page.waitForTimeout(300);
        const noZeroEa = await page.evaluate(() => ({
            presentValue: document.getElementById('fhSeguimientoEaPresente').value,
            sectionHidden: document.getElementById('modSeguimientoCausalidad').classList.contains('hidden'),
            naranjoHidden: document.getElementById('modNaranjo').classList.contains('hidden'),
            karchHidden: document.getElementById('modKarchLasagna').classList.contains('hidden'),
            resumenHidden: document.getElementById('modResumenCausalidad').classList.contains('hidden'),
            chipsDisabled: Array.prototype.every.call(document.querySelectorAll('#modNaranjo .causality-chip, #modKarchLasagna .causality-chip'), (chip) => chip.disabled),
            explanationVisible: !document.getElementById('fhSeguimientoEaNoCausalidad').classList.contains('hidden'),
            explanationText: (document.getElementById('fhSeguimientoEaNoCausalidad') || {}).textContent || ''
        }));
        assert.equal(noZeroEa.presentValue, 'no', 'el select real de presencia queda en «No»');
        assert.ok(noZeroEa.sectionHidden, 'presencia «No» con 0 EA: la sección de causalidad queda inactiva');
        assert.ok(noZeroEa.naranjoHidden && noZeroEa.karchHidden && noZeroEa.resumenHidden, 'cuestionarios y resumen inactivos');
        assert.ok(noZeroEa.chipsDisabled || (noZeroEa.naranjoHidden && noZeroEa.karchHidden), 'los chips quedan inactivos (inhabilitados o dentro de cuestionarios inactivos)');
        assert.ok(noZeroEa.explanationVisible && noZeroEa.explanationText.trim().length > 0, 'explicación visible en español');
        ok('C01 regression: presence «No» with 0 EA keeps the causality section and questionnaires inactive with a Spanish explanation');

        // ── C02 · regresión: DOS candidatos, misma etiqueta, referencias distintas ──
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Cefalea');
        await card.getByRole('button', { name: 'Incorporar al acto' }).click();
        await page.click('#btnSegAddOtherDrug');
        await page.click('#btnSegAddOtherDrug');
        const drugs = page.locator('#segOtrosFarmacosList .other-drug-card');
        await drugs.nth(0).locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
        await drugs.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
        await card.locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await card.locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        await page.waitForFunction(() => {
            const suspect = document.getElementById('fhCausalitySuspect');
            return suspect && Array.from(suspect.options).filter((option) => option.value).length === 2;
        }, null, { timeout: 5000 });
        const sameNameOptions = await page.locator('#fhCausalitySuspect option').evaluateAll((options) => options.filter((option) => option.value).map((option) => ({ value: option.value, text: option.textContent })));
        assert.deepEqual(sameNameOptions.map((option) => option.value).sort(), [ALFA, ALFA_2].sort(), 'dos referencias distintas aparecen como opciones pese a la misma etiqueta');
        assert.ok(sameNameOptions.every((option) => option.text.indexOf('Medicamento Alfa Sintético') !== -1), 'ambas opciones muestran la misma etiqueta visible');
        await page.selectOption('#fhCausalityEpisode', EP);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.selectOption('#fhCausalitySuspect', ALFA_2);
        await page.waitForTimeout(150);
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'A/Y (misma etiqueta) no hereda los chips de A/X');
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), SIN_EVALUADO, 'A/Y (misma etiqueta) se muestra «No evaluado»');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="no"]');
        await page.selectOption('#fhCausalitySuspect', ALFA);
        await page.waitForTimeout(150);
        const q1Back = await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip--active').getAttribute('data-value');
        assert.equal(q1Back, 'si', 'volver al primer contexto devuelve su respuesta exacta');
        const sameNameStates = await page.evaluate(({ alfa, alfa2 }) => ({
            x: window.FarmaciaSeguimientoEaCausalityState.getState('FH-EA-EP-0001', alfa, 'naranjo'),
            y: window.FarmaciaSeguimientoEaCausalityState.getState('FH-EA-EP-0001', alfa2, 'naranjo')
        }), { alfa: ALFA, alfa2: ALFA_2 });
        assert.deepEqual(sameNameStates.x.answers, { q1: 'si' }, 'A/X conserva su respuesta exacta (identidad por referencia, no por nombre)');
        assert.deepEqual(sameNameStates.y.answers, { q1: 'no' }, 'A/Y conserva su respuesta exacta y aislada');
        ok('C02 regression: two distinct references sharing one visible label stay separate options with isolated drafts');

        // ── C06 · regresión: guardia de contradicción Sí→No con EA incorporados ──
        await page.selectOption('#fhSeguimientoEaPresente', 'no');
        await page.waitForTimeout(300);
        const contradiction = await page.evaluate(() => ({
            value: document.getElementById('fhSeguimientoEaPresente').value,
            noticeVisible: !document.getElementById('fhSegEaContradictionNotice').classList.contains('hidden'),
            events: window.FarmaciaSeguimiento.getEaEvents().length
        }));
        assert.equal(contradiction.value, 'si', 'con EA incorporados el cambio Sí→No se bloquea y la presencia vuelve a «Sí»');
        assert.ok(contradiction.noticeVisible, 'la guardia de contradicción existente se muestra');
        assert.equal(contradiction.events, 1, 'los EA incorporados se conservan intactos');
        ok('C06 regression: the existing Sí→No contradiction guard with incorporated EA is preserved');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session 4: console.error=0 pageerror=0');
    } catch (error) {
        bad('session 4 journeys', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nCAUSALITY-STATUS-RULES: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
