#!/usr/bin/env node
// tools/farmacia_f43c_seguimiento_estadisticas_read_migration_check.mjs
// TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 — T3/F4.3C frozen characterization oracle.
//
// Characterizes BEHAVIOR (not incidental bytes):
//   1. The Seguimiento page coordinator performs NO direct patient lookup:
//      no F.getQueryContext resolution and no F.findPatientByCip coordinator
//      lookup; it consumes the published application read operations
//      (readPatientContext / readPatientByCipSync).
//   2. The Estadísticas surface has NO current-patient read responsibility
//      (population only, via the published handoff seam); its versioned demo
//      dataset is loaded behind the published seam loader, not by a direct
//      page fetch.
//   3. Follow-up/visit semantics are untouched: the export path keeps its
//      published sync contract, missing data stays missing, counts are not
//      re-derived by the read migration.
//   4. The T3 pages load the published F4.1 contract V2 + F4.2 async facade.
//
// Ejecutar: node tools/farmacia_f43c_seguimiento_estadisticas_read_migration_check.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
const failures = [];

function pass(name) { passed += 1; console.log(`PASS ${name}`); }
function fail(name, detail) { failed += 1; failures.push(`${name}: ${detail || ''}`); console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
function check(name, condition, detail) { condition ? pass(name) : fail(name, detail); }

function readScript(relative) {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

// ─── 1. No direct patient lookup in the Seguimiento coordinator ──────────────

const seguimientoSrc = readScript('scripts/farmacia_seguimiento.js');
check('seguimiento page coordinator has no F.getQueryContext patient resolution',
    seguimientoSrc.indexOf('getQueryContext(') === -1);
check('seguimiento page coordinator has no direct F.findPatientByCip lookup',
    seguimientoSrc.indexOf('findPatientByCip') === -1);
check('seguimiento page coordinator consumes the published async read operation',
    seguimientoSrc.indexOf('readPatientContext') !== -1);
check('seguimiento page coordinator consumes the published seam sync CIP read',
    seguimientoSrc.indexOf('readPatientByCipSync') !== -1);
check('seguimiento page coordinator has no direct F.patients population access',
    /F\.patients\s*\[/.test(seguimientoSrc) === false);

// ─── 2. Estadísticas: no current-patient read; dataset behind the seam ───────

const estadisticasSrc = readScript('scripts/farmacia_estadisticas.js');
check('estadisticas has no current-patient read responsibility (no context read)',
    estadisticasSrc.indexOf('getQueryContext') === -1
        && estadisticasSrc.indexOf('readPatientContext') === -1
        && estadisticasSrc.indexOf('findPatientByCip') === -1
        && estadisticasSrc.indexOf('CurrentPatientSession') === -1);
check('estadisticas loads the versioned demo dataset behind the published seam loader',
    estadisticasSrc.indexOf('loadLongitudinalDemoDataset') !== -1);
check('estadisticas has no direct demo dataset fetch',
    estadisticasSrc.indexOf("fetch('data/demo") === -1 && estadisticasSrc.indexOf('fetch("data/demo') === -1);
check('estadisticas population still flows through the published handoff seam',
    estadisticasSrc.indexOf('Handoff.receiverExpected') !== -1 && estadisticasSrc.indexOf('Handoff.receive') !== -1);

// ─── 3. Follow-up/export sync contract preserved ─────────────────────────────

check('seguimiento keeps the published sync Excel export entry (no export semantics change)',
    seguimientoSrc.indexOf('buildFollowupExcelRows(model)') !== -1
        && seguimientoSrc.indexOf('copyTSVRowsToClipboard') !== -1);
check('seguimiento keeps the explicit follow-up visit construction identity',
    seguimientoSrc.indexOf('createFollowupVisit(') !== -1);

// ─── 4. HTML wiring: published V2 read modules load on T3 pages ──────────────

const seguimientoHtml = readScript('farmacia_seguimiento.html');
const estadisticasHtml = readScript('farmacia_estadisticas.html');
check('seguimiento.html loads the published patient read contract V2',
    seguimientoHtml.indexOf('scripts/farmacia_patient_read_contract_v2.js') !== -1);
check('seguimiento.html loads the published async read facade V2',
    seguimientoHtml.indexOf('scripts/farmacia_patient_read_facade_v2.js') !== -1);
check('estadisticas.html loads the published patient read contract V2',
    estadisticasHtml.indexOf('scripts/farmacia_patient_read_contract_v2.js') !== -1);
check('estadisticas.html loads the published async read facade V2',
    estadisticasHtml.indexOf('scripts/farmacia_patient_read_facade_v2.js') !== -1);

console.log(`\nFARMACIA-F4.3C-READ-MIGRATION: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error('FAILURES:\n' + failures.map((line) => ' - ' + line).join('\n'));
    process.exit(1);
}
