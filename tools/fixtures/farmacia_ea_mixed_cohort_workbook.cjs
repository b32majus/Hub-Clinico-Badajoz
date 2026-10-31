'use strict';

// Libro mixto sintético para EA v1 demo (#867, D3c): cabecera 166 con
//  - CIP-MIX-001: validación V2 + dos seguimientos 166 (episodios E1 y E9;
//    E1 continúa, con sospecha LINE-A «SINTETICO» y evaluación Naranjo);
//  - CIP-MIX-002: un seguimiento 166 (episodio Z1 «Prurito», sospecha LINE-Z
//    «OTRO SINTETICO», sin evaluación);
//  - CIP-LEGACY-003: seguimiento V2 heredado, sin filas 166 (no leído ≠ sin EA).
// Solo datos sintéticos. `loadModules()` carga en el global de Node los
// módulos que hacen falta para construir y leer el libro.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULES = [
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
    'scripts/farmacia_patient_read_contract_v2.js',
    'scripts/farmacia_statistics_cohort.js',
    'scripts/farmacia_statistics_handoff.js'
];

function loadModules() {
    if (!global.XLSX) global.XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
    if (!global.window) global.window = global;
    if (!global.HubTools) global.HubTools = {};
    const realConsole = global.console;
    global.console = { log() {}, warn() {}, error() {} };
    try {
        MODULES.forEach(file => require(path.join(ROOT, file)));
    } finally {
        global.console = realConsole;
    }
}

const IDSYS = 'DEMO';
const P1 = { pid: 'patient-mixed-001', ref: 'PATREF-MIX', cip: 'CIP-MIX-001', line: 'LINE-A', drug: 'SINTETICO' };
const P2 = { pid: 'patient-mixed-002', ref: 'PATREF-MIX2', cip: 'CIP-MIX-002', line: 'LINE-Z', drug: 'OTRO SINTETICO' };
const LEGACY_CIP = 'CIP-LEGACY-003';

const fixture = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2', name), 'utf8'));
const event = (p, id, date) => ({
    event_id: id, source_event_id: id + '-SRC', event_type: 'pharmacy_followup',
    event_status: 'completed', occurred_at: date + 'T10:00:00Z', recorded_at: date + 'T10:05:00Z',
    demo_flag: true, patient_id: p.pid, identifier_system: IDSYS, identifier_value: p.cip,
    visit_id: id + '-VIS', visit_date: date, service_code: 'DERMA'
});
const line = p => ({
    rowKey: p.line, treatment_id: 'TR-' + p.line, line_id: p.line, line_role: 'principal',
    is_primary_line: true, line_status_at_event: 'active', active_at_event: true, line_drug_name: p.drug
});
const obs = (p, act, fields) => ({
    patientRef: p.ref, actId: act, episode_id: 'E1', observation_id: 'O1',
    status: 'incorporated', description: 'Cefalea', ...fields
});
const refOf = o => ({ patientRef: o.patientRef, actId: o.actId, episode_id: o.episode_id, observation_id: o.observation_id });

function rows() {
    const v2 = global.FarmaciaExportV2Core;
    const v21 = global.FarmaciaBridgeRawEaV21Core;
    const EXTRA = v21.ROW_COLUMNS.slice(152);
    const validation = fixture('validation_event_v2.json');
    Object.assign(validation.event, { patient_id: P1.pid, identifier_system: IDSYS, identifier_value: P1.cip });
    const legacy = fixture('followup_event_v2.json');
    Object.assign(legacy.event, { identifier_system: IDSYS, identifier_value: LEGACY_CIP });
    const o1 = obs(P1, 'ACT-A', {
        suspicions: [{ patientRef: P1.ref, episode_id: 'E1', medicationRef: P1.line }],
        evaluations: [{ evaluation_id: 'EV1', patientRef: P1.ref, actId: 'ACT-A', episode_id: 'E1', medicationRef: P1.line, method: 'naranjo', result: 5 }]
    });
    const o9 = obs(P1, 'ACT-A', { observation_id: 'O9', episode_id: 'E9', description: 'Náuseas' });
    const o2 = obs(P1, 'ACT-B', { observation_id: 'O2', basis: refOf(o1), evolution: 'continuation', description: 'Cefalea persiste' });
    const z1 = obs(P2, 'ACT-Z', {
        episode_id: 'Z1', observation_id: 'OZ1', description: 'Prurito',
        suspicions: [{ patientRef: P2.ref, episode_id: 'Z1', medicationRef: P2.line }]
    });
    const typedAct = (p, id, actId, date, observations, history = []) => v21.buildFollowupRows({
        event: event(p, id, date), actId, patientRef: p.ref, present: 'si',
        activeLines: [line(p)], adverse_events: observations, history, selections: []
    });
    const v2Cells = row => v2.serializeRowToTsv(row).split('\t').concat(EXTRA.map(() => ''));
    const typedCells = built => v21.serializeRowsToTsv(built).split('\n').map(text => text.split('\t'));
    return {
        header: v21.ROW_COLUMNS.slice(),
        derma: [
            ...v2.projectEventRows(validation.event, validation.rowPayloads).map(v2Cells),
            ...typedCells(typedAct(P1, 'EV-A', 'ACT-A', '2026-09-10', [o1, o9])),
            ...typedCells(typedAct(P1, 'EV-B', 'ACT-B', '2026-10-10', [o2], [o1])),
            ...typedCells(typedAct(P2, 'EV-Z', 'ACT-Z', '2026-10-15', [z1]))
        ],
        digestivo: v2.projectEventRows(legacy.event, legacy.rowPayloads).map(v2Cells)
    };
}

function workbook() {
    const XLSX = global.XLSX;
    const built = rows();
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([built.header].concat(built.derma)), '01_DERMA');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([built.header].concat(built.digestivo)), '03_DIGESTIVO');
    return book;
}

function workbookBuffer() {
    return global.XLSX.write(workbook(), { type: 'buffer', bookType: 'xlsx' });
}

function source() {
    const model = global.FarmaciaBridgeV2Reader.readWorkbook(workbook(), {
        core: global.FarmaciaExportV2Core, xlsx: global.XLSX, fileName: 'mixto.xlsx', importedAt: '2026-10-29T10:00:00Z'
    });
    return global.FarmaciaRawExcelDataSource.create(model);
}

module.exports = { ROOT, IDSYS, P1, P2, LEGACY_CIP, loadModules, workbook, workbookBuffer, source };
