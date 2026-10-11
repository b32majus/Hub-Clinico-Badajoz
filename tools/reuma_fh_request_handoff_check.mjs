#!/usr/bin/env node
'use strict';
/**
 * FROZEN acceptance oracle for WO-NEXUS-REUMA-PHARMACY-REQUEST-ORACLE-14.1
 * (GitHub issue #529, parent train #528, b32majus/Hub-Clinico-Badajoz).
 *
 * Cost policy: go / Risk class: complex.
 *
 * This file is the FROZEN acceptance oracle for #529. All expectations below
 * are literal values frozen from the accepted issue authority (#528/#529),
 * NOT derived from implementation internals. A later implementation session
 * (#530) flips the RED case(s) to GREEN without weakening any assertion here.
 *
 * Frozen contract (literal from #528 authority):
 *   - The outgoing prebiologic block carries ONLY `Analítica` and
 *     `Medicina Preventiva`.
 *   - Each is emitted only when an explicit valid state exists:
 *     `NO_SOLICITADA | SOLICITADA_PENDIENTE | OK` (exact underscore tokens).
 *   - Absent/unknown stays absent/unknown: never fabricate `NO_SOLICITADA`,
 *     `OK`, `APTO`, `ND`, zero or any other value.
 *   - No legacy global state, no validation date, no data source, no
 *     `Observaciones prebiológico` inside the summary block.
 *   - The rest of the explicit clinical request outside this block is
 *     preserved verbatim; requested != validated, prior != new, no
 *     START/SWITCH/ADD_ON inference.
 *
 * Frozen presentation (decided here, semantics unchanged):
 *   - Required lines are `Analítica: <TOKEN>` and `Medicina Preventiva:
 *     <TOKEN>` with the exact underscore tokens above; an optional leading
 *     list bullet (`-`, `·`, `•`) is accepted.
 *   - The legacy header `ESTADO PREBIOLÓGICO / VACUNACIÓN` is frozen as
 *     FORBIDDEN: it titles the legacy global-state framing ("estado global
 *     legacy" per #528). #530 must present the two-state summary without it.
 *   - The token `derivada` is frozen as forbidden anywhere in the outgoing
 *     artifact (it only originates from the legacy line `Medicina preventiva
 *     derivada`; fixtures avoid the word in clinical prose).
 *
 * Principal assertions judge the REAL artifact produced by the REAL supported
 * generator path: `modules/pharmacyRequest.js` (plus the real
 * `modules/prebiologicManager.js`) is loaded in a minimal synthetic
 * `window`/`HubTools`/`sessionStorage` harness and
 * `HubTools.pharmacy.generateRequestText` is exercised with synthetic data.
 * Static source reads pin the route only (E1); they never substitute for
 * artifact assertions.
 *
 * Freeze-time baseline (2026-10-04, branch
 * work/nexus-reuma-pharmacy-request-safety-14-528-20261004 @ 62840e2):
 *   - RED BY DESIGN (legacy behaviour #530 must fix): E2.1, E2.2, E3.1,
 *     E4.2, E4.3, E5.2, E6.1, E6.2 — the real `getPrebiologicBlock` still
 *     emits `ESTADO PREBIOLÓGICO / VACUNACIÓN` + global state + fecha
 *     validación + fuente + hemograma/bioquímica/serologías/IGRA-Mantoux/
 *     Rx tórax/vacunación/derivación/vacunas pendientes + `Observaciones
 *     prebiológico`, and never emits the two explicit-state lines.
 *   - GREEN at freeze (genuine invariants already holding): E1.*, E4.1,
 *     E5.1, E7.* — route wiring, absence producing no valid-state lines,
 *     invalid values never converting, and verbatim clinical preservation.
 *
 * Scope: deterministic, dependency-free (plain Node, no npm deps). Synthetic
 * data only (CIP-SYN-*; no patient data is read or written). Exit 0 = all
 * PASS, 1 = FAIL.
 * Usage: node tools/reuma_fh_request_handoff_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PV_SRC = read('primera_visita.html');
const SEG_SRC = read('seguimiento.html');
const DASH_SRC = read('dashboard_paciente.html');
const PHARM_SRC = read('modules/pharmacyRequest.js');
const PREBIO_SRC = read('modules/prebiologicManager.js');
const PV_HANDLER_SRC = read('scripts/script_primera_visita.js');
const SEG_HANDLER_SRC = read('scripts/script_seguimiento.js');
const DASH_HANDLER_SRC = read('scripts/script_dashboard.js');

// ---------- minimal synthetic harness for the REAL generator path ----------
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

function loadRealGenerator() {
    const sessionStorage = makeSessionStorageMock();
    const sandbox = {
        window: {},
        sessionStorage,
        console,
        navigator: {},
        document: undefined,
        Blob: undefined,
        URL: undefined,
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(PREBIO_SRC, sandbox, { filename: 'prebiologicManager.js' });
    // Expose HubTools as a bare global exactly as browser scripts see it.
    sandbox.HubTools = sandbox.window.HubTools;
    vm.runInContext(PHARM_SRC, sandbox, { filename: 'pharmacyRequest.js' });
    return sandbox.window.HubTools;
}

const HubTools = loadRealGenerator();
if (!HubTools?.pharmacy || typeof HubTools.pharmacy.generateRequestText !== 'function') {
    console.error('ORACLE SELF-CHECK FAILED: real HubTools.pharmacy.generateRequestText not loaded.');
    process.exit(1);
}
const generate = (datos) => HubTools.pharmacy.generateRequestText(datos);

// ---------- fixtures (synthetic only) ----------
const BASE = {
    cip: 'CIP-SYN-001',
    nombrePaciente: 'Paciente Sintético Uno',
    profesional: 'Reumatología Sintética',
    fechaVisita: '2026-01-15',
    diagnosticoPrimario: 'ar',
    diagnosticoSecundario: 'Ninguno',
    das28CrpResult: '3,2 (actividad moderada)',
    pcr: '8',
    comorbilidades: ['hta', 'dlp'],
    planBiologicosEntries: [{ farmaco: 'Adalimumab (solicitado — pendiente de validación FH)', dosis: '40 mg' }],
    decisionTerapeutica: 'mantener',
    Hemograma_Correcto: 'SI',
    Bioquimica_Correcta: 'SI',
    Serologias_Correctas: 'SI',
    IGRA_Mantoux_Resultado: 'Negativo',
    Rx_Torax_Correcta: 'SI',
    Vacunacion_Revisada: 'SI',
    Vacunacion_OK: 'NO',
    Medicina_Preventiva_Derivada: 'SI',
    Vacunas_Pendientes: 'Ninguna',
    Observaciones_Prebiologico: 'Pendiente cita resumen',
    Fecha_Validacion_Prebiologico: '2026-01-10',
    Estado_Prebiologico_Final: 'APTO',
};

const bothExplicit = {
    ...BASE,
    estadoPrebiologicoAnalitica: 'OK',
    estadoPrebiologicoMedicinaPreventiva: 'SOLICITADA_PENDIENTE',
};
const oneExplicit = {
    ...BASE,
    estadoPrebiologicoAnalitica: 'NO_SOLICITADA',
};
const bothAbsent = { ...BASE };
delete bothAbsent.estadoPrebiologicoAnalitica;
delete bothAbsent.estadoPrebiologicoMedicinaPreventiva;
delete bothAbsent.Estado_Prebiologico_Analitica;
delete bothAbsent.Estado_Prebiologico_Medicina_Preventiva;
const invalidStates = {
    ...BASE,
    estadoPrebiologicoAnalitica: 'APTO',
    estadoPrebiologicoMedicinaPreventiva: 'EN_CURSO',
};

// ---------- block extraction ----------
// Legacy shape (left frozen and untouched: it is the pre-#530 baseline shape
// the oracle was frozen against at T1): slice from the legacy header to the
// footer separator.
//
// Fixed shape (#530): the prebiologic block is DELIMITED STRUCTURALLY from the
// emitted artifact's fixed section order — verified against
// `modules/pharmacyRequest.js` generateRequestText AND against real generated
// artifacts — as the trailing content region between the end of the last
// explicit clinical section and the trailing footer separator. The region is
// never derived from the state lines themselves, so state lines emitted in the
// wrong section (e.g. under DIAGNÓSTICO) cannot false-green (finding F1).
const LEGACY_HEADER = 'ESTADO PREBIOLÓGICO / VACUNACIÓN';
const STATE_LINE_RE = /^[-·•\s]*(Analítica|Medicina Preventiva)\s*:\s*(\S+)\s*$/;
const FIXED_FOOTER_ANCHOR = 'Solicitud generada desde Hub Clínico Reumatología v2';
const FIXED_SEPARATOR = '════════';
// Frozen explicit clinical section headers, in the generator's fixed order:
// header → DIAGNÓSTICO → EVALUACIÓN DE ACTIVIDAD → COMORBILIDADES ACTIVAS /
// FACTORES RELEVANTES → TRATAMIENTO ACTUAL → DECISIÓN TERAPÉUTICA →
// prebiologic block → footer separator.
const FIXED_SECTION_HEADERS = [
    'DIAGNÓSTICO',
    'EVALUACIÓN DE ACTIVIDAD',
    '▓▓▓ COMORBILIDADES ACTIVAS / FACTORES RELEVANTES ▓▓▓',
    'TRATAMIENTO ACTUAL',
    'DECISIÓN TERAPÉUTICA'
];
function fixedPrebioRegion(text) {
    const lines = text.split('\n');
    const footerLineIdx = lines.findIndex((l) => l.includes(FIXED_FOOTER_ANCHOR));
    if (footerLineIdx === -1) {
        fail(`estructura FH inesperada: falta el pie ${JSON.stringify(FIXED_FOOTER_ANCHOR)}`);
    }
    // The prebiologic region ends at the blank line immediately preceding the
    // footer's opening separator line (never a partial separator substring).
    let sepLineIdx = footerLineIdx - 1;
    while (sepLineIdx >= 0 && lines[sepLineIdx].trim() === '') sepLineIdx--;
    if (sepLineIdx < 0 || !/^═+$/.test(lines[sepLineIdx].trim())) {
        fail('estructura FH inesperada: falta el separador de pie antes del bloque prebiológico');
    }
    const head = lines.slice(0, sepLineIdx).join('\n');
    // Sections are emitted blank-line separated; the prebiologic region is
    // every paragraph after the last frozen explicit clinical section.
    const paragraphs = head.split(/\n{2,}/);
    let lastSectionIdx = -1;
    for (let i = 0; i < paragraphs.length; i++) {
        const firstLine = paragraphs[i].split('\n')[0].trim();
        if (FIXED_SECTION_HEADERS.includes(firstLine)) lastSectionIdx = i;
    }
    if (lastSectionIdx === -1) {
        fail('estructura FH inesperada: no se pudo delimitar la última sección clínica antes del bloque prebiológico');
    }
    return paragraphs.slice(lastSectionIdx + 1).join('\n\n');
}
function extractPrebioBlock(text) {
    const legacyIdx = text.indexOf(LEGACY_HEADER);
    if (legacyIdx !== -1) {
        const endIdx = text.indexOf(FIXED_SEPARATOR, legacyIdx + LEGACY_HEADER.length);
        return text.slice(legacyIdx, endIdx === -1 ? text.length : endIdx);
    }
    return fixedPrebioRegion(text);
}
function stateLines(block) {
    return block.split('\n').map((l) => l.trim()).filter((l) => STATE_LINE_RE.test(l));
}
function nonStateRegionLines(block) {
    return block.split('\n').map((l) => l.trim()).filter((l) => l !== '' && !STATE_LINE_RE.test(l));
}

// ---------- results ----------
const results = [];
function record(name, fn) {
    try {
        fn();
        results.push(true);
        console.log(`  [OK ] ${name}`);
    } catch (err) {
        results.push(false);
        console.log(`  [FAIL] ${name} -> ${err.message}`);
    }
}
function fail(msg) { throw new Error(msg); }
function mustContain(haystack, needle, label) {
    if (!haystack.includes(needle)) fail(`${label}: falta ${JSON.stringify(needle)}`);
}
function mustNotContain(haystack, needle, label, ci = true) {
    const h = ci ? haystack.toLowerCase() : haystack;
    const n = ci ? needle.toLowerCase() : needle;
    if (h.includes(n)) fail(`${label}: prohibido presente ${JSON.stringify(needle)}`);
}

// ================= E1 — baseline/tracing pins (GREEN) =================
record('E1.1 PV: botón Solicitud FH + include pharmacyRequest', () => {
    mustContain(PV_SRC, 'id="btnSolicitudFH"', 'primera_visita.html botón');
    mustContain(PV_SRC, 'Solicitud FH', 'primera_visita.html copy');
    mustContain(PV_SRC, 'modules/pharmacyRequest.js', 'primera_visita.html include');
});
record('E1.2 SEG: botón Solicitud FH + include pharmacyRequest', () => {
    mustContain(SEG_SRC, 'id="btnSolicitudFH"', 'seguimiento.html botón');
    mustContain(SEG_SRC, 'Solicitud FH', 'seguimiento.html copy');
    mustContain(SEG_SRC, 'modules/pharmacyRequest.js', 'seguimiento.html include');
});
record('E1.3 handlers PV+SEG invocan HubTools.pharmacy.copyRequestToClipboard', () => {
    for (const [label, src] of [['PV', PV_HANDLER_SRC], ['SEG', SEG_HANDLER_SRC]]) {
        mustContain(src, 'btnSolicitudFH', `${label} handler botón`);
        mustContain(src, 'HubTools.pharmacy.copyRequestToClipboard', `${label} handler generator`);
    }
});
record('E1.4 real generator: entry symbols + getPrebiologicBlock pinned', () => {
    for (const sym of ['generateRequestText', 'copyRequestToClipboard', 'renderRequestModal', 'getPrebiologicBlock']) {
        mustContain(PHARM_SRC, sym, `pharmacyRequest.js ${sym}`);
    }
    if (typeof HubTools.pharmacy.generateRequestText !== 'function') fail('generateRequestText no cargado del módulo real');
});
record('E1.5 fuentes explícitas: BLOCKS analitica/medicinaPreventiva', () => {
    mustContain(PREBIO_SRC, "'analitica'", 'prebiologicManager bloque analitica');
    mustContain(PREBIO_SRC, "'medicinaPreventiva'", 'prebiologicManager bloque medicinaPreventiva');
    mustContain(PREBIO_SRC, 'Estado_Prebiologico_Analitica', 'alias explícito Analítica');
    mustContain(PREBIO_SRC, 'Estado_Prebiologico_Medicina_Preventiva', 'alias explícito Medicina Preventiva');
    mustContain(PREBIO_SRC, 'getBlockStatesFromVisit', 'lector explícito de bloques');
});
record('E1.6 ausencia real no mapea a estado (getBlockStatesFromVisit)', () => {
    const r = HubTools.prebiologic.getBlockStatesFromVisit({});
    if (r.analitica !== '' || r.medicinaPreventiva !== '' || r.hasExplicitBlockState !== false) {
        fail(`ausencia debe ser ''/''/false, recibido ${JSON.stringify(r)}`);
    }
    const r2 = HubTools.prebiologic.getBlockStatesFromVisit(undefined);
    if (r2.analitica !== '' || r2.medicinaPreventiva !== '') fail('undefined debe resolver a ausente');
});
record('E1.7 normalizeBlockState rechaza legacy/inválido (nunca fabrica)', () => {
    for (const v of ['APTO', 'EN_CURSO', 'NO_APTO', 'NO_EVALUADO', 'ND', 'NA', '', '   ', 'UNKNOWN', undefined, null]) {
        if (HubTools.prebiologic.normalizeBlockState(v) !== '') fail(`normalizeBlockState(${JSON.stringify(v)}) debe ser ''`);
    }
    for (const v of ['NO_SOLICITADA', 'SOLICITADA_PENDIENTE', 'OK']) {
        if (HubTools.prebiologic.normalizeBlockState(v) !== v) fail(`normalizeBlockState(${v}) debe preservarse`);
    }
});

// ================= E2 — ambos explícitos (RED at freeze) =================
record('E2.1 ambos explícitos: emite Analítica: OK', () => {
    const block = extractPrebioBlock(generate(bothExplicit));
    mustContain(block, 'Analítica: OK', 'línea Analítica');
});
record('E2.2 ambos explícitos: sólo las dos líneas (Medicina Preventiva: SOLICITADA_PENDIENTE)', () => {
    const block = extractPrebioBlock(generate(bothExplicit));
    mustContain(block, 'Medicina Preventiva: SOLICITADA_PENDIENTE', 'línea Medicina Preventiva');
    const lines = stateLines(block);
    if (lines.length !== 2) fail(`el bloque debe contener exactamente 2 líneas de estado, hay ${lines.length}: ${JSON.stringify(block.slice(0, 400))}`);
});
record('E2.3 ambos explícitos: la región prebiológica contiene sólo las dos líneas de estado (F3)', () => {
    const block = extractPrebioBlock(generate(bothExplicit));
    const extra = nonStateRegionLines(block);
    if (extra.length) fail(`contenido ajeno en la región prebiológica: ${JSON.stringify(extra)}`);
    const lines = stateLines(block);
    if (lines.length !== 2) fail(`la región debe contener exactamente 2 líneas de estado, hay ${lines.length}`);
});
record('E2.4 ambos explícitos: las dos líneas sólo aparecen dentro de la región prebiológica (F1)', () => {
    const text = generate(bothExplicit);
    const region = extractPrebioBlock(text);
    const allState = text.split('\n').map((l) => l.trim()).filter((l) => STATE_LINE_RE.test(l));
    const regionState = stateLines(region);
    if (allState.length !== regionState.length) {
        fail(`líneas de estado fuera de la región prebiológica: artefacto=${allState.length} región=${regionState.length} ${JSON.stringify(allState)}`);
    }
});

// ================= E3 — uno explícito (RED: E3.1) =================
record('E3.1 un solo estado: emite Analítica: NO_SOLICITADA', () => {
    const block = extractPrebioBlock(generate(oneExplicit));
    mustContain(block, 'Analítica: NO_SOLICITADA', 'línea Analítica');
});
record('E3.2 un solo estado: Medicina Preventiva permanece ausente (anti-fabricación)', () => {
    const block = extractPrebioBlock(generate(oneExplicit));
    if (/Medicina Preventiva\s*:/.test(block)) fail('Medicina Preventiva fabricada sin estado explícito');
    if (/Medicina Preventiva\s*:\s*(NO_SOLICITADA|SOLICITADA_PENDIENTE|OK)/.test(generate(oneExplicit))) {
        fail('estado fabricado para Medicina Preventiva');
    }
});
record('E3.3 un solo estado: la región prebiológica contiene sólo Analítica: NO_SOLICITADA, sin contenido ajeno (F1/F3)', () => {
    const text = generate(oneExplicit);
    const block = extractPrebioBlock(text);
    const extra = nonStateRegionLines(block);
    if (extra.length) fail(`contenido ajeno en la región prebiológica: ${JSON.stringify(extra)}`);
    const allState = text.split('\n').map((l) => l.trim()).filter((l) => STATE_LINE_RE.test(l));
    if (allState.length !== 1 || !/^[-·•\s]*Analítica\s*:\s*NO_SOLICITADA$/.test(allState[0])) {
        fail(`la región debe contener sólo "Analítica: NO_SOLICITADA", recibido ${JSON.stringify(allState)}`);
    }
});

// ================= E4 — ambos ausentes (RED: E4.2, E4.3) =================
record('E4.1 ambos ausentes: ninguna línea Analítica/Medicina Preventiva', () => {
    const block = extractPrebioBlock(generate(bothAbsent));
    if (/(Analítica|Medicina Preventiva)\s*:/.test(block)) fail('línea de estado fabricada desde ausencia');
});
record('E4.2 ambos ausentes: ningún token de estado en el bloque (OK/APTO/NO_SOLICITADA/…)', () => {
    const block = extractPrebioBlock(generate(bothAbsent));
    for (const tok of ['NO_SOLICITADA', 'SOLICITADA_PENDIENTE', 'APTO', 'NO EVALUADO', 'NO_APTO', 'EN_CURSO']) {
        mustNotContain(block, tok, `ausencia→${tok}`);
    }
    if (/\bOK\b/.test(block)) fail('ausencia→OK fabricado (p. ej. Vacunación OK legacy)');
});
record('E4.3 ambos ausentes: sin ND ni líneas etiquetadas-vacías en el bloque', () => {
    const block = extractPrebioBlock(generate(bothAbsent));
    mustNotContain(block, 'ND', 'ausencia→ND');
});
record('E4.4 ambos ausentes: la región prebiológica está vacía y no hay líneas de estado en todo el artefacto (F1/F3)', () => {
    const text = generate(bothAbsent);
    const block = extractPrebioBlock(text);
    if (block.trim() !== '') fail(`la región prebiológica debe estar vacía, recibido ${JSON.stringify(block)}`);
    const allState = text.split('\n').filter((l) => STATE_LINE_RE.test(l.trim()));
    if (allState.length) fail(`líneas de estado presentes sin estado explícito: ${JSON.stringify(allState)}`);
});

// ================= E5 — inválidos/legacy (RED: E5.2) =================
record('E5.1 valores inválidos nunca se convierten en estados permitidos', () => {
    const text = generate(invalidStates);
    const block = extractPrebioBlock(text);
    for (const tok of ['NO_SOLICITADA', 'SOLICITADA_PENDIENTE']) {
        mustNotContain(block, tok, `inválido→${tok}`);
    }
    const okLines = stateLines(block).filter((l) => /:\s*OK\s*$/.test(l));
    if (okLines.length > 0) fail(`inválido convertido a OK: ${JSON.stringify(okLines)}`);
});
record('E5.2 legacy APTO no se propaga como estado saliente', () => {
    const block = extractPrebioBlock(generate(invalidStates));
    mustNotContain(block, 'APTO', 'legacy APTO');
});

// ================= E6 — lista negativa legacy (RED) =================
const BLACKLIST_META = [
    LEGACY_HEADER,
    'Estado prebiológico:',
    'fecha validación',
    'Fuente de datos',
];
const BLACKLIST_DETAIL = [
    'Observaciones prebiológico',
    'Hemograma',
    'Bioquímica',
    'Serologías',
    'IGRA',
    'Mantoux',
    'Rx tórax',
    'Vacunación revisada',
    'Vacunación OK',
    'Medicina preventiva derivada',
    'derivada',
    'Vacunas pendientes',
];
record('E6.1 sin cabecera legacy ni meta global (estado/fecha/fuente)', () => {
    const text = generate(bothExplicit);
    for (const tok of BLACKLIST_META) mustNotContain(text, tok, 'bloque saliente');
});
record('E6.2 sin detalle legacy (hemograma/bioquímica/serologías/IGRA/Rx/vacunación/derivación/obs)', () => {
    const text = generate(bothExplicit);
    for (const tok of BLACKLIST_DETAIL) mustNotContain(text, tok, 'bloque saliente');
});

// ================= E7 — preservación clínica (GREEN invariants) =================
record('E7.1 tratamiento explícito preservado verbatim (solicitado, no validado)', () => {
    const text = generate(bothExplicit);
    mustContain(text, 'Adalimumab (solicitado — pendiente de validación FH) 40 mg', 'línea de tratamiento');
    mustContain(text, 'TRATAMIENTO ACTUAL', 'sección tratamiento');
});
record('E7.2 comorbilidades/diagnóstico/actividad preservados', () => {
    const text = generate(bothExplicit);
    mustContain(text, 'HTA', 'comorbilidad HTA');
    mustContain(text, 'Dislipidemia', 'comorbilidad DLP');
    mustContain(text, 'DIAGNÓSTICO', 'sección diagnóstico');
    mustContain(text, 'DAS28-CRP', 'actividad AR');
});
record('E7.3 sin inferencia terapéutica (no START/SWITCH/ADD_ON, no validado)', () => {
    const text = generate(bothExplicit);
    for (const tok of ['START', 'SWITCH', 'ADD_ON', 'validado', 'VALIDADO']) {
        mustNotContain(text, tok, 'inferencia terapéutica', false);
    }
});

// ================= Train 25 — procedencia actual vs plan (A1/A2, RED contra BASE) =================
// Witness for TRAIN_NEXUS_REUMA_FH_TREATMENT_PROVENANCE_25. Judged on the
// REAL artifact from the REAL generator. The TRATAMIENTO ACTUAL section is
// delimited STRUCTURALLY (the paragraph that starts at the fixed
// `TRATAMIENTO ACTUAL` header line, ended by the next blank-line-separated
// paragraph boundary), never by matching plan label wording.
const FORBIDDEN_CLAIM_TOKENS = [
    'prescrito',
    'prescripción',
    'dispensad',
    'iniciado',
    'validado',
    'VALIDADO',
    'START',
    'SWITCH',
    'ADD_ON',
    'solicitud efectuada',
];
// Synthetic explicit current treatment and a DIFFERENT synthetic plan drug.
// Both fixture strings are free of the forbidden claim tokens above.
const A1_CURRENT = 'Tratamiento actual sintético A (dato consignado)';
const A1_PLAN_DRUG = 'PlanFarmaco Sintetico B';
const A1_PLAN_DOSE = '20 mg';
const A2_PLAN_DRUG = 'PlanFarmaco Sintetico C';
const A2_PLAN_DOSE = '25 mg';

const a1Fixture = {
    ...BASE,
    tratamientoActual: A1_CURRENT,
    planBiologicosEntries: [{ farmaco: A1_PLAN_DRUG, dosis: A1_PLAN_DOSE }],
};
const a2Fixture = {
    ...BASE,
    planBiologicosEntries: [{ farmaco: A2_PLAN_DRUG, dosis: A2_PLAN_DOSE }],
};
delete a2Fixture.tratamientoActual;
delete a2Fixture.Tratamiento_Actual;

function extractTreatmentBlock(text) {
    const lines = text.split('\n');
    const start = lines.findIndex((l) => l.trim() === 'TRATAMIENTO ACTUAL');
    if (start === -1) {
        fail('estructura FH inesperada: falta la cabecera TRATAMIENTO ACTUAL');
    }
    // The section is one paragraph: it ends at the first blank line that
    // precedes the following paragraph (fixed section order guarantees the
    // next paragraph is another section or the footer).
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].trim() !== '') {
            end = i;
            break;
        }
    }
    return lines.slice(start, end).join('\n');
}

record('A1.1 dos fuentes distintas: TRATAMIENTO ACTUAL reproduce el valor explícito verbatim', () => {
    const block = extractTreatmentBlock(generate(a1Fixture));
    mustContain(block, A1_CURRENT, 'bloque TRATAMIENTO ACTUAL');
});
record('A1.2 dos fuentes distintas: el bloque ACTUAL no contiene el fármaco de plan', () => {
    const block = extractTreatmentBlock(generate(a1Fixture));
    mustNotContain(block, A1_PLAN_DRUG, 'bloque TRATAMIENTO ACTUAL');
});
record('A1.3 dos fuentes distintas: el plan (fármaco+dosis) permanece en el artefacto FUERA del bloque ACTUAL', () => {
    const text = generate(a1Fixture);
    const outside = text.replace(extractTreatmentBlock(text), '');
    mustContain(outside, A1_PLAN_DRUG, 'plan fuera del bloque ACTUAL');
    mustContain(outside, A1_PLAN_DOSE, 'dosis de plan fuera del bloque ACTUAL');
});
record('A1.4 dos fuentes distintas: el artefacto completo no lleva tokens de afirmación no prescrita', () => {
    const text = generate(a1Fixture);
    for (const tok of FORBIDDEN_CLAIM_TOKENS) mustNotContain(text, tok, 'afirmación no prescrita');
});
record('A2.1 sólo plan: el bloque ACTUAL no presenta el plan como tratamiento activo', () => {
    const block = extractTreatmentBlock(generate(a2Fixture));
    mustNotContain(block, A2_PLAN_DRUG, 'plan presentado como activo');
});
record('A2.2 sólo plan: el plan consignado (fármaco+dosis introducida) se conserva fuera del bloque ACTUAL', () => {
    const text = generate(a2Fixture);
    const outside = text.replace(extractTreatmentBlock(text), '');
    mustContain(outside, A2_PLAN_DRUG, 'plan fuera del bloque ACTUAL');
    mustContain(outside, A2_PLAN_DOSE, 'dosis de plan fuera del bloque ACTUAL');
});
record('A2.3 sólo plan: sin tokens de estado/afirmación fabricados', () => {
    const text = generate(a2Fixture);
    for (const tok of FORBIDDEN_CLAIM_TOKENS) mustNotContain(text, tok, 'afirmación no prescrita');
});
record('A2.4 sólo plan: la ausencia no se convierte en No informado/NO/pendiente', () => {
    const text = generate(a2Fixture);
    mustNotContain(text, 'No informado', 'ausencia→No informado');
    if (/\bNO\b/.test(text)) fail('ausencia→NO fabricado');
    mustNotContain(text, 'pendiente', 'ausencia→pendiente');
});

// ================= Train 25 corrector — testigos F2 y F3 (RED primero) =================
// F2: un `No` explícito consignado en la fuente de tratamiento actual es
// DATO consignado, no ausencia: se preserva literal en TRATAMIENTO ACTUAL;
// sólo el campo verdaderamente ausente produce el placeholder fail-safe.
// Los dos casos no pueden equipararse y de `No` no se deduce ningún estado
// de dispensación ni validación.
const T25_F2_NO_CAMEL = { ...BASE, tratamientoActual: 'No' };
const T25_F2_NO_FISICA = { ...BASE, Tratamiento_Actual: 'no' };
const T25_F2_AUSENTE = { ...BASE };
delete T25_F2_AUSENTE.tratamientoActual;
delete T25_F2_AUSENTE.Tratamiento_Actual;

record('T25-F2.1 No explícito (camelCase): TRATAMIENTO ACTUAL preserva el dato consignado literal', () => {
    const block = extractTreatmentBlock(generate(T25_F2_NO_CAMEL));
    if (!/^[-·•\s]*No$/m.test(block)) fail(`el No explícito no se preserva como dato: ${JSON.stringify(block)}`);
    mustNotContain(block, '(Sin tratamiento activo registrado)', 'No explícito equiparado a ausencia');
});
record('T25-F2.2 No explícito (columna física): TRATAMIENTO ACTUAL preserva el dato consignado literal', () => {
    const block = extractTreatmentBlock(generate(T25_F2_NO_FISICA));
    if (!/^[-·•\s]*no$/m.test(block)) fail(`el no explícito físico no se preserva como dato: ${JSON.stringify(block)}`);
    mustNotContain(block, '(Sin tratamiento activo registrado)', 'no explícito equiparado a ausencia');
});
record('T25-F2.3 contraste: campo verdaderamente ausente produce el placeholder y nunca el dato No', () => {
    const block = extractTreatmentBlock(generate(T25_F2_AUSENTE));
    mustContain(block, '(Sin tratamiento activo registrado)', 'placeholder de ausencia');
    if (/^[-·•\s]*[Nn]o\s*$/m.test(block)) fail('ausencia fabricada como dato No');
    for (const text of [generate(T25_F2_NO_CAMEL), generate(T25_F2_NO_FISICA)]) {
        for (const tok of FORBIDDEN_CLAIM_TOKENS) mustNotContain(text, tok, 'estado deducido desde No');
    }
});

// F3: el fallback no puede perder fuentes distintas: todos los elementos
// válidos no vacíos de la fase fallback seleccionada se conservan (p. ej.
// Sistemico + FAME juntos, junto a un actual explícito), con sus dosis
// introducidas expresamente y la precedencia plan*Entries > cambio*Entries >
// selectores/columnas > tratamientoData.cambio intacta.
const T25_F3_CURRENT = 'Tratamiento actual sintético F3 (dato consignado)';
const T25_F3_SISTEMICO = 'Leflunomida sintetica';
const T25_F3_SISTEMICO_DOSIS = '20 mg';
const T25_F3_FAME = 'Metotrexato sintetico';
const T25_F3_FAME_DOSIS = '15 mg';
const t25F3Fixture = { ...BASE };
delete t25F3Fixture.planBiologicosEntries;
t25F3Fixture.tratamientoActual = T25_F3_CURRENT;
t25F3Fixture.Sistemico = T25_F3_SISTEMICO;
t25F3Fixture.Sistemico_Dosis = T25_F3_SISTEMICO_DOSIS;
t25F3Fixture.FAME = T25_F3_FAME;
t25F3Fixture.FAME_Dosis = T25_F3_FAME_DOSIS;

record('T25-F3.1 fallback: Sistemico y FAME se conservan AMBOS con sus dosis introducidas', () => {
    const text = generate(t25F3Fixture);
    const outside = text.replace(extractTreatmentBlock(text), '');
    mustContain(outside, T25_F3_SISTEMICO, 'Sistemico en fallback');
    mustContain(outside, T25_F3_SISTEMICO_DOSIS, 'dosis Sistemico introducida');
    mustContain(outside, T25_F3_FAME, 'FAME en fallback');
    mustContain(outside, T25_F3_FAME_DOSIS, 'dosis FAME introducida');
});
record('T25-F3.2 fallback: el ACTUAL explícito permanece independiente (sin elevación del plan)', () => {
    const block = extractTreatmentBlock(generate(t25F3Fixture));
    mustContain(block, T25_F3_CURRENT, 'actual explícito');
    mustNotContain(block, T25_F3_SISTEMICO, 'fallback elevado a activo');
    mustNotContain(block, T25_F3_FAME, 'fallback elevado a activo');
});
record('T25-F3.3 fallback: sin tokens de afirmación fabricados', () => {
    const text = generate(t25F3Fixture);
    for (const tok of FORBIDDEN_CLAIM_TOKENS) mustNotContain(text, tok, 'afirmación no prescrita');
});

// ================= Observación de alcance (dashboard comparte generador) =================
record('OBS dashboard_paciente comparte el mismo generador (sin cambio)', () => {
    mustContain(DASH_SRC, 'id="btnSolicitudFH"', 'dashboard botón');
    mustContain(DASH_SRC, 'modules/pharmacyRequest.js', 'dashboard include');
    mustContain(DASH_HANDLER_SRC, 'HubTools.pharmacy.copyRequestToClipboard', 'dashboard handler generator');
});

const passed = results.filter(Boolean).length;
console.log(`\nRESULTADO: ${passed} OK / ${results.length - passed} FALLIDO`);
process.exit(results.every(Boolean) ? 0 : 1);
