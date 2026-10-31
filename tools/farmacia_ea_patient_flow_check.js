#!/usr/bin/env node
'use strict';

// Check focal EA v1 demo (#867), Tramo D3a: el flujo del paciente adjunta el
// modelo de EA nuevo y Quick View lo pinta con el formato decidido por Sil
// (29-10-2026): bloque «Efectos adversos sin cierre registrado» + una línea por
// episodio sin cierre «<descripción> · último registro: <estado>, <fecha>».
// Nada más. Nunca «activo».
// D3b: Dashboard del paciente y longitudinal pintan los episodios desde
// `patient.ea_episodes` con `dashboardView(model)` (vista pura, probada aquí);
// el adaptador longitudinal no debe descartar `ea_episodes`.
//
//  - Al seleccionar paciente, `explicit_data.ea_episodes` guarda el envelope de
//    `FarmaciaPatientReadContractV2.readAdverseEventEpisodes` y
//    `patient.ea_episodes` = { status, model? }:
//      ok → { status:'ok', model } (modelo de pantalla)
//      not_found / unavailable → { status } y Quick View usa el camino antiguo
//      error (o modelo inválido) → { status:'error' }
//  - El camino antiguo del paciente no cambia.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const XLSX = require(path.join(ROOT, 'vendor/sheetjs/xlsx.full.min.js'));
global.XLSX = XLSX;
global.window = global;
global.HubTools = {};
const realConsole = global.console;
global.console = { log() {}, warn() {}, error() {} };
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
    'scripts/farmacia_patient_read_contract_v2.js',
    'scripts/farmacia_current_patient_session.js',
    'scripts/farmacia_patient_flow_runtime.js',
    'scripts/farmacia_longitudinal_raw_adapter.js'
].forEach(file => require(path.join(ROOT, file)));
global.console = realConsole;

const v2 = global.FarmaciaExportV2Core;
const v21 = global.FarmaciaBridgeRawEaV21Core;
const runtimeModule = global.FarmaciaPatientFlowRuntime;
const sessionModule = global.FarmaciaCurrentPatientSession;
const screen = global.HubTools.farmaciaEaScreenModel;
const fixture = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/demo/farmacia/export_v2', name), 'utf8'));
const EXTRA = v21.ROW_COLUMNS.slice(152);

// --- Libro mixto sintético (mismo diseño que el check D2) -------------------
const PID = 'patient-mixed-001';
const REF = 'PATREF-MIX';
const IDSYS = 'DEMO';
const IDVAL = 'CIP-MIX-001';
function validationRows() {
    const f = fixture('validation_event_v2.json');
    Object.assign(f.event, { patient_id: PID, identifier_system: IDSYS, identifier_value: IDVAL });
    return v2.projectEventRows(f.event, f.rowPayloads);
}
function legacyFollowupRows() {
    const f = fixture('followup_event_v2.json');
    Object.assign(f.event, { identifier_system: IDSYS, identifier_value: 'CIP-LEGACY-003' });
    return v2.projectEventRows(f.event, f.rowPayloads);
}
const event = (id, date) => ({
    event_id: id, source_event_id: id + '-SRC', event_type: 'pharmacy_followup',
    event_status: 'completed', occurred_at: date + 'T10:00:00Z', recorded_at: date + 'T10:05:00Z',
    demo_flag: true, patient_id: PID, identifier_system: IDSYS, identifier_value: IDVAL,
    visit_id: id + '-VIS', visit_date: date, service_code: 'DERMA'
});
const line = id => ({
    rowKey: id, treatment_id: 'TR-' + id, line_id: id, line_role: 'principal',
    is_primary_line: true, line_status_at_event: 'active', active_at_event: true, line_drug_name: 'SINTETICO'
});
const obs = (act, fields) => ({
    patientRef: REF, actId: act, episode_id: 'E1', observation_id: 'O1',
    status: 'incorporated', description: 'Cefalea', ...fields
});
const refOf = o => ({ patientRef: o.patientRef, actId: o.actId, episode_id: o.episode_id, observation_id: o.observation_id });
const o1 = obs('ACT-A', { suspicions: [{ patientRef: REF, episode_id: 'E1', medicationRef: 'LINE-A' }] });
const o9 = obs('ACT-A', { observation_id: 'O9', episode_id: 'E9', description: 'Náuseas' });
const o2 = obs('ACT-B', { observation_id: 'O2', basis: refOf(o1), evolution: 'continuation', description: 'Cefalea persiste' });
const o3 = obs('ACT-C', { observation_id: 'O3', basis: refOf(o2), evolution: 'resolution', description: 'Cefalea resuelta' });
const typedAct = (id, actId, date, observations, history = []) => v21.buildFollowupRows({
    event: event(id, date), actId, patientRef: REF, present: 'si',
    activeLines: [line('LINE-A')], adverse_events: observations, history, selections: []
});
const v2Cells = row => v2.serializeRowToTsv(row).split('\t').concat(EXTRA.map(() => ''));
const typedCells = rows => v21.serializeRowsToTsv(rows).split('\n').map(text => text.split('\t'));
function source({ resolved = false } = {}) {
    const derma = [
        ...validationRows().map(v2Cells),
        ...typedCells(typedAct('EV-A', 'ACT-A', '2026-09-10', [o1, o9])),
        ...typedCells(typedAct('EV-B', 'ACT-B', '2026-10-10', [o2], [o1]))
    ];
    if (resolved) derma.push(...typedCells(typedAct('EV-C', 'ACT-C', '2026-10-20', [o3], [o2])));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([v21.ROW_COLUMNS.slice()].concat(derma)), '01_DERMA');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([v21.ROW_COLUMNS.slice()].concat(legacyFollowupRows().map(v2Cells))), '03_DIGESTIVO');
    const model = global.FarmaciaBridgeV2Reader.readWorkbook(book, { core: v2, xlsx: XLSX, fileName: 'mixto.xlsx', importedAt: '2026-10-29T10:00:00Z' });
    return global.FarmaciaRawExcelDataSource.create(model);
}

// --- Arnés del runtime ------------------------------------------------------
function storage() {
    const values = new Map();
    return {
        get length() { return values.size; },
        key(index) { return [...values.keys()][index] ?? null; },
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}
function runtimeFor(dataPort) {
    const loc = { href: 'http://local/farmacia_index.html', pathname: '/farmacia_index.html', search: '', hash: '' };
    const history = {
        replaceState(_state, _title, url) {
            const parsed = new URL(url, loc.href);
            loc.href = parsed.href; loc.pathname = parsed.pathname; loc.search = parsed.search; loc.hash = parsed.hash;
        }
    };
    return runtimeModule.create({
        sessionModule, sessionStorage: storage(), dataPort, location: loc, history,
        confirm: () => true, crypto: { randomUUID: () => 'generation-test' }
    });
}
const without = (object, key) => {
    const copy = {};
    Object.keys(object).forEach(name => { if (name !== key) copy[name] = object[name]; });
    return Object.freeze(copy);
};
const withMethod = (object, fn) => Object.freeze(Object.assign({}, object, { getAdverseEventEpisodes: fn }));

let passed = 0;
const test = (label, fn) => { fn(); passed += 1; };

test('paciente mixto: modelo de EA en la sesión y Quick View', () => {
    const result = runtimeFor(source()).selectByCip(IDVAL);
    assert.equal(result.status, 'selected');
    const patient = result.patient;
    assert.equal(patient.ea_episodes.status, 'ok');
    const model = patient.ea_episodes.model;
    assert.equal(model.ok, true);
    assert.deepEqual(model.counts, { episodes: 2, observations: 3 });
    assert.equal(result.envelope.explicit_data.ea_episodes.outcome, 'ok', 'el envelope V2 se guarda en explicit_data');
    assert.deepEqual(screen.quickView(model), {
        ok: true,
        title: 'Efectos adversos sin cierre registrado',
        lines: [
            'Cefalea persiste · último registro: continúa, 2026-10-10',
            'Náuseas · último registro: sin evolución indicada, 2026-09-10'
        ]
    });
    // Camino antiguo intacto: este paciente no tiene EA antiguo registrado.
    assert.equal(patient.efectosAdversos, 'No registrado');
    assert.equal(patient.__farmaciaRawPatient, true);
    for (const text of JSON.stringify(patient.ea_episodes).match(/"[^"]*"/g)) {
        assert.ok(!/activ/i.test(text), `no debe aparecer «activo»: ${text}`);
    }
});

test('resolución explícita: el episodio sale del bloque de Quick View', () => {
    const patient = runtimeFor(source({ resolved: true })).selectByCip(IDVAL).patient;
    assert.deepEqual(screen.quickView(patient.ea_episodes.model).lines, [
        'Náuseas · último registro: sin evolución indicada, 2026-09-10'
    ]);
});

test('estados sin modelo', () => {
    const src = source();
    assert.deepEqual(runtimeFor(src).selectByCip('CIP-LEGACY-003').patient.ea_episodes, { status: 'not_found' },
        'paciente sin filas 166: camino antiguo, nunca «sin EA»');
    assert.deepEqual(runtimeFor(without(src, 'getAdverseEventEpisodes')).selectByCip(IDVAL).patient.ea_episodes, { status: 'unavailable' });
    assert.deepEqual(runtimeFor(withMethod(src, () => { throw new Error('x'); })).selectByCip(IDVAL).patient.ea_episodes, { status: 'error' });
    assert.deepEqual(runtimeFor(withMethod(src, () => ({ ok: false, error: { code: 'UNKNOWN_BASIS' } }))).selectByCip(IDVAL).patient.ea_episodes, { status: 'error' });
    const broken = () => {
        const result = src.getAdverseEventEpisodes(PID);
        result.state.episodes = [];
        return result;
    };
    assert.deepEqual(runtimeFor(withMethod(src, broken)).selectByCip(IDVAL).patient.ea_episodes, { status: 'error' },
        'un modelo que no se puede construir es error, no dato parcial');
});

test('Inicio carga los módulos y Quick View usa el modelo', () => {
    const html = fs.readFileSync(path.join(ROOT, 'farmacia_index.html'), 'utf8');
    const order = [
        'scripts/farmacia_export_v2_core.js',
        'modules/hubTools.js',
        'modules/farmacia_act_contract.js',
        'modules/farmacia_act_payloads.js',
        'modules/farmacia_ea_invariants.js',
        'scripts/farmacia_bridge_ea_typed_codec.js',
        'scripts/farmacia_bridge_raw_ea_v21_core.js',
        'modules/farmacia_ea_patient_projection.js',
        'modules/farmacia_ea_episode_state.js',
        'scripts/farmacia_bridge_raw_ea_v21_reader.js',
        'modules/farmacia_ea_screen_model.js',
        'scripts/farmacia_bridge_v2_reader.js',
        'scripts/farmacia_patient_flow_runtime.js'
    ];
    let previous = -1;
    for (const file of order) {
        const at = html.indexOf('src="' + file);
        assert.ok(at !== -1, `farmacia_index.html debe cargar ${file}`);
        assert.ok(at > previous, `${file} fuera de orden`);
        assert.equal(html.indexOf('src="' + file, at + 1), -1, `${file} cargado dos veces`);
        previous = at;
    }
    const js = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_index.js'), 'utf8');
    assert.ok(!/Efectos adversos activos/.test(js), 'Quick View no dice «activos»');
    assert.ok(/farmaciaEaScreenModel\.quickView\(/.test(js), 'Quick View pinta desde el modelo de pantalla');
    assert.ok(/data-fh-qv-ea/.test(js), 'bloque EA identificable en el DOM');
});

test('D3b: dashboardView del paciente mixto (vista pura, sin «activo»)', () => {
    const model = runtimeFor(source()).selectByCip(IDVAL).patient.ea_episodes.model;
    const view = screen.dashboardView(model);
    assert.deepEqual(view, {
        ok: true,
        title: 'Efectos adversos',
        empty: null,
        cards: [
            {
                episode_id: 'E1',
                title: 'Cefalea persiste',
                statusText: 'Último estado registrado: continúa, el 2026-10-10',
                rows: [
                    { label: 'Sospechosos', value: 'LINE-A' },
                    { label: 'Métodos de causalidad', value: 'No registrado' }
                ],
                observations: [
                    '2026-09-10 · sin evolución indicada · Cefalea',
                    '2026-10-10 · continúa · Cefalea persiste'
                ]
            },
            {
                episode_id: 'E9',
                title: 'Náuseas',
                statusText: 'Último estado registrado: sin evolución indicada, el 2026-09-10',
                rows: [
                    { label: 'Sospechosos', value: 'No registrado' },
                    { label: 'Métodos de causalidad', value: 'No registrado' }
                ],
                observations: ['2026-09-10 · sin evolución indicada · Náuseas']
            }
        ]
    });
    for (const text of JSON.stringify(view).match(/"[^"]*"/g)) {
        assert.ok(!/activ/i.test(text), `no debe aparecer «activo»: ${text}`);
    }
    // El resuelto sigue visible en el Dashboard (historia completa), a diferencia de Quick View.
    const resolved = runtimeFor(source({ resolved: true })).selectByCip(IDVAL).patient.ea_episodes.model;
    const resolvedView = screen.dashboardView(resolved);
    assert.equal(resolvedView.cards[0].statusText, 'Último estado registrado: resuelto, el 2026-10-20');
    assert.equal(resolvedView.cards[0].observations.length, 3);
});

test('D3b: dashboardView sin episodios, ambiguo, sin fecha y modelo inválido', () => {
    const base = runtimeFor(source()).selectByCip(IDVAL).patient.ea_episodes.model;
    const clone = value => JSON.parse(JSON.stringify(value));
    const none = Object.assign(clone(base), { episodes: [], counts: { episodes: 0, observations: 0 } });
    assert.deepEqual(screen.dashboardView(none), { ok: true, title: 'Efectos adversos', empty: 'Sin efectos adversos registrados', cards: [] });
    const odd = clone(base);
    Object.assign(odd.episodes[0], { ambiguous: true, statusText: 'Último estado no determinable', stateLabel: null, description: '' });
    odd.episodes[0].observations[0].date = null;
    const oddCard = screen.dashboardView(odd).cards[0];
    assert.equal(oddCard.title, 'Efecto adverso');
    assert.equal(oddCard.statusText, 'Último estado no determinable');
    assert.equal(oddCard.observations[0], 'sin fecha · sin evolución indicada · Cefalea');
    for (const bad of [null, undefined, 'x', [], { ok: false }, { ok: true }, { ok: true, episodes: {}, patientHasDocumentedEa: true }]) {
        const result = screen.dashboardView(bad);
        assert.equal(result.ok, false);
        assert.equal(result.error.code, 'INVALID_MODEL');
    }
    const frozen = JSON.stringify(base);
    screen.dashboardView(base);
    assert.equal(JSON.stringify(base), frozen, 'dashboardView no muta el modelo');
});

test('D3b: el adaptador longitudinal conserva ea_episodes del paciente de la sesión', () => {
    const result = runtimeFor(source()).selectByCip(IDVAL);
    const adapted = global.FarmaciaLongitudinalRawAdapter.buildFromEnvelope(result.envelope);
    assert.deepEqual(adapted.ea_episodes, result.patient.ea_episodes);
    const legacy = runtimeFor(source()).selectByCip('CIP-LEGACY-003');
    assert.deepEqual(global.FarmaciaLongitudinalRawAdapter.buildFromEnvelope(legacy.envelope).ea_episodes, { status: 'not_found' });
});

test('D3b: los dos dashboards cargan el modelo y pintan desde ea_episodes', () => {
    const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const [html, js] of [['farmacia_dashboard_paciente.html', 'scripts/farmacia_dashboard_paciente.js'], ['farmacia_dashboard_longitudinal.html', 'scripts/farmacia_dashboard_longitudinal.js']]) {
        const page = read(html);
        const hub = page.indexOf('src="modules/hubTools.js');
        const model = page.indexOf('src="modules/farmacia_ea_screen_model.js');
        const own = page.indexOf('src="' + js);
        assert.ok(hub !== -1 && model > hub && own > model, `${html}: hubTools y modelo de pantalla antes de ${js}`);
        const source = read(js);
        assert.ok(/farmaciaEaScreenModel\.dashboardView\(/.test(source), `${js} pinta con dashboardView`);
        assert.ok(/ea_episodes/.test(source), `${js} lee patient.ea_episodes`);
        assert.ok(source.includes('No se pudieron leer los registros de EA'), `${js} declara el error de lectura`);
        assert.ok(!/Efectos adversos activos/.test(source), `${js} no dice «activos»`);
    }
});

console.log(`farmacia_ea_patient_flow_check OK (${passed} casos)`);
