#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_export_v2_core.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(ROOT, 'scripts/farmacia_export_v2_validation_adapter.js'), 'utf8');
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox);
vm.runInContext(adapterSource, sandbox);
const core = sandbox.FarmaciaExportV2Core;
const adapter = sandbox.FarmaciaExportV2ValidationAdapter;

const expectedApi = [
  'ADAPTER_VERSION', 'buildValidationEvent', 'buildValidationProjection', 'validateValidationInput',
  'normalizeTriState', 'normalizeTbStatus', 'normalizeSerologyStatus', 'normalizeVaccinationStatus',
  'normalizeValidationResult', 'normalizeValidatedTreatmentRelation'
].sort();
assert.deepEqual(Object.keys(adapter).sort(), expectedApi, 'exact public API');
assert.equal(adapter.ADAPTER_VERSION, '1.0.0-draft.1');
assert.doesNotMatch(adapterSource, /document\.|localStorage|sessionStorage|fetch\(|XMLHttpRequest|Date\.|new Date|Math\.random|crypto\./, 'adapter remains pure');

const treatment = {
  drugName: 'Tratamiento sintético A', activeIngredient: 'Activo sintético', presentation: '100 mg pluma', doseText: '100 mg', route: 'SC',
  scheduleCode: 'CADA_4_SEMANAS', scheduleLabel: 'Cada 4 semanas', scheduleOtherText: null, inductionStatus: 'si',
  selectedDrugId: 'SYN-DRUG-1', catalogSource: 'CIMA', nationalCode: '700001', registrationNumber: 'SYN/1'
};
function baseInput() {
  return {
    technical: {
      eventId: 'evt-validation-syn-1', sourceEventId: 'src-validation-syn-1', rowKey: 'validation-main', validationId: 'val-syn-1',
      patientId: 'patient-syn-1', occurredAt: '2026-08-02', recordedAt: '2026-08-02T10:00:00Z', demoFlag: true, eventStatus: 'completed',
      requestId: 'req-syn-1', hospitalCode: 'H-SYN', professionalRef: 'prof-syn', identifierSystem: 'urn:synthetic',
      validatedTreatmentId: 'treatment-syn-1', validatedLineId: 'line-syn-1', lineCreationStatus: 'created',
      prebiologicRequired: 'si', prebiologicOverallStatus: 'ready', preventiveMedicineStatus: 'reviewed', validationBlockers: []
    },
    context: { identifierValue: 'CIP-SYN-1', serviceCode: 'DERM', serviceLabel: 'Dermatología', pathologyCode: 'SYN-HS', pathologyLabel: 'Hidradenitis supurativa', professionalDisplay: 'Profesional demo' },
    request: { origin: 'manual_farmacia', date: '2026-08-01', validationType: 'inicio_nuevo', appointmentDate: '2026-08-03', weightText: '70 kg', justification: 'Justificación sintética', sourceObservations: null },
    requestedTreatment: { ...treatment },
    decision: { result: 'validado', pendingReason: null, denialReason: null, pharmacyObservations: 'Revisión sintética', otherObservations: null, validatedTreatmentRelation: 'same_as_requested' },
    validatedTreatment: { ...treatment },
    prebiologic: { analysisDate: '2026-08-01', analysisRecentStatus: 'si', hemogramVerified: true, biochemistryVerified: null, tbStatus: 'Negativo', hbvStatus: 'Negativo', hcvStatus: 'Pendiente', hivStatus: null, vaccinationStatus: 'si', vaccinationObservations: null },
    comorbidities: { recurrentInfectionsStatus: '', cardiovascularRiskStatus: 'no', neurologicDisorderStatus: null, neoplasiaHistoryOrRiskStatus: 'si' },
    clinicalObservations: [
      { code: 'hs_ihs4', value: 0, source: 'validation_origin_form', pathology_label: 'Hidradenitis supurativa', unit: 'points', display: 'IHS4' },
      { code: 'hs_previous_antibiotic', value: false, source: 'validation_origin_form', pathology_label: 'Hidradenitis supurativa' }
    ],
    relatedTreatments: [
      { source_row_uid: 'other-1', relation_type: 'Concomitante', drug_name: 'Relacionado A' },
      { source_row_uid: 'other-2', relation_type: 'Exposición', drug_name: 'Relacionado B' }
    ]
  };
}

const input = baseInput();
const before = JSON.stringify(input);
const validInputResult = adapter.validateValidationInput(input);
assert.equal(validInputResult.valid, true, 'valid input');
assert.equal(validInputResult.errors.length, 0, 'valid input has no errors');
assert.equal(JSON.stringify(input), before, 'validation does not repair/mutate');
const event = adapter.buildValidationEvent(input);
assert.equal(event.event_type, 'pharmacy_validation');
assert.equal(event.validation_result, 'validated');
assert.equal(event.requested_drug_name, treatment.drugName);
assert.equal(event.validated_drug_name, treatment.drugName);
assert.equal(event.identifier_value, 'CIP-SYN-1');
assert.equal(event.request_date, '2026-08-01');
assert.equal(event.pharmacy_appointment_date, '2026-08-03');
assert.equal(event.occurred_at, '2026-08-02');
assert.equal(event.analysis_recent_status, 'yes');
assert.equal(event.hemogram_verified, true);
assert.equal(event.biochemistry_verified, null, 'unchecked checkbox stays null');
assert.equal(event.tb_status, 'negative');
assert.equal(event.hcv_status, 'pending');
assert.equal(event.recurrent_infections_status, null);
assert.equal(event.cardiovascular_risk_status, 'no');
assert.equal(event.clinical_observations_json[0].value, 0, 'clinical zero preserved');
assert.equal(event.clinical_observations_json[1].value, false, 'clinical false preserved');
assert.equal(event.related_treatments_json.length, 2, '1:N treatments preserved');
assert.equal(event.adverse_event_id, undefined, 'adapter does not invent adverse-event data');

const projection = adapter.buildValidationProjection(input);
assert.equal(projection.rows.length, 1);
assert.equal(projection.row.row_role, 'validation');
assert.equal(projection.row.bridge_status, 'PENDIENTE');
assert.equal(projection.row.row_id, core.buildRowId(input.technical.sourceEventId, 'validation', input.technical.rowKey));
assert.equal(projection.row.adverse_event_status, null);
assert.equal(projection.row.causality_assessments_json, null);
const rowResult = core.validateRow(projection.row);
assert.equal(rowResult.valid, true);
assert.equal(rowResult.errors.length, 0);
assert.equal(core.stableStringify(core.parseTsvRows(projection.tsv)), core.stableStringify(projection.rows), 'projection TSV reversible');

const missing = baseInput();
delete missing.technical.eventId;
assert.equal(adapter.validateValidationInput(missing).valid, false, 'missing technical context rejected');
assert.throws(() => adapter.buildValidationEvent(missing), (error) => error.name === 'FarmaciaExportV2ValidationAdapterError' && error.code === 'INVALID_VALIDATION_INPUT' && Array.isArray(error.details));

const mismatch = baseInput();
mismatch.validatedTreatment.doseText = '200 mg';
assert.ok(adapter.validateValidationInput(mismatch).errors.some((error) => error.code === 'SAME_AS_REQUESTED_MISMATCH'));
const addedMetadata = baseInput();
delete addedMetadata.requestedTreatment.registrationNumber;
assert.ok(adapter.validateValidationInput(addedMetadata).errors.some((error) => error.code === 'SAME_AS_REQUESTED_MISMATCH'), 'metadata/key additions are mismatches');
const omittedVersusNull = baseInput();
delete omittedVersusNull.requestedTreatment.scheduleOtherText;
omittedVersusNull.validatedTreatment.scheduleOtherText = null;
assert.equal(adapter.validateValidationInput(omittedVersusNull).valid, true, 'omitted and null are the same contractual absence');
const explicitMetadataAddition = baseInput();
delete explicitMetadataAddition.requestedTreatment.nationalCode;
explicitMetadataAddition.validatedTreatment.nationalCode = '700999';
assert.ok(adapter.validateValidationInput(explicitMetadataAddition).errors.some((error) => error.code === 'SAME_AS_REQUESTED_MISMATCH'), 'explicit metadata addition remains invalid');
const unknownTreatmentAddition = baseInput();
unknownTreatmentAddition.validatedTreatment.inferredDose = 'not allowed';
assert.ok(adapter.validateValidationInput(unknownTreatmentAddition).errors.some((error) => error.code === 'UNKNOWN_FIELD'), 'unknown treatment additions are rejected');
const unknownTechnical = baseInput();
unknownTechnical.technical.generatedAt = '2026-08-02';
assert.ok(adapter.validateValidationInput(unknownTechnical).errors.some((error) => error.code === 'UNKNOWN_FIELD'), 'technical allowlist is closed');

function expectInvalid(mutator, label, expectedCode) {
  const candidate = baseInput();
  mutator(candidate);
  const snapshot = JSON.stringify(candidate);
  const result = adapter.validateValidationInput(candidate);
  assert.equal(result.valid, false, label);
  if (expectedCode) assert.ok(result.errors.some((error) => error.code === expectedCode), `${label}: ${expectedCode}`);
  assert.equal(JSON.stringify(candidate), snapshot, `${label}: validator does not mutate`);
  return candidate;
}

expectInvalid((value) => { value.technical.eventId = { injected: true }; }, 'technical scalar rejects object', 'INVALID_TYPE');
expectInvalid((value) => { value.technical.demoFlag = 'true'; }, 'demoFlag rejects string boolean', 'INVALID_TYPE');
expectInvalid((value) => { value.technical.validationBlockers = {}; }, 'validationBlockers requires explicit array', 'INVALID_TYPE');
expectInvalid((value) => { value.context.pathologyLabel = ['HS']; }, 'context scalar rejects array', 'INVALID_TYPE');
expectInvalid((value) => { value.request.date = { value: '2026-08-01' }; }, 'request scalar rejects object', 'INVALID_TYPE');
expectInvalid((value) => { value.requestedTreatment.doseText = ['100 mg']; }, 'requested treatment scalar rejects array', 'INVALID_TYPE');
expectInvalid((value) => { value.decision.pendingReason = { text: 'pending' }; }, 'decision scalar rejects object', 'INVALID_TYPE');
expectInvalid((value) => { value.prebiologic.hemogramVerified = 'yes'; }, 'prebiologic checkbox rejects string', 'INVALID_TYPE');
expectInvalid((value) => { value.comorbidities.cardiovascularRiskStatus = []; }, 'comorbidity scalar rejects array', 'INVALID_TYPE');
expectInvalid((value) => { value.technical.adverseEventId = 'forbidden'; }, 'technical block rejects adverse-event ID', 'UNKNOWN_FIELD');
expectInvalid((value) => { value.decision.causalityAssessments = []; }, 'decision block rejects causality payload', 'UNKNOWN_FIELD');
expectInvalid((value) => { value.requestedTreatment.treatmentId = 'forbidden'; }, 'treatment block rejects line identity contamination', 'UNKNOWN_FIELD');

expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: 1, source: 'validation_origin_form', pathology_label: 'HS', treatment_id: 'forbidden' }]; }, 'clinical observation rejects treatment ID contamination', 'UNKNOWN_FIELD');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: 1, source: 'validation_origin_form', pathology_label: 'HS', adverse_event_id: 'forbidden' }]; }, 'clinical observation rejects adverse-event contamination', 'UNKNOWN_FIELD');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: 1, source: 'validation_origin_form', pathology_label: 'HS', causality: 'forbidden' }]; }, 'clinical observation rejects causality contamination', 'UNKNOWN_FIELD');
expectInvalid((value) => { value.clinicalObservations = [{ value: 1, source: 'validation_origin_form', pathology_label: 'HS' }]; }, 'clinical observation requires code', 'INVALID_REQUIRED_STRING');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: null, source: 'validation_origin_form', pathology_label: 'HS' }]; }, 'clinical observation requires explicit value', 'INVALID_OBSERVATION_VALUE');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: {}, source: 'validation_origin_form', pathology_label: 'HS' }]; }, 'clinical observation rejects object value', 'INVALID_OBSERVATION_VALUE');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: false, source: 'other_source', pathology_label: 'HS' }]; }, 'clinical observation source is closed', 'INVALID_SOURCE');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: 0, source: 'validation_origin_form', pathology_label: '' }]; }, 'clinical observation requires pathology label', 'INVALID_REQUIRED_STRING');
expectInvalid((value) => { value.clinicalObservations = [{ code: 'x', value: 0, source: 'validation_origin_form', pathology_label: 'HS', unit: null }]; }, 'clinical observation optional unit must be explicit string', 'INVALID_EXPLICIT_STRING');

expectInvalid((value) => { value.relatedTreatments = [{ source_row_uid: 'only-uid' }]; }, 'related UID alone does not create treatment', 'EMPTY_RELATED_TREATMENT');
expectInvalid((value) => { value.relatedTreatments = [{ source_row_uid: 'uid', relation_type: 'Concomitante' }]; }, 'related relation plus UID does not create treatment', 'EMPTY_RELATED_TREATMENT');
expectInvalid((value) => { value.relatedTreatments = [{ source_row_uid: 'uid', drug_name: 'A', selected_drug_id: 'forbidden' }]; }, 'related treatment rejects catalog ID', 'UNKNOWN_FIELD');
for (const forbidden of ['treatment_id', 'line_id', 'national_code', 'registration_number', 'adverse_event_id', 'causality']) {
  expectInvalid((value) => { value.relatedTreatments = [{ source_row_uid: 'uid', drug_name: 'A', [forbidden]: 'forbidden' }]; }, `related treatment rejects ${forbidden}`, 'UNKNOWN_FIELD');
}
expectInvalid((value) => { value.relatedTreatments = [{ source_row_uid: 'uid', drug_name: ['A'] }]; }, 'related treatment values must be strings', 'INVALID_EXPLICIT_STRING');
expectInvalid((value) => { value.relatedTreatments = [null]; }, 'related treatment item must be object', 'INVALID_OBJECT');
const contaminatedBuild = expectInvalid((value) => { value.relatedTreatments = [{ source_row_uid: 'uid', drug_name: 'A', line_id: 'forbidden' }]; }, 'contaminated build input is invalid', 'UNKNOWN_FIELD');
assert.throws(() => adapter.buildValidationEvent(contaminatedBuild), (error) => error.name === 'FarmaciaExportV2ValidationAdapterError' && error.code === 'INVALID_VALIDATION_INPUT', 'builder rejects contamination with typed error');

const modified = baseInput();
modified.decision.validatedTreatmentRelation = 'modified_from_requested';
modified.validatedTreatment = { ...treatment, doseText: '200 mg' };
assert.equal(adapter.validateValidationInput(modified).valid, true, 'modified with an explicit contractual difference is valid');

function withoutValidatedLine(value, lineCreationStatus = 'not_created') {
  value.validatedTreatment = {};
  value.technical.lineCreationStatus = lineCreationStatus;
  delete value.technical.validatedTreatmentId;
  delete value.technical.validatedLineId;
  return value;
}
function expectCode(value, code, label) {
  const result = adapter.validateValidationInput(value);
  assert.equal(result.valid, false, label);
  assert.ok(result.errors.some((error) => error.code === code), `${label}: ${code}`);
}

const sameBothEmpty = withoutValidatedLine(baseInput());
sameBothEmpty.requestedTreatment = {};
expectCode(sameBothEmpty, 'VALIDATED_TREATMENT_REQUIRED', 'validated same rejects two empty snapshots');

const modifiedValidatedEmpty = withoutValidatedLine(baseInput());
modifiedValidatedEmpty.decision.validatedTreatmentRelation = 'modified_from_requested';
expectCode(modifiedValidatedEmpty, 'VALIDATED_TREATMENT_REQUIRED', 'validated modified requires identifiable validated treatment');

const validatedNoTreatment = withoutValidatedLine(baseInput(), 'not_applicable');
validatedNoTreatment.decision.validatedTreatmentRelation = 'no_treatment_validated';
expectCode(validatedNoTreatment, 'RESULT_RELATION_MISMATCH', 'validated rejects no-treatment relation');

const identicalModified = baseInput();
identicalModified.decision.validatedTreatmentRelation = 'modified_from_requested';
expectCode(identicalModified, 'MODIFIED_TREATMENT_NOT_DIFFERENT', 'modified rejects contractually identical snapshots');

const equalSame = baseInput();
assert.equal(adapter.validateValidationInput(equalSame).valid, true, 'same accepts equal identifiable snapshots');

const metadataOnlyValidated = withoutValidatedLine(baseInput());
metadataOnlyValidated.validatedTreatment = { doseText: '100 mg', selectedDrugId: 'SYN-METADATA' };
expectCode(metadataOnlyValidated, 'VALIDATED_TREATMENT_REQUIRED', 'dose and metadata alone do not identify validated treatment');
const metadataOnlyRequested = baseInput();
metadataOnlyRequested.requestedTreatment = { doseText: '100 mg', catalogSource: 'CIMA' };
expectCode(metadataOnlyRequested, 'REQUESTED_TREATMENT_REQUIRED', 'dose and metadata alone do not identify requested treatment');

for (const lineCreationStatus of ['created', 'updated']) {
  for (const missingId of ['validatedTreatmentId', 'validatedLineId']) {
    const oneId = baseInput();
    oneId.technical.lineCreationStatus = lineCreationStatus;
    delete oneId.technical[missingId];
    expectCode(oneId, 'MISSING_REQUIRED', `${lineCreationStatus} requires ${missingId}`);
  }
}
for (const lineCreationStatus of ['not_created', 'not_applicable', 'not_recorded']) {
  const validatedWithoutIds = baseInput();
  validatedWithoutIds.technical.lineCreationStatus = lineCreationStatus;
  delete validatedWithoutIds.technical.validatedTreatmentId;
  delete validatedWithoutIds.technical.validatedLineId;
  const snapshot = JSON.stringify(validatedWithoutIds);
  assert.equal(adapter.validateValidationInput(validatedWithoutIds).valid, true, `identifiable validated treatment may remain ${lineCreationStatus} without IDs`);
  assert.equal(JSON.stringify(validatedWithoutIds), snapshot, `${lineCreationStatus} validation does not repair or mutate input`);
}

const deniedValid = withoutValidatedLine(baseInput(), 'not_applicable');
deniedValid.decision.result = 'denied';
deniedValid.decision.validatedTreatmentRelation = 'no_treatment_validated';
assert.equal(adapter.validateValidationInput(deniedValid).valid, true, 'denied no-treatment with empty validated state is valid without denial reason');
const deniedSame = withoutValidatedLine(baseInput());
deniedSame.decision.result = 'denied';
deniedSame.decision.validatedTreatmentRelation = 'same_as_requested';
expectCode(deniedSame, 'RESULT_RELATION_MISMATCH', 'denied rejects same relation');
const deniedTreatment = structuredClone(deniedValid);
deniedTreatment.validatedTreatment = { activeIngredient: 'Activo no permitido' };
expectCode(deniedTreatment, 'VALIDATED_TREATMENT_NOT_ALLOWED', 'denied rejects validated treatment');
const deniedIds = structuredClone(deniedValid);
deniedIds.technical.validatedTreatmentId = 'forbidden';
expectCode(deniedIds, 'VALIDATED_IDS_NOT_ALLOWED', 'denied rejects validated IDs');
const deniedCreated = structuredClone(deniedValid);
deniedCreated.technical.lineCreationStatus = 'created';
expectCode(deniedCreated, 'RESULT_CANNOT_CREATE_LINE', 'denied no-treatment cannot create a line');

const pendingValid = withoutValidatedLine(baseInput());
pendingValid.decision.result = 'pending';
pendingValid.decision.validatedTreatmentRelation = null;
assert.equal(adapter.validateValidationInput(pendingValid).valid, true, 'pending null relation with empty validated state is valid');
const pendingModified = structuredClone(pendingValid);
pendingModified.decision.validatedTreatmentRelation = 'modified_from_requested';
expectCode(pendingModified, 'RESULT_RELATION_MISMATCH', 'pending rejects modified relation');
const pendingTreatment = structuredClone(pendingValid);
pendingTreatment.validatedTreatment = { drugName: 'No permitido' };
expectCode(pendingTreatment, 'VALIDATED_TREATMENT_NOT_ALLOWED', 'pending rejects validated treatment');
const pendingIds = structuredClone(pendingValid);
pendingIds.technical.validatedLineId = 'forbidden';
expectCode(pendingIds, 'VALIDATED_IDS_NOT_ALLOWED', 'pending rejects validated IDs');
const pendingCreated = structuredClone(pendingValid);
pendingCreated.technical.lineCreationStatus = 'created';
expectCode(pendingCreated, 'RESULT_CANNOT_CREATE_LINE', 'pending cannot create a line');

for (const resultValue of [null, 'not_recorded']) {
  for (const relationValue of [null, 'not_recorded']) {
    const absentResult = withoutValidatedLine(baseInput(), 'not_recorded');
    absentResult.decision.result = resultValue;
    absentResult.decision.validatedTreatmentRelation = relationValue;
    assert.equal(adapter.validateValidationInput(absentResult).valid, true, `${resultValue} result accepts ${relationValue} relation with empty validated state`);
  }
  const invalidRelation = withoutValidatedLine(baseInput());
  invalidRelation.decision.result = resultValue;
  invalidRelation.decision.validatedTreatmentRelation = 'same_as_requested';
  expectCode(invalidRelation, 'RESULT_RELATION_MISMATCH', `${resultValue} result rejects treatment relation`);
  const invalidTreatment = withoutValidatedLine(baseInput());
  invalidTreatment.decision.result = resultValue;
  invalidTreatment.decision.validatedTreatmentRelation = null;
  invalidTreatment.validatedTreatment = { presentation: 'metadata only' };
  expectCode(invalidTreatment, 'VALIDATED_TREATMENT_NOT_ALLOWED', `${resultValue} result rejects validated metadata`);
  const invalidIds = withoutValidatedLine(baseInput());
  invalidIds.decision.result = resultValue;
  invalidIds.decision.validatedTreatmentRelation = null;
  invalidIds.technical.validatedTreatmentId = 'forbidden';
  expectCode(invalidIds, 'VALIDATED_IDS_NOT_ALLOWED', `${resultValue} result rejects validated IDs`);
  const invalidCreation = withoutValidatedLine(baseInput());
  invalidCreation.decision.result = resultValue;
  invalidCreation.decision.validatedTreatmentRelation = null;
  invalidCreation.technical.lineCreationStatus = 'updated';
  expectCode(invalidCreation, 'RESULT_CANNOT_CREATE_LINE', `${resultValue} result cannot update a line`);
}
for (const relationValue of [null, 'not_recorded']) {
  const omittedResult = withoutValidatedLine(baseInput(), 'not_applicable');
  delete omittedResult.decision.result;
  omittedResult.decision.validatedTreatmentRelation = relationValue;
  const snapshot = JSON.stringify(omittedResult);
  assert.equal(adapter.validateValidationInput(omittedResult).valid, true, `omitted result accepts ${relationValue} relation with empty validated state`);
  assert.equal(JSON.stringify(omittedResult), snapshot, `omitted result with ${relationValue} relation is not repaired or mutated`);
}

assert.equal(adapter.normalizeValidationResult('desconocido'), 'desconocido', 'unknown result not converted');
assert.equal(adapter.normalizeTbStatus('otro'), 'otro', 'unknown TB not converted');
assert.equal(adapter.normalizeTriState(''), null);
assert.equal(adapter.normalizeSerologyStatus('Positivo'), 'positive');
assert.equal(adapter.normalizeVaccinationStatus('pendiente'), 'pending');
for (const normalizer of [
  adapter.normalizeTriState, adapter.normalizeTbStatus, adapter.normalizeSerologyStatus,
  adapter.normalizeVaccinationStatus, adapter.normalizeValidationResult, adapter.normalizeValidatedTreatmentRelation
]) {
  assert.equal(normalizer('not_recorded'), 'not_recorded', 'explicit canonical absence is preserved');
  assert.equal(normalizer(''), null, 'blank remains null');
}
const recordedAbsence = baseInput();
recordedAbsence.decision.result = 'not_recorded';
recordedAbsence.decision.validatedTreatmentRelation = 'not_recorded';
recordedAbsence.technical.lineCreationStatus = 'not_recorded';
delete recordedAbsence.technical.validatedTreatmentId;
delete recordedAbsence.technical.validatedLineId;
recordedAbsence.validatedTreatment = {};
recordedAbsence.prebiologic = {
  analysisDate: null, analysisRecentStatus: 'not_recorded', hemogramVerified: null, biochemistryVerified: null,
  tbStatus: 'not_recorded', hbvStatus: 'not_recorded', hcvStatus: 'not_recorded', hivStatus: 'not_recorded',
  vaccinationStatus: 'not_recorded', vaccinationObservations: null
};
recordedAbsence.comorbidities = {
  recurrentInfectionsStatus: 'not_recorded', cardiovascularRiskStatus: 'not_recorded',
  neurologicDisorderStatus: 'not_recorded', neoplasiaHistoryOrRiskStatus: 'not_recorded'
};
assert.equal(adapter.validateValidationInput(recordedAbsence).valid, true, 'core-supported not_recorded values validate');
assert.equal(adapter.buildValidationEvent(recordedAbsence).tb_status, 'not_recorded');
const invalidValidatedRelation = baseInput();
invalidValidatedRelation.decision.validatedTreatmentRelation = 'not_recorded';
assert.ok(adapter.validateValidationInput(invalidValidatedRelation).errors.some((error) => error.code === 'RESULT_RELATION_MISMATCH'), 'validated rejects not_recorded relation');
const invalidStatus = baseInput();
invalidStatus.prebiologic.tbStatus = 'desconocido';
assert.equal(adapter.validateValidationInput(invalidStatus).valid, false);

const sparse = baseInput();
delete sparse.technical.requestId;
delete sparse.technical.hospitalCode;
delete sparse.technical.professionalRef;
delete sparse.technical.identifierSystem;
const sparseEvent = adapter.buildValidationEvent(sparse);
assert.equal(sparseEvent.request_id, undefined, 'optional technical values are never generated');
assert.equal(sparseEvent.identifier_system, undefined);

console.log('PASS: Farmacia Export v2 validation adapter contract.');
