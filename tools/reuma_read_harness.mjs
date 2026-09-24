#!/usr/bin/env node
'use strict';
/**
 * Read harness for the legacy Reuma data manager (F1.3A WU-A).
 *
 * Loads modules/hubTools.js, modules/fieldNormalizer.js and
 * modules/dataManager.js unmodified inside a Node `vm` sandbox that shims the
 * browser globals they expect (window, document, sessionStorage, localStorage,
 * XLSX, CustomEvent, Blob). Legacy production code is never copied, patched or
 * instrumented; the harness only supplies the environment the browser would.
 *
 * The corpus (tools/fixtures/reuma_read/corpus_v1.json) is converted into an
 * in-memory XLSX workbook and offered to the legacy loader through a File-like
 * object, exactly as a browser file input would.
 *
 * Every console output of the legacy code is captured (not silenced) so the
 * characterization can later classify log exposure.
 *
 * Usage:
 *   import { runReumaReadHarness } from './reuma_read_harness.mjs';
 *   const result = await runReumaReadHarness({ corpusFile: 'tools/fixtures/reuma_read/corpus_v1.json' });
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = require(path.join(ROOT, 'vendor', 'sheetjs', 'xlsx.full.min.js'));

const LEGACY_SCRIPTS = ['modules/hubTools.js', 'modules/fieldNormalizer.js', 'modules/dataManager.js'];

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
    _debugSize() {
      return [...store.values()].reduce((n, v) => n + v.length, 0);
    },
  };
}

export function createLegacySandbox() {
  const sink = { logs: [] };
  const sandbox = {
    console: createCapturingConsole(sink),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Blob: globalThis.Blob,
    navigator: { userAgent: 'promueve-read-harness/1' },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.sessionStorage = createStorageShim();
  sandbox.localStorage = createStorageShim();
  sandbox.XLSX = XLSX;
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
    createElement() {
      return { style: {}, setAttribute() {}, appendChild() {} };
    },
  };
  sandbox.dispatchEvent = (event) => {
    sink.events = sink.events || [];
    sink.events.push(event);
    return true;
  };
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  vm.createContext(sandbox);
  for (const file of LEGACY_SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  }
  return { sandbox, sink };
}

function buildWorkbook(corpus) {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(corpus.sheets)) {
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }
  return workbook;
}

function createFileLike(workbook) {
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return {
    name: 'reuma_corpus_synthetic.xlsx',
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

/**
 * Runs the legacy read surface against the synthetic corpus.
 * @param {object} options
 * @param {string} options.corpusFile repository-relative path to the corpus JSON
 * @returns {Promise<object>} characterization-ready read results
 */
export async function runReumaReadHarness(options) {
  const corpusFile = path.join(ROOT, options.corpusFile);
  const corpus = JSON.parse(fs.readFileSync(corpusFile, 'utf8'));
  const { sandbox, sink } = createLegacySandbox();

  const loadResult = await sandbox.HubTools.data.loadDatabase(createFileLike(buildWorkbook(corpus)));

  const reads = {
    loadResult,
    getAllPatients: sandbox.HubTools.data.getAllPatients(),
    findPatientById: {},
    getPatientHistory: {},
    loadProfessionalsData: sandbox.HubTools.data.loadProfessionalsData(),
    loadDrugsData: sandbox.HubTools.data.loadDrugsData(),
    unknownPatientLookup: sandbox.HubTools.data.findPatientById('SYN-UNKNOWN-999'),
  };
  const patientIds = options.patientIds || [];
  for (const id of patientIds) {
    reads.findPatientById[id] = sandbox.HubTools.data.findPatientById(id);
    reads.getPatientHistory[id] = sandbox.HubTools.data.getPatientHistory(id);
  }

  return {
    appState: {
      isLoaded: sandbox.appState.isLoaded,
      lastLoadedTime: sandbox.appState.lastLoadedTime,
      sheetKeys: sandbox.appState.db ? Object.keys(sandbox.appState.db).sort() : [],
    },
    reads,
    legacyLogs: sink.logs.map((l) => ({ level: l.level, message: l.message })),
  };
}
