#!/usr/bin/env node
'use strict';
/**
 * Deterministic check for the Reuma export harness against the synthetic corpus
 * (F1.3B WU-A). Proves that the harness loads the unmodified legacy production
 * modules (modules/hubTools.js + modules/exportManager.js), that all 10
 * supported journeys generate a row, that identity and pathology markers reach
 * the transport without cross-pathology contamination, that two runs are
 * byte-identical, and that the harness/checker can FAIL (falsification):
 * mutating the corpus changes the generated row, and a planted wrong
 * expectation is detected by the checker's own record path.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_export_harness_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReumaExportHarness, createLegacySandbox } from './reuma_export_harness.mjs';

const CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Frozen expectations for the synthetic corpus: each journey carries a unique
// treatment marker token (no marker is a substring of another) so cross-journey
// contamination is detectable at harness level.
const EXPECTED_JOURNEYS = [
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

// record() factory so the falsification self-test exercises the exact same
// record path as the main cases, but with an isolated tally.
function makeRecord(sink) {
  return (name, pass, detail) => {
    sink.push({ name, pass });
    console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
  };
}

const results = [];
const record = makeRecord(results);

function journeyKey(j) {
  return `${j.pathology}|${j.tipoVisita}`;
}

async function main() {
  console.log('Reuma export harness check (F1.3B WU-A, 100% synthetic corpus)');

  const result = await runReumaExportHarness({ corpusFile: CORPUS });
  const byKey = new Map(result.journeys.map((j) => [journeyKey(j), j]));

  // --- Case 1: unmodified production modules run all 10 supported journeys ---
  record(
    'harness runs all 10 supported journeys without throwing',
    result.journeys.length === EXPECTED_JOURNEYS.length &&
      EXPECTED_JOURNEYS.every((e) => byKey.has(`${e.pathology}|${e.tipoVisita}`)),
    `journeys returned: ${result.journeys.map(journeyKey).join(', ')}`
  );

  const allHaveRows = EXPECTED_JOURNEYS.every((e) => {
    const j = byKey.get(`${e.pathology}|${e.tipoVisita}`);
    return typeof j?.row === 'string' && j.row.length > 0;
  });
  record('every journey returns a non-empty row string', allHaveRows, 'at least one journey returned no row');

  const sandboxProbe = createLegacySandbox();
  const expectedColumnCount = sandboxProbe.sandbox.HubTools?.export?.FINAL_V2_EXPORT_COLUMN_COUNT;
  record(
    'unmodified production modules expose the v2 column contract (FINAL_V2_EXPORT_COLUMN_COUNT=497)',
    expectedColumnCount === 497,
    `observed: ${expectedColumnCount}`
  );
  const columnCountsMatch = EXPECTED_JOURNEYS.every((e) => {
    const j = byKey.get(`${e.pathology}|${e.tipoVisita}`);
    return j?.fields?.length === expectedColumnCount;
  });
  record(
    'every generated row matches the production v2 column contract',
    columnCountsMatch,
    `observed counts: ${result.journeys.map((j) => j.fields.length).join(', ')}`
  );

  // --- Case 2: basic structural checks per journey ---
  const structural = [];
  for (const e of EXPECTED_JOURNEYS) {
    const j = byKey.get(`${e.pathology}|${e.tipoVisita}`);
    if (typeof j?.row !== 'string') {
      structural.push(`${e.pathology}/${e.tipoVisita}: no row`);
      continue;
    }
    if (j.fields.length < 400) structural.push(`${e.pathology}/${e.tipoVisita}: ${j.fields.length} fields`);
    if (!j.row.includes(e.patientId)) structural.push(`${e.pathology}/${e.tipoVisita}: patientId missing`);
  }
  record(
    'each row is a string of >= 400 tab-separated fields carrying its own patientId',
    structural.length === 0,
    structural.join('; ') || 'all journeys OK'
  );

  const contamination = [];
  for (const e of EXPECTED_JOURNEYS) {
    const own = byKey.get(`${e.pathology}|${e.tipoVisita}`);
    if (!own?.row?.includes(e.marker)) {
      contamination.push(`${e.pathology}/${e.tipoVisita}: own marker missing`);
    }
    for (const other of EXPECTED_JOURNEYS) {
      if (other.patientId === e.patientId) continue;
      const otherJourney = byKey.get(`${other.pathology}|${other.tipoVisita}`);
      if (otherJourney?.row?.includes(e.marker)) {
        contamination.push(`${e.marker} leaked into ${other.pathology}/${other.tipoVisita}`);
      }
    }
  }
  record(
    'each pathology marker reaches only its own journey row (no cross-pathology contamination)',
    contamination.length === 0,
    contamination.join('; ') || 'no contamination'
  );

  // --- Case 3: determinism ---
  const second = await runReumaExportHarness({ corpusFile: CORPUS });
  const firstRows = JSON.stringify(result.journeys.map((j) => j.row));
  const secondRows = JSON.stringify(second.journeys.map((j) => j.row));
  record('two harness runs produce byte-identical rows for every journey', firstRows === secondRows, 'rows differ between runs');

  // --- Case 4a: falsification of the harness via corpus mutation ---
  const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS), 'utf8'));
  const mutated = structuredClone(corpus.journeys);
  const arPrimera = mutated.find((j) => j.pathology === 'ar' && j.tipoVisita === 'primera');
  // The marker token appears in both fields the legacy generators read for this
  // journey (tratamientoActual at column 198 and planFamesEntries at column 215).
  arPrimera.datos.tratamientoActual = 'SYN-MUTATED-AR-PROBE';
  arPrimera.datos.planFamesEntries[0].farmaco = 'SYN-MUTATED-AR-PROBE';
  const mutatedResult = await runReumaExportHarness({ corpusFile: CORPUS, journeys: mutated });
  const mutatedByKey = new Map(mutatedResult.journeys.map((j) => [journeyKey(j), j]));
  const mutatedArPrimera = mutatedByKey.get('ar|primera');
  const baselineArSeguimiento = byKey.get('ar|seguimiento');
  const mutatedArSeguimiento = mutatedByKey.get('ar|seguimiento');
  const baselineEspaPrimera = byKey.get('espa|primera');
  const mutatedEspaPrimera = mutatedByKey.get('espa|primera');
  const mutationDetected =
    !!mutatedArPrimera &&
    mutatedArPrimera.row.includes('SYN-MUTATED-AR-PROBE') &&
    !mutatedArPrimera.row.includes('SYN-MTX-AR-P') &&
    mutatedArSeguimiento?.row === baselineArSeguimiento?.row &&
    mutatedEspaPrimera?.row === baselineEspaPrimera?.row;
  record(
    'corpus mutation changes only the affected journey row (harness truly executes production code over the corpus)',
    mutationDetected,
    'mutated marker not observed in the AR primera row, or unrelated journeys changed'
  );

  // --- Case 4b: falsification of the checker (planted wrong expectation) ---
  const plantedSink = [];
  const plantedRecord = makeRecord(plantedSink);
  const arPrimeraRow = byKey.get('ar|primera')?.row;
  const arSeguimientoRow = byKey.get('ar|seguimiento')?.row;
  plantedRecord(
    'planted lie: AR primera row must equal AR seguimiento row',
    arPrimeraRow === arSeguimientoRow,
    'rows are byte-different (expected for the planted lie)'
  );
  const lieDetected = plantedSink.length === 1 && plantedSink[0].pass === false;
  record(
    'checker falsification self-test: a planted wrong expectation is detected',
    lieDetected,
    `planted record passed=${plantedSink[0]?.pass}, sink size=${plantedSink.length}`
  );

  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Reuma export harness check FAILED');
    process.exit(1);
  }
  console.log('Reuma export harness check PASSED');
}

main().catch((err) => {
  console.error('Reuma export harness check crashed:', err);
  process.exit(1);
});
