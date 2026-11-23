#!/usr/bin/env node
// #956 tramo 3 (ADR-010 §1 y §3; ADR-009 R1 y R6): biblioteca común modules/nexus/.
// Parte sin navegador (corre en CI): funciones puras de texto y fechas, y reglas
// de los ficheros (módulos ES con rutas relativas, nada de innerHTML ni
// alert/confirm, ninguna página los usa todavía). Los avisos, la confirmación y
// la carga bajo subruta los comprueba tools/nexus_modulos_browser_check.mjs.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'modules/nexus';
const FILES = ['index.js', 'texto.js', 'fechas.js', 'avisos.js', 'piezas/nx-aviso.js', 'piezas/nx-pestanas.js', 'piezas/nx-shell.js', 'menus.js', 'version.js'];
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const load = (rel) => import(pathToFileURL(path.join(ROOT, DIR, rel)).href);
function walk(dir) {
    if (!existsSync(path.join(ROOT, dir))) return [];
    return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
}

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}
const ymd = (d) => (d instanceof Date ? [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()] : d);

await test('M1 existen los ficheros de modules/nexus y no hay otros', async () => {
    for (const f of FILES) assert.ok(existsSync(path.join(ROOT, DIR, f)), `falta ${DIR}/${f}`);
    const extra = walk(DIR).map((f) => f.slice(DIR.length + 1)).filter((f) => !FILES.includes(f));
    assert.deepEqual(extra, [], 'ficheros no previstos');
});

await test('M2 módulos ES: imports solo relativos y con .js; nada de innerHTML, alert ni confirm', async () => {
    const problems = [];
    for (const f of FILES) {
        // Los comentarios no cuentan (p. ej. «#956» no es un color).
        const src = read(`${DIR}/${f}`).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
        if (!/^\s*export\s/m.test(src)) problems.push(`${f}: no exporta nada`);
        for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?\sfrom\s+['"]([^'"]+)['"]/g)) {
            if (!/^\.\.?\//.test(m[1]) || !m[1].endsWith('.js')) problems.push(`${f}: import no relativo o sin .js: ${m[1]}`);
        }
        for (const m of src.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) {
            if (!/^\.\.?\//.test(m[1]) || !m[1].endsWith('.js')) problems.push(`${f}: import no relativo o sin .js: ${m[1]}`);
        }
        if (/\bimport\s*\(/.test(src)) problems.push(`${f}: import() dinámico`);
        if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(src)) problems.push(`${f}: HTML como texto`);
        if (/\b(alert|confirm|prompt)\s*\(/.test(src)) problems.push(`${f}: alert/confirm/prompt`);
        if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|style\s*=|\.style\./.test(src)) problems.push(`${f}: color o estilo escrito a mano (va en CSS, tramo 4)`);
        if (/window\.[A-Za-z]+\s*=|globalThis\.[A-Za-z]+\s*=/.test(src)) problems.push(`${f}: crea un global`);
        // Única excepción (tramo 5, ADR-009 R5 y ADR-010 §3): <nx-shell> lee el perfil del hospital y «Terminar» olvida el profesional.
        const sinExcepciones = f === 'piezas/nx-shell.js'
            ? src.replace('fetch(raiz + RUTA_MANIFIESTO', '').replace('localStorage.removeItem(CLAVE_PROFESIONAL)', '')
            : src;
        if (/localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest/.test(sinExcepciones)) problems.push(`${f}: almacenamiento o red`);
    }
    assert.deepEqual(problems, []);
});

await test('M3 solo las 17 páginas con barra cargan modules/nexus, y solo piezas/nx-shell.js; ningún script lo usa', async () => {
    const scripts = [...walk('scripts'), ...walk('modules').filter((f) => !f.startsWith(DIR + '/'))]
        .filter((f) => /\.js$/.test(f) && read(f).includes('modules/nexus'));
    assert.deepEqual(scripts, [], 'ningún script de producto usa modules/nexus todavía');
    const mal = readdirSync(ROOT).filter((f) => f.endsWith('.html'))
        .filter((f) => {
            let html = read(f)
                // Las dependencias de nx-shell solo se adelantan con <link rel="modulepreload"> (carga de la barra, 21-11).
                .replace(/<link rel="modulepreload" href="modules\/nexus\/(menus|version|avisos|piezas\/nx-aviso)\.js">/g, '')
                .replace(/modules\/nexus\/piezas\/nx-shell\.js/g, '');
            // ADR-010: cada pantalla importa la pieza que usa. Solo nx-pestanas, y solo si la página tiene <nx-pestanas> (tramo 7, 23-11).
            if (html.includes('<nx-pestanas')) html = html.replace(/<script type="module" src="modules\/nexus\/piezas\/nx-pestanas\.js(\?v=[\w-]+)?"><\/script>/g, '');
            return html.includes('modules/nexus');
        });
    assert.deepEqual(mal, [], 'las páginas solo cargan piezas/nx-shell.js (y piezas/nx-pestanas.js si usan <nx-pestanas>)');
});

await test('M4 index.js reexporta la API pública', async () => {
    const m = await load('texto.js');
    const f = await load('fechas.js');
    const idx = read(`${DIR}/index.js`);
    for (const name of ['escaparHtml', 'normalizarTexto', 'claveBusqueda', 'leerFecha', 'fechaIso', 'fechaCorta', 'fechaLarga', 'avisar', 'confirmar', 'NxPestanas', 'NxShell', 'MENUS', 'VERSION_SITIO']) {
        assert.ok(new RegExp(`\\b${name}\\b`).test(idx), `index.js no reexporta ${name}`);
    }
    assert.equal(typeof m.escaparHtml, 'function');
    assert.equal(typeof f.leerFecha, 'function');
});

await test('T1 escaparHtml: los cinco caracteres, null/undefined vacíos, 0 se conserva', async () => {
    const { escaparHtml } = await load('texto.js');
    assert.equal(escaparHtml(`<a href="x">Tom & 'Ana'</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Ana&#39;&lt;/a&gt;');
    assert.equal(escaparHtml(null), '');
    assert.equal(escaparHtml(undefined), '');
    assert.equal(escaparHtml(0), '0');
    assert.equal(escaparHtml(false), 'false');
    assert.equal(escaparHtml('&amp;'), '&amp;amp;');
});

await test('T2 normalizarTexto: sin tildes, minúsculas, espacios recortados y colapsados', async () => {
    const { normalizarTexto } = await load('texto.js');
    assert.equal(normalizarTexto('  Adalimumab   ÁÉÍÓÚ Ñandú\tÜ  '), 'adalimumab aeiou nandu u');
    assert.equal(normalizarTexto(null), '');
    assert.equal(normalizarTexto(undefined), '');
    assert.equal(normalizarTexto(12), '12');
    assert.equal(normalizarTexto('Anti-TNF / IL-17'), 'anti-tnf / il-17');
});

await test('T3 claveBusqueda: solo a-z y 0-9', async () => {
    const { claveBusqueda } = await load('texto.js');
    assert.equal(claveBusqueda(' CIP-DEMO-FH-002 '), 'cipdemofh002');
    assert.equal(claveBusqueda('Pérez Muñoz, José'), 'perezmunozjose');
    assert.equal(claveBusqueda(null), '');
});

await test('F1 leerFecha: AAAA-MM-DD y DD/MM/AAAA como día local, sin desbordar', async () => {
    const { leerFecha } = await load('fechas.js');
    assert.deepEqual(ymd(leerFecha('2024-09-15')), [2024, 9, 15, 0, 0]);
    assert.deepEqual(ymd(leerFecha(' 2024-09-15T23:30:00Z ')), [2024, 9, 15, 0, 0], 'con hora: vale el día escrito');
    assert.deepEqual(ymd(leerFecha('2024-09-15 08:10')), [2024, 9, 15, 0, 0]);
    assert.deepEqual(ymd(leerFecha('15/09/2024')), [2024, 9, 15, 0, 0]);
    assert.deepEqual(ymd(leerFecha('5/9/2024')), [2024, 9, 5, 0, 0]);
    assert.deepEqual(ymd(leerFecha('29/02/2024')), [2024, 2, 29, 0, 0]);
    for (const bad of ['31/02/2024', '29/02/2023', '2024-13-01', '2024-02-30', '00/01/2024', '15-09-2024', '2024/09/15', '45555', 'hoy', '', '   ', '15/09/24']) {
        assert.equal(leerFecha(bad), null, `debería ser null: ${JSON.stringify(bad)}`);
    }
});

await test('F2 leerFecha: Date (se queda el día), número de serie de Excel y vacíos', async () => {
    const { leerFecha } = await load('fechas.js');
    assert.deepEqual(ymd(leerFecha(new Date(2024, 8, 15, 18, 45))), [2024, 9, 15, 0, 0]);
    assert.equal(leerFecha(new Date(NaN)), null);
    assert.deepEqual(ymd(leerFecha(45550)), [2024, 9, 15, 0, 0], 'serie Excel 45550 = 15/09/2024');
    assert.deepEqual(ymd(leerFecha(45550.75)), [2024, 9, 15, 0, 0], 'la parte decimal (hora) se ignora');
    assert.deepEqual(ymd(leerFecha(61)), [1900, 3, 1, 0, 0]);
    for (const bad of [60, 0, -3, NaN, Infinity, 2958466, null, undefined, true, {}, []]) {
        assert.equal(leerFecha(bad), null, `debería ser null: ${String(bad)}`);
    }
    const d = new Date(2024, 0, 1);
    leerFecha(d);
    assert.deepEqual(ymd(d), [2024, 1, 1, 0, 0], 'no modifica la fecha recibida');
    assert.notEqual(leerFecha(d), d, 'devuelve una fecha nueva');
});

await test('F3 fechaIso, fechaCorta y fechaLarga; vacío si no es una fecha', async () => {
    const { fechaIso, fechaCorta, fechaLarga } = await load('fechas.js');
    assert.equal(fechaIso('15/09/2024'), '2024-09-15');
    assert.equal(fechaIso(45550), '2024-09-15');
    assert.equal(fechaIso(new Date(2024, 0, 5)), '2024-01-05');
    assert.equal(fechaCorta('2024-01-05'), '05/01/2024');
    assert.equal(fechaCorta('5/1/2024'), '05/01/2024');
    assert.equal(fechaLarga('2024-09-05'), '5 de septiembre de 2024');
    assert.equal(fechaLarga('01/01/2025'), '1 de enero de 2025');
    assert.equal(fechaLarga('31/12/2025'), '31 de diciembre de 2025');
    for (const fn of [fechaIso, fechaCorta, fechaLarga]) {
        for (const bad of ['31/02/2024', 'hoy', '', null, undefined, new Date(NaN)]) {
            assert.equal(fn(bad), '', `${fn.name}(${String(bad)}) debería ser ''`);
        }
    }
});

console.log(`nexus_modulos_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
