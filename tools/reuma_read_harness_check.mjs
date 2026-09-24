#!/usr/bin/env node
'use strict';
/**
 * Deterministic check for the Reuma read harness against the synthetic corpus
 * (F1.3A WU-A). Proves that the harness loads the unmodified legacy data
 * manager, that the five pathology sheets are recognized, that patients are
 * located across sheets, that history ordering uses the synthetic dates, and
 * that two runs produce byte-identical canonical reads.
 *
 * Exit codes: 0 = all cases PASS, 1 = at least one case FAIL.
 * Usage: node tools/reuma_read_harness_check.mjs
 */

import { runReumaReadHarness } from './reuma_read_harness.mjs';

const CORPUS = 'tools/fixtures/reuma_read/corpus_v1.json';
const PATIENT_IDS = ['SYN-ESPA-001', 'SYN-ESPA-002', 'SYN-APS-001', 'SYN-AR-001', 'SYN-LES-001', 'SYN-SJO-001'];

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

function canonical(result) {
  // lastLoadedTime uses Date.now() inside the legacy loader and is excluded;
  // every actual read result must still be byte-identical across runs.
  return JSON.stringify(result.reads, null, 1);
}

const REQUIRED_SHEETS = ['APS', 'AR', 'ESPA', 'LES', 'SJOGREN'];
const PATHOLOGY_BY_ID = {
  'SYN-ESPA-001': 'espa',
  'SYN-ESPA-002': 'espa',
  'SYN-APS-001': 'aps',
  'SYN-AR-001': 'ar',
  'SYN-LES-001': 'les',
  'SYN-SJO-001': 'sjogren',
};

async function main() {
  console.log('Reuma read harness check (F1.3A WU-A, 100% synthetic corpus)');
  const result = await runReumaReadHarness({ corpusFile: CORPUS, patientIds: PATIENT_IDS });

  record('legacy loader accepts the synthetic workbook', result.reads.loadResult === true, `loadDatabase returned ${result.reads.loadResult}`);
  record('legacy appState is loaded', result.appState.isLoaded === true, 'appState.isLoaded is false');

  const sheetKeys = JSON.stringify(result.appState.sheetKeys);
  record(
    'all five pathology sheets are recognized by the legacy loader',
    REQUIRED_SHEETS.every((s) => result.appState.sheetKeys.includes(s)),
    `appState sheets: ${sheetKeys}`
  );

  const patients = result.reads.getAllPatients;
  const patientIdSet = new Set(patients.map((p) => String(p.ID_Paciente || p.idPaciente)));
  record(
    'patients from all five pathology sheets are reachable through getAllPatients',
    PATIENT_IDS.every((id) => patientIdSet.has(id)),
    `IDs found: ${[...patientIdSet].join(', ')}`
  );

  let lookupsOk = true;
  for (const [id, pathology] of Object.entries(PATHOLOGY_BY_ID)) {
    const found = result.reads.findPatientById[id];
    const foundPathology = found && (found.pathology || (found.diagnosticoPrimario || '').toLowerCase());
    if (!found) {
      lookupsOk = false;
      record(`findPatientById("${id}")`, false, 'patient not found');
    } else if (!String(foundPathology).includes(pathology)) {
      lookupsOk = false;
      record(`findPatientById("${id}")`, false, `pathology mismatch: ${foundPathology}`);
    }
  }
  if (lookupsOk) {
    record('every synthetic patient is located in its own pathology sheet', true, '');
  }

  record(
    'unknown synthetic ID returns null without falling back to invented records',
    result.reads.unknownPatientLookup === null,
    `unexpected result: ${JSON.stringify(result.reads.unknownPatientLookup)}`
  );

  const history = result.reads.getPatientHistory['SYN-ESPA-001'];
  record(
    'multi-visit history keeps both synthetic visits',
    history && history.allVisits.length === 2,
    `allVisits length: ${history ? history.allVisits.length : 'no history'}`
  );
  const dates = history ? history.allVisits.map((v) => v.fechaVisita || v.Fecha_Visita) : [];
  record(
    'history ordering places the most recent synthetic visit first',
    history && history.latestVisit && String(history.latestVisit.fechaVisita || history.latestVisit.Fecha_Visita) === '01/03/2026' &&
      String(history.firstVisit.fechaVisita || history.firstVisit.Fecha_Visita) === '15/01/2026',
    `visit dates: ${dates.join(' | ')}`
  );

  const second = await runReumaReadHarness({ corpusFile: CORPUS, patientIds: PATIENT_IDS });
  record(
    'two harness runs produce byte-identical canonical reads',
    canonical(result) === canonical(second),
    'canonical read JSON differs between runs'
  );

  record(
    'corpus stays synthetic (every ID_Paciente uses the SYN- prefix)',
    patients.every((p) => String(p.ID_Paciente || p.idPaciente).startsWith('SYN-')),
    'found non-synthetic identifiers in the read output'
  );

  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Reuma read harness check FAILED');
    process.exit(1);
  }
  console.log('Reuma read harness check PASSED');
}

main().catch((err) => {
  console.error('Reuma read harness check crashed:', err);
  process.exit(1);
});
