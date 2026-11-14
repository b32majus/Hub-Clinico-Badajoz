#!/usr/bin/env node
// Reuma (#940, inventario A5/A10): el CIP no va en la dirección ni en el nombre de ninguna
// entrada del navegador; un solo paciente a la vez, como Farmacia. Casos validados por Sil
// (14-11): 1 buscador→panel, 2 panel→Seguimiento, 3 vista rápida, 4 F5 olvida el paciente
// (opción A: el Excel sigue cargado), 5 cambio de paciente borra lo del anterior, 6 enlaces
// antiguos con ?id= se aceptan una vez y se limpian, 7 prebiológico en una sola entrada,
// 8 sin paciente → vacío. Solo datos sintéticos.

import assert from 'node:assert/strict';
import fs, { existsSync, readdirSync, statSync, createReadStream, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json'), 'utf8'));

const A = 'SYN-AR-001';   // patología ar
const B = 'SYN-ESPA-001'; // patología espa
const DB_KEYS = ['hubClinicoDB', 'hubClinicoDB_loadTime', 'hubClinicoDB_limited'];

function loadPlaywrightFromNpx() {
    for (const binDirectory of String(process.env.PATH || '').split(path.delimiter)) {
        const nodeModules = path.resolve(binDirectory, '..');
        for (const candidate of [nodeModules, path.join(nodeModules, 'lib', 'node_modules')]) {
            if (existsSync(path.join(candidate, 'playwright', 'package.json'))) {
                return createRequire(path.join(candidate, '__reuma_cip_loader.cjs'))('playwright');
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

// Libro sintético temporal, fuera del repositorio.
const tempDir = mkdtempSync(path.join(os.tmpdir(), 'reuma-cip-navegador-'));
const workbookPath = path.join(tempDir, 'reuma_cip_navegador_synthetic.xlsx');
{
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(corpus.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { Nombre_Completo: 'Sintetico Profesional Uno', Cargo: 'Reumatologia' },
    ]), 'Profesionales');
    fs.writeFileSync(workbookPath, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json'],
    ['.svg', 'image/svg+xml'], ['.png', 'image/png']
]);
const requestedUrls = [];
const server = createServer((request, response) => {
    requestedUrls.push(String(request.url || ''));
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

const browser = await chromium.launch({ executablePath: chromiumExecutable(), headless: true });
const pageErrors = [];

// Puerta de sesión real (Excel → profesional → confirmar). Devuelve la página en reuma_index.
async function freshSession() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    await page.goto(base + 'reuma_index.html', { waitUntil: 'load', timeout: 45000 });
    await page.setInputFiles('#gateExcelInput', workbookPath);
    await page.waitForSelector('#gateStepSelect:not(.hidden)', { timeout: 20000 });
    const professional = await page.evaluate(() => {
        const select = document.getElementById('gateProfessionalSelect');
        return select ? Array.from(select.options).map((option) => option.value).find(Boolean) || '' : '';
    });
    await page.selectOption('#gateProfessionalSelect', professional);
    await page.click('#gateConfirmBtn');
    await page.waitForFunction(() => document.getElementById('sessionGate').classList.contains('hidden'), null, { timeout: 10000 });
    return { context, page };
}

// Todas las entradas del navegador salvo el Excel cargado (hubClinicoDB*), que sigue en sesión.
async function storageEntries(page) {
    return page.evaluate((dbKeys) => {
        const out = [];
        for (const [kind, store] of [['session', window.sessionStorage], ['local', window.localStorage]]) {
            for (let i = 0; i < store.length; i += 1) {
                const key = store.key(i);
                if (kind === 'session' && dbKeys.includes(key)) continue;
                out.push({ kind, key, value: String(store.getItem(key)) });
            }
        }
        return out;
    }, DB_KEYS);
}
async function assertNoCipInKeys(page, label) {
    const entries = await storageEntries(page);
    const bad = entries.filter((e) => e.key.includes(A) || e.key.includes(B));
    assert.deepEqual(bad.map((e) => e.key), [], `${label}: ninguna entrada del navegador lleva un CIP en el nombre`);
}
async function assertNoValueWith(page, cip, label) {
    const entries = await storageEntries(page);
    const bad = entries.filter((e) => e.value.includes(cip));
    assert.deepEqual(bad.map((e) => e.kind + ':' + e.key), [], `${label}: no debe quedar nada guardado de ${cip}`);
}
function assertUrlClean(page, label) {
    const url = page.url();
    assert.ok(!url.includes(A) && !url.includes(B), `${label}: la dirección no debe llevar CIP (${url})`);
    assert.ok(!/[?&]id=/.test(url), `${label}: la dirección no debe llevar ?id= (${url})`);
}
async function searchAndOpen(page, cip) {
    await page.goto(base + 'dashboard_search.html', { waitUntil: 'load', timeout: 45000 });
    await page.fill('#dashboardSearchInput', cip);
    await Promise.all([
        page.waitForURL('**/dashboard_paciente.html**', { timeout: 20000 }),
        page.click('#dashboardSearchButton'),
    ]);
    await waitBadge(page, cip);
}
async function waitBadge(page, cip) {
    await page.waitForFunction((value) => {
        const badge = document.getElementById('patientIdBadge');
        const content = document.getElementById('dashboardContent');
        return badge && badge.textContent.trim() === value && content && !content.classList.contains('hidden');
    }, cip, { timeout: 20000 });
}
async function waitEmptyDashboard(page) {
    await page.waitForFunction(() => {
        const empty = document.getElementById('emptyState');
        const content = document.getElementById('dashboardContent');
        return empty && !empty.classList.contains('hidden') && content && content.classList.contains('hidden');
    }, null, { timeout: 20000 });
}
async function waitSeguimientoId(page, value) {
    await page.waitForFunction((v) => (document.getElementById('idPaciente') || {}).value === v, value, { timeout: 20000 });
}

try {
    // ---- Estático: ningún enlace de Reuma construye la dirección con el CIP.
    await test('C3 estático: ni la vista rápida, ni el buscador, ni el panel ponen ?id= en un enlace', async () => {
        for (const f of ['script.js', 'scripts/script_dashboard.js', 'scripts/script_dashboard_search.js']) {
            const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
            assert.ok(!/\.html\?id=/.test(src), `${f} no debe construir «.html?id=»`);
            assert.ok(!/URLSearchParams\(\s*\{\s*id\s*:/.test(src), `${f} no debe construir URLSearchParams({ id: … })`);
            assert.ok(!/params\.set\(\s*['"]id['"]/.test(src), `${f} no debe hacer params.set('id', …)`);
        }
    });

    // ---- Casos 1, 2, 4, 5, 7 en una sesión.
    const s1 = await freshSession();
    const p = s1.page;

    await test('C1 buscador → panel: dirección sin CIP y el panel muestra al paciente', async () => {
        await searchAndOpen(p, A);
        assertUrlClean(p, 'C1');
        await assertNoCipInKeys(p, 'C1');
    });

    await test('C2 panel → Seguimiento: mismo paciente y patología, dirección sin CIP', async () => {
        await Promise.all([
            p.waitForURL('**/seguimiento.html**', { timeout: 20000 }),
            p.click('#btnSeguimiento'),
        ]);
        await waitSeguimientoId(p, A);
        assertUrlClean(p, 'C2');
        const diag = await p.evaluate(() => (document.getElementById('diagnosticoPrimario') || {}).value || '');
        assert.equal(diag.toLowerCase(), 'ar', 'C2 Seguimiento debe abrirse con la patología del paciente (ar)');
        await assertNoCipInKeys(p, 'C2');
    });

    await test('C4 F5 en Seguimiento: formulario vacío y nada guardado del paciente', async () => {
        await p.reload({ waitUntil: 'load', timeout: 45000 });
        await p.waitForTimeout(1500);
        const id = await p.evaluate(() => (document.getElementById('idPaciente') || {}).value || '');
        assert.equal(id, '', 'C4 tras F5 el CIP de Seguimiento debe quedar vacío');
        assertUrlClean(p, 'C4');
        await assertNoValueWith(p, A, 'C4 Seguimiento');
    });

    await test('C7 prebiológico: una sola entrada, sin CIP en el nombre, solo del paciente actual', async () => {
        await searchAndOpen(p, A);
        const r = await p.evaluate(([a, b]) => {
            const pb = window.HubTools && window.HubTools.prebiologic;
            const okSet = pb.setStatus(a, 'APTO', '2026-01-10');
            return { okSet, mine: (pb.getStatus(a) || {}).estado || null, other: pb.getStatus(b), all: pb.getAllStatuses().length };
        }, [A, B]);
        assert.equal(r.okSet, true, 'C7 setStatus debe guardar');
        assert.equal(r.mine, 'APTO', 'C7 getStatus del paciente actual devuelve su estado');
        assert.equal(r.other, null, 'C7 getStatus de otro CIP devuelve null');
        assert.equal(r.all, 1, 'C7 hay como mucho una entrada de prebiológico');
        await assertNoCipInKeys(p, 'C7');
    });

    await test('C5 cambio de paciente: se borra lo guardado del anterior (también el prebiológico)', async () => {
        await searchAndOpen(p, B);
        assertUrlClean(p, 'C5');
        const prev = await p.evaluate((a) => window.HubTools.prebiologic.getStatus(a), A);
        assert.equal(prev, null, 'C5 el prebiológico del paciente anterior ya no existe');
        await assertNoValueWith(p, A, 'C5');
        await assertNoCipInKeys(p, 'C5');
    });

    await test('C4 F5 en el panel: «Busca un paciente…», nada guardado del paciente, el Excel sigue cargado', async () => {
        await p.evaluate((b) => window.HubTools.prebiologic.setStatus(b, 'EN_CURSO', ''), B);
        await p.reload({ waitUntil: 'load', timeout: 45000 });
        await waitEmptyDashboard(p);
        const subtitle = await p.evaluate(() => (document.getElementById('emptyStateSubtitle') || {}).textContent || '');
        assert.ok(/Busca un paciente/.test(subtitle), `C4 el panel debe invitar a buscar un paciente (dice «${subtitle}»)`);
        assertUrlClean(p, 'C4 panel');
        await assertNoValueWith(p, B, 'C4 panel');
        const hasDb = await p.evaluate(() => !!sessionStorage.getItem('hubClinicoDB'));
        assert.equal(hasDb, true, 'C4 el Excel sigue cargado en la sesión (opción A)');
        // Y se puede elegir otro paciente sin volver a cargar el Excel.
        await searchAndOpen(p, A);
    });
    await s1.context.close();

    // ---- Caso 6: enlaces antiguos con ?id=, y prebiológicos antiguos por CIP.
    const s2 = await freshSession();
    await test('C7 entradas antiguas HubClinico_Prebiologic_<CIP> se borran al cargar el panel', async () => {
        await s2.page.evaluate(([a, b]) => {
            sessionStorage.setItem('HubClinico_Prebiologic_' + a, JSON.stringify({ cip: a, estado: 'APTO', fechaValidacion: '', notasClinico: '', fechaRegistro: '2026-01-01T00:00:00.000Z' }));
            sessionStorage.setItem('HubClinico_Prebiologic_' + b, JSON.stringify({ cip: b, estado: 'NO_APTO', fechaValidacion: '', notasClinico: '', fechaRegistro: '2026-01-01T00:00:00.000Z' }));
        }, [A, B]);
        await s2.page.goto(base + 'dashboard_paciente.html', { waitUntil: 'load', timeout: 45000 });
        await s2.page.waitForTimeout(1000);
        const left = await s2.page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.indexOf('HubClinico_Prebiologic_') === 0));
        assert.deepEqual(left, [], 'C7 no deben quedar entradas HubClinico_Prebiologic_<CIP>');
    });
    await test('C6 panel con ?id= antiguo: muestra al paciente y quita el CIP de la dirección', async () => {
        await s2.page.goto(base + 'dashboard_paciente.html?id=' + A + '&patologia=ar', { waitUntil: 'load', timeout: 45000 });
        await waitBadge(s2.page, A);
        await s2.page.waitForFunction(() => !/[?&]id=/.test(location.href), null, { timeout: 5000 }).catch(() => {});
        assertUrlClean(s2.page, 'C6 panel');
        await assertNoCipInKeys(s2.page, 'C6 panel');
    });
    await test('C6 Seguimiento con ?id= antiguo: carga al paciente y quita el CIP de la dirección', async () => {
        await s2.page.goto(base + 'seguimiento.html?id=' + B + '&patologia=espa', { waitUntil: 'load', timeout: 45000 });
        await waitSeguimientoId(s2.page, B);
        await s2.page.waitForFunction(() => !/[?&]id=/.test(location.href), null, { timeout: 5000 }).catch(() => {});
        assertUrlClean(s2.page, 'C6 Seguimiento');
        await assertNoValueWith(s2.page, A, 'C6 cambio de paciente por enlace antiguo');
    });
    await s2.context.close();

    // ---- Caso 8: sin paciente actual ni ?id=.
    const s3 = await freshSession();
    await test('C8 panel sin paciente: vacío, nunca el último ni uno de demostración', async () => {
        await s3.page.goto(base + 'dashboard_paciente.html', { waitUntil: 'load', timeout: 45000 });
        await waitEmptyDashboard(s3.page);
    });
    await test('C8 Seguimiento sin paciente: formulario vacío', async () => {
        await s3.page.goto(base + 'seguimiento.html', { waitUntil: 'load', timeout: 45000 });
        await s3.page.waitForTimeout(1500);
        const id = await s3.page.evaluate(() => (document.getElementById('idPaciente') || {}).value || '');
        assert.equal(id, '', 'C8 Seguimiento sin paciente debe tener el CIP vacío');
    });
    await s3.context.close();

    // ---- Lo que vio el servidor: ninguna petición de página lleva el CIP (salvo los ?id= antiguos del caso 6, puestos por el test).
    await test('C1-C5 ninguna petición al servidor lleva el CIP, salvo los enlaces antiguos del caso 6', async () => {
        const legacy = ['/dashboard_paciente.html?id=' + A + '&patologia=ar', '/seguimiento.html?id=' + B + '&patologia=espa'];
        const leaked = requestedUrls.filter((u) => (u.includes(A) || u.includes(B)) && !legacy.includes(u));
        assert.deepEqual(leaked, [], 'peticiones con CIP');
    });

    await test('sin errores de página', async () => {
        assert.deepEqual(pageErrors, []);
    });
} finally {
    await browser.close();
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(`reuma_cip_navegador_browser_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
