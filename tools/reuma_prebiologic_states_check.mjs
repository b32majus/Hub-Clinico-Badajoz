#!/usr/bin/env node
'use strict';
/**
 * Deterministic acceptance oracle for the simplified Reuma prebiologic
 * circuit (SIL-REV-004 / ticket #445, T3 of TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06).
 *
 * Loads the real, unmodified `modules/prebiologicManager.js` in a vm sandbox
 * and asserts the frozen contract:
 *   C1. Each block (Analítica, Medicina Preventiva) admits EXACTLY the three
 *       supported states: NO_SOLICITADA | SOLICITADA_PENDIENTE | OK.
 *   C2. Invalid/missing states fail safely: empty/unknown, never a fabricated
 *       state (ND/NA/unknown values resolve to the empty state).
 *   C3. Presence of legacy detail/results (hemograma, bioquímica, serologías,
 *       IGRA/Rx, vacunación, derivación, fechas) NEVER sets OK or any other
 *       block state automatically.
 *   C4. No global APTO is synthesized from both blocks being OK; the legacy
 *       global resolution no longer infers EN_CURSO from detail activity.
 *   C5. Legacy persisted data stays loadable: an explicit legacy global state
 *       is still readable through the legacy read path without destructive
 *       loss and without being heuristically mapped to OK.
 *   C6. The badge shows only explicit block states and never invents
 *       validation (no APTO/OK text without an explicit block state).
 *
 * The oracle is independent from the implementation: expectations are literal
 * values frozen here from the accepted contract, not derived from module
 * internals. Synthetic data only. Exit code 0 = all cases PASS, 1 = FAIL.
 * Usage: node tools/reuma_prebiologic_states_check.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_FILE = path.join(ROOT, 'modules', 'prebiologicManager.js');

function makeSandbox() {
    const store = new Map();
    const sessionStorage = {
        setItem: (k, v) => store.set(k, String(v)),
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        removeItem: (k) => store.delete(k),
        key: (i) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size; }
    };
    const sandbox = { window: {}, sessionStorage, console };
    sandbox.window.sessionStorage = sessionStorage;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(MODULE_FILE, 'utf8'), sandbox, { filename: 'modules/prebiologicManager.js' });
    return { sandbox, pre: sandbox.window.HubTools.prebiologic };
}

const { pre } = makeSandbox();

const results = [];
function record(name, fn) {
    try {
        fn();
        results.push(true);
        console.log(`  [OK  ] ${name}`);
    } catch (err) {
        results.push(false);
        console.log(`  [FAIL] ${name} -> ${err.message}`);
    }
}

const EXPECTED_BLOCK_STATES = ['NO_SOLICITADA', 'SOLICITADA_PENDIENTE', 'OK'];

console.log('C1. Cada bloque admite exactamente los tres estados soportados');
record('el contrato declara exactamente tres estados de bloque', () => {
    assert.deepEqual(Object.keys(pre.BLOCK_STATUSES).sort(), [...EXPECTED_BLOCK_STATES].sort());
});
record('declara exactamente dos bloques: Analítica y Medicina Preventiva', () => {
    assert.equal(pre.BLOCKS.length, 2);
    assert.equal(JSON.stringify(pre.BLOCKS.map((b) => b.key).sort()), JSON.stringify(['analitica', 'medicinaPreventiva']));
});
record('normalizeBlockState acepta exactamente los tres estados', () => {
    for (const state of EXPECTED_BLOCK_STATES) {
        assert.equal(pre.normalizeBlockState(state), state);
        assert.equal(pre.normalizeBlockState(state.toLowerCase()), state);
        assert.equal(pre.normalizeBlockState('  ' + state + ' '), state);
    }
});

console.log('C2. Estados inválidos/ausentes fallan de forma segura');
record('valores inválidos/ausentes/ND/NA se resuelven vacíos, nunca un estado fabricado', () => {
    for (const raw of ['', '   ', 'ND', 'NA', 'NO_EVALUADO', 'EN_CURSO', 'APTO', 'NO_APTO', 'SI', 'ok inventado', null, undefined, 42]) {
        assert.equal(pre.normalizeBlockState(raw), '', `valor '${raw}' debería ser vacío`);
    }
});
record('sin visita ni campos: ambos bloques quedan vacíos (fail-safe)', () => {
    for (const visit of [undefined, null, {}, { Hemograma_Correcto: 'SI' }]) {
        const blocks = pre.getBlockStatesFromVisit(visit);
        assert.equal(blocks.analitica, '');
        assert.equal(blocks.medicinaPreventiva, '');
        assert.equal(blocks.hasExplicitBlockState, false);
    }
});
record('un campo de bloque corrupto no arrastrar al otro bloque', () => {
    const blocks = pre.getBlockStatesFromVisit({
        Estado_Prebiologico_Analitica: 'EN_CURSO',
        Estado_Prebiologico_Medicina_Preventiva: 'OK'
    });
    assert.equal(blocks.analitica, '');
    assert.equal(blocks.medicinaPreventiva, 'OK');
});

console.log('C3. El detalle legacy nunca establece OK ni ningún estado automáticamente');
const legacyDetailVisit = {
    ID_Paciente: 'SYN-T3-001',
    Estado_Prebiologico_Final: 'EN_CURSO',
    Hemograma_Solicitado: 'SI',
    Hemograma_Recibido: 'SI',
    Hemograma_Correcto: 'SI',
    Hemograma_Fecha_Recepcion: '2026-09-01',
    Bioquimica_Solicitada: 'SI',
    Bioquimica_Recibida: 'SI',
    Bioquimica_Correcta: 'SI',
    Serologias_Recibidas: 'SI',
    Serologias_Correctas: 'SI',
    IGRA_Mantoux_Solicitado: 'SI',
    IGRA_Mantoux_Recibido: 'SI',
    IGRA_Mantoux_Resultado: 'Negativo',
    Rx_Torax_Solicitada: 'SI',
    Rx_Torax_Recibida: 'SI',
    Rx_Torax_Correcta: 'SI',
    Vacunacion_Revisada: 'SI',
    Vacunacion_OK: 'SI',
    Medicina_Preventiva_Derivada: 'SI',
    Medicina_Preventiva_Fecha_Derivacion: '2026-09-02',
    Vacunas_Pendientes: 'Ninguna',
    Observaciones_Prebiologico: 'Caso sintético legacy con todo el detalle'
};
record('detalle legacy completo sin campos de bloque: bloques vacíos, sin OK fabricado', () => {
    const blocks = pre.getBlockStatesFromVisit(legacyDetailVisit);
    assert.equal(blocks.analitica, '');
    assert.equal(blocks.medicinaPreventiva, '');
    assert.equal(blocks.hasExplicitBlockState, false);
});
record('los campos de bloque sólo se leen desde sus campos explícitos', () => {
    const blocks = pre.getBlockStatesFromVisit({ Estado_Prebiologico_Analitica: 'OK' });
    assert.equal(blocks.analitica, 'OK');
    assert.equal(blocks.medicinaPreventiva, '');
    const both = pre.getBlockStatesFromVisit({
        Estado_Prebiologico_Analitica: 'SOLICITADA_PENDIENTE',
        estadoPrebiologicoMedicinaPreventiva: 'NO_SOLICITADA'
    });
    assert.equal(both.analitica, 'SOLICITADA_PENDIENTE');
    assert.equal(both.medicinaPreventiva, 'NO_SOLICITADA');
});

console.log('C4. No se sintetiza APTO global ni EN_CURSO desde actividad');
record('ambos bloques OK no producen ningún APTO global', () => {
    const bothOk = pre.getBlockStatesFromVisit({
        Estado_Prebiologico_Analitica: 'OK',
        Estado_Prebiologico_Medicina_Preventiva: 'OK'
    });
    assert.equal(bothOk.analitica, 'OK');
    assert.equal(bothOk.medicinaPreventiva, 'OK');
    const badge = pre.getBadgeHTML('SYN-T3-001', {
        Estado_Prebiologico_Analitica: 'OK',
        Estado_Prebiologico_Medicina_Preventiva: 'OK'
    });
    assert.ok(!/APTO/.test(badge), 'el badge no debe contener APTO');
});
record('la resolución legacy NO infiere EN_CURSO desde detalle con actividad', () => {
    const detailOnly = {
        Hemograma_Solicitado: 'SI',
        Hemograma_Recibido: 'SI',
        Hemograma_Correcto: 'SI',
        Bioquimica_Recibida: 'SI',
        Bioquimica_Correcta: 'SI',
        Serologias_Recibidas: 'SI',
        Serologias_Correctas: 'SI',
        IGRA_Mantoux_Recibido: 'SI',
        IGRA_Mantoux_Resultado: 'Negativo',
        Rx_Torax_Recibida: 'SI',
        Rx_Torax_Correcta: 'SI',
        Vacunacion_Revisada: 'SI',
        Vacunacion_OK: 'SI',
        Medicina_Preventiva_Derivada: 'SI'
    };
    const resolved = pre.getPrebiologicStatusFromVisit(detailOnly);
    assert.equal(resolved.status, 'NO_EVALUADO');
    assert.equal(resolved.hasExplicitStatus, false);
    assert.equal(pre.resolvePrebiologicStatus('SYN-T3-001', detailOnly).status, 'NO_EVALUADO', 'actividad de detalle sin estado explícito no fabrica EN_CURSO');
});
record('el estado legacy explícito registrado sigue siendo legible (histórico)', () => {
    assert.equal(pre.getPrebiologicStatusFromVisit(legacyDetailVisit).status, 'EN_CURSO', 'estado legacy explícito se preserva tal cual');
    assert.equal(pre.getPrebiologicStatusFromVisit({ Estado_Prebiologico_Final: 'NO_APTO' }).status, 'NO_APTO');
});

console.log('C5. Los datos legacy se conservan y se cargan sin pérdida destructiva');
record('la lectura legacy no destruye ni reescribe la visita original', () => {
    const visit = JSON.parse(JSON.stringify(legacyDetailVisit));
    pre.getPrebiologicStatusFromVisit(visit);
    pre.getBlockStatesFromVisit(visit);
    assert.equal(visit.Estado_Prebiologico_Final, 'EN_CURSO');
    assert.equal(visit.Hemograma_Correcto, 'SI');
    assert.equal(visit.Vacunacion_OK, 'SI');
});
record('no hay mapeo heurístico de combinaciones legacy a OK', () => {
    const resolved = pre.resolvePrebiologicStatus('SYN-T3-002', legacyDetailVisit);
    assert.equal(resolved.status, 'EN_CURSO', 'el estado legacy explícito se preserva tal cual');
    const blocks = pre.getBlockStatesFromVisit(legacyDetailVisit);
    assert.equal(blocks.analitica, '');
    assert.equal(blocks.medicinaPreventiva, '');
});

console.log('C6. El badge refleja sólo información respaldada y no inventa validación');
record('sin estados explícitos: badge neutral sin OK ni APTO', () => {
    const badge = pre.getBadgeHTML('SYN-T3-003', {});
    assert.ok(!/OK/.test(badge), 'sin estado explícito no debe aparecer OK');
    assert.ok(!/APTO/.test(badge), 'sin estado explícito no debe aparecer APTO');
    assert.match(badge, /sin estado/);
});
record('con estados explícitos: el badge muestra exactamente esos estados', () => {
    const badge = pre.getBadgeHTML('SYN-T3-004', {
        Estado_Prebiologico_Analitica: 'SOLICITADA_PENDIENTE',
        Estado_Prebiologico_Medicina_Preventiva: 'OK'
    });
    assert.match(badge, /Analítica: SOLICITADA PENDIENTE/);
    assert.match(badge, /Medicina Preventiva: OK/);
});
record('el badge legacy con APTO histórico no se muestra como estado de bloque', () => {
    const badge = pre.getBadgeHTML('SYN-T3-005', legacyDetailVisit);
    assert.ok(!/APTO/.test(badge), 'el estado global legacy no se muestra en el circuito principal');
});

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
