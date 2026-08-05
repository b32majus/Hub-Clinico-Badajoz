#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
global.XLSX = XLSX;
require(path.join(ROOT, 'scripts/farmacia_export_v2_core.js'));
require(path.join(ROOT, 'scripts/farmacia_bridge_v2_reader.js'));

const core = global.FarmaciaExportV2Core;
const reader = global.FarmaciaBridgeV2Reader;
const C = Object.fromEntries(core.ROW_COLUMNS.map((name, index) => [name, index]));
const tests = [];

function test(name, callback) {
    callback();
    tests.push(name);
}

function fixture(name) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2', name), 'utf8'));
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function projectFixtures() {
    const validationFixture = fixture('validation_event_v2.json');
    const firstFixture = fixture('first_visit_event_v2.json');
    const followupFixture = fixture('followup_event_v2.json');
    validationFixture.event.identifier_system = 'urn:promueve:demo';
    validationFixture.event.identifier_value = 'DEMO-001';
    firstFixture.event.identifier_system = null;
    firstFixture.event.identifier_value = null;
    followupFixture.event.identifier_system = 'urn:promueve:demo';
    followupFixture.event.identifier_value = 'DEMO-003';
    const secondFirstLine = Object.assign({}, firstFixture.rowPayloads[0], {
        rowKey: 'line-demo-first-002',
        treatment_id: 'treatment-demo-first-002',
        line_id: 'line-demo-first-002',
        line_role: 'additional',
        is_primary_line: false,
        line_drug_name: 'Fármaco sintético B'
    });
    const validation = core.projectEventRows(validationFixture.event, validationFixture.rowPayloads);
    const firstVisit = core.projectEventRows(firstFixture.event, [firstFixture.rowPayloads[0], secondFirstLine]);
    const followup = core.projectEventRows(followupFixture.event, followupFixture.rowPayloads);
    validation[0].bridge_status = 'PROCESADA';
    return { validation, firstVisit, followup };
}

function cellsForRow(row) {
    return core.serializeRowToTsv(row).split('\t');
}

function workbookWith(dermaRows, digestivoRows, options = {}) {
    const workbook = XLSX.utils.book_new();
    const dermaHeader = options.dermaHeader || core.ROW_COLUMNS.slice();
    const digestivoHeader = options.digestivoHeader || core.ROW_COLUMNS.slice();
    if (!options.omitDerma) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([dermaHeader].concat((dermaRows || []).map(cellsForRow))), '01_DERMA');
    }
    if (!options.omitDigestivo) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([digestivoHeader].concat((digestivoRows || []).map(cellsForRow))), '03_DIGESTIVO');
    }
    return workbook;
}

function read(workbook, fileName = 'synthetic-bridge.xlsx') {
    return reader.readWorkbook(workbook, { core, xlsx: XLSX, fileName, importedAt: '2026-08-05T10:00:00Z' });
}

function expectCode(code, callback) {
    assert.throws(callback, error => {
        assert(error && Array.isArray(error.details), `expected structured details for ${code}`);
        assert(error.details.some(detail => detail.code === code), `expected ${code}, got ${error.details.map(detail => detail.code).join(',')}`);
        return true;
    });
}

function setPhysicalCell(workbook, sheetName, rowNumber, columnName, cell) {
    const sheet = workbook.Sheets[sheetName];
    const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: C[columnName] });
    sheet[address] = cell;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    range.e.r = Math.max(range.e.r, rowNumber - 1);
    range.e.c = Math.max(range.e.c, C[columnName]);
    sheet['!ref'] = XLSX.utils.encode_range(range);
}

function canonicalCell(value) {
    if (value === null) return '';
    if (value === true) return 'TRUE';
    if (value === false) return 'FALSE';
    return core.stableStringify(value);
}

function overrideRow(row, overrides) {
    const result = Object.assign({}, row, overrides);
    assert(core.validateRow(result).valid, 'test override must remain a valid canonical row');
    return result;
}

function bridgeState(model) {
    return {
        kind: 'farmacia',
        format: 'farmacia_bridge_v2_raw',
        sourceLabel: 'Farmacia',
        fileName: 'synthetic.xlsx',
        importedAt: '2026-08-05T10:00:00Z',
        rowCount: model.metadata.row_count,
        eventCount: model.metadata.event_count,
        patientCount: model.metadata.patient_count,
        bridgeReadModel: model,
        storage: 'session'
    };
}

function loadCommonWithStoredStates(states) {
    const values = {};
    Object.keys(states || {}).forEach(kind => {
        values[`farmaciaDemo.${kind}Import`] = JSON.stringify(states[kind]);
    });
    const storage = {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        removeItem(key) { delete values[key]; }
    };
    const document = {
        addEventListener() {},
        dispatchEvent() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        getElementById() { return null; }
    };
    const window = {
        document,
        sessionStorage: storage,
        localStorage: storage,
        location: { href: '', search: '' },
        addEventListener() {},
        dispatchEvent() {},
        FarmaciaExportV2Core: core,
        FarmaciaBridgeV2Reader: reader
    };
    const sandbox = {
        window,
        document,
        sessionStorage: storage,
        localStorage: storage,
        console: { log() {}, warn() {}, error() {} },
        CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
        URLSearchParams,
        Date,
        setTimeout() {},
        clearTimeout() {}
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'scripts/farmacia_common.js'), 'utf8'), sandbox);
    return sandbox.window.FarmaciaDataImports;
}

const rows = projectFixtures();

test('valid two-sheet Bridge preserves 1..N, states, JSON and identity', () => {
    const model = read(workbookWith(rows.validation.concat(rows.firstVisit), rows.followup));
    assert.strictEqual(model.metadata.row_count, 5);
    assert.strictEqual(model.metadata.event_count, 3);
    assert.strictEqual(model.metadata.patient_count, 3);
    assert.strictEqual(model.events.find(event => event.event_type === 'pharmacy_validation').rows.length, 1);
    assert.strictEqual(model.events.find(event => event.event_type === 'pharmacy_first_visit').rows.length, 2);
    assert.strictEqual(model.events.find(event => event.event_type === 'pharmacy_followup').rows.length, 2);
    assert.deepStrictEqual(model.events.map(event => event.rows[0].canonical_row.bridge_status), ['PROCESADA', 'PENDIENTE', 'PENDIENTE']);
    const validation = model.events[0].rows[0].canonical_row;
    assert.strictEqual(validation.hemogram_verified, false);
    assert.strictEqual(validation.clinical_observations_json.score_zero, 0);
    assert.strictEqual(validation.clinical_observations_json.empty_text, '');
    assert.strictEqual(validation.clinical_observations_json.absent, null);
    assert.strictEqual(model.events[1].rows[0].source_sheet, '01_DERMA');
    assert.strictEqual(model.events[1].rows[0].source_table, 'tblBridgeDermaInput');
    assert.strictEqual(model.events[1].rows[0].physical_row_number, 3);
    assert.strictEqual(model.indexes.by_identifier['urn:promueve:demo']['DEMO-001'].patient_id, 'patient-synthetic-001');
    assert.strictEqual(model.patients['patient-synthetic-002'].identifiers.length, 0);
    assert.strictEqual(model.warnings.length, 0);
    assert.strictEqual(JSON.stringify(JSON.parse(JSON.stringify(model))), JSON.stringify(model));
});

test('published empty workbook is recognized and serializable', () => {
    const published = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx')), { type: 'buffer' });
    const model = read(published, 'PROMueve_FH_Caceres_Bridge_DEMO.xlsx');
    assert.strictEqual(model.metadata.row_count, 0);
    assert.strictEqual(model.metadata.event_count, 0);
    assert.strictEqual(JSON.parse(JSON.stringify(model)).read_model_version, reader.READER_VERSION);
});

test('legacy workbook has no Bridge signal and remains legacy', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['CIP', 'Fármaco'], ['CIP-DEMO-LEGACY', 'Sintético']]), 'Farmacia');
    assert.strictEqual(reader.inspectWorkbook(workbook, { core, xlsx: XLSX }).kind, 'legacy');
    assert.strictEqual(read(workbook, 'legacy.xlsx'), null);
    const publishedLegacy = XLSX.read(fs.readFileSync(path.join(ROOT, 'templates/farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx')), { type: 'buffer' });
    assert.strictEqual(reader.inspectWorkbook(publishedLegacy, { core, xlsx: XLSX }).kind, 'legacy');
    assert.strictEqual(read(publishedLegacy, 'farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx'), null);
});

test('partial Bridge signals never fall back to legacy', () => {
    expectCode('BRIDGE_REQUIRED_SHEET_MISSING', () => read(workbookWith([], [], { omitDigestivo: true })));
    const wrongNames = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wrongNames, XLSX.utils.aoa_to_sheet([core.ROW_COLUMNS.slice()]), 'RENAMED_BRIDGE');
    expectCode('BRIDGE_REQUIRED_SHEET_MISSING', () => read(wrongNames));
    const singleSignal = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(singleSignal, XLSX.utils.aoa_to_sheet([['bridge_status', 'legacy_other']]), 'Farmacia');
    expectCode('BRIDGE_REQUIRED_SHEET_MISSING', () => read(singleSignal));
});

test('renamed, reordered, duplicate, 151 and 153 headers are rejected', () => {
    const renamed = core.ROW_COLUMNS.slice(); renamed[4] = 'event_schema_version_changed';
    expectCode('BRIDGE_HEADER_MISMATCH', () => read(workbookWith([], [], { dermaHeader: renamed })));
    const reordered = core.ROW_COLUMNS.slice(); [reordered[4], reordered[5]] = [reordered[5], reordered[4]];
    expectCode('BRIDGE_HEADER_MISMATCH', () => read(workbookWith([], [], { dermaHeader: reordered })));
    const duplicate = core.ROW_COLUMNS.slice(); duplicate[5] = duplicate[4];
    expectCode('BRIDGE_DUPLICATE_HEADER', () => read(workbookWith([], [], { dermaHeader: duplicate })));
    expectCode('BRIDGE_HEADER_COUNT_MISMATCH', () => read(workbookWith([], [], { dermaHeader: core.ROW_COLUMNS.slice(0, 151) })));
    expectCode('BRIDGE_HEADER_COUNT_MISMATCH', () => read(workbookWith([], [], { dermaHeader: core.ROW_COLUMNS.concat('extra_column') })));
});

test('formula, numeric and boolean physical cells block the full import', () => {
    let workbook = workbookWith(rows.validation, []);
    setPhysicalCell(workbook, '01_DERMA', 2, 'requested_drug_name', { t: 'n', v: 2, f: '1+1' });
    expectCode('BRIDGE_FORMULA_DETECTED', () => read(workbook));
    workbook = workbookWith(rows.validation, []);
    setPhysicalCell(workbook, '01_DERMA', 2, 'row_index', { t: 'n', v: 1 });
    expectCode('BRIDGE_CELL_COERCED', () => read(workbook));
    workbook = workbookWith(rows.validation, []);
    setPhysicalCell(workbook, '01_DERMA', 2, 'demo_flag', { t: 'b', v: true });
    expectCode('BRIDGE_CELL_COERCED', () => read(workbook));
    workbook = workbookWith(rows.validation, []);
    setPhysicalCell(workbook, '01_DERMA', 1, 'bridge_status', { t: 's', v: 'bridge_status', f: '"bridge_status"' });
    expectCode('BRIDGE_FORMULA_DETECTED', () => read(workbook));
});

test('noncanonical JSON and unsupported versions are rejected', () => {
    let workbook = workbookWith(rows.validation, []);
    setPhysicalCell(workbook, '01_DERMA', 2, 'validation_blockers_json', { t: 's', v: '[] ' });
    expectCode('BRIDGE_INVALID_CANONICAL_CELL', () => read(workbook));
    workbook = workbookWith(rows.validation, []);
    setPhysicalCell(workbook, '01_DERMA', 2, 'row_schema_version', { t: 's', v: canonicalCell('9.0.0') });
    expectCode('BRIDGE_UNSUPPORTED_VERSION', () => read(workbook));
});

test('source_event_id cannot cross sheets', () => {
    expectCode('BRIDGE_SOURCE_EVENT_CONFLICT', () => read(workbookWith(rows.validation, rows.validation)));
});

test('incomplete set, row_count, duplicate row_id and common mismatch are rejected', () => {
    expectCode('BRIDGE_INCOMPLETE_EVENT', () => read(workbookWith([rows.firstVisit[0]], [])));
    let changed = rows.firstVisit.map(row => Object.assign({}, row));
    changed[1] = overrideRow(changed[1], { row_count: 3 });
    expectCode('BRIDGE_INCOMPLETE_EVENT', () => read(workbookWith(changed, [])));
    changed = rows.firstVisit.map(row => Object.assign({}, row));
    changed[1] = overrideRow(changed[1], { row_id: changed[0].row_id });
    expectCode('BRIDGE_DUPLICATE_ROW_ID', () => read(workbookWith(changed, [])));
    changed = rows.firstVisit.map(row => Object.assign({}, row));
    changed[1] = overrideRow(changed[1], { patient_id: 'patient-synthetic-conflict' });
    expectCode('BRIDGE_INCONSISTENT_EVENT', () => read(workbookWith(changed, [])));
});

test('event_id conflicts and duplicate event identities are rejected', () => {
    let changed = rows.firstVisit.map(row => Object.assign({}, row));
    changed[1] = overrideRow(changed[1], { event_id: 'evt-conflict' });
    expectCode('BRIDGE_EVENT_ID_CONFLICT', () => read(workbookWith(changed, [])));
    const duplicateEvent = overrideRow(rows.validation[0], {
        source_event_id: 'src-demo-validation-duplicate',
        row_id: 'row-demo-validation-duplicate'
    });
    expectCode('BRIDGE_DUPLICATE_SOURCE_EVENT', () => read(workbookWith([rows.validation[0], duplicateEvent], [])));
});

test('ERROR in one multiline row excludes the complete act', () => {
    const changed = rows.followup.map(row => Object.assign({}, row));
    changed[1] = overrideRow(changed[1], { bridge_status: 'ERROR', bridge_error_code: 'SYNTHETIC_ERROR' });
    const model = read(workbookWith([], changed));
    assert.strictEqual(model.events.length, 0);
    assert.strictEqual(model.excluded_events.length, 1);
    assert.strictEqual(model.excluded_events[0].rows.length, 2);
    assert.strictEqual(model.metadata.patient_count, 0);
});

test('incomplete explicit identifier warns and does not index', () => {
    const changed = [overrideRow(rows.validation[0], { identifier_value: null })];
    const model = read(workbookWith(changed, []));
    assert.strictEqual(model.events.length, 1);
    assert.strictEqual(model.warnings[0].code, 'IDENTIFIER_PAIR_INCOMPLETE');
    assert.strictEqual(Object.keys(model.indexes.by_identifier).length, 0);
    assert(model.patients['patient-synthetic-001']);
});

test('later explicit identifier enriches an initially unidentified patient', () => {
    const first = overrideRow(rows.validation[0], { identifier_system: null, identifier_value: null });
    const second = overrideRow(rows.validation[0], {
        event_id: 'evt-demo-validation-enriched',
        source_event_id: 'src-demo-validation-enriched',
        row_id: 'row-demo-validation-enriched',
        identifier_system: 'urn:promueve:demo',
        identifier_value: 'DEMO-ENRICHED'
    });
    const model = read(workbookWith([first, second], []));
    assert.strictEqual(model.patients['patient-synthetic-001'].identifiers.length, 1);
    assert.strictEqual(model.indexes.by_identifier['urn:promueve:demo']['DEMO-ENRICHED'].patient_id, 'patient-synthetic-001');
});

test('patient and identifier mapping conflicts block import', () => {
    const patientConflict = overrideRow(rows.validation[0], {
        event_id: 'evt-patient-conflict',
        source_event_id: 'src-patient-conflict',
        row_id: 'row-patient-conflict',
        identifier_value: 'DEMO-OTHER'
    });
    expectCode('PATIENT_IDENTITY_CONFLICT', () => read(workbookWith([rows.validation[0], patientConflict], [])));
    const mappingConflict = overrideRow(rows.validation[0], {
        event_id: 'evt-mapping-conflict',
        source_event_id: 'src-mapping-conflict',
        row_id: 'row-mapping-conflict',
        patient_id: 'patient-synthetic-other'
    });
    expectCode('IDENTIFIER_MAPPING_CONFLICT', () => read(workbookWith([rows.validation[0], mappingConflict], [])));
});

test('prototype-like valid identities remain serializable and indexed', () => {
    const dangerous = overrideRow(rows.validation[0], {
        event_id: 'toString',
        source_event_id: '__proto__',
        row_id: 'safe-row-id',
        patient_id: 'constructor',
        identifier_system: '__proto__',
        identifier_value: 'toString'
    });
    const model = read(workbookWith([dangerous], []));
    assert.strictEqual(model.events[0].source_event_id, '__proto__');
    assert.strictEqual(model.patients.constructor.patient_id, 'constructor');
    assert.strictEqual(model.indexes.by_identifier.__proto__.toString.patient_id, 'constructor');
    assert.strictEqual(JSON.parse(JSON.stringify(model)).patients.constructor.patient_id, 'constructor');
});

test('FarmaciaDataImports restores Bridge without flattening it and preserves legacy adapters', () => {
    const model = read(workbookWith(rows.validation, []));
    const enfermeria = {
        kind: 'enfermeria', sourceLabel: 'Enfermería', mappedFields: { cip: 'cip_demo_o_hash' },
        rows: [{ cip_demo_o_hash: 'CIP-DEMO-NURSING' }]
    };
    const imports = loadCommonWithStoredStates({ farmacia: bridgeState(model), enfermeria });
    assert.strictEqual(imports.getBridgeReadModel().metadata.event_count, 1);
    assert.strictEqual(imports.getImportedPatients().length, 1);
    assert.strictEqual(imports.getImportedPatients()[0].cip, 'CIP-DEMO-NURSING');
    assert(imports.formatImportStatus('farmacia').includes('1 filas · 1 actos · 1 pacientes'));

    const legacyFarmacia = {
        kind: 'farmacia', sourceLabel: 'Farmacia', mappedFields: { cip: 'CIP' }, rows: [{ CIP: 'CIP-DEMO-LEGACY' }]
    };
    const legacyImports = loadCommonWithStoredStates({ farmacia: legacyFarmacia });
    assert.strictEqual(legacyImports.getBridgeReadModel(), null);
    assert.strictEqual(legacyImports.getImportedPatients().length, 1);
    assert.strictEqual(legacyImports.getImportedPatients()[0].cip, 'CIP-DEMO-LEGACY');
});

test('integration source keeps session and memory_only paths without localStorage Bridge persistence', () => {
    const source = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_common.js'), 'utf8');
    const bridgeStart = source.indexOf("if (kind === 'farmacia')");
    const genericStart = source.indexOf('// Generic import', bridgeStart);
    const bridgeBlock = source.slice(bridgeStart, genericStart);
    assert(bridgeBlock.includes("storage: 'session'"));
    assert(bridgeBlock.includes("bridgeState.storage = 'memory_only'"));
    assert(bridgeBlock.includes('safeSetSessionStorage'));
    assert(!bridgeBlock.includes('localStorage'));
    assert(source.includes("emitImportEvent(kind, { format: bridgeState.format, state: bridgeState })"));
});

const fixtureOutputArg = process.argv.indexOf('--emit-browser-fixtures');
if (fixtureOutputArg !== -1) {
    const outputDirectory = process.argv[fixtureOutputArg + 1];
    assert(outputDirectory, '--emit-browser-fixtures requires an output directory');
    const validWorkbook = workbookWith(rows.validation.concat(rows.firstVisit), rows.followup);
    const damagedWorkbook = workbookWith(rows.validation.concat(rows.firstVisit), rows.followup);
    setPhysicalCell(damagedWorkbook, '01_DERMA', 2, 'requested_drug_name', { t: 'n', v: 2, f: '1+1' });
    fs.writeFileSync(path.join(outputDirectory, 'farmacia_bridge_v2_browser_valid.xlsx'), XLSX.write(validWorkbook, { type: 'buffer', bookType: 'xlsx' }));
    fs.writeFileSync(path.join(outputDirectory, 'farmacia_bridge_v2_browser_damaged.xlsx'), XLSX.write(damagedWorkbook, { type: 'buffer', bookType: 'xlsx' }));
    console.log(`browser_fixtures=${outputDirectory}`);
}

console.log(`farmacia_bridge_v2_reader_check: PASS (${tests.length} cases)`);
tests.forEach(name => console.log(`PASS ${name}`));
