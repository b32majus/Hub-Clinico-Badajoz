#!/usr/bin/env node
'use strict';
/**
 * Focal deterministic check for #455 (F5.2A): migrate the Seguimiento Reuma journey
 * onto the published `ReumaPatientReadPort` (`scripts/reuma_patient_read_port.js`).
 *
 * The checker loads the real, unmodified legacy modules (`modules/hubTools.js`,
 * `modules/fieldNormalizer.js`, `modules/dataManager.js`) through
 * `tools/reuma_read_harness.mjs`, then the real port and the real
 * `scripts/script_seguimiento.js` in the SAME vm sandbox, and drives the migrated
 * read helper `readSeguimientoBundle` with synthetic ids only.
 *
 * It can disagree with the implementation:
 *  - a reintroduced direct `HubTools.data.<covered op>` reference fails;
 *  - a read that fabricates a demo patient for `unavailable`/`error` fails;
 *  - a read that drops the legacy demo fallback for a real `not_found` fails;
 *  - a read that collapses a sentinel fails.
 *
 * Exit codes: 0 = every case PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_seguimiento_read_migration_check.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createLegacySandbox } from './reuma_read_harness.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const CORPUS_FILE = path.join(ROOT, 'tools', 'fixtures', 'reuma_read', 'corpus_v1.json');
const CORPUS = JSON.parse(fs.readFileSync(CORPUS_FILE, 'utf8'));
const PORT_FILE = path.join(ROOT, 'scripts', 'reuma_patient_read_port.js');
const PORT_RELATIVE = 'scripts/reuma_patient_read_port.js';
const SEGUIMIENTO_FILE = path.join(ROOT, 'scripts', 'script_seguimiento.js');
const SEGUIMIENTO_RELATIVE = 'scripts/script_seguimiento.js';
const SEGUIMIENTO_HTML = path.join(ROOT, 'seguimiento.html');
const COVERED_OPS = ['getAllPatients', 'findPatientById', 'getPatientHistory'];
const KNOWN_ID = 'SYN-ESPA-001';
const UNKNOWN_ID = 'ESP-2099-999';

const PORT_SOURCE = fs.readFileSync(PORT_FILE, 'utf8');
const SEGUIMIENTO_SOURCE = fs.readFileSync(SEGUIMIENTO_FILE, 'utf8');
const SEGUIMIENTO_HTML_SOURCE = fs.readFileSync(SEGUIMIENTO_HTML, 'utf8');

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function canonical(value) {
    return JSON.stringify(value);
}

function demoMockBundle() {
    return {
        summary: {
            idPaciente: UNKNOWN_ID,
            nombre: 'Demo Sintetico',
            diagnosticoPrimario: 'espa',
        },
        pathology: 'espa',
        visits: [
            {
                idPaciente: UNKNOWN_ID,
                nombrePaciente: 'Demo Sintetico',
                fechaVisita: '2026-01-01',
                diagnosticoPrimario: 'espa',
            },
        ],
        treatmentHistory: [],
    };
}

function loadModules(sandbox) {
    vm.runInContext(PORT_SOURCE, sandbox, { filename: PORT_RELATIVE });
    vm.runInContext(SEGUIMIENTO_SOURCE, sandbox, { filename: SEGUIMIENTO_RELATIVE });
    assert.equal(typeof sandbox.readSeguimientoBundle, 'function',
        `${SEGUIMIENTO_RELATIVE} must expose readSeguimientoBundle`);
}

async function loadCorpusInto(sandbox) {
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(CORPUS.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const file = {
        name: 'reuma_seguimiento_check.xlsx',
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
    return sandbox.HubTools.data.loadDatabase(file);
}

function freshSandbox() {
    const { sandbox } = createLegacySandbox();
    loadModules(sandbox);
    return sandbox;
}

async function run() {
    // =====================================================================
    // 1. Static wiring: no direct covered data-manager reads remain, the port
    //    is consumed, and seguimiento.html loads the port before the consumer.
    // =====================================================================
    {
        const hits = [];
        for (const op of COVERED_OPS) {
            if (new RegExp(`HubTools\\s*\\.\\s*data\\s*\\.\\s*${op}\\b`).test(SEGUIMIENTO_SOURCE)) hits.push(op);
        }
        record('#455 seguimiento consumer references no HubTools.data covered read operation',
            hits.length === 0, `direct references=${JSON.stringify(hits)}`);
    }
    {
        const usesPort = /ReumaPatientReadPort/.test(SEGUIMIENTO_SOURCE) &&
            /readPatientBundle/.test(SEGUIMIENTO_SOURCE);
        record('#455 seguimiento consumer reads through ReumaPatientReadPort.readPatientBundle',
            usesPort, `ReumaPatientReadPort=${/ReumaPatientReadPort/.test(SEGUIMIENTO_SOURCE)} readPatientBundle=${/readPatientBundle/.test(SEGUIMIENTO_SOURCE)}`);
    }
    {
        const portIndex = SEGUIMIENTO_HTML_SOURCE.indexOf(PORT_RELATIVE);
        const consumerIndex = SEGUIMIENTO_HTML_SOURCE.indexOf('scripts/script_seguimiento.js');
        const wired = portIndex !== -1 && consumerIndex !== -1 && portIndex < consumerIndex &&
            new RegExp(`${PORT_RELATIVE.replace('.', '\\.')}\\?v=`).test(SEGUIMIENTO_HTML_SOURCE);
        record('#455 seguimiento.html loads the read port before its page script with a ?v= token',
            wired, `portIndex=${portIndex} consumerIndex=${consumerIndex}`);
    }

    // =====================================================================
    // 2. `ok` preserves the exact legacy payload on a real multi-visit corpus id.
    // =====================================================================
    {
        const sandbox = freshSandbox();
        await loadCorpusInto(sandbox);
        const mockCalls = [];
        sandbox.MockPatients = { getById: (id) => { mockCalls.push(id); return null; } };

        const outcome = await sandbox.readSeguimientoBundle(KNOWN_ID);
        const legacyRecord = sandbox.HubTools.data.findPatientById(KNOWN_ID);
        const legacyHistory = sandbox.HubTools.data.getPatientHistory(KNOWN_ID);
        const checks = [
            outcome.status === 'ok',
            outcome.source === 'port',
            !!outcome.baseRecord && !!outcome.historyData,
            Array.isArray(outcome.historyData.allVisits) && outcome.historyData.allVisits.length >= 2,
            canonical(outcome.baseRecord) === canonical(legacyRecord),
            canonical(outcome.historyData) === canonical(legacyHistory),
            mockCalls.length === 0,
        ];
        record('#455 ok hydrates the exact legacy record/history (multi-visit) and never consults the mock',
            checks.every(Boolean),
            `status=${outcome.status} source=${outcome.source} visits=${outcome.historyData?.allVisits?.length} ` +
            `recordParity=${canonical(outcome.baseRecord) === canonical(legacyRecord)} ` +
            `historyParity=${canonical(outcome.historyData) === canonical(legacyHistory)} mockCalls=${mockCalls.length}`);
    }

    // =====================================================================
    // 3. `not_found` keeps the legacy demo mock ONLY as an explicit separate path.
    // =====================================================================
    {
        const sandbox = freshSandbox();
        await loadCorpusInto(sandbox);
        let calls = 0;
        const mock = demoMockBundle();
        sandbox.MockPatients = { getById: () => { calls += 1; return mock; } };

        const outcome = await sandbox.readSeguimientoBundle(UNKNOWN_ID);
        record('#455 not_found may fall back to the explicit demo mock (source=mock)',
            outcome.status === 'ok' && outcome.source === 'mock' && calls === 1 &&
            outcome.baseRecord?.idPaciente === UNKNOWN_ID,
            `status=${outcome.status} source=${outcome.source} calls=${calls}`);
    }
    {
        const sandbox = freshSandbox();
        await loadCorpusInto(sandbox);
        let calls = 0;
        sandbox.MockPatients = { getById: () => { calls += 1; return null; } };

        const outcome = await sandbox.readSeguimientoBundle(UNKNOWN_ID);
        record('#455 not_found without a demo patient stays not_found (no fabricated payload)',
            outcome.status === 'not_found' && !outcome.baseRecord && !outcome.historyData && calls === 1,
            `status=${outcome.status} baseRecord=${!!outcome.baseRecord} calls=${calls}`);
    }

    // =====================================================================
    // 4. `unavailable` and `error` are distinct and NEVER become MockPatients.
    // =====================================================================
    {
        const sandbox = freshSandbox();
        let calls = 0;
        sandbox.MockPatients = { getById: () => { calls += 1; return demoMockBundle(); } };

        const outcome = await sandbox.readSeguimientoBundle(KNOWN_ID);
        record('#455 unavailable is explicit and never converted into MockPatients',
            outcome.status === 'unavailable' && calls === 0 && !outcome.baseRecord,
            `status=${outcome.status} mockCalls=${calls}`);
    }
    {
        const sandbox = freshSandbox();
        sandbox.sessionStorage.setItem('hubClinicoDB', '{"synthetic":true}');
        sandbox.HubTools.data.getAllPatients = () => ([{ ID_Paciente: KNOWN_ID, Nombre_Paciente: 'Sintetico Espa Uno' }]);
        sandbox.HubTools.data.findPatientById = () => { throw new Error('planted delegate failure'); };
        sandbox.HubTools.data.getPatientHistory = () => ({ allVisits: [], latestVisit: null, firstVisit: null, pathology: null, treatmentHistory: [], keyEvents: [] });
        let calls = 0;
        sandbox.MockPatients = { getById: () => { calls += 1; return demoMockBundle(); } };

        const outcome = await sandbox.readSeguimientoBundle(KNOWN_ID);
        record('#455 error is explicit and never converted into MockPatients',
            outcome.status === 'error' && calls === 0 && !outcome.baseRecord,
            `status=${outcome.status} error_code=${outcome.error_code} mockCalls=${calls}`);
    }
    {
        // The four closed states are distinguishable on the migrated path.
        const okSandbox = freshSandbox();
        await loadCorpusInto(okSandbox);
        okSandbox.MockPatients = { getById: () => null };
        const ok = await okSandbox.readSeguimientoBundle(KNOWN_ID);
        const notFound = await okSandbox.readSeguimientoBundle(UNKNOWN_ID);

        const emptySandbox = freshSandbox();
        emptySandbox.MockPatients = { getById: () => null };
        const unavailable = await emptySandbox.readSeguimientoBundle(KNOWN_ID);

        const errorSandbox = freshSandbox();
        errorSandbox.sessionStorage.setItem('hubClinicoDB', '{"synthetic":true}');
        errorSandbox.HubTools.data.getAllPatients = () => ([{ ID_Paciente: KNOWN_ID, Nombre_Paciente: 'Sintetico Espa Uno' }]);
        errorSandbox.HubTools.data.findPatientById = () => { throw new Error('planted delegate failure'); };
        errorSandbox.HubTools.data.getPatientHistory = () => ({ allVisits: [], latestVisit: null, firstVisit: null, pathology: null, treatmentHistory: [], keyEvents: [] });
        errorSandbox.MockPatients = { getById: () => null };
        const error = await errorSandbox.readSeguimientoBundle(KNOWN_ID);

        record('#455 ok / not_found / unavailable / error are distinguishable closed states',
            ok.status === 'ok' && notFound.status === 'not_found' &&
            unavailable.status === 'unavailable' && error.status === 'error',
            `ok=${ok.status} not_found=${notFound.status} unavailable=${unavailable.status} error=${error.status}`);
    }

    // =====================================================================
    // 5. Sentinels (0 / 'NA' / 'ND' / '') cross the migrated read untouched.
    // =====================================================================
    {
        const sandbox = freshSandbox();
        sandbox.sessionStorage.setItem('hubClinicoDB', '{"synthetic":true}');
        const sentinelVisit = {
            idPaciente: KNOWN_ID,
            fechaVisita: '2026-01-01',
            fr: 'ND',
            apcc: '',
            ana: 'NA',
            pcr: 0,
            dactilitisTotal: 0,
        };
        const sentinelRecord = {
            idPaciente: KNOWN_ID,
            nombrePaciente: 'Sintetico Sentinela',
            fr: 0,
            apcc: 'NA',
            ana: 'ND',
        };
        sandbox.HubTools.data.getAllPatients = () => ([{ ID_Paciente: KNOWN_ID, Nombre_Paciente: 'Sintetico Sentinela' }]);
        sandbox.HubTools.data.findPatientById = () => sentinelRecord;
        sandbox.HubTools.data.getPatientHistory = () => ({
            allVisits: [sentinelVisit],
            latestVisit: sentinelVisit,
            firstVisit: sentinelVisit,
            pathology: 'espa',
            treatmentHistory: [],
            keyEvents: [],
        });
        sandbox.MockPatients = { getById: () => null };

        const outcome = await sandbox.readSeguimientoBundle(KNOWN_ID);
        const visit = outcome.historyData?.allVisits?.[0] || {};
        const checks = [
            outcome.status === 'ok',
            Object.is(outcome.baseRecord.fr, 0),
            outcome.baseRecord.apcc === 'NA',
            outcome.baseRecord.ana === 'ND',
            visit.fr === 'ND',
            visit.apcc === '',
            visit.ana === 'NA',
            Object.is(visit.pcr, 0),
            Object.is(visit.dactilitisTotal, 0),
        ];
        record("#455 sentinels 0 / 'NA' / 'ND' / '' cross the migrated read untouched",
            checks.every(Boolean),
            `fr=${canonical(outcome.baseRecord?.fr)} apcc=${canonical(outcome.baseRecord?.apcc)} ` +
            `visitFr=${canonical(visit.fr)} visitApcc=${canonical(visit.apcc)} visitPcr=${canonical(visit.pcr)}`);
    }
}

try {
    await run();
} catch (error) {
    record('unexpected checker error', false, (error && error.stack) || String(error));
}

const failed = results.filter((result) => !result.pass);
if (failed.length > 0) {
    console.log('FAILED CASES:');
    for (const item of failed) console.log(`  - ${item.name}`);
}
console.log(`\nREUMA-SEGUIMIENTO-READ-MIGRATION: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
