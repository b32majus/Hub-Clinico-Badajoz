#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_ID = 'fh-cima-contextless-selection-p0-20260730';
const ASSET_VERSION = '20260730-cima-contextless-p0';

const pages = {
  'farmacia_validacion.html': {
    asset: 'farmacia_validacion.js',
    buildId: 'fh-validation-manual-requested-clone-p0-20260730',
    assetVersion: '20260730-validation-manual-requested-clone-p0'
  },
  'farmacia_primera_visita.html': { asset: 'farmacia_primera_visita.js', buildId: BUILD_ID, assetVersion: ASSET_VERSION },
  'farmacia_seguimiento.html': { asset: 'farmacia_seguimiento.js', buildId: BUILD_ID, assetVersion: ASSET_VERSION }
};

const consumers = [
  { label: 'validation requested from patient', script: 'farmacia_validacion.js', fn: 'selectDrug', slot: 'validacion.solicitado', apply: 'byId(ids.farmaco).value =' },
  { label: 'validation requested manual', script: 'farmacia_validacion.js', fn: 'selectManualRequestedDrug', slot: 'validacion.solicitado', apply: 'farmacoEl.value =' },
  { label: 'validation validated', script: 'farmacia_validacion.js', fn: 'selectValidadoDrug', slot: 'validacion.validado', apply: 'farmacoEl.value =' },
  { label: 'first visit', script: 'farmacia_primera_visita.js', fn: 'selectDrugPV', slot: 'primera_visita.tratamiento', apply: 'setTreatmentForm(treatment);' },
  { label: 'follow-up primary', script: 'farmacia_seguimiento.js', fn: 'selectDrugSeg', slot: 'seguimiento.tratamiento', apply: "setSegValue('fhSegFarmaco'" },
  { label: 'follow-up related treatment', script: 'farmacia_seguimiento.js', fn: 'applyCatalogSelectionToOtherDrug', slot: 'seguimiento.relacionado:uid-syn-01', apply: 'existing[key] = reconciled.values[key]' }
];

const frozenHashes = {
  'previews/caceres-fh/farmacia_validacion.html': '2e89864286a4cebc23afdbc07e838c688d43ed4f5633b06a460eb231f9185136',
  'previews/caceres-fh/farmacia_primera_visita.html': '12def060940688a19dd6d696c2f402f69dc5c3d90017b9a53b7c67fa9f66129a',
  'previews/caceres-fh/farmacia_seguimiento.html': '9e5377b2e9097ad868a80d32020b97b872746c6615e65f02595fd9bc69d05505',
  'previews/caceres-fh/scripts/farmacia_common.js': '31cb54396f9a60f50b50d931bf772f7d8ed5326301f5a1df8a5d144ebca5ec93',
  'previews/caceres-fh/scripts/farmacia_validacion.js': 'c0a613cd70614f3ebb2e7766a2fb71efb66b88c6a49c217cedd9bafcbf51f6f0',
  'previews/caceres-fh/scripts/farmacia_primera_visita.js': 'fcd05123120b1e9c01937ac2add693da4bc9cf10af4f077efd93906498272014',
  'previews/caceres-fh/scripts/farmacia_seguimiento.js': '8bc2447903bee8ecbe80520423795fc4510ba3d19896437afd5d02703cdcb476'
};

const read = (relative) => readFile(path.join(ROOT, relative), 'utf8');
const sha256 = async (relative) => createHash('sha256').update(await readFile(path.join(ROOT, relative))).digest('hex');
function pass(number, message) { console.log(`ok ${number} - ${message}`); }

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} not found`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function storageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

async function catalogApi() {
  const sessionStorage = storageMock();
  const document = {
    addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return {}; }, documentElement: { style: {} }, body: { classList: { add() {}, remove() {} } }
  };
  const sandbox = { window: { localStorage: storageMock(), sessionStorage }, sessionStorage, document, location: { search: '' }, console };
  vm.createContext(sandbox);
  vm.runInContext(await read('scripts/farmacia_common.js'), sandbox);
  return sandbox.window.FarmaciaCatalog;
}

const productA = {
  drug_id: 'CIMA-SYN-A', source_type: 'CIMA', display_name: 'Producto sintético A', nombre_comercial: 'Producto sintético A',
  principio_activo: 'Molécula sintética A', nombre_presentacion: '100 mg jeringa', dosis: '100 mg', via: 'SC',
  codigo_nacional: '700001', nregistro: 'SYN/A'
};
const productB = {
  drug_id: 'CIMA-SYN-B', source_type: 'CIMA', display_name: 'Producto sintético B', nombre_comercial: 'Producto sintético B',
  principio_activo: 'Molécula sintética B', nombre_presentacion: '200 mg vial', dosis: '200 mg', via: 'IV',
  codigo_nacional: '700002', nregistro: 'SYN/B'
};
const clinical = {
  pauta: 'Pauta profesional', induccion: 'No indicada', status: 'pendiente profesional',
  fase_tratamiento: 'mantenimiento', estado_linea: 'pendiente profesional'
};

async function main() {
  for (const [page, release] of Object.entries(pages)) {
    const html = await read(page);
    assert.match(html, new RegExp(`<meta name="fh-build-id" content="${release.buildId}">`), `${page}: build ID`);
    assert.match(html, new RegExp(`scripts/farmacia_common\\.js\\?v=${ASSET_VERSION}`), `${page}: common version`);
    assert.match(html, new RegExp(`scripts/${release.asset.replace('.', '\\.')}\\?v=${release.assetVersion}`), `${page}: page version`);
  }
  pass(1, 'regional pages expose expected build IDs and load versioned common/page assets');

  const sources = Object.fromEntries(await Promise.all([...new Set(consumers.map((item) => item.script))].map(async (name) => [name, await read(`scripts/${name}`)])));
  for (const consumer of consumers) {
    const body = functionSource(sources[consumer.script], consumer.fn);
    const applyIndex = body.indexOf(consumer.apply);
    const persistIndex = body.indexOf('C.selectDrug');
    assert.ok(applyIndex >= 0, `${consumer.label}: visible apply missing`);
    assert.ok(persistIndex > applyIndex, `${consumer.label}: persistence must follow visible apply`);
    assert.match(body, /contextValid[\s\S]*getSnapshot/, `${consumer.label}: contextual snapshot read`);
    assert.match(body, /if \(contextValid[\s\S]*selectDrug/, `${consumer.label}: only persistence is context-gated`);
    assert.doesNotMatch(body, /if \(!contextValid\)\s*return/, `${consumer.label}: empty context must not block UI`);
  }
  pass(2, 'all six concrete consumers apply visible values before optional snapshot persistence');

  const followupSource = sources['farmacia_seguimiento.js'];
  assert.match(followupSource, /'CIP-DEMO-FH-002': \[\]/, 'known FH-002 must remain a canonical no-line patient');
  const visibilitySource = functionSource(followupSource, 'syncSegDrugAutocompleteVisibility');
  const visibilitySandbox = {
    currentBiologicLines: [],
    visible: null
  };
  visibilitySandbox.showSegDrugAutocomplete = () => { visibilitySandbox.visible = true; };
  visibilitySandbox.hideSegDrugAutocomplete = () => { visibilitySandbox.visible = false; };
  vm.createContext(visibilitySandbox);
  const syncVisibility = vm.runInContext(`(${visibilitySource})`, visibilitySandbox);
  for (const scenario of [
    { label: 'known FH-002 without canonical lines', lines: [], expected: true },
    { label: 'new patient without canonical lines', lines: [], expected: true },
    { label: 'empty/no-patient context', lines: [], expected: true },
    { label: 'patient with a canonical line', lines: [{ linea_id: 'BIO-SYN-L1' }], expected: false }
  ]) {
    visibilitySandbox.currentBiologicLines = scenario.lines;
    visibilitySandbox.visible = null;
    syncVisibility();
    assert.equal(visibilitySandbox.visible, scenario.expected, `${scenario.label}: principal autocomplete visibility`);
  }
  const searchCipSource = functionSource(followupSource, 'searchCIP');
  assert.match(searchCipSource, /syncBiologicControls\(patient\)[\s\S]*syncSegDrugAutocompleteVisibility\(\)/, 'known-patient search must sync visibility after canonical lines');
  assert.doesNotMatch(searchCipSource, /hideSegDrugAutocomplete\(\)/, 'known-patient search must not hide autocomplete unconditionally');
  assert.match(followupSource, /DOMContentLoaded[\s\S]*syncSegDrugAutocompleteVisibility\(\)/, 'initial context must use canonical-line visibility semantics');
  pass(3, 'follow-up principal autocomplete is visible without canonical lines and protected when canonical lines exist');

  const catalog = await catalogApi();
  for (const consumer of consumers) {
    for (const cip of ['CIP-DEMO-FH-002', 'CIP-SYN-NEW-01', '']) {
      const context = { slot: consumer.slot, cip };
      const events = [];
      const apply = (current, drug) => {
        const valid = Boolean(catalog.snapshotContextKey(context));
        const previous = valid ? catalog.getSnapshot(context) : null;
        const reconciled = catalog.reconcileCatalogSelection(current, previous, drug, context.slot);
        const visible = { ...reconciled.values };
        events.push('visible');
        if (valid) { catalog.selectDrug(drug, context, reconciled); events.push('persist'); }
        return visible;
      };
      const firstVisible = apply({ ...clinical }, productA);
      const rerendered = { ...firstVisible };
      const secondVisible = apply(rerendered, productB);
      assert.equal(firstVisible.farmaco_nombre, productA.display_name, `${consumer.label}/${cip || 'empty'}: first visible product`);
      assert.equal(secondVisible.farmaco_nombre, productB.display_name, `${consumer.label}/${cip || 'empty'}: second product after rerender`);
      for (const [field, value] of Object.entries(clinical)) assert.equal(secondVisible[field], value, `${consumer.label}: no inference into ${field}`);
      if (cip) {
        assert.ok(catalog.snapshotContextKey(context), `${consumer.label}/${cip}: valid key`);
        assert.equal(catalog.getSnapshot(context).selected_drug_id, productB.drug_id, `${consumer.label}/${cip}: second snapshot`);
        assert.deepEqual(events, ['visible', 'persist', 'visible', 'persist']);
      } else {
        assert.equal(catalog.snapshotContextKey(context), '', `${consumer.label}: empty key`);
        assert.equal(catalog.getSnapshot(context), null, `${consumer.label}: no empty-context snapshot`);
        assert.deepEqual(events, ['visible', 'visible']);
      }
    }
  }
  pass(4, 'known/new keys persist; empty keys keep UI; second product replaces only catalog fields without clinical inference');

  const validationSource = sources['farmacia_validacion.js'];
  const manualSelectionSource = functionSource(validationSource, 'selectManualRequestedDrug');
  assert.match(validationSource, /var manualRequestedTransientProposal = null;/, 'manual requested consumer owns private transient proposal state');
  assert.match(manualSelectionSource, /var contextualPrevious = contextValid[\s\S]*var previous = manualRequestedTransientProposal \|\| contextualPrevious;/, 'snapshot reads are valid-context-only and visible transient proposals have priority');
  assert.match(manualSelectionSource, /if \(contextValid && typeof C\.selectDrug[\s\S]*manualRequestedTransientProposal = \{/, 'valid selection persists and then retains transient proposals');
  assert.match(manualSelectionSource, /manualRequestedTransientProposal = \{[\s\S]*proposal_values: Object\.assign/, 'transient state is established from an explicit reconciled selection');
  let transientProposal = null;
  const applyEmptyManualSelection = (current, drug) => {
    const reconciled = catalog.reconcileCatalogSelection(current, transientProposal, drug, 'validacion.solicitado');
    transientProposal = { proposal_values: { ...reconciled.proposal_values } };
    return { ...reconciled.values };
  };
  const firstEmpty = applyEmptyManualSelection({}, productA);
  const secondEmpty = applyEmptyManualSelection(firstEmpty, productB);
  assert.equal(secondEmpty.dosis_texto, productB.dosis, 'empty CIP second product replaces still-proposed dose');
  assert.equal(secondEmpty.via, productB.via, 'empty CIP second product replaces still-proposed route');
  transientProposal = null;
  const firstBeforeProfessionalEdit = applyEmptyManualSelection({}, productA);
  const professionallyEdited = { ...firstBeforeProfessionalEdit, dosis_texto: '175 mg profesional', via: 'Oral' };
  const secondAfterProfessionalEdit = applyEmptyManualSelection(professionallyEdited, productB);
  assert.equal(secondAfterProfessionalEdit.dosis_texto, '175 mg profesional', 'empty CIP second product preserves professionally edited dose');
  assert.equal(secondAfterProfessionalEdit.via, 'Oral', 'empty CIP second product preserves professionally edited route');
  transientProposal = null;
  const emptyBeforeNewContext = applyEmptyManualSelection({}, productA);
  const newContext = { slot: 'validacion.solicitado', cip: 'CIP-SYN-TRANSIENT-01' };
  const contextualPrevious = catalog.getSnapshot(newContext);
  const reconciledNewContext = catalog.reconcileCatalogSelection(emptyBeforeNewContext, transientProposal || contextualPrevious, productB, newContext.slot);
  assert.equal(reconciledNewContext.values.dosis_texto, productB.dosis, 'new valid CIP without snapshot updates the transient catalog dose');
  assert.equal(reconciledNewContext.values.via, productB.via, 'new valid CIP without snapshot updates the transient catalog route');
  catalog.selectDrug(productB, newContext, reconciledNewContext);
  transientProposal = { proposal_values: { ...reconciledNewContext.proposal_values } };
  assert.equal(catalog.getSnapshot(newContext).selected_drug_id, productB.drug_id, 'new valid CIP persists the distinct explicit selection');
  assert.equal(transientProposal.proposal_values.dosis_texto, productB.dosis, 'valid-CIP persistence retains the latest visible proposal state');
  pass(5, 'manual empty-CIP transient proposals update catalog values and preserve professional edits');

  for (const [file, expected] of Object.entries(frozenHashes)) assert.equal(await sha256(file), expected, `${file}: frozen hash changed`);
  pass(6, 'frozen Cáceres HTML and affected script copies are byte-for-byte untouched');
  console.log('PASS: CIMA contextless-selection focal regression (6/6 groups, 6 consumers).');
}

main().catch((error) => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
