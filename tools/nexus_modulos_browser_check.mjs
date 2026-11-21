#!/usr/bin/env node
// #956 tramo 3 (ADR-010 §3; ADR-009 R1, R6 y R8): modules/nexus/ en navegador.
// Sirve el sitio bajo una subruta (/nexus/, como Pages), importa la biblioteca
// desde una página real y comprueba avisar() con <nx-aviso> y confirmar() con
// <dialog> nativo: textos como texto, papel accesible, foco y cierre.
// Ninguna página usa todavía la biblioteca. Solo datos sintéticos.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = '/nexus/';

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
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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



try {
    await test('B1 bajo /nexus/ la biblioteca se importa desde una página real, todo dentro de la subruta', async () => {
        await page.goto(base + 'nexus_home.html', { waitUntil: 'networkidle' });
        const names = await page.evaluate(async () => {
            const m = await import(new URL('modules/nexus/index.js', document.baseURI).href);
            window.__nx = m;
            return Object.keys(m).sort();
        });
        for (const n of ['avisar', 'claveBusqueda', 'confirmar', 'escaparHtml', 'fechaCorta', 'fechaIso', 'fechaLarga', 'leerFecha', 'normalizarTexto']) {
            assert.ok(names.includes(n), `falta ${n} en index.js: ${names}`);
        }
        assert.ok(await page.evaluate(() => !!customElements.get('nx-aviso')), 'nx-aviso no está definido');
        assert.deepEqual(requested.filter((p) => !p.startsWith(PREFIX)), [], 'peticiones fuera de la subruta');
        assert.ok(requested.some((p) => p === PREFIX + 'modules/nexus/piezas/nx-aviso.js'), 'no se pidió piezas/nx-aviso.js por ruta relativa');
        assert.deepEqual(external, []);
        assert.deepEqual(broken, []);
    });

    await test('B2 avisar(): zona «Avisos» única, papel según tipo, etiqueta en texto y mensaje como texto', async () => {
        const r = await page.evaluate(() => {
            const a = window.__nx.avisar('No se pudo leer el Excel <b>maestro</b>.', { tipo: 'error' });
            const b = window.__nx.avisar('Datos copiados.', { tipo: 'ok' });
            const c = window.__nx.avisar('Revise la fecha.', { tipo: 'aviso', titulo: 'Fecha dudosa' });
            const d = window.__nx.avisar('Hay 3 pacientes.');
            const zonas = document.querySelectorAll('#nx-avisos');
            const zona = zonas[0];
            const info = (el) => ({
                tag: el.tagName.toLowerCase(), tipo: el.getAttribute('tipo'), role: el.getAttribute('role'),
                enZona: el.parentElement === zona,
                etiqueta: (el.querySelector('.nx-aviso__etiqueta') || {}).textContent,
                titulo: (el.querySelector('.nx-aviso__titulo') || {}).textContent || null,
                texto: (el.querySelector('.nx-aviso__texto') || {}).textContent,
                negritas: el.querySelectorAll('.nx-aviso__texto b').length,
                boton: (() => { const x = el.querySelector('button.nx-aviso__cerrar'); return x ? [x.type, x.textContent, x.getAttribute('aria-label')] : null; })(),
            });
            let error = null;
            try { window.__nx.avisar('x', { tipo: 'rojo' }); } catch (e) { error = e.name; }
            return {
                zonas: zonas.length, zonaEnBody: zona && zona.parentElement === document.body,
                zonaRole: zona && zona.getAttribute('role'), zonaLabel: zona && zona.getAttribute('aria-label'),
                hijos: zona && zona.children.length, a: info(a), b: info(b), c: info(c), d: info(d), error,
            };
        });
        assert.equal(r.zonas, 1);
        assert.ok(r.zonaEnBody, 'la zona cuelga de body');
        assert.equal(r.zonaRole, 'region');
        assert.equal(r.zonaLabel, 'Avisos');
        assert.equal(r.hijos, 4, 'el tipo no válido no deja aviso');
        assert.deepEqual(r.a, { tag: 'nx-aviso', tipo: 'error', role: 'alert', enZona: true, etiqueta: 'Error', titulo: null, texto: 'No se pudo leer el Excel <b>maestro</b>.', negritas: 0, boton: ['button', 'Cerrar', 'Cerrar aviso'] });
        assert.deepEqual([r.b.tipo, r.b.role, r.b.etiqueta], ['ok', 'status', 'Hecho']);
        assert.deepEqual([r.c.tipo, r.c.role, r.c.etiqueta, r.c.titulo, r.c.texto], ['aviso', 'alert', 'Atención', 'Fecha dudosa', 'Revise la fecha.']);
        assert.deepEqual([r.d.tipo, r.d.role, r.d.etiqueta], ['info', 'status', 'Información']);
        assert.equal(r.error, 'TypeError');
    });

    await test('B3 los avisos no se cierran solos; «Cerrar» lo quita y el foco pasa al siguiente aviso', async () => {
        await page.waitForTimeout(11000);
        assert.equal(await page.locator('#nx-avisos > nx-aviso').count(), 4, 'un aviso desapareció solo');
        await page.locator('#nx-avisos > nx-aviso').nth(0).locator('button.nx-aviso__cerrar').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#nx-avisos > nx-aviso').count(), 3);
        const focused = await page.evaluate(() => {
            const el = document.activeElement;
            return el && el.matches('button.nx-aviso__cerrar') && el.closest('nx-aviso') === document.querySelector('#nx-avisos > nx-aviso');
        });
        assert.ok(focused, 'el foco no pasó al botón del siguiente aviso');
        for (let i = 0; i < 3; i += 1) await page.locator('#nx-avisos > nx-aviso button.nx-aviso__cerrar').first().click();
        assert.equal(await page.locator('#nx-avisos > nx-aviso').count(), 0);
        assert.equal(await page.locator('#nx-avisos').count(), 1, 'la zona se mantiene');
    });

    await test('B4 <nx-aviso> escrito a mano: arma su estructura una vez, sin botón si no es cerrable', async () => {
        const r = await page.evaluate(() => {
            const el = document.createElement('nx-aviso');
            el.setAttribute('tipo', 'aviso');
            el.append('Revise la ', Object.assign(document.createElement('em'), { textContent: 'dosis' }), '.');
            document.body.append(el);
            const host = document.createElement('section');
            document.body.append(host);
            host.append(el);
            return {
                role: el.getAttribute('role'),
                etiquetas: el.querySelectorAll('.nx-aviso__etiqueta').length,
                textos: el.querySelectorAll('.nx-aviso__texto').length,
                texto: el.querySelector('.nx-aviso__texto').textContent,
                em: el.querySelectorAll('.nx-aviso__texto > em').length,
                boton: el.querySelectorAll('button').length,
                propio: (() => { const x = document.createElement('nx-aviso'); x.setAttribute('tipo', 'ok'); x.setAttribute('role', 'note'); x.textContent = 'Listo'; document.body.append(x); return x.getAttribute('role'); })(),
            };
        });
        assert.deepEqual(r, { role: 'alert', etiquetas: 1, textos: 1, texto: 'Revise la dosis.', em: 1, boton: 0, propio: 'note' });
    });

    await test('B5 confirmar() peligrosa: <dialog> modal con nombre, texto como texto y foco en la opción segura', async () => {
        await page.evaluate(() => {
            window.__p = window.__nx.confirmar({ titulo: '¿Descartar cambios?', texto: 'Se perderán los <datos> sin exportar.', aceptar: 'Descartar', cancelar: 'Seguir editando', peligro: true });
        });
        const r = await page.evaluate(() => {
            const d = document.querySelector('dialog.nx-dialogo');
            const t = d && document.getElementById(d.getAttribute('aria-labelledby'));
            const botones = d ? [...d.querySelectorAll('form[method="dialog"] button')].map((b) => [b.value, b.textContent, b.className]) : [];
            return {
                n: document.querySelectorAll('dialog.nx-dialogo').length, open: d && d.open, modal: d && d.matches(':modal'),
                role: d && d.getAttribute('role'), ariaModal: d && d.getAttribute('aria-modal'),
                titulo: t && t.tagName + ':' + t.textContent, dentro: !!(t && d.contains(t)),
                texto: (d && d.querySelector('.nx-dialogo__texto') || {}).textContent, botones,
                foco: document.activeElement && document.activeElement.textContent,
            };
        });
        assert.equal(r.n, 1);
        assert.ok(r.open && r.modal, 'no se abrió como modal (showModal)');
        assert.equal(r.role, null, 'sin role: lo da <dialog>');
        assert.equal(r.ariaModal, null, 'sin aria-modal');
        assert.equal(r.titulo, 'H2:¿Descartar cambios?');
        assert.ok(r.dentro);
        assert.equal(r.texto, 'Se perderán los <datos> sin exportar.');
        assert.deepEqual(r.botones.map((b) => b.slice(0, 2)), [['cancelar', 'Seguir editando'], ['aceptar', 'Descartar']]);
        assert.ok(/nx-boton--peligro/.test(r.botones[1][2]), 'el botón de aceptar peligroso lleva nx-boton--peligro');
        assert.equal(r.foco, 'Seguir editando');
        await page.getByRole('button', { name: 'Descartar' }).click();
        assert.equal(await page.evaluate(() => window.__p), true);
        assert.equal(await page.locator('dialog.nx-dialogo').count(), 0, 'el diálogo se retira del DOM al cerrar');
    });

    await test('B6 confirmar(): Esc y «Cancelar» dan false; foco en «Aceptar» si no es peligrosa; sin título es un error', async () => {
        await page.evaluate(() => { window.__p = window.__nx.confirmar({ titulo: '¿Copiar los datos?' }); });
        const r = await page.evaluate(() => {
            const d = document.querySelector('dialog.nx-dialogo');
            return {
                foco: document.activeElement && document.activeElement.textContent,
                texto: d.querySelectorAll('.nx-dialogo__texto').length,
                clase: d.querySelector('button[value="aceptar"]').className,
            };
        });
        assert.equal(r.foco, 'Aceptar');
        assert.equal(r.texto, 0, 'sin texto no hay párrafo vacío');
        assert.ok(/nx-boton--principal/.test(r.clase) && !/nx-boton--peligro/.test(r.clase), r.clase);
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => window.__p), false);
        assert.equal(await page.locator('dialog.nx-dialogo').count(), 0);
        await page.evaluate(() => { window.__p = window.__nx.confirmar({ titulo: 'Otra', aceptar: 'Sí' }); });
        await page.getByRole('button', { name: 'Cancelar' }).click();
        assert.equal(await page.evaluate(() => window.__p), false);
        const sinTitulo = await page.evaluate(() => window.__nx.confirmar({}).then(() => 'resuelta', (e) => e.name));
        assert.equal(sinTitulo, 'TypeError');
        assert.equal(await page.locator('dialog.nx-dialogo').count(), 0);
        assert.deepEqual(nativeDialogs, [], 'se usó alert/confirm del navegador');
    });

    await test('sin errores de consola', async () => {
        assert.deepEqual(consoleErrors, []);
    });
} finally {
    await browser.close();
    server.close();
}

console.log(`nexus_modulos_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
