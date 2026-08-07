/* Closed synthetic technical-context registry for the internal Farmacia Export v2 candidate. */
(function (root) {
  'use strict';

  var PROVIDER_VERSION = '1.0.0-draft.1';
  var REGISTRY = {
    validation: {
      'CIP-DEMO-FH-001': {
        eventId: 'evt-syn-v2-validation-fh001',
        sourceEventId: 'src-syn-v2-validation-fh001',
        rowKey: 'row-syn-v2-validation-fh001',
        validationId: 'validation-syn-v2-fh001',
        patientId: 'patient-syn-v2-alpha',
        occurredAt: '2026-08-04T08:00:00Z',
        recordedAt: '2026-08-04T08:01:00Z',
        demoFlag: true,
        eventStatus: 'recorded'
      }
    },
    firstVisit: {
      'CIP-DEMO-FH-001': {
        eventId: 'evt-syn-v2-first-visit-fh001',
        sourceEventId: 'src-syn-v2-first-visit-fh001',
        firstVisitId: 'first-visit-syn-v2-fh001',
        patientId: 'patient-syn-v2-alpha',
        occurredAt: '2026-08-04T09:00:00Z',
        recordedAt: '2026-08-04T09:01:00Z',
        demoFlag: true,
        eventStatus: 'recorded',
        lineContext: {
          rowKey: 'row-syn-v2-first-visit-fh001-l1',
          treatmentId: 'treatment-syn-v2-fh001-l1',
          lineId: 'BIO-FH-001-L1',
          lineRole: 'principal',
          isPrimaryLine: true,
          lineStatusAtEvent: 'active',
          activeAtEvent: true
        }
      }
    },
    followup: {
      'CIP-DEMO-FH-001': {
        eventId: 'evt-syn-v2-followup-fh001',
        sourceEventId: 'src-syn-v2-followup-fh001',
        visitId: 'visit-syn-v2-followup-fh001',
        patientId: 'patient-syn-v2-alpha',
        occurredAt: '2026-08-04T10:00:00Z',
        recordedAt: '2026-08-04T10:01:00Z',
        visitDate: '2026-08-04',
        demoFlag: true,
        eventStatus: 'recorded',
        identifierValue: 'CIP-DEMO-FH-001',
        activeLines: [{
          rowKey: 'row-syn-v2-followup-fh001-l1', treatmentId: 'treatment-syn-v2-fh001-l1', lineId: 'BIO-FH-001-L1',
          lineRole: 'principal', isPrimaryLine: true, lineStatusAtEvent: 'active', activeAtEvent: true,
          drugName: 'Secukinumab 300 mg', activeIngredient: 'Secukinumab', presentation: null, doseText: '300 mg', route: 'SC',
          scheduleCode: null, scheduleLabel: 'Cada 4 semanas', scheduleOtherText: null, selectedDrugId: null, catalogSource: null,
          nationalCode: null, registrationNumber: null
        }]
      },
      'CIP-DEMO-FH-004': {
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
      }
    }
  };

  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
      var copy = {};
      Object.keys(value).forEach(function (key) { copy[key] = clone(value[key]); });
      return copy;
    }
    return value;
  }
  function getContext(contextType, identifierValue) {
    if (typeof contextType !== 'string' || typeof identifierValue !== 'string') return null;
    var contexts = own(REGISTRY, contextType) ? REGISTRY[contextType] : null;
    if (!contexts || !own(contexts, identifierValue)) return null;
    return clone(contexts[identifierValue]);
  }

  root.FarmaciaExportV2TechnicalContext = Object.freeze({
    PROVIDER_VERSION: PROVIDER_VERSION,
    getContext: getContext
  });
})(typeof window !== 'undefined' ? window : globalThis);
