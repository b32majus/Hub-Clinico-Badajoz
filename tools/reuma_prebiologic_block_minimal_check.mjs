#!/usr/bin/env node
'use strict';
/**
 * FROZEN acceptance oracle for WO-NEXUS-REUMA-PREBIO-MINIMAL-13
 * (GitHub issue #525, b32majus/Hub-Clinico-Badajoz).
 *
 * Cost policy: go / Risk class: complex.
 *
 * This file is the FROZEN acceptance oracle for #525. All expectations below
 * are literal values frozen from the accepted issue authority, NOT derived
 * from implementation internals. A later implementation session flips the
 * RED case(s) to GREEN without weakening any assertion here.
 *
 * Freeze-time baseline (2026-10-04, branch work/nexus-reuma-prebio-minimal-525-20261004):
 *   - A2 is RED BY DESIGN on BOTH surfaces: `Fecha diagnóstico`
 *     (`id="fechaDiagnostico"` + `Fecha diagnóstico` label) is still present
 *     inside the prebiologic block of primera_visita.html and seguimiento.html.
 *   - A1 / A3 / A4 / A5 / B1 / B2 are GREEN at freeze time.
 *
 * Scope: deterministic, static, dependency-free (plain Node; regex/string
 * parsing of the two HTML surfaces + modules/exportManager.js). Synthetic
 * data only (no patient data is read or written). Exit 0 = all PASS, 1 = FAIL.
 * Usage: node tools/reuma_prebiologic_block_minimal_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PV_FILE = path.join(ROOT, 'primera_visita.html');
const SEG_FILE = path.join(ROOT, 'seguimiento.html');
const EXPORT_FILE = path.join(ROOT, 'modules', 'exportManager.js');

const pv = fs.readFileSync(PV_FILE, 'utf8');
const seg = fs.readFileSync(SEG_FILE, 'utf8');
const exportSrc = fs.readFileSync(EXPORT_FILE, 'utf8');

const results = [];
function record(name, fn) {
    try {
        fn();
        results.push(true);
        console.log(`  [OK ] ${name}`);
    } catch (err) {
        results.push(false);
        console.log(`  [FAIL] ${name} -> ${err.message}`);
    }
}

function fail(msg) {
    throw new Error(msg);
}

// The prebiologic collapsible section: from its opening
// `<div class="collapsible-section">` up to (excluding) the next
// `<div class="collapsible-section">`. The extraction is purely positional
// and does not depend on implementation internals.
const SECTION_OPEN = '<div class="collapsible-section">';
function extractPrebioSection(file, label) {
    const headerIdx = file.indexOf('Estado prebiológico');
    if (headerIdx === -1) fail(`${label}: no se encontró la cabecera 'Estado prebiológico'`);
    const sectionStart = file.lastIndexOf(SECTION_OPEN, headerIdx);
    if (sectionStart === -1) fail(`${label}: la cabecera no está dentro de una collapsible-section`);
    const nextStart = file.indexOf(SECTION_OPEN, headerIdx);
    return file.slice(sectionStart, nextStart === -1 ? file.length : nextStart);
}

function countOccurrences(haystack, needle) {
    let count = 0;
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
        count++;
        idx = haystack.indexOf(needle, idx + needle.length);
    }
    return count;
}

const EXPECTED_BLOCK_OPTIONS = ['', 'NO_SOLICITADA', 'SOLICITADA_PENDIENTE', 'OK'];
const BLOCK_SELECT_IDS = ['estadoPrebiologicoAnalitica', 'estadoPrebiologicoMedicinaPreventiva'];

const SURFACES = [
    { label: 'primera_visita.html', src: pv },
    { label: 'seguimiento.html', src: seg }
];

for (const { label, src } of SURFACES) {
    // A1 — exactly one collapsible section whose header contains 'Estado prebiológico'.
    record(`A1 ${label}: una única sección colapsable 'Estado prebiológico'`, () => {
        if (countOccurrences(src, 'Estado prebiológico') !== 1) {
            fail(`se esperaba exactamente 1 mención de 'Estado prebiológico', hay ${countOccurrences(src, 'Estado prebiológico')}`);
        }
        const headerIdx = src.indexOf('Estado prebiológico');
        const sectionStart = src.lastIndexOf(SECTION_OPEN, headerIdx);
        if (sectionStart === -1) fail('la cabecera no está dentro de una collapsible-section');
        const headerTagIdx = src.indexOf('collapsible-header', sectionStart);
        if (headerTagIdx === -1 || headerTagIdx > headerIdx) {
            fail('la cabecera no usa un collapsible-header');
        }
    });

    // A2 — THE INTENT (RED at baseline): no fechaDiagnostico element and no
    // 'Fecha diagnóstico' copy inside the block, nor anywhere on the page.
    record(`A2 ${label}: sin 'Fecha diagnóstico' en el bloque ni en la página`, () => {
        const section = extractPrebioSection(src, label);
        if (section.includes('fechaDiagnostico')) {
            fail(`${label}: 'fechaDiagnostico' presente DENTRO del bloque prebiológico`);
        }
        if (/Fecha diagnóstico/i.test(section)) {
            fail(`${label}: copy 'Fecha diagnóstico' presente DENTRO del bloque prebiológico`);
        }
        if (src.includes('id="fechaDiagnostico"')) {
            fail(`${label}: id="fechaDiagnostico" presente EN LA PÁGINA`);
        }
    });

    // A3 — exactly the two block selects, each with exactly the three states + empty.
    record(`A3 ${label}: Analítica + Medicina Preventiva con exactamente los 3 estados`, () => {
        const section = extractPrebioSection(src, label);
        const selectTags = section.match(/<select\b[^>]*>/g) || [];
        if (selectTags.length !== 2) fail(`la sección debe tener exactamente 2 <select>, hay ${selectTags.length}`);
        for (const id of BLOCK_SELECT_IDS) {
            const re = new RegExp(`<select\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)</select>`, 'g');
            const matches = [...section.matchAll(re)];
            if (matches.length !== 1) fail(`select #${id}: se esperaba 1, hay ${matches.length}`);
            const values = [...matches[0][1].matchAll(/<option\b[^>]*value="([^"]*)"/g)].map((m) => m[1]);
            if (JSON.stringify(values) !== JSON.stringify(EXPECTED_BLOCK_OPTIONS)) {
                fail(`select #${id}: opciones ${JSON.stringify(values)}, se esperaban ${JSON.stringify(EXPECTED_BLOCK_OPTIONS)}`);
            }
        }
    });

    // A4 — exactly ONE optional 'Observaciones prebiológico' textarea, label unchanged.
    record(`A4 ${label}: una única Observaciones prebiológico opcional`, () => {
        const section = extractPrebioSection(src, label);
        const areas = section.match(/<textarea\b[^>]*id="observacionesPrebiologico"[^>]*>/g) || [];
        if (areas.length !== 1) fail(`se esperaba 1 textarea #observacionesPrebiologico, hay ${areas.length}`);
        if (/required/.test(areas[0])) fail('#observacionesPrebiologico no debe ser required');
        if (!/<label\b[^>]*for="observacionesPrebiologico"[^>]*>\s*Observaciones prebiológico\s*<\/label>/.test(section)) {
            fail('label para="observacionesPrebiologico" con texto "Observaciones prebiológico" ausente o cambiado');
        }
    });

    // A5 — no APTO / global-state control or copy inside the block.
    record(`A5 ${label}: sin APTO ni estado global en el bloque`, () => {
        const section = extractPrebioSection(src, label);
        if (/\bAPTO\b/i.test(section)) fail('copy/control APTO presente dentro del bloque');
        if (/(estadoPrebiologico(Final|Global|General)|Estado_Prebiologico_Final)/.test(section)) {
            fail('control de estado global presente dentro del bloque');
        }
    });

    // B1 — general diagnosis outside the block stays intact.
    record(`B1 ${label}: diagnóstico general fuera del bloque intacto`, () => {
        if (!src.includes('diagnostic-section')) fail('falta la diagnostic-section superior');
        if (!src.includes('id="diagnosticoPrimario"')) fail('falta #diagnosticoPrimario');
        if (!src.includes('id="diagnosticoSecundario"')) fail('falta #diagnosticoSecundario');
        const section = extractPrebioSection(src, label);
        if (section.includes('id="diagnosticoPrimario"') || section.includes('id="diagnosticoSecundario"')) {
            fail('el diagnóstico general no debe estar dentro del bloque prebiológico');
        }
    });
}

// B2 — export compatibility keeps its meaning and stays fail-safe.
record('B2 export: COMMON_V2_HEADERS declara Fecha_Diagnostico', () => {
    const m = exportSrc.match(/const COMMON_V2_HEADERS = \[([\s\S]*?)\];/);
    if (!m) fail('COMMON_V2_HEADERS no encontrado');
    if (!m[1].includes("'Fecha_Diagnostico'")) fail("'Fecha_Diagnostico' ausente de COMMON_V2_HEADERS");
});
record('B2 export: buildCommonV2Columns mapea fechaDiagnostico con default ND intacto', () => {
    if (!exportSrc.includes("getExportValue(datos, ['fechaDiagnostico', 'Fecha_Diagnostico'], 'ND')")) {
        fail("mapeo ['fechaDiagnostico', 'Fecha_Diagnostico'] con default 'ND' ausente o cambiado");
    }
});
record('B2 export: sección DIAGNÓSTICO emite la línea Fecha diagnóstico', () => {
    const sectionIdx = exportSrc.indexOf("addSection('DIAGNÓSTICO')");
    const lineIdx = exportSrc.indexOf("addLine('Fecha diagnóstico', ['fechaDiagnostico', 'Fecha_Diagnostico'])");
    if (sectionIdx === -1) fail("addSection('DIAGNÓSTICO') no encontrado");
    if (lineIdx === -1) fail("línea addLine('Fecha diagnóstico', ...) ausente o cambiada");
    if (!(sectionIdx < lineIdx)) fail('la línea Fecha diagnóstico ya no está bajo la sección DIAGNÓSTICO');
});
record('B2 export: Observaciones_Prebiologico conserva compatibilidad', () => {
    if (!exportSrc.includes("'Observaciones_Prebiologico'")) fail("'Observaciones_Prebiologico' ausente del export");
    if (!exportSrc.includes("['observacionesPrebiologico', 'Observaciones_Prebiologico']")) {
        fail("mapeo ['observacionesPrebiologico', 'Observaciones_Prebiologico'] ausente o cambiado");
    }
});

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
