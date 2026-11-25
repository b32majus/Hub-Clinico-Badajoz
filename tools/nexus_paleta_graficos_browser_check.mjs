#!/usr/bin/env node
// Selector de paleta de los gráficos de Estadísticas (#1028, valorado con Sil el 24-11).
// Comprueba, en Estadísticas de Reuma y de Farmacia: que por defecto sale la paleta Nature (sin
// atributo en <html>); que elegir Okabe-Ito, Apagada o Viridis cambia los tokens de serie y no los de actividad; que la elección es una sola (la misma en Reuma y Farmacia); que se
// recuerda al recargar y se olvida al volver a Nature; que un valor guardado roto cae a Nature; que
// el selector tiene etiqueta; que los gráficos de Farmacia cambian de color y los de Reuma se
// vuelven a dibujar con el color nuevo; y que Primera visita (otra pantalla) no cambia. Datos sintéticos.

import assert from 'node:assert/strict';
import fs, { createReadStream, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json'), 'utf8'));

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__loader.cjs'))('playwright');
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

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'nexus-paleta-'));
const workbookPath = path.join(tempDir, 'sintetico.xlsx');
{
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(corpus.sheets)) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' }]), 'Profesionales');
    fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.png', 'image/png']
]);
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'index.html';
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

// La actividad (viridis) no cambia con la paleta; la elección es una sola para toda la aplicación.
const ACTIVIDAD1 = '#4ac16d';
const TOKENS = {
    nature: { serie1: '#34509a' },
    okabe: { serie1: '#0072b2' },
    apagada: { serie1: '#4b3fa8' },
    viridis: { serie1: '#440154' }
};
const token = (page, nombre) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue('--nx-color-' + n).trim().toLowerCase(), nombre);
const atributo = (page) => page.evaluate(() => document.documentElement.getAttribute('data-nx-paleta'));
const guardado = (page) => page.evaluate(() => { try { return localStorage.getItem('nexus.paletaGraficos.v1'); } catch (e) { return 'ERR'; } });

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const errores = [];

async function sesionReuma(context) {
    const page = await context.newPage();
    page.on('pageerror', (e) => errores.push(String(e)));
    await page.goto(base + 'reuma_index.html', { waitUntil: 'load', timeout: 45000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const profesional = await page.evaluate(() => Array.from(document.getElementById('gateProfessionalSelect').options).map((o) => o.value).find(Boolean) || '');
    await page.selectOption('#gateProfessionalSelect', profesional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    return page;
}

async function pruebaSelector(page, etiqueta) {
    assert.equal(await atributo(page), null, `${etiqueta}: por defecto <html> no lleva data-nx-paleta`);
    assert.equal(await token(page, 'serie-1'), TOKENS.nature.serie1, `${etiqueta}: serie-1 por defecto`);
    assert.equal(await page.inputValue('#selectorPaleta'), 'nature', `${etiqueta}: el selector arranca en Nature`);
    const etiquetaTexto = await page.evaluate(() => (document.querySelector('label[for="selectorPaleta"]') || {}).textContent || '');
    assert.ok(/Colores de los gráficos/.test(etiquetaTexto), `${etiqueta}: el selector tiene su etiqueta`);
    for (const paleta of ['okabe', 'apagada', 'viridis']) {
        await page.selectOption('#selectorPaleta', paleta);
        assert.equal(await atributo(page), paleta, `${etiqueta}: atributo ${paleta}`);
        assert.equal(await token(page, 'serie-1'), TOKENS[paleta].serie1, `${etiqueta}: serie-1 de ${paleta}`);
        assert.equal(await token(page, 'actividad-1'), ACTIVIDAD1, `${etiqueta}: la actividad no cambia con ${paleta}`);
        assert.equal(await guardado(page), paleta, `${etiqueta}: ${paleta} queda guardada`);
    }
}

async function pruebaRecuerdo(page, url, etiqueta) {
    await page.selectOption('#selectorPaleta', 'apagada');
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    assert.equal(await atributo(page), 'apagada', `${etiqueta}: tras recargar sigue Apagada`);
    assert.equal(await page.inputValue('#selectorPaleta'), 'apagada', `${etiqueta}: el selector enseña Apagada`);
    await page.selectOption('#selectorPaleta', 'nature');
    assert.equal(await atributo(page), null, `${etiqueta}: Nature quita el atributo`);
    assert.equal(await guardado(page), null, `${etiqueta}: Nature borra lo guardado`);
    await page.evaluate(() => localStorage.setItem('nexus.paletaGraficos.v1', 'rosa-fucsia'));
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    assert.equal(await atributo(page), null, `${etiqueta}: un valor guardado roto cae a Nature`);
}

// ---- Farmacia
{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errores.push(String(e)));
    await page.goto(base + 'farmacia_estadisticas.html', { waitUntil: 'load', timeout: 45000 });
    await test('F1 Farmacia: selector, paletas y etiqueta', () => pruebaSelector(page, 'Farmacia'));
    await test('F2 Farmacia: se recuerda al recargar, Nature lo borra y un valor roto cae a Nature', () => pruebaRecuerdo(page, base + 'farmacia_estadisticas.html', 'Farmacia'));
    await test('F3 Farmacia: los gráficos ya dibujados cambian de color sin recargar', async () => {
        await page.selectOption('#selectorPaleta', 'nature');
        await page.waitForSelector('[style*="--nx-color-serie-1"]', { state: 'attached', timeout: 15000 });
        const color = () => page.evaluate(() => {
            const el = document.querySelector('[style*="--nx-color-serie-1"]');
            const cs = getComputedStyle(el);
            return [cs.backgroundColor, cs.backgroundImage, cs.color, cs.fill].join('|');
        });
        const antes = await color();
        await page.selectOption('#selectorPaleta', 'viridis');
        const despues = await color();
        assert.notEqual(despues, antes, 'F3 el color del primer elemento con serie-1 debe cambiar al elegir Viridis');
    });
    await context.close();
}

// ---- Reuma
{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    // El Excel vive en sessionStorage (por pestaña): se sigue en la misma página.
    const page = await sesionReuma(context);
    await page.goto(base + 'estadisticas.html', { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => typeof Chart !== 'undefined' && !!Chart.getChart && !!Chart.getChart('treatmentDistChart'), null, { timeout: 15000 });
    await test('R1 Reuma: selector, paletas y etiqueta', () => pruebaSelector(page, 'Reuma'));
    await test('R2 Reuma: los gráficos se vuelven a dibujar con el color de la paleta', async () => {
        const fondo = () => page.evaluate(() => {
            const c = Chart.getChart('treatmentDistChart');
            const d = c && c.data.datasets[0].backgroundColor;
            return Array.isArray(d) ? d[0] : d;
        });
        await page.selectOption('#selectorPaleta', 'nature');
        await page.waitForFunction((c) => { const ch = Chart.getChart('treatmentDistChart'); const d = ch && ch.data.datasets[0].backgroundColor; return (Array.isArray(d) ? d[0] : d) === c; }, TOKENS.nature.serie1, { timeout: 8000 });
        await page.selectOption('#selectorPaleta', 'okabe');
        await page.waitForFunction((c) => { const ch = Chart.getChart('treatmentDistChart'); const d = ch && ch.data.datasets[0].backgroundColor; return (Array.isArray(d) ? d[0] : d) === c; }, TOKENS.okabe.serie1, { timeout: 8000 })
            .catch(async () => { throw new Error(`el gráfico de tratamientos sigue con ${await fondo()} tras elegir Okabe-Ito`); });
        const activity = await page.evaluate(() => Chart.getChart('activityDonutChart').data.datasets[0].backgroundColor[0]);
        assert.equal(String(activity).toLowerCase(), ACTIVIDAD1, `R2 la actividad (remisión) sigue en viridis (tiene ${activity})`);
    });
    await test('R3 Reuma: se recuerda al recargar, Nature lo borra y un valor roto cae a Nature', () => pruebaRecuerdo(page, base + 'estadisticas.html', 'Reuma'));
    await test('R4 Reuma: otra pantalla (Primera visita) no recibe la paleta', async () => {
        await page.evaluate(() => localStorage.setItem('nexus.paletaGraficos.v1', 'viridis'));
        await page.goto(base + 'primera_visita.html', { waitUntil: 'load', timeout: 45000 });
        assert.equal(await atributo(page), null, 'R4 Primera visita no lleva data-nx-paleta');
        await page.evaluate(() => localStorage.removeItem('nexus.paletaGraficos.v1'));
    });
    await context.close();
}

await test('X2 la elección es una sola: la misma clave sirve a Reuma y a Farmacia (sin paleta por patología ni por módulo)', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    // Reuma sin sesión redirige: se deja la elección con la clave que usa su módulo y se abre Farmacia.
    await page.goto(base + 'primera_visita.html', { waitUntil: 'load', timeout: 45000 });
    await page.evaluate((k) => localStorage.setItem(k, 'viridis'), 'nexus.paletaGraficos.v1');
    await page.goto(base + 'farmacia_estadisticas.html', { waitUntil: 'load', timeout: 45000 });
    assert.equal(await atributo(page), 'viridis', 'Farmacia usa la paleta guardada (la misma clave que Reuma, R3)');
    assert.equal(await page.inputValue('#selectorPaleta'), 'viridis', 'el selector de Farmacia enseña Viridis');
    await context.close();
});

await test('X1 sin errores de página', async () => { assert.deepEqual(errores, [], errores.join(' | ')); });

await browser.close();
server.close();
rmSync(tempDir, { recursive: true, force: true });
console.log(`\n${passed} PASS, ${failures.length} FAIL`);
process.exit(failures.length ? 1 : 0);
