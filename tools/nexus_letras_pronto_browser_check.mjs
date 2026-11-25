#!/usr/bin/env node
// Letras pronto (issue #956): cada pantalla avisa en su <head> de los dos ficheros de letra
// que va a usar (texto Inter e iconos), para que el navegador los pida desde el principio y
// la pantalla se pinte ya con su letra y sus iconos (red lenta: de ~1,7 s a ~0,6 s).
// El contrato: lo que una página usa, lo avisa; lo que no usa, no lo avisa; cada letra se baja una vez.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, createReadStream } from 'node:fs';
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

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.woff2', 'font/woff2']
]);
// Las letras se sirven con caché como GitHub Pages (max-age=600): Inter declara 4 pesos con el mismo
// fichero y, con no-store, el navegador lo volvería a pedir por cada peso (eso no pasa en el sitio real).
const server = createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '') || 'farmacia_index.html';
    const file = path.resolve(ROOT, relative);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return response.writeHead(403).end();
    try {
        if (!statSync(file).isFile()) throw new Error('not_file');
        response.writeHead(200, { 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream', 'cache-control': file.endsWith('.woff2') ? 'max-age=600' : 'no-store' });
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

const PAGINAS = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const LETRAS = {
    'vendor/inter/inter-latin.woff2': { hoja: 'vendor/inter/inter.css' },
    'vendor/fontawesome/webfonts/fa-solid-900.woff2': { hoja: 'vendor/fontawesome/css/all.min.css' }
};
const html = (p) => readFileSync(path.join(ROOT, p), 'utf8');
function avisos(texto) {
    return [...texto.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)].map((m) => {
        const tag = m[0];
        const attr = (n) => { const r = tag.match(new RegExp('\\b' + n + '(?:="([^"]*)")?')); return r ? (r[1] === undefined ? '' : r[1]) : null; };
        return { tag, href: attr('href'), as: attr('as'), type: attr('type'), crossorigin: attr('crossorigin'), pos: m.index };
    });
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const usadas = {};
const bajadas = {};
const avisosConsola = {};

try {
    await test('los ficheros de letra avisados existen y son los que piden sus hojas de estilo', async () => {
        for (const [letra, { hoja }] of Object.entries(LETRAS)) {
            assert.ok(existsSync(path.join(ROOT, letra)), `falta ${letra}`);
            const nombre = letra.split('/').pop();
            assert.ok(html(hoja).includes(nombre), `${hoja} ya no pide ${nombre}: actualizar el aviso de las páginas`);
        }
    });

    await test('cada aviso de letra está bien formado (as=font, type=font/woff2, crossorigin) y va antes de los estilos', async () => {
        const malos = [];
        for (const p of PAGINAS) {
            const t = html(p);
            const primerEstilo = t.search(/<link\b[^>]*rel="stylesheet"|<style\b/);
            for (const a of avisos(t).filter((x) => /\.woff2$/.test(x.href || ''))) {
                if (!LETRAS[a.href]) malos.push(`${p}: aviso de letra desconocida ${a.href}`);
                if (a.as !== 'font' || a.type !== 'font/woff2' || a.crossorigin === null) malos.push(`${p}: ${a.tag}`);
                if (primerEstilo !== -1 && a.pos > primerEstilo) malos.push(`${p}: el aviso de ${a.href} va después del primer estilo`);
            }
        }
        assert.deepEqual(malos, []);
    });

    await test('todos los iconos que pide la app existen en la hoja de iconos (si no, sale un hueco)', async () => {
        const hoja = html('vendor/fontawesome/css/all.min.css');
        const ficheros = [...PAGINAS];
        for (const dir of ['scripts', 'modules']) {
            const recorrer = (d) => { for (const f of readdirSync(path.join(ROOT, d))) { const r = d + '/' + f; if (statSync(path.join(ROOT, r)).isDirectory()) recorrer(r); else if (f.endsWith('.js')) ficheros.push(r); } };
            recorrer(dir);
        }
        const faltan = [];
        for (const f of ficheros) {
            for (const m of html(f).matchAll(/\bfa[srb] (fa-[a-z0-9-]*[a-z0-9])\b(?!-|\$)/g)) {
                if (!hoja.includes('.' + m[1] + ':')) faltan.push(`${f}: ${m[1]}`);
            }
        }
        assert.deepEqual([...new Set(faltan)], []);
    });

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', JSON.stringify({ id: 'p1', nombre: 'Prueba' })); } catch (e) { /* sin almacenamiento */ } });
    await context.route(/cima\.aemps\.es/, (r) => r.abort());
    for (const p of PAGINAS) {
        const page = await context.newPage();
        bajadas[p] = {};
        avisosConsola[p] = [];
        page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.endsWith('.woff2')) { const k = u.pathname.replace(/^\/+/, ''); bajadas[p][k] = (bajadas[p][k] || 0) + 1; } });
        page.on('console', (m) => { if (/preload/i.test(m.text())) avisosConsola[p].push(m.text().slice(0, 160)); });
        await page.goto(base + p, { waitUntil: 'load' });
        await page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await document.fonts.ready; });
        await page.waitForTimeout(300);
        usadas[p] = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\.woff2(\?|$)/.test(e.name)).map((e) => new URL(e.name).pathname.replace(/^\/+/, '')));
        await page.close();
    }
    await context.close();

    await test('lo que una página usa, lo avisa; lo que no usa, no lo avisa', async () => {
        const dif = [];
        for (const p of PAGINAS) {
            const usa = [...new Set(usadas[p].filter((u) => LETRAS[u]))].sort();
            const avisa = avisos(html(p)).map((a) => a.href).filter((h) => LETRAS[h]).sort();
            if (JSON.stringify(usa) !== JSON.stringify(avisa)) dif.push(`${p}: usa [${usa}] avisa [${avisa}]`);
        }
        assert.deepEqual(dif, []);
    });

    await test('cada letra se baja una sola vez por página (el aviso y la hoja piden lo mismo)', async () => {
        const dobles = [];
        for (const p of PAGINAS) for (const [k, n] of Object.entries(bajadas[p])) if (n > 1) dobles.push(`${p}: ${k} x${n}`);
        assert.deepEqual(dobles, []);
    });

    await test('ninguna página avisa de algo que luego no usa (sin quejas del navegador)', async () => {
        const quejas = Object.entries(avisosConsola).filter(([, l]) => l.length).map(([p, l]) => `${p}: ${l[0]}`);
        assert.deepEqual(quejas, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
