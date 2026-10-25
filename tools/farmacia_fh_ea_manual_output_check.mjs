#!/usr/bin/env node
// tools/farmacia_fh_ea_manual_output_check.mjs
// FH-EA-MANUAL-01 — proyección EA 0..N en las DOS salidas manuales de
// Seguimiento: TXT JARA (un informe por visita) y Excel WO8 manual (una fila
// por fármaco efectivamente DISPENSADO). Invoca los constructores reales
// (`buildSegLines`, `buildFollowupExcelRows`, `buildFollowupCsv`) sobre el
// acto en edición; nada se simula con datos inyectados en el HTML.
//
// Casos (WO FH-EA-MANUAL-01, QA A..I):
//   A  2 EA incorporados × 2 líneas dispensadas: RED en BASE (guardia
//      singular), GREEN esperado: TXT una visita con 2 EA exactamente una vez
//      cada uno y Excel exactamente 2 filas.
//   B  matrices dispensadas×EA 1×0, 1×1, 2×2, 2×4, 3×5 sin truncar; 0
//      dispensaciones no produce filas; los borradores nunca se proyectan.
//   C  distribución común/específica según asociaciones explícitas y vigentes
//      (`line:<linea_id>`), con conservación del vínculo externo explícito.
//   D  la zona COMÚN se repite con la MISMA identidad EA; no crea un EA nuevo.
//   E  ninguna causalidad inferida: los editores G0 provisionales no se
//      exportan como evaluación formal.
//   F  fail-closed ante una asociación no verificable, sin tocar el portapapeles.
//   G  regresión legacy sin EA y guardias de presencia/contradicción.
//   H  WO8_COLUMNS intacto (62 columnas, mismo orden) y una fila por dispensación.
//   I  CSV y Export V2 conservan su frontera anterior.
// Datos solo sintéticos. Ejecutar: node tools/farmacia_fh_ea_manual_output_check.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

let passed = 0;
let failed = 0;
const errors = [];
function check(value, label) {
  if (value) { console.log(`  ✓ ${label}`); passed += 1; }
  else { console.log(`  ✗ ${label}`); failed += 1; errors.push(label); }
}

/* ─── Arnés DOM mínimo (solo lo que el acto en edición necesita) ─────────── */

class ClassList {
  constructor(value = '') { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) { const next = force === undefined ? !this.contains(value) : force; next ? this.add(value) : this.remove(value); return next; }
}

class Node {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.value = ''; this.textContent = ''; this.checked = false; this.disabled = false; this.readOnly = false;
    this.children = []; this.options = []; this.attributes = {}; this.dataset = {};
    this.classList = new ClassList(); this.listeners = {}; this.style = {};
  }
  set className(value) { this._className = value; this.classList = new ClassList(value); }
  get className() { return this._className || ''; }
  get selectedIndex() { const found = this.options.findIndex((item) => item.value === this.value); return found < 0 ? 0 : found; }
  appendChild(child) { this.children.push(child); if (this.tagName === 'SELECT') this.options.push(child); return child; }
  removeChild(child) { this.children = this.children.filter((item) => item !== child); this.options = this.options.filter((item) => item !== child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) { event.target = this; (this.listeners[event.type] || []).forEach((fn) => fn.call(this, event)); }
  closest(selector) { if (selector !== '.form-group') return null; return (this.formGroup ||= new Node()); }
  querySelector(selector) { return selector === '.causality-chip--active' ? this.children.find((child) => child.classList.contains('causality-chip--active')) || null : null; }
  querySelectorAll(selector) { return selector === '.causality-chip' ? this.children : []; }
}

const nodes = new Map();
const node = (id, tag = 'div') => { if (!nodes.has(id)) nodes.set(id, new Node(tag)); return nodes.get(id); };

[
  'fhSegLineaPrincipal', 'fhSegDispensado', 'fhSegTipoRelacionTerapia', 'fhSegOptimiza', 'fhSegNuevaPauta',
  'fhSegMotivoOpt', 'fhSegSuspension', 'fhSegMotivoSusp', 'fhSegVia', 'fhSegPautaActual', 'fhSegProms',
  'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto', 'fhSeguimientoEaCorregido',
  'fhSeguimientoEaFarmacoSospechoso', 'fhCausalidadFinal', 'fhSegServicio', 'fhSegPatologia'
].forEach((id) => node(id, 'select'));

[
  'fhSegNuevaDosis', 'fhSegNuevaPautaOtro', 'fhSegObservacionesLinea', 'fhSegEstadoLinea', 'fhSegLineCards',
  'fhSegTratamientoGrid', 'fhSegMoriskyResultado', 'fhSegLineEditorHelp', 'fhSegExportTxt', 'fhSegExportCsv',
  'fhSegExcelExportBtn', 'fhSegDispenseExportNotice', 'fhSegFarmaco', 'fhSegPrincipioActivo', 'fhSegPresentacion',
  'fhSegDosisActual', 'fhSegFechaInicio', 'fhSegCimaContextPrincipioActivo', 'fhSegCodigoNacional', 'fhSegNregistro',
  'fhSegEtiquetas', 'fhSegOrigenCatalogo', 'fhSegCip', 'fhSegFecha', 'currentProfessional',
  'fhSeguimientoEaObservaciones', 'fhSeguimientoEaSuspectCandidates', 'fhSeguimientoEaFarmacoRow',
  'fhSeguimientoEaGravedadRow', 'fhSeguimientoEaResueltoRow', 'fhSeguimientoEaCorregidoRow',
  'fhSeguimientoEaObservacionesRow', 'fhSeguimientoEaNoCausalidad', 'fhSeguimientoEaActivationNotice',
  'naranjoScore', 'naranjoCategoria', 'klCategoria', 'resumenNaranjo', 'resumenKl', 'modSeguimientoCausalidad',
  'modNaranjo', 'modKarchLasagna', 'modResumenCausalidad', 'segOtrosFarmacosList', 'segOtrosFarmacosEmpty',
  'modSeguimientoEa', 'fhSegEaZone', 'fhSegEaList', 'fhSegEaEmpty', 'fhSegEaCountBadge', 'fhSegEaSummary',
  'fhSegEaContradictionNotice', 'fhSegEaExportGuardNotice', 'fhSegExportV2Btn', 'fhSegExportV2Status',
  'fhSegDlqiTotal', 'fhSegPromsExpanded', 'fhSeguimientoEaFarmacoRow'
].forEach((id) => node(id));

node('fhSeguimientoEaPresente').value = 'no_consta';
node('fhSeguimientoEaResuelto').value = 'no_consta';
node('fhSeguimientoEaCorregido').value = 'no_consta';
node('fhCausalidadFinal').value = 'No evaluada';
node('fhSegServicio').value = 'Reumatología';
node('fhSegPatologia').value = 'LES';
node('fhSegCip').value = 'CIP-FH-EA-MANUAL-01';
node('currentProfessional').textContent = 'FH Sintética';
node('naranjoScore').textContent = '—';
node('naranjoCategoria').textContent = 'No evaluado';
node('klCategoria').textContent = 'No evaluado';
node('fhSegDlqiTotal').textContent = '—';

[['fhSegTipoRelacionTerapia', 'sin_cambios'], ['fhSegOptimiza', 'No'], ['fhSegSuspension', 'No'],
 ['fhSegObservacionesLinea', ''], ['fhSegNuevaDosis', ''], ['fhSegNuevaPauta', ''], ['fhSegNuevaPautaOtro', ''],
 ['fhSegMotivoOpt', 'No aplica'], ['fhSegMotivoSusp', 'No aplica'], ['fhSegVia', ''], ['fhSegProms', 'No']]
  .forEach(([id, value]) => { node(id).value = value; });

const groups = new Map();
[...Array(10)].map((_, i) => `naranjoQ${i + 1}`)
  .concat(['klTemporal', 'klConocido', 'klAlternativa', 'klSuspendido', 'klMejoraRetirada', 'klReadministracion', 'klReaparece'])
  .forEach((id) => {
    const group = new Node(); group.setAttribute('data-answer-id', id);
    const values = id.startsWith('naranjo') ? ['si', 'no', 'desconocido'] : ['si', 'no', 'no_se_sabe', 'no_aplica'];
    values.forEach((value) => {
      const chip = new Node('button');
      chip.classList.add('causality-chip');
      chip.setAttribute('data-value', value);
      if (value === (id.startsWith('naranjo') ? 'desconocido' : 'no_se_sabe')) chip.classList.add('causality-chip--active');
      group.appendChild(chip);
    });
    groups.set(id, group);
  });

const descendants = (item) => [item, ...(item.children || []).flatMap(descendants)];
const rendered = () => [...nodes.values()].flatMap(descendants);

const document = {
  addEventListener() {},
  createElement: (tag) => new Node(tag),
  createTextNode: (text) => ({ textContent: text }),
  getElementById: (id) => nodes.get(id) || null,
  querySelector(selector) {
    const answer = selector.match(/data-answer-id="([^"]+)"/)?.[1];
    if (answer) return groups.get(answer) || null;
    const uid = selector.match(/data-uid="([^"]+)"/)?.[1];
    const field = selector.match(/data-field="([^"]+)"/)?.[1];
    if (!uid && !field) return null;
    return rendered().find((item) => (!uid || item.getAttribute?.('data-uid') === uid) && (!field || item.getAttribute?.('data-field') === field)) || null;
  },
  querySelectorAll(selector) {
    if (selector.includes('data-answer-id^="naranjo"')) return [...groups.entries()].filter(([id]) => id.startsWith('naranjo')).map(([, group]) => group);
    if (selector.includes('data-answer-id^="kl"')) return [...groups.entries()].filter(([id]) => id.startsWith('kl')).map(([, group]) => group);
    if (selector === '.causality-chip-group .causality-chip') return [...groups.values()].flatMap((group) => group.children);
    return [];
  }
};

// Espía del portapapeles/descargas: prueba negativa de "no copia parcial".
const clipboardWrites = [];
const F = {
  getQueryContext: () => ({}),
  insertNoCipBanner() {},
  clearChildren(el) { if (el) { el.children = []; el.options = []; } },
  setText(id, value) { node(id).textContent = value || ''; },
  setValue(id, value) { const el = nodes.get(id); if (el) el.value = value || ''; },
  renderFields() {},
  copyTextToClipboard(text) { clipboardWrites.push(String(text)); return true; },
  downloadFile() { clipboardWrites.push('__DOWNLOAD__'); },
  makeContextUrl() { return '#'; },
  showToast() {}
};

const sandbox = {
  window: { FarmaciaDemo: F, confirm: () => true },
  document,
  console,
  Event: function Event(type) { this.type = type; },
  setTimeout, clearTimeout,
  navigator: { clipboard: { writeText: (text) => { clipboardWrites.push(String(text)); return Promise.resolve(); } } }
};
vm.createContext(sandbox);
['scripts/farmacia_pautas_catalog.js', 'scripts/farmacia_excel_row_export.js', 'scripts/farmacia_seguimiento.js']
  .forEach((file) => vm.runInContext(read(file), sandbox));

const api = sandbox.window.FarmaciaSeguimiento;
const exp = sandbox.window.FarmaciaExcelRowExport;
const columns = exp.WO8_COLUMNS;
const at = (row, name) => row[columns.indexOf(name)];

/* ─── Utilidades de lectura de celdas G rotuladas ────────────────────────── */

// El contrato de celda es: fragmentos separados por " | ", cada uno
// "<ÁMBITO>: <contenido>", con \ y | escapados dentro del contenido.
const FRAGMENT_SEPARATOR = /(?<!\\) \| /;
function fragments(cell) {
  const text = String(cell == null ? '' : cell);
  if (!text) return [];
  return text.split(FRAGMENT_SEPARATOR).map((fragment) => {
    const index = fragment.indexOf(': ');
    if (index < 0) return { scope: '', content: unescapeContent(fragment) };
    return { scope: fragment.slice(0, index), content: unescapeContent(fragment.slice(index + 2)) };
  });
}
function unescapeContent(value) { return String(value).replace(/\\([\\|])/g, '$1'); }
// Contenidos de los fragmentos de un ámbito, en el orden del contrato: un
// fragmento por EA. Nunca agrupa, porque la alineación 1:1 entre las celdas G
// es lo que hace rastreable cada EA.
function fragmentContents(cell, scope) {
  return fragments(cell).filter((fragment) => fragment.scope === scope).map((fragment) => fragment.content);
}
function hasScopeContent(cell, scope, needle) {
  return fragmentContents(cell, scope).some((content) => content.includes(needle));
}
function scopesOf(cell) { return fragments(cell).map((fragment) => fragment.scope); }

/* ─── Acto sintético: 3 líneas activas ───────────────────────────────────── */

function buildVisit({ patientCip, dispense }) {
  api.setActivePatientCip(patientCip);
  node('fhSegCip').value = patientCip;
  api.syncLinesForPatient({
    cip: patientCip,
    servicio: 'Reumatología',
    patologia: 'LES',
    biologicos: [
      { linea_id: 'LINE-A', nombre_comercial: 'Demo Uno', principio_activo: 'principio A', dosis: '10 mg', via: 'SC', pauta_codigo: 'DIARIA', pauta_label: 'Diaria', estado_linea: 'activo', tipo_relacion: 'principal', tratamiento_id: 'TRAT-A' },
      { linea_id: 'LINE-B', nombre_comercial: 'Demo Dos', principio_activo: 'principio B', dosis: '20 mg', via: 'IV', pauta_codigo: 'MENSUAL', pauta_label: 'Mensual', estado_linea: 'activo', tipo_relacion: 'adicional', tratamiento_id: 'TRAT-B' },
      { linea_id: 'LINE-C', nombre_comercial: 'Demo Tres', principio_activo: 'principio C', dosis: '30 mg', via: 'SC', pauta_codigo: 'SEMANAL', pauta_label: 'Semanal', estado_linea: 'activo', tipo_relacion: 'adicional', tratamiento_id: 'TRAT-C' }
    ]
  });
  ['LINE-A', 'LINE-B', 'LINE-C'].forEach((id) => api.toggleLineSelection(id, true));
  (dispense || []).forEach((id) => api.setLineDispensed(id, true));
}

function addIncorporatedEa({ description, severity, evolution, suspects }) {
  const draft = api.addEaDraft();
  api.setEaEventField(draft.episode_id, 'description', description);
  if (severity) api.setEaEventField(draft.episode_id, 'severity', severity);
  if (evolution) api.setEaEventField(draft.episode_id, 'evolution', evolution);
  api.incorporateEaDraft(draft.episode_id);
  (suspects || []).forEach((suspectId) => markSuspect(draft.episode_id, suspectId));
  return draft;
}

const rows = (model) => api.buildFollowupExcelRows(model || api.buildFollowupVisitExportModel());
const jaraText = () => api.buildSegLines().join('\n');

/* ─── Contrato H: WO8 intacto ────────────────────────────────────────────── */

check(Array.isArray(columns) && columns.length === 62, 'H · WO8_COLUMNS sigue teniendo 62 columnas');
check(columns.indexOf('hay_efecto_adverso') === 48 && columns.indexOf('ea_id') === 49 && columns.indexOf('ea_descripcion') === 50
  && columns.indexOf('ea_gravedad') === 51 && columns.indexOf('farmaco_sospechoso_id') === 52
  && columns.indexOf('farmaco_sospechoso_nombre') === 53 && columns.indexOf('causalidad_naranjo') === 54
  && columns.indexOf('causalidad_karch') === 55 && columns.indexOf('accion_ea') === 56,
  'H · bloque G conserva exactamente las 9 columnas y su posición');
check(typeof api.getEaManualExportBlockReason === 'function', 'contrato: la guardia de las dos salidas manuales está expuesta (getEaManualExportBlockReason)');
check(typeof api.setEaEpisodeSuspect === 'function', 'contrato: la asociación explícita episodio→sospechoso está expuesta (setEaEpisodeSuspect)');

// Los helpers por debajo solo se usan después de comprobar el contrato; si el
// contrato falta (BASE) devuelven el fallo cerrado vacío en vez de abortar el
// informe completo de RED.
const manualReason = () => (typeof api.getEaManualExportBlockReason === 'function' ? api.getEaManualExportBlockReason() : 'contrato ausente');
const markSuspect = (episodeId, suspectId) => {
  if (typeof api.setEaEpisodeSuspect === 'function') return api.setEaEpisodeSuspect(episodeId, suspectId, true);
  return false;
};

/* ─── A · 2 EA × 2 líneas dispensadas: el caso RED de BASE ───────────────── */

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-A', dispense: ['LINE-A', 'LINE-B'] });
api.setEaPresent('si');
const eaA1 = addIncorporatedEa({ description: 'Cefalea intensa', severity: 'Grave', evolution: 'en_seguimiento', suspects: ['line:LINE-A'] });
const eaA2 = addIncorporatedEa({ description: 'Prurito de nueva aparición', severity: 'Leve', evolution: 'no_consta', suspects: ['line:LINE-B'] });

const manualReasonA = manualReason();
check(manualReasonA === '', 'A · 2 EA incorporados × 2 líneas dispensadas: la guardia de las dos salidas manuales NO bloquea (la colección 0..N es representable)');
check(api.getEaSingularExportBlockReason() !== '' && api.getEaSingularExportBlockReason().includes('2 EA incorporados'), 'I · la guardia singular legacy sigue bloqueando 2 EA (base de CSV/V2)');

const rowsA = rows();
check(rowsA.length === 2, 'A · Excel WO8 produce exactamente una fila por fármaco dispensado (2 filas, no 3 ni una por EA)');
check(rowsA.every((row) => at(row, 'visita_id') === at(rowsA[0], 'visita_id')), 'A · las filas comparten la visita');
check(rowsA.every((row) => at(row, 'linea_id') === (row === rowsA[0] ? 'LINE-A' : 'LINE-B')), 'A · el orden/identidad de línea corresponde a las dispensadas');
check(rowsA.every((row) => at(row, 'patient_id') === 'CIP-FH-EA-MANUAL-01-A' && at(row, 'cip_demo_o_hash') === 'CIP-FH-EA-MANUAL-01-A'), 'H · patient_id/cip no se alteran por la proyección EA');
check(rowsA.every((row) => at(row, 'tratamiento_id') === ''), 'H · tratamiento_id no se inventa: permanece la ausencia previa de la fuente');

const jaraA = jaraText();
const countOccurrences = (haystack, needle) => haystack.split(needle).length - 1;
check(countOccurrences(jaraA, 'Cefalea intensa') === 1 && countOccurrences(jaraA, 'Prurito de nueva aparición') === 1, 'A · TXT JARA presenta cada EA exactamente una vez (informe por visita, no por fila)');
check(jaraA.includes(eaA1.episode_id) && jaraA.includes(eaA1.observation_id) && jaraA.includes(eaA2.episode_id) && jaraA.includes(eaA2.observation_id), 'A · TXT JARA conserva episodio y observación de cada EA');
check(/Grave/.test(jaraA) && /En seguimiento/.test(jaraA), 'A · TXT JARA declara gravedad y evolución explícitas');

/* ─── C · distribución común/específica ──────────────────────────────────── */

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-C', dispense: ['LINE-A', 'LINE-B'] });
api.setEaPresent('si');
const eaC1 = addIncorporatedEa({ description: 'EA de la línea A', severity: 'Moderado', evolution: 'en_seguimiento', suspects: ['line:LINE-A'] });
const eaC2 = addIncorporatedEa({ description: 'EA de la línea B', severity: 'Leve', evolution: 'si', suspects: ['line:LINE-B'] });
const eaC3 = addIncorporatedEa({ description: 'EA compartido', severity: 'Grave', evolution: 'no', suspects: ['line:LINE-A', 'line:LINE-B'] });
const eaC4 = addIncorporatedEa({ description: 'EA sin sospechoso', suspects: [] });
api.addFollowupOtherDrug();
const otherUid = api.getFollowupOtherDrugs()[0].uid;
// Un sospechoso externo solo puede marcarse si el tratamiento tiene nombre
// real (G0 nunca ofrece etiquetas técnicas de relleno).
api.updateFollowupOtherDrug(otherUid, 'farmaco', 'Demo Externo');
const eaC5 = addIncorporatedEa({ description: 'EA con sospechoso externo', suspects: ['other:' + otherUid] });
const eaC6 = addIncorporatedEa({ description: 'EA de línea no dispensada', suspects: ['line:LINE-C'] });
const eaC7 = addIncorporatedEa({ description: 'EA mixto dispensado y externo', suspects: ['line:LINE-A', 'other:' + otherUid] });

const rowsC = rows();
const rowCA = rowsC.find((row) => at(row, 'linea_id') === 'LINE-A');
const rowCB = rowsC.find((row) => at(row, 'linea_id') === 'LINE-B');
check(rowsC.length === 2 && !!rowCA && !!rowCB, 'C · sigue habiendo una fila por dispensación con 7 EA heterogéneos');

const idA = `${eaC1.episode_id}/${eaC1.observation_id}`;
const idB = `${eaC2.episode_id}/${eaC2.observation_id}`;
const idShared = `${eaC3.episode_id}/${eaC3.observation_id}`;
check(hasScopeContent(at(rowCA, 'ea_id'), 'LÍNEA LINE-A', idA), 'C · el EA de LINE-A aparece solo en la parte específica de su fila');
check(hasScopeContent(at(rowCB, 'ea_id'), 'LÍNEA LINE-B', idB), 'C · el EA de LINE-B aparece solo en la parte específica de su fila');
check(!hasScopeContent(at(rowCA, 'ea_id'), 'LÍNEA LINE-A', idB), 'C · el EA de LINE-B NO se proyecta en la parte específica de LINE-A');
check(hasScopeContent(at(rowCA, 'ea_id'), 'LÍNEA LINE-A', idShared) && hasScopeContent(at(rowCB, 'ea_id'), 'LÍNEA LINE-B', idShared), 'C · el EA asociado a A y B aparece en la específica de AMBAS filas con la MISMA identidad');

const commonA = fragmentContents(at(rowCA, 'ea_id'), 'COMÚN');
const commonB = fragmentContents(at(rowCB, 'ea_id'), 'COMÚN');
check(commonA.length > 0 && JSON.stringify(commonA) === JSON.stringify(commonB), 'D · la zona COMÚN se repite idéntica en cada fila por fármaco');
check(commonA.some((content) => content.includes(`${eaC4.episode_id}/${eaC4.observation_id}`)), 'C · el EA sin sospechoso se proyecta en COMÚN');
check(commonA.some((content) => content.includes(`${eaC5.episode_id}/${eaC5.observation_id}`)), 'C · el EA con sospechoso externo se proyecta en COMÚN');
check(commonA.some((content) => content.includes(`${eaC6.episode_id}/${eaC6.observation_id}`)), 'C · el EA con línea NO dispensada se proyecta en COMÚN (sin perder el vínculo)');
check(!commonA.some((content) => content.includes(idShared)) && !commonA.some((content) => content.includes(idA)), 'C · el EA con asociación explícita a línea dispensada NO se duplica íntegro en COMÚN');
check(!commonA.some((content) => content.includes(`${eaC7.episode_id}/${eaC7.observation_id}`)), 'C · el EA mixto (dispensado + externo) no se copia en COMÚN');

const mixedFragment = fragments(at(rowCA, 'ea_id')).find((fragment) => fragment.content.includes(`${eaC7.episode_id}/${eaC7.observation_id}`));
check(!!mixedFragment && mixedFragment.scope === 'LÍNEA LINE-A', 'C · el EA mixto se coloca en la específica de la línea dispensada');
const mixedSuspects = fragments(at(rowCA, 'farmaco_sospechoso_id')).find((fragment) => fragment.scope === 'LÍNEA LINE-A' && fragment.content.includes('other:' + otherUid));
check(!!mixedSuspects && mixedSuspects.content.includes('line:LINE-A'), 'C · el EA mixto conserva AMBOS vínculos explícitos (línea y externo), sin borrar el externo');
check(fragments(at(rowCA, 'farmaco_sospechoso_id')).some((fragment) => fragment.scope === 'COMÚN' && fragment.content.includes('other:' + otherUid)), 'C · el vínculo externo explícito nunca se presenta como ausencia de sospecha');
check(fragments(at(rowCA, 'farmaco_sospechoso_id')).some((fragment) => fragment.scope === 'COMÚN' && /line:LINE-C/.test(fragment.content)), 'C · la línea no dispensada conserva su referencia explícita en COMÚN');

// Rastreabilidad 1:1: cada celda G de la fila lleva el mismo número de
// fragmentos, en el mismo orden de ámbitos, de modo que el fragmento i de
// cada columna describe el mismo EA.
const EA_CELLS = ['ea_id', 'ea_descripcion', 'ea_gravedad', 'farmaco_sospechoso_id', 'farmaco_sospechoso_nombre', 'causalidad_naranjo', 'causalidad_karch', 'accion_ea'];
const rowScopes = EA_CELLS.map((name) => scopesOf(at(rowCA, name)).join('|'));
// La fila LINE-A proyecta los 3 EA comunes más sus 3 EA específicos (C1, C3 y
// C7); el EA exclusivo de LINE-B no entra. El número se deriva, no se fija.
const rowBFragments = fragments(at(rowCB, 'ea_id')).length;
check(new Set(rowScopes).size === 1 && fragments(at(rowCA, 'ea_id')).length === commonA.length + 3,
  'D · una fila lleva un fragmento por EA y ámbito, alineados 1:1 entre las 8 celdas G');
check(rowBFragments === commonB.length + 2 && rowBFragments === scopesOf(at(rowCB, 'ea_id')).length,
  'D · la fila LINE-B alinea sus 2 EA específicos con la misma parte común, sin arrastrar el EA de la otra línea');
check(!scopesOf(at(rowCA, 'ea_descripcion')).some((scope) => scope !== 'COMÚN' && scope !== 'LÍNEA LINE-A'), 'D · cada celda G rotula solo ámbitos válidos para su fila (nunca otra línea)');
check(at(rowCA, 'ea_descripcion') !== at(rowCB, 'ea_descripcion'), 'D · la parte específica distingue cada fila; la común es la única repetida');

const jaraC = jaraText();
['EA de la línea A', 'EA de la línea B', 'EA compartido', 'EA sin sospechoso', 'EA con sospechoso externo', 'EA de línea no dispensada', 'EA mixto dispensado y externo']
  .forEach((description) => check(countOccurrences(jaraC, description) === 1, `D · TXT JARA no duplica «${description}» (una vez por informe)`));

/* ─── E · ninguna causalidad inferida ────────────────────────────────────── */

const causalityCells = [at(rowCA, 'causalidad_naranjo'), at(rowCA, 'causalidad_karch')];
check(causalityCells.every((cell) => fragments(cell).length > 0 && fragments(cell).every((fragment) => fragment.content === 'No evaluada')),
  'E · Naranjo y Karch quedan «No evaluada»: los editores G0 provisionales no se exportan como evaluación formal');
check(!/\d+\s*·\s*Dudosa|No clasificable|\bDefinida\b/.test(at(rowCA, 'causalidad_naranjo') + at(rowCA, 'causalidad_karch')),
  'E · no aparece ninguna categoría o puntuación de causalidad calculada');
check(fragments(at(rowCA, 'ea_gravedad')).every((fragment) => /Gravedad:/.test(fragment.content) && /Evolución:/.test(fragment.content)),
  'E · gravedad y evolución van rotuladas y explícitas, sin inferir valor ausente');
const noSuspicionFragment = fragments(at(rowCA, 'farmaco_sospechoso_id')).find((fragment) => fragment.scope === 'COMÚN' && fragment.content === 'Sin sospechoso seleccionado');
check(!!noSuspicionFragment || fragments(at(rowCA, 'farmaco_sospechoso_nombre')).some((fragment) => fragment.content === 'Sin sospechoso seleccionado'),
  'E · «sin sospechoso seleccionado» se distingue explícitamente de «No evaluada»');
check(!/line:LINE-A\s*→\s*causal|favorece|causa demostrada/i.test(jaraC), 'E · asociación de sospecha nunca se redacta como causalidad');

/* ─── D · identidad: COMÚN repetida no crea un EA nuevo ──────────────────── */

const commonDescriptions = fragmentContents(at(rowCA, 'ea_descripcion'), 'COMÚN');
const commonDescriptionsB = fragmentContents(at(rowCB, 'ea_descripcion'), 'COMÚN');
check(commonDescriptions.length > 0 && JSON.stringify(commonDescriptions) === JSON.stringify(commonDescriptionsB), 'D · la parte común repetida conserva descripciones e identidad, sin generar EA nuevos');
check(api.getEaEvents().length === 7, 'D · la proyección es local: no muta la colección EA del acto');

/* ─── B · matrices dispensadas × EA ──────────────────────────────────────── */

const matrix = [
  { dispense: ['LINE-A'], eas: 0, label: '1×0' },
  { dispense: ['LINE-A'], eas: 1, label: '1×1' },
  { dispense: ['LINE-A', 'LINE-B'], eas: 2, label: '2×2' },
  { dispense: ['LINE-A', 'LINE-B'], eas: 4, label: '2×4' },
  { dispense: ['LINE-A', 'LINE-B', 'LINE-C'], eas: 5, label: '3×5' }
];
matrix.forEach((scenario) => {
  buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-M-' + scenario.label, dispense: scenario.dispense });
  api.setEaPresent('si');
  const created = [];
  for (let index = 0; index < scenario.eas; index += 1) {
    created.push(addIncorporatedEa({ description: `Matrix EA ${index + 1}`, suspects: index < scenario.dispense.length ? ['line:' + scenario.dispense[index]] : [] }));
  }
  if (scenario.eas === 0) api.setEaPresent('no_consta');
  const produced = rows();
  check(produced.length === scenario.dispense.length, `B · matriz ${scenario.label}: ${scenario.dispense.length} fila(s) para ${scenario.eas} EA, sin filas extra ni colapsadas`);
  const allDescriptionsPresent = created.every((event) => {
    const cells = produced.map((row) => at(row, 'ea_id')).join(' | ');
    return cells.includes(`${event.episode_id}/${event.observation_id}`);
  });
  check(scenario.eas === 0 || allDescriptionsPresent, `B · matriz ${scenario.label}: ningún EA se trunca en las celdas G`);
});

// 0 dispensaciones: Excel sin filas y TXT mantiene la regla histórica por selección.
buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-NODISP', dispense: [] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'EA sin dispensación', suspects: [] });
check(rows().length === 0, 'B · 0 dispensaciones: Excel WO8 no produce ninguna fila');
check(jaraText().includes('EA sin dispensación'), 'B · 0 dispensaciones: TXT JARA mantiene la regla histórica basada en selección y sí lleva el EA');

/* ─── B · borradores nunca se proyectan ──────────────────────────────────── */

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-DRAFT', dispense: ['LINE-A'] });
api.setEaPresent('si');
const incorporatedForDraft = addIncorporatedEa({ description: 'EA incorporado visible', suspects: [] });
const draftOnly = api.addEaDraft();
api.setEaEventField(draftOnly.episode_id, 'description', 'Borrador no incorporado');
const draftRows = rows();
const draftJara = jaraText();
check(!String(at(draftRows[0], 'ea_id')).includes(draftOnly.episode_id) && !draftJara.includes('Borrador no incorporado')
  && String(at(draftRows[0], 'ea_id')).includes(incorporatedForDraft.episode_id),
  'B · un borrador no incorporado queda fuera de TXT y Excel; el incorporado sí aparece');

/* ─── F · fail-closed antes de copiar ────────────────────────────────────── */

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-F', dispense: ['LINE-A', 'LINE-B'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'EA verificable', suspects: ['line:LINE-A'] });
const pendingEa = addIncorporatedEa({ description: 'EA con fuente ausente', suspects: [] });
// La fuente de la asociación desaparece: la marca queda pendiente de reconciliación.
api.syncLinesForPatient({
  cip: 'CIP-FH-EA-MANUAL-01-F', servicio: 'Reumatología', patologia: 'LES',
  biologicos: [
    { linea_id: 'LINE-A', nombre_comercial: 'Demo Uno', dosis: '10 mg', estado_linea: 'activo', tipo_relacion: 'principal' },
    { linea_id: 'LINE-B', nombre_comercial: 'Demo Dos', dosis: '20 mg', estado_linea: 'activo', tipo_relacion: 'adicional' }
  ]
});
['LINE-A', 'LINE-B'].forEach((id) => api.toggleLineSelection(id, true));
api.setLineDispensed('LINE-A', true);
api.setLineDispensed('LINE-B', true);
api.setEaPresent('si');
// Segunda marca: la identidad de la fuente cambia después de marcar.
markSuspect(pendingEa.episode_id, 'line:LINE-A');
api.syncLinesForPatient({
  cip: 'CIP-FH-EA-MANUAL-01-F', servicio: 'Reumatología', patologia: 'LES',
  biologicos: [
    { linea_id: 'LINE-A', nombre_comercial: 'Demo Uno renombrado', principio_activo: 'otro', dosis: '99 mg', estado_linea: 'activo', tipo_relacion: 'principal' },
    { linea_id: 'LINE-B', nombre_comercial: 'Demo Dos', dosis: '20 mg', estado_linea: 'activo', tipo_relacion: 'adicional' }
  ]
});
['LINE-A', 'LINE-B'].forEach((id) => api.toggleLineSelection(id, true));
api.setLineDispensed('LINE-A', true);
api.setLineDispensed('LINE-B', true);
api.setEaPresent('si');
const failClosedReason = manualReason();
check(failClosedReason !== '', 'F · asociación no verificable: la guardia manual falla cerrada y da mensaje visible');
check(/reconcilia/i.test(failClosedReason), 'F · el mensaje identifica la reconciliación pendiente como causa');
const seguimientoSourceForWiring = read('scripts/farmacia_seguimiento.js');
check(/const exportTxt = document\.getElementById\('fhSegExportTxt'\)[\s\S]{0,400}guardEaManualOutputs\(\)/.test(seguimientoSourceForWiring),
  'F · el botón TXT JARA consulta la guardia manual ANTES de construir y copiar');
check(/var btn = document\.getElementById\('fhSegExcelExportBtn'\)[\s\S]{0,300}guardEaManualOutputs\(\)/.test(seguimientoSourceForWiring),
  'F · el botón Excel WO8 consulta la guardia manual ANTES de construir y copiar');
check(/const exportCsv = document\.getElementById\('fhSegExportCsv'\)[\s\S]{0,300}guardEaSingularExport\(\)/.test(seguimientoSourceForWiring),
  'I · el botón CSV conserva la guardia singular anterior (no se activa para multi-EA)');

/* ─── G · regresión legacy sin EA y guardias de presencia ────────────────── */

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-G-NO', dispense: ['LINE-A'] });
api.setEaPresent('no');
const noRows = rows();
check(noRows.length === 1 && at(noRows[0], 'hay_efecto_adverso') === 'FALSE', 'G · sin EA y presencia «No»: FALSE, comportamiento previo intacto');
check(manualReason() === '', 'G · sin EA y presencia «No»: la guardia manual no bloquea');
const jaraNo = jaraText();
check(/Efecto adverso desde última visita/.test(jaraNo), 'G · TXT conserve el bloque EA legacy cuando no hay colección 0..N');

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-G-NC', dispense: ['LINE-A'] });
api.setEaPresent('no_consta');
const notConstaRows = rows();
check(notConstaRows.length === 1 && at(notConstaRows[0], 'hay_efecto_adverso') === '', 'G · sin EA y «No consta»: la celda de presencia queda vacía (desconocido, nunca FALSE)');
check(manualReason() === '', 'G · sin EA y «No consta»: la guardia manual no bloquea');

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-G-SI0', dispense: ['LINE-A'] });
api.setEaPresent('si');
check(manualReason() !== '', 'G · «Sí» con 0 EA incorporados: las dos salidas manuales fallan cerradas');

// Presencia contradictoria: la transición «Sí»→«No» está bloqueada por
// T01-E/Q13, así que el único camino soportado a ese estado es la restitución
// de un acto que ya llega contradictorio (borrador/importación).
api.restoreEvaluationState({
  current_visit: {
    cip: 'CIP-FH-EA-MANUAL-01-G-CONTRADICTION',
    adverse_event: { present: 'no', severity: '', resolved: 'no_consta', corrected: 'no_consta', observations: '', suspect_ids: [], causality_editing_id: '' },
    adverse_events: [
      { episode_id: 'FH-EA-EP-9001', observation_id: 'FH-EA-OBS-9001', suspect_ids: [], status: 'incorporated', description: 'EA restituido con presencia negativa', evolution: 'no_consta', severity: '', expanded: false }
    ]
  }
});
const contradictionReason = manualReason();
check(node('fhSeguimientoEaPresente').value === 'no' && contradictionReason !== '', 'G · presencia contradictoria restituida («No» con EA incorporados) falla cerrada');

/* ─── I · CSV >1 EA sigue bloqueado y conserva su proyección ─────────────── */

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-I', dispense: ['LINE-A'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'EA uno', severity: 'Leve', suspects: [] });
const oneEaModel = api.buildFollowupVisitExportModel();
const oneEaCsv = api.buildFollowupCsv(oneEaModel);
const oneEaCsvHeader = oneEaCsv.split('\n')[0];
const oneEaCsvRow = oneEaCsv.split('\n')[1].split(',');
check(oneEaCsvHeader.split(',').length === 62, 'I · CSV conserva las 62 columnas WO8 en cabecera');
check(oneEaCsvRow.length === 62, 'I · CSV conserva una fila de 62 celdas');
check(api.getEaSingularExportBlockReason() === '', 'I · con un único EA la guardia singular (CSV) no bloquea: comportamiento previo preservado');
const csvEaCell = oneEaCsvRow[columns.indexOf('ea_descripcion')].replace(/^"|"$/g, '').replace(/""/g, '"');
check(csvEaCell === 'EA uno', 'I · CSV mantiene la proyección EA singular anterior (sin rotulación COMÚN/LÍNEA)');
addIncorporatedEa({ description: 'EA dos', suspects: [] });
check(api.getEaSingularExportBlockReason() !== '' && api.getEaSingularExportBlockReason().includes('2 EA incorporados'), 'I · CSV con 2 EA sigue bloqueado por la guardia singular anterior');
check(api.getEaV2CopyBlockReason() !== '' && api.getEaV2CopyBlockReason().includes('no representa la cobertura EA'), 'I · Export V2 conserva su frontera EA sin cambios');

/* ─── P1-A · límite de celda Excel (32767) antes de copiar ──────────────── */
// Corrección del REHACER 1 (Cora): una celda de Excel admite como máximo 32767
// caracteres. La copia manual WO8 debe validar TODAS las celdas de TODAS las
// filas finales, después del saneamiento y antes de tocar el portapapeles, y
// negarse de forma visible sin truncar. El guard es propio del destino Excel y
// no debe bloquear el TXT JARA.

const EXCEL_CELL_LIMIT = 32767;
const EXCEL_COMMON_PREFIX = 'COMÚN: '.length;
const maxCellLength = (produced) => Math.max(...produced.flat().map((cell) => String(cell === null || cell === undefined ? '' : cell).length));
const excelLimitGuard = (produced) => (typeof api.getEaManualExcelCellBlockReason === 'function'
  ? api.getEaManualExcelCellBlockReason(produced)
  : '');

check(typeof api.getEaManualExcelCellBlockReason === 'function',
  'P1-A · el guard de límite de celda Excel está expuesto (getEaManualExcelCellBlockReason)');

// Adversario reproducido por la auditoría: descripción de EA de 34000
// caracteres con dos líneas dispensadas.
buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-P1A-OVER', dispense: ['LINE-A', 'LINE-B'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'x'.repeat(34000), suspects: [] });
const overRows = rows();
const overMax = maxCellLength(overRows);
check(overRows.length === 2 && overMax > EXCEL_CELL_LIMIT,
  'P1-A · el adversario produce una celda WO8 por encima del límite de Excel (' + overMax + ' > ' + EXCEL_CELL_LIMIT + ')');
check(excelLimitGuard(overRows) !== '', 'P1-A · el guard de Excel bloquea cuando una celda final supera 32767');
check(/32767/.test(excelLimitGuard(overRows)), 'P1-A · el mensaje de bloqueo declara el límite de Excel excedido');
check(/no se ha copiado nada/i.test(excelLimitGuard(overRows)), 'P1-A · el mensaje de bloqueo declara que no se copió nada');
check(at(overRows[0], 'ea_descripcion').length === EXCEL_COMMON_PREFIX + 34000,
  'P1-A · la proyección no trunca: la celda conserva el texto íntegro y el exceso se bloquea, no se recorta');

// Separación de guardias: el límite del libro no puede bloquear el informe de
// texto, que no tiene ese límite.
check(manualReason() === '',
  'P1-A · el límite de Excel es un guard propio del destino: la validación clínica compartida NO bloquea');
const overJara = jaraText();
check(countOccurrences(overJara, 'x'.repeat(34000)) === 1,
  'P1-A · TXT JARA no se bloquea por el límite de Excel y conserva la descripción íntegra una vez');

const seguimientoSourceP1A = read('scripts/farmacia_seguimiento.js');
check(/var rows = buildFollowupExcelRows\(model\);[\s\S]{0,400}guardEaManualExcelRows\(rows\)[\s\S]{0,400}copyTSVRowsToClipboard/.test(seguimientoSourceP1A),
  'P1-A · el botón Excel valida las filas finales después de construirlas y antes de tocar el portapapeles');

// Fronteras exactas: 32767 cabe, 32768 se bloquea.
buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-P1A-LIMIT', dispense: ['LINE-A'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'y'.repeat(EXCEL_CELL_LIMIT - EXCEL_COMMON_PREFIX), suspects: [] });
const atLimitRows = rows();
check(maxCellLength(atLimitRows) === EXCEL_CELL_LIMIT,
  'P1-A · frontera positiva: la celda final alcanza exactamente ' + EXCEL_CELL_LIMIT + ' caracteres');
check(excelLimitGuard(atLimitRows) === '', 'P1-A · frontera positiva: exactamente 32767 no bloquea');

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-P1A-LIMIT1', dispense: ['LINE-A'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'z'.repeat(EXCEL_CELL_LIMIT - EXCEL_COMMON_PREFIX + 1), suspects: [] });
const overLimitRows = rows();
check(maxCellLength(overLimitRows) === EXCEL_CELL_LIMIT + 1,
  'P1-A · frontera negativa: la celda final alcanza ' + (EXCEL_CELL_LIMIT + 1) + ' caracteres');
check(excelLimitGuard(overLimitRows) !== '', 'P1-A · frontera negativa: 32768 bloquea');
check(excelLimitGuard([]) === '' && excelLimitGuard([[ '', '' ]]) === '',
  'P1-A · sin filas o con celdas vacías el guard de Excel no bloquea');

/* ─── P1-B · identidad del sospechoso en TXT con homónimos ───────────────── */
// Corrección del REHACER 1 (Cora): el bloque EA del TXT debe llevar nombre
// legible Y referencia explícita `line:<id>` u `other:<uid>` de cada
// sospechoso vigente, para que dos medicamentos homónimos no se confundan.

const eaBlockOf = (text) => {
  const start = text.indexOf('--- EA 1 ---');
  const end = text.indexOf('--- PROMs de la visita ---');
  return start < 0 ? '' : text.slice(start, end);
};

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-P1B', dispense: ['LINE-A'] });
api.setEaPresent('si');
api.addFollowupOtherDrug();
const homonymOne = api.getFollowupOtherDrugs()[0].uid;
api.updateFollowupOtherDrug(homonymOne, 'farmaco', 'Mismo nombre');
api.addFollowupOtherDrug();
const homonymTwo = api.getFollowupOtherDrugs()[1].uid;
api.updateFollowupOtherDrug(homonymTwo, 'farmaco', 'Mismo nombre');
addIncorporatedEa({ description: 'EA con homónimos', suspects: ['other:' + homonymTwo] });
const homonymBlock = eaBlockOf(jaraText());
check(homonymBlock !== '', 'P1-B · el bloque EA del TXT existe para inspeccionar sus sospechosos');
check(homonymBlock.includes('Mismo nombre'), 'P1-B · el bloque EA del TXT conserva el nombre legible del sospechoso');
check(homonymBlock.includes('other:' + homonymTwo),
  'P1-B · el bloque EA del TXT incluye la referencia explícita other:<uid> del sospechoso marcado');
check(!homonymBlock.includes('other:' + homonymOne),
  'P1-B · el bloque EA del TXT no menciona el homónimo NO marcado');

buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-P1B-LINE', dispense: ['LINE-A'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'EA con línea explícita', suspects: ['line:LINE-A'] });
const lineBlock = eaBlockOf(jaraText());
check(lineBlock.includes('line:LINE-A'),
  'P1-B · el bloque EA del TXT incluye la referencia explícita line:<linea_id> del sospechoso marcado');
const lineIdentifiers = fragments(at(rows()[0], 'ea_id')).map((fragment) => fragment.content).join(' ');
check(lineIdentifiers.length > 0 && !lineBlock.includes('other:'),
  'P1-B · una referencia de línea no se presenta como referencia externa, sin inventar vínculos');

// Ausencia explícita: sin sospechoso no se fabrica ninguna referencia.
buildVisit({ patientCip: 'CIP-FH-EA-MANUAL-01-P1B-ABSENT', dispense: ['LINE-A'] });
api.setEaPresent('si');
addIncorporatedEa({ description: 'EA sin sospechoso', suspects: [] });
const absentBlock = eaBlockOf(jaraText());
check(/Medicamentos sospechosos explícitos: Sin sospechoso seleccionado/.test(absentBlock) && !/line:|other:/.test(absentBlock.split('Medicamentos sospechosos explícitos:')[1] || ''),
  'P1-B · sin sospechoso declarado se mantiene la ausencia explícita, sin referencias inventadas');

// Fuente no verificable: la referencia se conserva rotulada, nunca como
// sospecha vigente silenciosa.
api.restoreEvaluationState({
  current_visit: {
    cip: 'CIP-FH-EA-MANUAL-01-P1B-PENDING',
    adverse_event: { present: 'si', severity: '', resolved: 'no_consta', corrected: 'no_consta', observations: '', suspect_ids: [], causality_editing_id: '' },
    adverse_events: [
      { episode_id: 'FH-EA-EP-7001', observation_id: 'FH-EA-OBS-7001', suspect_ids: ['other:seg-pendiente'], status: 'incorporated', description: 'EA con fuente externa no verificada', evolution: 'no_consta', severity: '', expanded: false }
    ]
  },
  related_treatments: [{ uid: 'seg-pendiente', farmaco: 'Fármaco restituido', relationType: 'Exposición' }]
});
const pendingBlock = eaBlockOf(jaraText());
check(/other:seg-pendiente\s+\(fuente no verificada\)/.test(pendingBlock),
  'P1-B · con la fuente no verificable el TXT conserva la referencia y declara el estado pendiente');
check(manualReason() === '',
  'P1-B · una referencia externa pendiente no bloquea las salidas manuales (el bloqueo es de la asociación a línea dispensada)');

/* ─── Alcance negativo: ni persistencia ni schema nuevo ──────────────────── */

const seguimientoSource = read('scripts/farmacia_seguimiento.js');
const excelSource = read('scripts/farmacia_excel_row_export.js');
check(!/sessionStorage\.|localStorage\.|indexedDB\./.test(seguimientoSource), 'alcance · la proyección manual no introduce almacenamiento del navegador');
check(/var WO8_COLUMNS = \[/.test(excelSource) && !/COMÚN/.test(excelSource), 'alcance · el esquema WO8 y el helper global de Excel no se modifican para esta proyección');

console.log(`\nFH-EA-MANUAL-01 (TXT JARA + Excel WO8 manual): ${passed} passed, ${failed} failed`);
if (failed) {
  console.error('FAILURES: ' + errors.join('; '));
  process.exit(1);
}
