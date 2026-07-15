#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_index.js'), 'utf8');
const pvSource = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_primera_visita.js'), 'utf8');

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

function element(id, value = '') {
  const listeners = {};
  const classes = new Set();
  return {
    id,
    value,
    textContent: '',
    disabled: false,
    dataset: {},
    options: [],
    children: [],
    style: {},
    parentNode: { insertBefore() {} },
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => force === undefined ? (classes.has(name) ? !classes.delete(name) : !!classes.add(name)) : (force ? !!classes.add(name) : !classes.delete(name)),
      contains: (name) => classes.has(name)
    },
    addEventListener(type, listener) { listeners[type] = listener; },
    dispatch(type, event = {}) { return listeners[type]?.call(this, { preventDefault() {}, key: '', ...event }); },
    appendChild(child) { this.children.push(child); if (this.options && child.tagName === 'OPTION') this.options.push(child); return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); },
    setAttribute() {},
    closest() { return null; },
    focus() {},
    get firstChild() { return this.children[0] || null; },
    get selectedOptions() {
      const selected = this.options.find((option) => option.value === this.value);
      return selected ? [selected] : [];
    }
  };
}

function runIndex(patient = null) {
  const domReady = [];
  const alerts = [];
  const ids = {
    fhSearchBtn: element('fhSearchBtn'),
    fhCipInput: element('fhCipInput'),
    guidedCip: element('guidedCip'),
    guidedIntakePanel: element('guidedIntakePanel'),
    fhAltaServicio: element('fhAltaServicio'),
    fhAltaPatologia: element('fhAltaPatologia'),
    fhAltaPuntoEntrada: element('fhAltaPuntoEntrada'),
    fhAltaCancelar: element('fhAltaCancelar'),
    fhAltaAcceder: element('fhAltaAcceder'),
    pendingValidationBoard: element('pendingValidationBoard'),
    pendingValidationCards: element('pendingValidationCards'),
    pendingValidationEmpty: element('pendingValidationEmpty')
  };
  ids.fhAltaServicio.options = [
    { value: '', textContent: 'Seleccionar...' },
    { value: 'reumatologia', textContent: 'Reumatología' },
    { value: 'dermatologia', textContent: 'Dermatología' },
    { value: 'digestivo', textContent: 'Digestivo' }
  ];
  const location = { href: 'farmacia_index.html', search: '?entrada=derivacion' };
  const body = element('body');
  const document = {
    body,
    addEventListener(type, listener) { if (type === 'DOMContentLoaded') domReady.push(listener); },
    getElementById(id) { return ids[id] || (ids[id] = element(id)); },
    querySelector(selector) { return selector === 'main.main-content' ? element('main') : null; },
    querySelectorAll() { return []; },
    createElement(tag) { const el = element(tag); el.tagName = tag.toUpperCase(); return el; },
    createTextNode(text) { return { textContent: text }; }
  };
  const F = {
    patologiaPorServicio: { reumatologia: ['Artritis Reumatoide (AR)'], dermatologia: ['Psoriasis'], digestivo: ['Enfermedad de Crohn'] },
    populateSelect(select, values) {
      select.options = [{ value: '', textContent: 'Seleccionar...' }, ...values.map((value) => ({ value, textContent: value }))];
      select.value = '';
    },
    setText(id, value) { ids[id].textContent = value; },
    findPatientByCip() { return patient; },
    makeContextUrl(base, context) {
      const params = new URLSearchParams(Object.entries(context).filter(([, value]) => value));
      return `${base}?${params}`;
    },
    getQueryContext() { return {}; },
    getPendingValidationPatients() { return []; },
    getEnfermeriaVisiblePatients() { return []; },
    isEnfermeriaPatient() { return false; },
    createOverlayMount() { return { content: element('content'), title: element('title'), subtitle: element('subtitle'), open() {}, close() {} }; },
    clearChildren(target) { target.children = []; },
    createField() { return element('field'); },
    appendIconText() {},
    statusClass() { return ''; }
  };
  const sandbox = { window: { FarmaciaDemo: F, location, alert: (message) => alerts.push(message) }, document, URLSearchParams, console };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(indexSource, sandbox);
  domReady.forEach((listener) => listener());
  return { ids, alerts, location };
}

function navigateUnknown(destination, service = 'reumatologia', pathology = 'Artritis Reumatoide (AR)') {
  const harness = runIndex();
  harness.ids.fhCipInput.value = 'CIP-NUEVO-01';
  harness.ids.fhSearchBtn.dispatch('click');
  harness.ids.fhAltaServicio.value = service;
  harness.ids.fhAltaServicio.dispatch('change');
  harness.ids.fhAltaPatologia.value = pathology;
  harness.ids.fhAltaPuntoEntrada.value = destination;
  harness.ids.fhAltaAcceder.dispatch('click');
  return harness;
}

const pv = navigateUnknown('primera_visita');
const pvUrl = new URL(pv.location.href, 'http://local/');
assert(pvUrl.searchParams.get('cip') === 'CIP-NUEVO-01', 'Inicio -> Primera Visita transports typed CIP');
assert(pvUrl.searchParams.get('servicio') === 'Reumatología', 'Inicio -> Primera Visita transports canonical service label');
assert(pvUrl.searchParams.get('patologia') === 'Artritis Reumatoide (AR)', 'Inicio -> Primera Visita transports pathology');
assert(pvUrl.searchParams.get('entrada') === 'derivacion', 'Inicio preserves existing circuit/origin');
assert(pvUrl.searchParams.get('destino') === 'primera_visita', 'Inicio transports explicit destination');

const pvElements = {
  fhPvCip: element('fhPvCip'),
  fhPvServicio: element('fhPvServicio'),
  fhPvPatologia: element('fhPvPatologia'),
  fhPvPatologiaOtro: element('fhPvPatologiaOtro'),
  fhPvServicioOtro: element('fhPvServicioOtro'),
  fhPvTratamientoGrid: element('fhPvTratamientoGrid')
};
let pvPathologyValue = '';
Object.defineProperty(pvElements.fhPvPatologia, 'value', {
  get() { return pvPathologyValue; },
  set(value) {
    pvPathologyValue = this.options.some((option) => option.value === value) ? value : '';
  }
});
const pvReady = [];
const pvSandbox = {
  window: {
    FarmaciaDemo: {
      getQueryContext: () => ({ cip: 'CIP-NUEVO-01', servicio: 'Reumatología', patologia: 'Artritis Reumatoide (AR)', patient: null }),
      setValue(id, value) { if (pvElements[id]) pvElements[id].value = value || ''; },
      clearChildren(target) { target.children = []; target.options = []; },
      renderFields() {}, insertNoCipBanner() {}, findPatientByCip: () => null
    },
    FarmaciaCatalog: { clearSnapshot() {}, getSnapshot: () => null }
  },
  document: {
    addEventListener(type, listener) { if (type === 'DOMContentLoaded') pvReady.push(listener); },
    getElementById(id) { return pvElements[id] || null; },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement(tag) { const el = element(tag); el.tagName = tag.toUpperCase(); return el; },
    createTextNode: (text) => ({ textContent: text }),
    activeElement: null
  },
  console, module: { exports: {} }, exports: {}, setTimeout, clearTimeout
};
vm.createContext(pvSandbox);
vm.runInContext(pvSource, pvSandbox);
pvReady.forEach((listener) => listener());
assert(pvElements.fhPvCip.value === 'CIP-NUEVO-01', 'Primera Visita initializes CIP without patient residue');
assert(pvElements.fhPvServicio.value === 'Reumatología', 'Primera Visita initializes canonical service');
assert(pvElements.fhPvPatologia.value === 'Artritis Reumatoide (AR)', 'Primera Visita populates options before restoring pathology');

const seguimiento = navigateUnknown('seguimiento');
const segUrl = new URL(seguimiento.location.href, 'http://local/');
assert(segUrl.searchParams.get('servicio') === 'Reumatología' && segUrl.searchParams.get('patologia') === 'Artritis Reumatoide (AR)', 'Inicio -> Seguimiento transports receiver-compatible context');
assert(segUrl.searchParams.get('destino') === 'seguimiento', 'Seguimiento URL identifies destination');

const validacion = navigateUnknown('validacion', 'dermatologia', 'Psoriasis');
const valUrl = new URL(validacion.location.href, 'http://local/');
assert(valUrl.searchParams.get('servicio') === 'Dermatología' && valUrl.searchParams.get('patologia') === 'Psoriasis', 'Inicio -> Validación transports compatible context');
assert(!['farmaco', 'dosis', 'pauta', 'tratamiento'].some((key) => valUrl.searchParams.has(key)), 'Validación URL infers no treatment fields');

const incomplete = runIndex();
incomplete.ids.fhCipInput.value = 'CIP-PRESERVADO';
incomplete.ids.fhSearchBtn.dispatch('click');
incomplete.ids.fhAltaPuntoEntrada.value = 'primera_visita';
incomplete.ids.fhAltaAcceder.dispatch('click');
assert(incomplete.location.href === 'farmacia_index.html', 'Missing service/pathology blocks navigation');
assert(incomplete.alerts.length === 1, 'Incomplete context shows a clear warning');
assert(incomplete.ids.fhCipInput.value === 'CIP-PRESERVADO' && incomplete.ids.guidedCip.textContent === 'CIP-PRESERVADO', 'Blocked navigation preserves entered CIP');

const missingPathology = runIndex();
missingPathology.ids.fhCipInput.value = 'CIP-SIN-PATOLOGIA';
missingPathology.ids.fhSearchBtn.dispatch('click');
missingPathology.ids.fhAltaServicio.value = 'reumatologia';
missingPathology.ids.fhAltaServicio.dispatch('change');
missingPathology.ids.fhAltaPuntoEntrada.value = 'seguimiento';
missingPathology.ids.fhAltaAcceder.dispatch('click');
assert(missingPathology.location.href === 'farmacia_index.html', 'Missing pathology alone blocks navigation');
assert(missingPathology.ids.fhAltaServicio.value === 'reumatologia' && missingPathology.ids.fhAltaPatologia.value === '', 'Blocked navigation preserves selected service');

const existing = runIndex({ cip: 'CIP-EXISTENTE', nombre: 'Paciente demo', patologia: 'LES', servicio: 'Reumatología', estado: 'active', estadoLabel: 'Activo', ultimaVisita: '', edad: '', sexo: '', analitica: '', farmaco: '', dosis: '', pauta: '', scores: '', adherencia: '', efectosAdversos: '', proms: '' });
existing.ids.fhCipInput.value = 'CIP-EXISTENTE';
existing.ids.fhSearchBtn.dispatch('click');
assert(existing.location.href === 'farmacia_index.html' && existing.ids.guidedIntakePanel.classList.contains('hidden'), 'Existing patient path remains unchanged');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
