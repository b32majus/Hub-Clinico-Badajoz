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
      removeChild(child) { this.children = this.children.filter((item) => item !== child); unregister(child); },
      remove() { if (this.parentNode) this.parentNode.removeChild(this); },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === 'id') this.id = String(value);
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
  return { document, ids, element };
}

function cardCips(node) {
  return node.querySelectorAll('[data-enf-cip]').map((card) => card.attributes['data-enf-cip']);
}

function syntheticEnfermeria(cip, estado) {
  return {
    cip,
    nombre: `Paciente ${cip}`,
    servicio: 'Reumatología',
    patologia: 'AR',
    farmaco_solicitado: 'Fármaco sintético',
    importSource: 'Excel Enfermería',
    origen_solicitud: 'enfermeria',
    tipo_origen: 'enfermeria_inicio_biologico',
    source_type: 'ENFERMERIA',
    estado_prebiologico_enfermeria: estado,
    estado: estado,
    estadoLabel: estado,
    analitica_estado: 'OK',
    mantoux_estado: 'NEGATIVO',
    igra_estado: 'NO PRECISA',
    vhb_estado: 'NEGATIVO',
    vhc_estado: 'NEGATIVO',
    vih_estado: 'NEGATIVO',
    medicina_preventiva_estado: 'OK'
  };
}

async function run() {
  assert(indexHtml.includes('id="enfermeriaBoard"'), 'HTML provides a permanent Enfermería tray mount');
  assert(indexHtml.includes('Solicitudes generales pendientes de validación'), 'HTML names the general tray unambiguously');
  assert(!indexHtml.includes('class="pending-validation-grid" id="enfermeriaBoardCards"'), 'Enfermería cards mount is a neutral vertical-flow container');

  const { document, ids } = makeDom();
  const imported = [
    syntheticEnfermeria('ENF-OK', 'OK FARMACIA'),
    syntheticEnfermeria('ENF-VIG-1', 'EN VIGILANCIA'),
    syntheticEnfermeria('ENF-VIG-2', 'EN_VIGILANCIA'),
    syntheticEnfermeria('ENF-BLOQ', 'BLOQUEADO'),
    syntheticEnfermeria('ENF-UNKNOWN', 'PENDIENTE CONFIRMAR'),
    { cip: 'GENERAL-1', nombre: 'Solicitud general', servicio: 'Digestivo', patologia: 'EII', estado_solicitud_validacion: 'pendiente', importSource: 'Solicitud clínica' },
    { cip: 'HIST-1', nombre: 'Acto histórico', importSource: 'Excel Farmacia', resultado_validacion: 'validado', estado_registro: 'cerrado' }
  ];
  const sandbox = {
    window: {
      document,
      localStorage: storage(),
      sessionStorage: storage(),
      location: { search: '', href: 'farmacia_index.html' },
      FarmaciaDataSource: {
        ready: Promise.resolve(), getPersons: () => [], getActsByPatientId: () => [], getValidationsByPatientId: () => [],
        getTreatmentLinesByPatientId: () => [], getVisitsByPatientId: () => [], getFollowupsByPatientId: () => [], getAdverseEventsByPatientId: () => []
      },
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
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert(document.listenerCount('farmacia:data-imported') === 1, 'Initial render registers one data-import listener');

  const enfermeria = document.getElementById('enfermeriaBoard');
  const general = document.getElementById('pendingValidationBoard');
  const enfermeriaCards = ids.get('enfermeriaBoardCards');
  const generalCardsMount = ids.get('pendingValidationCards');
  const enfCards = cardCips(enfermeriaCards);
  const generalCards = generalCardsMount.querySelectorAll('.pending-validation-card');
  const validationActions = enfermeriaCards.querySelectorAll('[data-enf-action="validar"]');
  const unknownCard = enfermeriaCards.querySelectorAll('[data-enf-cip]').find((card) => card.attributes['data-enf-cip'] === 'ENF-UNKNOWN');

  assert(enfCards.length === 5, 'All explicit Enfermería records are visible');
  assert(enfCards.includes('ENF-VIG-1') && enfCards.includes('ENF-VIG-2') && enfCards.includes('ENF-BLOQ'), 'Vigilance and blocked records remain visible');
  assert(enfermeriaCards.textContent.includes('Listos para validación (1)') && enfermeriaCards.textContent.includes('En vigilancia prebiológica (2)') && enfermeriaCards.textContent.includes('Bloqueados (1)'), 'Enfermería subgroup counts match the 1/2/1 fixture');
  assert(enfermeriaCards.textContent.includes('Estado pendiente de clasificación'), 'Unknown Enfermería status has a neutral classification');
  assert(unknownCard && unknownCard.textContent.includes('Ver detalle') && !unknownCard.textContent.includes('Ver pendientes prebiológicos'), 'Unknown Enfermería status uses the neutral detail action');
  const unknownDetailButton = unknownCard && unknownCard.querySelectorAll('button')[0];
  if (unknownDetailButton) unknownDetailButton.dispatchEvent({ type: 'click' });
  assert(unknownDetailButton && unknownDetailButton.textContent.includes('Ocultar detalle'), 'Unknown Enfermería detail action has a neutral open label');
  assert(validationActions.length === 1, 'Only OK FARMACIA offers Abrir validación');
  assert(generalCards.length === 1 && generalCardsMount.textContent.includes('GENERAL-1'), 'General tray contains only non-Enfermería pending requests');
  assert(!generalCardsMount.textContent.includes('ENF-OK'), 'No Enfermería CIP is duplicated in the general tray');
  assert(ids.get('enfermeriaBoardCount').textContent === '5', 'Enfermería counter matches visible cards');
  assert(ids.get('pendingValidationBoardCount').textContent === '1', 'General counter matches visible cards');

  imported.splice(0, imported.length);
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  assert(document.getElementById('enfermeriaBoard'), 'Enfermería tray remains visible when empty');
  assert(document.getElementById('enfermeriaBoardEmpty').textContent === 'No hay solicitudes de Enfermería / Inicio biológico.', 'Enfermería empty state is explicit');
  assert(ids.get('pendingValidationEmpty').textContent === 'No hay solicitudes generales pendientes de validación.', 'General empty state is explicit');
  assert(document.querySelectorAll('#enfermeriaBoard').length === 1 && document.querySelectorAll('#pendingValidationBoard').length === 1, 'Consecutive rerenders do not duplicate sections');
  assert(document.getElementById('enfermeriaBoardCards').children.length === 0 && ids.get('pendingValidationCards').children.length === 0, 'Consecutive rerenders do not duplicate cards');
  assert(document.listenerCount('farmacia:data-imported') === 1, 'Consecutive rerenders do not duplicate data-import listeners');

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
