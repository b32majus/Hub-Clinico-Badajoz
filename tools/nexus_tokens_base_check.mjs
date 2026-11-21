#!/usr/bin/env node
// #956 tramo 1 (ADR-010 §2): variables comunes --nx-* y base común cargadas
// por las 19 páginas de la raíz, sin cambiar el aspecto. Check estático.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = '20261121-t6'; // tramo 6: tokens nuevos (paleta aplicada)
const TOKENS = 'css/nexus_tokens.css';
const BASE = 'css/nexus_base.css';
const LAYERS = '@layer nx.tokens, nx.base, nx.piezas, modulo;';
const CLINICAL_TOKEN_RE = /\bCIP\b|\bNHC\b|paciente|patient|workbook|cohorte|cohort\b|historia_cl|datos_clinicos|tratamiento|treatment/i;

const results = [];
function record(name, ok, detail = '') {
  results.push(ok);
  console.log(`  [${ok ? 'OK' : 'FAIL'}] ${name}${ok || !detail ? '' : ' -> ' + detail}`);
}
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : null);
function vars(css) {
  const out = {};
  for (const m of (css || '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

// C1 ficheros y orden de capas
const tokensCss = read(TOKENS);
const baseCss = read(BASE);
record('C1 existen css/nexus_tokens.css y css/nexus_base.css', !!tokensCss && !!baseCss);
record('C2 ambos declaran el orden de capas al principio',
  [tokensCss, baseCss].every((c) => c && c.replace(/\/\*[\s\S]*?\*\//g, '').trim().startsWith(LAYERS)));

// C3 valores exactos de la paleta aprobada (DESIGN.md §1)
const expected = {
  '--nx-color-principal': '#3c107c', '--nx-color-marca-verde': '#429a37',
  '--nx-color-farmacia': '#008777', '--nx-color-farmacia-texto': '#006b5e',
  '--nx-color-reuma': '#dc0182', '--nx-color-reuma-texto': '#b0016a',
  '--nx-color-derma': '#f04e37', '--nx-color-derma-texto': '#c2361f',
  '--nx-color-fondo': '#f6f7f9', '--nx-color-texto': '#1f2430',
  '--nx-color-superficie': '#ffffff', '--nx-color-superficie-suave': '#eef0f4',
  '--nx-color-texto-suave': '#5a6272', '--nx-color-tenue': '#8a93a5', '--nx-color-borde': '#d6dae2',
  '--nx-color-ok': '#1b7a3e', '--nx-color-aviso': '#8a5300', '--nx-color-error': '#a4262c', '--nx-color-info': '#1d5fa8',
};
const tv = vars(tokensCss);
const wrong = Object.entries(expected).filter(([k, v]) => tv[k] !== v).map(([k, v]) => `${k}=${tv[k]} (esperado ${v})`);
record('C3 paleta con sus valores exactos', wrong.length === 0, wrong.join('; '));
record('C4 en los ficheros comunes solo hay variables --nx-*',
  Object.keys(tv).length > 0 && Object.keys(tv).every((k) => k.startsWith('--nx-')) &&
  Object.keys(vars(baseCss)).length === 0);
record('C5 sin palabras clínicas en los ficheros comunes',
  !CLINICAL_TOKEN_RE.test(tokensCss || '') && !CLINICAL_TOKEN_RE.test(baseCss || ''));

// C6 las 19 páginas los enlazan, una vez, tras las bibliotecas de terceros y antes del primer CSS propio
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const bad = [];
for (const page of pages) {
  const html = read(page);
  const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => (m[0].match(/href="([^"]+)"/) || [])[1]);
  const iT = links.indexOf(`${TOKENS}?v=${V}`);
  const iB = links.indexOf(`${BASE}?v=${V}`);
  // Bibliotecas de terceros (CDN o vendor/, tramo 2) van antes; los CSS propios, después.
  const isThirdParty = (h) => /^https?:/.test(h) || h.startsWith('vendor/');
  const firstLocal = links.findIndex((h) => !isThirdParty(h) && !h.startsWith('css/nexus_'));
  const lastExternal = links.map(isThirdParty).lastIndexOf(true);
  const countT = links.filter((h) => h && h.includes('nexus_tokens.css')).length;
  const countB = links.filter((h) => h && h.includes('nexus_base.css')).length;
  if (!(iT >= 0 && iB === iT + 1 && countT === 1 && countB === 1 && iT > lastExternal && (firstLocal === -1 || iB < firstLocal))) {
    bad.push(`${page} [${links.join(', ')}]`);
  }
}
record(`C6 las ${pages.length} páginas enlazan tokens+base en su sitio`, pages.length === 19 && bad.length === 0, bad.join(' | '));

// C7 la Home: alias solo donde coinciden valor y papel; el resto intacto
const hv = vars(read('nexus_home.css'));
const alias = {
  '--nexus-home-surface': 'var(--nx-color-fondo)', '--nexus-home-ink': 'var(--nx-color-texto)',
  '--nexus-home-muted': 'var(--nx-color-texto-suave)', '--nexus-home-faint': 'var(--nx-color-tenue)',
  '--nexus-home-border': 'var(--nx-color-borde)', '--nexus-home-card': 'var(--nx-color-superficie)',
  '--nexus-home-card-muted': 'var(--nx-color-superficie-suave)', '--nexus-home-danger': 'var(--nx-color-error)',
  '--nexus-home-accent-magenta': '#b83280', '--nexus-home-accent-purple': '#6d4fc2',
  '--nexus-home-accent-cyan': '#0e8fa8', '--nexus-home-accent-green': '#1e9e6a', '--nexus-home-focus': '#0e8fa8',
};
const aliasBad = Object.entries(alias).filter(([k, v]) => hv[k] !== v).map(([k, v]) => `${k}=${hv[k]} (esperado ${v})`);
record('C7 nexus_home.css: alias correctos y acentos sin tocar', aliasBad.length === 0, aliasBad.join('; '));

// C8 la herramienta de release de la Home incluye los dos ficheros (lista ordenada)
const build = read('tools/home_release_build.mjs') || '';
const listMatch = build.match(/const CODE_FILES = \[([\s\S]*?)\];/);
const list = listMatch ? [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
record('C8 home_release_build incluye tokens y base y sigue ordenada',
  list.includes(TOKENS) && list.includes(BASE) && list.join('|') === [...list].sort().join('|'), list.join(', '));

const ok = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${ok} OK / ${results.length - ok} FALLIDO`);
process.exit(ok === results.length ? 0 : 1);
