#!/usr/bin/env node
// Receta visual Metis FH-EA-03 · unidad causality-export-guards.
//
// Metis la ejecuta con METIS_SHOTS_DIR, E2E_PORT y CI=1: sirve el repo en
// E2E_PORT y escribe un PNG por nombre de disparo en METIS_SHOTS_DIR
// (directorio absoluto fuera del checkout, se acepta tal cual). Datos
// sintéticos, SOLO interacciones soportadas; nunca toca las capturas T01
// versionadas del repo.
//
// Disparos:
//   · causalidad-aviso-contexto-en-edicion — la sección real de causalidad
//     (#modSeguimientoCausalidad) con contexto de evaluación seleccionado y
//     SIN interacción: debe mostrarse el aviso visible en español de edición
//     no guardada (no forma parte del acto preparado ni se ha guardado ni
//     exportado nada) con la provisionalidad de Naranjo/Karch (no constituyen
//     evaluación clínica formal registrada). En BASE el aviso está oculto:
//     este disparo DISCRIMINA la unidad.
//   · causalidad-borrador-naranjo-activo — la misma sección con un borrador
//     Naranjo activo: puntuación/categoría provisionales junto al aviso, sin
//     presentarse como evaluación clínica formal registrada. Composición ya
//     entregada por la unidad 3: NO debe cambiar con esta unidad.
//
// La receta solo fotografía: espera condiciones visibles del flujo real y no
// depende de comportamientos que los oráculos no exijan.
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
                return createRequire(path.join(candidate, '__fh_ea03_export_guards_recipe_loader.cjs'))('playwright');
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
    // del sospechoso en la tarjeta del EA.
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
    await page.selectOption('#fhCausalityEpisode', 'FH-EA-EP-0001');
    await page.selectOption('#fhCausalitySuspect', 'other:seg-other-1');
    await page.waitForFunction(() => {
        const section = document.getElementById('modSeguimientoCausalidad');
        const chip = document.querySelector('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip');
        return section && !section.classList.contains('hidden') && chip && !chip.disabled;
    }, null, { timeout: 5000 });

    // Disparo 1: contexto de evaluación SIN interacción. Objetivo real: la
    // sección de causalidad; sin captura de fallback de otro componente.
    const section = page.locator('#modSeguimientoCausalidad');
    if (!(await section.isVisible())) {
        console.error('WARNING: #modSeguimientoCausalidad no es visible con el contexto de evaluación; no se acepta captura de fallback de otro componente (no-discriminación).');
        exitCode = 1;
    } else {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await section.screenshot({ path: path.join(SHOTS_DIR, 'causalidad-aviso-contexto-en-edicion.png') });
        console.log('SHOT causalidad-aviso-contexto-en-edicion (#modSeguimientoCausalidad, sin interacción)');
    }

    // Disparo 2: borrador Naranjo activo (dos respuestas explícitas).
    await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
    await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip[data-value="si"]');
    await page.waitForFunction(() => {
        const active = document.querySelectorAll('#modNaranjo .causality-chip--active').length;
        return active >= 2;
    }, null, { timeout: 5000 });
    await page.waitForTimeout(200);
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({ path: path.join(SHOTS_DIR, 'causalidad-borrador-naranjo-activo.png') });
    console.log('SHOT causalidad-borrador-naranjo-activo (#modSeguimientoCausalidad, borrador activo)');
} catch (error) {
    console.error('WARNING: el recorrido visual no alcanzó el estado esperado — ' + (error && error.message));
    exitCode = 1;
} finally {
    await browser.close();
    server.close();
}
console.log('CAUSALITY-EXPORT-GUARDS-VISUAL: ' + (exitCode === 0 ? 'done' : 'finished with warning'));
process.exit(exitCode);
