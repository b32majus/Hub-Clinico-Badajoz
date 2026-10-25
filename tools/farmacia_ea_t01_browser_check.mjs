#!/usr/bin/env node
// tools/farmacia_ea_t01_browser_check.mjs
// T01 (#795) — testigo de navegador auténtico (Playwright) sobre
// farmacia_seguimiento.html con datos sintéticos y SOLO interacciones
// soportadas (select/fill/click reales; sin set_content del mockup, sin
// manipulación del DOM). Demuestra:
//   · Captura 0..N real en pantalla: estado «Sí» con DOS EA incorporados,
//     una tarjeta expandida y otra plegada, consola/pageerror = 0, y
//     extensión a CINCO EA por interacciones soportadas (sin techo de cuatro).
//   · Snapshot desacoplado con identidades únicas y estables.
//   · Prueba negativa de persistencia: ninguna ruta T01 escribe contenido EA
//     en sessionStorage/localStorage/IndexedDB (trampas instaladas en vivo).
//   · FH-EA-MANUAL-01: las DOS salidas manuales representan la colección EA
//     0..N — ante 2 EA incorporados el TXT JARA copia un informe por visita
//     con cada EA exactamente una vez y el Excel WO8 manual copia una fila
//     por fármaco dispensado. El CSV conserva la frontera singular anterior
//     (se niega de forma visible y sin descarga) y la copia estructurada demo
//     (v2) sigue negándose: su proyección no lleva el bloque EA.
//   · act_date solo cuando el profesional registra la fecha; el
//     autorrelleno de inicialización no cuenta como registro.
//   · Causalidad independiente y no duplicada; sin reclamos de «guardado».
//   · Captura real 1440x900 y recorte del bloque EA para el eje Visual.
// Ejecutar: node tools/farmacia_ea_t01_browser_check.mjs

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        // Layouts sonrientes: <root>/node_modules/playwright (npx) y
        // <root>/lib/node_modules/playwright (npm install -g).
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_ea_t01_loader.cjs'))('playwright');
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

const artifactsDir = path.join(ROOT, 'artifacts');
if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true });

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
let passed = 0;
const failures = [];
function ok(name) { passed += 1; console.log(`PASS ${name}`); }
function bad(name, detail) { failures.push(name); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }

function resourceNoise(text) { return text.indexOf('Failed to load resource') !== -1; }

// Cadena EA sintética compartida por las dos sesiones de prueba (0/1/2/5).
const EA_TEXTS = ['Cefalea', 'Prurito de nueva aparición', 'Náuseas', 'Diarrea', 'Fatiga'];

async function captureEa(page, texts) {
    for (const text of texts) {
        await page.click('#fhSegAddEaBtn');
        const card = page.locator('#fhSegEaList .ea-t01-card').last();
        await card.locator('[data-ea-field="description"]').fill(text);
        await card.getByRole('button', { name: 'Incorporar al acto' }).click();
    }
}

function captureTwoEa(page) {
    return (async () => {
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await captureEa(page, EA_TEXTS.slice(0, 2));
    })();
}

// ─── Sesión A: viaje visual + snapshot + frontera de persistencia ────────────

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

        // Trampas de almacenamiento instaladas antes de la interacción EA.
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

        // C-088 SPEC-04: el viaje auténtico cubre también los estados 0 y 1
        // EA mediante interacciones/estado de pantalla soportados, antes de
        // extender a 2 y 5 EA. Estado 0-EA inicial: «No consta», zona EA
        // oculta y un acto sin ningún EA en el snapshot.
        assert.equal(await page.inputValue('#fhSeguimientoEaPresente'), 'no_consta', 'initial presence is «No consta» (0-EA state)');
        assert.ok(await page.locator('#fhSegEaZone').isHidden(), 'EA zone hidden in the initial «No consta» 0-EA state');
        const initialSnapshot = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.ok(initialSnapshot && initialSnapshot.present === 'no_consta' && initialSnapshot.event_count === 0 && initialSnapshot.events.length === 0, 'initial «No consta» 0-EA state: the act snapshot carries zero EA');
        ok('initial 0-EA «No consta» state asserted through supported screen state');

        // Estado «Sí» con 0 EA: zona visible y vacía; el snapshot es
        // fail-closed (SPEC-01) también ante el testigo de navegador.
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        assert.equal(await page.locator('#fhSegEaList .ea-t01-card').count(), 0, '«Sí» with 0 EA renders no cards');
        assert.equal((await page.locator('#fhSegEaCountBadge').textContent()).trim(), '0', 'count badge shows 0');
        assert.ok(await page.locator('#fhSegEaEmpty').isVisible(), 'empty-state message visible with 0 EA');
        assert.equal(await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot()), null, '«Sí» + 0 EA: no prepared block (SPEC-01 fail-closed witnessed live)');
        ok('«Sí» with 0 EA: visible empty zone and fail-closed null snapshot (SPEC-01)');

        // Viaje de 1 EA antes de añadir más: identidad de episodio observada
        // en pantalla coincide con la del snapshot.
        await captureEa(page, EA_TEXTS.slice(0, 1));
        const oneCard = page.locator('#fhSegEaList .ea-t01-card');
        assert.equal(await oneCard.count(), 1, 'single-EA journey renders exactly one card');
        assert.equal((await page.locator('#fhSegEaCountBadge').textContent()).trim(), '1', 'count badge shows 1');
        const oneSnapshot = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(oneSnapshot.event_count, 1, 'snapshot with exactly one incorporated EA');
        const stableEpisodeId = oneSnapshot.events[0].episode_id;
        const cardIdAtOne = await oneCard.first().getAttribute('data-episode-id');
        assert.ok(cardIdAtOne && cardIdAtOne === stableEpisodeId, 'screen card identity matches the snapshot episode identity at 1 EA');
        ok('single-EA journey asserted (0→1) with screen/snapshot identity agreement');

        // Segundo EA: la identidad del primer episodio NO cambia al crecer la
        // cardinalidad dentro de la misma sesión de edición (sin recarga ni
        // reclamos de persistencia).
        await captureEa(page, EA_TEXTS.slice(1, 2));

        const cards = page.locator('#fhSegEaList .ea-t01-card');
        assert.equal(await cards.count(), 2, 'two EA cards rendered through supported interactions');
        const episodeIds = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-episode-id')));
        assert.equal(new Set(episodeIds).size, 2, 'two distinct stable episode identities');
        assert.equal(episodeIds[0], cardIdAtOne, 'first episode id stable across cardinality change 1→2 (same editing session)');
        const twoSnapshot = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(twoSnapshot.events[0].episode_id, stableEpisodeId, 'snapshot first episode identity stable across 1→2');
        ok('state «Sí» with TWO incorporated EA via supported interactions, distinct stable episode ids, identity stable 1→2');

        // Estado visual equivalente al segmento maestro: tarjeta 1 expandida con
        // evolución «En seguimiento», tarjeta 2 plegada.
        const firstCard = page.locator('#fhSegEaList .ea-t01-card').first();
        await firstCard.locator('select[data-ea-field="evolution"]').selectOption('en_seguimiento');
        await page.locator('#fhSegEaList .ea-t01-card').nth(1).getByRole('button', { name: 'Ocultar' }).click();
        assert.equal(await page.locator('#fhSegEaList .ea-t01-card').nth(1).locator('[data-ea-field="description"]').count(), 0, 'collapsed card hides its body');
        assert.equal(await page.locator('#fhSegEaList .ea-t01-card').nth(0).locator('[data-ea-field="description"]').count(), 1, 'expanded card keeps editable body');
        assert.equal((await firstCard.locator('.status-badge').nth(1).textContent()).trim(), 'EN SEGUIMIENTO', 'expanded card badge reflects documented evolution');
        // C-088 VIS-03: la insignia de estado de la tarjeta EA usa el
        // tratamiento del máster (ámbar/naranja, casi cuadrada), comprobado
        // por CSS computado; sin tocar otras insignias.
        const eaBadgeTreatment = await firstCard.locator('.status-badge').nth(1).evaluate((node) => {
            const style = getComputedStyle(node);
            return { cls: node.className, background: style.backgroundColor, color: style.color, radius: style.borderRadius };
        });
        assert.ok(eaBadgeTreatment.cls.includes('status-badge--ea-card'), 'EA card status badge carries the master treatment class (VIS-03)');
        assert.equal(eaBadgeTreatment.background, 'rgb(254, 243, 199)', 'EA card status badge uses the master amber background');
        assert.equal(eaBadgeTreatment.color, 'rgb(146, 64, 14)', 'EA card status badge uses the master orange text');
        assert.ok(parseFloat(eaBadgeTreatment.radius) < 8, 'EA card status badge is near-square, not a pill');
        const countBadgeTreatment = await page.locator('#fhSegEaCountBadge').evaluate((node) => getComputedStyle(node).borderRadius);
        assert.ok(countBadgeTreatment !== eaBadgeTreatment.radius || countBadgeTreatment === '6px', 'count badge keeps its own VIS-01 treatment');
        ok('one expanded and one collapsed card preserve in-session editing state');

        // C-088 VIS-01/VIS-02: fidelidad del segmento máster G0 v0.4 en el
        // estado equivalente (Sí, dos EA, tarjeta 1 expandida, 2 plegada).
        assert.ok(await page.locator('#fhSegEaPriorEpisodeSelect').isDisabled(), 'prior-episode select visible but non-functional (demo, T01)');
        assert.ok(await page.locator('#fhSegEaUpdatePriorBtn').isDisabled(), '«Actualizar EA anterior» visible but non-functional (demo, T01)');
        assert.ok(await page.locator('#fhSegEaRecurrenceBtn').isDisabled(), '«Registrar recurrencia» visible but non-functional (demo, T01)');
        assert.ok((await page.locator('#fhSegEaZone').textContent()).includes('Continuidad y recurrencia requieren selección explícita'), 'master continuity/recurrence hint present');
        const expandedBody = page.locator('#fhSegEaList .ea-t01-card').first();
        assert.equal(await expandedBody.locator('details summary').count(), 1, 'expanded card shows the master disclosure');
        assert.ok((await expandedBody.locator('details summary').textContent()).includes('Información clínica adicional (opcional)'), 'disclosure matches master wording');
        assert.equal(await expandedBody.locator('details input[disabled], details textarea[disabled]').count(), 3, 'disclosure demo fields are inert');
        assert.ok((await expandedBody.textContent()).includes('Medicamentos señalados expresamente como sospechosos'), 'per-episode suspect section present in expanded card');
        assert.equal(await expandedBody.locator('.ea-suspect-list input[type="checkbox"]').count(), 0, 'no suspect candidates without an explicitly named medicine');
        assert.ok((await expandedBody.locator('.ea-suspect-list').textContent()).includes('Sin medicamentos identificados explícitamente'), 'empty candidate source is explained, never filled with demo medicines');
        assert.ok((await page.locator('#fhSegEaSummary').textContent()).trim().startsWith('2 observación/es en esta visita · 2 episodio/s relacionado/s'), 'master footer summary arrangement');
        assert.ok(await page.locator('#fhSegEaShowStructureBtn').isDisabled(), '«Ver estructura simulada» visible but non-functional (demo, T01)');
        assert.ok(await page.locator('#fhSegEaResetDemoBtn').isDisabled(), '«Reiniciar ejemplo» visible but non-functional (demo, T01)');
        ok('master segment fidelity present with explicit non-functional demo signaling (VIS-01/VIS-02)');

        // Captura real del producto EN EL ESTADO DEL MÁSTER (antes de extender
        // a 5 EA): viewport 1440x900 + recorte del bloque EA.
        await page.locator('#modSeguimientoEa').scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(artifactsDir, 'FH_EA_T01_producto_1440x900.png') });
        await page.locator('#modSeguimientoEa').screenshot({ path: path.join(artifactsDir, 'FH_EA_T01_producto_EA_recorte.png') });
        ok('real product screenshots captured: 1440x900 viewport and EA segment crop (two-EA master state)');

        // Snapshot desacoplado del bloque EA.
        const snapshot = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(snapshot.event_count, 2, 'snapshot event_count');
        assert.equal(snapshot.events[0].description, 'Cefalea', 'snapshot preserves original description');
        assert.equal(new Set(snapshot.events.flatMap((event) => [event.episode_id, event.observation_id])).size, 4, 'unique episode/observation identities');
        assert.ok(!Object.prototype.hasOwnProperty.call(snapshot, 'actId') && !Object.prototype.hasOwnProperty.call(snapshot, 'act_id'), 'no fabricated actId');
        assert.deepEqual(Object.keys(snapshot.events[0]).sort(), ['description', 'episode_id', 'evolution', 'observation_id', 'severity'], 'no spontaneous meds/dates/severity/causality keys');
        // C-088 SPEC-03: la inicialización legacy autorrellena fhSegFecha sin
        // registro del profesional → el snapshot NO lleva act_date.
        const autoFilledDate = await page.inputValue('#fhSegFecha');
        assert.ok(autoFilledDate, 'legacy initialization auto-fills fhSegFecha (pre-filled input behavior preserved)');
        assert.ok(!Object.prototype.hasOwnProperty.call(snapshot, 'act_date'), 'auto-filled date is NOT treated as recorded: act_date absent until the professional records it');
        await page.fill('#fhSegFecha', '2026-10-18');
        const snapshotWithDate = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(snapshotWithDate.act_date, '2026-10-18', 'single act date only when recorded (fhSegFecha)');
        ok('detached EA block snapshot: unique identities, no invented fields, act_date only when recorded by the professional');

        // C-088 SPEC-04: cinco EA en la misma pantalla por interacciones
        // soportadas (sin techo de cuatro).
        await captureEa(page, EA_TEXTS.slice(2));
        const fiveCards = page.locator('#fhSegEaList .ea-t01-card');
        assert.equal(await fiveCards.count(), 5, 'five EA cards rendered in the same screen through supported interactions');
        const fiveEpisodeIds = await fiveCards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-episode-id')));
        assert.equal(new Set(fiveEpisodeIds).size, 5, 'five distinct stable episode identities (no cap-4 regression)');
        assert.equal(fiveEpisodeIds[0], cardIdAtOne, 'first episode id stable across cardinality change 1→5 (same editing session)');
        assert.equal((await page.locator('#fhSegEaCountBadge').textContent()).trim(), '5', 'count badge shows 5');
        const fiveSnapshot = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(fiveSnapshot.event_count, 5, 'five incorporated EA in the detached snapshot');
        assert.equal(new Set(fiveSnapshot.events.map((event) => event.episode_id)).size, 5, 'five unique episodes in snapshot');
        assert.equal(fiveSnapshot.events[0].episode_id, stableEpisodeId, 'snapshot first episode identity stable across 1→5');
        ok('FIVE EA captured via supported screen interactions in the same act (0/1/2/5 journey)');

        // Prueba negativa de persistencia: nada con contenido EA en storage.
        const storageLog = await page.evaluate(() => window.__eaStorageLog);
        const idbLog = await page.evaluate(() => window.__eaIdbLog);
        const sessionDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(sessionStorage).map((key) => ({ [key]: sessionStorage.getItem(key) })))));
        const localDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(localStorage).map((key) => ({ [key]: localStorage.getItem(key) })))));
        for (const dump of [storageLog.join('|'), sessionDump, localDump]) {
            for (const needle of [...EA_TEXTS, 'FH-EA-EP-', 'FH-EA-OBS-']) {
                assert.ok(!dump.includes(needle), `no EA content in browser storage (${needle})`);
            }
        }
        assert.deepEqual(idbLog, [], 'no IndexedDB database opened by any T01 code path');
        const transient = await page.evaluate(() => ({
            transient: document.getElementById('fhSegEaList').hasAttribute('data-fh-transient'),
            withId: document.querySelectorAll('#fhSegEaList input[id], #fhSegEaList select[id], #fhSegEaList textarea[id]').length
        }));
        assert.ok(transient.transient && transient.withId === 0, 'EA card controls stay outside the patient draft envelope');
        ok('negative persistence proof: no EA content in sessionStorage/localStorage/IndexedDB and no envelope reuse');

        // Causalidad independiente y no duplicada. Con el editor G0 la sección
        // se muestra al haber EA documentados, pero sigue siendo una sección
        // independiente: fuera del bloque EA y sin cuestionarios por tarjeta.
        const causality = await page.evaluate(() => {
            const section = document.getElementById('modSeguimientoCausalidad');
            const eaBlock = document.getElementById('modSeguimientoEa');
            return {
                visible: !section.classList.contains('hidden'),
                independent: !eaBlock.contains(section),
                titles: (eaBlock.textContent.match(/Análisis de causalidad/g) || []).length,
                duplicatedQuestionnaires: document.querySelectorAll('#fhSegEaList .causality-chip-group, #fhSegEaList #modNaranjo, #fhSegEaList #modKarchLasagna').length
            };
        });
        assert.ok(causality.visible, 'causality section is visible with documented EA (G0 editor active)');
        assert.ok(causality.independent, 'causality section stays independent (outside the EA block)');
        assert.equal(causality.titles, 0, 'no causality questionnaire duplicated inside EA cards');
        assert.equal(causality.duplicatedQuestionnaires, 0, 'no Naranjo/Karch triggers per EA card');
        ok('causality remains an independent section, never duplicated per EA card');

        // Sin reclamo de «guardado» en ninguna superficie T01.
        const visibleText = await page.evaluate(() => (document.getElementById('modSeguimientoEa').textContent + ' ' + document.getElementById('modExportacion').textContent));
        assert.ok(!/guardad[oa]s?\s+(correctamente|con éxito)|datos guardados|se han guardado|ha sido guardad|persistid[oa]\s+en|saved successfully/i.test(visibleText), 'no «guardado/persisted» success claim anywhere');
        assert.ok(visibleText.includes('no guarda en historia clínica'), 'explicit no-save disclosure visible');
        ok('UI distinguishes draft vs prepared act vs persisted and never claims «guardado»');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session A journeys: console.error=0 pageerror=0');
    } catch (error) {
        bad('session A journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión B: contradicción «Sí»→«No», CSV singular y salidas manuales 0..N ─

{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    // FH-EA-MANUAL-01: el testigo lee el portapapeles real tras la copia
    // soportada de TXT JARA y de la fila Excel WO8 manual.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    const consoleErrors = [];
    const pageErrors = [];
    const downloads = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('download', (download) => downloads.push(download.suggestedFilename()));
    try {
        await page.goto(base + 'farmacia_seguimiento.html?cip=CIP-DEMO-FH-001', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
        await captureTwoEa(page);
        assert.equal(await page.locator('#fhSegEaList .ea-t01-card').count(), 2, 'two incorporated EA prepared');

        // Contradicción: «Sí»→«No» bloqueada con explicación y sin borrado.
        await page.selectOption('#fhSeguimientoEaPresente', 'no');
        assert.equal(await page.inputValue('#fhSeguimientoEaPresente'), 'si', 'select reverts to «Sí»');
        const contradiction = await page.evaluate(() => ({
            visible: !document.getElementById('fhSegEaContradictionNotice').classList.contains('hidden'),
            text: document.getElementById('fhSegEaContradictionNotice').textContent
        }));
        assert.ok(contradiction.visible && contradiction.text.includes('no se ha eliminado nada'), 'contradiction explanation shown without data deletion');
        const snapshotAfter = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(snapshotAfter.event_count, 2, 'blocked contradiction preserves both incorporated EA');
        assert.ok(!Object.prototype.hasOwnProperty.call(snapshotAfter, 'act_date'), 'session B never records the act date: auto-filled value stays out of the snapshot (SPEC-03)');
        ok('contradiction «Sí»→«No/No consta» blocked with explanation and no data deletion');

        // FH-EA-MANUAL-01: habilitar las salidas. El CSV conserva la frontera
        // singular anterior; TXT JARA y Excel WO8 manual representan 0..N.
        await page.selectOption('#fhSegDispensado', 'si');
        await page.waitForFunction(() => !document.getElementById('fhSegExportTxt').disabled, null, { timeout: 5000 });
        const guardNotice = () => page.evaluate(() => ({
            visible: !document.getElementById('fhSegEaExportGuardNotice').classList.contains('hidden'),
            text: document.getElementById('fhSegEaExportGuardNotice').textContent
        }));
        const countIn = (haystack, needle) => haystack.split(needle).length - 1;
        const clipboardText = () => page.evaluate(() => navigator.clipboard.readText());
        const exportSnapshot = await page.evaluate(() => ({
            dispensedLines: window.FarmaciaSeguimiento.buildFollowupVisitExportModel().dispensed_lines.map((item) => item.line_id),
            identities: window.FarmaciaSeguimiento.buildEaActBlockSnapshot().events.flatMap((event) => [event.episode_id, event.observation_id]),
            columns: window.FarmaciaExcelRowExport.WO8_COLUMNS.length,
            eaColumn: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('ea_descripcion'),
            lineColumn: window.FarmaciaExcelRowExport.WO8_COLUMNS.indexOf('linea_id')
        }));

        // CSV: fuera del alcance manual, mantiene el fallo cerrado singular.
        await page.click('#fhSegExportCsv');
        await page.waitForTimeout(150);
        const csvGuard = await guardNotice();
        assert.ok(csvGuard.visible, 'fhSegExportCsv: visible fail-closed refusal');
        assert.ok(csvGuard.text.includes('2 EA incorporados') && csvGuard.text.includes('no se exporta solo el primer EA'), 'fhSegExportCsv: refusal declares 0..N instead of truncating');
        assert.deepEqual(downloads, [], 'no file download fired while the singular CSV export is blocked');
        ok('CSV keeps the previous singular frontier: visibly refuses 0..N without download');

        // TXT JARA manual: no se niega; un informe por visita, cada EA una vez.
        await page.click('#fhSegExportTxt');
        await page.waitForTimeout(250);
        const jaraManual = await clipboardText();
        assert.ok(jaraManual.includes('VISITA DE SEGUIMIENTO — EFECTOS ADVERSOS'), 'TXT JARA keeps the adverse-event report section');
        assert.equal(countIn(jaraManual, EA_TEXTS[0]), 1, 'TXT JARA: first incorporated EA appears exactly once (one report per visit)');
        assert.equal(countIn(jaraManual, EA_TEXTS[1]), 1, 'TXT JARA: second incorporated EA appears exactly once (one report per visit)');
        exportSnapshot.identities.forEach((identity) => assert.ok(jaraManual.includes(identity), `TXT JARA preserves the explicit EA identity ${identity}`));
        assert.ok(!jaraManual.includes('no se exporta solo el primer EA'), 'TXT JARA no longer refuses the 0..N collection');
        assert.ok(!(await guardNotice()).visible, 'TXT JARA: no refusal notice after a successful copy');
        ok('TXT JARA manual carries one visit report with each of the two EA exactly once');

        // Excel WO8 manual: una fila TSV por fármaco efectivamente dispensado.
        assert.ok(exportSnapshot.dispensedLines.length >= 1, 'the witnessed act has at least one effectively dispensed line');
        await page.click('#fhSegExcelExportBtn');
        await page.waitForTimeout(250);
        const excelTsv = await clipboardText();
        const tsvRows = excelTsv.split('\n').filter((row) => row.trim() !== '');
        assert.equal(tsvRows.length, exportSnapshot.dispensedLines.length, 'Excel WO8 manual: exactly one TSV row per dispensed drug line (never one row per EA)');
        const tsvCells = tsvRows.map((row) => row.split('\t'));
        tsvCells.forEach((cells, index) => assert.equal(cells.length, exportSnapshot.columns, `Excel row ${index + 1} keeps the 62 canonical WO8 cells`));
        assert.deepEqual(tsvCells.map((cells) => cells[exportSnapshot.lineColumn]), exportSnapshot.dispensedLines, 'Excel WO8 manual: row identity/order matches the dispensed lines');
        tsvCells.forEach((cells, index) => {
            assert.ok(cells[exportSnapshot.eaColumn].includes(EA_TEXTS[0]) && cells[exportSnapshot.eaColumn].includes(EA_TEXTS[1]), `Excel row ${index + 1}: both incorporated EA are projected, none truncated`);
            assert.equal(countIn(cells[exportSnapshot.eaColumn], EA_TEXTS[0]), 1, `Excel row ${index + 1}: first EA written once per row`);
        });
        assert.ok(!(await guardNotice()).visible, 'Excel WO8 manual: no refusal notice after a successful copy');
        ok('Excel WO8 manual copies exactly one row per dispensed line with the full 0..N EA projection');

        // C-088 SPEC-02: la copia estructurada demo (v2) también se niega de
        // forma visible con cobertura EA (su proyección no lleva el bloque
        // EA); no se dispara copia ni mensaje de éxito.
        assert.ok(!(await page.locator('#fhSegExportV2Btn').isDisabled()), 'v2 copy button available so the guard is exercised on the action itself');
        await page.click('#fhSegExportV2Btn');
        await page.waitForTimeout(150);
        const v2Guard = await page.evaluate(() => ({
            visible: !document.getElementById('fhSegEaExportGuardNotice').classList.contains('hidden'),
            text: document.getElementById('fhSegEaExportGuardNotice').textContent,
            status: document.getElementById('fhSegExportV2Status').textContent
        }));
        assert.ok(v2Guard.visible, 'v2 structured copy shows the visible refusal notice');
        assert.ok(v2Guard.text.includes('no representa la cobertura EA') && v2Guard.text.includes('No se ha copiado nada'), 'v2 refusal declares the EA coverage cannot be represented and nothing was copied');
        assert.ok(v2Guard.status.indexOf('Copia no realizada') === 0, 'v2 status declares refusal, never success');
        ok('structured demo copy (v2) visibly refuses with EA coverage; no copy fired');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter(t => !resourceNoise(t)), [], 'console.error');
        ok('session B journeys: console.error=0 pageerror=0');
    } catch (error) {
        bad('session B journeys', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nFARMACIA-EA-T01-BROWSER: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
