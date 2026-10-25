// Oráculo Metis WO FH-EA-G0-P1 (#827) · aislamiento de la «Causalidad final
// farmacéutica» heredada en el editor G0 provisional de Seguimiento.
//
// farmacia_seguimiento.html real, Chromium/Playwright, datos sintéticos y
// SOLO interacciones soportadas (selectOption, clicks en controles reales;
// nunca trucos DOM ni alterar readonly/disabled desde el test).
//
// Hecho reproducido (BASE RED): con un EA y dos sospechosos marcados
// expresamente, se selecciona el sospechoso A, se elige `Probable` en el
// selector heredado `#fhCausalidadFinal` y se cambia a B sin evaluarlo: el
// selector muestra `Probable` igualmente (y lo conserva al volver a A).
// La captura G0 aceptada valora por EA × sospechoso × método × acto; no
// admite trasladar causalidad entre sospechosos.
//
// Comportamiento exigido:
//   1. El selector final heredado no debe estar visible ni operable como
//      evaluación válida en el contexto G0 provisional (solución mínima
//      preferente: ocultar Y deshabilitar), y debe permanecer en el estado
//      clínicamente neutro «No evaluada»: ninguna pareja B recibe categoría
//      formal por A, y el resumen visible no presenta ninguna valoración
//      formal heredada (nada de `Probable` que exportar/atribuir).
//   2. A→B→A, B→A y EA1→EA2: no se transfieren valoraciones ni estados
//      formales; los borradores de Naranjo/Karch por pareja y método siguen
//      aislados exactamente como en BASE (regresión).
//   3. Cambio de paciente A→B→A en flujo soportado (búsqueda por CIP): no se
//      arrastra causalidad formal ni borradores entre pacientes; la edición
//      de causalidad G0 no produce escritura en almacenamiento (regresión).
//   4. Sin sospechoso explícito: controles de causalidad no operables y
//      ninguna puntuación calculada por ausencia o nombre de fármaco
//      (regresión).
//   5. Entrega manual con 2 EA incorporados (contrato FH-EA-MANUAL-01): la
//      copia TXT/JARA lleva UN informe íntegro del acto con cada EA una sola
//      vez, identidad y referencias explícitas y causalidad «No evaluada», sin
//      categorías formales heredadas ni borradores G0, y sin guardia falsa; la
//      copia v2 conserva su negativa visible por cobertura EA. Sospechosos solo
//      por marca expresa (regresión).
//
// Alineación de expectativas (WO FH-EA-MANUAL-02): la expectativa anterior de
// esta sesión —TXT/JARA bloqueado con 2 EA— quedó obsoleta cuando el contrato
// aprobado pasó el TXT y el Excel manual a exportación completa EA 0..N. Este
// oráculo la sustituye por la entrega manual real a través del portapapeles;
// no cambia producto, contrato, fixture ni motor Metis.
//
// En BASE este oráculo es RED por el hecho reproducido arriba (aserción, no
// excepción): la interacción soportada A `Probable` → B muestra indebidamente
// `Probable`. No se afirma fuga a persistencia ni exportación formal: el
// fallo demostrado es en UI, y las aserciones de almacenamiento/salidas son
// regresiones que ya pasan en BASE.
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
                return createRequire(path.join(candidate, '__fh_g0_p1_final_control_loader.cjs'))('playwright');
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

const CLIPBOARD_RESET = '__FH_EA_G0_CLIPBOARD_RESET__';
// Categoría formal de causalidad: nunca debe entregarse en la salida manual.
const FORMAL_CATEGORY = /\b(Posible|Probable|Definida|Cierta)\b/;

async function waitForClipboardText(page, predicate, description) {
    await page.bringToFront();
    const deadline = Date.now() + 10000;
    let last = '';
    for (;;) {
        last = String(await page.evaluate(() => navigator.clipboard.readText()));
        if (predicate(last)) return last;
        if (Date.now() > deadline) {
            throw new Error(`${description}: el portapapeles no contiene la entrega esperada (valor observado: ${JSON.stringify(last.slice(0, 200))})`);
        }
        await page.waitForTimeout(100);
    }
}

function countOccurrences(text, needle) {
    return String(text).split(needle).length - 1;
}

const ALFA = 'other:seg-other-1';
const BETA = 'other:seg-other-2';
const NEUTRO = 'No evaluada';

async function addIncorporatedEa(page, description) {
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill(description);
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
}

async function installStorageTraps(page) {
    await page.evaluate(() => {
        window.__eaStorageLog = [];
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            window.__eaStorageLog.push(String(key) + '::' + String(value));
            return originalSetItem.call(this, key, value);
        };
    });
}

// Estado observable del control final heredado, por lectura del DOM real.
function readFinalControl(page) {
    return page.evaluate(() => {
        const el = document.getElementById('fhCausalidadFinal');
        if (!el) return { present: false };
        const option = el.options[el.selectedIndex];
        return {
            present: true,
            visible: el.getClientRects().length > 0,
            disabled: el.disabled,
            value: el.value,
            shown: option ? (option.textContent || '').trim() : el.value
        };
    });
}

// Interacción soportada del hecho reproducido: SOLO si el control real está
// visible y operable el oráculo lo usa (en BASE lo está; la solución correcta
// lo oculta y deshabilita, y entonces el hecho ya no puede reproducirse).
async function reproducirHechoBaseSiOperable(page) {
    const before = await readFinalControl(page);
    if (before.present && before.visible && !before.disabled) {
        await page.selectOption('#fhCausalidadFinal', 'Probable');
        await page.selectOption('#fhCausalitySuspect', BETA);
        const other = await readFinalControl(page);
        assert.notEqual(other.shown, 'Probable',
            'interacción soportada A «Probable» → B sin evaluación muestra indebidamente «Probable» (hecho reproducido en BASE)');
        await page.selectOption('#fhCausalitySuspect', ALFA);
        const back = await readFinalControl(page);
        assert.notEqual(back.shown, 'Probable',
            'al volver a A el control tampoco puede conservar una categoría formal heredada sin pareja propia');
    }
    return before;
}

// Comportamiento exigido (hecho 1): oculto Y deshabilitado, estado neutro.
async function exigirFinalNeutroYNoOperable(page) {
    const state = await readFinalControl(page);
    assert.ok(state.present, 'el control #fhCausalidadFinal existe en el DOM (sin borrados de contrato)');
    assert.ok(!state.visible, 'el selector final heredado NO debe estar visible en el contexto G0 provisional');
    assert.ok(state.disabled, 'el selector final heredado NO debe estar operable en el contexto G0 provisional');
    assert.equal(state.value, NEUTRO, 'el control permanece en el estado clínicamente neutro «No evaluada»');
    const fugas = await page.evaluate(() => {
        const modulo = document.getElementById('modResumenCausalidad');
        if (!modulo) return [];
        const fugas = [];
        modulo.querySelectorAll('*').forEach((el) => {
            if (el.getClientRects().length === 0) return;
            const directo = Array.from(el.childNodes)
                .filter((nodo) => nodo.nodeType === 3)
                .map((nodo) => nodo.textContent)
                .join('');
            if (directo.indexOf('Probable') !== -1) fugas.push(el.tagName + '.' + el.className);
        });
        return fugas;
    });
    assert.deepEqual(fugas, [],
        'el resumen visible de causalidad no presenta ninguna valoración formal heredada («Probable»)');
    const jaraLines = await page.evaluate(() => window.FarmaciaSeguimiento.buildSegLines().join('\n'));
    assert.ok(jaraLines.indexOf('Probable') === -1,
        'las líneas que copia la salida TXT/JARA no contienen ninguna categoría formal heredada');
    return state;
}

// Preparación soportada compartida: presencia «Sí», EA incorporados,
// medicamentos con nombre y marca expresa de sospechosos por episodio.
async function prepararEditorG0(page, { episodios, marcarBeta = true }) {
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    for (const descripcion of episodios) await addIncorporatedEa(page, descripcion);
    await page.click('#btnSegAddOtherDrug');
    await page.click('#btnSegAddOtherDrug');
    const drugs = page.locator('#segOtrosFarmacosList .other-drug-card');
    await drugs.nth(0).locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
    await drugs.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Beta Sintético');
    const cards = page.locator('#fhSegEaList .ea-t01-card');
    await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
    if (marcarBeta) await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
    if (episodios.length > 1) await cards.nth(1).locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
    await page.waitForFunction((espera) => {
        const suspect = document.getElementById('fhCausalitySuspect');
        return suspect && Array.from(suspect.options).filter((option) => option.value).length >= (espera ? 2 : 1);
    }, marcarBeta, { timeout: 5000 });
    return page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#fhSegEaList .ea-t01-card'));
        return cards.map((card) => card.getAttribute('data-episode-id'));
    });
}

// ─── Sesión A (desktop 1440×900): hecho reproducido, aislamiento y guardias ──

{
    // La evidencia de entrega manual se lee del portapapeles real.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
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

        const episodeIds = await prepararEditorG0(page, { episodios: ['Cefalea', 'Náuseas'] });
        const epA = episodeIds[0];
        const epB = episodeIds[1];
        assert.ok(epA && epB, 'dos episodios incorporados en el flujo soportado');

        // ── Hecho reproducido (BASE RED) + comportamiento exigido (FIX GREEN) ──
        await page.selectOption('#fhCausalityEpisode', epA);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        await reproducirHechoBaseSiOperable(page);
        await exigirFinalNeutroYNoOperable(page);
        ok('final inherited control: A «Probable» → B never receives a formal category; control hidden+disabled, neutral «No evaluada», no formal value in summary or JARA lines');

        // Volver a B: tampoco hereda nada por haber estado A en edición.
        await page.selectOption('#fhCausalitySuspect', BETA);
        await exigirFinalNeutroYNoOperable(page);
        ok('B→A and back: no pair ever receives a formal final category from another pair');

        // ── Regresión (ya en BASE): borradores Naranjo/Karch aislados por pareja ──
        await page.selectOption('#fhCausalitySuspect', ALFA);
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip[data-value="si"]');
        const naranjoEsperado = await page.evaluate(() => window.FarmaciaValidationModel.calculateNaranjoScore({ q1: 'si', q2: 'si' }));
        await page.click('#modKarchLasagna .causality-chip-group[data-answer-id="klTemporal"] .causality-chip[data-value="si"]');
        await page.selectOption('#fhCausalitySuspect', BETA);
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'A/Beta no hereda chips de A/Alfa');
        assert.equal((await page.locator('#naranjoCategoria').textContent()).trim(), 'No evaluado', 'A/Beta sin respuestas se muestra «No evaluado»');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="no"]');
        await page.selectOption('#fhCausalitySuspect', ALFA);
        const q1 = await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip--active').getAttribute('data-value');
        const q2 = await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip--active').getAttribute('data-value');
        assert.equal(q1, 'si', 'A/Alfa restaura exactamente su Naranjo q1');
        assert.equal(q2, 'si', 'A/Alfa restaura exactamente su Naranjo q2');
        assert.equal((await page.locator('#naranjoScore').textContent()).trim(), String(naranjoEsperado), 'A/Alfa restaura su puntuación exacta');
        assert.equal(await page.locator('#modKarchLasagna .causality-chip-group[data-answer-id="klTemporal"] .causality-chip--active').getAttribute('data-value'), 'si', 'A/Alfa restaura su Karch exacto');
        ok('A→B→A suspect switching keeps Naranjo/Karch drafts isolated per pair and method (regression)');

        // ── Regresión (ya en BASE): EA1 → EA2 sin transferir estados ──
        await page.selectOption('#fhCausalityEpisode', epB);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        assert.equal(await page.locator('#modNaranjo .causality-chip--active').count(), 0, 'B/Alfa no hereda respuestas del episodio A');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ3"] .causality-chip[data-value="si"]');
        await page.selectOption('#fhCausalityEpisode', epA);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        assert.equal(await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ3"] .causality-chip--active').count(), 0, 'EA1 no hereda la respuesta registrada en EA2');
        await page.selectOption('#fhCausalityEpisode', epB);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        assert.equal(await page.locator('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ3"] .causality-chip--active').getAttribute('data-value'), 'si', 'EA2 conserva exactamente su propia respuesta');
        ok('EA1→EA2 episode switching keeps drafts isolated per EA × suspect × method (regression)');

        // ── Regresión (ya en BASE): la edición de causalidad no escribe en almacenamiento ──
        const needles = [epA, epB, ALFA, BETA, 'Probable', 'karch'];
        const storageLog = await page.evaluate(() => window.__eaStorageLog.join('|'));
        const sessionDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(sessionStorage).map((key) => ({ [key]: sessionStorage.getItem(key) })))));
        const localDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(localStorage).map((key) => ({ [key]: localStorage.getItem(key) })))));
        for (const dump of [storageLog, sessionDump, localDump]) {
            for (const needle of needles) {
                assert.ok(!dump.includes(needle), `la edición de causalidad no escribe en almacenamiento (${needle})`);
            }
        }
        ok('G0 causality editing performs no browser storage writes (regression)');

        // ── Entrega manual real con 2 EA (contrato FH-EA-MANUAL-01) ────────
        // Interacción soportada previa: seleccionar y dispensar una línea para
        // que las salidas manuales estén operables (igual que QA manual).
        await page.locator('.seg-line-card__control').first().check();
        await page.selectOption('#fhSegDispensado', 'si');
        await page.waitForFunction(() => {
            const txt = document.getElementById('fhSegExportTxt');
            return txt && !txt.disabled;
        }, null, { timeout: 5000 });
        await page.evaluate((marker) => navigator.clipboard.writeText(marker), CLIPBOARD_RESET);
        await page.click('#fhSegExportTxt');
        const txt = await waitForClipboardText(page, (text) => text !== CLIPBOARD_RESET, 'la copia TXT/JARA con dos EA');
        assert.ok(txt.startsWith('=== INFORME DE SEGUIMIENTO FARMACIA ==='), 'el TXT/JARA copia UN informe íntegro del acto');
        assert.ok(txt.indexOf('=== FIN DEL INFORME ===') !== -1, 'el informe copiado está completo');
        assert.ok(txt.indexOf('- EA incorporados en esta visita: 2') !== -1, 'el informe copiado declara los 2 EA incorporados del acto');
        assert.equal(countOccurrences(txt, 'Identidad: episodio'), 2, 'cada EA aparece una sola vez en la entrega TXT/JARA');
        assert.equal(countOccurrences(txt, 'Causalidad Naranjo: No evaluada'), 2, 'cada EA se entrega con la causalidad Naranjo sin evaluar');
        assert.equal(countOccurrences(txt, 'Causalidad Karch-Lasagna: No evaluada'), 2, 'cada EA se entrega con la causalidad Karch-Lasagna sin evaluar');
        assert.ok(!/Naranjo\s+\d/.test(txt), 'los borradores G0 en edición no se entregan como causalidad evaluada');
        assert.ok(!FORMAL_CATEGORY.test(txt), 'la entrega TXT/JARA no presenta ninguna categoría formal heredada');
        assert.ok(!/Valoración final/.test(txt), 'ninguna valoración final heredada se entrega con el acto');
        const guardia = await page.evaluate(() => {
            const notice = document.getElementById('fhSegEaExportGuardNotice');
            return { visible: notice && !notice.classList.contains('hidden'), text: notice ? notice.textContent : '' };
        });
        assert.ok(!guardia.visible, 'la entrega TXT/JARA con 2 EA no se acompaña de un bloqueo visible (no hay guardia falsa)');
        ok('manual delivery with 2 EA: the TXT/JARA copy carries the full act report without inherited formal categories or G0 drafts');
        const v2 = await page.evaluate(() => window.FarmaciaSeguimiento.getEaV2CopyBlockReason());
        assert.ok(v2.indexOf('No se ha copiado nada') !== -1, 'la frontera EA de la copia estructurada v2 sigue activa con cobertura EA');
        await page.click('#fhSegExportV2Btn');
        const v2Status = await page.evaluate(() => (document.getElementById('fhSegExportV2Status') || {}).textContent || '');
        assert.ok(v2Status.indexOf('Copia no realizada') !== -1, 'el intento real de copia v2 se niega de forma visible con cobertura EA');
        ok('v2 copy with EA coverage stays visibly blocked (regression)');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session A: console.error=0 pageerror=0');
    } catch (error) {
        bad('session A journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión B (desktop): cambio de paciente A→B→A en flujo soportado ────────

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

        await prepararEditorG0(page, { episodios: ['Cefalea'] });
        const epA = (await page.evaluate(() => document.querySelector('#fhSegEaList .ea-t01-card').getAttribute('data-episode-id')));
        await page.selectOption('#fhCausalityEpisode', epA);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await reproducirHechoBaseSiOperable(page);
        await exigirFinalNeutroYNoOperable(page);

        // Cambio de paciente soportado: búsqueda por CIP con confirmación.
        async function cambiarPaciente(cip) {
            await page.fill('#fhSegCip', cip);
            await page.click('#fhSegCipSearchBtn');
            await page.waitForFunction((esperado) => (document.getElementById('fhSegCip') || {}).value === esperado, cip, { timeout: 10000 });
        }
        await cambiarPaciente('CIP-DEMO-FH-002');
        let estado = await page.evaluate(() => ({
            chips: document.querySelectorAll('.causality-chip--active').length,
            finalValue: (document.getElementById('fhCausalidadFinal') || {}).value,
            eaEvents: window.FarmaciaSeguimiento.getEaEvents().length
        }));
        assert.equal(estado.chips, 0, 'cambio de paciente: ningún borrador de cuestionario se arrastra');
        assert.notEqual(estado.finalValue, 'Probable', 'cambio de paciente: ninguna causalidad formal se arrastra');
        assert.equal(estado.eaEvents, 0, 'cambio de paciente: la colección EA del contexto se reinicia');

        await cambiarPaciente('CIP-DEMO-FH-001');
        estado = await page.evaluate(() => ({
            chips: document.querySelectorAll('.causality-chip--active').length,
            finalValue: (document.getElementById('fhCausalidadFinal') || {}).value
        }));
        assert.equal(estado.chips, 0, 'vuelta al paciente A: los borradores del paciente B no reaparecen');
        assert.notEqual(estado.finalValue, 'Probable', 'vuelta al paciente A: ninguna causalidad formal heredada');

        const needles = [epA, ALFA, BETA, 'Probable', 'karch'];
        const storageLog = await page.evaluate(() => window.__eaStorageLog.join('|'));
        const sessionDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(sessionStorage).map((key) => ({ [key]: sessionStorage.getItem(key) })))));
        const localDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(localStorage).map((key) => ({ [key]: localStorage.getItem(key) })))));
        for (const dump of [storageLog, sessionDump, localDump]) {
            for (const needle of needles) {
                assert.ok(!dump.includes(needle), `el cambio de paciente no escribe causalidad EA en almacenamiento (${needle})`);
            }
        }
        ok('patient change A→B→A drags no formal causality or drafts and performs no EA causality storage writes (regression)');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session B: console.error=0 pageerror=0');
    } catch (error) {
        bad('session B patient switch', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión C (desktop): sin sospechoso explícito nada es operable ──────────

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

        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await addIncorporatedEa(page, 'Fatiga');
        await page.waitForFunction(() => {
            const episode = document.getElementById('fhCausalityEpisode');
            return episode && Array.from(episode.options).some((option) => option.value.indexOf('FH-EA-EP-') === 0);
        }, null, { timeout: 5000 });
        const sinSospechosos = await page.evaluate(() => {
            const episode = document.getElementById('fhCausalityEpisode');
            const suspect = document.getElementById('fhCausalitySuspect');
            const chips = document.querySelectorAll('#modNaranjo .causality-chip, #modKarchLasagna .causality-chip');
            const finalEl = document.getElementById('fhCausalidadFinal');
            return {
                episodeDisabled: episode.disabled,
                suspectDisabled: suspect.disabled,
                suspectOptions: Array.from(suspect.options).filter((o) => o.value).length,
                chipsDisabled: Array.prototype.every.call(chips, (chip) => chip.disabled),
                chipsActivos: document.querySelectorAll('.causality-chip--active').length,
                naranjoCategoria: (document.getElementById('naranjoCategoria') || {}).textContent || '',
                klCategoria: (document.getElementById('klCategoria') || {}).textContent || '',
                finalDisabled: finalEl ? finalEl.disabled : null,
                finalValue: finalEl ? finalEl.value : null
            };
        });
        assert.equal(sinSospechosos.episodeDisabled, false, 'con EA documentado el selector de episodio está operativo');
        assert.equal(sinSospechosos.suspectDisabled, true, 'sin sospechoso explícito el selector de sospechoso está inactivo');
        assert.equal(sinSospechosos.suspectOptions, 0, 'sin sospechoso explícito no se ofrece ningún candidato');
        assert.ok(sinSospechosos.chipsDisabled, 'sin sospechoso explícito los cuestionarios no son operables');
        assert.equal(sinSospechosos.chipsActivos, 0, 'sin sospechoso explícito ningún chip queda activo');
        assert.equal(sinSospechosos.naranjoCategoria.trim(), 'No evaluado', 'ninguna puntuación calculada por ausencia de sospechoso');
        assert.equal(sinSospechosos.klCategoria.trim(), 'No evaluado', 'ninguna categoría Karch por ausencia de sospechoso');
        if (sinSospechosos.finalDisabled !== null) {
            assert.ok(sinSospechosos.finalDisabled, 'sin sospechoso explícito el control final no es operable');
            assert.notEqual(sinSospechosos.finalValue, 'Probable', 'sin sospechoso explícito no hay categoría formal');
        }
        ok('without an explicit suspect: causality controls inoperative, no score computed by absence or drug name (regression)');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session C: console.error=0 pageerror=0');
    } catch (error) {
        bad('session C no-suspect boundary', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión D (móvil 390×844, foco del hecho reproducido) ───────────────────

{
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    try {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });

        await prepararEditorG0(page, { episodios: ['Cefalea'] });
        const epA = (await page.evaluate(() => document.querySelector('#fhSegEaList .ea-t01-card').getAttribute('data-episode-id')));
        await page.selectOption('#fhCausalityEpisode', epA);
        await page.selectOption('#fhCausalitySuspect', ALFA);
        await reproducirHechoBaseSiOperable(page);
        await exigirFinalNeutroYNoOperable(page);
        await page.selectOption('#fhCausalitySuspect', BETA);
        await exigirFinalNeutroYNoOperable(page);
        ok('mobile 390px: the inherited final control is hidden+disabled and neutral across suspect switching');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session D (mobile): console.error=0 pageerror=0');
    } catch (error) {
        bad('session D mobile', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nG0-FINAL-CONTROL-ISOLATION: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
