#!/usr/bin/env node
// Check de navegador (punto 3 del HANDOFF, decisión de Sil 08-11): detalle de
// la evaluación de causalidad, en solo lectura, al abrir un episodio de EA.
// Un único bloque común (`window.FarmaciaEaCausalityDetail`,
// modules/farmacia_ea_causality_detail.js) en la tarjeta EA del Dashboard del
// paciente y en la Historia de EA de Seguimiento (el Longitudinal suelto es
// un sandbox con datos demo: fuera de alcance). Por
// evaluación: fecha · sospechoso · método [· Puntuación n] · categoría, la
// valoración final y las respuestas pregunta a pregunta PLEGADAS. Nada se
// infiere: lo que no se declaró sale «No registrada» y sin puntuación.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const mixed = require('./fixtures/farmacia_ea_mixed_cohort_workbook.cjs');
mixed.loadModules();
const { P1, IDSYS } = mixed;

// Acto extra sintético ACT-C (2026-10-20): episodio E3 «Exantema» con las dos
// evaluaciones completas, tal como las escribe Seguimiento en la copia 166.
function extraActTsv() {
    const v21 = global.FarmaciaBridgeRawEaV21Core;
    const event = {
        event_id: 'EV-C', source_event_id: 'EV-C-SRC', event_type: 'pharmacy_followup',
        event_status: 'completed', occurred_at: '2026-10-20T10:00:00Z', recorded_at: '2026-10-20T10:05:00Z',
        demo_flag: true, patient_id: P1.pid, identifier_system: IDSYS, identifier_value: P1.cip,
        visit_id: 'EV-C-VIS', visit_date: '2026-10-20', service_code: 'DERMA'
    };
    const line = {
        rowKey: P1.line, treatment_id: 'TR-' + P1.line, line_id: P1.line, line_role: 'principal',
        is_primary_line: true, line_status_at_event: 'active', active_at_event: true, line_drug_name: P1.drug
    };
    const ref = { patientRef: P1.ref, actId: 'ACT-C', episode_id: 'E3' };
    const o3 = {
        ...ref, observation_id: 'O3', status: 'incorporated', description: 'Exantema',
        suspicions: [{ patientRef: P1.ref, episode_id: 'E3', medicationRef: P1.line }],
        evaluations: [
            { ...ref, evaluation_id: 'EV3N', medicationRef: P1.line, method: 'naranjo', status: 'completado',
                answers: { q1: 'si', q2: 'si', q3: 'si', q4: 'desconocido', q5: 'no', q6: 'desconocido', q7: 'desconocido', q8: 'desconocido', q9: 'desconocido', q10: 'si' },
                score: 6, category: 'Probable', final_assessment: 'Probable' },
            { ...ref, evaluation_id: 'EV3K', medicationRef: P1.line, method: 'karch_lasagna', status: 'completado',
                answers: { temporal: 'si', conocido: 'si', alternativa: 'no_se_sabe', suspendido: 'no', mejoraRetirada: 'no_aplica', readministracion: 'no', reaparece: 'no_aplica' },
                category: 'Posible' }
        ]
    };
    return v21.serializeRowsToTsv(v21.buildFollowupRows({
        event, actId: 'ACT-C', patientRef: P1.ref, present: 'si',
        activeLines: [line], adverse_events: [o3], history: [], selections: []
    }));
}
const workDir = mkdtempSync(path.join(os.tmpdir(), 'fh-ea-causality-detail-'));
const xlsxPath = path.join(workDir, 'mixto_causalidad.xlsx');
writeFileSync(xlsxPath, mixed.workbookBuffer({ extraDermaTsv: [extraActTsv()] }));

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

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await context.newPage();
page.setDefaultTimeout(8000);
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



async function loadWorkbookAndSearch() {
    await page.goto(base + 'farmacia_index.html', { waitUntil: 'load' });
    await page.setInputFiles('#inputExcelFarmacia', xlsxPath);
    await page.waitForFunction(() => {
        const runtime = window.FarmaciaPatientFlowRuntime;
        const port = runtime && runtime.getDataPort && runtime.getDataPort();
        return !!(port && typeof port.listPatients === 'function' && port.listPatients().length > 0);
    }, null, { timeout: 10000 });
    await page.fill('#fhCipInput', P1.cip);
    await page.click('#fhSearchBtn');
}

async function openFromSearch(buttonText, urlPattern) {
    await loadWorkbookAndSearch();
    const action = page.locator(`a[href*="cip=${P1.cip}"]`, { hasText: buttonText }).first();
    await action.waitFor({ state: 'visible', timeout: 10000 });
    await action.click();
    await page.waitForURL(urlPattern, { timeout: 10000 });
}

// Lee un bloque de detalle: sus ítems (resumen, valoración, respuestas) y el
// estado plegado de cada «Ver respuestas».
const readDetail = (locator) => locator.evaluate((root) => ({
    empty: Array.from(root.querySelectorAll('.ea-causality-detail__empty')).map((n) => n.textContent.trim()),
    items: Array.from(root.querySelectorAll('.ea-causality-detail__item')).map((item) => {
        const details = item.querySelector('details.ea-causality-detail__answers');
        return {
            method: item.getAttribute('data-method'),
            suspect: item.getAttribute('data-suspect'),
            summary: (item.querySelector('.ea-causality-detail__summary') || {}).textContent || '',
            final: (item.querySelector('.ea-causality-detail__final') || {}).textContent || '',
            hasAnswers: !!details,
            open: details ? details.open : null,
            toggle: details ? ((details.querySelector('summary') || {}).textContent || '').trim() : null,
            answers: details ? Array.from(details.querySelectorAll('li')).map((li) => li.textContent.trim()) : []
        };
    })
}));

const NARANJO_E3 = [
    '1. Reacción previamente descrita: Sí',
    '2. Evento aparece después de administrar el fármaco: Sí',
    '3. Mejora tras retirar fármaco o administrar antagonista: Sí',
    '4. Reaparición tras readministración: Desconocido',
    '5. Existen causas alternativas: No',
    '6. Reaparición con placebo: Desconocido',
    '7. Concentraciones tóxicas detectadas: Desconocido',
    '8. Relación dosis-respuesta: Desconocido',
    '9. Reacción similar previa: Desconocido',
    '10. Evidencia objetiva: Sí'
];
const KARCH_E3 = [
    '1. Intervalo temporal compatible: Sí',
    '2. Evento conocido para medicamento/clase: Sí',
    '3. Existe explicación alternativa: No se sabe',
    '4. Se suspendió el medicamento: No',
    '5. Mejoró tras suspensión: No aplica',
    '6. Hubo readministración: No',
    '7. Reapareció tras readministración: No aplica'
];

function assertE3(detail, where) {
    assert.deepEqual(detail.empty, [], `${where}: E3 tiene evaluaciones`);
    assert.equal(detail.items.length, 2, `${where}: dos evaluaciones en E3`);
    const [n, k] = detail.items;
    assert.equal(n.method, 'naranjo');
    assert.equal(n.suspect, P1.line);
    assert.equal(n.summary.trim(), '2026-10-20 · LINE-A · Naranjo · Puntuación 6 · Probable', `${where}: resumen Naranjo`);
    assert.equal(n.final.trim(), 'Valoración final: Probable', `${where}: valoración final Naranjo`);
    assert.equal(n.hasAnswers, true);
    assert.equal(n.open, false, `${where}: las respuestas empiezan plegadas`);
    assert.equal(n.toggle, 'Ver respuestas');
    assert.deepEqual(n.answers, NARANJO_E3, `${where}: respuestas Naranjo en el orden del cuestionario`);
    assert.equal(k.method, 'karch_lasagna');
    assert.equal(k.summary.trim(), '2026-10-20 · LINE-A · Karch-Lasagna · Posible', `${where}: Karch-Lasagna sin puntuación`);
    assert.equal(k.final.trim(), 'Valoración final: No registrada', `${where}: sin valoración final declarada`);
    assert.deepEqual(k.answers, KARCH_E3, `${where}: respuestas Karch-Lasagna en el orden del cuestionario`);
}

// E1 (ACT-A) trae una evaluación antigua sin categoría ni puntuación
// declaradas (`result: 5`): nunca se infiere nada de ella.
function assertE1(detail, where) {
    assert.equal(detail.items.length, 1, `${where}: una evaluación en E1`);
    const [item] = detail.items;
    assert.equal(item.summary.trim(), '2026-09-10 · LINE-A · Naranjo · Categoría no registrada', `${where}: E1 sin categoría ni puntuación`);
    assert.ok(!/Puntuación|\b5\b/.test(item.summary + item.final), `${where}: nada inferido de result`);
    assert.equal(item.final.trim(), 'Valoración final: No registrada');
    assert.equal(item.hasAnswers, false, `${where}: sin respuestas no hay desplegable`);
}

try {
    await test('el bloque común se carga en las dos pantallas antes del script que lo usa', async () => {
        for (const [html, script] of [
            ['farmacia_dashboard_paciente.html', 'scripts/farmacia_dashboard_paciente.js'],
            ['farmacia_seguimiento.html', 'scripts/farmacia_seguimiento.js']
        ]) {
            const source = readFileSync(path.join(ROOT, html), 'utf8');
            const detailAt = source.indexOf('modules/farmacia_ea_causality_detail.js');
            assert.ok(detailAt !== -1, `${html} carga el bloque común`);
            assert.ok(detailAt < source.indexOf(script), `${html}: el bloque va antes de ${script}`);
        }
        const moduleSource = readFileSync(path.join(ROOT, 'modules/farmacia_ea_causality_detail.js'), 'utf8');
        assert.ok(!/innerHTML/.test(moduleSource), 'el bloque no usa innerHTML');
    });

    await test('Dashboard del paciente: E3 muestra puntuación, categoría, valoración final y respuestas plegadas', async () => {
        await openFromSearch('Dashboard', /farmacia_dashboard_paciente\.html/);
        const card = page.locator('.adverse-event-card', { hasText: 'Exantema' }).first();
        await card.waitFor({ state: 'visible', timeout: 10000 });
        assertE3(await readDetail(card.locator('.ea-causality-detail')), 'Dashboard');
        await card.locator('details.ea-causality-detail__answers summary').first().click();
        assert.equal(await card.locator('details.ea-causality-detail__answers').first().evaluate((node) => node.open), true, 'Ver respuestas despliega');
    });

    await test('Dashboard del paciente: E1 no infiere nada y E9 dice que no hay evaluación', async () => {
        const e1 = page.locator('.adverse-event-card', { hasText: 'Cefalea' }).first();
        assertE1(await readDetail(e1.locator('.ea-causality-detail')), 'Dashboard E1');
        const e9 = page.locator('.adverse-event-card', { hasText: 'Náuseas' }).first();
        const detail = await readDetail(e9.locator('.ea-causality-detail'));
        assert.deepEqual(detail.items, []);
        assert.deepEqual(detail.empty, ['Sin evaluación de causalidad registrada']);
    });

    await test('Seguimiento: la Historia de EA despliega el detalle de cada episodio anterior', async () => {
        await openFromSearch('Seguimiento', /farmacia_seguimiento\.html/);
        await page.waitForFunction((value) => (document.getElementById('fhSegCip') || {}).value === value, P1.cip, { timeout: 10000 });
        await page.fill('#fhSegFecha', '2026-11-07');
        await page.locator('#fhSegFecha').dispatchEvent('change');
        await page.selectOption('#fhSeguimientoEaPresente', 'si');
        await page.waitForSelector('#fhSegEaZone:not(.hidden)');
        const e3 = page.locator('#fhSegEaPriorEpisodes [data-episode-id="E3"]');
        await e3.waitFor({ state: 'visible', timeout: 10000 });
        assertE3(await readDetail(e3.locator('.ea-causality-detail')), 'Seguimiento');
        assertE1(await readDetail(page.locator('#fhSegEaPriorEpisodes [data-episode-id="E1"] .ea-causality-detail')), 'Seguimiento E1');
        // Los botones de continuidad siguen ahí.
        assert.ok(await e3.locator('button[data-ea-prior-action]').count() > 0, 'E3 conserva sus acciones');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`farmacia_ea_causality_detail_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
