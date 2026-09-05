import { runUnifiedIntake } from './fh_intake_pipeline.js';

const STATE_VERIFIED = 'VERIFIED_EXPLICIT_CIP';
const STATE_CONFIRMED = 'MANUALLY_CONFIRMED_SELECTED_PATIENT';
const STATE_UNBOUND = 'UNBOUND';
const STATE_CONFLICT = 'CONFLICT';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
const EORDEN_CONFIRM = 'Asociar esta e-Orden sin CIP al paciente seleccionado.';

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
    return { state: STATE_CONFLICT, reason: 'CIP_INVALID_MULTIPLE_OR_AMBIGUOUS' };
  }
  if (cips.length === 1) {
    return cips[0] === selected
      ? { state: STATE_VERIFIED, reason: 'EXACT_CIP_MATCH' }
      : { state: STATE_CONFLICT, reason: 'CIP_DOES_NOT_MATCH_SELECTED_PATIENT' };
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

  function render() {
    panel.replaceChildren();
    if (!review) { panel.hidden = true; return; }
    panel.hidden = false;
    const summary = element('p', 'notice-box notice-box--info', 'Vista previa únicamente: reconocer o asociar una fuente no valida el tratamiento. Aplicar permanece deshabilitado en T6.');
    panel.appendChild(summary);
    for (const unit of review.result.units ?? []) {
      const key = sourceKey(unit);
      const confirmed = Boolean(review.confirmations[key]);
      const association = associationForSource(unit, selectedPatient, confirmed);
      panel.appendChild(renderSource(unit, association, confirmed, () => {
        review.confirmations[key] = true;
        render();
      }, selectedPatient));
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
    review = { result: runUnifiedIntake(input.value), confirmations: { 'e-orden': false, presalud: false } };
    render();
  });
  input.addEventListener('input', () => { if (review) discard(false); });
  resetButton?.addEventListener('click', () => discard(true));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initIntakeReview);
  else initIntakeReview();
}
