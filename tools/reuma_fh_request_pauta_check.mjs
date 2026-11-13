#!/usr/bin/env node
'use strict';
/**
 * Pauta en la solicitud Reuma → Farmacia (13-11-2026, tras el buscador común).
 *
 * Decisión de Sil (13-11, casos validados en lenguaje llano):
 *   - Si el médico eligió pauta, la línea del plan la muestra junto al fármaco
 *     y la dosis: «- <fármaco> <dosis> · Pauta solicitada: <etiqueta>».
 *   - «Otra pauta» muestra el texto escrito por el médico.
 *   - Sin pauta, la línea no añade nada (ni «pendiente», ni «No», nada).
 *   - La pauta nunca se deduce del fármaco ni de la dosis.
 *   - Sigue siendo plan solicitado: la cabecera del bloque no cambia.
 *   - Vale para Primera visita y Seguimiento (entradas plan… y cambio…); el panel
 *     del paciente queda fuera (su lector aún no lee las columnas de pauta).
 *
 * Ejercita el generador REAL (`modules/pharmacyRequest.js`, con el catálogo
 * real `scripts/farmacia_pautas_catalog.js`) en un sandbox mínimo.
 * Solo datos sintéticos. Salida 0 = todo PASS, 1 = algún FAIL.
 * Uso: node tools/reuma_fh_request_pauta_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PHARM_SRC = read('modules/pharmacyRequest.js');
const PREBIO_SRC = read('modules/prebiologicManager.js');
const CATALOG_SRC = read('scripts/farmacia_pautas_catalog.js');

function makeSessionStorageMock() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(String(k), String(v)); },
        removeItem: (k) => { store.delete(k); },
        key: (i) => [...store.keys()][i] ?? null,
        get length() { return store.size; },
    };
}

function loadGenerator({ withCatalog }) {
    const sandbox = {
        window: {}, sessionStorage: makeSessionStorageMock(), console,
        navigator: {}, document: undefined, Blob: undefined, URL: undefined,
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    if (withCatalog) {
        vm.runInContext(CATALOG_SRC, sandbox, { filename: 'farmacia_pautas_catalog.js' });
        sandbox.FarmaciaPautasCatalog = sandbox.window.FarmaciaPautasCatalog;
    }
    vm.runInContext(PREBIO_SRC, sandbox, { filename: 'prebiologicManager.js' });
    sandbox.HubTools = sandbox.window.HubTools;
    vm.runInContext(PHARM_SRC, sandbox, { filename: 'pharmacyRequest.js' });
    const gen = sandbox.window.HubTools?.pharmacy?.generateRequestText;
    if (typeof gen !== 'function') {
        console.error('SELF-CHECK FAILED: generateRequestText no cargado.');
        process.exit(1);
    }
    return gen;
}

const generate = loadGenerator({ withCatalog: true });
const generateNoCatalog = loadGenerator({ withCatalog: false });

const BASE = {
    cip: 'CIP-SYN-PAUTA-001',
    nombrePaciente: 'Paciente Sintético Pauta',
    profesional: 'Reumatología Sintética',
    fechaVisita: '2026-11-13',
    diagnosticoPrimario: 'ar',
    tratamientoActual: 'FarmacoActual Sintetico 10 mg',
};
const fixture = (extra) => Object.assign({}, BASE, extra);

const PLAN_HEADER = 'PLAN / SELECCIÓN REGISTRADA (valor consignado como plan; no tratamiento activo)';

function planBlock(text) {
    const start = text.indexOf(PLAN_HEADER);
    if (start < 0) return null;
    const rest = text.slice(start);
    const end = rest.indexOf('\n\n');
    return end < 0 ? rest : rest.slice(0, end);
}
function planLines(text) {
    const block = planBlock(text);
    if (block === null) return null;
    return block.split('\n').slice(1).filter((l) => l.trim() !== '');
}

let failures = 0;
function record(name, fn) {
    try {
        fn();
        console.log('PASS ' + name);
    } catch (err) {
        failures += 1;
        console.log('FAIL ' + name + ' — ' + err.message);
    }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(actual, expected, label) {
    assert(actual === expected, label + ': esperado ' + JSON.stringify(expected) + ', obtenido ' + JSON.stringify(actual));
}

// P1 pauta del catálogo → etiqueta legible junto a fármaco y dosis
record('P1 pauta del catálogo: «Pauta solicitada: Cada 2 semanas» en la línea del plan', () => {
    const lines = planLines(generate(fixture({
        planBiologicosEntries: [{ farmaco: 'PlanFarmaco Sintetico A', dosis: '40 mg', pauta: 'CADA_2_SEMANAS', pautaOtro: '' }],
    })));
    assert(lines, 'falta el bloque PLAN / SELECCIÓN');
    eq(lines.length, 1, 'nº de líneas del plan');
    eq(lines[0], '- PlanFarmaco Sintetico A 40 mg · Pauta solicitada: Cada 2 semanas', 'línea del plan');
});

// P2 «Otra pauta» → el texto escrito, no la etiqueta genérica
record('P2 «Otra pauta»: muestra el texto escrito por el médico', () => {
    const text = generate(fixture({
        planFamesEntries: [{ farmaco: 'PlanFarmaco Sintetico B', dosis: '15 mg', pauta: 'OTRO', pautaOtro: 'Días 1 y 15 sintéticos' }],
    }));
    const lines = planLines(text);
    assert(lines, 'falta el bloque PLAN / SELECCIÓN');
    eq(lines[0], '- PlanFarmaco Sintetico B 15 mg · Pauta solicitada: Días 1 y 15 sintéticos', 'línea del plan');
    assert(!planBlock(text).includes('Otra pauta'), 'no debe mostrar la etiqueta genérica «Otra pauta» si hay texto');
    assert(!planBlock(text).includes('OTRO'), 'no debe mostrar el código OTRO');
});

// P3 «Otra pauta» sin texto → la etiqueta del catálogo, nunca el código
record('P3 «Otra pauta» sin texto: muestra «Otra pauta» (lo elegido), no el código', () => {
    const lines = planLines(generate(fixture({
        planFamesEntries: [{ farmaco: 'PlanFarmaco Sintetico B', dosis: '15 mg', pauta: 'OTRO', pautaOtro: '' }],
    })));
    eq(lines[0], '- PlanFarmaco Sintetico B 15 mg · Pauta solicitada: Otra pauta', 'línea del plan');
});

// P4 sin pauta → la línea queda como antes, sin rellenos
for (const [label, entry] of [
    ['pauta vacía', { farmaco: 'PlanFarmaco Sintetico C', dosis: '20 mg', pauta: '', pautaOtro: '' }],
    ['sin campo pauta', { farmaco: 'PlanFarmaco Sintetico C', dosis: '20 mg' }],
    ['pauta solo espacios', { farmaco: 'PlanFarmaco Sintetico C', dosis: '20 mg', pauta: '   ', pautaOtro: '' }],
]) {
    record('P4 ausente (' + label + '): la línea no añade nada', () => {
        const text = generate(fixture({ planSistemicosEntries: [entry] }));
        const lines = planLines(text);
        eq(lines[0], '- PlanFarmaco Sintetico C 20 mg', 'línea del plan');
        const block = planBlock(text);
        for (const banned of ['Pauta', 'pauta', 'endiente', 'No informad', 'No consta', ': NO', 'Sin pauta']) {
            assert(!block.includes(banned), 'el bloque no debe contener «' + banned + '»');
        }
    });
}

// P4b valores que no son texto (revisión ciega 13-11): no constan, sin romper la solicitud
for (const [label, pauta] of [['objeto', {}], ['booleano', true], ['número', 42], ['lista', ['SEMANAL']], ['objeto sin toString', { toString: null }]]) {
    record('P4b pauta no textual (' + label + '): la línea no añade nada y no rompe', () => {
        const lines = planLines(generate(fixture({
            planSistemicosEntries: [{ farmaco: 'PlanFarmaco Sintetico C', dosis: '20 mg', pauta, pautaOtro: pauta }],
        })));
        eq(lines[0], '- PlanFarmaco Sintetico C 20 mg', 'línea del plan');
    });
}

// P5 no se deduce: un fármaco conocido sin pauta no recibe ninguna
record('P5 sin inferencia: un fármaco sin pauta no recibe ninguna en todo el texto', () => {
    const text = generate(fixture({
        planBiologicosEntries: [{ farmaco: 'Adalimumab', dosis: '40 mg', pauta: '', pautaOtro: '' }],
    }));
    for (const banned of ['Pauta solicitada', 'Cada 2 semanas', 'Semanal', 'Mensual']) {
        assert(!text.includes(banned), 'no debe aparecer «' + banned + '»');
    }
});

// P6 varias líneas: cada una con la suya, sin contagio
record('P6 varias líneas: cada pauta va con su fármaco y la ausente sigue ausente', () => {
    const lines = planLines(generate(fixture({
        planSistemicosEntries: [{ farmaco: 'PlanFarmaco Sintetico D', dosis: '5 mg', pauta: 'DIARIA', pautaOtro: '' }],
        planFamesEntries: [{ farmaco: 'PlanFarmaco Sintetico E', dosis: '15 mg', pauta: '', pautaOtro: '' }],
        planBiologicosEntries: [{ farmaco: 'PlanFarmaco Sintetico F', dosis: '162 mg', pauta: 'SEMANAL', pautaOtro: '' }],
    })));
    eq(lines.length, 3, 'nº de líneas del plan');
    assert(lines.includes('- PlanFarmaco Sintetico D 5 mg · Pauta solicitada: Diaria'), 'línea D con Diaria');
    assert(lines.includes('- PlanFarmaco Sintetico E 15 mg'), 'línea E sin pauta');
    assert(lines.includes('- PlanFarmaco Sintetico F 162 mg · Pauta solicitada: Semanal'), 'línea F con Semanal');
});

// P7 Seguimiento: entradas cambio* (sin plan*) también llevan la pauta
record('P7 Seguimiento: las entradas de cambio llevan su pauta', () => {
    const lines = planLines(generate(fixture({
        cambioBiologicosEntries: [{ farmaco: 'CambioFarmaco Sintetico G', dosis: '200 mg', pauta: 'CADA_4_SEMANAS', pautaOtro: '' }],
    })));
    assert(lines, 'falta el bloque PLAN / SELECCIÓN');
    eq(lines[0], '- CambioFarmaco Sintetico G 200 mg · Pauta solicitada: Cada 4 semanas', 'línea del plan');
});

// P8 sin dosis: la pauta va igual tras el fármaco
record('P8 sin dosis: «- <fármaco> · Pauta solicitada: …»', () => {
    const lines = planLines(generate(fixture({
        planBiologicosEntries: [{ farmaco: 'PlanFarmaco Sintetico H', dosis: '', pauta: 'MENSUAL', pautaOtro: '' }],
    })));
    eq(lines[0], '- PlanFarmaco Sintetico H · Pauta solicitada: Mensual', 'línea del plan');
});

// P9 sin catálogo cargado: se muestra el valor guardado tal cual, sin traducir ni inventar
record('P9 sin catálogo: muestra el código guardado tal cual', () => {
    const lines = planLines(generateNoCatalog(fixture({
        planBiologicosEntries: [{ farmaco: 'PlanFarmaco Sintetico I', dosis: '40 mg', pauta: 'CADA_2_SEMANAS', pautaOtro: '' }],
    })));
    eq(lines[0], '- PlanFarmaco Sintetico I 40 mg · Pauta solicitada: CADA_2_SEMANAS', 'línea del plan');
});

// P10 sigue siendo plan solicitado: cabecera intacta y la pauta no entra en TRATAMIENTO ACTUAL
record('P10 solicitado ≠ validado: cabecera del plan intacta y pauta fuera del bloque actual', () => {
    const text = generate(fixture({
        planBiologicosEntries: [{ farmaco: 'PlanFarmaco Sintetico J', dosis: '40 mg', pauta: 'CADA_2_SEMANAS', pautaOtro: '' }],
    }));
    assert(text.includes(PLAN_HEADER), 'la cabecera del plan debe seguir igual');
    const occurrences = text.split('Pauta solicitada').length - 1;
    eq(occurrences, 1, 'veces que aparece «Pauta solicitada»');
    assert(planBlock(text).includes('Pauta solicitada'), 'la pauta va solo en el bloque del plan');
    assert(!/[Pp]auta validada/.test(text), 'no debe hablar de pauta validada');
});

// P11 las pantallas que generan la solicitud cargan el catálogo antes y fuerzan recarga del módulo
record('P11 Primera visita y Seguimiento: catálogo antes del módulo y versión nueva de pharmacyRequest.js', () => {
    for (const page of ['primera_visita.html', 'seguimiento.html']) {
        const src = read(page);
        const cat = src.indexOf('scripts/farmacia_pautas_catalog.js');
        const mod = src.indexOf('modules/pharmacyRequest.js');
        assert(cat >= 0 && mod >= 0, page + ': faltan scripts');
        assert(cat < mod, page + ': el catálogo debe cargarse antes que pharmacyRequest.js');
        assert(!src.includes('modules/pharmacyRequest.js?v=20261011a'), page + ': hay que subir la versión de pharmacyRequest.js');
    }
});

console.log(failures === 0 ? '\nOK — todos los casos pasan' : '\n' + failures + ' caso(s) FAIL');
process.exit(failures === 0 ? 0 : 1);
