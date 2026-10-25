#!/usr/bin/env node
// Receta visual Metis WO FH-EA-G0-P1 (#827) · aislamiento del control final
// heredado en el editor G0 provisional de Seguimiento.
//
// Metis la ejecuta con METIS_SHOTS_DIR, METIS_SHOT_KIT, E2E_PORT y CI=1:
// sirve el repo en E2E_PORT y fotografía con el kit Metis (nunca escribe los
// PNG a mano). Datos sintéticos y SOLO interacciones soportadas; la receta
// solo navega y fotografía, sin aserciones y sin importar los oráculos.
//
// La receta produce sus disparos también en BASE (donde el control final
// heredado sigue visible): espera únicamente elementos visibles reales
// (sección de causalidad, opciones de sospechoso), nunca comportamientos.
//
// Disparos:
//   · g0-final-control-contexto        — (1440×900) episodio real + sospechoso
//     A seleccionado, Naranjo contestado parcialmente; el resumen muestra
//     contexto y cuestionarios, sin selector final heredado en la referencia.
//   · g0-final-control-otro-sospechoso — (1440×900) cambio al sospechoso B sin
//     evaluar: el resumen queda en estado neutro del contexto.
//   · g0-final-control-movil           — (390×844) el mismo contexto focal en
//     móvil, sección usable y sin desbordamiento.
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

const { watch, shot } = await import(process.env.METIS_SHOT_KIT);

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__fh_g0_p1_final_control_recipe_loader.cjs'))('playwright');
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

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });

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

// Recorte de la sección «Análisis de causalidad» cuando es visible; en
// cualquier otro caso, captura del viewport tal cual. Jamás EXIT_1 por un
// elemento no visible: solo se espera lo que ya está en pantalla.
async function shoot(page, name) {
    const resumen = page.locator('#modResumenCausalidad');
    const section = page.locator('#modSeguimientoCausalidad');
    if (await resumen.count() && await resumen.isVisible()) {
        await resumen.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(200);
    } else if (await section.count() && await section.isVisible()) {
        await section.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(200);
    }
    await shot(page, name);
}

// Esperas tolerantes: solo condiciones de visibilidad que existen en BASE.
async function waitSection(page) {
    await page.waitForFunction(() => {
        const section = document.getElementById('modSeguimientoCausalidad');
        return section && !section.classList.contains('hidden');
    }, null, { timeout: 5000 }).catch(() => {});
}

async function waitSuspectOptions(page) {
    await page.waitForFunction(() => {
        const suspect = document.getElementById('fhCausalitySuspect');
        return suspect && Array.from(suspect.options).some((option) => option.value);
    }, null, { timeout: 5000 }).catch(() => {});
}

async function prepararEditorG0(page) {
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
    await drugs.nth(1).locator('input[data-field="farmaco"]').fill('Medicamento Beta Sintético');
    await page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list input[type="checkbox"]').nth(0).click();
    await page.locator('#fhSegEaList .ea-t01-card').first().locator('.ea-suspect-list input[type="checkbox"]').nth(1).click();
    await waitSuspectOptions(page);
    await waitSection(page);
}

try {
    // Disparos 1 y 2 (desktop 1440×900).
    const desktop = await browser_context_1440();
    try {
        const page = desktop.page;
        await prepararEditorG0(page);
        await page.selectOption('#fhCausalityEpisode', (await page.evaluate(() => document.querySelector('#fhSegEaList .ea-t01-card').getAttribute('data-episode-id'))));
        if (await page.locator('#fhCausalitySuspect').isEnabled().catch(() => false)) {
            await page.selectOption('#fhCausalitySuspect', 'other:seg-other-1');
            await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ1"] .causality-chip[data-value="si"]');
            await page.click('#modNaranjo .causality-chip-group[data-answer-id="naranjoQ2"] .causality-chip[data-value="si"]');
        }
        await shoot(page, 'g0-final-control-contexto');

        // Disparo 2: cambio al sospechoso B sin evaluarlo.
        if (await page.locator('#fhCausalitySuspect').isEnabled().catch(() => false)) {
            await page.selectOption('#fhCausalitySuspect', 'other:seg-other-2');
        }
        await shoot(page, 'g0-final-control-otro-sospechoso');
    } finally {
        await desktop.context.close();
    }

    // Disparo 3 (móvil 390×844).
    const movil = await browser_context_390();
    try {
        const page = movil.page;
        await prepararEditorG0(page);
        await page.selectOption('#fhCausalityEpisode', (await page.evaluate(() => document.querySelector('#fhSegEaList .ea-t01-card').getAttribute('data-episode-id'))));
        if (await page.locator('#fhCausalitySuspect').isEnabled().catch(() => false)) {
            await page.selectOption('#fhCausalitySuspect', 'other:seg-other-1');
        }
        await shoot(page, 'g0-final-control-movil');
    } finally {
        await movil.context.close();
    }
} finally {
    await browser.close();
    server.close();
}
console.log('G0-FINAL-CONTROL-ISOLATION-VISUAL: done');

async function browser_context_1440() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    watch(page);
    await page.goto(`http://127.0.0.1:${PORT}/farmacia_seguimiento.html?cip=CIP-DEMO-FH-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
    return { context, page };
}

async function browser_context_390() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    watch(page);
    await page.goto(`http://127.0.0.1:${PORT}/farmacia_seguimiento.html?cip=CIP-DEMO-FH-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (document.getElementById('fhSegCip') || {}).value === 'CIP-DEMO-FH-001', null, { timeout: 10000 });
    return { context, page };
}
