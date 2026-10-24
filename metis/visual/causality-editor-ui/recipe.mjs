#!/usr/bin/env node
// Receta visual Metis FH-EA-03 · unidad causality-editor-ui.
//
// Metis la ejecuta con METIS_SHOTS_DIR, E2E_PORT y CI=1: sirve el repo en
// E2E_PORT y escribe un PNG por nombre de disparo en METIS_SHOTS_DIR
// (directorio absoluto fuera del checkout, se acepta tal cual). Datos
// sintéticos, SOLO interacciones soportadas; nunca toca las capturas T01
// versionadas del repo.
//
// La receta debe producir sus disparos TAMBIÉN en BASE, donde el editor G0
// aún no existe (la sección «Análisis de causalidad» permanece oculta): los
// esperas/interacciones dependientes del editor se omiten si sus controles
// no están y el recorte cae a un área visible alternativa. La comparación
// visual base↔referencia es la que decide si el disparo cambia.
//
// Disparos:
//   · causalidad-editor-contexto        — episodio real + sospechoso marcado
//     seleccionados, Naranjo contestado parcialmente, Karch sin respuestas,
//     aviso de provisionalidad visible (con referencia).
//   · causalidad-editor-sin-sospechosos — EA documentado sin sospechosos
//     marcados: explicación en español y controles inactivos (con referencia).
//   · causalidad-editor-sin-episodios   — presencia «Sí» con 0 EA:
//     explicación en español y controles inactivos (con referencia).
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
                return createRequire(path.join(candidate, '__fh_ea03_causality_editor_recipe_loader.cjs'))('playwright');
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

// Recorte de la sección «Análisis de causalidad» cuando existe y es visible
// (referencia); en BASE la sección está oculta: recorte alternativo del
// bloque EA de la misma pantalla. Jamás EXIT_1 por elemento no visible.
async function shoot(name) {
    const targets = ['#modSeguimientoCausalidad', '#modSeguimientoEa'];
    for (const selector of targets) {
        const locator = page.locator(selector);
        if (await locator.count() && await locator.isVisible()) {
            await locator.scrollIntoViewIfNeeded();
            await page.waitForTimeout(200);
            await locator.screenshot({ path: path.join(SHOTS_DIR, name + '.png') });
            console.log('SHOT ' + name + ' (' + selector + ')');
            return;
        }
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, name + '.png'), fullPage: false });
    console.log('SHOT ' + name + ' (viewport fallback)');
}

// Espera tolerante a BASE: el editor puede no existir todavía.
async function waitEditorCondition(condition, timeout = 5000) {
    await page.waitForFunction(condition, null, { timeout }).catch(() => {});
}

try {
    await page.goto(`http://127.0.0.1:${PORT}/farmacia_seguimiento.html?cip=CIP-DEMO-FH-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });

    // Disparo 3: «Sí» con 0 EA — explicación y controles inactivos (referencia);
    // en BASE la sección permanece oculta y se recorta el bloque EA.
    await page.selectOption('#fhSeguimientoEaPresente', 'si');
    await page.waitForSelector('#fhSegEaZone:not(.hidden)');
    await shoot('causalidad-editor-sin-episodios');

    // Disparo 2: EA documentado sin sospechosos marcados.
    await page.click('#fhSegAddEaBtn');
    const card = page.locator('#fhSegEaList .ea-t01-card').last();
    await card.locator('[data-ea-field="description"]').fill('Cefalea');
    await card.getByRole('button', { name: 'Incorporar al acto' }).click();
    await waitEditorCondition(() => {
        const episode = document.getElementById('fhCausalityEpisode');
        return episode && Array.from(episode.options).some((option) => option.value.indexOf('FH-EA-EP-') === 0);
    });
    await shoot('causalidad-editor-sin-sospechosos');

    // Disparo 1: episodio real + sospechoso marcado + Naranjo contestado.
    await page.click('#btnSegAddOtherDrug');
    await page.click('#btnSegAddOtherDrug');
    const drugs = page.locator('#segOtrosFarmacosList .other-drug-card');
    await drugs.nth(0).locator('input[data-field="farmaco"]').fill('Medicamento Alfa Sintético');
    await drugs.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Beta Sintético');
    await page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
    await waitEditorCondition(() => {
        const suspect = document.getElementById('fhCausalitySuspect');
        return suspect && Array.from(suspect.options).some((option) => option.value !== '');
    });
    // Interacciones del editor SOLO si sus controles existen (BASE los omite).
    if (await page.locator('#fhCausalitySuspect').isVisible()) {
        await page.selectOption('#fhCausalitySuspect', 'other:seg-other-1');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
        await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip[data-value="si"]');
        await page.waitForTimeout(150);
    }
    await shoot('causalidad-editor-contexto');
} finally {
    await browser.close();
    server.close();
}
console.log('CAUSALITY-EDITOR-UI-VISUAL: done');
