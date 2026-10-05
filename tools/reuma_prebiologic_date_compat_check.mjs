#!/usr/bin/env node
'use strict';
/**
 * Behavioral evidence supplement for WO-NEXUS-REUMA-PREBIO-MINIMAL-13
 * (GitHub issue #525, b32majus/Hub-Clinico-Badajoz), acceptance criterion 2:
 *
 *   "`Fecha diagnóstico` eliminada únicamente de este bloque; fechas
 *    diagnósticas generales intactas."
 *
 * and the issue ORACLE/TESTS bullet:
 *
 *   "ninguna fecha diagnóstica general fuera del bloque prebiológico
 *    desaparece o cambia de significado."
 *
 * The frozen static oracle (tools/reuma_prebiologic_block_minimal_check.mjs)
 * proves the general diagnosis surface only statically (B1 diagnosis section
 * presence + B2 export header/mapping presence) plus the reviewed fact that
 * modules/exportManager.js is untouched by #525. This tool adds BEHAVIORAL
 * evidence over the REAL, unmodified export path: it loads
 * modules/exportManager.js in the same node:vm sandbox used by
 * tools/reuma_export_boundary_check.mjs (via createLegacySandbox from
 * tools/reuma_export_harness.mjs) and drives the EXPOSED API:
 *   - HubTools.export.generarFilaCSV_AR_PrimeraVisita(datos)  (497-col TSV row)
 *   - HubTools.export.generarNotaClinica(datos)               (clinical note)
 * It does NOT restate or copy the mapping logic, and it does not stub the
 * functions under test.
 *
 * Absence-token authority asserted in S2 (the token is PRE-EXISTING; #525 does
 * not create it and MUST NOT change it):
 *   - FROZEN tools/reuma_export_acceptance_check.mjs PART A3 documents the
 *     contract "explicit 'NA' and 'ND' preserved verbatim ... and false -> 'NO'
 *     rendered distinctly from missing -> 'ND'" (case with reason
 *     "missing -> fallback 'ND'").
 *   - docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md records `''` / `'ND'` /
 *     `'0'` as deliberately distinct legacy-transport sentinels.
 *
 * Scope: deterministic, dependency-free plain Node. Synthetic data only (no
 * patient data is read or written). Exit 0 = all PASS, 1 = FAIL.
 * Usage: node tools/reuma_prebiologic_date_compat_check.mjs
 */

import { createLegacySandbox } from './reuma_export_harness.mjs';

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

function assertEqual(actual, expected, label) {
    if (actual !== expected) {
        fail(`${label}: esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`);
    }
}

// Real, unmodified production surface in the shared vm sandbox.
const { sandbox } = createLegacySandbox();
const exp = sandbox.HubTools && sandbox.HubTools.export;
if (!exp || typeof exp.generarFilaCSV_AR_PrimeraVisita !== 'function' || typeof exp.generarNotaClinica !== 'function') {
    console.error('No se pudo cargar la superficie real HubTools.export desde modules/exportManager.js');
    process.exit(1);
}

// Authority-derived position of the general 'Fecha_Diagnostico' column. The
// 497-field row is [legacy base] + FINAL_V2_EXPORT_HEADERS in the same order,
// so baseOffset = FINAL_V2_EXPORT_COLUMN_COUNT - FINAL_V2_EXPORT_HEADERS.length
// and the column index is the exposed header index. No magic index.
const HEADER = 'Fecha_Diagnostico';
const headerIndex = exp.FINAL_V2_EXPORT_HEADERS.indexOf(HEADER);
const baseOffset = exp.FINAL_V2_EXPORT_COLUMN_COUNT - exp.FINAL_V2_EXPORT_HEADERS.length;
const FECHA_IDX = baseOffset + headerIndex;

function exportField(datos) {
    const row = exp.generarFilaCSV_AR_PrimeraVisita(structuredClone(datos));
    const fields = String(row).split('\t');
    if (fields.length !== exp.FINAL_V2_EXPORT_COLUMN_COUNT) {
        fail(`fila exportada con ${fields.length} campos, se esperaban ${exp.FINAL_V2_EXPORT_COLUMN_COUNT}`);
    }
    return fields[FECHA_IDX];
}

function noteLines(datos) {
    return String(exp.generarNotaClinica(structuredClone(datos)))
        .split('\n')
        .filter((line) => /Fecha diagnóstico/i.test(line));
}

const GENERAL_DATE = '15/01/2025';
const PERSISTED_DATE = '02/02/2024';
const IS_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
// Synthetic minimal payload; `fechaDiagnostico` is the general diagnosis date
// (patient/pathology), NOT a prebiologic-block field.
const BASE = { cip: 'SYN-525-DATE-COMPAT', diagnosticoPrimario: 'AR' };

// P0 — the authority-derived column really exists and points inside the row.
record('P0 autoridad: cabecera Fecha_Diagnostico expuesta y posición derivada válida', () => {
    if (headerIndex === -1) fail(`'${HEADER}' ausente de FINAL_V2_EXPORT_HEADERS`);
    if (!Number.isInteger(baseOffset) || baseOffset <= 0) fail(`offset base no derivable: ${baseOffset}`);
    if (FECHA_IDX <= 0 || FECHA_IDX >= exp.FINAL_V2_EXPORT_COLUMN_COUNT) fail(`posición derivada fuera de rango: ${FECHA_IDX}`);
});

// S1 — general diagnosis date present (camelCase capture state): it must render
// verbatim through both the CSV transport and the clinical note.
record('S1 fecha diagnóstica general presente: CSV y nota clínica renderizan la fecha exacta', () => {
    const datos = { ...BASE, fechaDiagnostico: GENERAL_DATE };
    assertEqual(exportField(datos), GENERAL_DATE, 'campo CSV Fecha_Diagnostico');
    const lines = noteLines(datos);
    assertEqual(lines.length, 1, 'nº de líneas con "Fecha diagnóstico" en la nota');
    assertEqual(lines[0], `Fecha diagnóstico: ${GENERAL_DATE}`, 'línea de nota clínica');
});

// S2 — the key removed (the post-#525 capture state, where the prebiologic
// block no longer authors this field): the transport must keep the documented
// absence token 'ND' and never fabricate a date or a clinical value; the note
// must omit the line rather than invent one.
record('S2 clave retirada (post-#525): CSV conserva el token de ausencia "ND" y la nota no fabrica fecha', () => {
    const datos = { ...BASE };
    const value = exportField(datos);
    assertEqual(value, 'ND', 'campo CSV Fecha_Diagnostico (contrato A3, missing -> ND)');
    if (IS_DATE.test(value)) fail(`el campo CSV fabrica una fecha: ${value}`);
    const lines = noteLines(datos);
    assertEqual(lines.length, 0, 'nº de líneas con "Fecha diagnóstico" en la nota (debe omitirse)');
});

// S3 — persisted-style read path (PascalCase legacy key): still renders verbatim
// through both surfaces.
record('S3 valor persistido (PascalCase Fecha_Diagnostico): renderiza el valor verbatim', () => {
    const datos = { ...BASE, Fecha_Diagnostico: PERSISTED_DATE };
    assertEqual(exportField(datos), PERSISTED_DATE, 'campo CSV Fecha_Diagnostico (ruta PascalCase)');
    const lines = noteLines(datos);
    assertEqual(lines.length, 1, 'nº de líneas con "Fecha diagnóstico" en la nota (ruta PascalCase)');
    assertEqual(lines[0], `Fecha diagnóstico: ${PERSISTED_DATE}`, 'línea de nota clínica (ruta PascalCase)');
});

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
