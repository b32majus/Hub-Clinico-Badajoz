#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFileSync(path.join(ROOT, relative), 'utf8');
const providerSource = read('scripts/farmacia_export_v2_context.js');
const sandbox = { console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const file of [
  'scripts/farmacia_export_v2_context.js',
  'scripts/farmacia_export_v2_core.js',
  'scripts/farmacia_export_v2_validation_adapter.js',
  'scripts/farmacia_export_v2_first_visit_adapter.js',
  'scripts/farmacia_export_v2_followup_active_lines_adapter.js'
]) vm.runInContext(read(file), sandbox, { filename: file });

const provider = sandbox.FarmaciaExportV2TechnicalContext;
const scenarios = [
  ['validation', 'CIP-DEMO-FH-001'],
  ['firstVisit', 'CIP-DEMO-FH-001'],
  ['followup', 'CIP-DEMO-FH-001'],
  ['followup', 'CIP-DEMO-FH-004']
];
const contexts = scenarios.map(args => provider.getContext(...args));
const plain = value => JSON.parse(JSON.stringify(value));
const has = (value, field) => Object.prototype.hasOwnProperty.call(value, field);
const validationRequired = ['eventId', 'sourceEventId', 'rowKey', 'validationId', 'patientId', 'occurredAt', 'recordedAt', 'demoFlag', 'eventStatus'];
const lineContextRequired = ['rowKey', 'treatmentId', 'lineId', 'lineRole', 'isPrimaryLine', 'lineStatusAtEvent', 'activeAtEvent'];
const activeLineRequired = [...lineContextRequired, 'drugName', 'activeIngredient', 'presentation', 'doseText', 'route', 'scheduleCode', 'scheduleLabel', 'scheduleOtherText', 'selectedDrugId', 'catalogSource', 'nationalCode', 'registrationNumber'];
const expectedFh004 = {
  eventId: 'evt-syn-v2-followup-fh004',
  sourceEventId: 'src-syn-v2-followup-fh004',
  visitId: 'visit-syn-v2-followup-fh004',
  patientId: 'patient-syn-v2-delta',
  occurredAt: '2026-08-04T11:00:00Z',
  recordedAt: '2026-08-04T11:01:00Z',
  visitDate: '2026-08-04',
  demoFlag: true,
  eventStatus: 'recorded',
  identifierValue: 'CIP-DEMO-FH-004',
  activeLines: [
    {
      rowKey: 'row-syn-v2-followup-fh004-l2', treatmentId: 'TRAT-FH-004-B', lineId: 'BIO-FH-004-L2',
      lineRole: 'principal', isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true,
      drugName: 'Belimumab', activeIngredient: 'Belimumab', presentation: null, doseText: '200 mg', route: 'SC',
      scheduleCode: null, scheduleLabel: 'Semanal', scheduleOtherText: null, selectedDrugId: null, catalogSource: null,
      nationalCode: null, registrationNumber: null
    },
    {
      rowKey: 'row-syn-v2-followup-fh004-l3', treatmentId: 'TRAT-FH-004-C', lineId: 'BIO-FH-004-L3',
      lineRole: 'additional', isPrimaryLine: false, lineStatusAtEvent: 'active', activeAtEvent: true,
      drugName: 'Rituximab', activeIngredient: 'Rituximab', presentation: null, doseText: '1 g', route: 'IV',
      scheduleCode: null, scheduleLabel: 'Días 1 y 15 cada 6 meses', scheduleOtherText: null, selectedDrugId: null, catalogSource: null,
      nationalCode: null, registrationNumber: null
    }
  ]
};
const passed = [];

function runFollowupGetterWith(context) {
  const pageSandbox = {
    console,
    FarmaciaDemo: {},
    FarmaciaExportV2FollowupActiveLinesAdapter: {},
    FarmaciaExportV2TechnicalContext: { PROVIDER_VERSION: '1.0.0-draft.1', getContext: () => context },
    document: {
      addEventListener() {},
      getElementById(id) { return id === 'fhSegCip' ? { value: 'CIP-DEMO-FH-001' } : null; },
      querySelectorAll() { return []; }
    }
  };
  pageSandbox.window = pageSandbox;
  pageSandbox.globalThis = pageSandbox;
  vm.createContext(pageSandbox);
  vm.runInContext(read('scripts/farmacia_seguimiento.js'), pageSandbox, { filename: 'scripts/farmacia_seguimiento.js' });
  return () => pageSandbox.FarmaciaSeguimiento.getFollowupV2TechnicalContext();
}

function followupAdapterInput(context) {
  return {
    technical: Object.fromEntries(Object.entries(context).filter(([key]) => !['visitDate', 'identifierValue', 'activeLines'].includes(key))),
    context: { identifierValue: context.identifierValue },
    visit: { visitDate: context.visitDate },
    activeLines: context.activeLines
  };
}

function criterion(number, name, assertions) {
  assertions();
  passed.push({ number, name });
  console.log(`  ✓ ${number}. ${name}`);
}

criterion(1, 'exact provider API and version', () => {
  assert.deepEqual(Object.keys(provider), ['PROVIDER_VERSION', 'getContext']);
  assert.equal(provider.PROVIDER_VERSION, '1.0.0-draft.1');
  assert.equal(typeof provider.getContext, 'function');
  assert.equal(Object.isFrozen(provider), true);
});

criterion(2, 'closed synthetic registry', () => {
  contexts.forEach(context => assert.ok(context));
  assert.equal(provider.getContext('unknown', 'CIP-DEMO-FH-001'), null);
  assert.equal(provider.getContext('validation', 'CIP-DEMO-FH-004'), null);
  assert.equal(Object.keys(provider).includes('REGISTRY'), false);
});

criterion(3, 'all contexts have demoFlag=true', () => {
  contexts.forEach(context => assert.equal(context.demoFlag, true));
});

criterion(4, 'patientId is neither equal to nor derived from CIP', () => {
  contexts.forEach((context, index) => {
    const cip = scenarios[index][1];
    assert.notEqual(context.patientId, cip);
    assert.equal(context.patientId.includes(cip), false);
    assert.match(context.patientId, /^patient-syn-v2-(?:alpha|delta)$/);
  });
  assert.doesNotMatch(providerSource, /patientId\s*[:=][^\n]*(?:identifierValue|CIP)/);
});

criterion(5, 'provider source has no clock/random/UUID/storage/network/generation capability', () => {
  assert.doesNotMatch(providerSource, /\b(?:Date|crypto|randomUUID|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|EventSource)\b|Math\.random|performance\.now|navigator\./);
  assert.doesNotMatch(providerSource, /(?:eventId|sourceEventId|validationId|firstVisitId|visitId|patientId|lineId|treatmentId)\s*[:=][^\n]*\+/);
});

criterion(6, 'IDs and dates are explicit literals', () => {
  assert.equal(contexts[0].eventId, 'evt-syn-v2-validation-fh001');
  assert.equal(contexts[1].firstVisitId, 'first-visit-syn-v2-fh001');
  assert.equal(contexts[2].visitDate, '2026-08-04');
  assert.equal(contexts[3].occurredAt, '2026-08-04T11:00:00Z');
  contexts.forEach(context => {
    assert.match(context.occurredAt, /^2026-08-04T\d{2}:\d{2}:\d{2}Z$/);
    assert.match(context.recordedAt, /^2026-08-04T\d{2}:\d{2}:\d{2}Z$/);
  });
});

criterion(7, 'repeated calls are deeply equal', () => {
  scenarios.forEach((args, index) => assert.deepEqual(plain(provider.getContext(...args)), plain(contexts[index])));
});

criterion(8, 'distinct contexts do not share event or act IDs', () => {
  const eventIds = contexts.map(context => context.eventId);
  const actIds = [contexts[0].validationId, contexts[1].firstVisitId, contexts[2].visitId, contexts[3].visitId];
  assert.equal(new Set(eventIds).size, eventIds.length);
  assert.equal(new Set(actIds).size, actIds.length);
});

criterion(9, 'returned context cannot mutate the registry', () => {
  const probe = provider.getContext('followup', 'CIP-DEMO-FH-004');
  probe.eventId = 'mutated';
  probe.activeLines.reverse();
  probe.activeLines[0].lineId = 'mutated';
  const fresh = provider.getContext('followup', 'CIP-DEMO-FH-004');
  assert.equal(fresh.eventId, 'evt-syn-v2-followup-fh004');
  assert.deepEqual(Array.from(fresh.activeLines, line => line.lineId), ['BIO-FH-004-L2', 'BIO-FH-004-L3']);
});

criterion(10, 'manual/unknown CIP has no context', () => {
  for (const type of ['validation', 'firstVisit', 'followup']) assert.equal(provider.getContext(type, 'CIP-SYN-MANUAL-UNREGISTERED'), null);
  assert.equal(provider.getContext('followup', ''), null);
});

criterion(11, 'Validation context is complete', () => {
  validationRequired.forEach(field => assert.ok(has(contexts[0], field), `validation.${field}`));
  assert.equal(validationRequired.every(field => contexts[0][field] !== '' && contexts[0][field] !== undefined), true);
});

criterion(12, 'First Visit has complete explicit lineContext', () => {
  lineContextRequired.forEach(field => assert.ok(has(contexts[1].lineContext, field), `firstVisit.lineContext.${field}`));
  assert.equal(contexts[1].lineContext.isPrimaryLine, true);
  assert.equal(contexts[1].lineContext.activeAtEvent, true);
});

criterion(13, 'Follow-up has complete explicitly ordered activeLines', () => {
  contexts.slice(2).forEach(context => context.activeLines.forEach(line => activeLineRequired.forEach(field => assert.ok(has(line, field), `followup.activeLines.${field}`))));
  assert.deepEqual(Array.from(contexts[3].activeLines, line => line.lineId), ['BIO-FH-004-L2', 'BIO-FH-004-L3']);
});

criterion(14, 'incomplete input and malformed provider context fail closed', () => {
  const failures = [
    () => sandbox.FarmaciaExportV2ValidationAdapter.buildValidationProjection({ technical: { demoFlag: true } }),
    () => sandbox.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection({ technical: {}, context: {}, visit: {}, proms: null, lines: [] }),
    () => sandbox.FarmaciaExportV2FollowupActiveLinesAdapter.buildFollowupProjection({ technical: {}, context: {}, visit: {}, activeLines: [] })
  ];
  const expected = ['INVALID_VALIDATION_INPUT', 'INVALID_FIRST_VISIT_INPUT', 'INVALID_FOLLOWUP_INPUT'];
  failures.forEach((failure, index) => assert.throws(failure, error => error?.code === expected[index]));
  const malformedContexts = [
    { ...plain(contexts[2]), visitId: 42 },
    { ...plain(contexts[2]), patientId: '' },
    { ...plain(contexts[2]), demoFlag: 'true' },
    { ...plain(contexts[2]), activeLines: [{ ...plain(contexts[2].activeLines[0]), presentation: 42 }] },
    { ...plain(contexts[2]), activeLines: [{ ...plain(contexts[2].activeLines[0]), activeAtEvent: undefined }] }
  ];
  malformedContexts.forEach(context => assert.throws(runFollowupGetterWith(context), error => error?.code === 'V2_CONTEXT_INCOMPLETE'));
});

criterion(15, 'adapters validate events, rows and TSV', () => {
  const validationInput = {
    technical: contexts[0], context: { identifierValue: scenarios[0][1] }, request: {}, requestedTreatment: {},
    decision: { result: 'pending', validatedTreatmentRelation: null }, validatedTreatment: {}, prebiologic: {}, comorbidities: {},
    clinicalObservations: null, relatedTreatments: null
  };
  const validation = sandbox.FarmaciaExportV2ValidationAdapter.buildValidationProjection(validationInput);
  assert.equal(validation.rows.length, 1);
  assert.ok(validation.tsv.includes(contexts[0].eventId));

  const firstLine = { ...contexts[1].lineContext, drugName: 'Tratamiento sintético explícito', activeIngredient: 'Activo sintético explícito', presentation: null, doseText: null, route: null, scheduleCode: null, scheduleLabel: null, scheduleOtherText: null, selectedDrugId: null, catalogSource: null, nationalCode: null, registrationNumber: null };
  const first = sandbox.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection({
    technical: Object.fromEntries(Object.entries(contexts[1]).filter(([key]) => key !== 'lineContext')),
    context: { identifierValue: scenarios[1][1] }, visit: { firstVisitDate: '2026-08-04', baselinePromsCollectionStatus: null }, proms: null, lines: [firstLine]
  });
  assert.equal(first.rows.length, 1);
  assert.ok(first.tsv.includes(contexts[1].eventId));

  contexts.slice(2).forEach(context => {
    const followup = sandbox.FarmaciaExportV2FollowupActiveLinesAdapter.buildFollowupProjection(followupAdapterInput(context));
    assert.equal(followup.rows.length, context.activeLines.length);
    assert.ok(followup.tsv.includes(context.eventId));
  });
  for (const [field, value, semanticCode] of [
    ['lineRole', 'primary', 'INVALID_LINE_ROLE'],
    ['lineStatusAtEvent', 'inactive', 'FOLLOWUP_LINE_STATUS']
  ]) {
    const semantic = plain(contexts[2]);
    semantic.activeLines[0][field] = value;
    assert.deepEqual(plain(runFollowupGetterWith(semantic)()), semantic, `${field} passes structural getter validation`);
    assert.throws(
      () => sandbox.FarmaciaExportV2FollowupActiveLinesAdapter.buildFollowupProjection(followupAdapterInput(semantic)),
      error => error?.code === 'INVALID_FOLLOWUP_INPUT' && error.details?.some(detail => detail.code === semanticCode),
      `${semanticCode} remains adapter-owned`
    );
  }
});

criterion(16, 'no public v2 output exists', () => {
  for (const html of ['farmacia_validacion.html', 'farmacia_primera_visita.html', 'farmacia_seguimiento.html']) {
    const markup = read(html);
    assert.match(markup, /farmacia_export_v2_context\.js\?v=1\.0\.0-draft\.1/);
    assert.doesNotMatch(markup, />[^<]*(?:Exportar|Descargar|Copiar)[^<]*v2/i);
  }
});

criterion(17, 'FH-001 Validation, First Visit and Follow-up share patientId', () => {
  assert.deepEqual(contexts.slice(0, 3).map(context => context.patientId), Array(3).fill('patient-syn-v2-alpha'));
});

criterion(18, 'FH-001 First Visit and Follow-up share treatmentId', () => {
  assert.equal(contexts[1].lineContext.treatmentId, 'treatment-syn-v2-fh001-l1');
  assert.equal(contexts[2].activeLines[0].treatmentId, contexts[1].lineContext.treatmentId);
});

criterion(19, 'FH-001 First Visit and Follow-up share lineId', () => {
  assert.equal(contexts[1].lineContext.lineId, 'BIO-FH-001-L1');
  assert.equal(contexts[2].activeLines[0].lineId, contexts[1].lineContext.lineId);
});

criterion(20, 'FH-001 event IDs and timestamps remain event-specific', () => {
  assert.equal(new Set(contexts.slice(0, 3).map(context => context.eventId)).size, 3);
  assert.equal(new Set(contexts.slice(0, 3).map(context => context.sourceEventId)).size, 3);
  assert.equal(new Set(contexts.slice(0, 3).map(context => context.occurredAt)).size, 3);
  assert.equal(new Set(contexts.slice(0, 3).map(context => context.recordedAt)).size, 3);
});

criterion(21, 'FH-001 firstVisitId and visitId remain distinct', () => {
  assert.equal(contexts[1].firstVisitId, 'first-visit-syn-v2-fh001');
  assert.equal(contexts[2].visitId, 'visit-syn-v2-followup-fh001');
  assert.notEqual(contexts[1].firstVisitId, contexts[2].visitId);
});

criterion(22, 'FH-001 rowKey remains event-specific', () => {
  assert.equal(contexts[0].rowKey, 'row-syn-v2-validation-fh001');
  assert.equal(contexts[1].lineContext.rowKey, 'row-syn-v2-first-visit-fh001-l1');
  assert.equal(contexts[2].activeLines[0].rowKey, 'row-syn-v2-followup-fh001-l1');
  assert.equal(new Set([
    contexts[0].rowKey,
    contexts[1].lineContext.rowKey,
    contexts[2].activeLines[0].rowKey
  ]).size, 3);
});

criterion(23, 'FH-001 First Visit and Follow-up projections share treatment_id and line_id', () => {
  const firstLine = { ...contexts[1].lineContext, drugName: 'Tratamiento sintético explícito', activeIngredient: 'Activo sintético explícito', presentation: null, doseText: null, route: null, scheduleCode: null, scheduleLabel: null, scheduleOtherText: null, selectedDrugId: null, catalogSource: null, nationalCode: null, registrationNumber: null };
  const first = sandbox.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection({
    technical: Object.fromEntries(Object.entries(contexts[1]).filter(([key]) => key !== 'lineContext')),
    context: { identifierValue: scenarios[1][1] }, visit: { firstVisitDate: '2026-08-04', baselinePromsCollectionStatus: null }, proms: null, lines: [firstLine]
  });
  const followup = sandbox.FarmaciaExportV2FollowupActiveLinesAdapter.buildFollowupProjection(followupAdapterInput(contexts[2]));
  assert.deepEqual(
    [first.rows[0].treatment_id, first.rows[0].line_id],
    ['treatment-syn-v2-fh001-l1', 'BIO-FH-001-L1']
  );
  assert.deepEqual(
    [followup.rows[0].treatment_id, followup.rows[0].line_id],
    [first.rows[0].treatment_id, first.rows[0].line_id]
  );
});

criterion(24, 'FH-004 context identity and values remain intact', () => {
  assert.deepEqual(plain(contexts[3]), expectedFh004);
});

criterion(25, 'repeated FH-001 projections retain IDs and TSV', () => {
  const firstLine = { ...contexts[1].lineContext, drugName: 'Tratamiento sintético explícito', activeIngredient: 'Activo sintético explícito', presentation: null, doseText: null, route: null, scheduleCode: null, scheduleLabel: null, scheduleOtherText: null, selectedDrugId: null, catalogSource: null, nationalCode: null, registrationNumber: null };
  const firstInput = {
    technical: Object.fromEntries(Object.entries(contexts[1]).filter(([key]) => key !== 'lineContext')),
    context: { identifierValue: scenarios[1][1] }, visit: { firstVisitDate: '2026-08-04', baselinePromsCollectionStatus: null }, proms: null, lines: [firstLine]
  };
  const first = [
    sandbox.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection(firstInput),
    sandbox.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection(firstInput)
  ];
  const followup = [
    sandbox.FarmaciaExportV2FollowupActiveLinesAdapter.buildFollowupProjection(followupAdapterInput(contexts[2])),
    sandbox.FarmaciaExportV2FollowupActiveLinesAdapter.buildFollowupProjection(followupAdapterInput(contexts[2]))
  ];
  for (const pair of [first, followup]) {
    assert.equal(pair[0].tsv, pair[1].tsv);
    assert.deepEqual(
      plain({ event: pair[0].event, ids: pair[0].rows.map(row => [row.row_id, row.treatment_id, row.line_id]) }),
      plain({ event: pair[1].event, ids: pair[1].rows.map(row => [row.row_id, row.treatment_id, row.line_id]) })
    );
  }
});

assert.deepEqual(passed.map(item => item.number), Array.from({ length: 25 }, (_, index) => index + 1));
console.log(`PASS: Farmacia Export v2 technical-context contract — ${passed.length} named criteria passed.`);
