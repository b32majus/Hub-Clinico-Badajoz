#!/usr/bin/env node
'use strict';

// Check focal EA v1 demo (#867), Tramo D2: libro Bridge con cabecera 166 en
// transición mixta (adenda C1 del 29-10-2026,
// docs/contracts/FH_BRIDGE_RAW_EA_0N_C1_ADENDA_TRANSICION_MIXTA_20261029.md).
//
//  - Cabecera de 166 columnas (prefijo V2 de 152 + 14 nuevas).
//  - Cada fila se clasifica por su versión DECLARADA: `2.0.0-draft.1` = fila
//    V2 con las 14 columnas nuevas vacías; `2.1.0-draft.1` = fila tipada 166.
//  - Un acto, una versión. Identidad patient_id ↔ fh_patient_ref leída de las
//    filas y 1↔1 en todo el libro.
//  - Camino antiguo: las filas V2 como hoy; un Seguimiento 166 se proyecta con
//    sus filas `followup_act` + `followup_line` reducidas al prefijo de 152,
//    sin EA antiguo.
//  - Camino nuevo: `RawExcelDataSource.getAdverseEventEpisodes(patientId)` →
//    lector C3a sobre las filas 166 de ese paciente; sin filas 166 → null.
//  - Libros de 152 sin cambios. Todo rechazo es cerrado.

const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
global.XLSX = XLSX;
global.window = global;
global.HubTools = {};
const quiet = { log() {}, warn() {}, error() {} };
const realConsole = global.console;
global.console = quiet;
[
    'scripts/farmacia_export_v2_core.js',
    'scripts/farmacia_bridge_ea_typed_codec.js',
    'modules/farmacia_act_contract.js',
    'modules/farmacia_act_payloads.js',
    'modules/farmacia_ea_invariants.js',
    'modules/farmacia_ea_patient_projection.js',
    'modules/farmacia_ea_episode_state.js',
    'scripts/farmacia_bridge_raw_ea_v21_core.js',
    'scripts/farmacia_bridge_raw_ea_v21_reader.js',
    'modules/farmacia_ea_screen_model.js',
    'scripts/farmacia_bridge_v2_reader.js',
    'scripts/farmacia_bridge_v2_patient_selectors.js',
    'scripts/farmacia_application_data_port.js',
    'scripts/farmacia_raw_excel_data_source.js',
    'scripts/farmacia_patient_read_contract_v2.js'
].forEach(file => require(path.join(ROOT, file)));
global.console = realConsole;

const v2 = global.FarmaciaExportV2Core;
const v21 = global.FarmaciaBridgeRawEaV21Core;
const reader = global.FarmaciaBridgeV2Reader;
const dataSource = global.FarmaciaRawExcelDataSource;
const contract = global.FarmaciaPatientReadContractV2;
const screen = global.HubTools.farmaciaEaScreenModel;
const fixture = name => require(path.join(ROOT, 'data/demo/farmacia/export_v2', name));
const clone = value => JSON.parse(JSON.stringify(value));

assert.equal(v21.ROW_COLUMNS.length, 166);
assert.deepEqual(v21.ROW_COLUMNS.slice(0, 152), v2.ROW_COLUMNS.slice(), 'prefijo V2 intacto');
const EXTRA = v21.ROW_COLUMNS.slice(152);

// --- Filas sintéticas -------------------------------------------------------
const PID = 'patient-mixed-001';
const REF = 'PATREF-MIX';
const IDSYS = 'DEMO';
const IDVAL = 'CIP-MIX-001';

function validationRows(overrides = {}) {
    const f = clone(fixture('validation_event_v2.json'));
    Object.assign(f.event, { patient_id: PID, identifier_system: IDSYS, identifier_value: IDVAL }, overrides);
    return v2.projectEventRows(f.event, f.rowPayloads);
}
function legacyFollowupRows() {
    const f = clone(fixture('followup_event_v2.json'));
    Object.assign(f.event, { identifier_system: IDSYS, identifier_value: 'CIP-LEGACY-003' });
    return v2.projectEventRows(f.event, f.rowPayloads);
}
const event = (id, date, patient = PID, identifierValue = IDVAL) => ({
    event_id: id, source_event_id: id + '-SRC', event_type: 'pharmacy_followup',
    event_status: 'completed', occurred_at: date + 'T10:00:00Z', recorded_at: date + 'T10:05:00Z',
    demo_flag: true, patient_id: patient, identifier_system: IDSYS, identifier_value: identifierValue,
    visit_id: id + '-VIS', visit_date: date, service_code: 'DERMA'
});
const line = id => ({
    rowKey: id, treatment_id: 'TR-' + id, line_id: id, line_role: 'principal',
    is_primary_line: true, line_status_at_event: 'active', active_at_event: true, line_drug_name: 'SINTETICO'
});
const obs = (act, fields, ref = REF) => ({
    patientRef: ref, actId: act, episode_id: 'E1', observation_id: 'O1',
    status: 'incorporated', description: 'Cefalea', ...fields
});
const refOf = o => ({ patientRef: o.patientRef, actId: o.actId, episode_id: o.episode_id, observation_id: o.observation_id });
const o1 = obs('ACT-A', {
    suspicions: [{ patientRef: REF, episode_id: 'E1', medicationRef: 'LINE-A' }],
    evaluations: [{ evaluation_id: 'EV-1', patientRef: REF, episode_id: 'E1', medicationRef: 'LINE-A', method: 'Naranjo', actId: 'ACT-A' }]
});
const o9 = obs('ACT-A', { observation_id: 'O9', episode_id: 'E9', description: 'Náuseas' });
const o2 = obs('ACT-B', { observation_id: 'O2', basis: refOf(o1), evolution: 'continuation', description: 'Cefalea persiste' });
function typedAct({ id, actId, date, observations = [], history = [], present = 'si', patient = PID, ref = REF, identifierValue = IDVAL }) {
    return v21.buildFollowupRows({
        event: event(id, date, patient, identifierValue), actId, patientRef: ref, present,
        activeLines: [line('LINE-A')], adverse_events: observations, history, selections: []
    });
}
const actA = () => typedAct({ id: 'EV-A', actId: 'ACT-A', date: '2026-09-10', observations: [o1, o9] });
const actB = () => typedAct({ id: 'EV-B', actId: 'ACT-B', date: '2026-10-10', observations: [o2], history: [o1] });

// Celdas físicas: V2 = 152 + 14 vacías; 166 = TSV del core 166.
const v2Cells = row => v2.serializeRowToTsv(row).split('\t').concat(EXTRA.map(() => ''));
const typedCells = rows => v21.serializeRowsToTsv(rows).split('\n').map(text => text.split('\t'));

function workbook(dermaCells, digestivoCells = [], header = v21.ROW_COLUMNS.slice()) {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([header].concat(dermaCells)), '01_DERMA');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([header].concat(digestivoCells)), '03_DIGESTIVO');
    return book;
}
const read = book => reader.readWorkbook(book, { core: v2, xlsx: XLSX, fileName: 'mixto.xlsx', importedAt: '2026-10-29T10:00:00Z' });
const sourceOf = book => dataSource.create(read(book));
function expectCode(code, callback) {
    assert.throws(callback, error => {
        const codes = [error && error.code].concat(Array.isArray(error && error.details) ? error.details.map(d => d.code) : []);
        assert.ok(codes.includes(code), `se esperaba ${code}, llegó ${codes.join(',')}`);
        return true;
    });
}

const mixedCells = () => [
    ...validationRows().map(v2Cells),
    ...typedCells(actA()),
    ...typedCells(actB())
];
let passed = 0;
const test = (label, fn) => { fn(); passed += 1; };

// 1. El libro mixto se lee; camino antiguo intacto para las filas V2.
test('libro mixto: camino antiguo', () => {
    const source = sourceOf(workbook(mixedCells(), legacyFollowupRows().map(v2Cells)));
    assert.ok(source.findByPatientId(PID), 'el paciente mixto existe en el camino antiguo');
    assert.ok(source.findByPatientId('patient-synthetic-003'), 'el paciente V2 puro sigue existiendo');
    const latest = source.getLatestRequestValidation(PID);
    assert.ok(latest && latest.latest_validation, 'la validación V2 sigue leyéndose');

    // Seguimiento 166 proyectado: fecha, líneas y adherencia; sin EA antiguo.
    const visits = source.getVisitsAndLines(PID);
    assert.equal(visits.latest_followup.event_id, 'EV-B');
    assert.equal(visits.lines.length, 1);
    assert.equal(visits.lines[0].line_id, 'LINE-A');
    assert.equal(visits.lines[0].event_id, 'EV-B');
    const events = source.getPatientEvents(PID);
    const typedEvent = events.find(e => e.event_id === 'EV-A');
    assert.ok(typedEvent, 'el acto 166 aparece como evento del camino antiguo');
    assert.deepEqual(typedEvent.rows.map(r => r.canonical_row.row_role), ['followup_act', 'followup_line'],
        'solo la fila de acto y las de línea; las filas EA no entran en el camino antiguo');
    for (const e of events) for (const r of e.rows) {
        assert.deepEqual(Object.keys(r.canonical_row), v2.ROW_COLUMNS.slice(), 'filas del camino antiguo = prefijo de 152');
    }
    const safety = source.getAdverseEventsAndCausality(PID);
    assert.ok(safety.adverse_events.length > 0);
    assert.ok(safety.adverse_events.every(r => r.values.adverse_event_status === null),
        'EA antiguo no se rellena desde EA 166: no registrado, nunca «sin EA»');
});

// 2. Camino nuevo: episodios EA desde las filas 166.
test('libro mixto: camino nuevo', () => {
    const source = sourceOf(workbook(mixedCells(), legacyFollowupRows().map(v2Cells)));
    assert.equal(typeof source.getAdverseEventEpisodes, 'function');
    const result = source.getAdverseEventEpisodes(PID);
    assert.equal(result.ok, true, JSON.stringify(result.error || null));
    assert.equal(result.patientRef, REF, 'identidad leída de las filas, no inferida');
    assert.equal(result.actCount, 2);
    const e1 = result.state.episodes.find(e => e.episode_id === 'E1');
    assert.equal(e1.lastObservationId, 'O2');
    assert.equal(e1.lastDate, '2026-10-10');
    assert.equal(result.state.episodes.find(e => e.episode_id === 'E9').lastDate, '2026-09-10');
    assert.equal(source.getAdverseEventEpisodes('patient-synthetic-003'), null, 'paciente sin filas 166 → null');
    assert.equal(source.getAdverseEventEpisodes('nadie'), null);

    const first = source.getAdverseEventEpisodes(PID);
    first.projection.episodes.length = 0;
    first.patientRef = 'MUTADO';
    assert.deepEqual(source.getAdverseEventEpisodes(PID), result, 'mutar el resultado no contamina la siguiente lectura');

    // De punta a punta: contrato V2 → modelo de pantalla.
    const envelope = contract.create({ source }).readAdverseEventEpisodes(PID);
    assert.equal(envelope.outcome, 'ok');
    const model = screen.build(Object.assign({ ok: true }, envelope.value));
    assert.equal(model.ok, true, JSON.stringify(model.error || null));
    assert.equal(model.episodes.find(e => e.episode_id === 'E1').statusText, 'Último estado registrado: continúa, el 2026-10-10');
    assert.deepEqual(model.episodes.find(e => e.episode_id === 'E1').suspects, ['LINE-A']);
    assert.equal(contract.create({ source }).readAdverseEventEpisodes('patient-synthetic-003').outcome, 'not_found');
});

// 3. Libro de 152 columnas: sin cambios y sin EA 166.
test('libro 152 sin cambios', () => {
    const book = XLSX.utils.book_new();
    const header = v2.ROW_COLUMNS.slice();
    const cells = row => v2.serializeRowToTsv(row).split('\t');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([header].concat(validationRows().map(cells))), '01_DERMA');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([header].concat(legacyFollowupRows().map(cells))), '03_DIGESTIVO');
    const source = sourceOf(book);
    assert.ok(source.findByPatientId(PID));
    assert.equal(source.getAdverseEventEpisodes(PID), null, 'un libro 152 no afirma EA 0..N');
});

// 4. Libro de cabecera 166 solo con filas V2: válido, sin EA 166.
test('cabecera 166 solo con filas V2', () => {
    const source = sourceOf(workbook(validationRows().map(v2Cells), legacyFollowupRows().map(v2Cells)));
    assert.ok(source.findByPatientId(PID));
    assert.equal(source.getAdverseEventEpisodes(PID), null);
});

// 5. Rechazos cerrados.
test('rechazos', () => {
    // Fila V2 con una columna nueva rellena.
    const dirty = validationRows().map(v2Cells);
    dirty[0][153] = JSON.stringify(REF);
    expectCode('BRIDGE_V2_ROW_EXTRA_COLUMNS', () => read(workbook(dirty)));

    // Versión de fila desconocida.
    const unknown = mixedCells();
    unknown[0][v2.ROW_COLUMNS.indexOf('row_schema_version')] = JSON.stringify('9.9.9');
    expectCode('BRIDGE_UNSUPPORTED_VERSION', () => read(workbook(unknown)));

    // Un acto en dos versiones (mismo source_event_id).
    const clash = validationRows({ source_event_id: 'EV-A-SRC' }).map(v2Cells);
    expectCode('BRIDGE_MIXED_EVENT_VERSION', () => read(workbook([...clash, ...typedCells(actA())])));

    // Acto 166 incompleto (falta una fila EA).
    const incomplete = typedCells(actA());
    incomplete.splice(incomplete.length - 1, 1);
    expectCode('BRIDGE_INVALID_TYPED_EVENT', () => read(workbook(incomplete)));

    // Identidad: un patient_id con dos fh_patient_ref.
    const otherRef = typedAct({ id: 'EV-Z', actId: 'ACT-Z', date: '2026-10-20', present: 'no', ref: 'PATREF-OTRO' });
    expectCode('BRIDGE_PATIENT_REF_CONFLICT', () => read(workbook([...typedCells(actA()), ...typedCells(otherRef)])));
    // Identidad: un fh_patient_ref con dos patient_id.
    const otherPatient = typedAct({ id: 'EV-Y', actId: 'ACT-Y', date: '2026-10-20', present: 'no', patient: 'patient-mixed-002', identifierValue: 'CIP-MIX-002' });
    expectCode('BRIDGE_PATIENT_REF_CONFLICT', () => read(workbook([...typedCells(actA()), ...typedCells(otherPatient)])));

    // Cabecera 166 en otro orden.
    const swapped = v21.ROW_COLUMNS.slice();
    [swapped[152], swapped[153]] = [swapped[153], swapped[152]];
    expectCode('BRIDGE_HEADER_MISMATCH', () => read(workbook(mixedCells(), [], swapped)));

    // Cabecera 166 sin el core 166 cargado.
    const saved = global.FarmaciaBridgeRawEaV21Core;
    delete global.FarmaciaBridgeRawEaV21Core;
    try {
        expectCode('BRIDGE_DEPENDENCY_MISSING', () => read(workbook(mixedCells())));
    } finally {
        global.FarmaciaBridgeRawEaV21Core = saved;
    }
});

console.log(`farmacia_bridge_v21_mixed_workbook_check OK (${passed} casos)`);
