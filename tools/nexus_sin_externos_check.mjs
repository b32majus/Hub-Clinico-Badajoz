#!/usr/bin/env node
// #956 tramo 2 (ADR-009 R2 y R7; #715): parte estática, sin navegador (corre en CI).
// Inventario vendor/MANIFEST.json con huellas, CSP en las 19 páginas y ninguna
// página ni CSS que pida recursos de fuera. La carga real en navegador la
// comprueba tools/nexus_sin_externos_browser_check.mjs.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://cima.aemps.es; object-src 'none'; base-uri 'self'; form-action 'self'";
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const TEXT = /\.(css|js|md|txt|json)$|(^|\/)LICENSE$/;
function sha256(rel) {
    let bytes = readFileSync(path.join(ROOT, rel));
    if (TEXT.test(rel)) bytes = Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    return createHash('sha256').update(bytes).digest('hex');
}
function walk(dir) {
    return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
}

let passed = 0;
const failures = [];
async function test(name, fn) {
    try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.log(`FAIL ${name} — ${error.message}`); }
}

await test('E1 inventario vendor/MANIFEST.json completo y con huellas correctas', async () => {
    assert.ok(existsSync(path.join(ROOT, 'vendor/MANIFEST.json')), 'falta vendor/MANIFEST.json');
    const manifest = JSON.parse(read('vendor/MANIFEST.json'));
    const listed = new Set();
    const problems = [];
    for (const lib of manifest.bibliotecas) {
        for (const key of ['id', 'nombre', 'version', 'origen', 'licencia']) if (!lib[key]) problems.push(`${lib.id}: falta ${key}`);
        if (!lib.ficheros.some((f) => /LICENSE/.test(f.ruta))) problems.push(`${lib.id}: sin fichero de licencia`);
        for (const f of lib.ficheros) {
            listed.add(f.ruta);
            if (!existsSync(path.join(ROOT, f.ruta))) problems.push(`${f.ruta}: no existe`);
            else if (sha256(f.ruta) !== f.sha256) problems.push(`${f.ruta}: huella distinta`);
        }
    }
    for (const id of ['fontawesome', 'chartjs', 'inter', 'sheetjs']) {
        if (!manifest.bibliotecas.some((l) => l.id === id)) problems.push(`falta la biblioteca ${id}`);
    }
    for (const rel of walk('vendor')) {
        if (rel !== 'vendor/MANIFEST.json' && rel !== 'vendor/README.md' && !listed.has(rel)) problems.push(`${rel}: no está en el inventario`);
    }
    assert.deepEqual(problems, []);
});

await test('E2 las 19 páginas llevan la CSP justo después de <meta charset>', async () => {
    assert.equal(pages.length, 19, `hay ${pages.length} páginas`);
    const bad = pages.filter((p) => {
        const html = read(p);
        const charset = html.search(/<meta charset="utf-8">/i);
        const after = html.slice(charset).replace(/^<meta charset="utf-8">\s*/i, '');
        return charset < 0 || !after.startsWith(CSP_META) || html.split('Content-Security-Policy').length !== 2;
    });
    assert.deepEqual(bad, []);
});

await test('E3 ninguna página ni CSS pide recursos de fuera', async () => {
    const bad = [];
    for (const p of pages) {
        for (const tag of read(p).match(/<(script|link)\b[^>]*>/g) || []) {
            if (/\b(src|href)="(https?:)?\/\//.test(tag)) bad.push(`${p}: ${tag.slice(0, 90)}`);
        }
    }
    const cssFiles = [...readdirSync(ROOT).filter((f) => f.endsWith('.css')), ...walk('css'), ...walk('vendor')].filter((f) => f.endsWith('.css'));
    for (const c of cssFiles) {
        if (/(@import|url\()\s*['"]?(https?:)?\/\//.test(read(c))) bad.push(`${c}: url externa`);
    }
    assert.deepEqual(bad, []);
});


console.log(`nexus_sin_externos_check: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
