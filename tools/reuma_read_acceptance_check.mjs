#!/usr/bin/env node
'use strict';
/**
 * Acceptance oracle for the legacy Reuma read surface (F1.3A WU-B).
 *
 * Acceptance invariants (golden, authority-supported) and falsification cases
 * are visibly separated. The oracle runs against the frozen synthetic corpus
 * (tools/fixtures/reuma_read/corpus_v1.json) and must PASS on it, and must FAIL
 * with the expected violation on each planted in-memory corpus mutation:
 *
 *   F1 pathology mix        - AR visits relocated into the ESPA sheet
 *   F2 lost history visit   - one valid ESPA visit removed
 *   F3 zero collapsed       - FR 0 rewritten as absent ('')
 *   F4 cross-patient ID     - LES record re-identified with an AR patient ID
 *   F5 non-synthetic ID     - obvious real-format identifier injected
 *
 * The oracle never modifies production files; mutations live only in a temp dir.
 *
 * Exit codes: 0 = corpus PASS and every mutation FAILed as expected;
 *             1 = any corpus assertion PASSed on a mutation or failed on the corpus.
 * Usage: node tools/reuma_read_acceptance_check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runReumaReadHarness } from './reuma_read_harness.mjs';

const CORPUS = 'tools/fixtures/reuma_read/corpus_v1.json';
const PATIENT_IDS = ['SYN-ESPA-001', 'SYN-ESPA-002', 'SYN-APS-001', 'SYN-AR-001', 'SYN-LES-001', 'SYN-SJO-001'];
const REQUIRED_SHEETS = ['ESPA', 'APS', 'AR', 'LES', 'SJOGREN'];

// ---------------------------------------------------------------------------
// Acceptance invariants (golden). Each returns null when satisfied, or a
// violation string. Only behaviors supported by current authority are golden;
// known-legacy fallbacks are deliberately NOT asserted here.
// ---------------------------------------------------------------------------

function violationsFor(result) {
  const v = [];
  const reads = result.reads;

  // A1: the five supported pathology sheets are recognized.
  if (!REQUIRED_SHEETS.every((s) => result.appState.sheetKeys.includes(s))) {
    v.push(`A1 sheet recognition failed: ${JSON.stringify(result.appState.sheetKeys)}`);
  }

  // A2: every synthetic patient is located in its own pathology sheet.
  const expectedPathology = {
    'SYN-ESPA-001': 'espa',
    'SYN-ESPA-002': 'espa',
    'SYN-APS-001': 'aps',
    'SYN-AR-001': 'ar',
    'SYN-LES-001': 'les',
    'SYN-SJO-001': 'sjogren',
  };
  for (const [id, pathology] of Object.entries(expectedPathology)) {
    const found = reads.findPatientById[id];
    const foundPathology = found && (found.pathology || (found.diagnosticoPrimario || '').toLowerCase());
    if (!found) {
      v.push(`A2 patient ${id} not found`);
    } else if (!String(foundPathology).includes(pathology)) {
      v.push(`A2 patient ${id} resolved into wrong pathology: ${foundPathology}`);
    }
  }

  // A3: a synthetic ID never returns another patient's records, and a patient's
  // history never mixes pathologies.
  const expectedPathologies = {
    'SYN-ESPA-001': 'espa',
    'SYN-ESPA-002': 'espa',
    'SYN-APS-001': 'aps',
    'SYN-AR-001': 'ar',
    'SYN-LES-001': 'les',
    'SYN-SJO-001': 'sjogren',
  };
  for (const [id, history] of Object.entries(reads.getPatientHistory)) {
    for (const visit of history.allVisits || []) {
      const visitPatient = String(visit.ID_Paciente || visit.idPaciente || '');
      if (visitPatient && visitPatient !== id) {
        v.push(`A3 history of ${id} contains a visit of ${visitPatient}`);
      }
      const visitPathology = String(visit.pathology || '').toLowerCase();
      if (visitPathology && !visitPathology.includes(expectedPathologies[id])) {
        v.push(`A3 history of ${id} mixes pathologies: ${visitPathology}`);
      }
    }
  }

  // A4: distinguishable preservation of 0 / explicit NA / ND tokens and empty
  // strings where the authority keeps them apart (ESPA visit 1 of SYN-ESPA-001).
  const espa = reads.findPatientById['SYN-ESPA-001'];
  if (espa) {
    if (espa.FR !== 0) v.push(`A4 FR 0 collapsed to ${JSON.stringify(espa.FR)}`);
    if (espa.APCC !== 'NA') v.push(`A4 APCC NA token not preserved: ${JSON.stringify(espa.APCC)}`);
    if (espa.PCR !== 'ND') v.push(`A4 PCR ND token not preserved: ${JSON.stringify(espa.PCR)}`);
  } else {
    v.push('A4 SYN-ESPA-001 not found; preservation not assessable');
  }
  const espaHistory = reads.getPatientHistory['SYN-ESPA-001'];
  if (espaHistory && espaHistory.allVisits.length === 2) {
    const firstVisit = espaHistory.allVisits.find((x) => String(x.Fecha_Visita || x.fechaVisita) === '15/01/2026');
    if (!firstVisit) {
      v.push('A4 ESPA first visit missing from history');
    } else {
      if (firstVisit.Dactilitis_Total !== 0) v.push(`A4 Dactilitis_Total 0 collapsed: ${JSON.stringify(firstVisit.Dactilitis_Total)}`);
      if (firstVisit.Decision_Terapeutica_SEG !== '') {
        v.push(`A4 empty Decision_Terapeutica_SEG not preserved: ${JSON.stringify(firstVisit.Decision_Terapeutica_SEG)}`);
      }
    }
  }

  // A5: history ordering derives from synthetic dates without inventing records.
  const arHistory = reads.getPatientHistory['SYN-AR-001'];
  if (!arHistory || arHistory.allVisits.length !== 2) {
    v.push(`A5 AR history should keep both synthetic visits, got ${arHistory ? arHistory.allVisits.length : 'none'}`);
  } else {
    const latest = String(arHistory.latestVisit.Fecha_Visita || arHistory.latestVisit.fechaVisita);
    const first = String(arHistory.firstVisit.Fecha_Visita || arHistory.firstVisit.fechaVisita);
    if (latest !== '12/04/2026' || first !== '05/02/2026') {
      v.push(`A5 AR history ordering wrong: latest=${latest} first=${first}`);
    }
  }
  if (!espaHistory || espaHistory.allVisits.length !== 2) {
    v.push(`A5 ESPA history should keep both synthetic visits, got ${espaHistory ? espaHistory.allVisits.length : 'none'}`);
  } else {
    const espaDates = espaHistory.allVisits.map((x) => String(x.Fecha_Visita || x.fechaVisita)).sort();
    if (JSON.stringify(espaDates) !== JSON.stringify(['01/03/2026', '15/01/2026'])) {
      v.push(`A5 ESPA history dates drifted: ${espaDates.join(' | ')}`);
    }
  }

  // A6: unknown synthetic ID returns null (no invented fallback record).
  if (reads.unknownPatientLookup !== null) {
    v.push('A6 unknown synthetic ID did not return null');
  }

  // A7: no real-looking identifiers in the read output.
  const allSeen = [...reads.getAllPatients.map((p) => String(p.ID_Paciente || p.idPaciente))];
  if (!allSeen.every((id) => id.startsWith('SYN-'))) {
    v.push(`A7 non-synthetic identifier in read output: ${allSeen.filter((id) => !id.startsWith('SYN-')).join(', ')}`);
  }

  return v;
}

// ---------------------------------------------------------------------------
// Planted corpus mutations (falsification cases). Each must produce >= 1
// violation of the listed class.
// ---------------------------------------------------------------------------

function deepCopy(x) {
  return JSON.parse(JSON.stringify(x));
}

const MUTATIONS = [
  {
    name: 'F1 pathology mix (AR visits relocated into ESPA)',
    mutate(corpus) {
      corpus.sheets.ESPA.push(...corpus.sheets.AR);
      corpus.sheets.AR = [];
    },
    expectClass: 'A2 patient SYN-AR-001 resolved into wrong pathology',
  },
  {
    name: 'F2 lost history visit (one ESPA visit removed)',
    mutate(corpus) {
      corpus.sheets.ESPA = corpus.sheets.ESPA.filter((r) => r.Fecha_Visita !== '01/03/2026');
    },
    expectClass: 'A5 ESPA history should keep both synthetic visits',
  },
  {
    name: 'F3 zero collapsed to absence (FR 0 -> empty)',
    mutate(corpus) {
      for (const row of corpus.sheets.ESPA) {
        if (row.ID_Paciente === 'SYN-ESPA-001') row.FR = '';
      }
    },
    expectClass: 'A4 FR 0 collapsed',
  },
  {
    name: 'F4 cross-patient identity (LES record re-identified as AR patient)',
    mutate(corpus) {
      corpus.sheets.LES[0].ID_Paciente = 'SYN-AR-001';
    },
    expectClass: 'A3 history of SYN-AR-001 mixes pathologies',
  },
  {
    name: 'F5 non-synthetic identifier injected',
    mutate(corpus) {
      corpus.sheets.SJOGREN[0].ID_Paciente = '12345678Z';
    },
    expectClass: 'A7 non-synthetic identifier',
  },
];

// ---------------------------------------------------------------------------

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  [${pass ? 'OK ' : 'FAIL'}] ${name}${pass ? '' : ` -> ${detail}`}`);
}

async function runOracle(corpusFile) {
  const result = await runReumaReadHarness({ corpusFile, patientIds: PATIENT_IDS });
  return { result, violations: violationsFor(result) };
}

async function main() {
  console.log('Reuma read acceptance oracle (F1.3A WU-B, 100% synthetic corpus)');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-reuma-oracle-'));

  // 1. Frozen corpus must satisfy every acceptance invariant.
  const { result, violations } = await runOracle(CORPUS);
  record(
    'acceptance invariants hold on the frozen synthetic corpus',
    violations.length === 0,
    violations.join(' | ') || ''
  );
  record(
    'legacy log output is captured for characterization (exposure classified, not golden)',
    Array.isArray(result.legacyLogs),
    'log capture missing'
  );

  // 2. Every planted mutation must be detected with the expected violation class.
  for (const m of MUTATIONS) {
    const mutated = deepCopy(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), CORPUS), 'utf8')));
    m.mutate(mutated);
    const mutatedFile = path.join(tmp, `corpus-${MUTATIONS.indexOf(m)}.json`);
    fs.writeFileSync(mutatedFile, JSON.stringify(mutated, null, 1));
    const r = await runOracle(mutatedFile);
    const matched = r.violations.some((x) => x.startsWith(m.expectClass) || x.includes(m.expectClass));
    record(
      m.name,
      r.violations.length > 0 && matched,
      r.violations.length === 0 ? 'mutation was NOT detected' : `detected but expected class '${m.expectClass}', got: ${r.violations.join(' | ').slice(0, 220)}`
    );
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((r) => !r.pass).length;
  console.log('');
  console.log(`RESULTADO: ${results.length - failed} OK / ${failed} FALLIDO`);
  if (failed > 0) {
    console.error('Reuma read acceptance oracle FAILED');
    process.exit(1);
  }
  console.log('Reuma read acceptance oracle PASSED');
}

main().catch((err) => {
  console.error('Reuma read acceptance oracle crashed:', err);
  process.exit(1);
});
