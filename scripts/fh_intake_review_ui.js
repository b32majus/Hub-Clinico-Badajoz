import { runUnifiedIntake } from './fh_intake_pipeline.js';
import {
  STATE_CURRENT_EMPTY,
  STATE_ALREADY_MATCHES_CURRENT,
  STATE_PROTECTED_EXISTING,
  STATE_CONFLICT,
  STATE_REQUIRES_SELECTION,
  STATE_NO_PROPOSAL,
  HYDRATABLE_CONCEPTS,
  ASSOCIATION_TRANSIENT_NEW_REQUEST,
  D17_EXT_HYDRATABLE_CONCEPTS,
  D17_EXT_CHECKBOX_TARGETS,
  adaptD17ExtControlValue,
  d17ExtGate,
  parentConditionFor,
  targetForConcept,
  writeEligibility,
  applyConcept,
} from './fh_intake_apply.js';
import {
  STATE_MANUALLY_EDITED_AFTER_APPLY,
  ACTION_REAPPLY_IMPORTED,
  ACTION_CONFIRM_FOR_GLOBAL,
  createReviewContext,
  continueParseRun,
  reviewRowState,
  globalExecutableConcepts,
} from './fh_intake_review_lifecycle.js';
import {
  SES_PROGRAM_CODE_CONTROL,
  SES_PROGRAM_LABEL_CONTROL,
  SES_PROGRAM_PATHOLOGY_CONTROL,
  SES_PROGRAM_TARGET,
  resolveSesProgramWrite,
} from './fh_intake_ses_program.js';
import { eOrdenPresentationContext } from './fh_intake_presentation_context.js';

const STATE_VERIFIED = 'VERIFIED_EXPLICIT_CIP';
const STATE_CONFIRMED = 'MANUALLY_CONFIRMED_SELECTED_PATIENT';
const STATE_UNBOUND = 'UNBOUND';
const STATE_ASSOCIATION_CONFLICT = 'CONFLICT';
const STATE_TRANSIENT_NEW_REQUEST = ASSOCIATION_TRANSIENT_NEW_REQUEST;
/** Brownfield CIP target of the transient new-request form (issue #328). */
const TRANSIENT_CIP_TARGET = 'fhDermaCip';
const PRESALUD_CONFIRM = 'Confirmo que estos datos PreSalud corresponden al paciente seleccionado.';
const EORDEN_CONFIRM = 'Asociar esta e-Orden sin CIP al paciente seleccionado.';
const PROPOSAL_AUTO_PROPOSABLE = 'AUTO_PROPOSABLE';

/** T9 adjudicated normal-form SES program write target (brownfield). */
const SES_TARGET = 'ses_program';
const SES_CODE_CONTROL = SES_PROGRAM_CODE_CONTROL;
const SES_LABEL_CONTROL = SES_PROGRAM_LABEL_CONTROL;
const SES_PATHOLOGY_CONTROL = SES_PROGRAM_PATHOLOGY_CONTROL;

const CONCEPT_LABELS = {
  commercial_name: 'Fármaco solicitado (marca comercial)',
  requested_dose: 'Dosis solicitada',
  requested_route: 'Vía solicitada',
  requested_schedule: 'Pauta solicitada',
  requested_induction: 'Inducción solicitada',
  requested_justification: 'Justificación clínica',
  principio_activo_raw: 'Principio activo (solo origen)',
  // C1 (issue #339): D17_EXT_V1 protected clinical concepts.
  derma_hs_ihs4: 'IHS4 (Hidradenitis supurativa)',
  derma_hs_hurley: 'Hurley (Hidradenitis supurativa)',
  derma_hs_evolution_time: 'Tiempo de evolución (Hidradenitis supurativa)',
  derma_hs_location: 'Localización (Hidradenitis supurativa)',
  derma_hs_prior_doxy_clinda: 'Doxiciclina / Clindamicina previa',
  derma_hs_prior_rif_clinda: 'Rifampicina + Clindamicina previa',
  derma_hs_prior_other_antibiotics: 'Otros ATB previos',
  derma_hs_prior_other_antibiotics_detail: 'Otros ATB previos — detalle',
  derma_hs_prior_adalimumab: 'Adalimumab previo',
  derma_hs_prior_adalimumab_duration: 'Adalimumab previo — duración',
  derma_hs_prior_adalimumab_end_reason: 'Adalimumab previo — motivo de fin',
  derma_hs_prior_other_biologics: 'Otros biológicos previos',
  derma_psoriasis_pasi: 'PASI (Psoriasis)',
  derma_psoriasis_bsa: 'BSA (Psoriasis)',
  derma_psoriasis_dlqi: 'DLQI (Psoriasis)',
  derma_psoriasis_pga: 'PGA (Psoriasis)',
  derma_psoriasis_prior_systemic: 'Tratamiento sistémico previo (Psoriasis)',
  derma_psoriasis_no_systemic_reason: 'Motivo de no tratamiento sistémico (Psoriasis)',
  derma_ad_easi: 'EASI (Dermatitis atópica)',
  derma_ad_scorad: 'SCORAD (Dermatitis atópica)',
  derma_ad_dlqi_poem: 'DLQI / POEM (Dermatitis atópica)',
  derma_ad_prior_cyclosporine: 'Ciclosporina previa (Dermatitis atópica)',
  derma_ad_no_cyclosporine_reason: 'Motivo de no ciclosporina (Dermatitis atópica)',
  derma_vitiligo_extent: 'Extensión afectada (Vitíligo)',
  derma_vitiligo_facial: 'Afectación facial (Vitíligo)',
  derma_vitiligo_prior_topical_calcineurin: 'Inhibidor tópico de calcineurina previo (Vitíligo)',
  derma_vitiligo_prior_topical_steroids: 'Corticoides tópicos previos (Vitíligo)',
  derma_vitiligo_observations: 'Observaciones clínicas (Vitíligo)',
  derma_aa_extent_gt50: 'Extensión > 50 % del cuero cabelludo (Alopecia areata)',
  derma_aa_episode_gt6m: 'Episodio actual > 6 meses (Alopecia areata)',
  derma_aa_systemic_corticosteroids: 'Corticoesteroides orales sistémicos (Alopecia areata)',
  derma_aa_observations: 'Observaciones clínicas (Alopecia areata)',
  derma_comorb_bmi: 'IMC (comorbilidades)',
  derma_comorb_smoking_status: 'Tabaquismo (comorbilidades)',
  derma_comorb_pack_years: 'Paquetes/año (comorbilidades)',
  derma_comorb_diabetes: 'Diabetes (comorbilidades)',
  derma_comorb_hba1c: 'HbA1c (comorbilidades)',
  derma_comorb_metabolic_syndrome: 'Síndrome metabólico (comorbilidades)',
  derma_comorb_other: 'Otras comorbilidades (comorbilidades)',
  // C2 (issue #340): shared analítica/vacunación concepts.
  derma_lab_date: 'Fecha analítica',
  derma_lab_complete_lt3m: 'Analítica <3 meses',
  derma_cbc_verified: 'Hemograma completo (Verificado)',
  derma_biochemistry_verified: 'Bioquímica (Verificado)',
  derma_tb_screening: 'Mantoux/IGRA',
  derma_vaccination_review: 'Vacunación completa/revisada',
  derma_vaccination_observations: 'Observaciones vacunación',
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

/** Compute D5 association independently from parsing and clinical validity.
 *
 * With a selected Farmacia patient the verdicts are exactly the pre-#328 ones
 * (VERIFIED / CONFIRMED / CONFLICT / UNBOUND). Without a selected patient the
 * review is a transient NEW request: a source qualifies on its own explicit
 * data only — one explicit e-Orden CIP, or PreSalud explicit concepts (which
 * never carry a CIP) — and yields TRANSIENT_NEW_REQUEST; anything weaker
 * (CIP-less e-Orden, multiple/ambiguous/whitespace CIP, unattributed source)
 * stays UNBOUND and non-writable. The transient state never creates, selects
 * or persists a patient.
 */
export function associationForSource(unit, selectedIdentifier, confirmed = false) {
  const selected = normalizedIdentifier(selectedIdentifier);
  const key = sourceKey(unit);
  if (!selected) {
    // #328 transient new-request mode: per-concept explicit professional
    // decisions remain the only write path; no source-level confirmation is
    // offered or required here because there is no patient to confirm against.
    if (key === 'unknown') return { state: STATE_UNBOUND, reason: 'SOURCE_OWNERSHIP_UNRESOLVED' };
    if (key === 'presalud') {
      return { state: STATE_TRANSIENT_NEW_REQUEST, reason: 'PRESALUD_EXPLICIT_CONCEPTS_NEW_REQUEST' };
    }
    const cips = cipContributions(unit)
      .map(item => normalizedIdentifier(item?.value))
      .filter(Boolean);
    const hasCipLabel = String(unit?.raw ?? '').split(/\r?\n/)
      .some(line => /^\s*• CIP:/.test(line));
    if (cips.length !== 1 && hasCipLabel) {
      return { state: STATE_UNBOUND, reason: 'CIP_INVALID_MULTIPLE_OR_AMBIGUOUS' };
    }
    if (cips.length === 1) {
      return { state: STATE_TRANSIENT_NEW_REQUEST, reason: 'EXPLICIT_CIP_NEW_REQUEST' };
    }
    return { state: STATE_UNBOUND, reason: 'CIPLESS_EORDEN_REQUIRES_SELECTED_PATIENT' };
  }
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

/**
 * D5 write verdict for one association state (single shared predicate so the
 * SES row, the regular rows and the global executor can never disagree).
 * VERIFIED and CONFIRMED are the selected-patient verdicts; TRANSIENT_NEW_REQUEST
 * is emitted only by the T6 computation when no Farmacia patient is selected
 * (issue #328) and authorizes the same explicit per-concept decisions against
 * the transient new-request form, never a patient association.
 */
function associationAllowsWrite(association) {
  return Boolean(association && (
    association.state === STATE_VERIFIED
    || association.state === STATE_CONFIRMED
    || association.state === STATE_TRANSIENT_NEW_REQUEST));
}

/**
 * #328 source-CIP decision row for the transient new-request mode. Rendered
 * ONLY when no Farmacia patient is selected and exactly one unblocked e-Orden
 * unit carries one explicit CIP contribution. The explicit source CIP is
 * handled strictly as source data for the transient request: when the
 * brownfield target (#fhDermaCip) exists, an explicit professional decision
 * (confirm on empty / replace on a different value) may hydrate it; without a
 * brownfield target the CIP stays source-data only. It never creates, selects
 * or persists a patient, and PreSalud never reaches this row (no CIP
 * contributions, nothing is invented).
 */
function renderTransientRequestCip(review, selectedPatient, rerender) {
  if (selectedPatient) return null;
  const source = (review.result.units ?? []).find(unit =>
    !unit.blocked && sourceKey(unit) === 'e-orden'
    && cipContributions(unit).length === 1
    && Boolean(normalizedIdentifier(cipContributions(unit)[0]?.value)));
  if (!source) return null;
  const cipValue = normalizedIdentifier(cipContributions(source)[0]?.value);
  const target = targetControl(TRANSIENT_CIP_TARGET);

  const row = element('article', 'fh-intake-decision');
  row.dataset.fhConcept = 'cip';
  row.dataset.fhSourceValue = cipValue;
  row.dataset.fhAppliedValue = review.applied?.cip === undefined ? '' : displayValue(review.applied.cip, '');
  const heading = element('div', 'fh-intake-decision__heading');
  heading.append(element('strong', '', 'CIP de la solicitud nueva (desde la fuente e-Orden)'));
  row.appendChild(heading);
  const meta = element('p', 'fh-intake-decision__meta');
  meta.append(
    element('span', '', `Propuesta: ${cipValue}`),
    element('span', '', target ? `Destino: ${TRANSIENT_CIP_TARGET}` : 'Destino: no disponible'),
  );
  row.appendChild(meta);
  const provenance = element('small', 'fh-intake-provenance',
    'Origen e-Orden · CIP explícito de la fuente · dato de origen de la solicitud nueva, nunca una asociación de paciente');
  provenance.dataset.fhProvenance = '';
  row.appendChild(provenance);

  if (!target) {
    row.appendChild(element('p', 'fh-intake-decision__note',
      'El formulario de solicitud nueva no expone un destino CIP brownfield: el CIP permanece como dato de origen y no se escribe.'));
    return row;
  }

  const current = normalizedIdentifier(target.value);
  if (current === cipValue) {
    row.appendChild(element('p', 'fh-intake-decision__note', 'El CIP actual ya coincide con la fuente; no se reescribe nada.'));
    return row;
  }
  const kind = current ? 'replace' : 'confirm';
  const actions = element('div', 'fh-intake-decision__actions');
  const writeButton = element('button', 'btn btn-outline',
    kind === 'confirm' ? 'Confirmar y aplicar' : 'Reemplazar explícitamente');
  writeButton.type = 'button';
  writeButton.dataset.fhConceptAction = kind;
  writeButton.disabled = false;
  writeButton.setAttribute('aria-disabled', 'false');
  writeButton.addEventListener('click', () => {
    // Live re-check at execution time: the decision always acts on the LIVE
    // current value, never on a stale render.
    const liveCurrent = normalizedIdentifier(targetControl(TRANSIENT_CIP_TARGET)?.value);
    if (liveCurrent === cipValue) { rerender(); return; }
    if (liveCurrent && kind !== 'replace') { rerender(); return; }
    writeTarget(TRANSIENT_CIP_TARGET, cipValue);
    review.applied = review.applied ?? {};
    review.applied.cip = cipValue;
    rerender();
  });
  actions.appendChild(writeButton);
  const cancelButton = element('button', 'btn btn-outline', 'Cancelar');
  cancelButton.type = 'button';
  cancelButton.dataset.fhConceptAction = 'cancel';
  cancelButton.addEventListener('click', () => {
    review.cancelled = review.cancelled ?? {};
    review.cancelled.cip = true;
    rerender();
  });
  actions.appendChild(cancelButton);
  row.appendChild(actions);
  return row;
}

/* ------------------------------------------------------------------ *
 * T7/T8 per-concept decision surface (D11 / D16, issues #299/#300).  *
 * ------------------------------------------------------------------ */

function targetControl(target) {
  return document.getElementById(target);
}

    function inductionDisplay(selectValue) {
      if (selectValue === 'si') return 'SÍ';
      if (selectValue === 'no') return 'NO';
      return '';
    }

    const CHECKBOX_TRUE_TARGET_SET = new Set(D17_EXT_CHECKBOX_TARGETS);

    /**
     * C2 (issue #340): chip/radio brownfield destinations (hidden carrier + its
     * own `..._rb` radio group). The write below synchronizes the exact supported
     * UI state: the hidden carrier only moves together with its exact declared
     * radio option; without that exact option nothing is written (fail closed,
     * zero partial clinical mutation).
     */
    const CHIP_RADIO_TARGETS = new Set(['fhAnaliticaMantoux', 'fhAnaliticaVacunacion']);

    /**
     * C1 (issue #339): checkbox destinations are compared in the proposal space.
     * An explicit checkbox destination is 'SÍ' while checked and EMPTY while
     * unchecked; the closed adapter never writes a boolean false and absence of
     * source never unchecks.
     */
    function currentFormValueForTarget(target) {
      const field = targetControl(target);
      if (!field || field.value === undefined) return '';
      if (CHECKBOX_TRUE_TARGET_SET.has(target)) return field.checked ? 'SÍ' : '';
      return field.value;
    }

    /** Live DOM values expressed in the same space as reconciled proposals. */
    function currentFormValues() {
      const values = {};
      for (const concept of HYDRATABLE_CONCEPTS) {
        const target = targetForConcept(concept);
        if (target && target !== 'NONE') values[target] = currentFormValueForTarget(target);
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
      // C2 (issue #340): chip/radio destinations write the hidden carrier AND its
      // exact supported radio option together; an unsupported destination/value
      // mismatch fails closed with zero partial clinical mutation.
      if (CHIP_RADIO_TARGETS.has(target)) {
        const radio = document.querySelector(
          `input[name="${target}_rb"][value="${String(appliedText).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
        if (!radio) return;
        field.value = String(appliedText ?? '');
        radio.checked = true;
        return;
      }
  // C1 (issue #339): checkbox destinations accept only the explicit SÍ —
  // an explicit professional decision writes checked=true; the adapter
  // never writes false and never unchecks (absence never clears).
  if (CHECKBOX_TRUE_TARGET_SET.has(target)) {
field.checked = true;
return;
  }
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
     * T9 SES Program normal-form write setter (D1a/D7/D12). Called by the
 * ses_program decision row ONLY after a coherent allowlist pair passed
 * `resolveSesProgramWrite`. It writes:
 *   - the declared visible brownfield value into fhDermaPatologia;
 *   - the verbatim canonical code/label into the adjudicated normal-form
 *     controls fhDermaSesProgramCode / fhDermaSesProgramLabel.
 * The three writes fire input+change so the existing page-draft binder
 * (bindPageDraft on main.main-content) persists them under the existing
 * draft contract (the controls are id-bearing draft-eligible inputs).
 * @param {{code:string,label:string,visible:string}} resolved coherent pair
 */
function writeSesProgramSet(resolved) {
  const pathology = targetControl(SES_PATHOLOGY_CONTROL);
  const codeField = targetControl(SES_CODE_CONTROL);
  const labelField = targetControl(SES_LABEL_CONTROL);
  if (!pathology || !codeField || !labelField) {
    return { written: false, reason: 'SES_WRITE_TARGET_MISSING' };
  }
  const options = pathology.options ? Array.from(pathology.options) : [];
  const option = options.find(candidate => candidate.textContent === resolved.visible && candidate.value !== '');
  if (!option) {
    return { written: false, reason: 'SES_VISIBLE_OPTION_MISSING' };
  }
  const write = (el, value) => {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  write(pathology, option.value);
  write(codeField, resolved.code);
  write(labelField, resolved.label);
  return { written: true };
}

/**
 * D5 write gate: map every safe proposal contribution of a concept to the
 * association state of its OWN source unit. Each source passes its own gate;
 * an associated source never authorizes another source (mixed input, D5).
 */
function contributionAssociations(review, conceptName, selectedPatient) {
  const reconciled = review.result.reconciled?.concepts?.[conceptName];
  if (!reconciled) return [];
  const proposals = (reconciled.contributions ?? []).filter(item =>
    item?.proposal_status === PROPOSAL_AUTO_PROPOSABLE
    && item?.target === (conceptName === SES_PROGRAM_TARGET ? SES_TARGET : targetForConcept(reconciled.concept))
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

    /**
     * C1 (issue #339): LIVE clinical-gate context for one concept. The accepted
     * pathology is the LIVE #fhDermaPatologia value; the parent condition is the
     * LIVE current value of the parent target in the same proposal space used by
     * the D16 comparison (checkbox parents read as 'SÍ'/'').
     */
    function d17ExtGateContext(conceptName) {
      const parent = parentConditionFor(conceptName);
      return {
        pathologyValue: targetControl('fhDermaPatologia')?.value ?? '',
        parentValue: parent ? currentFormValueForTarget(targetForConcept(parent.concept)) : undefined,
      };
    }

    /** C1 clinical gate for a concept, or null when the concept is not C1/gated. */
    function liveD17ExtGate(conceptName) {
      if (!D17_EXT_HYDRATABLE_CONCEPTS.includes(conceptName)) return null;
      return d17ExtGate(conceptName, d17ExtGateContext(conceptName));
    }

    /**
     * D16/T8 global apply EXECUTOR ("Aplicar confirmados"). Executes exactly the
 * subset of concepts that already received an explicit staged professional
 * decision AND are still eligible against the LIVE current value and LIVE D5
 * association states at execution time. It never decides, never bulk-replaces,
 * never blanket-confirms and never touches PROTECTED_EXISTING without an
 * explicit replace, CONFLICT, REQUIRES_SELECTION, NO_PROPOSAL,
 * ALREADY_MATCHES_CURRENT or a manual edit after apply (that lifecycle path
 * requires the explicit per-concept REAPPLY_IMPORTED action).
 */
function executeGlobalApply(review, selectedPatient) {
  const executable = globalExecutableConcepts(
    review,
    review.result.reconciled?.concepts ?? {},
    (conceptName) => currentFormValues()[targetForConcept(conceptName)],
    (conceptName) => contributionAssociations(review, conceptName, selectedPatient),
  );
  // C1 (issue #339): parents execute before children so a coherently staged
  // parent+child pair applies within one explicit execution pass; a child
  // whose parent is not satisfied at its LIVE execution moment is skipped
  // (stale/denied parent blocks child). sort() is stable in JavaScript.
  const parentDepth = (conceptName) => (parentConditionFor(conceptName) ? 1 : 0);
  executable.sort((a, b) => parentDepth(a.concept) - parentDepth(b.concept));
  const results = [];
  for (const item of executable) {
    const reconciled = review.result.reconciled?.concepts?.[item.concept];
    if (!reconciled) continue;
    // C1 closed clinical gates, re-checked live at execution time.
    const liveGate = liveD17ExtGate(item.concept);
    if (liveGate) {
      results.push({ concept: item.concept, ok: false, reason: liveGate.code });
      continue;
    }
    const target = targetForConcept(reconciled.concept);
    const applied = applyConcept({
      reconciled,
      currentValue: currentFormValues()[target],
      associationStates: contributionAssociations(review, item.concept, selectedPatient),
      action: item.action,
      write: writeTarget,
    });
    if (applied.applied) {
      review.applied[item.concept] = applied.appliedValue;
      delete review.staged?.[item.concept];
      results.push({ concept: item.concept, ok: true, value: applied.appliedValue });
    } else {
      results.push({ concept: item.concept, ok: false, reason: applied.reason });
    }
  }
  return results;
}

function renderGlobalApply(review, selectedPatient, rerender, statusHost) {
  const stagedCount = Object.keys(review.staged ?? {}).length;
  const box = element('section', 'fh-intake-global-apply');
  box.appendChild(element('h4', '', 'Aplicar confirmados (global)'));
  box.appendChild(element('p', 'fh-intake-decision__note',
    'Ejecutor únicamente: aplica solo los conceptos con propuesta aplicable que ya recibieron una decisión profesional explícita y siguen siendo elegibles ahora. Nunca decide, nunca reemplaza en bloque y nunca toca PROTECTED_EXISTING sin reemplazo explícito, CONFLICT, REQUIRES_SELECTION, NO_PROPOSAL ni ediciones manuales tras apply.'));
  if (stagedCount) {
    const stagedList = element('ul', 'fh-intake-global-staged');
    for (const concept of Object.keys(review.staged ?? {})) {
      stagedList.appendChild(element('li', '', `${CONCEPT_LABELS[concept] || concept} (${review.staged[concept]})`));
    }
    box.appendChild(stagedList);
  }
  const actions = element('div', 'fh-intake-decision__actions');
  const applyButton = element('button', 'btn btn-primary', 'Aplicar confirmados');
  applyButton.type = 'button';
  applyButton.dataset.fhIntakeGlobalApply = '';
  applyButton.disabled = stagedCount === 0;
  applyButton.setAttribute('aria-disabled', String(applyButton.disabled));
  applyButton.addEventListener('click', () => {
    const results = executeGlobalApply(review, selectedPatient);
    rerender();
    const ok = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    if (statusHost) {
      statusHost.appendChild(element('p', 'fh-intake-global-result',
        ok.length
          ? `Aplicados por el ejecutor global: ${ok.map(r => CONCEPT_LABELS[r.concept] || r.concept).join(', ')}.`
          : 'No se aplicó ningún concepto: ninguno seguía siendo elegible en el momento de ejecución.'));
      if (failed.length) {
        statusHost.appendChild(element('p', 'fh-intake-global-result',
          `Omitidos en la ejecución (dejaron de ser elegibles): ${failed.map(r => CONCEPT_LABELS[r.concept] || r.concept).join(', ')}.`));
      }
    }
  });
  actions.appendChild(applyButton);
  box.appendChild(actions);
  return box;
}

    function renderConcept(review, conceptName, selectedPatient, rerender) {
      if (conceptName === SES_PROGRAM_TARGET) return renderSesProgramConcept(review, selectedPatient, rerender);
      return renderRegularConcept(review, conceptName, selectedPatient, rerender);
    }

    /**
     * T9 SES Program decision row (D1a / #301). Rendered through the same
     * per-concept lifecycle surface as the T7/T8 rows:
     *   - coherent allowlist pair (AUTO_PROPOSABLE proposal): shows code+label
     *     together; a single explicit professional confirm (CURRENT_EMPTY) or
     *     replace (PROTECTED_EXISTING) writes the declared visible value into
     *     fhDermaPatologia AND the canonical code/label into the adjudicated
     *     normal-form controls;
     *   - invalid pair (unknown / out-of-allowlist / mismatched / incomplete):
     *     the write boundary is closed — no writable action is offered, the
     *     structured SES_* reason is visible, and nothing is written.
     */
    function renderSesProgramConcept(review, selectedPatient, rerender) {
      const reconciled = review.result.reconciled?.concepts?.[SES_PROGRAM_TARGET];
      if (!reconciled) return null;
      if (review.cancelled[SES_PROGRAM_TARGET]) return null;
      const proposalValue = reconciled.value ?? (reconciled.contributions ?? [])
        .find(item => item?.value && typeof item.value === 'object')?.value ?? null;
      const resolved = resolveSesProgramWrite(proposalValue);

      const row = element('article', 'fh-intake-decision');
      row.dataset.fhConcept = SES_PROGRAM_TARGET;
      row.dataset.fhSourceValue = proposalValue && typeof proposalValue === 'object'
        ? [proposalValue.code, proposalValue.label].filter(Boolean).join(' · ')
        : displayValue(proposalValue, '');
      row.dataset.fhAppliedValue = review.applied[SES_PROGRAM_TARGET] === undefined
        ? '' : displayValue(review.applied[SES_PROGRAM_TARGET], '');

      const heading = element('div', 'fh-intake-decision__heading');
      heading.append(element('strong', '', 'Programa SES'));
      const proposalText = proposalValue && typeof proposalValue === 'object'
        ? [proposalValue.code, proposalValue.label].filter(Boolean).join(' · ')
        : '';
      if (!resolved.writable) {
        heading.append(element('span', 'status-badge', STATE_NO_PROPOSAL));
        row.appendChild(heading);
        row.appendChild(element('p', 'fh-intake-decision__note',
          `Programa SES no aplicable: ${resolved.reason}. No se escribe ningún valor.`));
        if (proposalText) {
          row.appendChild(element('p', 'fh-intake-decision__note', `Origen: ${proposalText}`));
        }
        return row;
      }

      const codeControl = targetControl(SES_CODE_CONTROL);
      const current = codeControl && codeControl.value ? codeControl.value : '';
      const state = resolved.code && current === resolved.code
        ? STATE_ALREADY_MATCHES_CURRENT
        : (isEmptySesCurrent(current) ? STATE_CURRENT_EMPTY : STATE_PROTECTED_EXISTING);
      const manualEdit = state === STATE_PROTECTED_EXISTING
        && hasReviewAppliedSes(review)
        && !sesAppliedMatchesLive(review, current);

      const badges = manualEdit
        ? [STATE_MANUALLY_EDITED_AFTER_APPLY, STATE_PROTECTED_EXISTING]
        : [state];
      for (const badge of badges) heading.append(element('span', 'status-badge', badge));
      row.appendChild(heading);
      const meta = element('p', 'fh-intake-decision__meta');
      meta.append(
        element('span', '', `Propuesta: ${proposalText}`),
        element('span', '', `Destino: ${SES_PROGRAM_TARGET} (visible + normal-form code/label)`),
      );
      row.appendChild(meta);
      for (const contribution of reconciled.contributions ?? []) {
        const provenance = element('small', 'fh-intake-provenance',
          `Origen ${contribution.provenance?.source || contribution.source || 'desconocido'} · ${contribution.semantic_status || 'SIN_ESTADO'}`);
        provenance.dataset.fhProvenance = '';
        row.appendChild(provenance);
      }

      if (state === STATE_ALREADY_MATCHES_CURRENT) {
        row.appendChild(element('p', 'fh-intake-decision__note',
          'El Programa SES actual ya coincide con la propuesta; no se reescribe nada.'));
        return row;
      }

      const associations = contributionAssociations(review, SES_PROGRAM_TARGET, selectedPatient);
      const eligible = associations.length > 0 && associations.every(associationAllowsWrite);
      const decisionKind = state === STATE_CURRENT_EMPTY ? 'confirm' : 'replace';
      const actions = element('div', 'fh-intake-decision__actions');
      if (!eligible) {
        row.appendChild(element('p', 'fh-intake-decision__note',
          'Escritura bloqueada por gate D5: no hay una asociación de fuente elegible.'));
      }
      if (manualEdit) {
        row.appendChild(element('p', 'fh-intake-decision__note',
          'Edición manual tras apply: nada se sobrescribe sin una acción profesional explícita.'));
      }
      for (const item of [
        { kind: decisionKind, label: decisionKind === 'replace'
            ? 'Reemplazar explícitamente' : 'Confirmar y aplicar', enabled: eligible },
        { kind: 'cancel', label: 'Cancelar', enabled: true },
      ]) {
        const button = element('button', 'btn btn-outline', item.label);
        button.type = 'button';
        button.dataset.fhConceptAction = item.kind;
        button.disabled = !item.enabled;
        button.setAttribute('aria-disabled', String(button.disabled));
        button.addEventListener('click', () => {
          if (item.kind === 'cancel') {
            review.cancelled[SES_PROGRAM_TARGET] = true;
            rerender();
            return;
          }
          const resolvedLive = resolveSesProgramWrite(proposalValue);
          const liveCode = targetControl(SES_CODE_CONTROL);
          const liveCurrent = liveCode && liveCode.value ? liveCode.value : '';
          const liveAssociations = contributionAssociations(review, SES_PROGRAM_TARGET, selectedPatient);
          const stillEligible = resolvedLive.writable && liveAssociations.length > 0
            && liveAssociations.every(associationAllowsWrite);
          const liveState = resolvedLive.code && liveCurrent === resolvedLive.code
            ? STATE_ALREADY_MATCHES_CURRENT
            : (isEmptySesCurrent(liveCurrent) ? STATE_CURRENT_EMPTY : STATE_PROTECTED_EXISTING);
          if (!stillEligible) { rerender(); return; }
          if (liveState === STATE_ALREADY_MATCHES_CURRENT) { rerender(); return; }
          if (item.kind === 'replace' && liveState !== STATE_PROTECTED_EXISTING) { rerender(); return; }
          const writeResult = writeSesProgramSet(resolvedLive);
          if (!writeResult.written) {
            row.querySelector('[data-fh-ses-write-failure]')?.remove();
            const message = writeResult.reason === 'SES_VISIBLE_OPTION_MISSING'
              ? 'Escritura bloqueada de forma segura: falta la opción visible declarada del Programa SES.'
              : 'Escritura bloqueada de forma segura: falta un destino declarado del Programa SES.';
            const note = element('p', 'fh-intake-decision__note', message);
            note.dataset.fhSesWriteFailure = writeResult.reason;
            row.appendChild(note);
            return;
          }
          review.applied[SES_PROGRAM_TARGET] = `${resolvedLive.code} · ${resolvedLive.label}`;
          rerender();
        });
        actions.appendChild(button);
      }
      row.appendChild(actions);
      return row;
    }

    function isEmptySesCurrent(value) {
      return value === undefined || value === null || String(value).trim() === '';
    }

    function hasReviewAppliedSes(review) {
      return Boolean(review && typeof review === 'object'
        && Object.prototype.hasOwnProperty.call(review.applied ?? {}, SES_PROGRAM_TARGET));
    }

    function sesAppliedMatchesLive(review, currentCode) {
      const applied = review.applied?.[SES_PROGRAM_TARGET];
      if (typeof applied !== 'string' || !currentCode) return false;
      return applied.split(' · ')[0] === currentCode;
    }

    function renderRegularConcept(review, conceptName, selectedPatient, rerender) {
      const reconciled = review.result.reconciled?.concepts?.[conceptName];
  if (!reconciled) return null;
  const target = targetForConcept(reconciled.concept);
  if (target === 'NONE' && conceptName !== 'principio_activo_raw') return null;
  if (review.cancelled[conceptName]) return null;

      const current = currentFormValues()[target];
      // D11: the row state is the D16 per-concept protection state, extended with
      // the manual-edit-after-apply signal when this review applied the concept and
      // the live current value no longer equals the recorded applied value.
      const state = reviewRowState(review, reconciled, conceptName, current);
      const manualEdit = state === STATE_MANUALLY_EDITED_AFTER_APPLY;
      // C1 (issue #339): closed clinical gates (pathology coherence + parent
      // condition) are evaluated against the LIVE form at render time and
      // re-checked live at click/execution time.
      const gate = liveD17ExtGate(conceptName);

  const row = element('article', 'fh-intake-decision');
  row.dataset.fhConcept = conceptName;
      const proposal = reconciled.value ?? (reconciled.contributions ?? []).find(item => item?.value !== null && item?.value !== undefined)?.value;
      // C1 closed-adapter rejection: the proposal value exists but the closed
      // destination adapter rejects it (non-strict numeric text, non-contract
      // enum, non-explicit checkbox value). Nothing is written or coerced; the
      // row stays visible with the write boundary closed.
      const adapterBlock = state === STATE_NO_PROPOSAL
        && D17_EXT_HYDRATABLE_CONCEPTS.includes(conceptName)
        && proposal !== null && proposal !== undefined
        && !adaptD17ExtControlValue(conceptName, displayValue(proposal, '')).ok;
      row.dataset.fhSourceValue = displayValue(proposal, '');
  row.dataset.fhAppliedValue = review.applied[conceptName] === undefined ? '' : displayValue(review.applied[conceptName], '');

  const heading = element('div', 'fh-intake-decision__heading');
  heading.append(element('strong', '', CONCEPT_LABELS[conceptName] || conceptName));
  // A manual edit after apply is surfaced as its own lifecycle badge alongside
  // the underlying D16 PROTECTED_EXISTING state, so the row states both facts.
  const badges = manualEdit ? [STATE_MANUALLY_EDITED_AFTER_APPLY, STATE_PROTECTED_EXISTING] : [state];
  for (const badge of badges) heading.append(element('span', 'status-badge', badge));
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
        if (adapterBlock) {
          row.appendChild(element('p', 'fh-intake-decision__note',
            'Cierre C1: el valor de la fuente no es compatible con el destino cerrado (sin conversión de coma a punto, sin unidades, sin redondeo ni umbral). Nada se escribe.'));
          const blockedActions = element('div', 'fh-intake-decision__actions');
          const blockedConfirm = element('button', 'btn btn-outline', 'Confirmar y aplicar');
          blockedConfirm.type = 'button';
          blockedConfirm.dataset.fhConceptAction = 'confirm';
          blockedConfirm.disabled = true;
          blockedConfirm.setAttribute('aria-disabled', 'true');
          blockedActions.appendChild(blockedConfirm);
          const blockedCancel = element('button', 'btn btn-outline', 'Cancelar');
          blockedCancel.type = 'button';
          blockedCancel.dataset.fhConceptAction = 'cancel';
          blockedCancel.addEventListener('click', () => {
            review.cancelled[conceptName] = true;
            rerender();
          });
          blockedActions.appendChild(blockedCancel);
          row.appendChild(blockedActions);
        }
        return row;
      }

  const associations = contributionAssociations(review, conceptName, selectedPatient);
  const eligibility = writeEligibility(reconciled, current, associations);
  // C1 (issue #339): the closed clinical gates AND into every writable action.
  const writableWithGates = eligibility.writable && !gate;
  const decisions = [];
  if (manualEdit) {
    // D11: only the explicit professional action REAPPLY_IMPORTED may restore
    // the imported value over a manual edit; prior authorization is never
    // inherited. The action records a NEW authorization.
    row.appendChild(element('p', 'fh-intake-decision__note',
      'Edición manual tras apply: el valor actual difiere del aplicado en esta revisión. Nada se sobrescribe sin una acción profesional explícita.'));
    row.appendChild(element('p', 'fh-intake-decision__note',
      'Acción profesional explícita requerida: REAPPLY_IMPORTED. La autorización previa no se hereda.'));
    decisions.push({
      kind: ACTION_REAPPLY_IMPORTED,
      label: 'Reaplicar valor importado (nueva autorización)',
      enabled: writableWithGates,
    });
  } else if (state === STATE_CURRENT_EMPTY) {
    decisions.push({ kind: 'confirm', label: 'Confirmar y aplicar', enabled: writableWithGates });
    decisions.push({
      kind: ACTION_CONFIRM_FOR_GLOBAL,
      label: 'Preparar para Aplicar confirmados (no escribe todavía)',
      enabled: writableWithGates && !review.staged?.[conceptName],
    });
  } else if (state === STATE_PROTECTED_EXISTING) {
    decisions.push({ kind: 'replace', label: 'Reemplazar explícitamente', enabled: writableWithGates });
    decisions.push({
      kind: ACTION_CONFIRM_FOR_GLOBAL,
      label: 'Preparar reemplazo para Aplicar confirmados (no escribe todavía)',
      enabled: writableWithGates && !review.staged?.[conceptName],
    });
  }
  decisions.push({ kind: 'cancel', label: 'Cancelar', enabled: true });
  if (!eligibility.writable) {
    row.appendChild(element('p', 'fh-intake-decision__note', `Escritura bloqueada por gate D5/D16: ${eligibility.reason}`));
  }
  if (gate) {
    row.appendChild(element('p', 'fh-intake-decision__note', `Escritura bloqueada por gate clínico C1 (${gate.code}): ${gate.message}`));
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
        delete review.staged?.[conceptName];
        rerender();
        return;
      }
      if (item.kind === ACTION_CONFIRM_FOR_GLOBAL) {
        // Staging records the explicit professional decision only; the global
        // executor (never this button) performs the write.
        review.staged = review.staged ?? {};
        review.staged[conceptName] = state === STATE_PROTECTED_EXISTING ? 'replace' : 'confirm';
        rerender();
        return;
      }
      const liveCurrent = currentFormValues()[target];
      const liveAssociations = contributionAssociations(review, conceptName, selectedPatient);
      // C1 (issue #339): clinical gates re-checked LIVE at execution time —
      // a stale or denied pathology/parent never authorizes the child write.
      const liveGate = liveD17ExtGate(conceptName);
      if (liveGate) { rerender(); return; }
      // REAPPLY_IMPORTED writes the imported proposal value as a NEW explicit
      // authorization over a manual edit; it is executed as the D16 replace
      // decision on the protected state.
      const result = applyConcept({
        reconciled,
        currentValue: liveCurrent,
        associationStates: liveAssociations,
        action: item.kind === ACTION_REAPPLY_IMPORTED ? 'replace' : item.kind,
        write: writeTarget,
      });
      if (result.applied) {
        review.applied[conceptName] = result.appliedValue;
        delete review.staged?.[conceptName];
      }
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
      patientStatus.textContent = selectedPatient
        ? `Paciente seleccionado: ${selectedPatient}`
        : 'Sin paciente de Farmacia seleccionado · solicitud nueva transitoria (la hidratación explícita no crea, selecciona ni persiste pacientes)';
  applyButton.disabled = true;
  applyButton.setAttribute('aria-disabled', 'true');
  applyButton.title = 'T8 aplica mediante decisiones explícitas por concepto; el control global ejecuta solo lo ya confirmado';

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

  // WO #334: transient e-Orden presentation context (issue #334). For a NEW
  // REQUEST without a selected Farmacia patient, one safe explicit
  // Dermatology pathology recognized from the e-Orden source reveals the
  // matching clinical form blocks WITHOUT pre-writing fhDermaPatologia.
  // PRESENTATION ONLY: never patient association, persistence, validation
  // or any clinical write. With a selected patient the D5/D6 patient gates
  // stay untouched and no override is applied. Anything unsafe (PreSalud
  // only, malformed, ambiguous, conflicting, blocked) clears the context
  // and restores the ordinary brownfield visibility state.
  const applyPresentationContext = (result) => {
    const bridge = window.FarmaciaValidacion;
    if (!bridge || typeof bridge.setEOrdenPresentation !== 'function') return;
    const context = selectedPatient ? null : eOrdenPresentationContext(result);
    bridge.setEOrdenPresentation(context ?? null);
    if (!context && !selectedPatient) preparePreviewForm();
  };

  function render() {
    panel.replaceChildren();
    if (!review) { panel.hidden = true; return; }
    panel.hidden = false;
    // T8 lifecycle identity: one intake_review_id per review session; every
    // parse execution (including reparses of the same input) carries a fresh
    // parse_run_id. Reparse never re-applies by itself (D11).
    panel.dataset.fhIntakeReviewId = review.intake_review_id;
    panel.dataset.fhParseRunId = review.parse_run_id;
    panel.appendChild(element('p', 'fh-intake-lifecycle',
      `Revisión ${review.intake_review_id} · Ejecución de análisis ${review.parse_run_id}`));
    panel.appendChild(element('p', 'notice-box notice-box--info',
      'Vista previa con aplicación explícita por concepto. Asociar o confirmar una fuente no valida el tratamiento; el tratamiento validado permanece intacto. Sin paciente seleccionado la revisión opera como solicitud nueva transitoria: no crea, selecciona ni persiste pacientes.'));
    for (const unit of review.result.units ?? []) {
      const key = sourceKey(unit);
      const confirmed = Boolean(review.confirmations[key]);
      const association = associationForSource(unit, selectedPatient, confirmed);
      panel.appendChild(renderSource(unit, association, confirmed, () => {
        review.confirmations[key] = true;
        render();
      }, selectedPatient));
    }
    if (!review.cancelled?.cip) {
      const transientCipRow = renderTransientRequestCip(review, selectedPatient, render);
      if (transientCipRow) panel.appendChild(transientCipRow);
    }
    const concepts = review.result.reconciled?.concepts ?? {};
    const decisionConcepts = Object.keys(concepts).filter(concept =>
      HYDRATABLE_CONCEPTS.includes(concept) || concept === 'principio_activo_raw' || concept === SES_PROGRAM_TARGET
    );
    if (decisionConcepts.length) {
      panel.appendChild(element('h3', 'fh-intake-decision__title', 'Decisiones por concepto'));
      for (const concept of decisionConcepts) {
        const row = renderConcept(review, concept, selectedPatient, render);
        if (row) panel.appendChild(row);
      }
      // D16: global apply is an EXECUTOR ONLY over already explicitly staged
      // professional decisions. It never decides, never bulk-replaces, never
      // blanket-confirms and never touches protected/manual-edit concepts.
      panel.appendChild(renderGlobalApply(review, selectedPatient, render, panel));
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
    delete panel.dataset.fhIntakeReviewId;
    delete panel.dataset.fhParseRunId;
    // WO #334: reset/abandon clears the transient e-Orden presentation
    // context and restores the ordinary brownfield/manual visibility state.
    if (window.FarmaciaValidacion && typeof window.FarmaciaValidacion.setEOrdenPresentation === 'function') {
      window.FarmaciaValidacion.setEOrdenPresentation(null);
    }
    if (!selectedPatient) preparePreviewForm();
    if (clearInput) input.value = '';
    render();
  }

  // D11/T8 lifecycle: a new preview is either the start of a brand-new review
  // (fresh intake_review_id + zero inherited confirmations/applied history) or
  // a NEW parse run inside the existing review. Re-interpreting the same input
  // NEVER re-applies: it re-evaluates every concept against the live current
  // form, which is how MANUALLY_EDITED_AFTER_APPLY is detected after the user
  // edited an applied field.
  previewButton.addEventListener('click', () => {
    preparePreviewForm();
    const raw = input.value;
    if (!review) {
      review = createReviewContext(raw);
    } else {
      continueParseRun(review, raw);
    }
    review.result = runUnifiedIntake(raw, { currentFormValues: currentFormValues() });
    render();
    applyPresentationContext(review.result);
  });
  // D11: the editable form is NOT the review's own surface. Editing a field
  // after apply must NOT discard the review: the applied history is the only
  // way to detect MANUALLY_EDITED_AFTER_APPLY on the next parse. The review is
  // discarded only by an explicit reset/abandon.
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
