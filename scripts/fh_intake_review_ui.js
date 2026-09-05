import { runUnifiedIntake } from './fh_intake_pipeline.js';
import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
  STATE_CONFLICT,
  STATE_REQUIRES_SELECTION,
  STATE_NO_PROPOSAL,
  HYDRATABLE_CONCEPTS,
  targetForConcept,
  decisionState,
  writeEligibility,
  applyConcept,
} from './fh_intake_apply.js';

const STATE_VERIFIED = 'VERIFIED_EXPLICIT_CIP';
const STATE_CONFIRMED = 'MANUALLY_CONFIRMED_SELECTED_PATIENT';
const STATE_UNBOUND = 'UNBOUND';
const STATE_ASSOCIATION_CONFLICT = 'CONFLICT';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
const EORDEN_CONFIRM = 'Asociar esta e-Orden sin CIP al paciente seleccionado.';
const PROPOSAL_AUTO_PROPOSABLE = 'AUTO_PROPOSABLE';

const CONCEPT_LABELS = {
  commercial_name: 'Fármaco solicitado (marca comercial)',
  requested_dose: 'Dosis solicitada',
  requested_route: 'Vía solicitada',
  requested_schedule: 'Pauta solicitada',
  requested_induction: 'Inducción solicitada',
  requested_justification: 'Justificación clínica',
  principio_activo_raw: 'Principio activo (solo origen)',
};

/** Requested-treatment controls that stay editable after an apply (D11). */
const PREVIEW_EDITABLE_CONTROLS = [
  'fhDermaFarmaco', 'fhDermaDosis', 'fhDermaVia', 'fhDermaPauta',
  'fhDermaPautaOtro', 'fhDermaInduccion', 'fhDermaJustificacion',
];

function normalizedIdentifier(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function sourceKey(unit) {
  if (unit?.source === 'pre-salud') return 'presalud';
  if (unit?.source === 'e-orden') return 'e-orden';
  return 'unknown';
}

function cipContributions(unit) {
  return (unit?.parser?.contributions ?? []).filter(item => item?.concept === 'cip');
}

/** Compute D5 association independently from parsing and clinical validity. */
export function associationForSource(unit, selectedIdentifier, confirmed = false) {
  const selected = normalizedIdentifier(selectedIdentifier);
  if (!selected) return { state: STATE_UNBOUND, reason: 'NO_SELECTED_PATIENT' };
  const key = sourceKey(unit);
  if (key === 'unknown') return { state: STATE_UNBOUND, reason: 'SOURCE_OWNERSHIP_UNRESOLVED' };
  if (key === 'presalud') {
    return confirmed
      ? { state: STATE_CONFIRMED, reason: 'PRESALUD_CONFIRMED_FOR_SELECTED_PATIENT' }
      : { state: STATE_UNBOUND, reason: 'PRESALUD_CONFIRMATION_REQUIRED' };
  }

  const cips = cipContributions(unit)
    .map(item => normalizedIdentifier(item?.value))
    .filter(Boolean);
  const hasCipLabel = String(unit?.raw ?? '').split(/\r?\n/)
    .some(line => /^\s*• CIP:/.test(line));
  if (cips.length !== 1 && hasCipLabel) {
    return { state: STATE_ASSOCIATION_CONFLICT, reason: 'CIP_INVALID_MULTIPLE_OR_AMBIGUOUS' };
  }
  if (cips.length === 1) {
    return cips[0] === selected
      ? { state: STATE_VERIFIED, reason: 'EXACT_CIP_MATCH' }
      : { state: STATE_ASSOCIATION_CONFLICT, reason: 'CIP_DOES_NOT_MATCH_SELECTED_PATIENT' };
  }
  return confirmed
    ? { state: STATE_CONFIRMED, reason: 'CIPLESS_EORDEN_CONFIRMED_FOR_SELECTED_PATIENT' }
    : { state: STATE_UNBOUND, reason: 'CIPLESS_EORDEN_CONFIRMATION_REQUIRED' };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function displayValue(value, fallback = 'NO_VALUE') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') {
    return [value.code, value.label].filter(Boolean).join(' · ') || fallback;
  }
  return String(value);
}

function reasonCode(reason) {
  if (typeof reason === 'string') return reason;
  return reason?.code || 'BLOCKED_SOURCE_UNIT';
}

function selectedPatientIdentifier() {
  try {
    const context = window.FarmaciaDemo?.getQueryContext?.();
    if (!context?.patient) return null;
    return normalizedIdentifier(context.cip || context.patient.cip);
  } catch {
    return null;
  }
}

function renderRaw(container, title, raw, code, expanded = false) {
  const details = element('details', 'fh-intake-raw');
  details.open = expanded;
  details.appendChild(element('summary', '', `${title} · ${code}`));
  details.appendChild(element('pre', '', String(raw ?? '')));
  container.appendChild(details);
}

function renderSource(unit, association, confirmed, rerender, selectedPatient) {
  const key = sourceKey(unit);
  const label = key === 'presalud' ? 'PreSalud' : (key === 'e-orden' ? 'e-Orden' : 'Fuente no atribuida');
  const article = element('article', 'fh-intake-source');
  article.dataset.fhSourceName = key;

  const heading = element('div', 'fh-intake-source__heading');
  heading.append(element('h3', '', label), element('span', 'status-badge', unit?.parser?.unit_state || unit?.kind || 'UNRECOGNIZED'));
  article.appendChild(heading);
  const gate = element('p', 'fh-intake-gate');
  gate.append('Asociación: ', element('strong', '', association.state), ' · ', association.reason);
  article.appendChild(gate);

  const contributions = unit?.parser?.contributions ?? [];
  if (contributions.length) {
    const list = element('dl', 'fh-intake-concepts');
    for (const contribution of contributions) {
      const row = element('div', 'fh-intake-concept');
      row.append(element('dt', '', contribution.concept || 'concepto'), element('dd', '', displayValue(contribution.value, contribution.value_state || 'NO_VALUE')));
      const provenance = element('small', 'fh-intake-provenance', `Origen ${label} · línea ${Number(contribution.line_index ?? 0) + 1} · ${contribution.semantic_status || 'SIN_ESTADO'}`);
      provenance.dataset.fhProvenance = '';
      row.appendChild(provenance);
      list.appendChild(row);
    }
    article.appendChild(list);
  } else {
    article.appendChild(element('p', 'fh-intake-empty', 'Sin conceptos reconocidos de forma segura.'));
  }

  for (const fragment of unit?.parser?.unrecognized_fragments ?? []) {
    renderRaw(article, 'Fragmento no reconocido', fragment.raw, 'UNRECOGNIZED_FRAGMENT', true);
  }
  const codes = new Set([
    ...(unit?.parser?.blocking_states ?? []),
    ...(unit?.parser?.errors ?? []).map(item => item?.code).filter(Boolean),
    ...(unit?.blocked ? [reasonCode(unit.blocking_reason)] : [])
  ]);
  if (codes.size) renderRaw(article, 'Unidad bloqueada', unit?.raw, Array.from(codes).join(' · '), true);
  else renderRaw(article, 'Fuente original', unit?.raw, 'RAW_SOURCE');

  const canConfirm = selectedPatient && association.state === STATE_UNBOUND && !confirmed && key !== 'unknown';
  if (canConfirm) {
    const button = element('button', 'btn btn-outline', key === 'presalud' ? PRESALUD_CONFIRM : EORDEN_CONFIRM);
    button.type = 'button';
    button.addEventListener('click', rerender);
    article.appendChild(button);
  }
  return article;
}

/* ------------------------------------------------------------------ *
 * T7 per-concept decision surface (D11 / D16, issue #299).           *
 * ------------------------------------------------------------------ */

function targetControl(target) {
  return document.getElementById(target);
}

function inductionDisplay(selectValue) {
  if (selectValue === 'si') return 'SÍ';
  if (selectValue === 'no') return 'NO';
  return '';
}

/** Live DOM values expressed in the same space as reconciled proposals. */
function currentFormValues() {
  const values = {};
  const read = (target) => {
    const field = targetControl(target);
    return field && field.value !== undefined ? field.value : '';
  };
  for (const concept of HYDRATABLE_CONCEPTS) {
    const target = targetForConcept(concept);
    if (target && target !== 'NONE') values[target] = read(target);
  }
  const pauta = targetControl('fhDermaPauta');
  const pautaOtro = targetControl('fhDermaPautaOtro');
  if (pauta && pauta.value) {
    const catalog = window.FarmaciaPautasCatalog;
    if (pauta.value === 'OTRO') {
      values.fhDermaPauta = pautaOtro ? pautaOtro.value : '';
    } else if (catalog && typeof catalog.getPautaByCodigo === 'function') {
      const found = catalog.getPautaByCodigo(pauta.value);
      values.fhDermaPauta = found ? catalog.getLegacyPautaLabel(found) : pauta.value;
    } else {
      values.fhDermaPauta = pauta.value;
    }
  } else if (pauta) {
    values.fhDermaPauta = '';
  }
  const induction = targetControl('fhDermaInduccion');
  if (induction) values.fhDermaInduccion = inductionDisplay(induction.value);
  return values;
}

/** D11 seam: write a confirmed applied_value into its normal form control. */
function writeTarget(target, appliedText) {
  const field = targetControl(target);
  if (!field) return;
  if (target === 'fhDermaPauta') {
    const catalog = window.FarmaciaPautasCatalog;
    const pauta = catalog && typeof catalog.normalizePautaLabel === 'function'
      ? catalog.normalizePautaLabel(appliedText)
      : null;
    field.value = pauta ? pauta.pauta_codigo : '';
    const otro = targetControl('fhDermaPautaOtro');
    if (pauta && pauta.pauta_codigo === 'OTRO' && otro) {
      otro.value = pauta.pauta_otro_texto || String(appliedText || '');
      otro.classList.remove('hidden');
    } else if (otro && pauta && pauta.pauta_codigo) {
      otro.value = '';
      otro.classList.add('hidden');
    }
    return;
  }
  if (target === 'fhDermaInduccion') {
    if (appliedText === 'SÍ' || appliedText === 'SI') field.value = 'si';
    else if (appliedText === 'NO') field.value = 'no';
    else field.value = '';
    return;
  }
  field.value = String(appliedText ?? '');
}

/**
 * D5 write gate: map every safe proposal contribution of a concept to the
 * association state of its OWN source unit. Each source passes its own gate;
 * an associated source never authorizes another source (mixed input, D5).
 */
function contributionAssociations(review, conceptName, selectedPatient) {
  const reconciled = review.result.reconciled?.concepts?.[conceptName];
  if (!reconciled) return [];
  const target = targetForConcept(reconciled.concept);
  const proposals = (reconciled.contributions ?? []).filter(item =>
    item?.target === target && item?.proposal_status === PROPOSAL_AUTO_PROPOSABLE
  );
  const states = [];
  for (const contribution of proposals) {
    const unit = (review.result.units ?? []).find(candidate => candidate.unit_index === contribution.unit_index);
    if (!unit) continue;
    const key = sourceKey(unit);
    states.push(associationForSource(unit, selectedPatient, Boolean(review.confirmations[key])));
  }
  return states;
}

function renderConcept(review, conceptName, selectedPatient, rerender) {
  const reconciled = review.result.reconciled?.concepts?.[conceptName];
  if (!reconciled) return null;
  const target = targetForConcept(reconciled.concept);
  if (target === 'NONE' && conceptName !== 'principio_activo_raw') return null;
  if (review.cancelled[conceptName]) return null;

  const current = currentFormValues()[target];
  const state = decisionState(reconciled, current);

  const row = element('article', 'fh-intake-decision');
  row.dataset.fhConcept = conceptName;
  const proposal = reconciled.value ?? (reconciled.contributions ?? []).find(item => item?.value !== null && item?.value !== undefined)?.value;
  row.dataset.fhSourceValue = displayValue(proposal, '');
  row.dataset.fhAppliedValue = review.applied[conceptName] === undefined ? '' : displayValue(review.applied[conceptName], '');

  const heading = element('div', 'fh-intake-decision__heading');
  heading.append(element('strong', '', CONCEPT_LABELS[conceptName] || conceptName), element('span', 'status-badge', state));
  row.appendChild(heading);
  const meta = element('p', 'fh-intake-decision__meta');
  meta.append(
    element('span', '', `Propuesta: ${displayValue(proposal, '—')}`),
    element('span', '', `Destino: ${target || 'NONE'}`),
  );
  row.appendChild(meta);

  for (const contribution of reconciled.contributions ?? []) {
    const provenance = element('small', 'fh-intake-provenance',
      `Origen ${contribution.provenance?.source || contribution.source || 'desconocido'} · ${contribution.semantic_status || 'SIN_ESTADO'}`);
    provenance.dataset.fhProvenance = '';
    row.appendChild(provenance);
  }

  if (state === STATE_ALREADY_MATCHES_CURRENT) {
    row.appendChild(element('p', 'fh-intake-decision__note', 'El valor actual ya coincide con la propuesta; no se reescribe nada.'));
    return row;
  }
  if (state === STATE_CONFLICT) {
    row.appendChild(element('p', 'fh-intake-decision__note', 'Conflicto de reconciliación entre fuentes: no hay ganador automático. Resolución explícita requerida (fuera del alcance de este ticket).'));
    return row;
  }
  if (state === STATE_REQUIRES_SELECTION) {
    row.appendChild(element('p', 'fh-intake-decision__note', 'Requiere selección explícita: nunca se elige un valor automáticamente.'));
    return row;
  }
  if (state === STATE_NO_PROPOSAL) {
    row.appendChild(element('p', 'fh-intake-decision__note', 'Sin propuesta aplicable: no se escribe nada.'));
    return row;
  }

  const associations = contributionAssociations(review, conceptName, selectedPatient);
  const eligibility = writeEligibility(reconciled, current, associations);
  const decisions = [];
  if (state === STATE_CURRENT_EMPTY) {
    decisions.push({ kind: 'confirm', label: 'Confirmar y aplicar', enabled: eligibility.writable });
  } else if (state === STATE_PROTECTED_EXISTING) {
    decisions.push({ kind: 'replace', label: 'Reemplazar explícitamente', enabled: eligibility.writable });
  }
  decisions.push({ kind: 'cancel', label: 'Cancelar', enabled: true });
  if (!eligibility.writable) {
    row.appendChild(element('p', 'fh-intake-decision__note', `Escritura bloqueada por gate D5/D16: ${eligibility.reason}`));
  }
  const actions = element('div', 'fh-intake-decision__actions');
  for (const item of decisions) {
    const button = element('button', 'btn btn-outline', item.label);
    button.type = 'button';
    button.dataset.fhConceptAction = item.kind;
    button.disabled = !item.enabled;
    button.setAttribute('aria-disabled', String(button.disabled));
    button.addEventListener('click', () => {
      if (item.kind === 'cancel') {
        review.cancelled[conceptName] = true;
        rerender();
        return;
      }
      const result = applyConcept({
        reconciled,
        currentValue: currentFormValues()[target],
        associationStates: contributionAssociations(review, conceptName, selectedPatient),
        action: item.kind,
        write: writeTarget,
      });
      if (result.applied) review.applied[conceptName] = result.appliedValue;
      rerender();
    });
    actions.appendChild(button);
  }
  row.appendChild(actions);
  return row;
}

function initIntakeReview() {
  const input = document.querySelector('textarea[data-fh-intake-source]');
  const previewButton = document.querySelector('[data-fh-intake-preview]');
  const resetButton = document.querySelector('[data-fh-intake-reset]');
  const panel = document.querySelector('[data-fh-intake-preview-panel]');
  const patientStatus = document.querySelector('[data-fh-intake-patient]');
  const applyButton = document.querySelector('[data-fh-intake-apply]');
  if (!input || !previewButton || !panel || !patientStatus || !applyButton) return;

  let review = null;
  const selectedPatient = selectedPatientIdentifier();
  patientStatus.textContent = selectedPatient ? `Paciente seleccionado: ${selectedPatient}` : 'Sin paciente de Farmacia seleccionado';
  applyButton.disabled = true;
  applyButton.setAttribute('aria-disabled', 'true');
  applyButton.title = 'T7 aplica únicamente mediante decisiones explícitas por concepto';

  // No-patient preview seam: keep the requested-treatment comparison surface
  // visible and editable so a review can show that every decision stays
  // unwritten while no D5-eligible source association exists. The write gate
  // below (never this reveal) decides writability.
  const preparePreviewForm = () => {
    if (selectedPatient) return;
    const derma = document.getElementById('formDerma');
    if (derma) derma.classList.remove('hidden');
    for (const id of PREVIEW_EDITABLE_CONTROLS) {
      const control = document.getElementById(id);
      if (control) control.removeAttribute('readonly');
    }
  };

  function render() {
    panel.replaceChildren();
    if (!review) { panel.hidden = true; return; }
    panel.hidden = false;
    panel.appendChild(element('p', 'notice-box notice-box--info',
      'Vista previa con aplicación explícita por concepto. Asociar o confirmar una fuente no valida el tratamiento; el tratamiento validado permanece intacto.'));
    for (const unit of review.result.units ?? []) {
      const key = sourceKey(unit);
      const confirmed = Boolean(review.confirmations[key]);
      const association = associationForSource(unit, selectedPatient, confirmed);
      panel.appendChild(renderSource(unit, association, confirmed, () => {
        review.confirmations[key] = true;
        render();
      }, selectedPatient));
    }
    const concepts = review.result.reconciled?.concepts ?? {};
    const decisionConcepts = Object.keys(concepts).filter(concept =>
      HYDRATABLE_CONCEPTS.includes(concept) || concept === 'principio_activo_raw'
    );
    if (decisionConcepts.length) {
      panel.appendChild(element('h3', 'fh-intake-decision__title', 'Decisiones por concepto'));
      for (const concept of decisionConcepts) {
        const row = renderConcept(review, concept, selectedPatient, render);
        if (row) panel.appendChild(row);
      }
    }
    for (const fragment of review.result.unrecognized_fragments ?? []) {
      renderRaw(panel, 'Fragmento sin fuente segura', fragment.raw, 'UNRECOGNIZED_FRAGMENT', true);
    }
    const globalCodes = new Set([
      ...(review.result.blocking_states ?? []),
      ...(review.result.errors ?? []).map(item => item?.code).filter(Boolean)
    ]);
    if (!(review.result.units?.length || review.result.unrecognized_fragments?.length)) {
      renderRaw(panel, 'Entrada sin unidad reconocida', review.result.raw_input, globalCodes.size ? Array.from(globalCodes).join(' · ') : 'UNRECOGNIZED', true);
    }
    if (globalCodes.size) panel.appendChild(element('p', 'fh-intake-global-block', `Bloqueos estructurados: ${Array.from(globalCodes).join(' · ')}`));
  }

  function discard(clearInput) {
    review = null;
    if (clearInput) input.value = '';
    render();
  }

  previewButton.addEventListener('click', () => {
    preparePreviewForm();
    review = {
      result: runUnifiedIntake(input.value, { currentFormValues: currentFormValues() }),
      confirmations: { 'e-orden': false, presalud: false },
      applied: {},
      cancelled: {},
    };
    render();
  });
  input.addEventListener('input', () => { if (review) discard(false); });
  resetButton?.addEventListener('click', () => discard(true));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initIntakeReview);
  else initIntakeReview();
  const revealNoPatientForm = () => {
    try {
      const context = window.FarmaciaDemo && typeof window.FarmaciaDemo.getQueryContext === 'function' ? window.FarmaciaDemo.getQueryContext() : null;
      if (context && context.patient) return;
    } catch { return; }
    const derma = document.getElementById('formDerma');
    if (derma) derma.classList.remove('hidden');
    for (const id of PREVIEW_EDITABLE_CONTROLS) {
      const control = document.getElementById(id);
      if (control) control.removeAttribute('readonly');
    }
  };
  // Module scripts run after parsing but the legacy farmacia_validacion.js
  // DOMContentLoaded handler hides the derma form again on no-patient routes.
  // Re-apply the preview-only comparison seam once that handler has settled;
  // the D5 write gate (never this reveal) decides writability.
  document.addEventListener('DOMContentLoaded', () => window.setTimeout(revealNoPatientForm, 0));
  window.setTimeout(revealNoPatientForm, 0);
}
