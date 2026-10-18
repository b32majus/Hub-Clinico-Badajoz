#!/usr/bin/env node
// tools/farmacia_ea_t01_check.mjs
// T01 (#795) — captura estructurada EA 0..N del acto de Seguimiento en
// memoria de edición. Casos focalizados:
//   · 0/1/2/5 EA por interacción soportada en el mismo acto, con
//     episodeId/observationId únicos y estables.
//   · Borrador con descripción vacía no incorpora; la descripción vacía
//     permanece solo en borrador.
//   · Snapshot desacoplado: editar después no muta el snapshot, y mutar el
//     snapshot no toca el acto en edición.
//   · Contradicción «Sí»→«No/No consta» bloqueada sin borrado; borradores
//     solo se descartan con confirmación.
//   · Sin gravedad/causalidad/medicamentos/fechas espontáneos: claves
//     exactas del bloque EA.
//   · Frontera de exportación singular: razón de bloqueo visible 0..N.
//   · Sin persistencia: ninguna ruta T01 usa almacenamiento del navegador.
// Datos solo sintéticos. Ejecutar: node tools/farmacia_ea_t01_check.mjs

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const errors = [];

function ok(label) { console.log(`  ✓ ${label}`); passed++; }
function fail(label) { console.log(`  ✗ ${label}`); failed++; errors.push(label); }
function assert(condition, label) { condition ? ok(label) : fail(label); }

const html = fs.readFileSync(path.join(ROOT, 'farmacia_seguimiento.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_seguimiento.js'), 'utf8');

// ─── Anclas estructurales T01 ────────────────────────────────────────────────

assert(html.includes('¿Se han identificado o revisado acontecimientos adversos en esta visita?'), 'La pregunta del acto usa la semántica aceptada «identificados o revisados en esta visita»');
assert(html.includes('No = ausencia documentada en esta visita · No consta = no hay información suficiente. Ninguno resuelve episodios anteriores.'), 'Semántica separada «No»/«No consta» visible junto a la pregunta');
assert(html.includes('id="fhSegEaZone"') && html.includes('id="fhSegEaList"') && html.includes('id="fhSegAddEaBtn"'), 'Zona EA 0..N presente en la sección de Seguimiento');
assert(html.includes('id="fhSegEaContradictionNotice"'), 'Aviso de contradicción presente');
assert(html.includes('id="fhSegEaExportGuardNotice"'), 'Aviso de frontera de exportación singular presente');
// C-088 VIS-02: elementos del máster G0 v0.4 restaurados como fidelidad visual
// con señalización demo explícita (no funcionales en T01).
assert(html.includes('id="fhSegEaPriorEpisodeSelect"') && html.includes('id="fhSegEaUpdatePriorBtn"') && html.includes('id="fhSegEaRecurrenceBtn"'), 'Fila de continuidad/recurrencia del máster presente sobre las tarjetas (fidelidad visual)');
assert(html.includes('id="fhSegEaShowStructureBtn"') && html.includes('id="fhSegEaResetDemoBtn"'), 'Pie del máster (estructura simulada / reiniciar ejemplo) presente como fidelidad visual');
assert(/id="fhSegEaPriorEpisodeSelect"[^>]*disabled/.test(html) && /id="fhSegEaUpdatePriorBtn"[^>]*disabled/.test(html) && /id="fhSegEaRecurrenceBtn"[^>]*disabled/.test(html) && /id="fhSegEaShowStructureBtn"[^>]*disabled/.test(html) && /id="fhSegEaResetDemoBtn"[^>]*disabled/.test(html), 'Los controles demo (continuidad, recurrencia, estructura, reinicio) están deshabilitados: no funcionales en T01');
assert(js.includes('Información clínica adicional (opcional)') && js.includes('Medicamentos señalados expresamente como sospechosos'), 'Disclosure de información adicional y bloque demo de sospechosos presentes en la tarjeta expandida');
assert(js.includes('data-ea-demo-control'), 'Los controles demo de tarjeta llevan marcación explícita data-ea-demo-control');
// C-088 VIS-01: insignia de recuento y de sección con el tratamiento de píldora del máster.
assert(/#fhSegEaCountBadge,\s*\n\s*#modSeguimientoEa > \.section-title > \.status-badge/.test(html) && html.includes('border: 1px solid #c9dbe5;'), 'Insignia de recuento EA y de sección con el tratamiento de píldora encajonada del máster');
// C-088 VIS-03: insignia de estado de las tarjetas EA con el tratamiento del máster.
assert(html.includes('#fhSegEaList .ea-t01-card .status-badge--ea-card') && html.includes('background: #FEF3C7;') && html.includes('border: 1px solid #FDE68A;'), 'Insignia de estado de las tarjetas EA con el tratamiento ámbar/naranja casi cuadrado del máster (VIS-03), acotado a las tarjetas EA');
assert(js.includes("return 'status-badge--ea-card '") && js.includes("'status-badge--ea-card status-badge--pending'"), 'eaCardBadgeClass marca la insignia de estado de cada tarjeta EA con la clase del tratamiento del máster');
assert(html.includes('data-fh-transient" id="fhSegEaList"') || /id="fhSegEaList"[^>]*data-fh-transient/.test(html), 'La lista de EA queda fuera del envelope de borradores del paciente (data-fh-transient)');
assert(html.includes('modSeguimientoCausalidad'), 'La sección de causalidad se mantiene independiente y sin duplicar');
assert(!/EA de esta visita[\s\S]{0,400}Análisis de causalidad[\s\S]{0,200}EA de esta visita/.test(html), 'La zona EA no se duplica por tarjeta de causalidad');
assert(js.includes('buildEaActBlockSnapshot') && js.includes('eaIncorporatedEvents') && js.includes('eaSingularExportBlockReason'), 'El bloque T01 expone colección, snapshot y frontera singular');
assert(js.includes("adverse_events: []"), 'createFollowupVisit inicializa la colección EA 0..N en memoria');
assert(!/sessionStorage\.|localStorage\.|indexedDB\.|\.setItem\(|\.getItem\(/.test(js), 'Ningún código de Seguimiento llama a almacenamiento del navegador (Web Storage/IndexedDB)');
assert(!js.includes('createAct('), 'No se fabrica una llamada F4.4 createAct con metadatos sintéticos');

// ─── Sandbox de comportamiento ───────────────────────────────────────────────

function makeClassList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    toggle: (value, force) => { const next = force === undefined ? !values.has(value) : !!force; next ? values.add(value) : values.delete(value); return next; },
    contains: (value) => values.has(value)
  };
}

function makeNode(tag = 'div') {
  return {
    tagName: String(tag).toUpperCase(),
    value: '', textContent: '', checked: false, disabled: false, readOnly: false,
    children: [], options: [], listeners: {}, attributes: {}, style: {},
    classList: makeClassList(),
    closest: () => null,
    querySelector: () => null,
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'data-episode-id') this.datasetEpisodeId = String(value); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
    appendChild(child) { this.children.push(child); this.options.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); this.options = this.options.filter((item) => item !== child); },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    dispatchEvent(event) { event.target = this; (this.listeners[event.type] || []).forEach((handler) => handler.call(this, event)); },
    click() { this.dispatchEvent({ type: 'click', preventDefault() {} }); }
  };
}

const ids = [
  'fhSegCip', 'fhSeguimientoEaPresente', 'fhSeguimientoEaGravedad', 'fhSeguimientoEaResuelto',
  'fhSeguimientoEaCorregido', 'fhSeguimientoEaObservaciones', 'fhSegEaZone', 'fhSegEaList',
  'fhSegEaEmpty', 'fhSegEaCountBadge', 'fhSegEaSummary', 'fhSegEaContradictionNotice',
  'fhSegEaExportGuardNotice', 'fhSegFecha', 'fhSeguimientoEaNoCausalidad', 'fhSeguimientoEaActivationNotice',
  'fhSegExportTxt', 'fhSegExportCsv', 'fhSegExcelExportBtn', 'fhSegDispenseExportNotice',
  'resumenNaranjo', 'resumenKl', 'naranjoScore', 'naranjoCategoria', 'klCategoria',
  'currentProfessional', 'fhSegExportV2Btn', 'fhSegExportV2Status'
];
const elements = Object.fromEntries(ids.map((id) => [id, makeNode(id === 'fhSegCip' ? 'input' : 'div')]));
elements.fhSeguimientoEaPresente.value = 'no_consta';
elements.fhCausalidadFinal = makeNode('select');
elements.fhCausalidadFinal.value = 'No evaluada';

const sandbox = {
  window: { FarmaciaDemo: {}, FarmaciaValidationModel: null, FarmaciaPautasCatalog: null, confirm: () => true },
  console,
  document: {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => makeNode(tag),
    createTextNode: (text) => ({ textContent: text }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  Event: function Event(type) { this.type = type; },
  setTimeout, clearTimeout
};
vm.createContext(sandbox);
const helperSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'farmacia_common.js'), 'utf8');
vm.runInContext(helperSrc, sandbox);
vm.runInContext(js, sandbox);
const api = sandbox.window.FarmaciaSeguimiento;
const F = sandbox.window.FarmaciaDemo;
assert(api && typeof api.addEaDraft === 'function' && typeof api.buildEaActBlockSnapshot === 'function', 'La API pública expone addEaDraft/buildEaActBlockSnapshot');

api.setActivePatientCip('CIP-EA-T01');
elements.fhSeguimientoEaPresente.value = 'si';
api.setEaPresent('si');

// ─── 0 EA ─────────────────────────────────────────────────────────────────────

// C-088 SPEC-01 (T01-B fail-closed): «Sí» sin EA incorporados no produce
// ninguna representación preparada del acto.
let snapshot = api.buildEaActBlockSnapshot();
assert(snapshot === null, '«Sí» con 0 EA incorporados: fail-closed, NO existe bloque preparado del acto (T01-B)');
elements.fhSeguimientoEaPresente.value = 'no_consta';
api.setEaPresent('no_consta');
snapshot = api.buildEaActBlockSnapshot();
assert(snapshot && snapshot.present === 'no_consta' && snapshot.event_count === 0 && Array.isArray(snapshot.events) && snapshot.events.length === 0, '«No consta» con 0 EA: el snapshot sí representa el acto; el fail-closed es específico de «Sí» sin EA');
assert(!Object.prototype.hasOwnProperty.call(snapshot, 'act_date'), 'Sin fecha de acto registrada, el snapshot no lleva act_date');
assert(api.getEaSingularExportBlockReason() === '', '«No consta» sin EA: sin bloqueo singular');
assert(api.getEaV2CopyBlockReason() === '', '«No consta» sin EA: la copia estructurada demo (v2) conserva su comportamiento previo');
api.setEaPresent('si');
assert(api.getEaV2CopyBlockReason() !== '' && api.getEaV2CopyBlockReason().indexOf('No se ha copiado nada') !== -1, '«Sí» con 0 EA incorporados: la copia estructurada demo (v2) también se niega de forma visible');
assert(api.getEaSingularExportBlockReason() !== '', '0 EA incorporados con «Sí»: la exportación singular declara bloqueo visible');

// ─── 1 EA: incorporación, identidad estable, claves exactas ──────────────────

const draft1 = api.addEaDraft();
assert(draft1 && draft1.status === 'draft' && draft1.episode_id && draft1.observation_id, '«Añadir EA» abre un borrador con identidad propia de episodio y observación');
assert(api.incorporateEaDraft(draft1.episode_id) === false, 'Borrador con descripción vacía no se incorpora (T01-B)');
api.setEaEventField(draft1.episode_id, 'description', 'Cefalea');
assert(api.incorporateEaDraft(draft1.episode_id) === true, 'Con descripción no vacía, el borrador se incorpora al acto preparado');
snapshot = api.buildEaActBlockSnapshot();
assert(snapshot.event_count === 1 && snapshot.events[0].description === 'Cefalea', '1 EA incorporado aparece en el snapshot con su descripción original');
assert(JSON.stringify(Object.keys(snapshot.events[0]).sort()) === JSON.stringify(['description', 'episode_id', 'evolution', 'observation_id', 'severity']), 'El evento del snapshot no inventa campos: sin medicamentos, fechas, gravedad espontánea ni metadatos F4.4');
assert(snapshot.events[0].evolution === 'no_consta' && snapshot.events[0].severity === '', 'Evolución y gravedad permanecen ausentes si nadie las registró');
assert(snapshot.observation_count === 1 && snapshot.draft_count === 0, 'Recuentos del bloque: una observación, cero borradores');
// C-088 SPEC-02: la proyección v2 no lleva el bloque EA en ningún caso, así
// que también con exactamente un EA la copia estructurada demo se niega.
assert(api.getEaV2CopyBlockReason().indexOf('1 EA incorporado') !== -1 && api.getEaV2CopyBlockReason().indexOf('No se ha copiado nada') !== -1, '1 EA incorporado: la copia estructurada demo (v2) se bloquea de forma visible');
assert(!Object.prototype.hasOwnProperty.call(snapshot, 'actId') && !Object.prototype.hasOwnProperty.call(snapshot, 'act_id'), 'Sin actId fabricado: no procede identidad explícita preexistente');
const idsBefore = [snapshot.events[0].episode_id, snapshot.events[0].observation_id];
assert(api.buildEaActBlockSnapshot().events[0].episode_id === idsBefore[0], 'Las identidades son estables entre reconstrucciones del mismo acto');

// ─── 2 EA ────────────────────────────────────────────────────────────────────

const draft2 = api.addEaDraft();
api.setEaEventField(draft2.episode_id, 'description', 'Prurito de nueva aparición');
api.incorporateEaDraft(draft2.episode_id);
snapshot = api.buildEaActBlockSnapshot();
assert(snapshot.event_count === 2 && snapshot.events[0].description === 'Cefalea' && snapshot.events[1].description === 'Prurito de nueva aparición', '2 EA independientes en el mismo acto, sin comprimir descripciones');
const allIds = snapshot.events.flatMap((event) => [event.episode_id, event.observation_id]);
assert(new Set(allIds).size === allIds.length, 'episodeId/observationId únicos en la colección');
assert(api.getEaSingularExportBlockReason().indexOf('2 EA incorporados') !== -1, '2 EA incorporados: la exportación singular se bloquea de forma explícita y visible');
assert(api.getEaV2CopyBlockReason().indexOf('2 EA incorporados') !== -1 && api.getEaV2CopyBlockReason().indexOf('no representa la cobertura EA') !== -1, '2 EA incorporados: la copia estructurada demo (v2) se bloquea y declara que omitiría el bloque EA');
assert(/async function handleFollowupV2Export[\s\S]{0,600}eaV2CopyBlockReason\(\)/.test(js), 'La acción «Copiar datos estructurados demo» consulta la frontera EA antes de construir la proyección o copiar');
const model = api.buildFollowupVisitExportModel();
assert(model.ea_block && model.ea_block.event_count === 2 && model.ea_singular_export_block_reason !== '', 'El modelo de exportación lleva el bloque EA desacoplado y la razón de bloqueo singular');

// ─── Desacoplamiento del snapshot ────────────────────────────────────────────

const frozen = api.buildEaActBlockSnapshot();
api.setEaEventField(draft2.episode_id, 'description', 'Texto modificado después del snapshot');
assert(frozen.events[1].description === 'Prurito de nueva aparición', 'Editar el acto después NO muta un snapshot ya construido');
assert(api.buildEaActBlockSnapshot().events[1].description === 'Texto modificado después del snapshot', 'El acto en edición sí refleja la edición posterior');
const mutated = api.buildEaActBlockSnapshot();
mutated.events[0].description = 'Mutación externa del snapshot';
assert(api.buildEaActBlockSnapshot().events[0].description === 'Cefalea', 'Mutar el snapshot no toca el acto en edición');

// ─── 5 EA: sin techo de cuatro ───────────────────────────────────────────────

const draft35 = [api.addEaDraft(), api.addEaDraft(), api.addEaDraft()];
draft35.forEach((draft, index) => {
  api.setEaEventField(draft.episode_id, 'description', 'EA adicional ' + (index + 3));
  assert(api.incorporateEaDraft(draft.episode_id) === true, 'EA ' + (index + 3) + ' incorporado sin límite funcional de cuatro');
});
snapshot = api.buildEaActBlockSnapshot();
assert(snapshot.event_count === 5, '5 EA incorporados en el mismo acto (0/1/2/5 soportados)');
assert(new Set(snapshot.events.map((event) => event.episode_id)).size === 5, 'Cinco episodios con identidad propia, sin multiplicar actos ni visitas');

// ─── Contradicción «Sí»→«No/No consta» bloqueada sin borrado ────────────────

elements.fhSeguimientoEaPresente.value = 'no';
api.setEaPresent('no');
assert(elements.fhSeguimientoEaPresente.value === 'si', 'Con EA incorporados, «Sí»→«No» se revierte a «Sí»');
assert(elements.fhSegEaContradictionNotice.classList.contains('hidden') === false, 'La explicación de contradicción se muestra de forma visible');
assert(api.getEaEvents().length === 5 && api.getEaEvents().filter((event) => event.status === 'incorporated').length === 5, 'El bloqueo no borra datos: los 5 EA incorporados permanecen');
elements.fhSeguimientoEaPresente.value = 'no_consta';
api.setEaPresent('no_consta');
assert(elements.fhSeguimientoEaPresente.value === 'si', '«Sí»→«No consta» también se bloquea con EA incorporados');
assert(api.getEaEvents().length === 5, '«No consta» bloqueado sin borrado: la colección permanece intacta');

// ─── Borradores: descarte solo con confirmación; «Sí»→«No» con borradores ───

const draft6 = api.addEaDraft();
sandbox.window.confirm = () => false;
assert(api.discardEaEvent(draft6.episode_id) === false && api.getEaEvents().length === 6, 'Descartar un borrador sin confirmación no elimina nada');
sandbox.window.confirm = () => true;
assert(api.discardEaEvent(draft6.episode_id) === true && api.getEaEvents().length === 5, 'Descartar con confirmación explícita elimina solo ese borrador');

// Con EA incorporados la contradicción se bloquea antes; el paso a «No» con
// borradores sin incorporar se prueba en un acto sin EA incorporados.
api.setActivePatientCip('CIP-EA-T01-BORRADORES');
api.setEaPresent('si');
const draftA = api.addEaDraft();
const draftB = api.addEaDraft();
elements.fhSeguimientoEaPresente.value = 'no';
sandbox.window.confirm = () => false;
api.setEaPresent('no');
assert(elements.fhSeguimientoEaPresente.value === 'si' && api.getEaEvents().length === 2, '«Sí»→«No» con borradores sin confirmar: cancelación conserva «Sí» y los borradores');
sandbox.window.confirm = () => true;
api.setEaPresent('no');
assert(elements.fhSeguimientoEaPresente.value === 'no' && api.getEaEvents().length === 0, 'Confirmado el paso a «No», solo se descartan los borradores sin incorporar');
api.setEaPresent('si');

// ─── Fecha del acto: única y solo si la registra el profesional ──────────────

// Acto válido sin cobertura EA para probar la fecha (con «Sí» y 0 EA el
// snapshot entero es fail-closed, ver SPEC-01).
api.setEaPresent('no_consta');
snapshot = api.buildEaActBlockSnapshot();
assert(!Object.prototype.hasOwnProperty.call(snapshot, 'act_date'), 'fhSegFecha vacío: sin fecha de acto inferida');
// C-088 SPEC-03: un valor presente sin registro del profesional (como el
// autorrelleno de inicialización) NO produce act_date: la ausencia permanece
// ausente, nunca se infiere.
elements.fhSegFecha.value = '2026-10-18';
snapshot = api.buildEaActBlockSnapshot();
assert(!Object.prototype.hasOwnProperty.call(snapshot, 'act_date'), 'Valor presente sin registro del profesional (p. ej. autorrelleno): el snapshot NO infiere act_date');
// Registro real del profesional: evento soportado sobre fhSegFecha.
elements.fhSegFecha.dispatchEvent({ type: 'change' });
snapshot = api.buildEaActBlockSnapshot();
assert(snapshot.act_date === '2026-10-18', 'La única fecha del acto es fhSegFecha registrada por el profesional');
elements.fhSegFecha.value = '';

// ─── Aislamiento entre pacientes y restauración con identidades ─────────────

const restored = api.restoreEvaluationState({
  current_visit: {
    cip: 'CIP-EA-T01',
    adverse_event: { present: 'si', severity: '', resolved: 'no_consta', corrected: 'no_consta', observations: '', suspect_ids: [], causality_editing_id: '' },
    adverse_events: [
      { episode_id: 'FH-EA-EP-0042', observation_id: 'FH-EA-OBS-0042', status: 'incorporated', description: 'EA restaurado', evolution: 'en_seguimiento', severity: '', expanded: false }
    ]
  }
});
const restoredEvents = api.getEaEvents();
assert(restoredEvents.length === 1 && restoredEvents[0].episode_id === 'FH-EA-EP-0042', 'La restauración conserva identidades explícitas del bloque EA');
const afterRestoreDraft = api.addEaDraft();
assert(afterRestoreDraft.episode_id !== 'FH-EA-EP-0042' && afterRestoreDraft.episode_id > 'FH-EA-EP-0042', 'Los ids nuevos no colisionan con identidades restauradas');
api.setActivePatientCip('CIP-EA-T01-OTRO');
assert(api.getEaEvents().length === 0, 'El cambio de paciente abre un acto nuevo sin arrastrar la colección EA');
api.setActivePatientCip('CIP-EA-T01');
api.setEaPresent('si');

// ─── Campo de descripción vaciado en incorporado vuelve a borrador ──────────

const draft8 = api.addEaDraft();
api.setEaEventField(draft8.episode_id, 'description', 'Temporal');
api.incorporateEaDraft(draft8.episode_id);
api.setEaEventField(draft8.episode_id, 'description', '   ');
assert(api.getEaEvents().find((event) => event.episode_id === draft8.episode_id).status === 'draft', 'Invariante T01-B: descripción vaciada deja el EA en borrador y fuera del acto preparado');
assert(api.buildEaActBlockSnapshot() === null, 'Invariante T01-B: con el EA devuelto a borrador y presencia «Sí», NO existe representación preparada (fail-closed, SPEC-01)');
api.discardEaEvent(draft8.episode_id);

console.log(`\nFARMACIA-EA-T01: ${passed} passed, ${failed} failed`);
if (failed) {
  console.error('FAILURES: ' + errors.join('; '));
  process.exit(1);
}
