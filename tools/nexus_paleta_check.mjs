#!/usr/bin/env node
// #956 tramo 6 (DESIGN.md §1, «Aplicar la paleta»): las hojas antiguas de Reuma y
// Farmacia ya no escriben colores a mano; todo sale de var(--nx-*). Check estático.
// Fuera de alcance (tramo 7): colores que pone el JS (gráficos, escalas clínicas, chips EA).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOJAS = ['style.css', 'farmacia_style.css', 'style_primera_visita.css', 'style_seguimiento.css',
    'style_dashboard.css', 'style_estadisticas.css', 'style_manage.css'];
const HTML_CON_STYLE = ['farmacia_primera_visita.html', 'farmacia_seguimiento.html'];
const NOMBRES = 'white|black|red|green|blue|gray|grey|orange|yellow|purple|teal|navy|silver|gold|pink';
const LITERAL = new RegExp(`#[0-9a-f]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|(?<![-\\w])(?:${NOMBRES})(?![-\\w])`, 'i');

const results = [];
function record(name, ok, detail = '') {
    results.push(ok);
    console.log(`  [${ok ? 'OK' : 'FAIL'}] ${name}${ok || !detail ? '' : ' -> ' + detail}`);
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
function vacio(lista) {
    return lista.length ? `${lista.slice(0, 4).join(' | ')}${lista.length > 4 ? ` (+${lista.length - 4} más)` : ''}` : '';
}

const fuentes = [
    ...HOJAS.map((f) => [f, read(f)]),
    ...HTML_CON_STYLE.map((f) => [f, [...read(f).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')]),
];

// P1 ningún color escrito a mano en los valores (comentarios y url() aparte)
const literales = [];
for (const [f, css] of fuentes) {
    for (const m of sinComentarios(css).matchAll(/([-\w]+)\s*:\s*([^;{}]*)/g)) {
        const valor = m[2].replace(/url\([^)]*\)/g, '');
        if (LITERAL.test(valor)) literales.push(`${f}: ${m[1]}: ${valor.trim().slice(0, 60)}`);
    }
}
record('P1 las hojas antiguas no escriben colores a mano', literales.length === 0, vacio(literales));

// P2 toda variable --nx-* que usan existe en css/nexus_tokens.css
const tokens = read('css/nexus_tokens.css');
const definidas = new Set([...tokens.matchAll(/(--nx-[\w-]+)\s*:/g)].map((m) => m[1]));
const faltan = new Set();
for (const [f, css] of fuentes) {
    for (const m of css.matchAll(/var\((--nx-[\w-]+)/g)) if (!definidas.has(m[1])) faltan.add(`${f}: ${m[1]}`);
}
record('P2 las variables --nx-* usadas existen en los tokens', faltan.size === 0, vacio([...faltan]));

// P3 el acento del módulo sale del <nx-shell modulo> de la página
const modulos = ['farmacia', 'reuma', 'derma'].filter((m) => !new RegExp(`:root:has\\(nx-shell\\[modulo="${m}"\\]\\)\\s*\\{[^}]*--nx-color-modulo:\\s*var\\(--nx-color-${m}\\)`).test(tokens));
record('P3 --nx-color-modulo cambia con <nx-shell modulo> (farmacia, reuma, derma)',
    modulos.length === 0 && ['--nx-color-modulo', '--nx-color-modulo-texto', '--nx-color-modulo-suave', '--nx-color-modulo-borde'].every((v) => definidas.has(v)),
    modulos.join(', '));

// P4 las variables viejas del verde apuntan al acento del módulo
const style = sinComentarios(read('style.css'));
const viejas = { '--primary-blue': 'modulo', '--ses-green': 'modulo', '--ses-green-dark': 'modulo-texto', '--ses-green-light': 'modulo-suave' };
const malas = Object.entries(viejas).filter(([v, t]) => !new RegExp(`${v}\\s*:\\s*var\\(--nx-color-${t}\\)`).test(style)).map(([v]) => v);
record('P4 --primary-blue y --ses-green* apuntan a --nx-color-modulo*', malas.length === 0, malas.join(', '));

// P5 botones principales en morado: ningún .btn-primary / .primary-btn usa el acento del módulo de fondo
const botones = [];
for (const [f, css] of fuentes) {
    for (const m of sinComentarios(css).matchAll(/([^{}]*(?:btn-primary|primary-btn|btn--primary)[^{}]*)\{([^}]*)\}/g)) {
        if (/background[^;]*--nx-color-modulo\b/.test(m[2])) botones.push(`${f}: ${m[1].trim().slice(-50)}`);
    }
}
record('P5 los botones principales no usan el acento del módulo (DESIGN.md §1)', botones.length === 0, vacio(botones));

// P6: el mapa de articulaciones (SVG de Primera visita y Seguimiento) usa tokens, no hex en fill/stroke (tramo 7).
const svgHex = [];
for (const f of ['primera_visita.html', 'seguimiento.html']) {
    for (const m of read(f).replace(/<!--[\s\S]*?-->/g, '').matchAll(/\b(?:fill|stroke)="(#[0-9a-f]{3,8})"/gi)) svgHex.push(`${f}: ${m[0]}`);
}
record('P6 el SVG del mapa de articulaciones no lleva colores sueltos', svgHex.length === 0, vacio(svgHex));

const failed = results.filter((ok) => !ok).length;
console.log(`\nRESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
process.exit(failed ? 1 : 0);
