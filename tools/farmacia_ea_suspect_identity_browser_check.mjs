#!/usr/bin/env node
// tools/farmacia_ea_suspect_identity_browser_check.mjs
// FH-EA-02 (G0 Captura) — testigo focal de identidad de sospechosos por
// episodio EA sobre farmacia_seguimiento.html. Chromium/Playwright real,
// datos sintéticos y SOLO interacciones soportadas (fill/click/select y
// seams públicos de la propia pantalla; sin DOM forcing, sin readonly
// alterado, sin estado imposible). Demuestra:
//   · 0..N casillas REALES por episodio desde medicamentos identificados
//     explícitamente; nada se autoselecciona; A y B mantienen marcas
//     independientes aunque compartan medicamento; desmarcado real.
//   · El bloque deja de ser DEMO: chips sintéticos A/B/C eliminados y
//     mensaje literal «Selección en edición. No forma parte del acto
//     preparado, no se ha guardado ni exportado» visible.
//   · Guardias de identidad: renombrar A como B, cambiar principio activo /
//     identificadores o seleccionar otra entrada de catálogo está bloqueado
//     mientras el fármaco sea sospechoso explícito (bug de retitular A como B
//     conservando marca); dosis y datos no identitarios siguen editables;
//     borrar el origen exigible solo tras desvincular.
//   · refresh de casillas al modificar TODAS las fuentes autorizadas: alta,
//     selección de catálogo, baja de «Otros fármacos» y cambios de línea /
//     restauración de estado (restoreEvaluationState).
//   · Casos negativos: fuente ausente → «Referencia pendiente de
//     reconciliación» sin reasociar; cambio de paciente A→B con
//     confirmación de datos no guardados y contexto B limpio; regresar a A
//     sin memoria (sin persistencia); snapshot del acto SIN suspect_ids;
//     getEaEvents() SÍ refleja la colección; legacy adverse_event intacto.
//   · Captura visual real del estado autorizado por la WO:
//     artifacts/FH_EA_02_sospechosos_1440x900.png (viewport 1440x900) y
//     recorte del bloque EA para el eje Visual.
//   · FH-EA-02B (casos negativos nuevos): fuente ausente fija pendiente de
//     forma irreversible aunque la identidad EXACTA (mismo id, mismo
//     contenido) reaparezca; sourceType (Otros) y codigo_nacional /
//     nregistro / source_type (líneas) forman parte de la huella completa.
//     Las transiciones de fuente sin UI propia usan SOLO el seam público
//     restoreEvaluationState — QA del seam, no recorrido UI.
//   · FH-EA-02B corrección 1 (F2): el recorrido C1 deposita además la
//     captura real del estado PENDIENTE («fuente idéntica devuelta, sigue
//     pendiente»), fuera del repo en
//     /srv/kairos-lab/metis-runs/nexus/fh-ea-closure/02b-evidence/ (testigo
//     visual de la WO). Si esa ruta no está disponible, el test sigue
//     verde y lo declara INCOMPLETE_VISUAL_EVIDENCE sin inventar alternativas.
//   · FH-EA-02B corrección 2 (F2-residual): el testigo refleja el estado
//     visual declarado por la WO — 2 EA en 1440x900: el EA con la referencia
//     Gamma pendiente y un segundo EA real incorporado por UI soportada
//     («Añadir nuevo EA» → «Incorporar al acto») SIN sospechosos (no se
//     fabrican sospechas ni identidades). Capturas: 1440x900 completa +
//     recorte EA1 + recorte de la lista EA con ambas tarjetas.
// Ejecutar: node tools/farmacia_ea_suspect_identity_browser_check.mjs

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
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_ea_susp_identity_loader.cjs'))('playwright');
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
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_seguimiento.html';
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

function sortedIds(value) {
    return Array.isArray(value) ? value.slice().sort() : value;
}

async function captureIncorporatedEa(page, text) {
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill(text);
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
}

// Entrada de catálogo sintética concreta (drug_id + source_type CIMA +
// nombre_presentacion), como las que el desplegable CIMA real ofrecería.
const SYNTH_CATALOG_GAMMA = {
    drug_id: 'SYN-CAT-GAMMA',
    source_type: 'CIMA',
    nombre_comercial: 'Medicamento Gamma Catálogo Sintético',
    nombre_presentacion: 'Gamma 10 mg',
    principio_activo: 'Principio Gamma Sintético',
    dosis: '10 mg'
};

// ─── Sesión A: sospechosos 0..N por episodio, guardias de identidad, ─────────
//     captura visual del estado autorizado y frontera snapshot/legacy.

{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const dialogs = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('dialog', async (dialog) => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        await dialog.accept();
    });
    try {
        await page.goto(base + 'farmacia_seguimiento.html', { waitUntil: 'domcontentloaded' });
        await page.fill('#fhSegCip', 'CIP-SUSP01-TEST-A');
        await page.click('#fhSegCipSearchBtn');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');

        // Dos EA incorporados por interacciones soportadas.
        await captureIncorporatedEa(page, 'EA Alfa sintético');
        await captureIncorporatedEa(page, 'EA Beta sintético');
        const cards = page.locator('#fhSegEaList .ea-t01-card');
        assert.equal(await cards.count(), 2, 'two EA incorporated');
        const episodeIds = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-episode-id')));
        assert.equal(new Set(episodeIds).size, 2, 'two distinct stable episode ids');
        // Sin medicamentos identificados: 0 candidatos y explicación visible,
        // nunca chips «A/B/C» falsos ni autoselección.
        assert.equal(await cards.first().locator('.ea-suspect-list input[type="checkbox"]').count(), 0, '0 real checkboxes without named medicines');
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Sin medicamentos identificados explícitamente'), 'empty candidate source explained, no demo chips');
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents())).map((event) => event.suspect_ids), [[], []], 'collection in memory carries empty per-episode suspect_ids');
        ok('two incorporated EA start with 0 candidates and empty per-episode suspect_ids (no demo chips, no autoselection)');

        // Alta de «Otros fármacos» con nombres reales por controles reales:
        // las casillas aparecen en TODAS las tarjetas, sin preselección.
        await page.click('#btnSegAddOtherDrug');
        await page.click('#btnSegAddOtherDrug');
        const drugs = page.locator('#segOtrosFarmacosList .other-drug-card');
        await drugs.nth(0).locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
        await drugs.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Beta Sintético');
        assert.equal(await cards.first().locator('.ea-suspect-list input[type="checkbox"]').count(), 2, 'adding named sources refreshes candidates on every card');
        assert.equal(await cards.nth(1).locator('.ea-suspect-list input[type="checkbox"]').count(), 2, 'second card refreshed too');
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Alfa Sintético'), 'chip shows the real source name');
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Beta Sintético'), 'chip shows the second source name');
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents())).map((event) => event.suspect_ids), [[], []], 'candidates are never auto-marked');
        ok('adding «Otros fármacos» refreshes real candidate checkboxes with real names, nothing preselected');

        // Marcado explícito por episodio: tarjeta 1 marca ambos, tarjeta 2
        // solo Beta. Compartir medicamento NO comparte marca ni evaluación.
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        await cards.nth(1).locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        let events = await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents());
        assert.deepEqual(sortedIds(events[0].suspect_ids), ['other:seg-other-1', 'other:seg-other-2'], 'card 1 carries two explicit suspects');
        assert.deepEqual(events[1].suspect_ids, ['other:seg-other-2'], 'card 2 marks only Beta: same medicine, independent mark');
        const visit = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit());
        assert.deepEqual(visit.adverse_event.suspect_ids, [], 'legacy singular adverse_event.suspect_ids untouched');
        assert.deepEqual(visit.causality_by_suspect, {}, 'legacy causality_by_suspect untouched');
        assert.ok((await cards.first().textContent()).includes('Selección en edición. No forma parte del acto preparado, no se ha guardado ni exportado'), 'literal editing-only disclosure visible');
        assert.ok(await page.evaluate(() => {
            const hint = document.querySelector('#fhSegEaList .ea-t01-card .ea-suspect-list + p.search-card__hint');
            return hint && hint.textContent.indexOf('Selección en edición. No forma parte del acto preparado, no se ha guardado ni exportado') === 0;
        }), 'suspects hint leads with the mandated literal message');
        // Tratamiento teal del máster G0 v0.4: casilla + borde teal marcados;
        // neutros sin marcar.
        const chipStates = await cards.first().locator('.ea-suspect-list label').evaluateAll((labels) =>
            labels.map((label) => {
                const input = label.querySelector('input');
                return { checked: input.checked, border: getComputedStyle(label).borderTopColor, accent: getComputedStyle(input).accentColor };
            }));
        assert.deepEqual(chipStates.map((chip) => chip.checked), [true, true], 'both card-1 chips marked');
        assert.ok(chipStates.every((chip) => chip.border === 'rgb(0, 135, 119)' && chip.accent === 'rgb(0, 135, 119)'), 'marked chips use the master teal treatment (checkbox + border)');
        const unmarkedChip = await cards.nth(1).locator('.ea-suspect-list label').nth(0).evaluate((label) => ({
            border: getComputedStyle(label).borderTopColor,
            accent: getComputedStyle(label.querySelector('input')).accentColor
        }));
        assert.equal(unmarkedChip.border, 'rgb(226, 232, 240)', 'unmarked chips keep the neutral border');
        assert.equal(unmarkedChip.accent, 'auto', 'unmarked checkboxes keep the neutral accent');
        ok('explicit A/B marks are per-episode, legacy state untouched, literal hint leads the block, teal master treatment on marked chips');

        // Estado autorizado por la WO para la evidencia visual:
        // presencia Sí, 2 EA incorporados, tarjeta 1 desplegada, 2
        // medicamentos sintéticos introducidos por controles reales y
        // marcados de forma explícita. Captura real 1440x900 + recorte EA.
        await cards.first().locator('select[data-ea-field="evolution"]').selectOption('en_seguimiento');
        await cards.nth(1).getByRole('button', { name: 'Ocultar' }).click();
        assert.equal(await cards.nth(1).locator('.ea-suspect-list').count(), 0, 'card 2 collapsed like the accepted master');
        assert.equal(await cards.first().locator('.ea-suspect-list input[type="checkbox"]:checked').count(), 2, 'card 1 keeps both explicit marks in the visual state');
        await page.locator('#modSeguimientoEa').scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const fullShot = path.join(artifactsDir, 'FH_EA_02_sospechosos_1440x900.png');
        const cropShot = path.join(artifactsDir, 'FH_EA_02_sospechosos_EA_recorte.png');
        await page.screenshot({ path: fullShot });
        await page.locator('#modSeguimientoEa').screenshot({ path: cropShot });
        assert.ok(existsSync(fullShot) && statSync(fullShot).size > 0, 'authorized-state viewport capture exists');
        assert.ok(existsSync(cropShot) && statSync(cropShot).size > 0, 'EA block crop capture exists');
        ok('authorized visual state captured: artifacts/FH_EA_02_sospechosos_1440x900.png (+ EA crop)');

        // Guardia de identidad (bug de retitular): renombrar A como B con la
        // marca puesta se bloquea, revierte y no transfiere ni conserva la
        // sospecha sobre una identidad distinta.
        const nameA = drugs.nth(0).locator('input[data-field="farmaco"]');
        await nameA.fill('Medicamento Sustituto Sintético');
        assert.equal(await nameA.inputValue(), 'Medicamento Alfa Sintético', 'renaming a marked medicine reverts in the control');
        assert.equal((await page.evaluate(() => window.FarmaciaSeguimiento.getFollowupOtherDrugs()))[0].farmaco, 'Medicamento Alfa Sintético', 'model identity not mutated');
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Alfa Sintético'), 'chips keep the original identity');
        assert.ok(dialogs.some((d) => d.type === 'alert' && d.message.includes('Desvincúlelo antes de cambiar su identidad')), 'identity-change guard explains itself');
        // Identidad por otros campos también bloqueada…
        const principleA = drugs.nth(0).locator('input[data-field="principioActivo"]');
        await principleA.fill('Otro principio activo sintético');
        assert.equal(await principleA.inputValue(), '', 'principio activo blocked and reverted for a marked medicine');
        // …pero la dosis anotada y los datos no identitarios siguen editables.
        const doseA = drugs.nth(0).locator('input[data-field="dosis"]');
        await doseA.fill('Dosis anotada sintética');
        assert.equal((await page.evaluate(() => window.FarmaciaSeguimiento.getFollowupOtherDrugs()))[0].dosis, 'Dosis anotada sintética', 'non-identity data (dose) stays editable');
        ok('identity guard blocks rename/principle changes on a marked medicine; annotated dose stays editable');

        // Selección de catálogo sobre el medicamento marcado: bloqueada (no
        // traslada la sospecha a otra identidad de catálogo).
        const blockedSelection = await page.evaluate(() =>
            window.FarmaciaSeguimiento.applyCatalogSelectionToOtherDrug('seg-other-1', {
                drug_id: 'SYN-CAT-OTRO', source_type: 'CIMA', nombre_comercial: 'Otro Catálogo Sintético',
                nombre_presentacion: 'Otro 5 mg', principio_activo: 'Otro principio sintético'
            }));
        assert.equal(blockedSelection, false, 'catalog selection over a marked medicine is refused');
        assert.equal((await page.evaluate(() => window.FarmaciaSeguimiento.getFollowupOtherDrugs()))[0].farmaco, 'Medicamento Alfa Sintético', 'catalog identity not applied over a marked medicine');
        ok('catalog selection over a marked medicine is refused (no identity transfer through CIMA/catálogo)');

        // Selección de catálogo sobre un candidato NO marcado: permitida y
        // refresca las casillas (la fuente de candidatos no es solo el nombre).
        await page.click('#btnSegAddOtherDrug');
        await drugs.nth(2).locator('input[data-field="farmaco"]').fill('Medicamento Gamma Sintético');
        const selection = await page.evaluate(() =>
            window.FarmaciaSeguimiento.applyCatalogSelectionToOtherDrug('seg-other-3', {
                drug_id: 'SYN-CAT-GAMMA',
                source_type: 'CIMA',
                nombre_comercial: 'Medicamento Gamma Catálogo Sintético',
                nombre_presentacion: 'Gamma 10 mg',
                principio_activo: 'Principio Gamma Sintético',
                dosis: '10 mg'
            }));
        assert.notEqual(selection, false, 'catalog selection on an unmarked candidate proceeds');
        const gammaModel = (await page.evaluate(() => window.FarmaciaSeguimiento.getFollowupOtherDrugs()))[2];
        assert.equal(gammaModel.selectedDrugId, 'SYN-CAT-GAMMA', 'catalog identity recorded on the unmarked drug');
        assert.equal(gammaModel.origenCatalogo, 'CIMA', 'catalog origin recorded');
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Gamma Catálogo Sintético'), 'chips refresh after catalog selection, not only on name typing');
        // Rotulación de origen histórico (WO:37): la distinción histórica
        // disponible en getRelevantDrugCandidates se preserva como sufijo
        // rotulado de la casilla, sin presumir actividad, exposición ni
        // auto-marca.
        await drugs.nth(2).locator('select').first().selectOption('Biológico previo/histórico');
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Gamma Catálogo Sintético — Biológico previo/histórico'), 'historic rotulation preserved as chip suffix');
        assert.deepEqual(sortedIds((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids), ['other:seg-other-1', 'other:seg-other-2'], 'rotulation never marks anything by itself');
        ok('catalog selection on an unmarked candidate refreshes suspect chips; historic origin kept in the chip rotulation');

        // Borrar el origen de una sospecha explícita: bloqueado hasta
        // desvincular; tras desmarcar, la eliminación procede y las casillas
        // se actualizan (baja de «Otros fármacos»).
        await drugs.nth(1).getByRole('button', { name: 'Eliminar' }).click();
        assert.equal(await drugs.count(), 3, 'deleting a medicine marked in an EA card is blocked');
        assert.ok(dialogs.some((d) => d.message.includes('Desvincúlelo en esa ficha antes de eliminarlo')), 'delete guard explains itself');
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        events = await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents());
        assert.deepEqual(sortedIds(events[0].suspect_ids), ['other:seg-other-1'], 'unmarking works per episode (desmarcado real)');
        assert.deepEqual(events[1].suspect_ids, ['other:seg-other-2'], 'card 2 mark on the same medicine stays independent');
        await cards.nth(1).getByRole('button', { name: 'Revisar' }).click();
        await cards.nth(1).locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        await drugs.nth(1).getByRole('button', { name: 'Eliminar' }).click();
        assert.equal(await drugs.count(), 2, 'after explicit unlinking the source can be deleted');
        assert.deepEqual(sortedIds((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids), ['other:seg-other-1'], 'remaining marks keep their stable source ids');
        assert.equal(await cards.first().locator('.ea-suspect-list input[type="checkbox"]').count(), 2, 'removal refreshes the candidate checkboxes');
        ok('source deletion blocked while marked; after unmarking, deletion proceeds and chips refresh');

        // Huella completa + degradación PEGAJOSA (residual Spec/Standards):
        // la marca se ancla a la identidad completa de la fuente, no solo a
        // su nombre visible, y ninguna coincidencia posterior la restaura
        // automáticamente.
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        assert.deepEqual(sortedIds((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids), ['other:seg-other-1', 'other:seg-other-3'], 'Gamma markable with a full identity fingerprint');

        // (a) Gamma→Delta→Gamma: la degradación es pegajosa; recuperar la
        // identidad original NO re-presenta la marca sin reconciliación.
        await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines(),
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            state.related_treatments.find((drug) => drug.uid === 'seg-other-3').farmaco = 'Medicamento Delta Sintético';
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
        });
        const card1Pending = () => cards.first().locator('.ea-suspect-list label').filter({ hasText: 'pendiente de reconciliación' });
        assert.equal(await card1Pending().count(), 1, 'renaming the marked source (same id) degrades the mark to pending reconciliation');
        assert.ok(!(await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Delta Sintético'), 'the new identity is never presented as the marked suspect');
        await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines(),
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            state.related_treatments.find((drug) => drug.uid === 'seg-other-3').farmaco = 'Medicamento Gamma Catálogo Sintético';
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
        });
        assert.equal(await card1Pending().count(), 1, 'degradation is sticky: the original identity returning does not auto-restore the mark');
        assert.ok(!(await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Gamma Catálogo Sintético — Biológico previo/histórico'), 'no automatic re-presentation of the mark after identity recovery');
        ok('(a) Gamma→Delta→Gamma stays pending without auto-restoration (sticky degradation)');

        // (b) Restauración con el MISMO nombre e identidad distinta: la
        // comparación es de huella completa (principio activo, identificadores),
        // no del nombre visible.
        await card1Pending().locator('input').click();
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Gamma Catálogo Sintético — Biológico previo/histórico'), 'explicit re-mark starts a fresh fingerprint');
        await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines(),
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            const gamma = state.related_treatments.find((drug) => drug.uid === 'seg-other-3');
            gamma.principioActivo = 'Principio Gamma Alterado Sintético';
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
        });
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('pendiente de reconciliación'), 'same visible name with altered identity still degrades: the full fingerprint is compared');
        assert.equal(await card1Pending().count(), 1, 'the altered-identity mark is presented as pending, not as current');
        ok('(b) same name with different identity (principle changed) is caught by the full fingerprint');

        // (c) Marca restaurada sin huella registrada en esta sesión: pendiente,
        // nunca sospecha vigente sobre identidad no verificada.
        await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines(),
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            const firstEpisode = state.current_visit.adverse_events[0].episode_id;
            state.current_visit.adverse_events.find((event) => event.episode_id !== firstEpisode).suspect_ids = ['other:seg-other-3'];
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
        });
        assert.equal(await cards.nth(1).locator('.ea-suspect-list label').filter({ hasText: 'pendiente de reconciliación' }).count(), 1, 'restored mark without a session fingerprint stays pending');
        assert.ok(!(await cards.nth(1).locator('.ea-suspect-list').textContent()).includes('— Biológico previo/histórico'), 'unverified identity is never presented as a current suspect');
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[1].suspect_ids, ['other:seg-other-3'], 'reference preserved anchored to its id');
        ok('(c) mark without registered fingerprint is shown pending, never as a verified current suspect');

        // (d) Única vía de reconciliación: desvincular y volver a marcar de
        // forma expresa restaura la presentación normal.
        await card1Pending().locator('input').click();
        await cards.first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
        assert.ok((await cards.first().locator('.ea-suspect-list').textContent()).includes('Medicamento Gamma Catálogo Sintético — Biológico previo/histórico'), 'unmark + explicit re-mark restores the normal presentation');
        assert.equal(await card1Pending().count(), 0, 'no pending chips remain on card 1 after explicit reconciliation');
        ok('(d) unlink + explicit re-mark is the only reconciliation path and restores normal presentation');

        // Frontera T01 intacta: snapshot del acto SIN suspect_ids (claves
        // exactas de evento sin cambios), colección en memoria SÍ las lleva,
        // legacy global intacto e independiente; exportación V2 sigue
        // bloqueada (sin exportación parcial); ids de episodio estables.
        const snapshot = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.equal(snapshot.event_count, 2, 'snapshot keeps both incorporated EA');
        assert.deepEqual(Object.keys(snapshot.events[0]).sort(), ['description', 'episode_id', 'evolution', 'observation_id', 'severity'], 'snapshot event keys unchanged: no suspect_ids, missing clinical data stays absent');
        assert.ok(snapshot.events.every((event) => !Object.prototype.hasOwnProperty.call(event, 'suspect_ids')), 'act snapshot never exposes suspect_ids');
        events = await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents());
        assert.deepEqual(sortedIds(events[0].suspect_ids), ['other:seg-other-1', 'other:seg-other-3'], 'in-memory collection reflects the selection');
        assert.deepEqual(events[1].suspect_ids, ['other:seg-other-3'], 'second episode keeps its own reference');
        assert.ok(events.every((event) => Array.isArray(event.suspect_ids)), 'getEaEvents exposes per-episode suspect_ids');
        const visitAfter = await page.evaluate(() => window.FarmaciaSeguimiento.getCurrentVisit());
        assert.deepEqual(visitAfter.adverse_event.suspect_ids, [], 'legacy adverse_event.suspect_ids still empty and independent');
        const v2Reason = await page.evaluate(() => window.FarmaciaSeguimiento.getEaV2CopyBlockReason());
        assert.ok(v2Reason.includes('No se ha copiado nada'), 'structured demo copy still refuses: no partial export of the editing selection');
        const currentIds = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-episode-id')));
        assert.deepEqual(currentIds, episodeIds, 'episode ids stable across the whole suspect journey in the same visit');
        const storageDump = await page.evaluate(() => JSON.stringify(Object.assign({}, ...Object.keys(sessionStorage).map((key) => ({ [key]: sessionStorage.getItem(key) })))) + JSON.stringify(Object.assign({}, ...Object.keys(localStorage).map((key) => ({ [key]: localStorage.getItem(key) })))));
        assert.ok(!storageDump.includes('FH-EA-EP-') && !storageDump.includes('other:seg-other'), 'no suspect/episode content reaches web storage: editing memory only');
        ok('act snapshot without suspect_ids, in-memory collection with them, legacy intact, exports still blocked, ids stable, no persistence');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter((t) => !resourceNoise(t)), [], 'console.error');
        ok('session A journeys: console.error=0 pageerror=0');
    } catch (error) {
        bad('session A journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión B: candidatos de línea, cambio de línea/restauración, ────────────
//     fuente ausente sin reasociar y cambio de paciente A→B seguro.

{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const dialogs = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('dialog', async (dialog) => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        await dialog.accept();
    });
    const chipList = page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list');
    try {
        await page.goto(base + 'farmacia_seguimiento.html', { waitUntil: 'domcontentloaded' });
        await page.fill('#fhSegCip', 'CIP-SUSP01-TEST-B');
        await page.click('#fhSegCipSearchBtn');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await captureIncorporatedEa(page, 'EA de línea sintética');
        const card = page.locator('#fhSegEaList .ea-t01-card').first();
        assert.equal(await card.locator('.ea-suspect-list input[type="checkbox"]').count(), 0, 'no candidates before any line is identified');

        // Cambio de línea principal por la ruta soportada de restauración de
        // estado (restoreEvaluationState): la línea identificada aparece como
        // candidato con nombre real y casilla real.
        const withLine = await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines(),
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            state.canonical_lines = [{
                linea_id: 'BIO-SYN-L2',
                nombre_linea: 'Biológico Sintético Gamma',
                estado_linea: 'active',
                tipo_relacion: 'primary'
            }];
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
            return window.FarmaciaSeguimiento.getEaEvents();
        });
        assert.ok(withLine[0] && Array.isArray(withLine[0].suspect_ids), 'restoration keeps the per-episode collection');
        assert.equal(await chipList.locator('input[type="checkbox"]').count(), 1, 'line source appears as a real candidate after the line change');
        assert.ok((await chipList.textContent()).includes('Biológico Sintético Gamma'), 'line chip shows the real line name');
        await chipList.locator('input[type="checkbox"]').first().click();
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids, ['line:BIO-SYN-L2'], 'line candidate markable by stable id');
        ok('main line change (restore path) refreshes candidates; line markable explicitly by stable id');

        // Cambiar la identidad de la línea marcada conservando el id NO
        // transfiere la sospecha al nuevo fármaco: la marca se degrada a
        // «Referencia pendiente de reconciliación» sin reasociar (fail-closed
        // simétrico a la guardia de identidad de «Otros fármacos»).
        await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: [{
                    linea_id: 'BIO-SYN-L2',
                    nombre_linea: 'Biológico Sintético Delta',
                    estado_linea: 'active',
                    tipo_relacion: 'primary'
                }],
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
        });
        assert.ok((await chipList.textContent()).includes('Referencia pendiente de reconciliación (line:BIO-SYN-L2)'), 'renaming a marked line degrades the mark to pending reconciliation');
        assert.ok((await chipList.textContent()).includes('fuente no disponible'), 'degraded mark is explicitly signposted');
        assert.ok(!(await chipList.textContent()).includes('Biológico Sintético Delta'), 'the new name is never presented as the marked suspect (no identity transfer)');
        assert.equal(await chipList.locator('input[type="checkbox"]').count(), 1, 'no duplicate chip for the renamed line');
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids, ['line:BIO-SYN-L2'], 'reference preserved anchored to the stable id, without reassociation');
        ok('line identity change degrades the mark to pending reconciliation: the suspect never transfers to the new name');

        // Fuente ausente: la referencia se conserva rotulada como pendiente
        // de reconciliación, sin reasociar ni fabricar identidad nueva.
        await page.evaluate(() => {
            const state = {
                current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
                canonical_lines: [],
                related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
            };
            window.FarmaciaSeguimiento.restoreEvaluationState(state);
        });
        assert.ok((await chipList.textContent()).includes('Referencia pendiente de reconciliación (line:BIO-SYN-L2)'), 'missing source keeps the reference labelled for reconciliation');
        assert.ok((await chipList.textContent()).includes('fuente no disponible'), 'missing source is explicitly signposted');
        assert.equal(await chipList.locator('input[type="checkbox"]').count(), 1, 'no fabricated replacement candidates');
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids, ['line:BIO-SYN-L2'], 'reference preserved without reassociation');
        const snapshotMissing = await page.evaluate(() => window.FarmaciaSeguimiento.buildEaActBlockSnapshot());
        assert.ok(snapshotMissing.events.every((event) => !Object.prototype.hasOwnProperty.call(event, 'suspect_ids')), 'missing source never leaks into the act snapshot');
        // La reconciliación es explícita: desmarcar la referencia suelta la
        // marca (nada se reconstruye en silencio).
        await chipList.locator('input[type="checkbox"]').first().click();
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids, [], 'unlinking a dangling reference is an explicit act');
        ok('missing source: pending-reconciliation reference, no reassociation, no fabricated candidates, snapshot clean');

        // Cambio de paciente A→B con datos no guardados: confirmación
        // explícita y contexto B limpio; regresar a A no simula recuperación.
        await page.fill('#fhSegCip', 'CIP-SUSP01-TEST-C');
        await page.click('#fhSegCipSearchBtn');
        assert.ok(dialogs.some((d) => d.type === 'confirm' && d.message.includes('datos no guardados')), 'patient switch with unsaved data asks for confirmation');
        let state = await page.evaluate(() => ({
            cip: (window.FarmaciaSeguimiento.getCurrentVisit() || {}).cip,
            events: window.FarmaciaSeguimiento.getEaEvents(),
            drugs: window.FarmaciaSeguimiento.getFollowupOtherDrugs(),
            lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines()
        }));
        assert.equal(state.cip, 'CIP-SUSP01-TEST-C', 'context switched to patient B');
        assert.deepEqual(state.events, [], 'patient B starts with no EA marks');
        assert.deepEqual(state.drugs, [], 'patient B starts with no related treatments');
        assert.deepEqual(state.lines, [], 'patient B starts with no line candidates');
        await page.fill('#fhSegCip', 'CIP-SUSP01-TEST-B');
        await page.click('#fhSegCipSearchBtn');
        state = await page.evaluate(() => ({
            events: window.FarmaciaSeguimiento.getEaEvents(),
            drugs: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
        }));
        assert.deepEqual(state.events, [], 'returning to A does not resurrect editing memory (no persistence)');
        assert.deepEqual(state.drugs, [], 'no related treatments either');
        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter((t) => !resourceNoise(t)), [], 'console.error');
        ok('A→B switch confirms unsaved data, B is clean, returning to A restores nothing (memory only)');
    } catch (error) {
        bad('session B journeys', error && error.message);
    } finally {
        await context.close();
    }
}

// ─── Sesión C (FH-EA-02B): cierre de identidad y degradación pegajosa ────────
//     ante pérdida/reaparición de fuente idéntica y campos identitarios
//     omitidos en la huella (sourceType de Otros; codigo_nacional,
//     nregistro y source_type de líneas). Las transiciones de fuente sin
//     UI propia usan ÚNICAMENTE el seam público window.FarmaciaSeguimiento
//     .restoreEvaluationState con estado válido del mismo paciente/acto —
//     QA del seam, no recorrido UI; sin manipular DOM ni readonly.

{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const dialogs = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('dialog', async (dialog) => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        await dialog.accept();
    });
    const card1 = page.locator('#fhSegEaList .ea-t01-card').first();
    const chipList = card1.locator('.ea-suspect-list');
    const pendingFor = (reference) =>
        chipList.locator('label').filter({ hasText: 'Referencia pendiente de reconciliación (' + reference + ')' });
    // Transición de fuente por el seam público soportado: estado válido del
    // mismo paciente/acto con la mutación descrita (QA del seam, no recorrido UI).
    const restoreWith = (mutation) => page.evaluate((m) => {
        const state = {
            current_visit: window.FarmaciaSeguimiento.getCurrentVisit(),
            canonical_lines: window.FarmaciaSeguimiento.getCurrentCanonicalLines(),
            related_treatments: window.FarmaciaSeguimiento.getFollowupOtherDrugs()
        };
        if (m.dropDrugUid) state.related_treatments = state.related_treatments.filter((drug) => drug.uid !== m.dropDrugUid);
        if (m.addDrugs) state.related_treatments = m.addDrugs.concat(state.related_treatments);
        if (m.patchUid && m.patch) {
            const drug = state.related_treatments.find((item) => item.uid === m.patchUid);
            if (drug) Object.assign(drug, m.patch);
        }
        if (m.replaceLinesWith) state.canonical_lines = m.replaceLinesWith;
        if (m.patchLine && m.linePatch) {
            const line = state.canonical_lines.find((item) => item.linea_id === m.patchLine);
            if (line) Object.assign(line, m.linePatch);
        }
        window.FarmaciaSeguimiento.restoreEvaluationState(state);
    }, mutation);
    try {
        await page.goto(base + 'farmacia_seguimiento.html', { waitUntil: 'domcontentloaded' });
        await page.fill('#fhSegCip', 'CIP-SUSP01-TEST-D');
        await page.click('#fhSegCipSearchBtn');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        await captureIncorporatedEa(page, 'EA Gamma 02B sintético');

        // ── Caso 1: pérdida de fuente y reaparición EXACTA idéntica ───────
        await page.click('#btnSegAddOtherDrug');
        const drugsC = page.locator('#segOtrosFarmacosList .other-drug-card');
        await drugsC.nth(0).locator('input[data-field="farmaco"]').fill('Medicamento Gamma Sintético');
        await chipList.locator('input[type="checkbox"]').first().click();
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids, ['other:seg-other-1'], 'Gamma explicitly marked in EA1');
        assert.equal(await pendingFor('other:seg-other-1').count(), 0, 'the mark starts vigente');
        const gammaIdentity = await page.evaluate(() =>
            JSON.parse(JSON.stringify(window.FarmaciaSeguimiento.getFollowupOtherDrugs().find((drug) => drug.uid === 'seg-other-1'))));
        // Fuente ausente (mismo paciente/acto, estado válido) → pendiente.
        await restoreWith({ dropDrugUid: 'seg-other-1' });
        assert.equal(await pendingFor('other:seg-other-1').count(), 1, 'absent source degrades the mark to pending reconciliation (QA del seam, no recorrido UI)');
        // La fuente EXACTA (mismo uid, mismo contenido) reaparece: sigue pendiente.
        await restoreWith({ addDrugs: [gammaIdentity] });
        assert.equal(await pendingFor('other:seg-other-1').count(), 1, 'the identical source (same id, same content) returning does NOT restore vigente: degradation is irreversible');
        assert.ok(!(await chipList.textContent()).includes('Medicamento Gamma Sintético'), 'the returned identity is never re-presented as the current suspect');
        // FH-EA-02B corrección 2 (F2-residual): el estado visual declarado por
        // la WO es 2 EA. Se incorpora un segundo EA REAL por la UI soportada
        // («Añadir nuevo EA» → «Incorporar al acto»), sin sospechosos; no se
        // fabrican sospechas ni identidades. Su lista se pliega con el control
        // propio «Ocultar», igual que en el máster G0 aceptado, para que ambas
        // tarjetas quepan en el testigo 1440x900. La referencia Gamma pendiente
        // no cambia por añadir este segundo EA.
        await captureIncorporatedEa(page, 'EA Delta 02B sintético');
        const cardsC = page.locator('#fhSegEaList .ea-t01-card');
        assert.equal(await cardsC.count(), 2, 'witness state holds two real EA episodes');
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[1].suspect_ids, [], 'the second witness EA carries no suspects');
        await cardsC.nth(1).getByRole('button', { name: 'Ocultar' }).click();
        assert.equal(await cardsC.nth(1).locator('.ea-suspect-list').count(), 0, 'second witness EA collapsed with its own supported control, like the accepted master');
        assert.equal(await pendingFor('other:seg-other-1').count(), 1, 'the Gamma pending reference is unchanged by adding the second EA');
        // Testigo visual de la WO (FH-EA-02B, F2 y corrección 2): captura real
        // del estado PENDIENTE «fuente idéntica devuelta, sigue pendiente» con
        // 2 EA, desde este testigo focal con controles reales (la transición
        // de fuente usó el seam público legítimo). Depositada FUERA del repo,
        // para el eje Visual/UX. Fallo de captura no rebaja el recorrido: se
        // declara INCOMPLETE_VISUAL_EVIDENCE.
        await cardsC.nth(1).scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const evidenceDir = '/srv/kairos-lab/metis-runs/nexus/fh-ea-closure/02b-evidence';
        try {
            mkdirSync(evidenceDir, { recursive: true });
            const pendingFullShot = path.join(evidenceDir, 'FH_EA_02B_pendiente_1440x900.png');
            const pendingCropShot = path.join(evidenceDir, 'FH_EA_02B_pendiente_EA1_recorte.png');
            const pendingEaListShot = path.join(evidenceDir, 'FH_EA_02B_pendiente_EA_lista_recorte.png');
            await page.screenshot({ path: pendingFullShot });
            await card1.screenshot({ path: pendingCropShot });
            await page.locator('#fhSegEaList').screenshot({ path: pendingEaListShot });
            assert.ok(existsSync(pendingFullShot) && statSync(pendingFullShot).size > 0, 'pending-state viewport capture exists (1440x900, 2 EA, fuera del repo)');
            assert.ok(existsSync(pendingCropShot) && statSync(pendingCropShot).size > 0, 'pending-state EA1 crop capture exists (fuera del repo)');
            assert.ok(existsSync(pendingEaListShot) && statSync(pendingEaListShot).size > 0, 'pending-state EA-list crop capture exists (both EA cards, fuera del repo)');
            ok('FH-EA-02B pending-state visual witness captured with the WO-declared two-EA state (real pixels, fuera del repo): FH_EA_02B_pendiente_1440x900.png + FH_EA_02B_pendiente_EA1_recorte.png + FH_EA_02B_pendiente_EA_lista_recorte.png');
        } catch (captureError) {
            console.warn('INCOMPLETE_VISUAL_EVIDENCE — pending-state capture unavailable: ' + (captureError && captureError.message));
        }
        // Única vía de reconciliación: desmarcar y volver a marcar expresamente.
        await pendingFor('other:seg-other-1').locator('input').click();
        await chipList.locator('label').filter({ hasText: 'Medicamento Gamma Sintético' }).locator('input').click();
        assert.deepEqual((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids, ['other:seg-other-1'], 'explicit re-mark restores the reference anchored to its id');
        assert.equal(await pendingFor('other:seg-other-1').count(), 0, 'unmark + explicit re-mark is the only path back to vigente');
        ok('C1: absent source sets pending irreversibly; identical source return never auto-restores; only unmark + explicit re-mark reconciles (QA del seam, no recorrido UI)');

        // ── Caso 2: cambiar SOLO sourceType (Otros) por el seam ───────────
        await page.click('#btnSegAddOtherDrug');
        await drugsC.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Iota Sintético');
        const iotaSelection = await page.evaluate(() =>
            window.FarmaciaSeguimiento.applyCatalogSelectionToOtherDrug('seg-other-2', {
                drug_id: 'SYN-CAT-IOTA-02B', source_type: 'CIMA',
                nombre_comercial: 'Medicamento Iota Catálogo Sintético',
                nombre_presentacion: 'Iota 20 mg', principio_activo: 'Principio Iota Sintético', dosis: '20 mg'
            }));
        assert.notEqual(iotaSelection, false, 'Iota catalog identity recorded before marking');
        await chipList.locator('label').filter({ hasText: 'Medicamento Iota Catálogo Sintético' }).locator('input').click();
        assert.deepEqual(sortedIds((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids), ['other:seg-other-1', 'other:seg-other-2'], 'Iota marked with its full identity (sourceType CIMA inside the fingerprint)');
        await restoreWith({ patchUid: 'seg-other-2', patch: { sourceType: 'LOCAL' } });
        assert.equal(await pendingFor('other:seg-other-2').count(), 1, 'changing ONLY sourceType degrades the mark to pending');
        assert.ok(!(await chipList.textContent()).includes('Medicamento Iota Catálogo Sintético'), 'the source is never presented as a current suspect over a changed sourceType');
        await restoreWith({ patchUid: 'seg-other-2', patch: { sourceType: 'CIMA' } });
        assert.equal(await pendingFor('other:seg-other-2').count(), 1, 'restoring the original sourceType does NOT auto-restore the mark: irreversible');
        ok('C2: sourceType is part of the other-drug fingerprint; changing it degrades the mark to pending irreversibly even if the original value returns (QA del seam, no recorrido UI)');

        // ── Caso 3: codigo_nacional / nregistro / source_type de línea ────
        const kappaLine = {
            linea_id: 'BIO-SYN-02B-L1', nombre_linea: 'Biológico Sintético Kappa 02B',
            farmaco_nombre: 'Fármaco Kappa Sintético', nombre_comercial: 'Kappa Comercial Sintético',
            principio_activo: 'Principio Kappa Sintético',
            codigo_nacional: 'CN-SYN-111', nregistro: 'NR-SYN-111', source_type: 'CIMA',
            estado_linea: 'active', tipo_relacion: 'primary'
        };
        await restoreWith({ replaceLinesWith: [kappaLine] });
        await chipList.locator('label').filter({ hasText: 'Biológico Sintético Kappa 02B' }).locator('input').click();
        assert.deepEqual(
            sortedIds((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids),
            ['line:BIO-SYN-02B-L1', 'other:seg-other-1', 'other:seg-other-2'],
            'line marked explicitly by stable id with its full fingerprint');
        const lineVariations = [
            ['codigo_nacional', 'CN-SYN-222'],
            ['nregistro', 'NR-SYN-222'],
            ['source_type', 'LOCAL']
        ];
        for (const [field, value] of lineVariations) {
            await restoreWith({ patchLine: 'BIO-SYN-02B-L1', linePatch: { [field]: value } });
            assert.equal(await pendingFor('line:BIO-SYN-02B-L1').count(), 1, 'changing ONLY ' + field + ' degrades the mark to pending');
            assert.ok(!(await chipList.textContent()).includes('Biológico Sintético Kappa 02B'), field + ' change is never presented as a current suspect over a different identity');
            assert.deepEqual(
                sortedIds((await page.evaluate(() => window.FarmaciaSeguimiento.getEaEvents()))[0].suspect_ids).filter((id) => id.indexOf('line:') === 0),
                ['line:BIO-SYN-02B-L1'], 'line reference preserved anchored to its id after the ' + field + ' change');
            await pendingFor('line:BIO-SYN-02B-L1').locator('input').click();
            await chipList.locator('label').filter({ hasText: 'Biológico Sintético Kappa 02B' }).locator('input').click();
            assert.equal(await pendingFor('line:BIO-SYN-02B-L1').count(), 0, 'explicit re-mark after the ' + field + ' change restarts the fingerprint');
        }
        ok('C3: codigo_nacional, nregistro and source_type are each part of the line fingerprint; every isolated change is detected and never shown as vigente (QA del seam, no recorrido UI)');

        assert.deepEqual(pageErrors, [], 'pageerror');
        assert.deepEqual(consoleErrors.filter((t) => !resourceNoise(t)), [], 'console.error');
        ok('session C journeys: console.error=0 pageerror=0');
    } catch (error) {
        bad('session C journeys (FH-EA-02B)', error && error.message);
    } finally {
        await context.close();
    }
}

await browser.close();
server.close();
console.log(`\nFARMACIA-EA-SUSP-IDENTITY-BROWSER: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
    console.error('FAILURES: ' + failures.join('; '));
    process.exit(1);
}
