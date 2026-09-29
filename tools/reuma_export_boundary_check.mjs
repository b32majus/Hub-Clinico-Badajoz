#!/usr/bin/env node
'use strict';
/**
 * Deterministic compatibility-boundary check for the legacy Reuma 497-column
 * export writer (F5.3, #457).
 *
 * The boundary under test is `modules/reuma_export_boundary.js`
 * (`HubTools.reumaExportBoundary.generateLegacyRow497`). The legacy writer
 * (`modules/exportManager.js` generators) stays the producer and is never
 * modified; like the F1.3B oracle, all mutations used for falsification live
 * in memory inside the harness sandbox.
 *
 * Cases:
 *   C1  all 10 supported journeys cross the boundary byte/field-equivalent to
 *       the direct legacy generator call (same sandbox, same payload).
 *   C2  incompatible shapes fail closed with a typed error: 496 / 498 field
 *       rows, non-string rows (array/object/number/null/undefined) and a
 *       throwing generator. No truncation, no padding, no silent coercion;
 *       no `row` is ever exposed on a non-ok result.
 *   C3  invalid requests and unsupported journeys fail closed with typed
 *       errors (INVALID_REQUEST / UNSUPPORTED_JOURNEY).
 *   C4  input payload non-mutation proof (deep JSON snapshot + nested
 *       reference identity) across the boundary and the generator.
 *   C5  falsifiable proof that the migrated consumer (`exportarYCopiarCSV`)
 *       no longer calls the legacy writer outside the boundary:
 *         - static: the `exportarYCopiarCSV` source region contains no direct
 *           `generarFilaCSV_*` call and routes through `HubTools.reumaExportBoundary`;
 *           the Primera Visita / Seguimiento page scripts contain no direct
 *           `generarFilaCSV` reference;
 *         - behavioral positive: with the legacy generators unreachable
 *           (removed in-memory) and a boundary double returning a marker row,
 *           `exportarYCopiarCSV` queues exactly the marker row;
 *         - behavioral negative: with a boundary double that rejects, the
 *           consumer returns false and queues NO pending row (no partial copy).
 *   C6  static wiring: primera_visita.html and seguimiento.html load the
 *       boundary module after exportManager.js with a ?v= token.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_export_boundary_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createLegacySandbox, runReumaExportHarness } from './reuma_export_harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';
const BOUNDARY_MODULE = 'modules/reuma_export_boundary.js';
const EXPORT_MANAGER = 'modules/exportManager.js';
const PAGE_SCRIPTS = ['scripts/script_primera_visita.js', 'scripts/script_seguimiento.js'];
const PAGES = ['primera_visita.html', 'seguimiento.html'];

const results = [];
const record = (name, pass, detail) => {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
};

function loadBoundaryModule(sandbox) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, BOUNDARY_MODULE), 'utf8'), sandbox, { filename: BOUNDARY_MODULE });
    return sandbox.HubTools.reumaExportBoundary;
}

// Runtime-only environment extras for the consumer-level cases (the F1.3B
// sandbox is otherwise untouched): alert sink, clipboard stub and a
// createElement stub that supports the post-export checklist element API.
function augmentSandboxForConsumer(sandbox) {
    sandbox.alert = () => {};
    sandbox.__clipboardWrites = [];
    sandbox.navigator.clipboard = {
        writeText: (text) => {
            sandbox.__clipboardWrites.push(String(text));
            return Promise.resolve();
        }
    };
    const originalCreateElement = sandbox.document.createElement.bind(sandbox.document);
    sandbox.document.createElement = (...args) => {
        const el = originalCreateElement(...args);
        el.querySelector = () => ({ addEventListener() {}, style: {} });
        el.innerHTML = '';
        return el;
    };
    return sandbox;
}

const EXPECTED_SHEET = { espa: 'ESPA', aps: 'APS', ar: 'AR', les: 'LES', sjogren: 'SJOGREN' };
const GENERATOR_TOKENS = { ar: 'AR', espa: 'EspA', aps: 'APs', les: 'LES', sjogren: 'SJOGREN' };
const VISIT_SUFFIX = { primera: 'PrimeraVisita', seguimiento: 'Seguimiento' };

async function main() {
    console.log('Reuma export compatibility boundary check (F5.3, #457, 100% synthetic corpus)');
    const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS), 'utf8'));
    const journeys = corpus.journeys;
    if (journeys.length !== 10) throw new Error(`Expected 10 corpus journeys, found ${journeys.length}`);

    // =====================================================================
    // C1 — 497-valid rows cross identically for all 10 supported journeys.
    // =====================================================================
    {
        const { sandbox } = createLegacySandbox();
        const boundary = loadBoundaryModule(sandbox);
        let details = [];
        for (const journey of journeys) {
            const direct = sandbox.HubTools.export[`generarFilaCSV_${GENERATOR_TOKENS[journey.pathology]}_${VISIT_SUFFIX[journey.tipoVisita]}`](
                structuredClone(journey.datos), journey.tipoVisita);
            const result = boundary.generateLegacyRow497({ datos: journey.datos, pathology: journey.pathology, tipoVisita: journey.tipoVisita });
            const ok =
                result && result.ok === true &&
                result.row === direct &&
                result.fields.length === 497 &&
                result.meta.pathology === journey.pathology &&
                result.meta.tipoVisita === journey.tipoVisita &&
                result.meta.sheet === EXPECTED_SHEET[journey.pathology] &&
                result.meta.columnCount === 497;
            if (!ok) details.push(`${journey.pathology}/${journey.tipoVisita}: ok=${result && result.ok} rowEqual=${result && result.row === direct} fields=${result && result.fields ? result.fields.length : 'n/a'}`);
        }
        record('C1 all 10 supported journeys cross the boundary byte/field-equivalent to the legacy generator',
            details.length === 0, details.join('; ') || 'unexpected');

        // Falsification self-test of this checker (same record path, isolated
        // sink, as in reuma_export_harness_check.mjs): a planted wrong
        // expectation ("boundary output differs from the generator") must be
        // detected as FAIL by the checker itself.
        const arPrimera = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
        const direct = sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita(structuredClone(arPrimera.datos), 'primera');
        const result = boundary.generateLegacyRow497({ datos: arPrimera.datos, pathology: 'ar', tipoVisita: 'primera' });
        const plantedSink = [];
        const plantedRecord = (name, pass, detail) => {
            plantedSink.push({ name, pass });
            console.log(`      (planted) [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
        };
        plantedRecord('planted lie: boundary output differs from the legacy generator output',
            result.row !== direct, 'rows are byte-equal (expected for the planted lie)');
        record('C1-f planted lie (boundary output differs from legacy generator) is detected as false',
            plantedSink.length === 1 && plantedSink[0].pass === false,
            `planted pass=${plantedSink[0] && plantedSink[0].pass}`);
    }

    // =====================================================================
    // C2 — incompatible shapes fail closed with typed errors.
    // =====================================================================
    {
        const base = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
        const goldenRow = (() => {
            const { sandbox } = createLegacySandbox();
            loadBoundaryModule(sandbox);
            return sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita(structuredClone(base.datos), 'primera');
        })();
        if (goldenRow.split('\t').length !== 497) throw new Error('Precondition failed: golden AR primera row is not 497 fields');

        const doubles = [
            { name: 'row with 496 fields', make: () => goldenRow.split('\t').slice(0, 496).join('\t'), code: 'ROW_LENGTH_INVALID' },
            { name: 'row with 498 fields', make: () => goldenRow.split('\t').concat('SYN-EXTRA').join('\t'), code: 'ROW_LENGTH_INVALID' },
            { name: 'non-string array of 497 fields', make: () => goldenRow.split('\t'), code: 'ROW_NOT_STRING' },
            { name: 'non-string object shape', make: () => ({ fields: goldenRow.split('\t') }), code: 'ROW_NOT_STRING' },
            { name: 'non-string number', make: () => 497, code: 'ROW_NOT_STRING' },
            { name: 'null row', make: () => null, code: 'ROW_NOT_STRING' },
            { name: 'undefined row', make: () => undefined, code: 'ROW_NOT_STRING' },
            { name: 'empty string row', make: () => '', code: 'ROW_LENGTH_INVALID' },
        ];

        for (const double of doubles) {
            const { sandbox } = createLegacySandbox();
            const boundary = loadBoundaryModule(sandbox);
            sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita = () => double.make();
            const result = boundary.generateLegacyRow497({ datos: structuredClone(base.datos), pathology: 'ar', tipoVisita: 'primera' });
            record(`C2 ${double.name} fails closed (${double.code}), exposes no row and never truncates/pads`,
                result && result.ok === false && result.error && result.error.code === double.code &&
                result.row === undefined && result.fields === undefined,
                `result=${JSON.stringify(result)}`);
        }

        {
            const { sandbox } = createLegacySandbox();
            const boundary = loadBoundaryModule(sandbox);
            sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita = () => { throw new Error('planted generator crash'); };
            const result = boundary.generateLegacyRow497({ datos: structuredClone(base.datos), pathology: 'ar', tipoVisita: 'primera' });
            record('C2 throwing generator fails closed (GENERATOR_ERROR) with no row exposed',
                result && result.ok === false && result.error && result.error.code === 'GENERATOR_ERROR' && result.row === undefined,
                `result=${JSON.stringify(result)}`);
        }

        // The length error must name both counts (no silent inference about the drift).
        {
            const { sandbox } = createLegacySandbox();
            const boundary = loadBoundaryModule(sandbox);
            sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita = () => goldenRow.split('\t').slice(0, 496).join('\t');
            const result = boundary.generateLegacyRow497({ datos: structuredClone(base.datos), pathology: 'ar', tipoVisita: 'primera' });
            record('C2 length-drift error carries expected and received counts (no truncation, no padding, no inference)',
                result && result.error && result.error.message.includes('497') && result.error.message.includes('496'),
                `message=${result && result.error ? result.error.message : 'n/a'}`);
        }
    }

    // =====================================================================
    // C3 — invalid requests and unsupported journeys fail closed.
    // =====================================================================
    {
        const { sandbox } = createLegacySandbox();
        const boundary = loadBoundaryModule(sandbox);
        const arPrimera = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
        const cases = [
            { name: 'null request', request: null, code: 'INVALID_REQUEST' },
            { name: 'array request', request: [], code: 'INVALID_REQUEST' },
            { name: 'missing datos', request: { pathology: 'ar', tipoVisita: 'primera' }, code: 'INVALID_REQUEST' },
            { name: 'array datos', request: { datos: [], pathology: 'ar', tipoVisita: 'primera' }, code: 'INVALID_REQUEST' },
            { name: 'unsupported pathology', request: { datos: arPrimera.datos, pathology: 'dermatologia', tipoVisita: 'primera' }, code: 'UNSUPPORTED_JOURNEY' },
            { name: 'empty pathology', request: { datos: arPrimera.datos, pathology: '', tipoVisita: 'primera' }, code: 'UNSUPPORTED_JOURNEY' },
            { name: 'unsupported visit type', request: { datos: arPrimera.datos, pathology: 'ar', tipoVisita: 'inicial' }, code: 'UNSUPPORTED_JOURNEY' },
            { name: 'missing visit type', request: { datos: arPrimera.datos, pathology: 'ar', tipoVisita: '' }, code: 'UNSUPPORTED_JOURNEY' },
        ];
        let details = [];
        for (const c of cases) {
            const result = boundary.generateLegacyRow497(c.request);
            const ok = result && result.ok === false && result.error && result.error.code === c.code && result.row === undefined;
            if (!ok) details.push(`${c.name}: ${JSON.stringify(result)}`);
            record(`C3 ${c.name} fails closed (${c.code})`, ok, JSON.stringify(result));
        }
        // The checker itself must be able to disagree: planted wrong code expectation fails.
        const planted = boundary.generateLegacyRow497({ pathology: 'no-existe', tipoVisita: 'primera' });
        record('C3-f planted wrong error-code expectation is detected',
            !(planted && planted.error && planted.error.code === 'ROW_NOT_STRING'),
            'planted record must FAIL');
    }

    // =====================================================================
    // C4 — input payload non-mutation proof.
    // =====================================================================
    {
        const { sandbox } = createLegacySandbox();
        const boundary = loadBoundaryModule(sandbox);
        const arPrimera = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
        const datos = structuredClone(arPrimera.datos);
        const comorbReference = datos.comorbilidad;
        const nestedMarkerReference = datos.comorbilidad.hta;
        const snapshotBefore = JSON.stringify(datos);
        const result = boundary.generateLegacyRow497({ datos, pathology: 'ar', tipoVisita: 'primera' });
        const snapshotAfter = JSON.stringify(datos);
        record('C4 boundary leaves the input payload deep-identical (JSON snapshot) with nested references intact',
            result && result.ok === true && snapshotBefore === snapshotAfter &&
            datos.comorbilidad === comorbReference && datos.comorbilidad.hta === nestedMarkerReference,
            `ok=${result && result.ok} snapshotEqual=${snapshotBefore === snapshotAfter}`);

        const espaSeguimiento = journeys.find((j) => j.pathology === 'espa' && j.tipoVisita === 'seguimiento');
        const datosEspa = structuredClone(espaSeguimiento.datos);
        const snapshotEspaBefore = JSON.stringify(datosEspa);
        const resultEspa = boundary.generateLegacyRow497({ datos: datosEspa, pathology: 'espa', tipoVisita: 'seguimiento' });
        record('C4 EspA seguimiento payload also crosses unmutated',
            resultEspa && resultEspa.ok === true && snapshotEspaBefore === JSON.stringify(datosEspa),
            `ok=${resultEspa && resultEspa.ok}`);
    }

    // =====================================================================
    // C5 — falsifiable proof: the migrated consumer crosses the boundary.
    // =====================================================================
    {
        // --- C5.a static source inspection ---
        const exportManagerSource = fs.readFileSync(path.join(ROOT, EXPORT_MANAGER), 'utf8');
        const start = exportManagerSource.indexOf('function exportarYCopiarCSV');
        const end = exportManagerSource.indexOf('function generarNotaClinica');
        const consumerRegion = start !== -1 && end > start ? exportManagerSource.slice(start, end) : '';
        record('C5.a static: exportarYCopiarCSV source region contains no direct generarFilaCSV_* call',
            consumerRegion.length > 0 && !/generarFilaCSV_/.test(consumerRegion),
            `region=${consumerRegion.length} chars, directCalls=${(consumerRegion.match(/generarFilaCSV_/g) || []).length}`);
        record('C5.a static: exportarYCopiarCSV routes through HubTools.reumaExportBoundary.generateLegacyRow497',
            consumerRegion.includes('reumaExportBoundary') && consumerRegion.includes('generateLegacyRow497'),
            'boundary reference missing from the consumer region');
        for (const scriptPath of PAGE_SCRIPTS) {
            const source = fs.readFileSync(path.join(ROOT, scriptPath), 'utf8');
            record(`C5.a static: ${scriptPath} contains no direct generarFilaCSV reference`,
                !source.includes('generarFilaCSV'),
                'unexpected direct writer reference in page script');
        }

        // --- C5.b behavioral positive: content can only come via the boundary ---
        {
            const sandbox = augmentSandboxForConsumer(createLegacySandbox().sandbox);
            loadBoundaryModule(sandbox);
            const arPrimera = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
            const datos = structuredClone(arPrimera.datos);
            const markerRow = (() => {
                const fields = Array(497).fill('');
                fields[0] = 'SYN-BOUNDARY-MARKER';
                return fields.join('\t');
            })();
            // Make the legacy writer unreachable for this journey: if the
            // consumer still called it directly, generation would crash instead
            // of queueing the marker row.
            sandbox.HubTools.export.generarFilaCSV_AR_PrimeraVisita = undefined;
            sandbox.HubTools.reumaExportBoundary = Object.freeze({
                generateLegacyRow497: (request) => Object.freeze({
                    ok: true, row: markerRow, fields: Object.freeze(markerRow.split('\t')),
                    meta: Object.freeze({ pathology: request.pathology, tipoVisita: request.tipoVisita, sheet: 'AR', columnCount: 497 })
                })
            });
            sandbox.markTxtExportDone(datos, { tipoVisita: 'primera', diagnostico: 'ar' });
            sandbox.HubTools.export.exportarYCopiarCSV(datos, 'primera', 'ar');
            await new Promise((resolve) => setTimeout(resolve, 20));
            const writes = sandbox.__clipboardWrites;
            record('C5.b behavioral: with the legacy generator unreachable, exportarYCopiarCSV copies exactly the boundary marker row',
                writes.length === 1 && writes[0] === markerRow,
                `clipboardWrites=${writes.length} contentMatch=${writes.length === 1 && writes[0] === markerRow}`);
        }

        // --- C5.b behavioral negative: boundary rejection => no partial copy ---
        {
            const sandbox = augmentSandboxForConsumer(createLegacySandbox().sandbox);
            loadBoundaryModule(sandbox);
            const arPrimera = journeys.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
            const datos = structuredClone(arPrimera.datos);
            sandbox.HubTools.reumaExportBoundary = Object.freeze({
                generateLegacyRow497: () => Object.freeze({ ok: false, error: Object.freeze({ code: 'ROW_LENGTH_INVALID', message: 'planted boundary rejection (QA)' }) })
            });
            sandbox.markTxtExportDone(datos, { tipoVisita: 'primera', diagnostico: 'ar' });
            const returned = sandbox.HubTools.export.exportarYCopiarCSV(datos, 'primera', 'ar');
            await new Promise((resolve) => setTimeout(resolve, 20));
            const writes = sandbox.__clipboardWrites;
            record('C5.b behavioral: boundary rejection makes exportarYCopiarCSV fail closed (returns false, nothing copied)',
                returned === false && writes.length === 0,
                `returned=${returned} clipboardWrites=${writes.length}`);
        }
    }

    // =====================================================================
    // C6 — static wiring of the pages that must cross the boundary.
    // =====================================================================
    for (const page of PAGES) {
        const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
        const boundaryIndex = html.indexOf('modules/reuma_export_boundary.js?v=');
        const exportManagerIndex = html.indexOf('modules/exportManager.js?v=');
        record(`C6 ${page} loads the compatibility boundary after exportManager.js with a ?v= token`,
            boundaryIndex !== -1 && exportManagerIndex !== -1 && boundaryIndex > exportManagerIndex,
            `boundaryIndex=${boundaryIndex} exportManagerIndex=${exportManagerIndex}`);
    }

    // Harness regression on the same run: the legacy surface must be untouched.
    const harness = await runReumaExportHarness({ corpusFile: CORPUS });
    record('legacy writer surface unchanged: harness still generates all 10 rows with 497 fields',
        harness.journeys.length === 10 && harness.journeys.every((j) => j.fields.length === 497),
        harness.journeys.map((j) => j.fields.length).join(','));

    const failed = results.filter((r) => !r.pass).length;
    console.log('');
    console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
    if (failed > 0) {
        console.error('Reuma export boundary check FAILED');
        process.exit(1);
    }
    console.log('Reuma export boundary check PASSED');
}

main().catch((err) => {
    console.error('Reuma export boundary check crashed:', err);
    process.exit(1);
});
