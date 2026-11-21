#!/usr/bin/env node
// #956 tramo 4 (ADR-010 §3; ADR-009 R1, R4 y R8): catálogo de piezas en navegador.
// Sirve el sitio bajo /nexus/ (como Pages) y abre muestra/nexus_piezas.html:
// axe-core sin fallos WCAG 2.1 A/AA (también con la ventana y los avisos abiertos),
// estilos del catálogo aplicados, pestañas con teclado, foco visible y sin
// desplazamiento lateral de escritorio a móvil. NEXUS_CAPTURAS=<carpeta> guarda capturas.
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
const MUESTRA = 'muestra/nexus_piezas.html';

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

try {
    await test('P1 bajo /nexus/ la muestra carga entera, sin nada de fuera, sin 404 y con CSP estricta', async () => {
        await page.goto(base + MUESTRA, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.title(), 'Nexus · Catálogo de piezas');
        assert.deepEqual(requested.filter((p) => !p.startsWith(PREFIX)), [], 'peticiones fuera de la subruta');
        for (const f of ['css/nexus_piezas.css', 'muestra/muestra.js', 'modules/nexus/piezas/nx-pestanas.js', 'vendor/inter/inter.css']) {
            assert.ok(requested.includes(PREFIX + f), `no se pidió ${f}`);
        }
        assert.ok(await page.evaluate(() => !!customElements.get('nx-pestanas') && !!customElements.get('nx-aviso')));
        assert.ok(/Inter/.test(await estilo('body', 'font-family')), 'la página no usa Inter');
        assert.deepEqual(external, []);
        assert.deepEqual(broken, []);
    });

    await test('P2 los estilos del catálogo llegan a las piezas', async () => {
        assert.equal(await estilo('.nx-boton--principal', 'background-color'), 'rgb(60, 16, 124)');
        assert.equal(await estilo('.nx-boton--peligro', 'background-color'), 'rgb(164, 38, 44)');
        assert.equal(await estilo('.nx-boton--secundario', 'border-top-color'), 'rgb(138, 147, 165)');
        assert.equal(await estilo('nx-aviso[tipo="error"]', 'border-left-width'), '1px', 'sin franja gruesa a la izquierda (Sil, 21-11)');
        assert.equal(await estilo('nx-aviso[tipo="error"]', 'background-color'), 'rgb(251, 234, 234)');
        assert.equal(await estilo('nx-aviso[tipo="ok"] .nx-aviso__etiqueta', 'color'), 'rgb(27, 122, 62)');
        assert.equal(await estilo('.nx-etiqueta--aviso', 'color'), 'rgb(138, 83, 0)');
        assert.equal(await estilo('.nx-tarjeta', 'border-top-width'), '1px', 'tarjeta sin franja de color (Sil, 21-11)');
        assert.equal(await estilo('.nx-tabla thead th', 'position'), 'sticky');
        assert.equal(await estilo('.nx-pestanas__pestana[aria-selected="true"]', 'border-bottom-width', '::after'), '3px');
        const alto = await page.evaluate(() => document.querySelector('.nx-boton--principal').getBoundingClientRect().height);
        assert.ok(alto >= 40, `botón de ${alto}px (mínimo 40)`);
    });

    await test('P3 axe-core: ningún fallo WCAG 2.1 A/AA en la página', async () => {
        assert.deepEqual(await axe(), []);
    });

    await test('P4 pestañas: flechas, Inicio y Fin; la selección sigue al foco; un solo panel visible', async () => {
        const estado = () => page.evaluate(() => ({
            elegida: [...document.querySelectorAll('nx-pestanas [role="tab"]')].filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.id),
            tabindex: [...document.querySelectorAll('nx-pestanas [role="tab"]')].map((t) => t.tabIndex),
            visibles: [...document.querySelectorAll('nx-pestanas [role="tabpanel"]')].filter((p) => !p.hidden).map((p) => p.getAttribute('aria-labelledby')),
            foco: document.activeElement && document.activeElement.id,
        }));
        await page.evaluate(() => document.addEventListener('nx-cambio', (e) => { (window.__cambios = window.__cambios || []).push(e.detail.pestana.id); }));
        await page.locator('#p-resumen').focus();
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await estado(), { elegida: ['p-historial'], tabindex: [-1, 0, -1], visibles: ['p-historial'], foco: 'p-historial' });
        await page.keyboard.press('End');
        assert.deepEqual((await estado()).visibles, ['p-documentos']);
        await page.keyboard.press('ArrowRight');
        assert.deepEqual((await estado()).elegida, ['p-resumen'], 'la flecha da la vuelta');
        await page.keyboard.press('ArrowLeft');
        assert.deepEqual((await estado()).foco, 'p-documentos');
        await page.keyboard.press('Home');
        assert.deepEqual(await estado(), { elegida: ['p-resumen'], tabindex: [0, -1, -1], visibles: ['p-resumen'], foco: 'p-resumen' });
        await page.locator('#p-historial').click();
        assert.deepEqual((await estado()).visibles, ['p-historial']);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'tabpanel', 'Tab desde la pestaña va al panel');
        assert.deepEqual(await page.evaluate(() => window.__cambios), ['p-historial', 'p-documentos', 'p-resumen', 'p-documentos', 'p-resumen', 'p-historial']);
        await page.locator('#p-resumen').click();
    });

    await test('P5 foco visible con teclado en botón, campo y pestaña', async () => {
        for (const sel of ['.nx-boton--principal', '#c-nombre', '#p-resumen']) {
            await page.locator(sel).first().focus();
            await page.keyboard.press('Shift+Tab');
            await page.keyboard.press('Tab');
            const r = await page.evaluate((s) => {
                const el = document.querySelector(s);
                const cs = getComputedStyle(el);
                return { activo: document.activeElement === el, visible: el.matches(':focus-visible'), ancho: cs.outlineWidth, estilo: cs.outlineStyle };
            }, sel);
            assert.deepEqual(r, { activo: true, visible: true, ancho: '3px', estilo: 'solid' }, sel);
        }
    });

    await test('P6 escritorio: captura y avisos de avisar() abajo a la derecha, dentro de la pantalla', async () => {
        await captura('escritorio-1440');
        await page.locator('[data-muestra-avisar="error"]').click();
        await page.locator('[data-muestra-avisar="ok"]').click();
        const r = await page.evaluate(() => {
            const z = document.querySelector('#nx-avisos');
            const b = z.getBoundingClientRect();
            return { pos: getComputedStyle(z).position, n: z.children.length, dentro: b.right <= innerWidth && b.bottom <= innerHeight && b.left >= 0, derecha: innerWidth - b.right };
        });
        assert.equal(r.pos, 'fixed');
        assert.equal(r.n, 2);
        assert.ok(r.dentro && r.derecha < 40, JSON.stringify(r));
        assert.deepEqual(await axe(), [], 'axe con avisos abiertos');
        if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, 'escritorio-avisos.png') });
        for (let i = 0; i < 2; i += 1) await page.locator('#nx-avisos button.nx-aviso__cerrar').first().click();
    });

    await test('P7 confirmación peligrosa: ventana con estilo, fondo velado, sin fallos de axe', async () => {
        await page.locator('[data-muestra-confirmar="peligro"]').click();
        await page.waitForSelector('dialog.nx-dialogo[open]');
        const r = await page.evaluate(() => {
            const d = document.querySelector('dialog.nx-dialogo');
            const b = d.getBoundingClientRect();
            return { radio: getComputedStyle(d).borderTopLeftRadius, ancho: Math.round(b.width), velo: getComputedStyle(d, '::backdrop').backgroundColor, foco: document.activeElement.textContent };
        });
        assert.deepEqual(r, { radio: '12px', ancho: 512, velo: 'rgba(31, 36, 48, 0.55)', foco: 'Seguir editando' });
        assert.deepEqual(await axe('dialog.nx-dialogo'), [], 'axe dentro de la ventana');
        if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, 'escritorio-dialogo.png') });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#muestra-resultado').textContent(), 'Respuesta: cancelar.');
    });

    await test('P8 de escritorio a móvil (1024, 768, 576, 360): sin desplazamiento lateral; en móvil la ventana apila los botones', async () => {
        for (const ancho of [1024, 768, 576, 360]) {
            await page.setViewportSize({ width: ancho, height: 800 });
            const r = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: innerWidth }));
            assert.ok(r.ancho <= r.vista, `a ${ancho}px la página mide ${r.ancho}px`);
            if (ancho === 1024 || ancho === 360) await captura(`ancho-${ancho}`);
        }
        await page.locator('[data-muestra-confirmar="normal"]').click();
        await page.waitForSelector('dialog.nx-dialogo[open]');
        const r = await page.evaluate(() => {
            const [a, b] = [...document.querySelectorAll('dialog.nx-dialogo button')].map((x) => x.getBoundingClientRect());
            const d = document.querySelector('dialog.nx-dialogo').getBoundingClientRect();
            return { apilados: a.top !== b.top, cabe: d.left >= 0 && d.right <= innerWidth };
        });
        assert.deepEqual(r, { apilados: true, cabe: true });
        await page.keyboard.press('Escape');
        assert.deepEqual(await axe(), [], 'axe a 360px');
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

console.log(`nexus_piezas_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
