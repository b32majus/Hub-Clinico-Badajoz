#!/usr/bin/env node
// Estadísticas de Reuma con las piezas del catálogo (issue #956, tramo 7, H-28).
// Las 5 pestañas de filtros son <nx-pestanas> (los botones conservan .filter-tab[data-tab] como gancho de otros checks);
// los filtros simples son nx-campo; las cifras son nx-cifra sin icono, color ni «tendencia» fija
// (el «+0%»/«Sin cambios» era texto escrito a mano que ningún JS calculaba); el botón de exportar es nx-boton.
// Solo datos sintéticos. Ejecutar con un PATH que exponga Playwright.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABS = ['periodo', 'demograficos', 'clinicos', 'terapeuticos', 'historicos'];
const CIFRAS = ['kpiTotalPatients', 'kpiRemissionPercent', 'kpiHighActivityPercent', 'kpiBiologicPercent', 'kpiAvgActivity', 'kpiAvgAsdas'];

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
await context.addInitScript(() => { try { localStorage.setItem('hubSelectedProfessional', 'Dra. DEMO Sintética'); } catch (e) {} });
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error' && message.text().indexOf('Failed to load resource') === -1 && message.text().indexOf('[Estadísticas] No hay datos cargados') === -1) consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));



try {
    // Estado visible de las pestañas: [data-tab de la elegida, paneles visibles, aria-selected, tabindex]
    const estado = () => page.evaluate(() => {
        const tabs = [...document.querySelectorAll('nx-pestanas [role="tab"]')];
        const paneles = [...document.querySelectorAll('nx-pestanas [role="tabpanel"]')];
        return {
            elegida: tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.dataset.tab),
            visibles: paneles.filter((p) => !p.hidden && getComputedStyle(p).display !== 'none').map((p) => p.id),
            tabindex: tabs.map((t) => t.tabIndex),
            foco: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.tab : null
        };
    });

    // El panel de filtros empieza cerrado: sin abrirlo, las pestañas no se ven ni se pueden pulsar.
    const abrirFiltros = async () => {
        await page.evaluate(() => {
            const h = document.getElementById('filtersHeader');
            if (h && !h.classList.contains('active')) h.click();
        });
        await page.waitForTimeout(400);
    };

    await test('E1 la página carga la pieza nx-pestanas como módulo y la define', async () => {
        await page.goto(base + 'estadisticas.html', { waitUntil: 'load' });
        await page.waitForFunction(() => !!customElements.get('nx-pestanas'), null, { timeout: 10000 });
        const src = await page.evaluate(() => [...document.querySelectorAll('script[type="module"]')].map((s) => s.getAttribute('src')));
        assert.ok(src.some((s) => /^modules\/nexus\/piezas\/nx-pestanas\.js(\?|$)/.test(s || '')), 'falta <script type="module" src="modules/nexus/piezas/nx-pestanas.js">: ' + src.join(', '));
    });

    await test('E2 una sola nx-pestanas en el panel de filtros, con 5 pestañas y 5 paneles enlazados', async () => {
        const r = await page.evaluate(() => {
            const np = [...document.querySelectorAll('nx-pestanas')];
            const el = np[0];
            if (!el) return { n: 0 };
            const lista = el.querySelector('.nx-pestanas__lista[role="tablist"]');
            const tabs = [...el.querySelectorAll('button.nx-pestanas__pestana.filter-tab[role="tab"][type="button"]')];
            return {
                n: np.length,
                dentro: !!el.closest('.filters-panel'),
                lista: !!lista && !!lista.getAttribute('aria-label'),
                tabs: tabs.map((t) => t.dataset.tab),
                enlaces: tabs.map((t) => {
                    const p = document.getElementById('tab-' + t.dataset.tab);
                    return !!p && p.matches('.nx-pestanas__panel.filter-tab-content[role="tabpanel"]') && p.getAttribute('aria-labelledby') === t.id && !!t.id;
                }),
                badges: tabs.map((t) => !!t.querySelector('#badge-' + t.dataset.tab + '.filter-tab-badge'))
            };
        });
        assert.equal(r.n, 1, 'debe haber exactamente una <nx-pestanas>');
        assert.ok(r.dentro, 'nx-pestanas debe estar dentro de .filters-panel');
        assert.ok(r.lista, 'falta .nx-pestanas__lista[role=tablist] con aria-label');
        assert.deepEqual(r.tabs, ['periodo', 'demograficos', 'clinicos', 'terapeuticos', 'historicos']);
        assert.deepEqual(r.enlaces, [true, true, true, true, true], 'cada panel tab-<x> lleva .nx-pestanas__panel.filter-tab-content y aria-labelledby = id de su pestaña');
        assert.deepEqual(r.badges, [true, true, true, true, true], 'cada pestaña conserva su contador #badge-<x>');
    });

    await test('E3 al cargar: Periodo elegida y solo su panel visible, ya escrito en el HTML', async () => {
        await abrirFiltros();
        const crudo = await page.evaluate(async (tabs) => {
            const html = await (await fetch('estadisticas.html', { cache: 'no-store' })).text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return tabs.map((t) => { const p = doc.getElementById('tab-' + t); return p ? p.hasAttribute('hidden') : null; });
        }, TABS);
        assert.deepEqual(crudo, [false, true, true, true, true], 'el HTML ya trae hidden en los 4 paneles no elegidos');
        const e = await estado();
        assert.deepEqual(e.elegida, ['periodo']);
        assert.deepEqual(e.visibles, ['tab-periodo']);
        assert.deepEqual(e.tabindex, [0, -1, -1, -1, -1]);
    });

    await test('E4 clic en Datos demográficos y flechas: cambia pestaña y panel; ya no se usa la clase active', async () => {
        await abrirFiltros();
        await page.click('.filter-tab[data-tab="demograficos"]');
        let e = await estado();
        assert.deepEqual(e.elegida, ['demograficos']);
        assert.deepEqual(e.visibles, ['tab-demograficos']);
        await page.focus('.filter-tab[data-tab="demograficos"]');
        await page.keyboard.press('ArrowRight');
        e = await estado();
        assert.deepEqual([e.elegida, e.visibles, e.foco], [['clinicos'], ['tab-clinicos'], 'clinicos']);
        await page.keyboard.press('End');
        e = await estado();
        assert.deepEqual([e.elegida, e.visibles], [['historicos'], ['tab-historicos']]);
        await page.keyboard.press('Home');
        e = await estado();
        assert.deepEqual([e.elegida, e.visibles], [['periodo'], ['tab-periodo']]);
        const activas = await page.evaluate(() => document.querySelectorAll('.filter-tab.active, .filter-tab-content.active').length);
        assert.equal(activas, 0, 'las pestañas y paneles ya no llevan la clase active (lo lleva aria-selected/hidden)');
    });

    await test('E5 con el panel abierto, cambiar de pestaña ajusta la altura del panel (no recorta el contenido)', async () => {
        await abrirFiltros();
        await page.click('.filter-tab[data-tab="clinicos"]');
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
            const c = document.querySelector('.filters-panel .collapsible-content');
            return { max: parseFloat(c.style.maxHeight || '0'), alto: c.scrollHeight };
        });
        assert.ok(r.max >= r.alto - 1, `max-height ${r.max} < scrollHeight ${r.alto}: el panel recorta la pestaña Clínicos`);
    });

    await test('E6 los filtros simples son nx-campo con etiqueta y control del catálogo', async () => {
        const r = await page.evaluate(() => {
            const grupos = [...document.querySelectorAll('.filter-tab-content .filter-group')]
                .filter((g) => !g.classList.contains('range-slider-group') && !g.classList.contains('checkbox-group'));
            return {
                n: grupos.length,
                mal: grupos.filter((g) => {
                    const label = g.querySelector(':scope > label');
                    const input = g.querySelector(':scope > input');
                    return !g.classList.contains('nx-campo') || !label || !label.classList.contains('nx-campo__etiqueta')
                        || (input && !input.classList.contains('nx-campo__control'));
                }).map((g) => (g.querySelector('label') || {}).htmlFor || g.outerHTML.slice(0, 60))
            };
        });
        assert.ok(r.n >= 10, 'esperaba al menos 10 filtros simples, hay ' + r.n);
        assert.deepEqual(r.mal, [], 'filtros sin nx-campo / nx-campo__etiqueta / nx-campo__control (en el input)');
    });

    await test('E7 cifras: nx-cifras con 6 nx-cifra (etiqueta + valor), ids conservados, sin icono ni tendencia', async () => {
        const r = await page.evaluate((ids) => {
            const panel = document.getElementById('kpisPanel');
            const cifras = panel ? [...panel.querySelectorAll(':scope > .nx-cifra')] : [];
            return {
                panel: !!panel && panel.classList.contains('nx-cifras') && panel.getAttribute('role') === 'region' && !!panel.getAttribute('aria-label'),
                n: cifras.length,
                forma: cifras.map((c) => c.querySelectorAll(':scope > p.nx-cifra__etiqueta').length === 1 && c.querySelectorAll(':scope > p.nx-cifra__valor').length === 1 && c.children.length === 2),
                ids: ids.map((id) => { const e = document.getElementById(id); return !!e && e.matches('.nx-cifra__valor'); }),
                asdas: !!document.getElementById('kpiAsdasCard') && document.getElementById('kpiAsdasCard').matches('.nx-cifra'),
                viejo: document.querySelectorAll('.kpi-trend, .kpi-icon, [class*="kpi-card--"], [id$="Trend"]').length,
                etiquetas: ['kpiRemissionLabel', 'kpiHighActivityLabel', 'kpiActivityLabel'].map((id) => { const e = document.getElementById(id); return !!e && e.matches('.nx-cifra__etiqueta'); })
            };
        }, CIFRAS);
        assert.ok(r.panel, '#kpisPanel debe llevar nx-cifras, role=region y aria-label');
        assert.equal(r.n, 6);
        assert.deepEqual(r.forma, [true, true, true, true, true, true], 'cada nx-cifra: solo p.nx-cifra__etiqueta y p.nx-cifra__valor');
        assert.deepEqual(r.ids, [true, true, true, true, true, true], 'los ids de valor siguen y llevan nx-cifra__valor');
        assert.deepEqual(r.etiquetas, [true, true, true], 'las etiquetas con id (las cambia el JS) llevan nx-cifra__etiqueta');
        assert.ok(r.asdas, '#kpiAsdasCard es una nx-cifra');
        assert.equal(r.viejo, 0, 'quedan tendencias fijas, iconos o colores de las cifras viejas');
    });

    await test('E8 exportar es nx-boton principal; no quedan primary-button', async () => {
        const r = await page.evaluate(() => ({
            exp: document.getElementById('exportCohortBtn')?.className || '',
            viejos: document.querySelectorAll('.primary-button, .secondary-button').length
        }));
        assert.match(r.exp, /\bnx-boton\b/);
        assert.match(r.exp, /\bnx-boton--principal\b/);
        assert.equal(r.viejos, 0);
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`reuma_estadisticas_piezas_browser_check:${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
