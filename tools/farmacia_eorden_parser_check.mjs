#!/usr/bin/env node
/** WO-C issue #295 — deterministic D17 e-Orden parser fixture battery (Seam 1). */
import {
    parseDermaEOrdenUnit, parseDermaEOrdenRaw, SES_ALLOWLIST,
    UNIT_STATE_RECOGNIZED, UNIT_STATE_PARTIALLY_RECOGNIZED, UNIT_STATE_UNRECOGNIZED,
    UNIT_STATE_SEGMENTATION_BLOCKED, UNIT_STATE_PARSER_ERROR,
    SES_UNKNOWN_CODE, SES_OUT_OF_ALLOWLIST, SES_LABEL_CODE_MISMATCH,
    SES_CODE_WITHOUT_LABEL, SES_LABEL_WITHOUT_CODE, SES_PAIR_MISSING,
} from '../scripts/fh_eorden_parser.js';

let passed = 0; let failed = 0;
function ok(label, condition) { if (condition) { console.log(`  ✓ ${label}`); passed += 1; } else { console.log(`  ✗ ${label}`); failed += 1; } }
function assert(condition, label) { ok(label, condition); }
const SEP = '═'.repeat(55);
const body = (title = 'PSORIASIS', ses = ['SES_PSOR', 'PSORIASIS'], overrides = {}) => {
    const lines = [`SOLICITUD DERMATOLOGÍA → FARMACIA - ${title}`, SEP,
        `• CIP: ${overrides.cip ?? 'CIP-SINT-0001'}`, `• Marca comercial solicitada: ${overrides.brand ?? 'HYRIMOZ'}`,
        `• Dosis solicitada: ${overrides.dose ?? '40 MG'}`, `• Vía solicitada: ${overrides.route ?? 'SC'}`,
        `• Pauta: ${overrides.schedule ?? 'CADA 14 DIAS'}`, `• Inducción solicitada: ${overrides.induction ?? 'NO'}`];
    if (ses !== null) { lines.push('PROGRAMA SES'); if (ses[0] !== undefined) lines.push(`• Código: ${ses[0]}`); if (ses[1] !== undefined) lines.push(`• Denominación: ${ses[1]}`); }
    return lines.join('\n');
};
function resultForSes(code, label, section = true) { return parseDermaEOrdenRaw(body('PSORIASIS', section ? [code, label] : null)); }

console.log('\n[WO-C] Complete D17 unit and envelope');
const complete = body(); const r = parseDermaEOrdenRaw(complete);
assert(r.unit_state === UNIT_STATE_RECOGNIZED, 'complete unit is RECOGNIZED');
assert(['commercial_name', 'requested_dose', 'requested_route', 'requested_schedule', 'requested_induction', 'ses_program', 'pathology', 'cip'].every((x) => r.contributions.some((c) => c.concept === x)), 'complete concept set present');
assert(r.raw_input === complete && r.can_preview === true && r.can_apply === false, 'raw and gates preserved');
assert(r.contributions.every((c) => c.raw), 'contribution provenance raw present');

console.log('\n[WO-C] Exact title/pathology and coherent SES allowlist');
for (const [title, pathology] of Object.entries({ 'HIDRADENITIS SUPURATIVA': 'Hidradenitis supurativa', PSORIASIS: 'Psoriasis', 'DERMATITIS ATÓPICA': 'Dermatitis atópica', 'VITÍLIGO': 'Vitíligo', 'ALOPECIA AREATA': 'Alopecia areata' })) {
    const x = parseDermaEOrdenRaw(body(title, ['SES_HS', 'HIDRADENITIS SUPURATIVA']));
    assert(x.contributions.find((c) => c.concept === 'pathology')?.value === pathology, `${title}: exact pathology equivalence`);
}
for (const [code, label] of Object.entries(SES_ALLOWLIST)) {
    const x = parseDermaEOrdenRaw(body('PSORIASIS', [code, label]));
    assert(x.contributions.find((c) => c.concept === 'ses_program')?.value?.code === code, `${code}: coherent code survives`);
    assert(x.contributions.find((c) => c.concept === 'ses_program')?.value?.label === label, `${code}: coherent label survives`);
}

console.log('\n[WO-C] Unsafe SES states');
for (const [code, label, reason] of [['SES_XYZ', 'PSORIASIS', SES_UNKNOWN_CODE], ['SES_UCE', 'URTICARIA', SES_OUT_OF_ALLOWLIST], ['SES_PRNO', 'PRNO', SES_OUT_OF_ALLOWLIST], ['SES_HS', 'PSORIASIS', SES_LABEL_CODE_MISMATCH], ['SES_HS', undefined, SES_CODE_WITHOUT_LABEL], [undefined, 'PSORIASIS', SES_LABEL_WITHOUT_CODE], [undefined, undefined, SES_PAIR_MISSING]]) {
    const x = resultForSes(code, label); const c = x.contributions.find((v) => v.concept === 'ses_program');
    assert(x.blocking_states.includes(reason) && x.errors.some((e) => e.code === reason), `${reason}: surfaced`);
    assert(c?.blocking === true && c.target === 'NONE' && c.proposal_status === 'NO_PROPOSAL' && c.reason.code === reason, `${reason}: blocked contribution`);
}

console.log('\n[WO-C] Value semantics and provenance');
for (const [route, status] of [['Otra — intradérmica', 'PROVENANCE_ONLY'], ['Otra', 'UNRECOGNIZED_VALUE']]) {
    const x = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { route })); const c = x.contributions.find((v) => v.concept === 'requested_route');
    assert(c.semantic_status === status && c.target === 'NONE' && c.proposal_status === 'NO_PROPOSAL', `${route}: route semantics`);
    const safeSiblings = x.contributions.filter((v) => ['commercial_name', 'requested_dose', 'requested_schedule', 'requested_induction', 'ses_program'].includes(v.concept));
    assert(safeSiblings.every((v) => v.proposal_status === 'AUTO_PROPOSABLE' && v.semantic_status === 'RECOGNIZED'), `${route}: safe siblings stay usable`);
}
const values = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { dose: 'No informado', route: 'No informado', induction: 'maybe' }));
assert(values.contributions.find((c) => c.concept === 'requested_dose').semantic_status === 'NO_VALUE', 'dose No informado is NO_VALUE');
assert(values.contributions.find((c) => c.concept === 'requested_route').semantic_status === 'NO_VALUE', 'route No informado is NO_VALUE');
assert(values.warnings.some((w) => w.code === 'INDUCTION_VALUE_UNRECOGNIZED'), 'induction invalid value warning');
const inductionSi = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { induction: 'SÍ' }));
assert(inductionSi.contributions.find((c) => c.concept === 'requested_induction')?.value === 'SÍ' && inductionSi.contributions.find((c) => c.concept === 'requested_induction')?.proposal_status === 'AUTO_PROPOSABLE', 'induction SÍ positive');
const inductionNo = parseDermaEOrdenRaw(body('PSORIASIS', ['SES_PSOR', 'PSORIASIS'], { induction: 'NO' }));
assert(inductionNo.contributions.find((c) => c.concept === 'requested_induction')?.value === 'NO', 'induction NO positive');
const unknownTitle = parseDermaEOrdenRaw(body('ECZEMA', ['SES_PSOR', 'PSORIASIS']));
assert(unknownTitle.warnings.some((w) => w.code === 'PATHOLOGY_TITLE_UNRECOGNIZED') && !unknownTitle.contributions.some((c) => c.concept === 'pathology'), 'unrecognized title yields no pathology and a warning');

console.log('\n[WO-C] Anti-fuzzy serialization gate');
// Label alias (not a D17 label), missing accent in label, wrong-case label,
// inverted label pair, and an extra content line inside an otherwise-valid unit.
const interleaveLines = body().split('\n');
for (const variant of [
    body().replace('Marca comercial solicitada:', 'Marca:'),
    body().replace('Marca comercial solicitada:', 'Marca comercial Solicitada:'),
    body().replace('Vía solicitada:', 'Via solicitada:'),
    body().replace('Pauta:', 'PAUTA:'),
    body().replace('Marca comercial solicitada:', 'Dosis solicitada:'),
    interleaveLines.slice(0, 5).join('\n') + '\nDATOS CLÍNICOS — PSORIASIS\n' + interleaveLines.slice(5).join('\n'),
    interleaveLines.slice(0, 6).join('\n') + '\nnota suelta\n' + interleaveLines.slice(6).join('\n'),
]) {
    const x = parseDermaEOrdenRaw(variant); assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0 && x.raw_input === variant && x.can_apply === false, 'non-normative serialization rejected');
}
// Interleaved / inverted normative order: Código before Inducción, Inducción after Denominación.
{
    const lines = body().split('\n');
    const codeIdx = lines.findIndex((l) => l.startsWith('• Código:'));
    const indIdx = lines.findIndex((l) => l.startsWith('• Inducción solicitada:'));
    const interleaved = [...lines.slice(0, indIdx), lines[codeIdx], lines[indIdx], ...lines.slice(indIdx + 1, codeIdx), ...lines.slice(codeIdx + 1)].join('\n');
    const x = parseDermaEOrdenRaw(interleaved);
    assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0, 'Código before Inducción is rejected');
}
{
    const lines = body().split('\n');
    const indLine = lines.find((l) => l.startsWith('• Inducción solicitada:'));
    const rest = lines.filter((l) => !l.startsWith('• Inducción solicitada:'));
    const inverted = [...rest, indLine].join('\n');
    const x = parseDermaEOrdenRaw(inverted);
    assert(x.unit_state === UNIT_STATE_UNRECOGNIZED && x.contributions.length === 0, 'Inducción after Denominación is rejected');
}
const repeated = body() + '\n• Marca comercial solicitada: SECOND'; const rr = parseDermaEOrdenRaw(repeated);
assert(rr.unit_state === UNIT_STATE_UNRECOGNIZED && rr.contributions.length === 0, 'repeated label rejected');

console.log('\n[WO-C] Empty, malformed input, unit kinds, and exception safety');
for (const raw of ['', '   ', '\n', '\t\n']) assert(parseDermaEOrdenRaw(raw).can_apply === false, `empty input ${JSON.stringify(raw)} is safe`);
const noBody = 'SOLICITUD DERMATOLOGÍA → FARMACIA - PSORIASIS'; const nb = parseDermaEOrdenRaw(noBody);
assert(nb.unit_state === UNIT_STATE_UNRECOGNIZED && nb.raw_input === noBody, 'header without body rejected');
const wrong = parseDermaEOrdenUnit({ kind: 'presalud_unit', raw: complete });
assert(wrong.unit_state === UNIT_STATE_PARSER_ERROR && wrong.errors[0].code === 'EORDEN_PARSER_WRONG_UNIT_KIND', 'wrong unit kind is parser error');
assert(parseDermaEOrdenUnit({ raw: 42 }).errors[0].code === 'EORDEN_PARSER_INPUT_NOT_TEXT', 'non-text raw is deterministic error');
assert(parseDermaEOrdenUnit({ kind: 'blocked_unit', raw: complete }).unit_state === UNIT_STATE_SEGMENTATION_BLOCKED, 'blocked unit is segmentation blocked');
const throwing = {}; Object.defineProperty(throwing, 'raw', { get() { throw new Error('synthetic'); } }); const thrown = parseDermaEOrdenUnit(throwing);
assert(thrown.unit_state === UNIT_STATE_PARSER_ERROR && thrown.errors[0].code === 'EORDEN_PARSER_INTERNAL_ERROR' && thrown.can_apply === false, 'throwing raw getter is contained');

console.log(`\nRESULTADO: ${passed} OK / ${failed} FALLIDO`);
console.log(failed === 0 ? '✓ WO-C DermaEOrdenParser fixture battery PASSED' : '✗ WO-C DermaEOrdenParser fixture battery FAILED');
process.exitCode = failed === 0 ? 0 : 1;
