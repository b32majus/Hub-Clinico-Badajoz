#!/usr/bin/env node
// #956 tramo 2 (ADR-009 R1, R2 y R7; #715): Nexus no carga nada de fuera.
// La parte estática está en tools/nexus_sin_externos_check.mjs. Aquí: las 19 páginas,
// servidas bajo una subruta, no piden nada fuera, no dan 404 ni avisos de CSP,
// y cargan la letra Inter, los iconos y Chart.js desde vendor/.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://cima.aemps.es; object-src 'none'; base-uri 'self'; form-action 'self'";
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
const PREFIX = '/nexus/';
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const TEXT = /\.(css|js|md|txt|json)$|(^|\/)LICENSE$/;
function sha256(rel) {
    let bytes = readFileSync(path.join(ROOT, rel));
    if (TEXT.test(rel)) bytes = Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    return createHash('sha256').update(bytes).digest('hex');
}
function walk(dir) {
    return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
}

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf'],
    ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
]);
const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(PREFIX)) return response.writeHead(404).end('Not found');
    const relative = pathname.slice(PREFIX.length) || 'index.html';
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
const origin = `http://127.0.0.1:${server.address().port}`;
const base = origin + PREFIX;

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const external = [];
    const broken = [];
    const cspViolations = [];
    await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        external.push(url);
        return route.abort();
    });
    // Las páginas de Reuma redirigen a la portada si no hay profesional elegido.
    await context.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Profesional Demo'); } catch (e) {} });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.dismiss());
    page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) broken.push(`${r.status()} ${r.url().slice(origin.length)}`); });
    page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) cspViolations.push(m.text().slice(0, 160)); });
    const loaded = {};
    for (const p of pages) {
        await page.goto(base + p, { waitUntil: 'networkidle', timeout: 20000 });
        loaded[p] = await page.evaluate(async () => {
            await document.fonts.ready;
            return {
                inter: document.fonts.check('16px Inter') && [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Inter' && f.status === 'loaded'),
                iconos: [...document.fonts].some((f) => /Font Awesome 6 Free/.test(f.family) && f.status === 'loaded'),
                chart: typeof window.Chart === 'function',
            };
        });
    }
    await test('N1 las 19 páginas, bajo subruta, no piden nada fuera', async () => assert.deepEqual([...new Set(external)], []));
    await test('N2 ningún fichero propio da error (404)', async () => assert.deepEqual(broken, []));
    await test('N3 sin avisos de la CSP', async () => assert.deepEqual(cspViolations, []));
    await test('N4 Inter y los iconos se cargan desde vendor/ en Reuma y Farmacia', async () => {
        const bad = ['reuma_index.html', 'farmacia_index.html', 'seguimiento.html', 'farmacia_validacion.html']
            .filter((p) => !loaded[p].inter || !loaded[p].iconos);
        assert.deepEqual(bad, [], JSON.stringify(bad.map((p) => [p, loaded[p]])));
    });
    await test('N5 Chart.js disponible en las dos páginas con gráficos', async () => {
        assert.ok(loaded['estadisticas.html'].chart && loaded['dashboard_paciente.html'].chart, JSON.stringify(loaded['estadisticas.html']));
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_sin_externos_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
