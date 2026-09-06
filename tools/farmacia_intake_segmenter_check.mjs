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

console.log('\n[WO-B] Proporcionalidad D13 — multi-record PreSalud + e-Orden independiente (Repair A: una unidad PreSalud, T2 no bloquea)');

{
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const recB = 'Activo;BENEPALI (BENEPALI 45MG);SC;45 MG;CADA 28 DIAS;28';
    const raw = recA + '\n\n' + recB + '\n\n' + EORDEN_FIXTURE;
    const r = segmentClinicalIntake(raw);
    assertEnvelope(r, 'multi-record + e-orden');
    assertEqual(blockingStates(r).length, 0, 'multi-record + e-orden: sin bloqueos T2');
    assertEqual(unitSources(r).filter((s) => s === SOURCE_EORDEN).length, 1, 'multi-record + e-orden: e-orden intacta');
    const pres = r.recognized_units.filter((u) => u.source === SOURCE_PRESALUD);
    assertEqual(pres.length, 1, 'multi-record + e-orden: una unidad PreSalud (Repair A)');
    assertEqual(pres[0].record_count, 2, 'multi-record + e-orden: record_count 2');
    assertEqual(pres[0].raw, recA + '\n\n' + recB, 'multi-record + e-orden: raw multi-record preservado exacto');
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
    // F-AUDIT-06: an extra closing separator after an otherwise valid D17
    // unit is non-contractual and must NOT silently disappear: it survives
    // as an isolable unknown fragment (no block, raw preserved).
    const withClosing = EORDEN_FIXTURE + '\n' + EORDEN_SEP;
    const rc = segmentClinicalIntake(withClosing);
    assertEqual(unitKinds(rc).length, 1, 'F-CODE-01/F-AUDIT-06: closing extra no forma parte de la unidad (sigue 1 unidad)');
    assertEqual(fragmentCount(rc), 1, 'F-AUDIT-06: closing extra sobrevive como un fragmento unknown');
    assertEqual(rc.unrecognized_fragments[0].raw, EORDEN_SEP, 'F-AUDIT-06: closing extra raw byte-exact');
    assertEqual(rc.blocking_states.length, 0, 'F-AUDIT-06: closing extra aislable no bloquea');
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
// F-CODE-02 (actualizado por Repair A, issue #303): no multi-record
// rejection in T2 — contiguous records stay ONE structural unit for T4.
{
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const recB = 'Activo;BENEPALI (BENEPALI 45MG);SC;45 MG;CADA 28 DIAS;28';
    const raw = recA + '\n' + recB;
    const r = segmentClinicalIntake(raw);
    assertEqual(unitKinds(r).filter((k) => k === KIND_PRESALUD_UNIT).length, 1, 'F-CODE-02/Repair A: multi-record contiguo → una unidad PreSalud');
    assertEqual(r.recognized_units[0].record_count, 2, 'F-CODE-02/Repair A: record_count 2');
    assertEqual(r.recognized_units[0].raw, raw, 'F-CODE-02/Repair A: raw multi-record preservado exacto para T4');
    assertEqual(r.blocking_states.length, 0, 'F-CODE-02: multi-record sin blocking_states en T2');
    assertEqual(r.can_apply, false, 'F-CODE-02: can_apply false con multi-record');
    // Con e-Orden intercalada, cada región PreSalud es su propia unidad y
    // T2 no adjudica MULTI_RECORD.
    const rawMixed = recA + '\n\n' + EORDEN_FIXTURE + '\n\n' + recB;
    const rm = segmentClinicalIntake(rawMixed);
    assertEqual(rm.blocking_states.length, 0, 'F-CODE-02: multi-record mixto sin blocking T2');
    assertEqual(unitSources(rm).filter((s) => s === SOURCE_PRESALUD).length, 2, 'F-CODE-02: mixto con e-Orden intercalada conserva dos PreSalud (regiones distintas)');
}

console.log('\n[Repair A #303] — PreSalud multi-record contiguo → una unidad estructural');

{
    const recA = ';HYRIMOZ (HYRIMOZ);SC;40 MG;CADA 14 DIAS;';
    const recB = 'Activo;BENEPALI (BENEPALI 45MG);SC;45 MG;CADA 28 DIAS;28';
    const recC = ';ADALIMUMAB (HULIO 40MG);SC;40 MG;CADA 14 DIAS;14';
    // Dos registros contiguos: una unidad, record_count=2, raw exacto.
    const raw2 = recA + '\n' + recB;
    const r2 = segmentClinicalIntake(raw2);
    assertEnvelope(r2, 'repair-A dos contiguos');
    assertEqual(unitKinds(r2).length, 1, 'repair-A: dos contiguos → una unidad');
    assertEqual(unitKinds(r2)[0], KIND_PRESALUD_UNIT, 'repair-A: tipo presalud_unit');
    assertEqual(r2.recognized_units[0].record_count, 2, 'repair-A: record_count 2');
    assertEqual(r2.recognized_units[0].raw, raw2, 'repair-A: raw byte-exact para T4');
    assertEqual(fragmentCount(r2), 0, 'repair-A: cero fragmentos');
    assertEqual(blockingStates(r2).length, 0, 'repair-A: T2 no bloquea (T4 adjudica)');
    // Tres registros contiguos: una unidad, record_count=3.
    const raw3 = recA + '\n' + recB + '\n' + recC;
    const r3 = segmentClinicalIntake(raw3);
    assertEqual(unitKinds(r3).length, 1, 'repair-A: tres contiguos → una unidad');
    assertEqual(r3.recognized_units[0].record_count, 3, 'repair-A: record_count 3');
    assertEqual(r3.recognized_units[0].raw, raw3, 'repair-A: raw de tres preservado exacto');
    // Registros separados solo por líneas en blanco de transporte: misma región.
    const rawBlank = recA + '\n\n' + recB;
    const rb = segmentClinicalIntake(rawBlank);
    assertEqual(unitKinds(rb).length, 1, 'repair-A: separados por blank → una unidad');
    assertEqual(rb.recognized_units[0].record_count, 2, 'repair-A: blank intermedio no cuenta como registro');
    assertEqual(rb.recognized_units[0].raw, rawBlank, 'repair-A: blank intermedio preservado en raw');
    // Un solo registro sigue siendo una unidad con record_count=1.
    const r1 = segmentClinicalIntake(recA);
    assertEqual(unitKinds(r1).length, 1, 'repair-A: un registro → una unidad');
    assertEqual(r1.recognized_units[0].record_count, 1, 'repair-A: record_count 1');
    // Contiguos en CRLF: una unidad, CRLF preservado.
    const rawCRLF = (recA + '\n' + recB).replace(/\n/g, '\r\n');
    const rc = segmentClinicalIntake(rawCRLF);
    assertEqual(unitKinds(rc).length, 1, 'repair-A CRLF: una unidad');
    assertEqual(rc.recognized_units[0].record_count, 2, 'repair-A CRLF: record_count 2');
    assertEqual(rc.recognized_units[0].raw, rawCRLF, 'repair-A CRLF: raw CRLF byte-exact');
    // Registros separados por texto unknown: regiones distintas → dos unidades.
    const rawSplit = recA + '\nnota intermedia\n' + recB;
    const rs = segmentClinicalIntake(rawSplit);
    assertEqual(unitKinds(rs).filter((k) => k === KIND_PRESALUD_UNIT).length, 2, 'repair-A: unknown intermedio → dos unidades');
    assertEqual(fragmentCount(rs), 1, 'repair-A: unknown intermedio como fragmento');
    for (const r of [r2, r3, rb, r1, rc, rs]) {
assertEqual(r.can_apply, false, 'repair-A: can_apply false');
assertEqual(r.errors.length, 0, 'repair-A: sin errores');
    }
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
    assertEqual(unitKinds(rs).length, 0, 'F-AUDIT-06: many separators → cero unidades');
    assert(fragmentCount(rs) >= 1, 'F-AUDIT-06: many separators sobreviven como fragments (no vaciado)');
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

console.log('\n[WO-B] Regresiones F-AUDIT-06 — separadores no contractuales no desaparecen');

{
    // Separator-only input is NOT empty input: it survives as unknown.
    const r1 = segmentClinicalIntake(EORDEN_SEP);
    assertEnvelope(r1, 'F-AUDIT-06 separator-only');
    assertEqual(unitKinds(r1).length, 0, 'F-AUDIT-06: separator-only → cero unidades');
    assertEqual(fragmentCount(r1), 1, 'F-AUDIT-06: separator-only → un fragmento unknown (no vacío)');
    assertEqual(r1.errors.length, 0, 'F-AUDIT-06: separator-only sin errores');
    assertEqual(r1.blocking_states.length, 0, 'F-AUDIT-06: separator-only aislable no bloquea');
    assertEqual(r1.unrecognized_fragments[0].raw, EORDEN_SEP, 'F-AUDIT-06: separator-only raw byte-exact');
    assertEqual(r1.can_apply, false, 'F-AUDIT-06: separator-only can_apply false');

    const r2 = segmentClinicalIntake(EORDEN_SEP + '\n' + EORDEN_SEP);
    assertEqual(unitKinds(r2).length, 0, 'F-AUDIT-06: dos separadores → cero unidades');
    assert(fragmentCount(r2) >= 1, 'F-AUDIT-06: dos separadores sobreviven como fragments');
    assertEqual(r2.errors.length, 0, 'F-AUDIT-06: dos separadores sin errores');

    // Blank-only input REMAINS empty (authorized transport whitespace).
    const rb = segmentClinicalIntake('   \n\t\n');
    assertEqual(unitKinds(rb).length, 0, 'F-AUDIT-06: solo blanks → cero unidades');
    assertEqual(fragmentCount(rb), 0, 'F-AUDIT-06: solo blanks → cero fragmentos (vacío válido)');
    assertEqual(rb.errors.length, 0, 'F-AUDIT-06: solo blanks sin errores');

    // Stray short separator between isolable texts is preserved, not dropped.
    const stray = 'nota previa aislable\n═\nnota posterior aislable';
    const rs = segmentClinicalIntake(stray);
    assertEqual(unitKinds(rs).length, 0, 'F-AUDIT-06: stray ═ corto → cero unidades');
    assert(fragmentCount(rs) >= 1, 'F-AUDIT-06: stray ═ corto sobrevive en fragments');
    assert(rs.unrecognized_fragments.some((f) => f.raw.includes('═')), 'F-AUDIT-06: stray ═ corto presente en raw de fragments');
    assertEqual(rs.blocking_states.length, 0, 'F-AUDIT-06: stray aislable no bloquea');

    // Extra closing separator after a valid unit + trailing record: separator
    // stays visible between the two safe units.
    const rawClose = EORDEN_FIXTURE + '\n' + EORDEN_SEP + '\n' + PRESALUD_FIXTURE_EMPTY_STATE;
    const rc = segmentClinicalIntake(rawClose);
    assertEqual(unitKinds(rc).filter((k) => k === KIND_EORDEN_UNIT).length, 1, 'F-AUDIT-06: closing + record → e-orden intacta');
    assertEqual(unitKinds(rc).filter((k) => k === KIND_PRESALUD_UNIT).length, 1, 'F-AUDIT-06: closing + record → PreSalud intacta');
    assertEqual(fragmentCount(rc), 1, 'F-AUDIT-06: closing + record → closing como fragment intermedio');
    assertEqual(rc.unrecognized_fragments[0].raw, EORDEN_SEP, 'F-AUDIT-06: closing intermedio raw byte-exact');
    assertEqual(rc.blocking_states.length, 0, 'F-AUDIT-06: closing aislable no bloquea');
    assertEqual(rc.can_apply, false, 'F-AUDIT-06: closing + record can_apply false');
}

console.log('\n[WO-B] Regresiones F-AUDIT-07 — separador D17 estrictamente normativo (55× ═)');

{
    const bodyTail =
        '• CIP: CIP-SINT-0001\n' +
        '• Marca comercial solicitada: HYRIMOZ\n' +
        '• Dosis solicitada: 40 MG\n' +
        '• Vía solicitada: SC\n' +
        '• Pauta: CADA 14 DIAS\n' +
        '• Inducción solicitada: NO\n' +
        'PROGRAMA SES\n' +
        '• Código: SES_PSOR\n' +
        '• Denominación: PSORIASIS';
    const header = 'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n';
    // One-character separator: must NOT satisfy the D17 opening.
    const rShort1 = segmentClinicalIntake(header + '═\n' + bodyTail);
    assertEqual(unitKinds(rShort1).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-07: separador de 1× ═ no abre unidad');
    assert(fragmentCount(rShort1) >= 1, 'F-AUDIT-07: separador 1× ═ sobrevive como fragment');
    // One-short (54×) and one-long (56×) variants: must NOT satisfy opening.
    const sep54 = '═'.repeat(55 - 1);
    const rShort54 = segmentClinicalIntake(header + sep54 + '\n' + bodyTail);
    assertEqual(unitKinds(rShort54).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-07: separador 54× ═ no abre unidad');
    assert(rShort54.unrecognized_fragments.some((f) => f.raw.includes(sep54)), 'F-AUDIT-07: separador 54× ═ preservado en fragments');
    const sep56 = '═'.repeat(55 + 1);
    const rLong56 = segmentClinicalIntake(header + sep56 + '\n' + bodyTail);
    assertEqual(unitKinds(rLong56).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-07: separador 56× ═ no abre unidad');
    assert(rLong56.unrecognized_fragments.some((f) => f.raw.includes(sep56)), 'F-AUDIT-07: separador 56× ═ preservado en fragments');
    // Authorized transport only: trailing spaces after the normative 55× ═
    // still open a valid unit; raw stays byte-exact.
    const rTrail = segmentClinicalIntake(header + EORDEN_SEP + '   \n' + bodyTail);
    assertEqual(unitKinds(rTrail).filter((k) => k === KIND_EORDEN_UNIT).length, 1, 'F-AUDIT-07: 55× ═ + trailing spaces sí abre unidad');
    assertEqual(rTrail.blocking_states.length, 0, 'F-AUDIT-07: trailing autorizado no bloquea');
}

console.log('\n[WO-B] Regresiones F-AUDIT-08 — leading whitespace interno no se normaliza');

{
    const bodyTail =
        '• CIP: CIP-SINT-0001\n' +
        '• Marca comercial solicitada: HYRIMOZ\n' +
        '• Dosis solicitada: 40 MG\n' +
        '• Vía solicitada: SC\n' +
        '• Pauta: CADA 14 DIAS\n' +
        '• Inducción solicitada: NO\n' +
        'PROGRAMA SES\n' +
        '• Código: SES_PSOR\n' +
        '• Denominación: PSORIASIS';
    // Leading whitespace before the D17 header when NOT merely whole-input
    // peripheral whitespace: preceded by isolable content, so the indent is
    // internal and must not be stripped to fabricate a valid header.
    const rHead = segmentClinicalIntake('nota previa aislable\n  SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n' + bodyTail);
    assertEqual(unitKinds(rHead).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-08: header indentado (no periférico) no es e-orden');
    assert(fragmentCount(rHead) >= 1, 'F-AUDIT-08: header indentado sobrevive como fragment');
    // Leading whitespace before a required bullet label invalidates the body.
    const rBullet = segmentClinicalIntake('SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n  • CIP: CIP-SINT-0001\n' + bodyTail.split('\n').slice(1).join('\n'));
    assertEqual(unitKinds(rBullet).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-08: bullet indentado no valida cuerpo D17');
    assert(fragmentCount(rBullet) >= 1, 'F-AUDIT-08: bullet indentado sobrevive como fragment');
    // Leading whitespace before PROGRAMA SES: the SES line is not valid.
    const rSes = segmentClinicalIntake('SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n• CIP: CIP-SINT-0001\n  PROGRAMA SES\n• Código: SES_PSOR\n• Denominación: PSORIASIS');
    assert(!rSes.recognized_units.some((u) => u.kind === KIND_EORDEN_UNIT && u.raw.includes('  PROGRAMA SES')), 'F-AUDIT-08: SES indentado no normalizado dentro de unidad');
    assert(rSes.unrecognized_fragments.some((f) => f.raw.includes('  PROGRAMA SES')) || rSes.recognized_units.length === 0, 'F-AUDIT-08: SES indentado preservado fuera de unidad válida');
    // Leading whitespace before the opening separator: not the normative role.
    const rSep = segmentClinicalIntake('SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n  ' + EORDEN_SEP + '\n' + bodyTail);
    assertEqual(unitKinds(rSep).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-08: separador indentado no abre unidad');
    assert(rSep.unrecognized_fragments.some((f) => f.raw.includes(EORDEN_SEP)), 'F-AUDIT-08: separador indentado preservado como fragment');
    for (const r of [rHead, rBullet, rSes, rSep]) {
        assertEqual(r.can_apply, false, 'F-AUDIT-08: can_apply false');
        assertEqual(r.errors.length, 0, 'F-AUDIT-08: sin errores');
    }
}

console.log('\n[WO-B] Regresiones F-AUDIT-09 — prefijo periférico absoluto sí tolerado');

{
    // Spaces directly before the normative header at absolute input start:
    // whole-input peripheral whitespace, accepted for comparison, raw exact.
    const rawLead = '   SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n' + EORDEN_FIXTURE.split('\n').slice(2).join('\n');
    const rLead = segmentClinicalIntake(rawLead);
    assertEnvelope(rLead, 'F-AUDIT-09 leading spaces');
    assertEqual(unitKinds(rLead).filter((k) => k === KIND_EORDEN_UNIT).length, 1, 'F-AUDIT-09: spaces en prefijo periférico absoluto → una e-orden');
    assertEqual(rLead.blocking_states.length, 0, 'F-AUDIT-09: prefijo periférico no bloquea');
    assertEqual(rLead.raw_input, rawLead, 'F-AUDIT-09: raw_input byte-exact con prefijo');
    assertEqual(rLead.recognized_units[0].raw, rawLead, 'F-AUDIT-09: unit raw incluye prefijo periférico byte-exact');
    assertEqual(rLead.can_apply, false, 'F-AUDIT-09: can_apply false');

    // Tabs/spaces/newlines forming only the whole-input leading peripheral
    // prefix before the normative header: also accepted, raw exact.
    const rawMixed = '  \n\t  \n  SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n' + EORDEN_FIXTURE.split('\n').slice(2).join('\n');
    const rMixed = segmentClinicalIntake(rawMixed);
    assertEqual(unitKinds(rMixed).filter((k) => k === KIND_EORDEN_UNIT).length, 1, 'F-AUDIT-09: tabs/spaces/newlines periféricos → una e-orden');
    assertEqual(rMixed.raw_input, rawMixed, 'F-AUDIT-09: raw_input mixto byte-exact');
    assertEqual(rMixed.recognized_units[0].raw, '  SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n' + EORDEN_FIXTURE.split('\n').slice(2).join('\n'), 'F-AUDIT-09: unit raw desde header con su indent periférico byte-exact (blanks previos skippables)');
    assertEqual(rMixed.blocking_states.length, 0, 'F-AUDIT-09: prefijo mixto no bloquea');
    assertEqual(rMixed.can_apply, false, 'F-AUDIT-09: mixto can_apply false');

    // Guard: internal leading whitespace still invalid (F-AUDIT-08 intact).
    const rInternal = segmentClinicalIntake('nota previa aislable\n   SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS\n' + EORDEN_SEP + '\n' + EORDEN_FIXTURE.split('\n').slice(2).join('\n'));
    assertEqual(unitKinds(rInternal).filter((k) => k === KIND_EORDEN_UNIT).length, 0, 'F-AUDIT-09: indent interno tras contenido no es e-orden');
    assertEqual(rInternal.can_apply, false, 'F-AUDIT-09: interno can_apply false');
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
