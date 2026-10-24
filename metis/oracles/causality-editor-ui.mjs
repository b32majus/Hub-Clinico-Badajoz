// Oráculo Metis FH-EA-03 · unidad 3/5 causality-editor-ui.
//
// Editor G0 de causalidad en Seguimiento (farmacia_seguimiento.html real,
// Chromium/Playwright, datos sintéticos y SOLO interacciones soportadas):
//   · Con presencia «Sí» y al menos un EA documentado, la sección «Análisis
//     de causalidad» muestra PRIMERO un selector de episodio real (ID +
//     descripción) y después SOLO los medicamentos que el profesional ha
//     marcado expresamente como sospechosos de ese episodio; ningún
//     sospechoso se autoselecciona y el selector nunca agrega candidatos de
//     otros EA (A/X, A/Y, B/X).
//   · Con «No», «No consta», cero EA o episodio sin sospechosos hay
//     explicación en español con los controles apropiadamente inactivos y
//     sin episodios DEMO del HTML.
//   · La composición presenta los DOS cuestionarios existentes (Naranjo 10
//     ítems, Karch-Lasagna 7 ítems) y su resumen UNA sola vez; el cálculo
//     coincide con el helper existente FarmaciaValidationModel
//     (calculateNaranjoScore/categorizeNaranjo/categorizeKarchLasagna) y se
//     presenta como provisional; sin interacción el estado es «No evaluado»
//     (el 0/«Dudosa» inicial no se muestra como evaluado).
//   · La fila singular legacy fhSeguimientoEaFarmacoRow y su selector
//     fhSeguimientoEaFarmacoSospechoso permanecen ocultas; el editor solo
//     puede leer currentFollowupVisit.adverse_events[].suspect_ids (prueba:
//     el editor muestra los sospechosos mientras la máquina legacy singular
//     sigue vacía) y nunca adverse_event.suspect_ids ni
//     causality_by_suspect.
//   · Al alternar episodio/sospechoso/método, los borradores se capturan y
//     restauran EXACTAMENTE desde el módulo de estado
//     FarmaciaSeguimientoEaCausalityState (A/X, A/Y, B/X con Naranjo y Karch
//     distintos) sin sobreescribir otro contexto.
//
// En BASE este oráculo es RED por capacidad ausente: la sección nunca llega
// a mostrarse con episodio/sospechoso reales (aserción, no excepción).
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
                return createRequire(path.join(candidate, '__fh_ea03_causality_editor_loader.cjs'))('playwright');
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
const BETA = 'other:seg-other-2';
const NARANJO = 'naranjo';
const KARCH = 'karch_lasagna';

async function addIncorporatedEa(page, description) {
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill(description);
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
}

async function installStorageTraps(page) {
    await page.evaluate(() => {
        window.__eaStorageLog = [];
        window.__eaIdbLog = [];
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            window.__eaStorageLog.push(String(key) + '::' + String(value));
            return originalSetItem.call(this, key, value);
        };
        const originalOpen = window.indexedDB.open.bind(window.indexedDB);
        window.indexedDB.open = function (name) {
            window.__eaIdbLog.push(String(name));
            return originalOpen.apply(window.indexedDB, arguments);
        };
    });
}

// ─── Sesión A: episodio → sospechoso marcado, dos cuestionarios, borradores ──

{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    try {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        await installStorageTraps(page);

        // Regresión: el módulo de estado de la unidad anterior sigue cargado.
        const seam = await page.evaluate(() => Object.keys(window.FarmaciaSeguimientoEaCausalityState || {}).sort());
        assert.deepEqual(seam, ['getInactiveHistory', 'getState', 'isSuspectMarked', 'recordAnswer', 'setEditingPatient', 'setEditingVisit', 'setSuspectMarked'], 'el módulo de estado en memoria sigue expuesto con su seam completo');
        ok('causality-state-module seam available in the real page (regression)');

        // Viaje soportado: presencia «Sí», DOS EA documentados (incorporados),
        // dos medicamentos con nombre y marcado expreso por episodio.
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await addIncorporatedEa(page, 'Cefalea');
        await addIncorporatedEa(page, 'Náuseas');
        const cards = page.locator('#fhSegEaList .ea-t01-card');
        assert.equal(await cards.count(), 2, 'two incorporated EA prepared');
        const episodeIds = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-episode-id')));
        const epA = episodeIds[0];
        const epB = episodeIds[1];
        await page.click('#btnSegAddOtherDrug');
        await page.click('#btnSegAddOtherDrug');
        const drugs = page.locator('#segOtrosFarmacosList .other-drug-card');
        await drugs.nth(0).locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
        await drugs.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Beta Sintético');
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        await cards.nth(1).locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await page.waitForFunction(() => {
            const events = window.FarmaciaSeguimiento.getEaEvents();
            return events.length === 2 && events[0].suspect_ids.length === 2 && events[1].suspect_ids.length === 1;
        }, null, { timeout: 5000 });
        ok('supported journey: presence «Sí», two documented EA, named medicines, explicit per-episode marks');

        // ── Hecho 1: sección visible con selector de episodio real primero ──
        const sectionVisible = await page.evaluate(() => !document.getElementById('modSeguimientoCausalidad').classList.contains('hidden'));
        assert.ok(sectionVisible, 'la sección «Análisis de causalidad» se muestra con presencia «Sí» y EA documentados (capacidad ausente en BASE)');
        const episodeSelect = page.locator('#fhCausalityEpisode');
        const suspectSelect = page.locator('#fhCausalitySuspect');
        assert.equal(await episodeSelect.count(), 1, 'existe un selector de episodio EA');
        assert.equal(await suspectSelect.count(), 1, 'existe un selector de sospechoso');
        const episodeOrder = await page.evaluate(() => {
            const section = document.getElementById('modSeguimientoCausalidad');
            const episode = section.querySelector('#fhCausalityEpisode');
            const naranjo = section.querySelector('#modNaranjo');
            return !!(episode && naranjo && (episode.compareDocumentPosition(naranjo) & Node.DOCUMENT_POSITION_FOLLOWING));
        });
        assert.ok(episodeOrder, 'el selector de episodio aparece ANTES que los cuestionarios');
        const episodeOptions = await episodeSelect.locator('option').evaluateAll((options) => options.map((option) => ({ value: option.value, text: option.textContent })));
        assert.ok(episodeOptions.some((option) => option.value === epA && option.text.indexOf(epA) !== -1 && option.text.indexOf('Cefalea') !== -1), 'el selector ofrece el episodio real A con ID + descripción');
        assert.ok(episodeOptions.some((option) => option.value === epB && option.text.indexOf(epB) !== -1 && option.text.indexOf('Náuseas') !== -1), 'el selector ofrece el episodio real B con ID + descripción');
        assert.ok(episodeOptions.every((option) => option.text.indexOf('DEMO-EP') === -1 && option.value.indexOf('DEMO-EP') === -1), 'el selector NO agrega episodios DEMO del HTML');
        ok('episode-first real selector with ID + description, no DEMO episodes');

        // ── Hecho 1: solo sospechosos marcados expresamente en ese episodio ──
        await page.selectOption('#fhCausalityEpisode', epA);
        let suspectValues = await suspectSelect.locator('option').evaluateAll((options) => options.map((option) => option.value));
        assert.deepEqual(suspectValues.filter((value) => value).sort(), [ALFA, BETA].sort(), 'episodio A: exactamente los sospechosos marcados expresamente (Alfa y Beta)');
        let suspectTexts = await suspectSelect.locator('option').evaluateAll((options) => options.map((option) => option.textContent));
        assert.ok(suspectTexts.some((text) => text.indexOf('Medicamento Alfa Sintético') !== -1), 'las opciones muestran el nombre real del sospechoso');
        assert.equal(await suspectSelect.inputValue(), '', 'ningún sospechoso se selecciona automáticamente');
        await page.selectOption('#fhCausalityEpisode', epB);
        suspectValues = await suspectSelect.locator('option').evaluateAll((options) => options.map((option) => option.value));
        assert.deepEqual(suspectValues.filter((value) => value), [ALFA], 'episodio B: solo su sospechoso marcado; el selector NO agrega candidatos de otros EA');
        assert.equal(await suspectSelect.inputValue(), '', 'cambiar de episodio no autoselecciona sospechoso');
        ok('suspect selector is strictly the marked suspects of the selected episode, never auto-selected, never cross-EA');

        // ── Hecho 4: fila y selector legacy ocultos; fuente nueva 0..N ──
        assert.ok(await page.locator('#fhSeguimientoEaFarmacoRow').isHidden(), 'la fila singular legacy fhSeguimientoEaFarmacoRow permanece oculta');
        assert.ok(await page.locator('#fhSeguimientoEaFarmacoSospechoso').isHidden(), 'el selector legacy fhSeguimientoEaFarmacoSospechoso permanece oculto');
        const legacyState = await page.evaluate(() => {
            const visit = window.FarmaciaSeguimiento.getCurrentVisit();
            return { suspect_ids: visit.adverse_event.suspect_ids, causality_by_suspect: visit.causality_by_suspect };
        });
        assert.deepEqual(legacyState.suspect_ids, [], 'la máquina legacy singular sigue sin sospechosos');
        assert.deepEqual(legacyState.causality_by_suspect, {}, 'legacy causality_by_suspect sigue vacío');
        assert.ok(suspectValues.length > 0, 'el editor nuevo SÍ muestra los sospechosos por episodio');
        ok('legacy singular row/selector hidden; the new editor shows suspects while the legacy source stays empty (it cannot be sourcing from legacy)');

        // ── Hecho 5 (preparación): contexto A/Alfa, sin interacción ──
        await page.selectOption('#fhCausalityEpisode', epA);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        const untouched = await page.evaluate(({ epA, alfa }) => ({
            naranjo: window.FarmaciaSeguimientoEaCausalityState.getState(epA, alfa, 'naranjo'),
            karch: window.FarmaciaSeguimientoEaCausalityState.getState(epA, alfa, 'karch_lasagna')
        }), { epA, alfa: ALFA });
        assert.equal(untouched.naranjo.status, 'no_evaluado', 'sin interacción el estado Naranjo es «No evaluado»');
        assert.deepEqual(untouched.naranjo.answers, {}, 'los valores por defecto no acreditan preguntas contestadas');
        assert.equal(untouched.karch.status, 'no_evaluado', 'Karch sin interacción también «No evaluado»');
        const naranjoCategoria = (await page.locator('#naranjoCategoria').textContent()).trim();
        const naranjoScore = (await page.locator('#naranjoScore').textContent()).trim();
        const klCategoria = (await page.locator('#klCategoria').textContent()).trim();
        assert.equal(naranjoCategoria, 'No evaluado', 'el 0/«Dudosa» inicial NO se muestra como evaluado: categoría «No evaluado»');
        assert.notEqual(naranjoScore, '0', 'la puntuación sin interacción no se presenta como «0» evaluado');
        assert.equal(klCategoria, 'No evaluado', 'Karch sin respuestas se muestra «No evaluado»');
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'sin respuestas registradas ningún chip aparece activo');
        const chipEnabled = await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]').isEnabled();
        assert.ok(chipEnabled, 'con episodio y sospechoso marcado los cuestionarios quedan operativos');
        ok('untouched context reads «No evaluado» everywhere; default zero/Dudosa is never presented as evaluated');

        // ── Hecho 3 + 5: Naranjo y Karch distintos en A/Alfa, vía helper ──
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip[data-value="si"]');
        const expectedScore = await page.evaluate(() => window.FarmaciaValidationModel.calculateNaranjoScore({ q1: 'si', q2: 'si' }));
        const expectedNaranjoCat = await page.evaluate(() => window.FarmaciaValidationModel.categorizeNaranjo(window.FarmaciaValidationModel.calculateNaranjoScore({ q1: 'si', q2: 'si' })));
        assert.equal((await page.locator('#naranjoScore').textContent()).trim(), String(expectedScore), 'la puntuación mostrada la calcula el helper existente FarmaciaValidationModel');
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), expectedNaranjoCat, 'la categoría mostrada la calcula el helper existente');
        const provisionalAviso = page.locator('#fhCausalityAvisoProvisional');
        assert.ok(await provisionalAviso.isVisible(), 'el aviso de provisionalidad es visible con respuestas registradas');
        assert.ok((await provisionalAviso.textContent()).toLowerCase().includes('provisional'), 'el aviso declara la provisionalidad del resultado');
        await page.click('#modKarchLasagna .causality-chip-group[data-answer-id="klTemporal"] .causality-chip[data-value="si"]');
        await page.click('#modKarchLasagna .causality-chip-group[data-answer-id="klConocido"] .causality-chip[data-value="si"]');
        const expectedKlCat = await page.evaluate(() => window.FarmaciaValidationModel.categorizeKarchLasagna({ temporal: 'si', conocido: 'si' }));
        assert.equal((await page.locator('#klCategoria').textContent()).trim(), expectedKlCat, 'la categoría Karch la calcula el helper existente');
        ok('Naranjo and Karch-Lasagna results come from the existing helper and are presented as provisional');

        // ── Hecho 5: A/Beta y B/Alfa empiezan limpios; borradores exactos ──
        await page.selectOption('#fhCausalitySuspect', BETA);
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'A/Beta no hereda chips activos de A/Alfa');
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), 'No evaluado', 'A/Beta sin respuestas se muestra «No evaluado»');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="no"]');
        await page.selectOption('#fhCausalityEpisode', epB);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'B/Alfa no hereda respuestas de A (ni de Alfa en B ni de Beta en A)');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        ok('switching contexts A/X → A/Y → B/X never carries answers across contexts');

        // Volver a A/Alfa: restauración EXACTA de Naranjo y Karch.
        await page.selectOption('#fhCausalityEpisode', epA);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        const q1Active = await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip--active').getAttribute('data-value');
        const q2Active = await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip--active').getAttribute('data-value');
        assert.equal(q1Active, 'si', 'A/Alfa restaura exactamente su Naranjo q1');
        assert.equal(q2Active, 'si', 'A/Alfa restaura exactamente su Naranjo q2');
        assert.equal((await page.locator('#naranjoScore').textContent()).trim(), String(expectedScore), 'A/Alfa restaura su puntuación Naranjo exacta');
        const klActive = await page.locator('#modKarchLasagna .causality-chip-group[data-answer-id="klTemporal"] .causality-chip--active').getAttribute('data-value');
        const klConocidoActive = await page.locator('#modKarchLasagna .causality-chip-group[data-answer-id="klConocido"] .causality-chip--active').getAttribute('data-value');
        assert.equal(klActive, 'si', 'A/Alfa restaura exactamente su Karch temporal');
        assert.equal(klConocidoActive, 'si', 'A/Alfa restaura exactamente su Karch conocido');
        assert.equal((await page.locator('#klCategoria').textContent()).trim(), expectedKlCat, 'A/Alfa restaura su categoría Karch exacta');
        const states = await page.evaluate(({ epA, epB, alfa, beta }) => {
            const S = window.FarmaciaSeguimientoEaCausalityState;
            return {
                axNaranjo: S.getState(epA, alfa, 'naranjo'),
                axKarch: S.getState(epA, alfa, 'karch_lasagna'),
                ayNaranjo: S.getState(epA, beta, 'naranjo'),
                ayKarch: S.getState(epA, beta, 'karch_lasagna'),
                bxNaranjo: S.getState(epB, alfa, 'naranjo'),
                bxKarch: S.getState(epB, alfa, 'karch_lasagna')
            };
        }, { epA, epB, alfa: ALFA, beta: BETA });
        assert.deepEqual(states.axNaranjo.answers, { q1: 'si', q2: 'si' }, 'A/Alfa/Naranjo conserva exactamente sus respuestas');
        assert.deepEqual(states.axKarch.answers, { temporal: 'si', conocido: 'si' }, 'A/Alfa/Karch conserva exactamente sus respuestas');
        assert.deepEqual(states.ayNaranjo.answers, { q1: 'no' }, 'A/Beta/Naranjo conserva exactamente su respuesta propia');
        assert.equal(states.ayKarch.status, 'no_evaluado', 'A/Beta/Karch sigue «No evaluado»');
        assert.deepEqual(states.bxNaranjo.answers, { q1: 'si' }, 'B/Alfa/Naranjo conserva exactamente su respuesta propia');
        assert.equal(states.bxKarch.status, 'no_evaluado', 'B/Alfa/Karch sigue «No evaluado»');
        ok('alternating episode/suspect/method captures and restores exact drafts from the state module without overwriting other contexts');

        // ── Hecho 3: DOS cuestionarios y resumen UNA sola vez ──
        const composition = await page.evaluate(() => ({
            naranjo: document.querySelectorAll('#modSeguimientoCausalidad #modNaranjo').length,
            karch: document.querySelectorAll('#modSeguimientoCausalidad #modKarchLasagna').length,
            resumen: document.querySelectorAll('#modSeguimientoCausalidad #modResumenCausalidad').length,
            naranjoGroups: document.querySelectorAll('#modNaranjo .causality-chip-group').length,
            karchGroups: document.querySelectorAll('#modKarchLasagna .causality-chip-group').length,
            resumenNaranjo: document.querySelectorAll('#resumenNaranjo').length,
            resumenKl: document.querySelectorAll('#resumenKl').length,
            chipsInCards: document.querySelectorAll('#fhSegEaList .causality-chip-group').length
        }));
        assert.equal(composition.naranjo, 1, 'un solo cuestionario de Naranjo');
        assert.equal(composition.karch, 1, 'un solo cuestionario de Karch-Lasagna');
        assert.equal(composition.resumen, 1, 'un solo resumen de causalidad');
        assert.equal(composition.naranjoGroups, 10, 'Naranjo conserva sus 10 ítems');
        assert.equal(composition.karchGroups, 7, 'Karch-Lasagna conserva sus 7 ítems');
        assert.equal(composition.resumenNaranjo, 1, 'resumen Naranjo presente una sola vez');
        assert.equal(composition.resumenKl, 1, 'resumen Karch presente una sola vez');
        assert.equal(composition.chipsInCards, 0, 'ningún cuestionario duplicado dentro de las tarjetas EA');
        assert.equal((await page.locator('#resumenNaranjo').textContent()).trim(), String(expectedScore) + ' · ' + expectedNaranjoCat, 'el resumen refleja el contexto en edición');
        assert.equal((await page.locator('#resumenKl').textContent()).trim(), expectedKlCat, 'el resumen Karch refleja el contexto en edición');
        ok('G0 composition: the two existing questionnaires (10+7 items) and the single summary');

        // Frontera de persistencia: nada de causalidad en almacenamiento.
        const storageLog = await page.evaluate(() => window.__eaStorageLog);
        const idbLog = await page.evaluate(() => window.__eaIdbLog);
        const sessionDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(sessionStorage).map((key) => ({ [key]: sessionStorage.getItem(key) })))));
        const localDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(localStorage).map((key) => ({ [key]: localStorage.getItem(key) })))));
        for (const dump of [storageLog.join('|'), sessionDump, localDump]) {
            for (const needle of [epA, epB, ALFA, BETA, 'Medicamento Alfa', 'Cefalea']) {
                assert.ok(!dump.includes(needle), `nada de causalidad en sessionStorage/localStorage (${needle})`);
            }
        }
        assert.deepEqual(idbLog, [], 'ningún IndexedDB abierto por rutas del editor');
        ok('negative persistence proof: causality editing never reaches browser storage');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session A: console.error=0 pageerror=0');
    } catch (error) {
        bad('session A journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión B: explicaciones en español con controles inactivos ──────────────

{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    try {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });

        // «No consta»: sección inactiva y explicación visible, sin DEMO.
        assert.equal(await page.inputValue('#fhSeguimientoEaPresente'), 'no_consta');
        const noConsta = await page.evaluate(() => ({
            sectionHidden: document.getElementById('modSeguimientoCausalidad').classList.contains('hidden'),
            explanation: document.getElementById('fhSeguimientoEaNoCausalidad') && !document.getElementById('fhSeguimientoEaNoCausalidad').classList.contains('hidden'),
            text: (document.getElementById('fhSeguimientoEaNoCausalidad') || {}).textContent || ''
        }));
        assert.ok(noConsta.sectionHidden, '«No consta»: la sección de causalidad permanece inactiva');
        assert.ok(noConsta.explanation && noConsta.text.trim().length > 0, '«No consta»: explicación en español visible');
        ok('«No consta»: inactive causality section with a Spanish explanation');

        // «Sí» con cero EA: explicación y controles inactivos, sin episodios DEMO.
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        const zeroEa = await page.evaluate(() => {
            const section = document.getElementById('modSeguimientoCausalidad');
            const episode = document.getElementById('fhCausalityEpisode');
            const suspect = document.getElementById('fhCausalitySuspect');
            const notice = document.getElementById('fhCausalityContextoVacio');
            const chips = document.querySelectorAll('#modNaranjo .causality-chip, #modKarchLasagna .causality-chip');
            return {
                visible: !section.classList.contains('hidden'),
                noticeVisible: !!notice && !notice.classList.contains('hidden'),
                noticeText: notice ? notice.textContent.trim() : '',
                episodeDisabled: episode ? episode.disabled : null,
                suspectDisabled: suspect ? suspect.disabled : null,
                episodeOptions: episode ? Array.from(episode.options).map((option) => option.textContent) : [],
                chipsDisabled: Array.prototype.every.call(chips, (chip) => chip.disabled)
            };
        });
        assert.ok(zeroEa.visible, '«Sí» con 0 EA: la sección se muestra con estado explicado (capacidad ausente en BASE)');
        assert.ok(zeroEa.noticeVisible, '«Sí» con 0 EA: explicación en español visible');
        assert.ok(zeroEa.noticeText.length > 0, '«Sí» con 0 EA: la explicación tiene contenido');
        assert.equal(zeroEa.episodeDisabled, true, '«Sí» con 0 EA: selector de episodio inactivo');
        assert.equal(zeroEa.suspectDisabled, true, '«Sí» con 0 EA: selector de sospechoso inactivo');
        assert.ok(zeroEa.chipsDisabled, '«Sí» con 0 EA: cuestionarios inactivos');
        assert.ok(zeroEa.episodeOptions.every((text) => text.indexOf('DEMO-EP') === -1), '«Sí» con 0 EA: ningún episodio DEMO del HTML');
        ok('«Sí» with zero EA: Spanish explanation and appropriately inactive controls, no DEMO episodes');

        // «Sí» con EA pero sin sospechosos marcados: explicación y sospechoso inactivo.
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill('Fatiga');
        await card.getByRole('button', { name: 'Incorporar al acto' }).click();
        await page.waitForFunction(() => {
            const episode = document.getElementById('fhCausalityEpisode');
            return episode && Array.from(episode.options).some((option) => option.value && option.value.indexOf('FH-EA-EP-') === 0);
        }, null, { timeout: 5000 });
        const noSuspects = await page.evaluate(() => {
            const episode = document.getElementById('fhCausalityEpisode');
            const suspect = document.getElementById('fhCausalitySuspect');
            const notice = document.getElementById('fhCausalityContextoVacio');
            const chips = document.querySelectorAll('#modNaranjo .causality-chip, #modKarchLasagna .causality-chip');
            return {
                episodeDisabled: episode.disabled,
                episodeHasReal: Array.from(episode.options).some((option) => option.value.indexOf('FH-EA-EP-') === 0 && option.textContent.indexOf('Fatiga') !== -1),
                suspectDisabled: suspect.disabled,
                noticeVisible: !!notice && !notice.classList.contains('hidden'),
                noticeText: notice ? notice.textContent : '',
                chipsDisabled: Array.prototype.every.call(chips, (chip) => chip.disabled),
                suspectOptions: Array.from(suspect.options).map((option) => option.textContent)
            };
        });
        assert.equal(noSuspects.episodeDisabled, false, 'con EA documentados el selector de episodio está operativo');
        assert.ok(noSuspects.episodeHasReal, 'el selector ofrece el episodio real con su descripción');
        assert.equal(noSuspects.suspectDisabled, true, 'episodio sin sospechosos: selector de sospechoso inactivo');
        assert.ok(noSuspects.noticeVisible, 'episodio sin sospechosos: explicación visible');
        assert.ok(/sospechoso/i.test(noSuspects.noticeText), 'la explicación menciona el marcado expreso de sospechosos');
        assert.ok(noSuspects.chipsDisabled, 'episodio sin sospechosos: cuestionarios inactivos');
        assert.ok(noSuspects.suspectOptions.every((text) => text.indexOf('DEMO') === -1), 'sin sospechosos: ninguna identidad DEMO ofrecida');
        ok('documented EA without marked suspects: explanation shown, suspect selector and questionnaires inactive, no DEMO identities');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session B: console.error=0 pageerror=0');
    } catch (error) {
        bad('session B journeys', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nCAUSALITY-EDITOR-UI: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
