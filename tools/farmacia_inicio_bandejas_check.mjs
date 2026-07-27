#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'farmacia_index.html'), 'utf8');
const commonSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_common.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_index.js'), 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
  }
}

function storage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function makeDom() {
  const ids = new Map();
  const documentListeners = new Map();

  function classes(element) {
    return String(element.className || '').split(/\s+/).filter(Boolean);
  }

  function matches(element, selector) {
    if (!element) return false;
    if (selector.startsWith('#')) return element.id === selector.slice(1);
    if (selector.startsWith('.')) return classes(element).includes(selector.slice(1));
    if (selector === '[data-enf-action="validar"]') return element.attributes && element.attributes['data-enf-action'] === 'validar';
    if (selector === '[data-enf-cip]') return element.attributes && Object.hasOwn(element.attributes, 'data-enf-cip');
    return element.tagName === selector.toUpperCase();
  }

  function descendants(element) {
    return element.children.flatMap((child) => [child, ...descendants(child)]);
  }

  function unregister(element) {
    if (element.id && ids.get(element.id) === element) ids.delete(element.id);
    element.children.forEach(unregister);
  }

  function element(tagName) {
    const listeners = new Map();
    const classSet = new Set();
    const value = {
      tagName: tagName.toUpperCase(),
      children: [],
      parentNode: null,
      attributes: {},
      dataset: {},
      style: {},
      _textContent: '',
      className: '',
      value: '',
      options: [],
      disabled: false,
      type: '',
      href: '',
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      append(...children) { children.forEach((child) => this.appendChild(child)); },
      insertBefore(child, before) {
        child.parentNode = this;
        const index = this.children.indexOf(before);
        this.children.splice(index < 0 ? this.children.length : index, 0, child);
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((item) => item !== child);
        unregister(child);
      },
      remove() { if (this.parentNode) this.parentNode.removeChild(this); },
      setAttribute(name, attributeValue) {
        this.attributes[name] = String(attributeValue);
        if (name === 'id') this.id = String(attributeValue);
      },
      addEventListener(type, listener) {
        const handlers = listeners.get(type) || [];
        handlers.push(listener);
        listeners.set(type, handlers);
      },
      dispatchEvent(event) { (listeners.get(event.type) || []).forEach((listener) => listener.call(this, event)); },
      querySelector(selector) { return descendants(this).find((child) => matches(child, selector)) || null; },
      querySelectorAll(selector) { return descendants(this).filter((child) => matches(child, selector)); },
      closest() { return null; },
      focus() {},
      classList: {
        add(...names) { names.forEach((name) => classSet.add(name)); value.className = [...classSet].join(' '); },
        remove(...names) { names.forEach((name) => classSet.delete(name)); value.className = [...classSet].join(' '); },
        contains(name) { return classSet.has(name) || classes(value).includes(name); },
        toggle(name, force) {
          const enabled = force === undefined ? !this.contains(name) : force;
          if (enabled) this.add(name); else this.remove(name);
          return enabled;
        }
      }
    };
    Object.defineProperty(value, 'id', {
      get() { return value.attributes.id || ''; },
      set(id) { value.attributes.id = id; ids.set(id, value); }
    });
    Object.defineProperty(value, 'textContent', {
      get() { return value._textContent + value.children.map((child) => child.textContent || '').join(''); },
      set(text) { value._textContent = String(text); value.children = []; }
    });
    Object.defineProperty(value, 'firstChild', { get() { return value.children[0] || null; } });
    return value;
  }

  const body = element('body');
  const main = element('main');
  body.appendChild(main);
  const document = {
    body,
    head: element('head'),
    documentElement: element('html'),
    createElement: element,
    createTextNode(text) { return { tagName: '#TEXT', textContent: String(text), children: [], parentNode: null }; },
    getElementById(id) { return ids.get(id) || null; },
    querySelector(selector) { return selector === 'main.main-content' ? main : body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    addEventListener(type, listener) {
      const handlers = documentListeners.get(type) || [];
      handlers.push(listener);
      documentListeners.set(type, handlers);
    },
    dispatchEvent(event) { (documentListeners.get(event.type) || []).forEach((listener) => listener(event)); },
    listenerCount(type) { return (documentListeners.get(type) || []).length; }
  };

  function mount(id, tagName = 'div') {
    const node = element(tagName);
    node.id = id;
    main.appendChild(node);
    return node;
  }

  ['fhSearchBtn', 'fhCipInput', 'guidedCip', 'guidedIntakePanel', 'fhAltaServicio', 'fhAltaPatologia', 'fhAltaPuntoEntrada', 'fhAltaCancelar', 'fhAltaAcceder'].forEach((id) => mount(id, 'button'));
  mount('enfermeriaBoard', 'section');
  mount('enfermeriaBoardCount', 'span');
  const enfermeriaEmpty = mount('enfermeriaBoardEmpty', 'p');
  enfermeriaEmpty.textContent = 'No hay solicitudes de Enfermería / Inicio biológico.';
  enfermeriaEmpty.classList.add('hidden');
  mount('enfermeriaBoardCards', 'div');
  mount('pendingValidationBoard', 'section');
  mount('pendingValidationBoardCount', 'span');
  const pendingEmpty = mount('pendingValidationEmpty', 'p');
  pendingEmpty.textContent = 'No hay solicitudes generales pendientes de validación.';
  pendingEmpty.classList.add('hidden');
  mount('pendingValidationCards', 'div');
  return { document, ids };
}

function syntheticEnfermeria(cip, estado, includeExplicitState = true) {
  const patient = {
    cip,
    nombre: `Paciente ${cip}`,
    servicio: 'Reumatología',
    patologia: 'AR',
    farmaco_solicitado: 'Fármaco sintético',
    importSource: 'Excel Enfermería',
    origen_solicitud: 'enfermeria',
    tipo_origen: 'enfermeria_inicio_biologico',
    source_type: 'ENFERMERIA',
    estado,
    estadoLabel: estado || 'Sin estado',
    analitica_estado: 'OK',
    mantoux_estado: 'NEGATIVO',
    igra_estado: 'NO PRECISA',
    vhb_estado: 'NEGATIVO',
    vhc_estado: 'NEGATIVO',
    vih_estado: 'NEGATIVO',
    medicina_preventiva_estado: 'OK'
  };
  if (includeExplicitState) patient.estado_prebiologico_enfermeria = estado;
  return patient;
}

async function run() {
  assert(indexHtml.includes('id="enfermeriaBoard"'), 'HTML provides a permanent Enfermería tray mount');
  assert(indexHtml.indexOf('id="enfermeriaBoard"') < indexHtml.indexOf('id="pendingValidationBoard"'), 'Enfermería tray precedes the general tray');
  assert(indexHtml.includes('Solicitudes generales pendientes de validación'), 'HTML names the general tray unambiguously');
  assert(!indexHtml.includes('class="pending-validation-grid" id="enfermeriaBoardCards"'), 'Enfermería mount supports grouped card grids');

  const { document, ids } = makeDom();
  const imported = [
    syntheticEnfermeria('ENF-OK', 'OK_FARMACIA'),
    syntheticEnfermeria('ENF-VIG', 'EN_VIGILANCIA'),
    syntheticEnfermeria('ENF-BLOQ', 'BLOQUEADO'),
    syntheticEnfermeria('ENF-OTHER', 'PENDIENTE_CONFIRMAR'),
    syntheticEnfermeria('ENF-UNKNOWN', 'UNKNOWN'),
    syntheticEnfermeria('ENF-EMPTY', ''),
    syntheticEnfermeria('ENF-MISSING', '', false),
    { cip: 'GENERAL-1', nombre: 'Solicitud general', servicio: 'Digestivo', patologia: 'EII', estado_solicitud_validacion: 'pendiente', importSource: 'Solicitud clínica' },
    { cip: 'HIST-1', nombre: 'Acto histórico', importSource: 'Excel Farmacia', resultado_validacion: 'validado', estado_registro: 'cerrado' }
  ];
  const sandbox = {
    window: {
      document,
      localStorage: storage(),
      sessionStorage: storage(),
      location: { search: '', href: 'farmacia_index.html' },
      FarmaciaPrebiologico: { evaluatePatientPrebiologico: () => ({ overallStatus: 'unknown', blockers: [] }) },
      FarmaciaDataImports: { getImportedPatients: () => imported }
    },
    document,
    console,
    URLSearchParams,
    CustomEvent: class { constructor(type) { this.type = type; } }
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(commonSource, sandbox, { filename: 'farmacia_common.js' });
  sandbox.window.FarmaciaDataImports.getImportedPatients = () => imported;
  vm.runInContext(indexSource, sandbox, { filename: 'farmacia_index.js' });
  document.dispatchEvent({ type: 'DOMContentLoaded' });

  const enfermeriaCards = ids.get('enfermeriaBoardCards');
  const generalCardsMount = ids.get('pendingValidationCards');
  const nursingCards = enfermeriaCards.querySelectorAll('[data-enf-cip]');
  const byCip = (cip) => nursingCards.find((card) => card.attributes['data-enf-cip'] === cip);
  const generalCards = generalCardsMount.querySelectorAll('.pending-validation-card');

  assert(nursingCards.length === 7, 'All Nursing records are visible, including unclassified states');
  assert(enfermeriaCards.textContent.includes('Listos para validación (1)'), 'OK_FARMACIA has the exact ready category');
  assert(enfermeriaCards.textContent.includes('En vigilancia prebiológica (1)'), 'EN_VIGILANCIA has the exact vigilance category');
  assert(enfermeriaCards.textContent.includes('Bloqueados (1)'), 'BLOQUEADO has the exact blocked category');
  assert(enfermeriaCards.textContent.includes('Estado pendiente de clasificación (4)'), 'Other, unknown, empty, and missing states are neutral');
  assert(byCip('ENF-OK').textContent.includes('Abrir validación'), 'OK_FARMACIA offers Abrir validación');
  assert(enfermeriaCards.querySelectorAll('[data-enf-action="validar"]').length === 1, 'Only OK_FARMACIA offers Abrir validación');
  assert(byCip('ENF-VIG').textContent.includes('Ver pendientes prebiológicos'), 'EN_VIGILANCIA offers its exact action');
  assert(byCip('ENF-BLOQ').textContent.includes('Ver bloqueantes'), 'BLOQUEADO offers its exact action');
  for (const cip of ['ENF-OTHER', 'ENF-UNKNOWN', 'ENF-EMPTY', 'ENF-MISSING']) {
    const card = byCip(cip);
    assert(card.textContent.includes('Estado pendiente de clasificación') && card.textContent.includes('Ver detalle') && !card.textContent.includes('Ver pendientes prebiológicos'), `${cip} uses only the neutral classification and action`);
  }
  assert(generalCards.length === 1 && generalCardsMount.textContent.includes('GENERAL-1'), 'General tray contains only non-Nursing pending requests');
  assert(!generalCardsMount.textContent.includes('ENF-'), 'No Nursing CIP is duplicated in the general tray');
  assert(ids.get('enfermeriaBoardCount').textContent === String(nursingCards.length), 'Nursing count equals visible cards');
  assert(ids.get('pendingValidationBoardCount').textContent === String(generalCards.length), 'General count equals visible cards');

  const importListenerCount = document.listenerCount('farmacia:data-imported');
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  assert(document.querySelectorAll('#enfermeriaBoard').length === 1 && document.querySelectorAll('#pendingValidationBoard').length === 1, 'Consecutive rerenders do not duplicate sections');
  assert(ids.get('enfermeriaBoardCards').querySelectorAll('[data-enf-cip]').length === 7 && ids.get('pendingValidationCards').querySelectorAll('.pending-validation-card').length === 1, 'Consecutive rerenders do not duplicate cards');
  assert(document.listenerCount('farmacia:data-imported') === importListenerCount && importListenerCount === 1, 'Consecutive rerenders do not duplicate import listeners');

  imported.splice(0, imported.length);
  sandbox.window.FarmaciaDemo.getEnfermeriaVisiblePatients = () => [];
  sandbox.window.FarmaciaDemo.getPendingValidationPatients = () => [];
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  assert(ids.get('enfermeriaBoardCount').textContent === '0' && ids.get('enfermeriaBoardCards').children.length === 0, 'Empty Nursing tray has zero count and zero cards');
  assert(!ids.get('enfermeriaBoardEmpty').classList.contains('hidden') && ids.get('enfermeriaBoardEmpty').textContent === 'No hay solicitudes de Enfermería / Inicio biológico.', 'Nursing empty state is explicit');
  assert(ids.get('pendingValidationBoardCount').textContent === '0' && ids.get('pendingValidationCards').children.length === 0, 'Empty general tray has zero count and zero cards');
  assert(!ids.get('pendingValidationEmpty').classList.contains('hidden') && ids.get('pendingValidationEmpty').textContent === 'No hay solicitudes generales pendientes de validación.', 'General empty state is explicit');

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
