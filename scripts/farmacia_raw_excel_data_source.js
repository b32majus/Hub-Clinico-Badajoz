/* In-memory data source for the canonical Farmacia raw import. */
(function (root) {
    'use strict';

    var DATA_SOURCE_VERSION = '1.0.0';

    function dependency(value, name) {
        if (!value) throw new TypeError('RAW_DATA_SOURCE_DEPENDENCY_MISSING: ' + name);
        return value;
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function create(readModel, options) {
        var settings = options || {};
        var selectorsModule = dependency(settings.selectors || root.FarmaciaBridgeV2PatientSelectors, 'patient selectors');
        var dataPortModule = dependency(settings.dataPort || root.FarmaciaApplicationDataPort, 'application data port');
        var selectors = selectorsModule.create(readModel);

        function quickView(patientId) {
            return selectors.getPatientQuickView(patientId);
        }

        function getPatientProjection(patientId) {
            var view = quickView(patientId);
            if (!view) return null;
            var projection = clone(view);
            delete projection.workbook;
            delete projection.timeline;
            return projection;
        }

        function getInternalProvenance(patientId) {
            return selectors.getPatientEvents(patientId).map(function (event) {
                return {
                    source_event_id: clone(event.source_event_id),
                    event_id: clone(event.event_id),
                    event_type: clone(event.event_type),
                    source_sheet: clone(event.source_sheet),
                    source_table: clone(event.source_table),
                    physical_row_numbers: clone(event.physical_row_numbers),
                    rows: event.rows.map(function (row) {
                        return {
                            row_id: clone(row.canonical_row.row_id),
                            source_sheet: clone(row.source_sheet),
                            source_table: clone(row.source_table),
                            physical_row_number: clone(row.physical_row_number)
                        };
                    })
                };
            });
        }

        function findIdentifierCandidatesByValue(value) {
            return selectors.findIdentifierCandidatesByValue(value);
        }

        // New EA path (C3a). The declared identity of the 166 rows is the only
        // bridge: absent typed rows of this patient means `null`, never "sin EA".
        function getAdverseEventEpisodes(patientId) {
            var refs = readModel.patient_refs;
            if (!refs || typeof patientId !== 'string' || !Object.prototype.hasOwnProperty.call(refs, patientId)) {
                return null;
            }
            var patientRef = refs[patientId];
            var reader = dependency(root.FarmaciaBridgeRawEaV21Reader, 'ea reader');
            var typedRows = Array.isArray(readModel.typed_rows) ? readModel.typed_rows : [];
            var rows = typedRows.filter(function (row) {
                return row && row.fh_patient_ref === patientRef;
            }).map(clone);
            return clone(reader.readPatient({ patientRef: patientRef, rows: rows }));
        }

        var implementation = {
            listPatients: function () {
                return selectors.listPatientSummaries();
            },
            findByIdentifier: function (identifierSystem, identifierValue) {
                return selectors.findByIdentifier(identifierSystem, identifierValue);
            },
            findByPatientId: function (patientId) {
                return selectors.findByPatientId(patientId);
            },
            getPatientProjection: getPatientProjection,
            getPatientEvents: function (patientId) {
                return selectors.getPatientEvents(patientId);
            },
            getLatestRequestValidation: function (patientId) {
                var view = quickView(patientId);
                return view ? { latest_request: view.latest_request, latest_validation: view.latest_validation } : null;
            },
            getVisitsAndLines: function (patientId) {
                var view = quickView(patientId);
                if (!view) return null;
                return {
                    visits: view.timeline.filter(function (event) {
                        return event.event_type === 'pharmacy_first_visit' || event.event_type === 'pharmacy_followup';
                    }),
                    latest_first_visit: view.latest_first_visit,
                    latest_followup: view.latest_followup,
                    lines: view.lines
                };
            },
            getProms: function (patientId) {
                var view = quickView(patientId);
                return view ? view.structured_proms : null;
            },
            getAdherence: function (patientId) {
                var view = quickView(patientId);
                return view ? view.adherence : null;
            },
            getAdverseEventsAndCausality: function (patientId) {
                var view = quickView(patientId);
                return view ? { adverse_events: view.adverse_events, causality_assessments: view.causality_assessments } : null;
            },
            getPopulationProjection: function () {
                return selectors.listPatientSummaries();
            }
        };
        var port = dataPortModule.create(implementation);
        var source = {};
        Object.keys(port).forEach(function (key) { source[key] = port[key]; });
        source.data_source_version = DATA_SOURCE_VERSION;
        source.getInternalProvenance = getInternalProvenance;
        source.getAdverseEventEpisodes = getAdverseEventEpisodes;
        source.findIdentifierCandidatesByValue = findIdentifierCandidatesByValue;
        return Object.freeze(source);
    }

    function readWorkbook(workbook, options) {
        var settings = options || {};
        var reader = dependency(settings.reader || root.FarmaciaBridgeV2Reader, 'raw reader');
        var readModel = reader.readWorkbook(workbook, settings.readerOptions || settings);
        return readModel === null ? null : create(readModel, settings);
    }

    root.FarmaciaRawExcelDataSource = Object.freeze({
        DATA_SOURCE_VERSION: DATA_SOURCE_VERSION,
        create: create,
        readWorkbook: readWorkbook
    });
})(typeof window !== 'undefined' ? window : globalThis);
