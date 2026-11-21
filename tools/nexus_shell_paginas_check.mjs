#!/usr/bin/env node
// #956 tramo 5, colocación: las 17 páginas de Reuma y Farmacia usan <nx-shell>
// en lugar de la barra vieja (<aside class="sidebar">). La Home (index.html y
// nexus_home.html) NO lleva barra (decisión de Sil, 21-11).
// Parte sin navegador (corre en CI). El aspecto lo comprueban las capturas y
// tools/nexus_shell_paginas_browser_check.mjs.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const REUMA = ['reuma_index', 'primera_visita', 'seguimiento', 'estadisticas', 'manage_professionals', 'dashboard_paciente', 'dashboard_search'];
const FARMACIA = ['farmacia_index', 'farmacia_validacion', 'farmacia_primera_visita', 'farmacia_seguimiento', 'farmacia_dashboard_paciente',
    'farmacia_dashboard_longitudinal', 'farmacia_actividad_servicio', 'farmacia_estadisticas', 'farmacia_farmacos', 'farmacia_profesionales'];
const PAGINAS = [...REUMA.map((p) => [p, 'reuma']), ...FARMACIA.map((p) => [p, 'farmacia'])];
const IDS_COMUNES = ['currentProfessional', 'patientSearch', 'clearPatientSearch', 'dbStatusIndicator', 'dbStatusIcon', 'dbStatusLabel', 'dbStatusTime'];
const IDS_FARMACIA = ['catalogSidebarStatus', 'catalogSidebarNote', 'sidebarLoadCatalog', 'sidebarFileCatalog'];
// Restos de la barra vieja que ya no pueden quedar en ninguna página.
const VIEJO = [/<aside\b[^>]*class="[^"]*\bsidebar\b/, /class="[^"]*\bhub-shell\b/, /\bsidebar-footer\b/, /class="[^"]*\bnav-link\b/, /\bid="logoutBtn"/];

let passed = 0;
const failures = [];
function test(name, fn) {
    try { fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}
const vacio = (l, nota = '') => assert.ok(l.length === 0, `${l.length} fallos: ${l.slice(0, 4).join(' | ')}${l.length > 4 ? ' …' : ''} ${nota}`);
const html = (p) => read(`${p}.html`);
const shellDe = (src) => {
    const m = src.match(/<nx-shell\b[^>]*>[\s\S]*?<\/nx-shell>/);
    return m ? m[0] : '';
};

test('P1 las 17 páginas tienen un solo <nx-shell> con modulo, raiz vacía y pagina', () => {
    const malas = [];
    for (const [p, modulo] of PAGINAS) {
        const src = html(p);
        const abiertas = src.match(/<nx-shell\b[^>]*>/g) || [];
        if (abiertas.length !== 1) { malas.push(`${p}: ${abiertas.length} <nx-shell>`); continue; }
        const a = abiertas[0];
        if (!a.includes(`modulo="${modulo}"`)) malas.push(`${p}: modulo≠${modulo}`);
        if (!a.includes(`pagina="${p}.html"`)) malas.push(`${p}: pagina≠${p}.html`);
        if (/\braiz=/.test(a) && !/\braiz=""/.test(a)) malas.push(`${p}: raiz no vacía`);
    }
    vacio(malas);
});

test('P2 ninguna página conserva restos de la barra vieja (.sidebar, .hub-shell, .nav-link, #logoutBtn)', () => {
    const malas = [];
    for (const [p] of PAGINAS) for (const re of VIEJO) if (re.test(html(p))) malas.push(`${p}: ${re}`);
    vacio(malas);
});

test('P3 marco nuevo: .nx-marco con <nx-shell> y <main class="main-content nx-marco__contenido">', () => {
    const malas = [];
    for (const [p] of PAGINAS) {
        const src = html(p);
        if (!/<div\b[^>]*class="[^"]*\bnx-marco\b/.test(src)) malas.push(`${p}: sin .nx-marco`);
        const main = src.match(/<main\b[^>]*>/);
        if (!main || !/\bmain-content\b/.test(main[0]) || !/\bnx-marco__contenido\b/.test(main[0])) malas.push(`${p}: <main> sin main-content + nx-marco__contenido`);
        if (/<body\b[^>]*class="[^"]*\bnx-pagina\b/.test(src)) malas.push(`${p}: <body> con nx-pagina (cambiaría box-sizing y tipografía de la pantalla antigua)`);
    }
    vacio(malas, 'main.main-content lo leen 9 scripts de Farmacia y 4 checks: se conserva');
});

test('P4 cada página carga nexus_piezas.css y el módulo nx-shell', () => {
    const malas = [];
    for (const [p] of PAGINAS) {
        const src = html(p);
        if (!/href="css\/nexus_piezas\.css/.test(src)) malas.push(`${p}: sin nexus_piezas.css`);
        // La barra no espera al resto de scripts (Sil, 21-11: «tenía retraso al cargar»):
        // descarga adelantada en <head> y módulo async justo tras </nx-shell>.
        const cabeza = src.split('</head>')[0];
        if (!cabeza.includes('<link rel="modulepreload" href="modules/nexus/piezas/nx-shell.js">')) malas.push(`${p}: sin modulepreload en <head>`);
        if (!/<\/nx-shell>\s*<script type="module" async src="modules\/nexus\/piezas\/nx-shell\.js"><\/script>/.test(src)) malas.push(`${p}: el módulo nx-shell no va async tras </nx-shell>`);
        if ((src.match(/<script[^>]*nx-shell\.js/g) || []).length !== 1) malas.push(`${p}: nx-shell.js cargado más de una vez`);
    }
    vacio(malas);
});

test('P5 los ids que usa el código siguen dentro de <nx-shell>', () => {
    const malas = [];
    for (const [p, modulo] of PAGINAS) {
        const dentro = shellDe(html(p));
        const ids = modulo === 'farmacia' ? [...IDS_COMUNES, ...IDS_FARMACIA] : IDS_COMUNES;
        for (const id of ids) if (!dentro.includes(`id="${id}"`)) malas.push(`${p}: falta #${id}`);
        const todo = html(p);
        for (const id of ids) if ((todo.match(new RegExp(`id="${id}"`, 'g')) || []).length !== 1) malas.push(`${p}: #${id} repetido o ausente`);
    }
    vacio(malas);
});

test('P6 la Home no lleva barra', () => {
    for (const f of ['index.html', 'nexus_home.html']) assert.ok(!/<nx-shell\b/.test(read(f)), `${f} lleva <nx-shell>`);
});

test('P7 el código que leía la barra vieja ya apunta a la nueva', () => {
    const ledger = read('scripts/farmacia_evaluation_ledger.js');
    assert.ok(!ledger.includes('.sidebar-footer') && ledger.includes('.nx-shell__version'), 'app_context debe salir de .nx-shell__version');
    const seg = read('scripts/farmacia_seguimiento.js');
    assert.ok(!seg.includes('.sidebar-nav-area') && seg.includes('a.nx-shell__enlace[href*="farmacia_dashboard_paciente.html"]'), 'enlace al panel del paciente');
    const s = read('script.js');
    assert.ok(!/logoutBtn|initLogoutBtn/.test(s), 'script.js ya no gestiona #logoutBtn: «Terminar» lo hace nx-shell');
});

test('P8 el CSS viejo de la barra y del marco ya no existe', () => {
    const css = read('style.css');
    const malas = [];
    for (const re of [/(^|[\s,}])\.hub-shell\b/m, /(^|[\s,}])\.sidebar\b/m, /\.nav-link\b/, /\.sidebar-footer\b/, /\.logout-btn\b/]) if (re.test(css)) malas.push(String(re));
    vacio(malas);
    if (existsSync(path.join(ROOT, 'style_primera_visita.css'))) assert.ok(!read('style_primera_visita.css').includes('.hub-shell'), 'style_primera_visita.css usa .hub-shell');
});

console.log(`\n${passed} pasan, ${failures.length} fallan`);
if (failures.length) process.exit(1);
