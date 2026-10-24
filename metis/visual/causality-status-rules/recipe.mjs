#!/usr/bin/env node
// Receta visual Metis FH-EA-03 · unidad causality-status-rules.
//
// Metis la ejecuta con METIS_SHOTS_DIR, E2E_PORT y CI=1: sirve el repo en
// E2E_PORT y escribe un PNG por nombre de disparo en METIS_SHOTS_DIR
// (directorio absoluto fuera del checkout, se acepta tal cual). Datos
// sintéticos, SOLO interacciones soportadas; nunca toca las capturas T01
// versionadas del repo.
//
// Disparo único (enmienda PREP4):
//   · causalidad-estado-reconciliacion — la sección real de causalidad
//     (#modSeguimientoCausalidad, NO la tarjeta #fhSegEaList) con una marca
//     degradada a «Referencia pendiente de reconciliación»: sección visible,
//     evaluación bloqueada (selector de sospechoso y cuestionarios
//     inhabilitados) y explicación visible en español.
//
// La transición de fuente sin UI propia usa el seam público identificado
// restoreEvaluationState (QA del seam, igual que el testigo FH-EA-02B); sin
// carreras de autocompletado ni estados imposibles. El objetivo debe estar
// visible: NO se acepta captura de fallback de otro componente como prueba de
// esta transición — si no lo está, se registra y se sale con error.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS_DIR = process.env.METIS_SHOTS_DIR;
const PORT = Number(process.env.E2E_PORT);
if (!SHOTS_DIR) throw new Error('METIS_SHOTS_DIR is required');
if (!PORT) throw new Error('E2E_PORT is required');
if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_ea03_status_rules_recipe_loader.cjs'))('playwright');
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
    server.listen(PORT, '127.0.0.1', resolve);
});

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());

let exitCode = 0;
try {
    await page.goto(`http://127.0.0.1:${PORT}/farmacia_seguimiento.html?cip=CIP-DEMO-FH-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });

    // Recorrido soportado: presencia «Sí», EA incorporado y marcado expreso
    // del sospechoso (la marca recuerda la huella de su fuente).
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill('Cefalea');
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
    await page.click('#btnSegAddOtherDrug');
    await page.locator('#segOtrosFarmacosList .other-drug-card').first().locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
    await card.locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
    await page.waitForFunction(() => {
        const suspect = document.getElementById('fhCausalitySuspect');
        return suspect && Array.from(suspect.options).some((option) => option.value !== '');
    }, null, { timeout: 5000 });

    // Seam técnico identificado: la fuente de la referencia cambia durante la
    // restitución → la marca degrada a «pendiente de reconciliación» de forma
    // pegajosa y la evaluación queda bloqueada sobre identidad no verificada.
    await page.evaluate(() => {
        window.FarmaciaSeguimiento.restoreEvaluationState({
            current_visit: {
                cip: 'CIP-DEMO-FH-001', visit_id: window.FarmaciaSeguimiento.getCurrentVisit().visit_id,
                adverse_event: { present: 'si', suspect_ids: ['other:seg-other-1'], causality_editing_id: '' },
                adverse_events: [{ episode_id: 'FH-EA-EP-0001', observation_id: 'FH-EA-OBS-0001', suspect_ids: ['other:seg-other-1'], status: 'incorporated', description: 'Cefalea', evolution: 'no_consta', severity: '', expanded: true }],
                causality_by_suspect: {}
            },
            related_treatments: [{ uid: 'seg-other-1', farmaco: 'Medicamento Alfa Sintético RESTAURADO CON OTRA FUENTE', relationType: 'relacionado' }]
        });
    });
    // Espera EXPLÍCITA de la condición del flujo real: evaluación bloqueada.
    await page.waitForFunction(() => {
        const section = document.getElementById('modSeguimientoCausalidad');
        const suspect = document.getElementById('fhCausalitySuspect');
        const cardList = document.getElementById('fhSegEaList');
        return section && !section.classList.contains('hidden') &&
            suspect && suspect.disabled &&
            cardList && cardList.textContent.indexOf('pendiente de reconciliación') !== -1;
    }, null, { timeout: 5000 });

    // Objetivo real del disparo: la sección de causalidad, sin fallbacks.
    const section = page.locator('#modSeguimientoCausalidad');
    if (!(await section.isVisible())) {
        console.error('WARNING: #modSeguimientoCausalidad no es visible para la transición de reconciliación; no se acepta captura de fallback de otro componente (no-discriminación).');
        exitCode = 1;
    } else {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await section.screenshot({ path: path.join(SHOTS_DIR, 'causalidad-estado-reconciliacion.png') });
        console.log('SHOT causalidad-estado-reconciliacion (#modSeguimientoCausalidad)');
    }
} catch (error) {
    console.error('WARNING: la transición de reconciliación no alcanzó el estado bloqueado esperado — ' + (error && error.message));
    exitCode = 1;
} finally {
    await browser.close();
    server.close();
}
console.log('CAUSALITY-STATUS-RULES-VISUAL: ' + (exitCode === 0 ? 'done' : 'finished with warning'));
process.exit(exitCode);
