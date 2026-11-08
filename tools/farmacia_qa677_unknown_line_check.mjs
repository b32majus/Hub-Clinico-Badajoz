#!/usr/bin/env node
// tools/farmacia_qa677_unknown_line_check.mjs
// QA-06 (#677, FH-QA-06): dos líneas sintéticas simultáneas y una DESCONOCIDA.
// Interpretación aprobada por Sil (08-11-2026): «una desconocida» = una línea
// cuya relación y estado no constan (`relationship`/`status` = `unknown`).
// Criterio negativo: la coexistencia no crea switch ni add-on, la línea
// desconocida no se convierte en activa ni en principal por inferencia y no
// altera a las demás. Solo datos sintéticos; no acredita piloto.
// Alcance: núcleo multitratamiento. Que la salida Excel 166 recoja la línea
// desconocida no se prueba aquí (el adaptador de exportación solo recibe
// líneas activas).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../scripts/farmacia_multitreatment_core.js');
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
const rejects = fn => { try { fn(); } catch (error) { return true; } return false; };
const line = (state, cip, id, relationship, status) =>
    core.createExistingTreatmentLine(state, { cip, line_id: id, relationship, status });

function scenario(cip) {
    const state = core.emptyState();
    line(state, cip, 'P-ACTIVA', 'primary', 'active');
    line(state, cip, 'A-ACTIVA', 'additional', 'active');
    line(state, cip, 'D-DESCONOCIDA', 'unknown', 'unknown');
    return state;
}

check('1 dos líneas activas y una desconocida conviven en el mismo CIP', () => {
    const lines = scenario('CIP-QA677-1').patients['CIP-QA677-1'].lines;
    return Object.keys(lines).length === 3;
});

check('2 la línea desconocida conserva relación y estado «unknown»', () => {
    const l = core.getLine(scenario('CIP-QA677-2'), 'CIP-QA677-2', 'D-DESCONOCIDA');
    return l.relationship === 'unknown' && l.status === 'unknown';
});

check('3 no se crea ningún movimiento (ni switch ni add-on) por coexistir', () => {
    const state = scenario('CIP-QA677-3');
    return Object.keys(state.patients['CIP-QA677-3'].movements).length === 0;
});

check('4 las líneas activas no cambian de estado ni de relación al añadir la desconocida', () => {
    const state = core.emptyState();
    line(state, 'CIP-QA677-4', 'P-ACTIVA', 'primary', 'active');
    line(state, 'CIP-QA677-4', 'A-ACTIVA', 'additional', 'active');
    const antes = JSON.stringify([core.getLine(state, 'CIP-QA677-4', 'P-ACTIVA'), core.getLine(state, 'CIP-QA677-4', 'A-ACTIVA')]);
    line(state, 'CIP-QA677-4', 'D-DESCONOCIDA', 'unknown', 'unknown');
    const despues = JSON.stringify([core.getLine(state, 'CIP-QA677-4', 'P-ACTIVA'), core.getLine(state, 'CIP-QA677-4', 'A-ACTIVA')]);
    return antes === despues;
});

check('5 una línea desconocida no cuenta como principal activo: sigue habiendo un solo principal activo', () => {
    const lines = Object.values(scenario('CIP-QA677-5').patients['CIP-QA677-5'].lines);
    const principalesActivos = lines.filter(l => l.relationship === 'primary' && l.status === 'active');
    return principalesActivos.length === 1 && principalesActivos[0].line_id === 'P-ACTIVA';
});

check('6 una segunda línea principal activa se sigue rechazando aunque exista la desconocida', () => {
    const state = scenario('CIP-QA677-6');
    return rejects(() => line(state, 'CIP-QA677-6', 'P-OTRA', 'primary', 'active'));
});

check('7 «switch» o «add_on» no son relación ni estado válidos de una línea existente', () => {
    const state = core.emptyState();
    return rejects(() => line(state, 'CIP-QA677-7', 'X1', 'switch', 'active')) &&
        rejects(() => line(state, 'CIP-QA677-7', 'X2', 'additional', 'add_on')) &&
        rejects(() => line(state, 'CIP-QA677-7', 'X3', 'inferred', 'unknown'));
});

check('8 guardar y volver a cargar conserva la línea desconocida sin reclasificarla', () => {
    const state = scenario('CIP-QA677-8');
    let raw = null;
    const storage = { getItem: () => raw, setItem: (_k, v) => { raw = v; } };
    core.saveState(state, storage);
    const l = core.getLine(core.loadState(storage), 'CIP-QA677-8', 'D-DESCONOCIDA');
    return l && l.relationship === 'unknown' && l.status === 'unknown';
});

check('9 un movimiento sobre una línea desconocida exige sus referencias y no cambia su estado', () => {
    const state = scenario('CIP-QA677-9');
    const sinBase = rejects(() => core.createMovement(state, {
        cip: 'CIP-QA677-9', movement_id: 'M-MAL', line_id: 'D-DESCONOCIDA', type: 'add_on'
    }));
    return sinBase && core.getLine(state, 'CIP-QA677-9', 'D-DESCONOCIDA').status === 'unknown';
});

if (!process.exitCode) console.log(`qa677_unknown_line_check: PASSED (${passed}/9)`);
