#!/usr/bin/env node
'use strict';
/**
 * Focal deterministic check for #456 (F5.2B): migrate the Estadísticas Reuma
 * population reads onto the read-only seam
 * (`scripts/reuma_population_read_port.js`).
 *
 * The checker loads the real, unmodified legacy modules (`modules/hubTools.js`,
 * `modules/fieldNormalizer.js`, `modules/dataManager.js`) through
 * `tools/reuma_read_harness.mjs`, then the real seam and the real
 * `scripts/script_estadisticas.js` in the SAME vm sandbox.
 *
 * Migration parity is proved against the real legacy read surface, never a second
 * read model: for the same synthetic corpus + same filters the seam's `ok` payload
 * must be canonically equal to `HubTools.data.getPoblationalData(filters)`. A parity
 * result is NOT a clinical acceptance of the legacy output: KNOWN_LEGACY stays
 * characterization.
 *
 * It can disagree with the implementation:
 *  - a reintroduced direct `HubTools.data.<covered op>` reference fails;
 *  - a seam that folds `unavailable` into a valid empty cohort fails;
 *  - a seam that reinterprets the filter input fails;
 *  - a seam that persists/writes fails;
 *  - a seam that reorders/drops drug filter options fails;
 *  - a seam that collapses a sentinel fails.
 *
 * Exit codes: 0 = every case PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_estadisticas_read_seam_check.mjs
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
const SEAM_FILE = path.join(ROOT, 'scripts', 'reuma_population_read_port.js');
const SEAM_RELATIVE = 'scripts/reuma_population_read_port.js';
const CONSUMER_FILE = path.join(ROOT, 'scripts', 'script_estadisticas.js');
const CONSUMER_RELATIVE = 'scripts/script_estadisticas.js';
const ESTADISTICAS_HTML = path.join(ROOT, 'estadisticas.html');

const SEAM_SOURCE = fs.readFileSync(SEAM_FILE, 'utf8');
const CONSUMER_SOURCE = fs.readFileSync(CONSUMER_FILE, 'utf8');
const HTML_SOURCE = fs.readFileSync(ESTADISTICAS_HTML, 'utf8');

const REQUIRED_METHODS = ['getPoblationalData', 'getFarmsDataFromState'];
const PORT_METHODS = ['readPopulation', 'readDrugFilterOptions'];
const DRUG_CATEGORIES = ['Tratamientos_Sistemicos', 'FAMEs', 'Biologicos'];

// Synthetic-only drug catalogue (ids/names SYNTHETIC_*). It exercises the drug
// filter source with a known set/order; never real data.
const SYNTHETIC_DRUGS = {
    Tratamientos_Sistemicos: ['Sintetico Sist A', 'Sintetico Sist B'],
    FAMEs: ['Sintetico FAME A', 'Sintetico FAME B'],
    Biologicos: ['Sintetico Bio A'],
};
const FARMACOS_ROWS = [
    ['Sistemicos', 'FAMEs', 'Biologicos'],
    ['Sintetico Sist A', 'Sintetico FAME A', 'Sintetico Bio A'],
    ['Sintetico Sist B', 'Sintetico FAME B', ''],
];

const FILTER_SETS = [
    {},
    { pathology: 'ESPA' },
    { pathology: 'AR' },
    { pathology: 'Todos' },
    { pathology: 'ESPA', sex: 'M' },
    { pathology: 'ESPA', dateFrom: '2026-02-01', dateTo: '2026-12-31' },
    { pathology: 'ESPA', activityIndex: 'BASDAI', activityState: 'Remision' },
    { pathology: 'APS', ttoType: 'FAMEs', ttoSpecific: 'Sintetico' },
];

const results = [];
function record(name, pass, detail) {
    results.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function canonical(value) {
    return JSON.stringify(value);
}

function loadSeamModule(sandbox) {
    vm.runInContext(SEAM_SOURCE, sandbox, { filename: SEAM_RELATIVE });
    const Port = sandbox.ReumaPopulationReadPort;
    assert.ok(Port, `${SEAM_RELATIVE} must expose globalThis.ReumaPopulationReadPort`);
    return Port;
}

function createSeamSandbox() {
    const { sandbox, sink } = createLegacySandbox();
    const Port = loadSeamModule(sandbox);
    return { sandbox, sink, Port };
}

async function loadCorpusInto(sandbox) {
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(CORPUS.sheets)) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    }
    // Frmacos is read as a positional matrix (column 0 = Sistemicos, 1 = FAMEs, 2 = Biologicos).
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(FARMACOS_ROWS), 'Frmacos');
    const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const file = {
        name: 'reuma_estadisticas_check.xlsx',
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
    return sandbox.HubTools.data.loadDatabase(file);
}

function emptyDrugs() {
    return { Tratamientos_Sistemicos: [], FAMEs: [], Biologicos: [] };
}

async function run() {
    // =====================================================================
    // 1. Static wiring: no direct covered reads remain, the seam is consumed,
    //    and estadisticas.html loads the seam before its page script.
    // =====================================================================
    {
        const hits = [];
        for (const op of REQUIRED_METHODS) {
            if (new RegExp(`HubTools\\s*\\.\\s*data\\s*\\.\\s*${op}\\b`).test(CONSUMER_SOURCE)) hits.push(op);
        }
        record('#456 estadisticas consumer references no HubTools.data covered population read',
            hits.length === 0, `direct references=${JSON.stringify(hits)}`);
    }
    {
        const usesSeam = /ReumaPopulationReadPort/.test(CONSUMER_SOURCE) &&
            /readPopulation/.test(CONSUMER_SOURCE) &&
            /readDrugFilterOptions/.test(CONSUMER_SOURCE);
        record('#456 estadisticas consumer reads through ReumaPopulationReadPort.readPopulation/readDrugFilterOptions',
            usesSeam,
            `seam=${/ReumaPopulationReadPort/.test(CONSUMER_SOURCE)} ` +
            `readPopulation=${/readPopulation/.test(CONSUMER_SOURCE)} ` +
            `readDrugFilterOptions=${/readDrugFilterOptions/.test(CONSUMER_SOURCE)}`);
    }
    {
        const seamIndex = HTML_SOURCE.indexOf(SEAM_RELATIVE);
        const consumerIndex = HTML_SOURCE.indexOf(CONSUMER_RELATIVE);
        const wired = seamIndex !== -1 && consumerIndex !== -1 && seamIndex < consumerIndex &&
            new RegExp(`${SEAM_RELATIVE.replace('.', '\\.')}\\?v=`).test(HTML_SOURCE);
        record('#456 estadisticas.html loads the population seam before its page script with a ?v= token',
            wired, `seamIndex=${seamIndex} consumerIndex=${consumerIndex}`);
    }

    // =====================================================================
    // 2. create() fails closed, getPort() is null without the source and a
    //    stable singleton with it.
    // =====================================================================
    {
        for (const missing of REQUIRED_METHODS) {
            const delegate = {
                getPoblationalData: () => ({ filteredCohort: [], kpis: null, chartData: null }),
                getFarmsDataFromState: () => emptyDrugs(),
            };
            delete delegate[missing];
            assert.throws(
                () => createSeamSandbox().Port.create(delegate),
                (error) => new RegExp(`ReumaPopulationReadPort: missing implementation method ${missing}`).test(String((error && error.message) || error)),
                `create() must reject a delegate missing ${missing}`
            );
        }
        const { Port } = createSeamSandbox();
        assert.throws(() => Port.create({}), /ReumaPopulationReadPort: missing implementation method/);
        const port = Port.create({
            getPoblationalData: () => ({ filteredCohort: [], kpis: null, chartData: null }),
            getFarmsDataFromState: () => emptyDrugs(),
        });
        assert.equal(Object.isFrozen(port), true, 'create() must return a frozen port');
        for (const method of PORT_METHODS) assert.equal(typeof port[method], 'function');
        assert.equal(typeof port.readPopulation({}).then, 'function', 'readPopulation() must be Promise-capable');
        record('#456 create() fails closed on a missing method and exposes the frozen read surface',
            true, '');
    }
    {
        const { sandbox, Port } = createSeamSandbox();
        sandbox.HubTools.data = undefined;
        assert.equal(Port.getPort(), null, 'getPort() must be null without HubTools.data');
        sandbox.HubTools.data = { getPoblationalData() { return { filteredCohort: [] }; } };
        assert.equal(Port.getPort(), null, 'getPort() must be null when getFarmsDataFromState is missing');
        sandbox.HubTools.data = {
            getPoblationalData() { return { filteredCohort: [], kpis: null, chartData: null }; },
            getFarmsDataFromState() { return emptyDrugs(); },
        };
        const first = Port.getPort();
        assert.ok(first, 'getPort() must build from an ambient HubTools.data exposing both reads');
        assert.equal(Port.getPort(), first, 'getPort() must cache one singleton');
        record('#456 getPort() is null without the source and a stable singleton with it', true, '');
    }

    // =====================================================================
    // 3. MIGRATION PARITY: same fixture + same filters => same payload as the
    //    legacy call (the acceptance mechanism; it does not canonize legacy).
    // =====================================================================
    {
        const { sandbox, Port } = createSeamSandbox();
        await loadCorpusInto(sandbox);
        const port = Port.getPort();
        const mismatches = [];
        for (const filters of FILTER_SETS) {
            const legacy = sandbox.HubTools.data.getPoblationalData({ ...filters });
            const outcome = await port.readPopulation({ ...filters });
            if (!outcome || outcome.status !== 'ok') {
                mismatches.push(`${canonical(filters)} -> status=${outcome && outcome.status}`);
                continue;
            }
            if (canonical(outcome.payload) !== canonical(legacy)) {
                mismatches.push(`${canonical(filters)} -> payload differs`);
            }
        }
        record('#456 population payload is migration-parity equal to the legacy call on the same fixture/filters',
            mismatches.length === 0,
            `mismatches=${JSON.stringify(mismatches)}`);
    }

    // =====================================================================
    // 4. The filter object is passed through unchanged (identity), never
    //    reinterpreted.
    // =====================================================================
    {
        const { sandbox, Port } = createSeamSandbox();
        sandbox.sessionStorage.setItem('hubClinicoDB', JSON.stringify({ synthetic: true }));
        const received = [];
        const port = Port.create({
            getPoblationalData(filters) {
                received.push(filters);
                return { filteredCohort: [], kpis: null, chartData: null };
            },
            getFarmsDataFromState: () => emptyDrugs(),
        });
        const filters = { pathology: 'AR', activityIndex: 'DAS28_CRP', nested: { values: [1, 2] } };
        const outcome = await port.readPopulation(filters);
        record('#456 readPopulation passes the filter input through without clinical reinterpretation',
            received.length === 1 && received[0] === filters && outcome.status === 'ok',
            `calls=${received.length} identical=${received[0] === filters} status=${outcome.status}`);
    }

    // =====================================================================
    // 5. unavailable / error are explicit and never a valid empty cohort.
    // =====================================================================
    {
        // No readiness signal + a real source that yields the legacy zeroed shape:
        // the empty cohort must NOT be reported as `ok`.
        const { sandbox, Port } = createSeamSandbox();
        const port = Port.getPort();
        const legacy = sandbox.HubTools.data.getPoblationalData({});
        const outcome = await port.readPopulation({});
        record('#456 unavailable is explicit when there is no source (never a valid empty cohort)',
            legacy.filteredCohort.length === 0 && outcome.status === 'unavailable',
            `legacyCohort=${legacy.filteredCohort.length} status=${outcome.status}`);
    }
    {
        // Ready DB with a legitimately empty cohort stays distinguishable as `ok`.
        const { sandbox, Port } = createSeamSandbox();
        await loadCorpusInto(sandbox);
        const port = Port.getPort();
        const outcome = await port.readPopulation({ pathology: 'ESPA', ttoSpecific: 'Sintetico-does-not-exist' });
        record('#456 a ready source with an empty cohort is ok with an empty cohort (distinct from unavailable)',
            outcome.status === 'ok' && Array.isArray(outcome.payload.filteredCohort) && outcome.payload.filteredCohort.length === 0,
            `status=${outcome.status} cohort=${outcome.payload && outcome.payload.filteredCohort && outcome.payload.filteredCohort.length}`);
    }
    {
        const { sandbox, Port } = createSeamSandbox();
        sandbox.sessionStorage.setItem('hubClinicoDB', JSON.stringify({ synthetic: true }));
        const throwing = Port.create({
            getPoblationalData() { throw new Error('planted delegate failure'); },
            getFarmsDataFromState: () => emptyDrugs(),
        });
        const nullish = Port.create({
            getPoblationalData() { return null; },
            getFarmsDataFromState: () => emptyDrugs(),
        });
        const throwingOutcome = await throwing.readPopulation({});
        const nullishOutcome = await nullish.readPopulation({});
        record('#456 error is explicit for a throwing or invalid delegate (never a fabricated cohort)',
            throwingOutcome.status === 'error' && !throwingOutcome.payload &&
            nullishOutcome.status === 'error' && !nullishOutcome.payload,
            `throw=${throwingOutcome.status}/${throwingOutcome.error_code} null=${nullishOutcome.status}/${nullishOutcome.error_code}`);
    }
    {
        // The closed states are distinguishable on the migrated route.
        const ready = createSeamSandbox();
        await loadCorpusInto(ready.sandbox);
        const readyPort = ready.Port.getPort();
        const ok = await readyPort.readPopulation({ pathology: 'ESPA' });
        const empty = await readyPort.readPopulation({ pathology: 'ESPA', ttoSpecific: 'Sintetico-does-not-exist' });

        const unavailable = createSeamSandbox();
        const unavailableOutcome = await unavailable.Port.getPort().readPopulation({});

        const error = createSeamSandbox();
        error.sandbox.sessionStorage.setItem('hubClinicoDB', JSON.stringify({ synthetic: true }));
        const errorOutcome = await error.Port.create({
            getPoblationalData() { throw new Error('planted'); },
            getFarmsDataFromState: () => emptyDrugs(),
        }).readPopulation({});

        record('#456 ok / ok-empty / unavailable / error are distinguishable closed states',
            ok.status === 'ok' && ok.payload.filteredCohort.length > 0 &&
            empty.status === 'ok' && empty.payload.filteredCohort.length === 0 &&
            unavailableOutcome.status === 'unavailable' && errorOutcome.status === 'error',
            `ok=${ok.status}:${ok.payload.filteredCohort.length} empty=${empty.status}:0 ` +
            `unavailable=${unavailableOutcome.status} error=${errorOutcome.status}`);
    }

    // =====================================================================
    // 6. Drug filter options keep the current source's set/order.
    // =====================================================================
    {
        const { sandbox, Port } = createSeamSandbox();
        await loadCorpusInto(sandbox);
        const port = Port.getPort();
        const legacy = sandbox.HubTools.data.getFarmsDataFromState();
        const read = port.readDrugFilterOptions();
        const setOrderOk = read.status === 'ok' &&
            canonical(read.categories) === canonical(legacy) &&
            canonical(read.categories.Tratamientos_Sistemicos) === canonical(SYNTHETIC_DRUGS.Tratamientos_Sistemicos) &&
            canonical(read.categories.FAMEs) === canonical(SYNTHETIC_DRUGS.FAMEs) &&
            canonical(read.categories.Biologicos) === canonical(SYNTHETIC_DRUGS.Biologicos);
        const consumerOrder = new RegExp(`\\[\\s*'Tratamientos_Sistemicos'\\s*,\\s*'FAMEs'\\s*,\\s*'Biologicos'\\s*\\]`).test(CONSUMER_SOURCE);
        record('#456 drug filter options keep the current source set/order and the consumer appends them in that order',
            setOrderOk && consumerOrder,
            `status=${read.status} categories=${canonical(read.categories)} consumerOrder=${consumerOrder}`);
    }
    {
        // A missing source is fail-safe (empty options) and never throws.
        const { Port } = createSeamSandbox();
        const port = Port.create({
            getPoblationalData() { return { filteredCohort: [] }; },
            getFarmsDataFromState() { throw new Error('planted drug failure'); },
        });
        const read = port.readDrugFilterOptions();
        record('#456 a failing drug source fails safe with empty options and no throw',
            read.status === 'error' && canonical(read.categories) === canonical(emptyDrugs()),
            `status=${read.status} categories=${canonical(read.categories)}`);
    }

    // =====================================================================
    // 7. Sentinels 0 / 'NA' / 'ND' / '' cross the seam untouched.
    // =====================================================================
    {
        const { sandbox, Port } = createSeamSandbox();
        await loadCorpusInto(sandbox);
        const port = Port.getPort();
        const outcome = await port.readPopulation({ pathology: 'ESPA' });
        const record100 = outcome.payload.filteredCohort.find((row) => (row.ID_Paciente || row.idPaciente) === 'SYN-ESPA-001');
        const checks = [
            outcome.status === 'ok',
            !!record100,
            Object.is(record100.FR, 0),
            record100.APCC === 'NA',
            Object.is(record100.Dactilitis_Total, 0),
            record100.PCR === 1.1,
        ];
        record("#456 sentinels 0 / 'NA' / 'ND' / '' cross the seam untouched",
            checks.every(Boolean),
            `FR=${canonical(record100 && record100.FR)} APCC=${canonical(record100 && record100.APCC)} ` +
            `Dactilitis_Total=${canonical(record100 && record100.Dactilitis_Total)} PCR=${canonical(record100 && record100.PCR)}`);
    }

    // =====================================================================
    // 8. The seam is read-only: it persists/writes nothing.
    // =====================================================================
    {
        const { sandbox, Port } = createSeamSandbox();
        await loadCorpusInto(sandbox);
        const port = Port.getPort();
        const beforeSession = sandbox.sessionStorage._debugSize();
        const beforeLocal = sandbox.localStorage._debugSize();
        await port.readPopulation({ pathology: 'ESPA' });
        port.readDrugFilterOptions();
        const afterSession = sandbox.sessionStorage._debugSize();
        const afterLocal = sandbox.localStorage._debugSize();
        record('#456 the seam performs no persistence/write against sessionStorage or localStorage',
            beforeSession === afterSession && beforeLocal === afterLocal,
            `session ${beforeSession}->${afterSession} local ${beforeLocal}->${afterLocal}`);
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
console.log(`\nREUMA-ESTADISTICAS-READ-SEAM: ${failed.length === 0 ? 'PASS' : 'FAIL'} ${results.length - failed.length}/${results.length} cases`);
process.exit(failed.length === 0 ? 0 : 1);
