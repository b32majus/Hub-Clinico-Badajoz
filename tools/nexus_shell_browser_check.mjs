#!/usr/bin/env node
// #956 tramo 5 (ADR-010 §3; ADR-009 R5 y R10): barra lateral común <nx-shell> en navegador.
// Sirve el sitio bajo /nexus/ (como Pages) y abre las dos muestras (Farmacia y Reuma):
// menú del módulo con la página actual marcada, «Otros módulos» solo desde el perfil
// (manifiesto de la Home), versión visible, «Terminar» con confirmación, axe-core sin fallos,
// y sin desplazamiento lateral de escritorio a móvil. NEXUS_CAPTURAS=<carpeta> guarda capturas.
// Solo datos inventados.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = '/nexus/';
const AXE = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
const CAPTURAS = process.env.NEXUS_CAPTURAS || '';
const MUESTRAS = { farmacia: 'muestra/nexus_shell_farmacia.html', reuma: 'muestra/nexus_shell_reuma.html' };
const MANIFIESTO = '**/nexus/data/platform/home/deployment-manifest.json';

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
const requested = [];
const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    requested.push(pathname);
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

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-ES' });
const external = [];
await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.push(url);
    return route.abort();
});
const page = await context.newPage();
const nativeDialogs = [];
page.on('dialog', (dialog) => { nativeDialogs.push(dialog.message()); dialog.dismiss(); });
const broken = [];
page.on('response', (r) => { if (r.status() >= 400) broken.push(`${r.status()} ${r.url().slice(origin.length)}`); });
const consoleErrors = [];
page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) consoleErrors.push(message.text());
    else if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1) consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));



async function axe(contexto) {
    // evaluate() no pasa por la CSP de la página (addScriptTag sí, y la CSP estricta lo bloquea)
    if (!(await page.evaluate(() => !!window.axe))) await page.evaluate(readFileSync(AXE, 'utf8'));
    const r = await page.evaluate(async (ctx) => window.axe.run(ctx ? document.querySelector(ctx) : document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    }), contexto || null);
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}
async function captura(nombre) {
    if (!CAPTURAS) return;
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    mkdirSync(CAPTURAS, { recursive: true });
    await page.screenshot({ path: path.join(CAPTURAS, `${nombre}.png`), fullPage: true });
}
const estilo = (sel, prop, pseudo) => page.evaluate(([s, p, ps]) => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el, ps || null).getPropertyValue(p) : null;
}, [sel, prop, pseudo]);

const abrir = async (modulo) => {
    await page.goto(base + MUESTRAS[modulo], { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
};
const menu = () => page.evaluate(() => [...document.querySelectorAll('nx-shell .nx-shell__seccion')].map((s) => ({
    titulo: s.querySelector('.nx-shell__titulo').textContent,
    enlaces: [...s.querySelectorAll('a.nx-shell__enlace')].map((a) => a.getAttribute('href') + (a.getAttribute('aria-current') === 'page' ? ' *' : '')),
})));
const manifiestoReal = JSON.parse(readFileSync(path.join(ROOT, 'data/platform/home/deployment-manifest.json'), 'utf8'));
const conManifiesto = async (cambiar) => {
    await page.unroute(MANIFIESTO);
    if (cambiar) await page.route(MANIFIESTO, (route) => cambiar(route, structuredClone(manifiestoReal)));
};

try {
    await test('B1 bajo /nexus/ las dos muestras cargan enteras, sin nada de fuera, sin 404 y con CSP estricta', async () => {
        for (const modulo of Object.keys(MUESTRAS)) {
            await abrir(modulo);
            assert.ok(await page.locator('nx-shell .nx-shell__nav').count() === 1, `${modulo}: la barra no se ha montado`);
        }
        assert.deepEqual(requested.filter((p) => !p.startsWith(PREFIX)), [], 'peticiones fuera de la subruta');
        assert.deepEqual(external, [], 'peticiones a otros sitios');
        assert.deepEqual(broken, [], 'recursos que fallan');
        assert.deepEqual(consoleErrors, [], 'errores de consola o de CSP');
    });

    await test('B2 Farmacia: marca, menú del módulo, página actual marcada y bloques propios conservados', async () => {
        await abrir('farmacia');
        const r = await page.evaluate(() => {
            const shell = document.querySelector('nx-shell');
            const marca = shell.querySelector('a.nx-shell__marca');
            return {
                primero: shell.firstElementChild === marca,
                marca: marca.getAttribute('href'),
                textoMarca: marca.textContent,
                nav: shell.querySelector('nav').getAttribute('aria-label'),
                navs: shell.querySelectorAll('nav').length,
                actuales: shell.querySelectorAll('[aria-current="page"]').length,
                datosNav: [...shell.querySelectorAll('a.nx-shell__enlace')].every((a) => a.hasAttribute('data-nav-link')),
                propio: !!shell.querySelector('.nx-shell__extra #m-paciente'),
                titulosConLista: [...shell.querySelectorAll('.nx-shell__lista')].every((ul) => document.getElementById(ul.getAttribute('aria-labelledby'))),
            };
        });
        assert.deepEqual(r, {
            primero: true, marca: '../index.html', textoMarca: 'FarmaNEXusFarmacia Hospitalaria', nav: 'Menú de Farmacia Hospitalaria', navs: 1,
            actuales: 1, datosNav: true, propio: true, titulosConLista: true,
        });
        assert.deepEqual(await menu(), [
            { titulo: 'Farmacia', enlaces: ['../farmacia_index.html', '../farmacia_validacion.html', '../farmacia_primera_visita.html', '../farmacia_seguimiento.html', '../farmacia_dashboard_paciente.html'] },
            { titulo: 'Gestión', enlaces: ['../farmacia_actividad_servicio.html *', '../farmacia_estadisticas.html', '../farmacia_farmacos.html', '../farmacia_profesionales.html'] },
            { titulo: 'Otros módulos', enlaces: ['../reuma_index.html'] },
        ]);
        assert.equal(await page.locator('nx-shell a[aria-current="page"]').textContent(), 'Pendientes');
    });

    await test('B3 Reuma: su menú, «Otros módulos» con Farmacia y el entorno y la versión al pie', async () => {
        await abrir('reuma');
        assert.deepEqual(await menu(), [
            { titulo: 'Consulta', enlaces: ['../reuma_index.html', '../primera_visita.html', '../seguimiento.html *'] },
            { titulo: 'Gestión', enlaces: ['../estadisticas.html', '../manage_professionals.html'] },
            { titulo: 'Otros módulos', enlaces: ['../farmacia_index.html'] },
        ]);
        assert.equal(await page.locator('nx-shell .nx-shell__modulo').textContent(), 'Reumatología');
        assert.deepEqual(await page.locator('nx-shell .nx-shell__version span').allTextContents(), ['Entorno de demostración', 'Versión 4.0.0']);
    });

    await test('B4 «Otros módulos» sale solo del perfil: desactivado, no disponible, ruta rara o sin manifiesto → no aparece', async () => {
        await conManifiesto((route, m) => { m.modules.find((x) => x.moduleId === 'reuma').enabled = false; route.fulfill({ json: m }); });
        await abrir('farmacia');
        assert.deepEqual((await menu()).map((s) => s.titulo), ['Farmacia', 'Gestión'], 'reuma desactivado');
        await conManifiesto((route, m) => { m.modules.find((x) => x.moduleId === 'reuma').available = false; route.fulfill({ json: m }); });
        await abrir('farmacia');
        assert.deepEqual((await menu()).map((s) => s.titulo), ['Farmacia', 'Gestión'], 'reuma no disponible');
        await conManifiesto((route, m) => { m.modules.find((x) => x.moduleId === 'reuma').entryPath = 'javascript:alert(1)'; route.fulfill({ json: m }); });
        await abrir('farmacia');
        assert.equal(await page.locator('nx-shell a[href^="javascript"]').count(), 0, 'ruta rara');
        await conManifiesto((route, m) => {
            m.modules.push({ moduleId: 'derma', label: 'Dermatología', entryPath: 'derma_index.html', enabled: true, available: true });
            route.fulfill({ json: m });
        });
        await abrir('farmacia');
        assert.deepEqual((await menu()).at(-1), { titulo: 'Otros módulos', enlaces: ['../reuma_index.html', '../derma_index.html'] }, 'módulo nuevo del perfil');
        await conManifiesto((route) => route.fulfill({ status: 404, body: '' }));
        await abrir('farmacia');
        assert.deepEqual((await menu()).map((s) => s.titulo), ['Farmacia', 'Gestión'], 'sin manifiesto');
        assert.deepEqual(await page.locator('nx-shell .nx-shell__version span').allTextContents(), ['Versión 4.0.0'], 'sin manifiesto: solo la versión');
        await conManifiesto(null);
        broken.length = 0;
    });

    await test('B5 «Terminar»: pide confirmación; «Seguir aquí» no toca nada; «Terminar» olvida el profesional y va al inicio', async () => {
        await abrir('reuma');
        await page.evaluate(() => localStorage.setItem('hubSelectedProfessional', 'DEMO-01'));
        await page.getByRole('button', { name: 'Terminar' }).click();
        await page.waitForSelector('dialog.nx-dialogo[open]');
        assert.equal(await page.locator('dialog.nx-dialogo[open] h2, dialog.nx-dialogo[open] .nx-dialogo__titulo').first().textContent(), '¿Terminar en este ordenador?');
        assert.deepEqual(await axe('dialog.nx-dialogo'), [], 'axe dentro de la ventana');
        await page.getByRole('button', { name: 'Seguir aquí' }).click();
        assert.equal(await page.evaluate(() => localStorage.getItem('hubSelectedProfessional')), 'DEMO-01');
        assert.ok(page.url().endsWith(MUESTRAS.reuma));
        await page.getByRole('button', { name: 'Terminar' }).click();
        await page.waitForSelector('dialog.nx-dialogo[open]');
        await Promise.all([
            page.waitForNavigation(),
            page.locator('dialog.nx-dialogo[open]').getByRole('button', { name: 'Terminar' }).click(),
        ]);
        assert.equal(new URL(page.url()).pathname, PREFIX + 'index.html');
        assert.equal(await page.evaluate(() => localStorage.getItem('hubSelectedProfessional')), null);
    });

    await test('B6 la página puede impedir «Terminar» (cambios sin guardar) cancelando «nx-terminar»', async () => {
        await abrir('farmacia');
        await page.evaluate(() => {
            localStorage.setItem('hubSelectedProfessional', 'DEMO-01');
            document.addEventListener('nx-terminar', (e) => { window.__vetado = true; e.preventDefault(); });
        });
        await page.getByRole('button', { name: 'Terminar' }).click();
        await page.waitForTimeout(200);
        assert.deepEqual(await page.evaluate(() => [window.__vetado, !!document.querySelector('dialog.nx-dialogo[open]'), localStorage.getItem('hubSelectedProfessional')]), [true, false, 'DEMO-01']);
        assert.ok(page.url().endsWith(MUESTRAS.farmacia));
        await page.evaluate(() => localStorage.removeItem('hubSelectedProfessional'));
    });

    await test('B7 estilo de escritorio: ancho fijo, pegada arriba, página actual sin franja lateral y «Terminar» visible en 1440×900', async () => {
        await abrir('farmacia');
        const r = await page.evaluate(() => {
            const shell = document.querySelector('nx-shell');
            const actual = shell.querySelector('[aria-current="page"]');
            const cs = getComputedStyle(actual);
            const terminar = shell.querySelector('.nx-shell__terminar').getBoundingClientRect();
            return {
                ancho: shell.getBoundingClientRect().width,
                posicion: getComputedStyle(shell).position,
                fondoActual: cs.backgroundColor,
                colorActual: cs.color,
                bordeIzq: cs.borderLeftWidth,
                terminarVisible: terminar.bottom <= innerHeight && terminar.top >= 0,
                altoEnlace: shell.querySelector('a.nx-shell__enlace').getBoundingClientRect().height >= 24,
            };
        });
        assert.deepEqual(r, { ancho: 256, posicion: 'sticky', fondoActual: 'rgb(240, 235, 247)', colorActual: 'rgb(60, 16, 124)', bordeIzq: '0px', terminarVisible: true, altoEnlace: true });
        assert.equal(await estilo('nx-shell .nx-shell__modulo', 'color'), 'rgb(0, 107, 94)', 'color de Farmacia en el nombre del módulo');
        await captura('farmacia-1440');
        await abrir('reuma');
        assert.equal(await estilo('nx-shell .nx-shell__modulo', 'color'), 'rgb(176, 1, 106)', 'color de Reuma en el nombre del módulo');
        await captura('reuma-1440');
    });

    await test('B8 axe-core: ningún fallo WCAG 2.1/2.2 A/AA en las dos muestras', async () => {
        for (const modulo of Object.keys(MUESTRAS)) {
            await abrir(modulo);
            assert.deepEqual(await axe(), [], modulo);
        }
    });

    await test('B9 teclado: lo primero con el tabulador es la marca y el foco se ve', async () => {
        await abrir('farmacia');
        await page.keyboard.press('Tab');
        const r = await page.evaluate(() => {
            const el = document.activeElement;
            return { marca: el.classList.contains('nx-shell__marca'), contorno: getComputedStyle(el).outlineStyle !== 'none' };
        });
        assert.deepEqual(r, { marca: true, contorno: true });
    });

    await test('B10 sin desplazamiento lateral a 1024/768/576/360; por debajo de 40em la barra va arriba y no se queda fija', async () => {
        for (const modulo of Object.keys(MUESTRAS)) {
            for (const ancho of [1024, 768, 576, 360]) {
                await page.setViewportSize({ width: ancho, height: 800 });
                await abrir(modulo);
                const r = await page.evaluate(() => {
                    const shell = document.querySelector('nx-shell').getBoundingClientRect();
                    const main = document.querySelector('main').getBoundingClientRect();
                    return {
                        desborde: document.documentElement.scrollWidth - innerWidth,
                        arriba: main.top >= shell.bottom,
                        posicion: getComputedStyle(document.querySelector('nx-shell')).position,
                    };
                });
                assert.equal(r.desborde, 0, `${modulo} ${ancho}px desborda`);
                if (ancho <= 576) assert.deepEqual([r.arriba, r.posicion], [true, 'static'], `${modulo} ${ancho}px`);
                else assert.equal(r.posicion, 'sticky', `${modulo} ${ancho}px`);
                if (ancho === 1024) await captura(`${modulo}-1024`);
                if (ancho === 360) {
                    await captura(`${modulo}-360`);
                    assert.deepEqual(await axe(), [], `axe ${modulo} a 360px`);
                }
            }
        }
        await page.setViewportSize({ width: 1440, height: 900 });
    });

    await test('sin errores de consola ni diálogos del navegador', async () => {
        assert.deepEqual(consoleErrors, []);
        assert.deepEqual(nativeDialogs, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_shell_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
