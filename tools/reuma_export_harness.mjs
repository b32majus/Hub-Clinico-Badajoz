#!/usr/bin/env node
'use strict';
/**
 * Export harness for the legacy Reuma export manager (F1.3B WU-A).
 *
 * Loads modules/hubTools.js and modules/exportManager.js unmodified inside a
 * Node `vm` sandbox that shims the browser globals they expect (window,
 * document, sessionStorage, localStorage, CustomEvent). Legacy production code
 * is never copied, patched or instrumented; the harness only supplies the
 * environment the browser would. XLSX is not needed: the harness drives the
 * row generators directly.
 *
 * For every requested corpus journey the harness calls the exposed legacy
 * generator `HubTools.export.generarFilaCSV_<Pathology>_<PrimeraVisita|Seguimiento>`
 * with a deep copy of the journey `datos` and the visit type string
 * ('primera' | 'seguimiento'), exactly as the production code expects.
 *
 * Every console output of the legacy code is captured (not silenced).
 * console.warn output produced during a journey's generation is surfaced as
 * that journey's `legacyWarnings` (characterization evidence only; the oracle
 * must not trust them).
 *
 * Usage:
 *   import { runReumaExportHarness } from './reuma_export_harness.mjs';
 *   const result = await runReumaExportHarness({ corpusFile: 'tools/fixtures/reuma_export/corpus_v1.json' });
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CORPUS = 'tools/fixtures/reuma_export/corpus_v1.json';

// Only the modules the export surface needs; loaded from the repository, unmodified.
const EXPORT_SCRIPTS = ['modules/hubTools.js', 'modules/exportManager.js'];

// Corpus pathology name -> token used by the exposed legacy generator names.
const GENERATOR_TOKENS = {
  ar: 'AR',
  espa: 'EspA',
  aps: 'APs',
  les: 'LES',
  sjogren: 'SJOGREN',
};

const VISIT_SUFFIX = {
  primera: 'PrimeraVisita',
  seguimiento: 'Seguimiento',
};

function createCapturingConsole(sink) {
  const relay = (level) => (...args) => {
    sink.logs.push({ level, message: args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ') });
  };
  return { log: relay('log'), warn: relay('warn'), error: relay('error'), info: relay('log') };
}

function createStorageShim() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
  };
}

export function createLegacySandbox() {
  const sink = { logs: [] };
  const sandbox = {
    console: createCapturingConsole(sink),
    setTimeout,
    clearTimeout,
    navigator: { userAgent: 'promueve-export-harness/1' },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.sessionStorage = createStorageShim();
  sandbox.localStorage = createStorageShim();
  sandbox.CustomEvent = class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options ? options.detail : undefined;
    }
  };
  sandbox.document = {
    dispatchEvent() {
      return true;
    },
    addEventListener() {},
    removeEventListener() {},
    getElementById() {
      return null;
    },
    createElement() {
      return { style: {}, setAttribute() {}, appendChild() {}, removeChild() {}, remove() {} };
    },
  };
  sandbox.dispatchEvent = () => true;
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  vm.createContext(sandbox);
  for (const file of EXPORT_SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  }
  return { sandbox, sink };
}

/**
 * Runs the legacy export generators against the synthetic corpus.
 * @param {object} options
 * @param {string} [options.corpusFile] repository-relative path to the corpus JSON
 * @param {Array<object>} [options.journeys] in-memory journeys overriding the corpus file
 * @returns {Promise<object>} characterization-ready export rows and legacy logs
 */
export async function runReumaExportHarness(options = {}) {
  const corpusFile = path.resolve(ROOT, options.corpusFile || DEFAULT_CORPUS);
  const corpus = options.journeys ? { journeys: options.journeys } : JSON.parse(fs.readFileSync(corpusFile, 'utf8'));
  const journeys = Array.isArray(corpus.journeys) ? corpus.journeys : [];

  const results = [];
  const legacyLogs = [];

  for (const journey of journeys) {
    const pathology = String(journey.pathology || '').toLowerCase();
    const tipoVisita = String(journey.tipoVisita || '').toLowerCase();
    const token = GENERATOR_TOKENS[pathology];
    if (!token) {
      throw new Error(`Unsupported pathology in export corpus: ${journey.pathology}`);
    }
    if (!VISIT_SUFFIX[tipoVisita]) {
      throw new Error(`Unsupported visit type in export corpus: ${journey.tipoVisita}`);
    }

    const { sandbox, sink } = createLegacySandbox();
    const generatorName = `generarFilaCSV_${token}_${VISIT_SUFFIX[tipoVisita]}`;
    const generator = sandbox.HubTools?.export?.[generatorName];
    if (typeof generator !== 'function') {
      throw new Error(`Generator not exposed by unmodified production modules: ${generatorName}`);
    }

    // Load-time logs are kept as characterization evidence; generation warnings
    // are captured separately per journey and must never be trusted by the oracle.
    legacyLogs.push(...sink.logs.map((l) => ({ level: l.level, message: l.message })));
    const logsBeforeGeneration = sink.logs.length;

    const row = generator(structuredClone(journey.datos), tipoVisita);

    legacyLogs.push(...sink.logs.slice(logsBeforeGeneration).map((l) => ({ level: l.level, message: l.message })));
    const legacyWarnings = sink.logs
      .slice(logsBeforeGeneration)
      .filter((l) => l.level === 'warn')
      .map((l) => l.message);

    results.push({
      pathology,
      tipoVisita,
      patientId: journey.patientId,
      row,
      fields: typeof row === 'string' ? row.split('\t') : [],
      legacyWarnings,
    });
  }

  return { journeys: results, legacyLogs };
}
