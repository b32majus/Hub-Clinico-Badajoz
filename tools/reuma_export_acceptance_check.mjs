#!/usr/bin/env node
'use strict';
/**
 * Acceptance oracle for the legacy Reuma 497-column export transport
 * (F1.3B WU-B, issue #396).
 *
 * Two visibly separated parts:
 *
 *   PART A - ACCEPTANCE (golden, authority-backed), implemented as the pure
 *   function `violationsFor(result)` over the harness output:
 *
 *     A1 exact length: every one of the 10 supported journeys produces exactly
 *        FINAL_V2_EXPORT_COLUMN_COUNT (497) fields, counted by the oracle
 *        itself by splitting the TSV row on '\t'. The legacy in-band
 *        `validateExportRowLength` console.warn is NEVER a PASS source; it is
 *        characterization evidence only (PART B).
 *     A2 identity/visit: per journey the row carries its own patientId
 *        (legacy field 1), the correct visit-type marker (legacy field 5) and
 *        the correct pathology token (legacy field 7); no other journey's
 *        synthetic treatment marker appears in it.
 *     A3 sentinel preservation at authority-derived positions: numeric 0
 *        rendered as '0' (not '' / 'ND'), explicit 'NA' and 'ND' preserved
 *        verbatim, '' preserved where the corpus sets it, and false -> 'NO'
 *        rendered distinctly from missing -> 'ND'.
 *     A4 synthetic-only: the patientId of every row starts with 'SYN-' and no
 *        documented real-format identifier (Spanish DNI/NIE shapes) appears.
 *
 *   PART B - KNOWN_LEGACY / NON_GOLDEN characterization, printed and recorded
 *   but never asserted as acceptance:
 *
 *     (1) production length enforcement is only an in-band console.warn inside
 *         `validateExportRowLength` (it never blocks, never fails, returns
 *         undefined); demonstrated at runtime in this check.
 *     (2) legacy-base positions whose meaning is set by inline generator code
 *         without a production-exposed header array (e.g. hlaB27 = column 9,
 *         extraArticular.digestiva = column 112, dolorNocturno = column 106,
 *         mdaCumple = column 193) are documented in
 *         docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md and deliberately not
 *         asserted golden here (except the identity columns 1/5/7 mandated by
 *         the WU-B authority and the comorbilidad.hta column 115 whose
 *         fallback semantics are fully derived from the generator source).
 *     (3) doubtful behavior observed in the generator source: raw
 *         `datos.X || ''` reads in the EspA/APs generators (e.g. hlaB27,
 *         peso) would collapse numeric 0 / false to ''; the dolorNocturno
 *         fallback 'NO' and the mdaCumple ternary cannot distinguish false
 *         from missing. None of these reads touches a corpus sentinel value
 *         (verified read-only and demonstrated by a characterization case
 *         below); they remain classified KNOWN_LEGACY.
 *
 * Position authority: only positions backed by production constants and the
 * production-exposed header arrays on HubTools.export are asserted golden.
 * LEGACY_BASE_COLUMN_COUNT (220) and HISTORICAL_EXPORT_COLUMN_COUNT (321) are
 * not exposed on HubTools.export; they are parsed read-only from
 * modules/exportManager.js and the oracle fails closed if they do not match
 * the documented values or the block arithmetic.
 *
 * Planted negatives (each must produce >= 1 violation of the expected class;
 * mutations live in memory only, never in files):
 *   N1 length drift   - a synthetic 496-field row violates A1
 *   N2 journey mix    - two journeys' rows swapped violate A2
 *   N3 value collapse - sentinel '0' rewritten to '' violates A3
 *   N4 contamination  - a foreign journey marker injected violates A2
 *   N5 non-synthetic  - a real-format patientId violates A4
 *
 * The oracle never modifies production files; it fails closed on doubt.
 *
 * Exit codes: 0 = frozen corpus PASS and every planted negative FAILed as
 *             expected and characterization evidence was observed;
 *             1 = otherwise.
 * Usage: node tools/reuma_export_acceptance_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReumaExportHarness, createLegacySandbox } from './reuma_export_harness.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';

// Frozen corpus v1 expectations (same journeys/markers as
// tools/reuma_export_harness_check.mjs; markers are pairwise non-substring).
const JOURNEYS = [
  { pathology: 'ar', tipoVisita: 'primera', patientId: 'SYN-EXP-AR-001', marker: 'SYN-MTX-AR-P' },
  { pathology: 'ar', tipoVisita: 'seguimiento', patientId: 'SYN-EXP-AR-002', marker: 'SYN-ABA-AR-S' },
  { pathology: 'espa', tipoVisita: 'primera', patientId: 'SYN-EXP-ESPA-001', marker: 'SYN-CZP-ESPA-P' },
  { pathology: 'espa', tipoVisita: 'seguimiento', patientId: 'SYN-EXP-ESPA-002', marker: 'SYN-SEC-ESPA-S' },
  { pathology: 'aps', tipoVisita: 'primera', patientId: 'SYN-EXP-APS-001', marker: 'SYN-APR-APS-P' },
  { pathology: 'aps', tipoVisita: 'seguimiento', patientId: 'SYN-EXP-APS-002', marker: 'SYN-IXE-APS-S' },
  { pathology: 'les', tipoVisita: 'primera', patientId: 'SYN-EXP-LES-001', marker: 'SYN-BEL-LES-P' },
  { pathology: 'les', tipoVisita: 'seguimiento', patientId: 'SYN-EXP-LES-002', marker: 'SYN-MMF-LES-S' },
  { pathology: 'sjogren', tipoVisita: 'primera', patientId: 'SYN-EXP-SJO-001', marker: 'SYN-HCQ-SJOGREN-P' },
  { pathology: 'sjogren', tipoVisita: 'seguimiento', patientId: 'SYN-EXP-SJO-002', marker: 'SYN-PIL-SJOGREN-S' },
];

// Field 5 of every legacy base generator is the literal visit marker derived
// from the tipoVisita argument (verified read-only in exportManager.js).
const VISIT_MARKERS = { primera: 'Primera Visita', seguimiento: 'Seguimiento' };

// Field 7 is datos.diagnosticoPrimario (fallback only; corpus always sets it).
const PATHOLOGY_TOKENS = { ar: 'ar', espa: 'espa', aps: 'aps', les: 'les', sjogren: 'sjogren' };

// Documented real-format identifier shapes (A4 detector). Intentionally
// minimal and documented in REUMA_EXPORT_KNOWN_LEGACY.md; synthetic markers
// never match these shapes.
const REAL_ID_PATTERNS = [
  { name: 'DNI', regex: /\b\d{8}[A-Z]\b/ },
  { name: 'NIE', regex: /\b[XYZ]\d{7}[A-Z]\b/ },
];

// ---------------------------------------------------------------------------
// Position authority: production constants + exposed header arrays.
// ---------------------------------------------------------------------------

function deriveExportAuthority() {
  const source = fs.readFileSync(path.join(ROOT, 'modules/exportManager.js'), 'utf8');
  const readConstant = (name) => {
    const match = source.match(new RegExp(`const ${name} = (\\d+);`));
    return match ? Number(match[1]) : null;
  };

  const probe = createLegacySandbox();
  const exp = probe.sandbox.HubTools?.export;

  // LEGACY_BASE_COLUMN_COUNT and HISTORICAL_EXPORT_COLUMN_COUNT are not
  // exposed on HubTools.export; parse them read-only from the source and fail
  // closed unless they match the documented production values.
  const legacyBase = readConstant('LEGACY_BASE_COLUMN_COUNT');
  const historical = readConstant('HISTORICAL_EXPORT_COLUMN_COUNT');
  const finalCount = exp?.FINAL_V2_EXPORT_COLUMN_COUNT;
  if (legacyBase !== 220 || historical !== 321 || finalCount !== 497) {
    throw new Error(
      `production authority mismatch: LEGACY_BASE_COLUMN_COUNT=${legacyBase} ` +
      `(expect 220), HISTORICAL_EXPORT_COLUMN_COUNT=${historical} (expect 321), ` +
      `FINAL_V2_EXPORT_COLUMN_COUNT=${finalCount} (expect 497)`
    );
  }

  const headers = {
    legacyExtension: exp.LEGACY_EXTENSION_HEADERS_221_321,
    common: exp.COMMON_V2_HEADERS,
    les: exp.LES_V2_HEADERS,
    sjogren: exp.SJOGREN_V2_HEADERS,
    apsDapsa: exp.APS_DAPSA_V2_HEADERS,
  };
  for (const [name, array] of Object.entries(headers)) {
    if (!Array.isArray(array) || array.length === 0) {
      throw new Error(`production authority mismatch: HubTools.export.${name} is not a non-empty array`);
    }
  }

  // Block offsets (0-based field indexes into a 497-field row):
  //   [0 .. 219]                 legacy base block (inline in the generators,
  //                              block size backed by LEGACY_BASE_COLUMN_COUNT=220)
  //   [220 .. 320]               LEGACY_EXTENSION_HEADERS_221_321 (101 columns)
  //   [321 .. 364]               COMMON_V2_HEADERS (44 columns); 321 = HISTORICAL
  //   [365 .. 437]               LES_V2_HEADERS
  //   [438 .. 490]               SJOGREN_V2_HEADERS
  //   [491 .. 496]               APS_DAPSA_V2_HEADERS
  const extStart = legacyBase;
  const commonStart = extStart + headers.legacyExtension.length;
  const lesStart = commonStart + headers.common.length;
  const sjogrenStart = lesStart + headers.les.length;
  const apsStart = sjogrenStart + headers.sjogren.length;
  if (commonStart !== historical || apsStart + headers.apsDapsa.length !== finalCount) {
    throw new Error(
      `production block arithmetic mismatch: commonStart=${commonStart} (expect ${historical}), ` +
      `final=${apsStart + headers.apsDapsa.length} (expect ${finalCount})`
    );
  }

  const headerPosition = (blockName, blockStart, header) => {
    const index = headers[blockName].indexOf(header);
    if (index === -1) {
      throw new Error(`authority header not found in ${blockName}: ${header}`);
    }
    const position = blockStart + index;
    if (position < 0 || position >= finalCount) {
      throw new Error(`authority position out of range for ${header}: ${position}`);
    }
    return position;
  };

  return {
    finalCount,
    legacyBase,
    historical,
    // Legacy base columns are 1-based in the generator source; the block size
    // is backed by LEGACY_BASE_COLUMN_COUNT=220 and each column number is
    // verified read-only in the generator code (see derivation comments).
    legacy: (column1Based, derivation) => {
      if (!Number.isInteger(column1Based) || column1Based < 1 || column1Based > legacyBase) {
        throw new Error(`legacy column out of base block: ${column1Based} (${derivation})`);
      }
      return column1Based - 1;
    },
    extensionPos: (header) => headerPosition('legacyExtension', extStart, header),
    commonPos: (header) => headerPosition('common', commonStart, header),
  };
}

// Sentinel expectations per journey key. Every position is resolved from
// production authority (see deriveExportAuthority); no magic indices.
const SENTINELS = [
  // A3 numeric 0: corpus sets hemogramaFechaSolicitud = 0; getExportValue
  // skips only undefined/null/'' so numeric 0 survives and renders as '0'.
  { journey: 'ar|primera', pos: (a) => a.commonPos('Hemograma_Fecha_Solicitud'), label: 'Hemograma_Fecha_Solicitud', expect: '0', reason: 'numeric 0 must not collapse' },
  { journey: 'espa|primera', pos: (a) => a.commonPos('Hemograma_Fecha_Solicitud'), label: 'Hemograma_Fecha_Solicitud', expect: '0', reason: 'numeric 0 must not collapse' },
  // A3 explicit 'NA' preserved verbatim (normalizarEstadoExport keeps 'NA').
  { journey: 'ar|primera', pos: (a) => a.extensionPos('ANA'), label: 'ANA', expect: 'NA', reason: 'explicit NA verbatim' },
  { journey: 'ar|primera', pos: (a) => a.commonPos('Decision_Clinica_Manual'), label: 'Decision_Clinica_Manual', expect: 'NA', reason: 'explicit NA verbatim' },
  { journey: 'espa|primera', pos: (a) => a.legacy(115, "comorbilidad.hta: setLegacyColumn(row, 115, normalizarEstadoExport(comorb['hta'], 'ND')) in generarFilaCSV_AR_Base"), label: 'Comorbilidad_HTA (legacy col 115)', expect: 'NA', reason: 'explicit NA verbatim' },
  // A3 explicit 'ND' preserved verbatim.
  { journey: 'ar|primera', pos: (a) => a.extensionPos('ExtraAR_Anemia'), label: 'ExtraAR_Anemia', expect: 'ND', reason: 'explicit ND verbatim' },
  { journey: 'ar|primera', pos: (a) => a.commonPos('Estado_Prebiologico_Final'), label: 'Estado_Prebiologico_Final', expect: 'ND', reason: 'explicit ND verbatim' },
  // A3 '' preserved where the corpus sets it and the fallback is ''.
  { journey: 'ar|primera', pos: (a) => a.commonPos('Hemograma_Observaciones'), label: 'Hemograma_Observaciones', expect: '', reason: 'empty string preserved' },
  { journey: 'ar|primera', pos: (a) => a.commonPos('Observaciones_Prebiologico'), label: 'Observaciones_Prebiologico', expect: '', reason: 'empty string preserved' },
  // A3 false -> 'NO' rendered distinctly from missing -> 'ND' at the same
  // authority-derived positions across journeys.
  { journey: 'espa|primera', pos: (a) => a.commonPos('Decision_Clinica_Manual'), label: 'Decision_Clinica_Manual', expect: 'NO', reason: "false -> 'NO' (corpus sets false)" },
  { journey: 'ar|seguimiento', pos: (a) => a.commonPos('Decision_Clinica_Manual'), label: 'Decision_Clinica_Manual', expect: 'ND', reason: "missing -> fallback 'ND'" },
  { journey: 'ar|primera', pos: (a) => a.legacy(115, "comorbilidad.hta: setLegacyColumn(row, 115, normalizarEstadoExport(comorb['hta'], 'ND')) in generarFilaCSV_AR_Base"), label: 'Comorbilidad_HTA (legacy col 115)', expect: 'NO', reason: "false -> 'NO' (corpus sets false)" },
  { journey: 'ar|seguimiento', pos: (a) => a.legacy(115, "comorbilidad.hta: setLegacyColumn(row, 115, normalizarEstadoExport(comorb['hta'], 'ND')) in generarFilaCSV_AR_Base"), label: 'Comorbilidad_HTA (legacy col 115)', expect: 'ND', reason: "missing -> fallback 'ND'" },
];

// ---------------------------------------------------------------------------
// PART A: pure acceptance function over the harness output.
// ---------------------------------------------------------------------------

function makeViolationsFor(authority) {
  return function violationsFor(result) {
    const v = [];
    const journeys = Array.isArray(result?.journeys) ? result.journeys : [];

    for (const expected of JOURNEYS) {
      const key = `${expected.pathology}|${expected.tipoVisita}`;
      const journey = journeys.find((j) => j.pathology === expected.pathology && j.tipoVisita === expected.tipoVisita);
      if (!journey || typeof journey.row !== 'string' || journey.row.length === 0) {
        v.push(`A1 ${key}: harness produced no row for a supported journey`);
        continue;
      }

      // A1: the oracle counts the fields ITSELF from the TSV row.
      const fields = journey.row.split('\t');
      if (fields.length !== authority.finalCount) {
        v.push(`A1 ${key}: row has ${fields.length} fields, expected exactly ${authority.finalCount}`);
      }

      // A2: identity and visit columns (legacy base block; columns 1, 5 and 7
      // of every base generator, block size backed by LEGACY_BASE_COLUMN_COUNT).
      const patientIdPos = authority.legacy(1, 'idPaciente: setLegacyColumn(row, 1, datos.idPaciente) / inline valores[0] in every base generator');
      const visitPos = authority.legacy(5, "Tipo_Visita: 'Primera Visita' / 'Seguimiento' literal in every base generator");
      const pathologyPos = authority.legacy(7, 'diagnosticoPrimario: setLegacyColumn(row, 7, ...) / inline valores[6] in every base generator');
      if (fields[patientIdPos] !== expected.patientId) {
        v.push(`A2 ${key}: field 1 patientId is ${JSON.stringify(fields[patientIdPos])}, expected ${expected.patientId}`);
      }
      if (fields[visitPos] !== VISIT_MARKERS[expected.tipoVisita]) {
        v.push(`A2 ${key}: field 5 visit marker is ${JSON.stringify(fields[visitPos])}, expected ${VISIT_MARKERS[expected.tipoVisita]}`);
      }
      if (fields[pathologyPos] !== PATHOLOGY_TOKENS[expected.pathology]) {
        v.push(`A2 ${key}: field 7 pathology token is ${JSON.stringify(fields[pathologyPos])}, expected ${PATHOLOGY_TOKENS[expected.pathology]}`);
      }
      for (const other of JOURNEYS) {
        if (other.marker === expected.marker) continue;
        if (journey.row.includes(other.marker)) {
          v.push(`A2 ${key}: foreign journey marker ${other.marker} found in row`);
        }
      }

      // A3: sentinel preservation at authority-derived positions.
      for (const sentinel of SENTINELS.filter((s) => s.journey === key)) {
        const position = sentinel.pos(authority);
        const actual = fields[position];
        if (actual !== sentinel.expect) {
          v.push(
            `A3 ${key}: ${sentinel.label} at field ${position + 1} is ${JSON.stringify(actual)}, ` +
            `expected ${JSON.stringify(sentinel.expect)} (${sentinel.reason})`
          );
        }
      }

      // A4: synthetic-only identifiers.
      if (!/^SYN-/.test(String(fields[patientIdPos] || ''))) {
        v.push(`A4 ${key}: patientId ${JSON.stringify(fields[patientIdPos])} does not start with 'SYN-'`);
      }
      for (const pattern of REAL_ID_PATTERNS) {
        if (pattern.regex.test(journey.row)) {
          v.push(`A4 ${key}: row contains a real-format identifier matching the ${pattern.name} shape`);
        }
      }
    }

    // Every supported journey must be present exactly once.
    for (const expected of JOURNEYS) {
      const count = journeys.filter((j) => j.pathology === expected.pathology && j.tipoVisita === expected.tipoVisita).length;
      if (count !== 1) {
        v.push(`A2 ${expected.pathology}|${expected.tipoVisita}: journey appears ${count} times, expected exactly 1`);
      }
    }

    return v;
  };
}

// ---------------------------------------------------------------------------
// Checker plumbing (same conventions as tools/reuma_export_harness_check.mjs).
// ---------------------------------------------------------------------------

function makeRecord(sink) {
  return (name, pass, detail) => {
    sink.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
  };
}

function violationsOf(violations, classification) {
  return violations.filter((v) => v.startsWith(classification));
}

function journeyKey(j) {
  return `${j.pathology}|${j.tipoVisita}`;
}

async function main() {
  console.log('Reuma export acceptance check (F1.3B WU-B, 100% synthetic corpus)');

  const authority = deriveExportAuthority();
  const violationsFor = makeViolationsFor(authority);

  const results = [];
  const record = makeRecord(results);
  record(
    'production authority derivable and consistent (LEGACY_BASE=220, HISTORICAL=321, FINAL=497, five exposed header blocks)',
    authority.finalCount === 497 && authority.legacyBase === 220 && authority.historical === 321,
    'authority derivation failed closed'
  );

  // --- Frozen corpus: acceptance (all journeys must PASS) ---
  const frozen = await runReumaExportHarness({ corpusFile: CORPUS });
  const frozenViolations = violationsFor(frozen);

  const a1 = violationsOf(frozenViolations, 'A1');
  record('A1 frozen corpus: all 10 journeys produce exactly 497 fields (counted by the oracle itself)', a1.length === 0, a1.join('; ') || 'all journeys OK');

  const a2 = violationsOf(frozenViolations, 'A2');
  record('A2 frozen corpus: identity/visit/pathology markers correct, no foreign journey marker', a2.length === 0, a2.join('; ') || 'all journeys OK');

  const a3 = violationsOf(frozenViolations, 'A3');
  record('A3 frozen corpus: sentinels preserved at authority-derived positions (0/NA/ND/\'\'; false->NO vs missing->ND)', a3.length === 0, a3.join('; ') || 'all sentinels OK');

  const a4 = violationsOf(frozenViolations, 'A4');
  record('A4 frozen corpus: every patientId synthetic (SYN-*), no real-format identifier', a4.length === 0, a4.join('; ') || 'all rows synthetic-only');

  record(
    'frozen corpus acceptance: violationsFor(frozen harness output) is empty',
    frozenViolations.length === 0,
    `${frozenViolations.length} violation(s): ${frozenViolations.join('; ')}`
  );

  // --- Planted negatives (in-memory only; each must violate as expected) ---
  const arPrimera = frozen.journeys.find((j) => journeyKey(j) === 'ar|primera');
  const espaPrimera = frozen.journeys.find((j) => journeyKey(j) === 'espa|primera');
  if (!arPrimera || !espaPrimera) {
    throw new Error('frozen harness output missing expected journeys; cannot build planted negatives');
  }

  // N1 length drift: synthetic 496-field row fed to the oracle's evaluation
  // path must violate A1 (independent of any legacy warning).
  const n1Row = arPrimera.row.split('\t').slice(0, authority.finalCount - 1).join('\t');
  const n1Violations = violationsFor({
    journeys: [{ pathology: 'ar', tipoVisita: 'primera', patientId: arPrimera.patientId, row: n1Row }],
  });
  record('N1 length drift detected (496-field row violates A1)', violationsOf(n1Violations, 'A1').length >= 1, `A1 violations: ${violationsOf(n1Violations, 'A1').length}`);

  // N2 journey mix: swap two journeys' rows, keep metadata.
  const n2Journeys = frozen.journeys.map((j) => ({ ...j }));
  const n2Ar = n2Journeys.find((j) => journeyKey(j) === 'ar|primera');
  const n2Espa = n2Journeys.find((j) => journeyKey(j) === 'espa|primera');
  const arRow = n2Ar.row;
  n2Ar.row = n2Espa.row;
  n2Espa.row = arRow;
  const n2Violations = violationsFor({ journeys: n2Journeys });
  record('N2 journey mix detected (swapped rows violate A2)', violationsOf(n2Violations, 'A2').length >= 1, `A2 violations: ${violationsOf(n2Violations, 'A2').length}`);

  // N3 value collapse: sentinel '0' rewritten to '' in an in-memory copy.
  const sentinel = SENTINELS.find((s) => s.journey === 'ar|primera' && s.expect === '0');
  const n3Fields = arPrimera.row.split('\t');
  n3Fields[sentinel.pos(authority)] = '';
  const n3Violations = violationsFor({
    journeys: [{ pathology: 'ar', tipoVisita: 'primera', patientId: arPrimera.patientId, row: n3Fields.join('\t') }],
  });
  record('N3 value collapse detected (sentinel 0 -> "" violates A3)', violationsOf(n3Violations, 'A3').length >= 1, `A3 violations: ${violationsOf(n3Violations, 'A3').length}`);

  // N4 contamination: another journey's marker injected into a row.
  const n4Fields = espaPrimera.row.split('\t');
  n4Fields[2] = `${n4Fields[2]} SYN-ABA-AR-S`;
  const n4Violations = violationsFor({
    journeys: [{ pathology: 'espa', tipoVisita: 'primera', patientId: espaPrimera.patientId, row: n4Fields.join('\t') }],
  });
  record('N4 contamination detected (foreign marker violates A2)', violationsOf(n4Violations, 'A2').length >= 1, `A2 violations: ${violationsOf(n4Violations, 'A2').length}`);

  // N5 non-synthetic identifier in the patientId column.
  const n5Fields = arPrimera.row.split('\t');
  n5Fields[0] = '12345678Z';
  const n5Violations = violationsFor({
    journeys: [{ pathology: 'ar', tipoVisita: 'primera', patientId: '12345678Z', row: n5Fields.join('\t') }],
  });
  record('N5 non-synthetic id detected (real-format identifier violates A4)', violationsOf(n5Violations, 'A4').length >= 1, `A4 violations: ${violationsOf(n5Violations, 'A4').length}`);

  // --- Integration: the oracle tracks in-memory corpus mutations ---
  const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS), 'utf8'));
  const mutated = structuredClone(corpus.journeys);
  const mutatedArPrimera = mutated.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
  mutatedArPrimera.datos.hemogramaFechaSolicitud = '';
  const mutatedRun = await runReumaExportHarness({ corpusFile: CORPUS, journeys: mutated });
  const mutatedViolations = violationsFor(mutatedRun);
  const mutatedArKey = 'ar|primera';
  const otherRowsUnchanged = frozen.journeys
    .filter((j) => journeyKey(j) !== mutatedArKey)
    .every((j) => j.row === mutatedRun.journeys.find((x) => journeyKey(x) === journeyKey(j)).row);
  const sentinelA3Hits = violationsOf(mutatedViolations, 'A3').filter((v) => v.includes('Hemograma_Fecha_Solicitud'));
  record(
    'mutated corpus: 0 -> "" in datos reaches the row and the oracle reports the A3 violation (only that journey changes)',
    sentinelA3Hits.length >= 1 && otherRowsUnchanged,
    `A3 Hemograma_Fecha_Solicitud violations: ${sentinelA3Hits.length}; unrelated journeys changed: ${!otherRowsUnchanged}`
  );

  // --- PART B: KNOWN_LEGACY / NON_GOLDEN characterization (never acceptance) ---
  console.log('');
  console.log('KNOWN_LEGACY / NON_GOLDEN characterization (explicit, not asserted as acceptance):');

  const frozenWarningCount = frozen.journeys.reduce((acc, j) => acc + j.legacyWarnings.length, 0);
  record(
    'characterization: frozen corpus rows are silent in production (no legacy warning; the oracle never uses warnings as PASS source)',
    frozenWarningCount === 0,
    `${frozenWarningCount} legacy warning(s) observed`
  );

  // (1) Length enforcement is warn-only: validateExportRowLength returns
  // undefined and can never block or fail; demonstrated on a 496-field row.
  const probe = createLegacySandbox();
  const logsBefore = probe.sink.logs.length;
  const driftedRow = Array(authority.finalCount - 1).fill('X');
  const validateReturn = probe.sandbox.HubTools.export.validateExportRowLength(driftedRow, 'ar', 'primera');
  const warnLogs = probe.sink.logs.slice(logsBefore).filter((l) => l.level === 'warn');
  record(
    'characterization: production length enforcement is in-band warn-only (validateExportRowLength returns undefined, emits console.warn, never blocks)',
    validateReturn === undefined && warnLogs.length === 1,
    `return=${JSON.stringify(validateReturn)}, warn logs=${warnLogs.length}`
  );

  // (3) Doubted behavior demonstrated: the dolorNocturno fallback 'NO'
  // (legacy col 106, normalizarEstadoExport(datos.dolorNocturno, 'NO'))
  // collapses explicit false and missing into the same output.
  const noDolor = structuredClone(corpus.journeys);
  delete noDolor.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera').datos.dolorNocturno;
  const noDolorRun = await runReumaExportHarness({ corpusFile: CORPUS, journeys: noDolor });
  const dolorCollapses =
    noDolorRun.journeys.find((j) => journeyKey(j) === 'ar|primera').row === arPrimera.row;
  record(
    'characterization: dolorNocturno false and missing are indistinguishable in the transport (row byte-identical without the key) - KNOWN_LEGACY, not golden',
    dolorCollapses,
    'rows differ; the fallback does not collapse as expected from the source'
  );

  console.log('');
  console.log('Classification summary (details in docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md):');
  console.log('  ACCEPTANCE (golden): A1 exact 497 length; A2 identity/visit/pathology at legacy fields 1/5/7 + marker isolation;');
  console.log('  A3 sentinels at production-derived positions (Hemograma_Fecha_Solicitud, ANA, Decision_Clinica_Manual,');
  console.log('  ExtraAR_Anemia, Estado_Prebiologico_Final, Hemograma_Observaciones, Observaciones_Prebiologico, comorbilidad.hta');
  console.log('  legacy col 115); A4 synthetic-only identifiers.');
  console.log('  KNOWN_LEGACY (not golden): warn-only length enforcement; legacy-base positions without exposed header arrays');
  console.log('  (hlaB27 col 9, dolorNocturno col 106, extraArticular.digestiva col 112, mdaCumple col 193); raw');
  console.log('  `datos.X || \'\'` reads in EspA/APs generators that would collapse 0/false (no corpus sentinel affected);');
  console.log('  dolorNocturno/mdaCumple false-vs-missing collapse.');

  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Reuma export acceptance check FAILED');
    process.exit(1);
  }
  console.log('Reuma export acceptance check PASSED');
}

main().catch((err) => {
  console.error('Reuma export acceptance check crashed:', err);
  process.exit(1);
});
