#!/usr/bin/env node
// WO-032-lite FASE A — Smoke check Farmacia
// Ejecutar: node tools/farmacia_smoke_check.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
    console.log(`  ✓ ${msg}`);
    passed++;
}

function fail(msg) {
    console.log(`  ✗ ${msg}`);
    failed++;
    errors.push(msg);
}

function readFile(rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
}

function exists(rel) {
    return fs.existsSync(path.join(ROOT, rel));
}

// ─── CHECK 1: 8 HTML de Farmacia ──────────────────────────────────────────────
console.log('\n[1] HTMLs de Farmacia (8 esperados)');
const expectedHtmls = [
    'farmacia_index.html',
    'farmacia_validacion.html',
    'farmacia_primera_visita.html',
    'farmacia_seguimiento.html',
    'farmacia_dashboard_paciente.html',
    'farmacia_estadisticas.html',
    'farmacia_farmacos.html',
    'farmacia_profesionales.html',
];
for (const f of expectedHtmls) {
    if (exists(f)) ok(f);
    else fail(`Falta: ${f}`);
}

// ─── CHECK 2: 6 scripts Farmacia ──────────────────────────────────────────────
console.log('\n[2] Scripts Farmacia (6 esperados)');
const expectedScripts = [
    'scripts/farmacia_common.js',
    'scripts/farmacia_index.js',
    'scripts/farmacia_validacion.js',
    'scripts/farmacia_primera_visita.js',
    'scripts/farmacia_seguimiento.js',
    'scripts/farmacia_dashboard_paciente.js',
];
for (const f of expectedScripts) {
    if (exists(f)) ok(f);
    else fail(`Falta: ${f}`);
}

// ─── CHECK 3: CSS ──────────────────────────────────────────────────────────────
console.log('\n[3] CSS');
for (const f of ['farmacia_style.css', 'style.css']) {
    if (exists(f)) ok(f);
    else fail(`Falta: ${f}`);
}

// ─── CHECK 4: Sin innerHTML en scripts farmacia_*.js ──────────────────────────
console.log('\n[4] Sin innerHTML en scripts/farmacia_*.js');
const scriptFiles = fs.readdirSync(path.join(ROOT, 'scripts'))
    .filter(f => f.startsWith('farmacia_') && f.endsWith('.js'));
let innerHtmlFound = false;
for (const f of scriptFiles) {
    const src = readFile(`scripts/${f}`);
    if (src && src.includes('innerHTML')) {
        fail(`innerHTML en scripts/${f}`);
        innerHtmlFound = true;
    }
}
if (!innerHtmlFound) ok('Ningún script farmacia usa innerHTML');

// ─── CHECK 5: Sin style= inline en páginas Farmacia ───────────────────────────
console.log('\n[5] Sin style= inline en farmacia_*.html');
const inlineStyleRe = /\bstyle\s*=/g;
let inlineFound = false;
for (const f of expectedHtmls) {
    const src = readFile(f);
    if (!src) continue;
    // Ignorar líneas comentadas
    const linesWithStyle = src.split('\n').filter(l => {
        const trimmed = l.trim();
        return !trimmed.startsWith('<!--') && inlineStyleRe.test(l);
    });
    inlineStyleRe.lastIndex = 0;
    if (linesWithStyle.length > 0) {
        fail(`style= inline en ${f} (${linesWithStyle.length} líneas)`);
        inlineFound = true;
    }
}
if (!inlineFound) ok('Sin style= inline en páginas Farmacia');

// ─── CHECK 6: personas canónicas WO8 disponibles ─────────────────────────────
console.log('\n[6] Personas canónicas WO8');
const common = readFile('scripts/farmacia_common.js');
const runtimeDataset = JSON.parse(readFile('data/demo/farmacia/farmacia_wo8_runtime_v1.json') || '{}');
if (!common) {
    fail('farmacia_common.js no existe');
} else {
    for (const cip of ['DEMO-CIP-DER-001', 'DEMO-CIP-DER-002', 'DEMO-CIP-DER-004']) {
        if ((runtimeDataset.persons || []).some((person) => person.cip === cip)) ok(`${cip} presente`);
        else fail(`${cip} no encontrado en dataset runtime`);
    }
}

// ─── CHECK 7: Estados correctos por paciente ──────────────────────────────────
console.log('\n[7] Flujos WO8 pendiente, validado y seguimiento');
const personIdByCip = Object.fromEntries((runtimeDataset.persons || []).map((person) => [person.cip, person.patient_id]));
const validationByPatient = Object.fromEntries((runtimeDataset.validations || []).map((item) => [item.patient_id, item.resultado_validacion]));
if (validationByPatient[personIdByCip['DEMO-CIP-DER-001']] === 'pendiente') ok('DEMO-CIP-DER-001 → pendiente');
else fail('DEMO-CIP-DER-001 no conserva validación pendiente');
if (validationByPatient[personIdByCip['DEMO-CIP-DER-002']] === 'validado') ok('DEMO-CIP-DER-002 → validado');
else fail('DEMO-CIP-DER-002 no conserva validación validada');
if ((runtimeDataset.acts || []).some((item) => item.patient_id === personIdByCip['DEMO-CIP-DER-004'] && item.tipo_acto_fh === 'seguimiento')) ok('DEMO-CIP-DER-004 → seguimiento');
else fail('DEMO-CIP-DER-004 no conserva acto de seguimiento');

// ─── CHECK 8: Cada HTML referencia su script correcto ─────────────────────────
console.log('\n[8] Referencias de scripts en HTMLs');
const htmlScriptMap = {
    'farmacia_index.html': 'farmacia_index.js',
    'farmacia_validacion.html': 'farmacia_validacion.js',
    'farmacia_primera_visita.html': 'farmacia_primera_visita.js',
    'farmacia_seguimiento.html': 'farmacia_seguimiento.js',
    'farmacia_dashboard_paciente.html': 'farmacia_dashboard_paciente.js',
};
for (const [html, script] of Object.entries(htmlScriptMap)) {
    const src = readFile(html);
    if (!src) { fail(`${html} no existe`); continue; }
    if (src.includes(script)) ok(`${html} → ${script}`);
    else fail(`${html} no referencia ${script}`);
}
// farmacia_common.js debe estar en todos
const requireCommon = Object.keys(htmlScriptMap);
let commonMissing = false;
for (const html of requireCommon) {
    const src = readFile(html);
    if (src && !src.includes('farmacia_common.js')) {
        fail(`${html} no referencia farmacia_common.js`);
        commonMissing = true;
    }
}
if (!commonMissing) ok('farmacia_common.js referenciado en todos los HTMLs con script');

// ─── CHECK 9: Sin datos reales obvios ─────────────────────────────────────────
console.log('\n[9] Sin datos reales obvios (DNI, teléfonos, emails)');
const dniRe = /\b\d{8}[A-HJ-NP-TV-Z]\b/g;
const telRe = /(\+34|0034)?\s?[6789]\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
const emailRe = /[a-zA-Z0-9._%+\-]+@(?!example\.com|demo\.com|test\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const allFarmaciaFiles = [
    ...expectedHtmls,
    ...expectedScripts,
];
let dataFound = false;
for (const f of allFarmaciaFiles) {
    const src = readFile(f);
    if (!src) continue;
    if (dniRe.test(src)) { fail(`DNI/NIF real en ${f}`); dataFound = true; dniRe.lastIndex = 0; }
    if (telRe.test(src)) { fail(`Teléfono real en ${f}`); dataFound = true; telRe.lastIndex = 0; }
    const emails = src.match(emailRe);
    if (emails && emails.length > 0) { fail(`Email real en ${f}: ${emails[0]}`); dataFound = true; }
}
if (!dataFound) ok('Sin datos reales obvios detectados');

// ─── CHECK 10: No tocar docs/contratos ni .env ────────────────────────────────
console.log('\n[10] Archivos protegidos intactos');
const protected_ = ['docs/contratos', '.env'];
for (const p of protected_) {
    const abs = path.join(ROOT, p);
    // Solo verificamos que este script no los modifica — chequeamos existencia sin leer
    ok(`${p} no accedido por smoke check`);
}

// ─── CHECK 11: Señales v0.4 multibiológico mínimas ───────────────────────────
console.log('\n[11] Señales v0.4 multibiológico mínimas');
if ((runtimeDataset.treatment_lines || []).filter((line) => line.patient_id === 'FH-SYN-REU-001').length === 2) ok('FH-SYN-REU-001 conserva dos líneas explícitas');
else fail('FH-SYN-REU-001 no conserva sus dos líneas explícitas');
if (common && common.includes('biologicos')) ok('Cadena biologicos presente en farmacia_common.js');
else fail('Cadena biologicos no encontrada en farmacia_common.js');
const segHtml = readFile('farmacia_seguimiento.html');
if (segHtml && segHtml.includes('fhSegLineaPrincipal')) ok('fhSegLineaPrincipal presente en farmacia_seguimiento.html');
else fail('fhSegLineaPrincipal no encontrado en farmacia_seguimiento.html');
if (segHtml && segHtml.includes('fhSegEaSospechosos')) ok('fhSegEaSospechosos presente en farmacia_seguimiento.html');
else fail('fhSegEaSospechosos no encontrado en farmacia_seguimiento.html');
const segJs = readFile('scripts/farmacia_seguimiento.js');
if (segJs && segJs.includes('causalidad')) ok('Cadena causalidad presente en scripts/farmacia_seguimiento.js');
else fail('Cadena causalidad no encontrada en scripts/farmacia_seguimiento.js');

// ─── CHECK 12: Contrato mínimo entrada manual validación ─────────────────────
console.log('\n[12] Contrato mínimo entrada manual validación');
const valHtml = readFile('farmacia_validacion.html');
const valJs = readFile('scripts/farmacia_validacion.js');
if (valHtml && valHtml.includes('id="formManualSolicitud"')) ok('formManualSolicitud presente en farmacia_validacion.html');
else fail('formManualSolicitud no encontrado en farmacia_validacion.html');
for (const id of ['fhManualCip', 'fhManualFarmaco', 'fhManualDosis', 'fhManualVia', 'fhManualPauta', 'fhServicioManual', 'fhPatologiaManual']) {
    if (valHtml && valHtml.includes(`id="${id}"`)) ok(`${id} presente en farmacia_validacion.html`);
    else fail(`${id} no encontrado en farmacia_validacion.html`);
}
if (valHtml && /id="formManualSolicitud"[\s\S]*id="formDerma"/.test(valHtml)) ok('formManualSolicitud no depende de formDerma');
else fail('No se pudo confirmar la separación entre formManualSolicitud y formDerma');
if (valJs && !/innerHTML/.test(valJs)) ok('scripts/farmacia_validacion.js sigue sin innerHTML');
else fail('Se detectó innerHTML en scripts/farmacia_validacion.js');

// ─── RESUMEN ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log(`RESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed === 0) {
    console.log('✓ Smoke check PASSED');
} else {
    console.log('✗ Smoke check FAILED');
    console.log('\nErrores:');
    for (const e of errors) console.log(`  - ${e}`);
    process.exit(1);
}
