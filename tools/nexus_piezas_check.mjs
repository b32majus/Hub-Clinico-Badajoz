#!/usr/bin/env node
// #956 tramo 4 (ADR-010 §2 y §3; DESIGN.md §3-4): catálogo de piezas css/nexus_piezas.css
// y página de muestra muestra/nexus_piezas.html. Check estático (corre en CI):
// capas, nada de colores ni medidas a mano (solo var(--nx-*)), tres puntos de
// cambio, las piezas que usa modules/nexus/ tienen estilo, el catálogo está en
// DESIGN.md y ninguna de las 19 páginas carga todavía el catálogo.
// Tramo 5: <nx-shell> (menús que apuntan a páginas que existen, sin perder enlaces de las
// barras de hoy, iconos que existen, versión igual a la de la Home).
// La parte de navegador es tools/nexus_piezas_browser_check.mjs y tools/nexus_shell_browser_check.mjs.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAYERS = '@layer nx.tokens, nx.base, nx.piezas, modulo;';
const PIEZAS = 'css/nexus_piezas.css';
const MUESTRA = 'muestra/nexus_piezas.html';
const MUESTRA_CSS = 'muestra/muestra.css';
const MUESTRAS = [MUESTRA, 'muestra/nexus_shell_farmacia.html', 'muestra/nexus_shell_reuma.html'];
const FILES = [PIEZAS, ...MUESTRAS, MUESTRA_CSS, 'muestra/muestra.js', 'modules/nexus/piezas/nx-pestanas.js',
    'modules/nexus/piezas/nx-shell.js', 'modules/nexus/menus.js', 'modules/nexus/version.js'];
const PUNTOS = ['64em', '40em', '36em'];
const BLOQUES = ['nx-pagina', 'nx-solo-lector', 'nx-boton', 'nx-acciones', 'nx-campo', 'nx-casilla', 'nx-buscador',
    'nx-formulario', 'nx-tabla-marco', 'nx-tabla', 'nx-pestanas', 'nx-rejilla', 'nx-tarjeta', 'nx-datos', 'nx-etiqueta',
    'nx-aviso', 'nx-avisos', 'nx-dialogo', 'nx-vacio', 'nx-marco', 'nx-shell', 'nx-profesional', 'nx-cabecera',
    'nx-cifras', 'nx-cifra', 'nx-solicitudes', 'nx-solicitud'];
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

// Devuelve el texto de dentro del primer bloque «@layer <nombre> { … }».
function cuerpoCapa(css, nombre) {
    const i = css.indexOf(`@layer ${nombre} {`);
    if (i < 0) return null;
    let nivel = 0;
    for (let j = css.indexOf('{', i); j < css.length; j += 1) {
        if (css[j] === '{') nivel += 1;
        if (css[j] === '}') { nivel -= 1; if (nivel === 0) return { cuerpo: css.slice(css.indexOf('{', i) + 1, j), resto: css.slice(0, i) + css.slice(j + 1) }; }
    }
    return null;
}

// Valores escritos a mano en un CSS: colores, unidades de medida o tiempo fuera de las condiciones @media.
function valoresAMano(css) {
    const problemas = [];
    const sinMedia = css.replace(/@media\s*\(([^)]*)\)(\s*and\s*\([^)]*\))*/g, '@media');
    for (const m of sinMedia.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/g)) problemas.push(`color: ${m[0]}`);
    for (const m of sinMedia.matchAll(/(?<![\w-])-?\d*\.?\d+(px|rem|em|ch|vh|vw|vmin|vmax|dvh|svh|lvh|pt|cm|mm|in|ms|s)\b/g)) problemas.push(`medida: ${m[0]}`);
    for (const m of sinMedia.matchAll(/:\s*(white|black|red|green|blue|gray|grey|purple|orange|yellow|pink)\b/g)) problemas.push(`color con nombre: ${m[1]}`);
    return problemas;
}

await test('S1 existen el catálogo, la página de muestra y <nx-pestanas>', async () => {
    for (const f of FILES) assert.ok(existsSync(path.join(ROOT, f)), `falta ${f}`);
});

await test('S2 capas: el catálogo entero en nx.piezas y la muestra en modulo', async () => {
    for (const [f, capa] of [[PIEZAS, 'nx.piezas'], [MUESTRA_CSS, 'modulo']]) {
        const css = sinComentarios(read(f)).trim();
        assert.ok(css.startsWith(LAYERS), `${f} no empieza por el orden de capas`);
        const capaCss = cuerpoCapa(css, capa);
        assert.ok(capaCss, `${f} no tiene @layer ${capa}`);
        assert.equal(capaCss.resto.replace(LAYERS, '').trim(), '', `${f}: hay reglas fuera de @layer ${capa}`);
    }
});

await test('S3 nada de colores ni medidas a mano: solo var(--nx-*)', async () => {
    const problemas = [];
    for (const f of [PIEZAS, MUESTRA_CSS]) for (const p of valoresAMano(sinComentarios(read(f)))) problemas.push(`${f}: ${p}`);
    assert.deepEqual(problemas, []);
});

await test('S4 toda variable que se usa existe en css/nexus_tokens.css (o la define la propia pieza)', async () => {
    const tokens = new Set([...read('css/nexus_tokens.css').matchAll(/(--nx-[\w-]+)\s*:/g)].map((m) => m[1]));
    const faltan = [];
    for (const f of [PIEZAS, MUESTRA_CSS]) {
        const css = sinComentarios(read(f));
        const locales = new Set([...css.matchAll(/(--nx-[\w-]+)\s*:/g)].map((m) => m[1]));
        for (const m of css.matchAll(/var\((--[\w-]+)\s*(,[^)]*)?\)/g)) {
            if (m[2]) faltan.push(`${f}: var() con valor de reserva: ${m[0]}`);
            if (!tokens.has(m[1]) && !locales.has(m[1])) faltan.push(`${f}: ${m[1]}`);
        }
        for (const v of locales) if (!/^--nx-(aviso|shell)-/.test(v)) faltan.push(`${f}: define ${v} fuera de los tokens`);
    }
    assert.deepEqual([...new Set(faltan)], []);
});

await test('S5 solo los tres puntos de cambio (64em, 40em, 36em) y de escritorio a menos (max-width)', async () => {
    const malos = [];
    for (const f of [PIEZAS, MUESTRA_CSS]) {
        for (const m of sinComentarios(read(f)).matchAll(/@media\s*([^{]+)\{/g)) {
            const cond = m[1].trim();
            const ok = PUNTOS.some((p) => cond === `(max-width: ${p})`);
            if (!ok) malos.push(`${f}: @media ${cond}`);
        }
    }
    assert.deepEqual(malos, []);
});

await test('S6 las clases que crea modules/nexus/ tienen estilo en el catálogo', async () => {
    const css = sinComentarios(read(PIEZAS));
    const js = ['modules/nexus/avisos.js', 'modules/nexus/piezas/nx-aviso.js', 'modules/nexus/piezas/nx-shell.js'].map(read).join('\n');
    const clases = new Set();
    for (const m of js.matchAll(/className\s*=\s*([^;]+);/g)) for (const c of m[1].match(/nx-[\w-]+/g) || []) clases.add(c);
    assert.ok(clases.size >= 8, `pocas clases encontradas: ${[...clases]}`);
    const sinEstilo = [...clases].filter((c) => !new RegExp(`\\.${c}(?![\\w-])`).test(css));
    assert.deepEqual(sinEstilo, []);
    for (const sel of ['nx-aviso {', 'nx-aviso[tipo="error"]', 'nx-aviso[tipo="aviso"]', 'nx-aviso[tipo="ok"]', '.nx-dialogo::backdrop', '.nx-pestanas__pestana[aria-selected="true"]',
        'nx-shell {', 'nx-shell[modulo="farmacia"]', 'nx-shell[modulo="reuma"]', '.nx-shell__enlace[aria-current="page"]', '.nx-shell__icono']) {
        assert.ok(css.includes(sel), `falta ${sel}`);
    }
});

await test('S7 cada bloque del catálogo está en DESIGN.md §4 y no hay bloques sin documentar', async () => {
    const css = sinComentarios(read(PIEZAS));
    const enCss = new Set([...css.matchAll(/(?:\.|^\s*|[\s,(])(nx-[a-z]+(?:-[a-z]+)*)(?=[\s.{:[,)>]|__|--)/gm)].map((m) => m[1].split('__')[0].split('--')[0]));
    for (const m of css.matchAll(/@keyframes\s+(nx-[\w-]+)/g)) enCss.delete(m[1]);
    const design = read('DESIGN.md');
    const s4 = design.slice(design.indexOf('## 4.'), design.indexOf('## 5.'));
    assert.deepEqual([...enCss].filter((b) => !BLOQUES.includes(b)).sort(), [], 'bloques del CSS que no están en la lista del check');
    assert.deepEqual(BLOQUES.filter((b) => !enCss.has(b)), [], 'bloques de la lista sin CSS');
    assert.deepEqual(BLOQUES.filter((b) => !new RegExp(`(?<![\\w-])${b}(?![a-z]|-[a-z])`).test(s4)), [], 'bloques sin documentar en DESIGN.md §4');
    for (const p of PUNTOS) assert.ok(design.includes(p), `DESIGN.md no menciona el punto de cambio ${p}`);
});

await test('S8 páginas de muestra: CSP sin unsafe-inline, rutas relativas, sin estilos ni scripts en línea', async () => {
  for (const muestra of MUESTRAS) {
    const html = read(muestra);
    const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
    assert.ok(csp.includes("default-src 'self'") && !csp.includes('unsafe-inline'), `CSP: ${csp}`);
    assert.ok(/<meta charset="UTF-8">\s*<meta http-equiv="Content-Security-Policy"/.test(html), 'la CSP va justo después de charset');
    assert.ok(!/\sstyle\s*=/.test(html), 'atributo style');
    assert.ok(!/<style[\s>]/.test(html), '<style> en la página');
    assert.ok(![...html.matchAll(/<script\b([^>]*)>/g)].some((m) => !/\ssrc=/.test(m[1])), 'script en línea');
    assert.ok(!/\son[a-z]+\s*=/.test(html), 'manejador de eventos en línea');
    const urls = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('#'));
    assert.deepEqual(urls.filter((u) => /^(\/|[a-z]+:)/i.test(u)), [], 'rutas no relativas');
    for (const css of ['../css/nexus_tokens.css', '../css/nexus_base.css', '../css/nexus_piezas.css', 'muestra.css']) {
        assert.ok(html.includes(`href="${css}"`), `no carga ${css}`);
    }
    assert.ok(/\bCIP\b|\bNHC\b/.test(html) === false, `identificadores clínicos en ${muestra}`);
  }
});

await test('S9 el catálogo lo cargan las 17 páginas con barra; la Home (index.html y nexus_home.html) no', async () => {
    const paginas = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
    assert.equal(paginas.length, 19);
    const conCatalogo = paginas.filter((p) => read(p).includes('nexus_piezas.css'));
    assert.equal(conCatalogo.length, 17);
    assert.deepEqual(paginas.filter((p) => !conCatalogo.includes(p)).sort(), ['index.html', 'nexus_home.html']);
});

await test('S10 axe-core fijado a una versión exacta solo para checks (devDependencies)', async () => {
    const pkg = JSON.parse(read('package.json'));
    assert.match(String((pkg.devDependencies || {})['axe-core']), /^\d+\.\d+\.\d+$/);
    assert.equal((pkg.dependencies || {})['axe-core'], undefined);
});

await test('S11 <nx-shell>: los menús apuntan a páginas que existen, con iconos que existen, y no se pierde ningún enlace de las barras de hoy', async () => {
    const { MENUS } = await import(path.join(ROOT, 'modules/nexus/menus.js'));
    const fa = read('vendor/fontawesome/css/all.min.css');
    const paginas = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
    const enMenus = new Set();
    for (const [clave, m] of Object.entries(MENUS)) {
        assert.ok(fa.includes(`.${m.icono}:before`), `${clave}: icono ${m.icono}`);
        for (const s of m.secciones) for (const e of s.enlaces) {
            assert.ok(paginas.includes(e.href), `${clave}: ${e.href} no existe`);
            assert.ok(fa.includes(`.${e.icono}:before`), `${clave}: icono ${e.icono}`);
            assert.ok(!enMenus.has(e.href), `${e.href} repetido`);
            enMenus.add(e.href);
        }
    }
    const manifiesto = JSON.parse(read('data/platform/home/deployment-manifest.json'));
    const entradas = new Set(manifiesto.modules.map((m) => m.entryPath));
    for (const m of manifiesto.modules) assert.ok(MENUS[m.moduleId], `módulo ${m.moduleId} del perfil sin menú`);
    // Enlaces que tenían las barras viejas (inventario del 21-11, antes de colocar <nx-shell>): ninguno puede perderse.
    const hoy = ['reuma_index.html', 'primera_visita.html', 'seguimiento.html', 'estadisticas.html', 'manage_professionals.html',
        'farmacia_index.html', 'farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html',
        'farmacia_dashboard_paciente.html', 'farmacia_actividad_servicio.html', 'farmacia_estadisticas.html',
        'farmacia_farmacos.html', 'farmacia_profesionales.html'];
    assert.deepEqual(hoy.filter((h) => !enMenus.has(h) && !entradas.has(h)).sort(), [], 'enlaces de las barras viejas que la nueva no tiene');
});

await test('S12 la versión que enseña <nx-shell> es la misma que la de la Home (module-readiness.json)', async () => {
    const { VERSION_SITIO } = await import(path.join(ROOT, 'modules/nexus/version.js'));
    const releases = new Set(JSON.parse(read('data/platform/home/module-readiness.json')).modules.map((m) => m.release));
    assert.deepEqual([...releases], [VERSION_SITIO]);
});

// Pantallas ya migradas al catálogo (tramo 7, pantalla a pantalla). Al migrar otra, añadirla aquí.
const MIGRADAS = ['farmacia_profesionales.html', 'farmacia_farmacos.html', 'farmacia_actividad_servicio.html', 'dashboard_search.html', 'manage_professionals.html', 'farmacia_index.html', 'farmacia_dashboard_longitudinal.html', 'farmacia_dashboard_paciente.html', 'farmacia_estadisticas.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html', 'farmacia_validacion.html', 'dashboard_paciente.html', 'estadisticas.html', 'primera_visita.html', 'seguimiento.html'];
const CLASES_VIEJAS = ['demo-banner', 'patient-header-card', 'module-hero', 'patient-avatar', 'hero-eyebrow', 'hero-description',
    'patient-status-badge', 'dashboard-card', 'card-title', 'section-title', 'data-table', 'status-badge', 'info-grid', 'info-field'];

await test('S13 pantallas migradas: body nx-pagina, cabecera nx-cabecera con un h1, aviso de demo con nx-aviso, tablas del catálogo y sin clases viejas', async () => {
    for (const p of MIGRADAS) {
        const html = read(p);
        assert.match(html, /<body class="nx-pagina">/, `${p}: el body no lleva nx-pagina`);
        assert.equal((html.match(/<h1\b/g) || []).length, 1, `${p}: debe haber un solo h1`);
        assert.match(html, /<header class="nx-cabecera"[^>]*>[\s\S]*?<h1 class="nx-cabecera__titulo"[^>]*>/, `${p}: sin nx-cabecera con su h1`);
        if (p.startsWith('farmacia_')) assert.match(html, /<nx-aviso tipo="aviso" role="note"/, `${p}: el aviso de demo no es <nx-aviso role="note">`);
        const tablas = (html.match(/<table\b[^>]*>/g) || []);
        assert.ok(tablas.every((t) => /\bclass="nx-tabla"/.test(t)), `${p}: tabla sin nx-tabla`);
        assert.ok(!/<th>/.test(html), `${p}: <th> sin scope`);
        const viejas = CLASES_VIEJAS.filter((c) => new RegExp(`class="[^"]*(?<![\\w-])${c}(?![\\w-])`).test(html));
        assert.deepEqual(viejas, [], `${p}: clases viejas`);
        // display:none inicial es estado que abre y cierra el JS, no diseño: se tolera (tramo 7, formularios de Reuma).
        const estilos = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]).filter((s) => !/^\s*display\s*:\s*none\s*;?\s*$/.test(s));
        assert.deepEqual(estilos, [], `${p}: estilos en línea`);
    }
});

console.log(`\n${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
