#!/usr/bin/env node
/** T9 #301 deterministic pure checks for the SES Program write core. Synthetic data only. */
import assert from 'node:assert/strict';
import { resolveSesProgramWrite, SES_PROGRAM_BROWNFIELD_VALUES, SES_PROGRAM_LABELS, SES_PROGRAM_CODE_CONTROL, SES_PROGRAM_LABEL_CONTROL, SES_PROGRAM_PATHOLOGY_CONTROL, SES_PROGRAM_TARGET, isCoherentSesProgramPair } from '../scripts/fh_intake_ses_program.js';
let passed = 0;
function check(label, actual, expected) { assert.equal(actual, expected, label); passed += 1; }
function ok(label, cond) { assert.ok(cond, label); passed += 1; }

// Closed declared table is exactly the 5-program Dermatology V0 allowlist.
check('allowlist has exactly 5 codes', Object.keys(SES_PROGRAM_BROWNFIELD_VALUES).length, 5);
ok('all 5 codes in allowlist', ['SES_HS','SES_PSOR','SES_DA','SES_VITI','SES_AA'].every(c => Object.hasOwn(SES_PROGRAM_BROWNFIELD_VALUES, c)));
check('HS visible mapping', SES_PROGRAM_BROWNFIELD_VALUES.SES_HS.visible, 'Hidradenitis supurativa');
check('PSOR visible mapping', SES_PROGRAM_BROWNFIELD_VALUES.SES_PSOR.visible, 'Psoriasis');
check('DA visible mapping', SES_PROGRAM_BROWNFIELD_VALUES.SES_DA.visible, 'Dermatitis atópica');
check('VITI visible mapping (unaccented label -> accented visible)', SES_PROGRAM_BROWNFIELD_VALUES.SES_VITI.visible, 'Vitíligo');
check('AA visible mapping', SES_PROGRAM_BROWNFIELD_VALUES.SES_AA.visible, 'Alopecia areata');

// Coherent allowlist pairs are writable with the verbatim canonical pair.
for (const [code, entry] of Object.entries(SES_PROGRAM_BROWNFIELD_VALUES)) {
  const r = resolveSesProgramWrite({ code, label: entry.label });
  check(`${code} coherent pair writable`, r.writable, true);
  check(`${code} resolves verbatim code`, r.code, code);
  check(`${code} resolves verbatim label`, r.label, entry.label);
  check(`${code} resolves declared visible`, r.visible, entry.visible);
}

// Invalid pairs are never writable and never produce write targets.
check('mismatched label blocked', resolveSesProgramWrite({ code:'SES_HS', label:'PSORIASIS' }).writable, false);
check('mismatched label reason', resolveSesProgramWrite({ code:'SES_HS', label:'PSORIASIS' }).reason, 'SES_LABEL_CODE_MISMATCH');
check('out-of-allowlist code blocked', resolveSesProgramWrite({ code:'SES_UCE', label:'X' }).writable, false);
check('out-of-allowlist reason', resolveSesProgramWrite({ code:'SES_UCE', label:'X' }).reason, 'SES_OUT_OF_ALLOWLIST');
check('unknown code blocked', resolveSesProgramWrite({ code:'SES_XYZ', label:'X' }).writable, false);
check('code without label blocked', resolveSesProgramWrite({ code:'SES_HS', label:'' }).writable, false);
check('label without code blocked', resolveSesProgramWrite({ code:'', label:'PSORIASIS' }).writable, false);
check('missing pair blocked', resolveSesProgramWrite({ code:'', label:'' }).writable, false);
check('null blocked', resolveSesProgramWrite(null).writable, false);
check('non-object blocked', resolveSesProgramWrite('SES_HS').writable, false);
check('partial object blocked', resolveSesProgramWrite({ code:'SES_HS' }).writable, false);
ok('no invalid pair produces code/label/visible targets',
  ['SES_HS|PSORIASIS','SES_UCE|X','SES_XYZ|X','SES_HS|','|PSORIASIS'].every(k => {
    const [c,l] = k.split('|'); const r = resolveSesProgramWrite({code:c,label:l});
    return r.code === undefined && r.label === undefined && r.visible === undefined;
  }));
// Peripheral trim is authorized D17 transport normalization (NFC + trim), never
// accent folding/fuzzy: a label that trims to the exact canonical label stays a
// coherent allowlist pair (the parser already emits trimmed canonical values).
check('SES_HS peripheral-trim label is still the exact canonical pair', resolveSesProgramWrite({ code:'SES_HS', label:'  HIDRADENITIS SUPURATIVA  ' }).writable, true);
check('accent-folded label is NOT accepted (no fuzzy/no accent normalization)', resolveSesProgramWrite({ code:'SES_DA', label:'DERMATITIS ATÓPICA' }).writable, false);
check('catalogue keeps unaccented canonical DA label exactly', resolveSesProgramWrite({ code:'SES_DA', label:'DERMATITIS ATOPICA' }).writable, true);
check('SES_VITI unaccented coherent (no accent folding needed)', resolveSesProgramWrite({ code:'SES_VITI', label:'VITILIGO' }).writable, true);

// Exact declared adjudicated control ids / target.
check('code control id', SES_PROGRAM_CODE_CONTROL, 'fhDermaSesProgramCode');
check('label control id', SES_PROGRAM_LABEL_CONTROL, 'fhDermaSesProgramLabel');
check('pathology control id', SES_PROGRAM_PATHOLOGY_CONTROL, 'fhDermaPatologia');
check('target', SES_PROGRAM_TARGET, 'ses_program');
ok('coherence predicate', isCoherentSesProgramPair({ code:'SES_AA', label:'ALOPECIA AREATA' }));
check('coherence predicate negative', isCoherentSesProgramPair({ code:'SES_AA', label:'PSORIASIS' }), false);
process.stdout.write(`T9 SES PROGRAM PURE CHECK PASS ${passed}/${passed}\n`);
