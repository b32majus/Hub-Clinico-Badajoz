/* FH Bridge raw EA 0..N · synthetic demo act identity source (C2b).
 *
 * Declared, never derived: for each synthetic CIP this provider returns the
 * explicit act identity (`actId`, `patientRef`) and the explicit follow-up
 * event context (event, visit, patient and dates) of ONE act.
 *
 * The source is deliberately a closed demo registry:
 *  - `actId` is not the event, source-event, visit or patient identifier.
 *  - `patientRef` is not the patient identifier.
 *  - `visitDate` is the declared date of the act; `created_at` is never used.
 *  - `activeLines` are explicit 0..N lines of the act. An empty array is a
 *    valid act: the act row alone represents it.
 *
 * `getContext('followupAct', cip)` returns a fresh deep copy or null. It never
 * mutates the registry and never synthesizes an identity for an unknown CIP.
 * No DOM, storage, clock, network or catalog access. */
(function (root) {
  'use strict';

  var PROVIDER_VERSION = '1.0.0-draft.1';

  var REGISTRY = {
    followupAct: {
      'CIP-DEMO-FH-001': {
        identifierValue: 'CIP-DEMO-FH-001',
        actId: 'ACT-DEMO-FH-001',
        patientRef: 'PATREF-DEMO-FH-001',
        eventId: 'evt-syn-c2b-followup-fh001',
        sourceEventId: 'src-syn-c2b-followup-fh001',
        visitId: 'visit-syn-c2b-followup-fh001',
        patientId: 'patient-syn-c2b-alpha',
        occurredAt: '2026-08-04T10:00:00Z',
        recordedAt: '2026-08-04T10:01:00Z',
        visitDate: '2026-08-04',
        eventStatus: 'recorded',
        demoFlag: true,
        activeLines: [{
          rowKey: 'row-syn-c2b-followup-fh001-l1',
          treatmentId: 'TRAT-FH-001-A',
          lineId: 'BIO-FH-001-L1',
          lineRole: 'principal',
          isPrimaryLine: true,
          lineStatusAtEvent: 'active',
          activeAtEvent: true,
          drugName: 'Secukinumab 300 mg',
          activeIngredient: 'Secukinumab',
          presentation: null,
          doseText: '300 mg',
          route: 'SC',
          scheduleCode: null,
          scheduleLabel: 'Cada 4 semanas',
          scheduleOtherText: null,
          selectedDrugId: null,
          catalogSource: null,
          nationalCode: null,
          registrationNumber: null
        }]
      },
      'CIP-DEMO-FH-002': {
        identifierValue: 'CIP-DEMO-FH-002',
        actId: 'ACT-DEMO-FH-002',
        patientRef: 'PATREF-DEMO-FH-002',
        eventId: 'evt-syn-c2b-followup-fh002',
        sourceEventId: 'src-syn-c2b-followup-fh002',
        visitId: 'visit-syn-c2b-followup-fh002',
        patientId: 'patient-syn-c2b-beta',
        occurredAt: '2026-08-04T10:30:00Z',
        recordedAt: '2026-08-04T10:31:00Z',
        visitDate: '2026-08-04',
        eventStatus: 'recorded',
        demoFlag: true,
        activeLines: []
      },
      'CIP-DEMO-FH-004': {
        identifierValue: 'CIP-DEMO-FH-004',
        actId: 'ACT-DEMO-FH-004',
        patientRef: 'PATREF-DEMO-FH-004',
        eventId: 'evt-syn-c2b-followup-fh004',
        sourceEventId: 'src-syn-c2b-followup-fh004',
        visitId: 'visit-syn-c2b-followup-fh004',
        patientId: 'patient-syn-c2b-delta',
        occurredAt: '2026-08-04T11:00:00Z',
        recordedAt: '2026-08-04T11:01:00Z',
        visitDate: '2026-08-04',
        eventStatus: 'recorded',
        demoFlag: true,
        activeLines: [
          {
            rowKey: 'row-syn-c2b-followup-fh004-l2',
            treatmentId: 'TRAT-FH-004-B',
            lineId: 'BIO-FH-004-L2',
            lineRole: 'principal',
            isPrimaryLine: true,
            lineStatusAtEvent: 'active',
            activeAtEvent: true,
            drugName: 'Belimumab',
            activeIngredient: 'Belimumab',
            presentation: null,
            doseText: '200 mg',
            route: 'SC',
            scheduleCode: null,
            scheduleLabel: 'Semanal',
            scheduleOtherText: null,
            selectedDrugId: null,
            catalogSource: null,
            nationalCode: null,
            registrationNumber: null
          },
          {
            rowKey: 'row-syn-c2b-followup-fh004-l3',
            treatmentId: 'TRAT-FH-004-C',
            lineId: 'BIO-FH-004-L3',
            lineRole: 'additional',
            isPrimaryLine: false,
            lineStatusAtEvent: 'active',
            activeAtEvent: true,
            drugName: 'Rituximab',
            activeIngredient: 'Rituximab',
            presentation: null,
            doseText: '1 g',
            route: 'IV',
            scheduleCode: null,
            scheduleLabel: 'Días 1 y 15 cada 6 meses',
            scheduleOtherText: null,
            selectedDrugId: null,
            catalogSource: null,
            nationalCode: null,
            registrationNumber: null
          }
        ]
      }
    }
  };

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
      var copy = {};
      Object.keys(value).forEach(function (key) {
        Object.defineProperty(copy, key, {
          value: clone(value[key]),
          enumerable: true,
          writable: true,
          configurable: true
        });
      });
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

  root.FarmaciaBridgeRawEaV21DemoContext = Object.freeze({
    PROVIDER_VERSION: PROVIDER_VERSION,
    getContext: getContext
  });
})(typeof window !== 'undefined' ? window : globalThis);
