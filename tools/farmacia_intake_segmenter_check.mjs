#!/usr/bin/env node
/**
 * WO-B (issue #294) — Pure detector/segmenter fixture battery (Seam 1).
 *
 * Verifies the WO-B segmentation module against paste-shaped synthetic
 * fixtures. Asserts the exact structural partition: which units, which
 * unknown fragments, or the deterministic SEGMENTATION_BLOCKED state — with
 * zero clinical parsing of any field content.
 *
 * Acceptance criteria exercised:
 *   1. Demo PreSalud raw fixture -> exactly one PreSalud unit.
 *   2. D17-shaped e-Orden fixture -> exactly one e-Orden unit.
 *   3. Mixed e-Orden + PreSalud with unique partition -> exactly two units,
 *      in BOTH source orders.
 *   4. Mixed input with no unique partition -> SEGMENTATION_BLOCKED for the
 *      whole import.
 *   5. Two e-Orden units in one input -> SEGMENTATION_BLOCKED (not
 *      partitionable).
 *   6. Isolable unknown text adjacent to a safe unit -> one unknown fragment
 *      plus one intact unit.
 *   7. Empty input and completely unknown input -> each a valid result with
 *      zero units and zero proposals; ambiguous block-ownership case ->
 *      SEGMENTATION_BLOCKED for the affected unit without app failure.
 *
 * Run: node tools/farmacia_intake_segmenter_check.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
    segmentClinicalIntake,
    SOURCE_EORDEN,
    SOURCE_PRESALUD,
    SOURCE_UNKNOWN,
    UNIT_STATE_RECOGNIZED,
    UNIT_STATE_SEGMENTATION_BLOCKED,
    KIND_EORDEN_UNIT,
    KIND_PRESALUD_UNIT,
    KIND_UNKNOWN_FRAGMENT,
    KIND_BLOCKED_UNIT,
    BLOCK_MULTI_EORDEN,
    BLOCK_MIXED_NO_UNIQUE_PARTITION,
    BLOCK_MULTI_RECORD_PRESALUD,
} from '../scripts/fh_intake_segmenter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
const failures = [];

function ok(msg) {
    console.log(`  ✓ ${msg}`);
    passed += 1;
}

function fail(msg) {
    console.log(`  ✗ ${msg}`);
    failed += 1;
    failures.push(msg);
}

function assert(condition, msg) {
    if (condition) ok(msg);
    else fail(msg);
}

function assertEqual(actual, expected, label) {
    if (actual === expected) ok(`${label}: ${JSON.stringify(expected)}`);
    else fail(`${label}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

// ─── Synthetic fixtures (paste-shaped; NO real patient data) ────────────────

const EORDEN_SEP = '═══════════════════════════════════════════════════════';

const EORDEN_FIXTURE =
    'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' +
    EORDEN_SEP + '\n' +
    '• CIP: CIP-SINT-0001\n' +
    '• Marca comercial solicitada: HYRIMOZ\n' +
    '• Dosis solicitada: 40 MG\n' +
    '• Vía solicitada: SC\n' +
    '• Pauta: CADA 14 DIAS\n' +
    '• Inducción solicitada: NO\n' +
    'PROGRAMA SES\n' +
    '• Código: SES_PSOR\n' +
    '• Denominación: PSORIASIS';

// Demo PreSalud raw (D9: Estado;Medicamento;Vía;Dosis;Pauta;Días). Estado and
// Días may be empty (WO-D NO_VALUE semantics); the medication field carries
// the commercial brand in a single parenthesized group (D10).
const PRESALUD_FIXTURE_EMPTY_STATE =
    ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';

const PRESALUD_FIXTURE_FULL =
    'En tratamiento;HYRIMOZ (HYRIMOZ 40MG);SC;40 MG;CADA 14 DIAS;28';

const UNKNOWN_TEXT = 'nota suelta del paciente\nsegunda línea sin estructura';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unitKinds(result) {
    return result.recognized_units.map((u) => u.kind);
}

function unitSources(result) {
    return result.recognized_units.map((u) => u.source);
}

function fragmentCount(result) {
    return result.unrecognized_fragments.length;
}

function blockingStates(result) {
    return result.blocking_states;
}

function errors(result) {
    return result.errors.map((e) => e.code);
}

function assertEnvelope(result, label) {
    assertEqual(typeof result, 'object', `${label}: resultado objeto`);
    assertEqual(result.can_apply, false, `${label}: can_apply = false`);
    assertEqual(typeof result.can_preview, 'boolean', `${label}: can_preview booleano`);
    assert(Array.isArray(result.recognized_units), `${label}: recognized_units array`);
    assert(Array.isArray(result.unrecognized_fragments), `${label}: unrecognized_fragments array`);
    assert(Array.isArray(result.blocking_states), `${label}: blocking_states array`);
    assert(Array.isArray(result.errors), `${label}: errors array`);
}

function assertTileExact(rawInput, result, label) {
    const all = [...result.recognized_units, ...result.unrecognized_fragments].sort(
        (a, b) => a.start_line - b.start_line || a.end_line - b.end_line
    );
    const canonical = rawInput.replace(/\r\n/g, '\n');
    const pieces = all.map((u) => u.raw);
    const interior = pieces.join('\n');
    // Items tile the trimmed semantic content; the exact original raw input is
    // always preserved verbatim in raw_input.
    assert(result.raw_input === rawInput, `${label}: raw_input conservado byte-exact`);
    assertEqual(interior, canonical.trim() === '' ? '' : canonical, `${label}: partición lossless sobre el contenido`);
}

// ─── WO-B matrix ─────────────────────────────────────────────────────────────

console.log('\n[WO-B] Criterio 1 — PreSalud demo raw → una unidad PreSalud');

{
    const r = segmentClinicalIntake(PRESALUD_FIXTURE_EMPTY_STATE);
    assertEnvelope(r, 'pre-salud estado vacío');
    assertEqual(unitKinds(r).length, 1, 'pre-salud: una unidad');
    assertEqual(unitKinds(r)[0], KIND_PRESALUD_UNIT, 'pre-salud: tipo presalud_unit');
    assertEqual(unitSources(r)[0], SOURCE_PRESALUD, 'pre-salud: source pre-salud');
    assertEqual(fragmentCount(r), 0, 'pre-salud: cero fragmentos');
    assertEqual(blockingStates(r).length, 0, 'pre-salud: sin bloqueos');
    assertEqual(r.detected_sources.join(','), SOURCE_PRESALUD, 'pre-salud: detected_sources');
    assertTileExact(PRESALUD_FIXTURE_EMPTY_STATE, r, 'pre-salud estado vacío');
}

{
    const r = segmentClinicalIntake(PRESALUD_FIXTURE_FULL);
    assertEqual(unitKinds(r).length, 1, 'pre-salud completo: una unidad');
    assertEqual(unitSources(r)[0], SOURCE_PRESALUD, 'pre-salud completo: source');
    assertEqual(r.recognized_units[0].record_count, 1, 'pre-salud completo: record_count 1');
    assertTileExact(PRESALUD_FIXTURE_FULL, r, 'pre-salud completo');
}

console.log('\n[WO-B] Criterio 2 — e-Orden D17 → una unidad e-Orden');

{
    const r = segmentClinicalIntake(EORDEN_FIXTURE);
    assertEnvelope(r, 'e-orden');
    assertEqual(unitKinds(r).length, 1, 'e-orden: una unidad');
    assertEqual(unitKinds(r)[0], KIND_EORDEN_UNIT, 'e-orden: tipo eorden_unit');
    assertEqual(unitSources(r)[0], SOURCE_EORDEN, 'e-orden: source e-orden');
    assertEqual(fragmentCount(r), 0, 'e-orden: cero fragmentos');
    assertEqual(blockingStates(r).length, 0, 'e-orden: sin bloqueos');
    assert(r.recognized_units[0].raw.includes('SOLICITUD DERMATOLOGÍA → FARMACIA'), 'e-orden: raw conserva header');
    assert(r.recognized_units[0].raw.includes(EORDEN_SEP), 'e-orden: raw conserva separador ═');
    assertEqual(r.detected_sources.join(','), SOURCE_EORDEN, 'e-orden: detected_sources');
    assertTileExact(EORDEN_FIXTURE, r, 'e-orden');
}

console.log('\n[WO-B] Criterio 3 — mixto con partición única → dos unidades, ambos órdenes');

for (const [name, raw] of [
    ['e-Orden primero', EORDEN_FIXTURE + '\n' + PRESALUD_FIXTURE_EMPTY_STATE],
    ['PreSalud primero', PRESALUD_FIXTURE_EMPTY_STATE + '\n' + EORDEN_FIXTURE],
]) {
    const r = segmentClinicalIntake(raw);
    assertEnvelope(r, `mixto ${name}`);
    assertEqual(unitKinds(r).length, 2, `mixto ${name}: dos unidades`);
    assertEqual(unitSources(r).filter((s) => s === SOURCE_EORDEN).length, 1, `mixto ${name}: una e-orden`);
    assertEqual(unitSources(r).filter((s) => s === SOURCE_PRESALUD).length, 1, `mixto ${name}: una pre-salud`);
    assertEqual(fragmentCount(r), 0, `mixto ${name}: cero fragmentos`);
    assertEqual(blockingStates(r).length, 0, `mixto ${name}: sin bloqueos`);
    assertTileExact(raw, r, `mixto ${name}`);
}

console.log('\n[WO-B] Criterio 4 — mixto sin partición única → SEGMENTATION_BLOCKED whole import');

{
    // PreSalud record-shaped line INSIDE the e-Orden span: ownership of the
    // record line is ambiguous (e-Orden body vs independent paste) — the
    // partition is not unique.
    const dirty =
        'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' +
        EORDEN_SEP + '\n' +
        '• CIP: CIP-SINT-0001\n' +
        PRESALUD_FIXTURE_EMPTY_STATE + '\n' +
        '• Marca comercial solicitada: HYRIMOZ\n' +
        EORDEN_SEP;
    const r = segmentClinicalIntake(dirty);
    assertEnvelope(r, 'mixto no único');
    assertEqual(blockingStates(r).join(','), BLOCK_MIXED_NO_UNIQUE_PARTITION, 'mixto no único: estado bloqueo');
    assertEqual(unitKinds(r).length, 1, 'mixto no único: una unidad bloqueada');
    assertEqual(unitKinds(r)[0], KIND_BLOCKED_UNIT, 'mixto no único: kind blocked_unit');
    assertEqual(unitSources(r)[0], SOURCE_UNKNOWN, 'mixto no único: source unknown (ownership ambiguo)');
    assertEqual(fragmentCount(r), 0, 'mixto no único: cero fragmentos');
    assertEqual(r.can_preview, true, 'mixto no único: can_preview true (raw/bloqueo visible)');
    assertEqual(r.recognized_units[0].state, UNIT_STATE_SEGMENTATION_BLOCKED, 'mixto no único: unit state bloqueado');
}

console.log('\n[WO-B] Criterio 5 — dos e-Orden en un input → SEGMENTATION_BLOCKED');

{
    const r = segmentClinicalIntake(EORDEN_FIXTURE + '\n\n' + EORDEN_FIXTURE);
    assertEnvelope(r, 'dos e-orden');
    assertEqual(blockingStates(r).join(','), BLOCK_MULTI_EORDEN, 'dos e-orden: estado bloqueo');
    assertEqual(unitKinds(r).length, 1, 'dos e-orden: una unidad bloqueada');
    assertEqual(unitKinds(r)[0], KIND_BLOCKED_UNIT, 'dos e-orden: kind blocked_unit');
    assertEqual(unitSources(r)[0], SOURCE_EORDEN, 'dos e-orden: source e-orden');
    assertEqual(fragmentCount(r), 0, 'dos e-orden: cero fragmentos');
}

console.log('\n[WO-B] Criterio 6 — unknown aislable junto a unidad segura → fragment + unidad');

for (const [name, raw] of [
    ['unknown antes de e-Orden', UNKNOWN_TEXT + '\n' + EORDEN_FIXTURE],
    ['e-Orden seguido de unknown', EORDEN_FIXTURE + '\n' + UNKNOWN_TEXT],
]) {
    const r = segmentClinicalIntake(raw);
    assertEnvelope(r, `unknown ${name}`);
    assertEqual(unitKinds(r).filter((k) => k === KIND_EORDEN_UNIT).length, 1, `unknown ${name}: e-orden intacta`);
    assertEqual(fragmentCount(r), 1, `unknown ${name}: un fragmento unknown`);
    assertEqual(r.unrecognized_fragments[0].source, SOURCE_UNKNOWN, `unknown ${name}: fragmento source unknown`);
    assertEqual(blockingStates(r).length, 0, `unknown ${name}: sin bloqueos`);
    assertTileExact(raw, r, `unknown ${name}`);
}

console.log('\n[WO-B] Criterio 7a — input vacío → resultado válido, cero unidades/propuestas');

{
    for (const empty of ['', '   ', '\n', '\t\n']) {
        const r = segmentClinicalIntake(empty);
        assertEnvelope(r, 'vacío');
        assertEqual(unitKinds(r).length, 0, `vacío ${JSON.stringify(empty)}: cero unidades`);
        assertEqual(fragmentCount(r), 0, `vacío ${JSON.stringify(empty)}: cero fragmentos`);
        assertEqual(blockingStates(r).length, 0, `vacío ${JSON.stringify(empty)}: sin bloqueos`);
        assertEqual(r.errors.length, 0, `vacío ${JSON.stringify(empty)}: sin errores`);
    }
}

console.log('\n[WO-B] Criterio 7b — input completamente desconocido → resultado válido, cero unidades');

{
    const r = segmentClinicalIntake(UNKNOWN_TEXT);
    assertEnvelope(r, 'desconocido');
    assertEqual(unitKinds(r).length, 0, 'desconocido: cero unidades');
    assertEqual(r.recognized_units.length, 0, 'desconocido: recognized_units vacío');
    assertEqual(fragmentCount(r), 1, 'desconocido: texto aislado como un fragmento');
    assertEqual(blockingStates(r).length, 0, 'desconocido: sin bloqueos (resultado válido D3)');
    assertEqual(r.errors.length, 0, 'desconocido: sin errores');
    assertEqual(r.detected_sources.length, 0, 'desconocido: cero fuentes detectadas');
    assertEqual(r.unrecognized_fragments[0].raw, UNKNOWN_TEXT, 'desconocido: raw conservado lossless');
}

console.log('\n[WO-B] Criterio 7c — caso de ownership ambiguo → dos unidades PreSalud + fragment (T2 no bloquea multi-record)');

{
    // Dos registros PreSalud separados por texto desconocido: T2 no adjudica
    // multi-record (F-CODE-02). Cada registro es una unidad PreSalud independiente;
    // el texto intermedio es unknown fragment. T2 no bloquea.
    const ambiguous =
        ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n' +
        'texto intermedio ambiguo\n' +
        'Activo;BENEPALI (BENEPALI 45MG);SC;45 MG;CADA 28 DIAS;28';
    const r = segmentClinicalIntake(ambiguous);
    assertEnvelope(r, 'ownership ambiguo');
    assertEqual(blockingStates(r).length, 0, 'ownership ambiguo: sin bloqueos T2');
    assertEqual(unitKinds(r).filter((k) => k === KIND_PRESALUD_UNIT).length, 2, 'ownership ambiguo: dos unidades PreSalud');
    assertEqual(fragmentCount(r), 1, 'ownership ambiguo: texto intermedio como fragmento');
    assertEqual(r.errors.length, 0, 'ownership ambiguo: sin errores (app no rota)');
    assertEqual(r.can_preview, true, 'ownership ambiguo: can_preview true');
    assertEqual(r.can_apply, false, 'ownership ambiguo: can_apply false');
}

console.log('\n[WO-B] Proporcionalidad D13 — multi-record PreSalud + e-Orden independiente (F-CODE-02: T2 no bloquea)');

{
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const recB = 'Activo;BENEPALI (BENEPALI 45MG);SC;45 MG;CADA 28 DIAS;28';
    const raw = recA + '\n\n' + recB + '\n\n' + EORDEN_FIXTURE;
    const r = segmentClinicalIntake(raw);
    assertEnvelope(r, 'multi-record + e-orden');
    assertEqual(blockingStates(r).length, 0, 'multi-record + e-orden: sin bloqueos T2');
    assertEqual(unitSources(r).filter((s) => s === SOURCE_EORDEN).length, 1, 'multi-record + e-orden: e-orden intacta');
    const pres = r.recognized_units.filter((u) => u.source === SOURCE_PRESALUD);
    assertEqual(pres.length, 2, 'multi-record + e-orden: dos unidades PreSalud');
    assert(pres.every((u) => u.state === UNIT_STATE_RECOGNIZED), 'multi-record + e-orden: PreSalud reconocidas (no bloqueadas en T2)');
    assertEqual(r.errors.length, 0, 'multi-record + e-orden: sin errores');
    assertEqual(r.raw_input, raw, 'multi-record + e-orden: raw_input conservado');
    assertEqual(r.can_apply, false, 'multi-record + e-orden: can_apply false');
}

{
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const raw = recA + '\n\n' + EORDEN_FIXTURE + '\n\n' + recA;
    const r = segmentClinicalIntake(raw);
    assertEnvelope(r, 'record-eorden-record');
    assertEqual(blockingStates(r).length, 0, 'record-eorden-record: sin bloqueos T2');
    assertEqual(unitSources(r).filter((s) => s === SOURCE_EORDEN).length, 1, 'record-eorden-record: e-orden intacta');
    assertEqual(r.recognized_units.filter((u) => u.source === SOURCE_PRESALUD).length, 2, 'record-eorden-record: dos PreSalud');
    assertEqual(r.errors.length, 0, 'record-eorden-record: sin errores');
    assertEqual(r.can_apply, false, 'record-eorden-record: can_apply false');
}

console.log('\n[WO-B] Proporcionalidad D13 — dos e-Orden seguidas de PreSalud → whole import bloqueado');

console.log('\n[WO-B] Proporcionalidad D13 — dos e-Orden seguidas de PreSalud → whole import bloqueado');

{
    const raw = EORDEN_FIXTURE + '\n\n' + EORDEN_FIXTURE + '\n\n' + PRESALUD_FIXTURE_EMPTY_STATE;
    const r = segmentClinicalIntake(raw);
    assertEnvelope(r, 'dos e-orden + pre-salud');
    assertEqual(blockingStates(r).join(','), BLOCK_MULTI_EORDEN, 'dos e-orden + pre-salud: estado');
    assertEqual(r.errors.length, 0, 'dos e-orden + pre-salud: sin errores');
}

console.log('\n[WO-B] Regresión estructural — header inválido, header-like y record-dentro-de-e-Orden');

{
    // Header-like line sin cuerpo D17 válido entre dos registros PreSalud:
    // T2 no bloquea multi-record (F-CODE-02): dos PreSalud + fragment header-like.
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const raw = recA + '\nSOLICITUD DERMATOLOGÍA → FARMACIA - X\n' + recA;
    const r = segmentClinicalIntake(raw);
    assertEqual(blockingStates(r).length, 0, 'header-like entre records: sin bloqueos T2');
    assertEqual(unitSources(r).filter((s) => s === SOURCE_PRESALUD).length, 2, 'header-like entre records: dos PreSalud');
    assertEqual(fragmentCount(r), 1, 'header-like entre records: header-like como fragment');
    assertEqual(r.errors.length, 0, 'header-like entre records: sin errores');
    assertEqual(r.can_apply, false, 'header-like entre records: can_apply false');
}

{
    // Header e-Orden inválido (sin separador) seguido de un registro PreSalud
    // → el header es texto unknown y el registro se reconoce de forma
    // independiente (nunca es tragado por el header).
    const raw = 'SOLICITUD DERMATOLOGÍA → FARMACIA - X\n;HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const r = segmentClinicalIntake(raw);
    assertEqual(r.errors.length, 0, 'header inválido + record: sin errores');
    assertEqual(unitSources(r).filter((s) => s === SOURCE_PRESALUD).length, 1, 'header inválido + record: registro PreSalud reconocido');
    assertEqual(fragmentCount(r), 1, 'header inválido + record: header como fragmento unknown');
}

{
    // Registro PreSalud DENTRO del span de un header e-Orden con separador:
    // ownership ambiguo → whole import SEGMENTATION_BLOCKED.
    const SEP = '═══════════════════════════════════════════════════════';
    const raw =
        'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + SEP + '\n' +
        '• CIP: CIP-SINT-0001\n' +
        ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;\n' +
        '• Marca comercial solicitada: HYRIMOZ\n' + SEP;
    const r = segmentClinicalIntake(raw);
    assertEqual(blockingStates(r).join(','), BLOCK_MIXED_NO_UNIQUE_PARTITION, 'record dentro e-orden: estado');
    assertEqual(r.errors.length, 0, 'record dentro e-orden: sin errores');
}

{
    // Header mixto (con registro dentro de su span) conviviendo con una
    // e-Orden válida: la partición no es única → whole import bloqueado
    // (el registro dentro del span de un header nunca es atribuible).
    const SEP = '═══════════════════════════════════════════════════════';
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const eoValid =
        'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + SEP + '\n' +
        '• CIP: CIP-SINT-0001\n• Marca comercial solicitada: HYRIMOZ\n' + SEP;
    const dirtyHeader =
        'SOLICITUD DERMATOLOGÍA → FARMACIA - ALGO\n' + SEP + '\n' +
        recA + '\n• Marca: X\n' + SEP;
    const raw = eoValid + '\n\n' + dirtyHeader;
    const r = segmentClinicalIntake(raw);
    assertEqual(blockingStates(r).join(','), BLOCK_MIXED_NO_UNIQUE_PARTITION, 'válida + header mixto: estado');
    assertEqual(r.errors.length, 0, 'válida + header mixto: sin errores');
}

console.log('\n[WO-B] Anti-fuzzy estructural (sin parsing de contenido de campo)');

{
    // 5 campos (no 6) → no es registro D9 → fragmento unknown
    const r = segmentClinicalIntake('HYRIMOZ;SC;40 MG;CADA 14;28');
    assertEqual(unitKinds(r).length, 0, '5 campos: cero unidades');
    assertEqual(fragmentCount(r), 1, '5 campos: fragmento unknown');
}
{
    // 7 campos → no es registro D9 → fragmento unknown
    const r = segmentClinicalIntake('a;b;c;d;e;f;g');
    assertEqual(unitKinds(r).length, 0, '7 campos: cero unidades');
    assertEqual(fragmentCount(r), 1, '7 campos: fragmento unknown');
}
{
    // Segundo grupo parentizado en Medicamento (D10) → T2 NO valida subgramática (F-CODE-02):
    // el material estructuralmente identificable debe llegar a T4 como PreSalud.
    const r = segmentClinicalIntake('Activo;HYRIMOZ (HYRIMOZ) EXTRA (40);SC;40 MG;CADA 14;28');
    assertEqual(unitKinds(r).length, 1, 'segundo paréntesis: una unidad PreSalud (T2 no valida paréntesis)');
    assertEqual(unitKinds(r)[0], KIND_PRESALUD_UNIT, 'segundo paréntesis: tipo presalud_unit');
    assertEqual(fragmentCount(r), 0, 'segundo paréntesis: cero fragmentos');
    assertEqual(r.can_apply, false, 'segundo paréntesis: can_apply false');
}
{
    // Vía vacía → registro incompleto → no es registro D9
    const r = segmentClinicalIntake('Activo;HYRIMOZ (HYRIMOZ);;40 MG;CADA 14 DIAS;28');
    assertEqual(unitKinds(r).length, 0, 'vía vacía: cero unidades');
    assertEqual(fragmentCount(r), 1, 'vía vacía: fragmento unknown');
}
{
    // e-Orden sin separador ═ → no es unidad D17 válida → unknown fragment
    const r = segmentClinicalIntake('SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n• CIP: 1\n• Marca comercial solicitada: X');
    assertEqual(unitKinds(r).length, 0, 'e-orden sin ═: cero unidades');
    assertEqual(fragmentCount(r), 1, 'e-orden sin ═: fragmento unknown');
}

console.log('\n[WO-B] Transporte (D17): CRLF y trailing whitespace');

{
    const r = segmentClinicalIntake(EORDEN_FIXTURE.replace(/\n/g, '\r\n'));
    assertEqual(unitKinds(r).length, 1, 'CRLF e-orden: una unidad');
    assertEqual(r.raw_input, EORDEN_FIXTURE.replace(/\n/g, '\r\n'), 'CRLF e-orden: raw_input conserva CRLF');
}
{
    const r = segmentClinicalIntake(EORDEN_FIXTURE + '\n' + PRESALUD_FIXTURE_EMPTY_STATE + '\n\n');
    assertEqual(unitKinds(r).length, 2, 'trailing newline mixto: dos unidades');
    assertEqual(r.errors.length, 0, 'trailing newline mixto: sin errores');
}
{
    const r = segmentClinicalIntake('  \n' + EORDEN_FIXTURE + '\n  ');
    assertEqual(unitKinds(r).length, 1, 'whitespace periférico: una unidad');
    assertEqual(r.errors.length, 0, 'whitespace periférico: sin errores');
}

console.log('\n[WO-B] Fail-safe envelope — can_apply=false en todos los estados');

{
    for (const raw of [
        '',
        UNKNOWN_TEXT,
        PRESALUD_FIXTURE_FULL,
        EORDEN_FIXTURE,
        EORDEN_FIXTURE + '\n' + PRESALUD_FIXTURE_EMPTY_STATE,
        EORDEN_FIXTURE + '\n\n' + EORDEN_FIXTURE,
    ]) {
        const r = segmentClinicalIntake(raw);
        assertEqual(r.can_apply, false, `can_apply=false (${raw.slice(0, 20)}…)`);
    }
}

console.log('\n[WO-B] Determinismo — mismas entradas → mismas salidas');

{
    const inputs = [PRESALUD_FIXTURE_FULL, EORDEN_FIXTURE, EORDEN_FIXTURE + '\n' + PRESALUD_FIXTURE_EMPTY_STATE];
    for (const raw of inputs) {
        const a = JSON.stringify(segmentClinicalIntake(raw));
        const b = JSON.stringify(segmentClinicalIntake(raw));
        assertEqual(a === b, true, `determinista (${raw.slice(0, 20)}…)`);
    }
}

console.log('\n[WO-B] Regresiones F-CODE-01..05 — falsificación de findings');

// F-CODE-01: D17 exact shape no closing separator — unit runs header through final Denominación, no closing ═ required
{
    const r = segmentClinicalIntake(EORDEN_FIXTURE);
    assertEqual(unitKinds(r).length, 1, 'F-CODE-01: D17 sin closing ═ → una unidad e-orden');
    assertEqual(unitKinds(r)[0], KIND_EORDEN_UNIT, 'F-CODE-01: kind eorden_unit');
    assert(r.recognized_units[0].raw.endsWith('• Denominación: PSORIASIS'), 'F-CODE-01: raw termina en Denominación (no closing)');
    assert(!r.recognized_units[0].raw.endsWith(EORDEN_SEP), 'F-CODE-01: raw no termina en separador closing');
    // Closing separator after a valid unit must be skippable, not part of unit, not causing invalid
    const withClosing = EORDEN_FIXTURE + '\n' + EORDEN_SEP;
    const rc = segmentClinicalIntake(withClosing);
    assertEqual(unitKinds(rc).length, 1, 'F-CODE-01: closing separador extra es skippable, sigue 1 unidad');
    assertEqual(fragmentCount(rc), 0, 'F-CODE-01: closing extra no crea fragment');
    assertEqual(rc.blocking_states.length, 0, 'F-CODE-01: closing extra no bloquea');
}

// F-CODE-02: T4 ownership leakage — T4-invalid meds still reach T4 as PreSalud, no subgrammar validation in T2
{
    const t4Invalid = 'Activo;HYRIMOZ (HYRIMOZ) EXTRA (40);SC;40 MG;CADA 14;28';
    const r = segmentClinicalIntake(t4Invalid);
    assertEqual(unitKinds(r).length, 1, 'F-CODE-02: T4-invalid con segundo paréntesis llega a T4 como PreSalud');
    assertEqual(unitKinds(r)[0], KIND_PRESALUD_UNIT, 'F-CODE-02: kind presalud_unit');
    assertEqual(r.recognized_units[0].raw, t4Invalid, 'F-CODE-02: raw preservado exacto para T4');
    assertEqual(r.can_apply, false, 'F-CODE-02: can_apply false');
}
// F-CODE-02: no multi-record rejection in T2
{
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const recB = 'Activo;BENEPALI (BENEPALI 45MG);SC;45 MG;CADA 28 DIAS;28';
    const raw = recA + '\n' + recB;
    const r = segmentClinicalIntake(raw);
    assertEqual(unitKinds(r).filter((k) => k === KIND_PRESALUD_UNIT).length, 2, 'F-CODE-02: multi-record no bloqueado en T2 → dos unidades PreSalud');
    assertEqual(r.blocking_states.length, 0, 'F-CODE-02: multi-record sin blocking_states en T2');
    assertEqual(r.can_apply, false, 'F-CODE-02: can_apply false con multi-record');
    // Incluso con e-Orden intercalada, T2 no adjudica MULTI_RECORD
    const rawMixed = recA + '\n\n' + EORDEN_FIXTURE + '\n\n' + recB;
    const rm = segmentClinicalIntake(rawMixed);
    assertEqual(rm.blocking_states.length, 0, 'F-CODE-02: multi-record mixto sin blocking T2');
    assertEqual(unitSources(rm).filter((s) => s === SOURCE_PRESALUD).length, 2, 'F-CODE-02: mixto multi-record conserva dos PreSalud');
}

// F-CODE-03: raw preservation incl CRLF/Unicode
{
    const rawCRLF = EORDEN_FIXTURE.replace(/\n/g, '\r\n');
    const r = segmentClinicalIntake(rawCRLF);
    assertEqual(r.raw_input, rawCRLF, 'F-CODE-03: raw_input preserva CRLF byte-exact');
    assertEqual(r.recognized_units[0].raw, rawCRLF, 'F-CODE-03: unit.raw preserva CRLF (single unit)');
    // Mixto CRLF
    const rawMixedCRLF = (EORDEN_FIXTURE + '\n' + ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;').replace(/\n/g, '\r\n');
    const rm = segmentClinicalIntake(rawMixedCRLF);
    assertEqual(rm.raw_input, rawMixedCRLF, 'F-CODE-03: mixto raw_input CRLF preservado');
    for (const u of [...rm.recognized_units, ...rm.unrecognized_fragments]) {
        assert(rm.raw_input.includes(u.raw), `F-CODE-03: fragment raw substring exacta (${u.kind})`);
    }
    // Unicode bytes preserved: raw with accent and arrow
    const unicodeRaw = 'SOLICITUD DERMATOLOGÍA → FARMACIA - PRUEBA\n' + EORDEN_SEP + '\n• CIP: 1\n• Marca comercial solicitada: X\n• Dosis solicitada: 40 MG\n• Vía solicitada: SC\n• Pauta: CADA 14 DIAS\n• Inducción solicitada: NO\nPROGRAMA SES\n• Código: SES_PSOR\n• Denominación: PSORIASIS';
    const ru = segmentClinicalIntake(unicodeRaw);
    assertEqual(ru.raw_input, unicodeRaw, 'F-CODE-03: Unicode bytes preservados');
    assertEqual(ru.recognized_units[0].raw, unicodeRaw, 'F-CODE-03: unit Unicode preservado');
}

// F-CODE-04: remove 40-line threshold — >40 blank/sep lines must NOT trigger invented parser error
{
    const manyBlanks = EORDEN_FIXTURE + '\n' + '\n'.repeat(50) + ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const r = segmentClinicalIntake(manyBlanks);
    assertEqual(r.errors.length, 0, 'F-CODE-04: >40 blank lines sin parser error inventado');
    assertEqual(unitKinds(r).filter((k) => k === KIND_EORDEN_UNIT).length, 1, 'F-CODE-04: e-orden intacta con >40 blanks');
    assertEqual(unitKinds(r).filter((k) => k === KIND_PRESALUD_UNIT).length, 1, 'F-CODE-04: PreSalud intacta con >40 blanks');
    const onlyBlanks = '\n'.repeat(45);
    const rb = segmentClinicalIntake(onlyBlanks);
    assertEqual(rb.recognized_units.length, 0, 'F-CODE-04: solo blanks → cero unidades (no error)');
    assertEqual(rb.errors.length, 0, 'F-CODE-04: solo blanks sin error');
    const manySeps = EORDEN_SEP + '\n' + (EORDEN_SEP + '\n').repeat(45);
    const rs = segmentClinicalIntake(manySeps);
    assertEqual(rs.errors.length, 0, 'F-CODE-04: many separators sin error');
}

// F-CODE-05: NFC-compare-only + exact D17 header grammar, no fuzzy
{
    // Exact header grammar: prefix lookalike must NOT be recognized
    const bogus = 'SOLICITUD DERMATOLOGÍA → FARMACIA_BOGUS - PSORIASIS\n' + EORDEN_SEP + '\n• CIP: 1\n• Marca comercial solicitada: X\n• Dosis solicitada: 40 MG\n• Vía solicitada: SC\n• Pauta: CADA 14 DIAS\n• Inducción solicitada: NO\nPROGRAMA SES\n• Código: SES_PSOR\n• Denominación: PSORIASIS';
    const rb = segmentClinicalIntake(bogus);
    assertEqual(unitKinds(rb).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-CODE-05: FARMACIA_BOGUS no reconocido como e-orden');
    // Bogus header block is split by opening separator into two unknown fragments (header + body)
    assert(fragmentCount(rb) >= 1, 'F-CODE-05: bogus header como fragment unknown');
    // Missing " - <TÍTULO>" part
    const noTitle = 'SOLICITUD DERMATOLOGÍA → FARMACIA\n' + EORDEN_SEP + '\n• CIP: 1\n';
    const rn = segmentClinicalIntake(noTitle);
    assertEqual(unitKinds(rn).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-CODE-05: header sin " - título" no reconocido');
    // NFC compare-only: decomposed form (NFD) should be recognized as same header, but raw preserved
    const nfdHeader = 'SOLICITUD DERMATOLOGI\u0301A → FARMACIA - PSORIASIS'; // Í decomposed
    const nfdRaw = nfdHeader + '\n' + EORDEN_SEP + '\n• CIP: 1\n• Marca comercial solicitada: X\n• Dosis solicitada: 40 MG\n• Vía solicitada: SC\n• Pauta: CADA 14 DIAS\n• Inducción solicitada: NO\nPROGRAMA SES\n• Código: SES_PSOR\n• Denominación: PSORIASIS';
    const rnfd = segmentClinicalIntake(nfdRaw);
    assertEqual(unitKinds(rnfd).filter((k) => k === KIND_EORDEN_UNIT).length, 1, 'F-CODE-05: NFC header NFD reconocido comparación');
    assertEqual(rnfd.raw_input, nfdRaw, 'F-CODE-05: NFC raw preservado byte-exact (NFD no normalizado en raw)');
    assertEqual(rnfd.recognized_units[0].raw, nfdRaw, 'F-CODE-05: unit raw NFD preservado');
    // Fuzzy not allowed: case-folding, accent-folding, alias
    const lower = 'solicitud dermatología → farmacia - psoriasis\n' + EORDEN_SEP + '\n• CIP: 1\n';
    const rl = segmentClinicalIntake(lower);
    assertEqual(unitKinds(rl).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-CODE-05: case-folding no reconocido');
}

console.log('\n[WO-B] F-CODE-05 adicional — malformed D17 reject y can_apply=false throughout');
{
    // Malformed D17: header correct but missing opening separator
    const malformed = 'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n• CIP: 1\n• Marca comercial solicitada: X\n';
    const r = segmentClinicalIntake(malformed);
    assertEqual(unitKinds(r).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'malformed D17 sin separador no es e-orden');
    assertEqual(fragmentCount(r), 1, 'malformed D17 como unknown fragment');
    // can_apply false throughout all states
    for (const raw of ['', 'texto', EORDEN_FIXTURE, ';A;B;C;D;E;F', manyBlanksTest()]) {
        const rr = segmentClinicalIntake(raw);
        assertEqual(rr.can_apply, false, `can_apply false (${raw.slice(0,10)}…)`);
    }
    function manyBlanksTest() {
        return EORDEN_FIXTURE + '\n' + '\n'.repeat(30) + ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(64));
console.log(`RESULTADO: ${passed} OK / ${failed} FALLIDO`);
if (failed === 0) {
    console.log('✓ WO-B segmenter fixture battery PASSED');
    console.log(`Battery: ${path.basename(fileURLToPath(import.meta.url))}`);
} else {
    console.log('✗ WO-B segmenter fixture battery FAILED');
    console.log('\nFallos:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
}
