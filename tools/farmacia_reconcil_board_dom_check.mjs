#!/usr/bin/env node
// tools/farmacia_reconcil_board_dom_check.mjs
// Issue #367 (N3 of train #364) — Enfermería board renders the reconciled
// request states with the existing card/badge patterns:
// - EN VIGILANCIA / BLOQUEADO visible as such (read-only, never recalculated),
//   including the reconciliation incident without becoming ready-to-cite;
// - OK FARMACIA + PENDING_FH stays pending with the supported Abrir validación;
// - READY_TO_CITE visible positive as "Listo para citar" WITHOUT Abrir validación;
// - DENIED_DO_NOT_CITE visible as denied/do-not-cite WITHOUT Abrir validación;
// - RECONCILIATION_CONFLICT visible as a non-actionable incident, never as
//   validated nor ready-to-cite;
// - same CIP with two solicitudes renders two independent cards;
// - nursing board and general tray keep not duplicating requests.

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
    if (selector === '[data-enf-solicitud]') return element.attributes && Object.hasOwn(element.attributes, 'data-enf-solicitud');
    return element.tagName === selector.toUpperCase();
  }

  function descendants(element) {
    return element.children.flatMap((child) => [child, ...descendants(child)]);
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

async function run() {
  assert(indexHtml.includes('id="enfermeriaBoard"'), 'HTML keeps the Enfermería tray mount');
  assert(indexHtml.indexOf('id="enfermeriaBoard"') < indexHtml.indexOf('id="pendingValidationBoard"'), 'Enfermería tray precedes the general tray');

  const { document, ids } = makeDom();

  const sandbox = {
    window: {
      document,
      localStorage: storage(),
      sessionStorage: storage(),
      location: { search: '', href: 'farmacia_index.html' },
      FarmaciaPrebiologico: { evaluatePatientPrebiologico: () => ({ overallStatus: 'unknown', blockers: [] }) }
    },
    document,
    console,
    URLSearchParams,
    CustomEvent: class { constructor(type) { this.type = type; } }
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(commonSource, sandbox, { filename: 'farmacia_common.js' });
  const F = sandbox.window.FarmaciaDemo;

  // Candidates built through the real import pipeline: v6 nursing requests
  // and Farmacia FH validation acts, reconciled exclusively by solicitud_id.
  const V6_MAP = { cip: 'cip_demo_o_hash', nombre: 'paciente_nombre', servicio: 'servicio_origen', patologia: 'patologia_indicacion', farmaco: 'farmaco_solicitado', fecha: 'fecha_alta' };
  const FH_MAP = { cip: 'cip_demo_o_hash', tipoActoFH: 'tipo_acto_fh', resultadoValidacion: 'resultado_validacion', estadoRegistro: 'estado_registro', solicitudId: 'solicitud_id' };

  function v6Nursing(cip, estado, sid, observacion) {
    return F.buildImportedPatientCandidate({
      cip_demo_o_hash: cip,
      paciente_nombre: 'Paciente ' + sid,
      servicio_origen: 'Dermatología',
      patologia_indicacion: 'Patología demo',
      farmaco_solicitado: 'Fármaco demo',
      fecha_alta: '2026-09-01',
      estado: estado,
      estado_prebiologico_enfermeria: estado,
      servicio_hoja: 'DERMATOLOGÍA',
      tipo_origen: 'enfermeria_v6_multisheet',
      solicitud_id: sid,
      observaciones_prebiologico: observacion || ''
    }, V6_MAP, 'Enfermería', 0);
  }
  function fhAct(cip, tipoActo, resultado, estadoRegistro, sid) {
    return F.buildImportedPatientCandidate({
      cip_demo_o_hash: cip,
      tipo_acto_fh: tipoActo,
      resultado_validacion: resultado,
      estado_registro: estadoRegistro,
      solicitud_id: sid,
      servicio_hoja: '01_DERMA'
    }, FH_MAP, 'Farmacia', 0);
  }

  const imported = [
    // Vigilancia / bloqueado read-only nursing states
    v6Nursing('CIP-VIG', 'EN VIGILANCIA', 'SOL-REU-000005'),
    v6Nursing('CIP-BLOQ', 'BLOQUEADO', 'SOL-DIG-000006'),
    // Incident: terminal FH validation with nursing no longer OK FARMACIA
    v6Nursing('CIP-VIG-INC', 'EN VIGILANCIA', 'SOL-REU-000008'),
    // OK FARMACIA pending (no acts) + explicit pending act
    v6Nursing('CIP-PEND1', 'OK FARMACIA', 'SOL-DER-000001'),
    v6Nursing('CIP-PEND2', 'OK FARMACIA', 'SOL-DER-000002'),
    // Resolved states
    v6Nursing('CIP-READY', 'OK FARMACIA', 'SOL-DER-000003'),
    v6Nursing('CIP-DENIED', 'OK FARMACIA', 'SOL-DER-000004'),
    v6Nursing('CIP-CONFLICT', 'OK FARMACIA', 'SOL-DER-000007'),
    // Same CIP, two independent solicitudes
    v6Nursing('CIP-SHARED', 'OK FARMACIA', 'SOL-DER-000008'),
    v6Nursing('CIP-SHARED', 'OK FARMACIA', 'SOL-DER-000009'),
    // Farmacia acts feeding the reconciliation
    fhAct('CIP-PEND2', 'validacion_inicial', 'pendiente', 'pendiente_revision', 'SOL-DER-000002'),
    fhAct('CIP-READY', 'validacion_inicial', 'validado', 'completado', 'SOL-DER-000003'),
    fhAct('CIP-DENIED', 'validacion_inicial', 'rechazado', 'completado', 'SOL-DER-000004'),
    fhAct('CIP-CONFLICT', 'validacion_inicial', 'validado', 'completado', 'SOL-DER-000007'),
    fhAct('CIP-CONFLICT', 'nueva_validacion_cambio', 'denegado', 'completado', 'SOL-DER-000007'),
    fhAct('CIP-SHARED', 'validacion_inicial', 'validado', 'completado', 'SOL-DER-000008'),
    fhAct('CIP-VIG-INC', 'validacion_inicial', 'validado', 'completado', 'SOL-REU-000008')
  ];
  sandbox.window.FarmaciaDataImports = { getImportedPatients: () => imported };

  vm.runInContext(indexSource, sandbox, { filename: 'farmacia_index.js' });
  document.dispatchEvent({ type: 'DOMContentLoaded' });

  const enfermeriaCards = ids.get('enfermeriaBoardCards');
  const cards = enfermeriaCards.querySelectorAll('[data-enf-solicitud]');
  const bySid = (sid) => cards.find((card) => card.attributes['data-enf-solicitud'] === sid);
  const generalCardsMount = ids.get('pendingValidationCards');
  const generalCards = generalCardsMount.querySelectorAll('.pending-validation-card');

  assert(cards.length === 10, 'Todas las solicitudes v6 (10) tienen tarjeta con identidad');
  assert(enfermeriaCards.textContent.includes('En vigilancia prebiológica (2)'), 'EN VIGILANCIA visible como grupo propio (2: sin terminal + incidencia)');
  assert(enfermeriaCards.textContent.includes('Bloqueados (1)'), 'BLOQUEADO visible como grupo propio');
  assert(enfermeriaCards.textContent.includes('Listos para validación (3)'), 'OK FARMACIA + PENDING_FH visible como pendiente de validación (3)');
  assert(enfermeriaCards.textContent.includes('Listo para citar (2)'), 'READY_TO_CITE group exact label (2)');
  assert(enfermeriaCards.textContent.includes('Validación denegada · No citar (1)'), 'DENIED_DO_NOT_CITE group exact label');
  assert(enfermeriaCards.textContent.includes('Conflicto de reconciliación (1)'), 'RECONCILIATION_CONFLICT group exact label');

  // PENDING_FH keeps the supported action
  assert(bySid('SOL-DER-000001').textContent.includes('Abrir validación'), 'PENDING_FH sin actos ofrece Abrir validación');
  assert(bySid('SOL-DER-000002').textContent.includes('Abrir validación'), 'PENDING_FH con acto pendiente ofrece Abrir validación');
  assert(bySid('SOL-DER-000009').textContent.includes('Abrir validación'), 'PENDING_FH (misma CIP, sin actos) ofrece Abrir validación');
  assert(enfermeriaCards.querySelectorAll('[data-enf-action="validar"]').length === 3, 'Solo PENDING_FH ofrece Abrir validación (3 tarjetas)');

  // READY_TO_CITE: positive badge, explicit details, NO pending open-validation action
  const readyCard = bySid('SOL-DER-000003');
  assert(readyCard.textContent.includes('Listo para citar'), 'READY_TO_CITE visible como Listo para citar');
  assert(readyCard.textContent.includes('Validación FH: validado'), 'READY_TO_CITE muestra el terminal explícito');
  assert(!readyCard.textContent.includes('Abrir validación'), 'READY_TO_CITE NO ofrece Abrir validación');
  assert(readyCard.querySelector('.status-badge').className.includes('status-badge--ok'), 'READY_TO_CITE usa badge verde positivo existente');

  // DENIED_DO_NOT_CITE
  const deniedCard = bySid('SOL-DER-000004');
  assert(deniedCard.textContent.includes('Validación denegada · No citar'), 'DENIED visible como denegada/no citar');
  assert(deniedCard.textContent.includes('Validación FH denegada · No citar · SOL-DER-000004'), 'DENIED muestra terminal y solicitud_id explícitos (alias rechazado → denegado)');
  assert(!deniedCard.textContent.includes('Abrir validación'), 'DENIED NO ofrece Abrir validación');

  // RECONCILIATION_CONFLICT: non-actionable, never validated/ready
  const conflictCard = bySid('SOL-DER-000007');
  assert(conflictCard.textContent.includes('Conflicto de reconciliación'), 'CONFLICT visible como incidencia/conflicto');
  assert(conflictCard.textContent.includes('Terminales incompatibles: validado + denegado'), 'CONFLICT muestra terminales incompatibles explícitos');
  assert(conflictCard.textContent.includes('No accionable'), 'CONFLICT marcado no accionable');
  assert(!conflictCard.textContent.includes('Listo para citar'), 'CONFLICT nunca se muestra como listo para citar');
  assert(!conflictCard.textContent.includes('Validación FH: validado ·'), 'CONFLICT nunca se muestra como validado simple');
  assert(!conflictCard.textContent.includes('Abrir validación'), 'CONFLICT NO ofrece Abrir validación');

  // Incident: EN VIGILANCIA keeps its read-only group, never ready-to-cite
  const incCard = bySid('SOL-REU-000008');
  assert(incCard.textContent.includes('En vigilancia'), 'Incidencia sigue visible como EN VIGILANCIA (estado Excel leído)');
  assert(incCard.textContent.includes('Incidencia de reconciliación'), 'Incidencia explicitada en la tarjeta');
  assert(incCard.textContent.includes('No accionable'), 'Incidencia no accionable');
  assert(!incCard.textContent.includes('Listo para citar'), 'Incidencia NUNCA se convierte en listo para citar');
  assert(!incCard.textContent.includes('Abrir validación'), 'Incidencia NO ofrece Abrir validación');

  // Surveillance and blocked keep their explicit detail actions
  assert(bySid('SOL-REU-000005').textContent.includes('Ver pendientes prebiológicos'), 'EN VIGILANCIA sin terminal mantiene su acción de detalle');
  assert(bySid('SOL-DIG-000006').textContent.includes('Ver bloqueantes'), 'BLOQUEADO mantiene su acción Ver bloqueantes');

  // Same CIP with two solicitudes: two independent cards, no collapse
  const sharedCards = cards.filter((card) => card.attributes['data-enf-cip'] === 'CIP-SHARED');
  assert(sharedCards.length === 2, 'Misma CIP con dos IDs → dos tarjetas independientes');
  assert(sharedCards.some((card) => card.attributes['data-enf-solicitud'] === 'SOL-DER-000008' && card.textContent.includes('Listo para citar')), 'ID A del mismo CIP resuelto');
  assert(sharedCards.some((card) => card.attributes['data-enf-solicitud'] === 'SOL-DER-000009' && card.textContent.includes('Abrir validación')), 'ID B del mismo CIP pendiente');
  const detailIds = ids.has('enfDetail_SOL-DER-000008') && ids.has('enfDetail_SOL-DER-000009');
  assert(detailIds, 'Paneles de detalle sin colisión de ids para la misma CIP');

  // General tray: no nursing duplication; Farmacia pending act still present
  assert(generalCards.length === 1 && generalCardsMount.textContent.includes('CIP-PEND2'), 'Bandeja general contiene el acto Farmacia pendiente explícito');
  assert(!generalCardsMount.textContent.includes('SOL-DER-'), 'Ninguna solicitud v6 duplicada en la bandeja general');

  // Counts consistency + rerender without duplication
  assert(ids.get('enfermeriaBoardCount').textContent === '10', 'Contador Enfermería = tarjetas visibles');
  const importListenerCount = document.listenerCount('farmacia:data-imported');
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  document.dispatchEvent({ type: 'farmacia:data-imported' });
  assert(ids.get('enfermeriaBoardCards').querySelectorAll('[data-enf-solicitud]').length === 10, 'Rerenders no duplican tarjetas');
  assert(document.listenerCount('farmacia:data-imported') === importListenerCount && importListenerCount === 1, 'Rerenders no duplican listeners');

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
