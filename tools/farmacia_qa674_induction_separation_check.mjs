#!/usr/bin/env node
// tools/farmacia_qa674_induction_separation_check.mjs
// QA-03 (#674, FH-QA-03): Primera visita. «Inducción solicitada» (bloque de la
// solicitud) e «inducción realizada» (bloque de la primera visita) son datos
// distintos: ninguna se deduce de la otra, y un dato ausente no se convierte
// en «sí», en START ni en validación. Se prueba sobre la proyección canónica
// del Export V2 con la fixture sintética de primera visita (sin datos reales;
// no acredita piloto). La UI declara ambos controles por separado en
// farmacia_primera_visita_check.mjs.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../scripts/farmacia_export_v2_core.js');
const core = globalThis.FarmaciaExportV2Core;
const fixture = require('../data/demo/farmacia/export_v2/first_visit_event_v2.json');
let passed = 0;

function check(label, fn) {
    try {
        if (fn() === false) throw new Error('assertion returned false');
        console.log('  ✓ ' + label);
        passed += 1;
    } catch (error) {
        console.error('  ✗ ' + label + ': ' + error.message);
        process.exitCode = 1;
    }
}

function project(overrides, drop) {
    const event = { ...fixture.event, ...overrides };
    (drop || []).forEach(key => { delete event[key]; });
    const row = core.projectEventRows(event, fixture.rowPayloads.map(payload => ({ ...payload })))[0];
    const cells = core.serializeRowToTsv(row).split('\t');
    const read = column => {
        const index = core.ROW_COLUMNS.indexOf(column);
        if (index === -1) throw new Error('columna inexistente: ' + column);
        return cells[index].replace(/^"|"$/g, '');
    };
    return { read };
}

check('1 solicitada «sí» y realizada ausente: la realizada no se deduce', () => {
    const out = project({ requested_induction_status: 'yes' }, ['induction_performed_status']);
    return out.read('requested_induction_status') === 'yes' && out.read('induction_performed_status') === '';
});

check('2 solicitada «no» y realizada «sí»: son independientes', () => {
    const out = project({ requested_induction_status: 'no', induction_performed_status: 'yes' });
    return out.read('requested_induction_status') === 'no' && out.read('induction_performed_status') === 'yes';
});

check('3 solicitada ausente y realizada «sí»: la solicitada no se deduce', () => {
    const out = project({ induction_performed_status: 'yes' }, ['requested_induction_status']);
    return out.read('requested_induction_status') === '' && out.read('induction_performed_status') === 'yes';
});

check('4 ambas ausentes: ambas quedan vacías (ausente ≠ no ≠ sí)', () => {
    const out = project({}, ['requested_induction_status', 'induction_performed_status']);
    return out.read('requested_induction_status') === '' && out.read('induction_performed_status') === '';
});

check('5 un valor de inducción no declarado se rechaza, no se normaliza a sí/no', () => {
    try { project({ requested_induction_status: 'maybe' }); } catch (error) { return true; }
    return false;
});

check('6 la inducción no genera START ni resultado de validación', () => {
    const out = project({ requested_induction_status: 'yes', induction_performed_status: 'yes' });
    return out.read('therapeutic_movement_type') !== 'start' && out.read('validation_result') === '';
});

if (!process.exitCode) console.log(`qa674_induction_separation_check: PASSED (${passed}/6)`);
