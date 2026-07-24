(function (root) {
    'use strict';

    function text(value) {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    function token(value) {
        return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
    }

    function fixtureMode() {
        try {
            return new URLSearchParams(root.location && root.location.search || '').get('qa_fixture') === 'v4';
        } catch (error) {
            return false;
        }
    }

    function importedOrigin(patient) {
        var source = [
            patient && patient.source_type,
            patient && patient.origen_solicitud,
            patient && patient.tipo_origen,
            patient && patient.importSource
        ].map(text).join(' ').toLowerCase();
        if (source.indexOf('enfermer') !== -1) return 'imported_nursing';
        if (source.indexOf('farmacia') !== -1) return 'manual_fh_capture';
        return 'imported_clinical_service';
    }

    function explicitInitialState(patient) {
        var nursing = text(patient && (patient.estado_prebiologico_enfermeria || patient.estado)).toUpperCase();
        if (nursing === 'OK FARMACIA' || nursing === 'OK_FARMACIA') {
            return 'ready_for_pharmacy_validation';
        }
        if (nursing.indexOf('BLOQUE') !== -1) return 'blocked_prebiologic';
        if (nursing.indexOf('VIGIL') !== -1) return 'watching_prebiologic';

        var validation = text(patient && patient.resultado_validacion).toLowerCase();
        if (validation === 'denegado' || validation === 'denied') return 'validation_denied';
        if (validation === 'validado' || validation === 'validated') return 'validated_not_started';
        return 'general_pending_validation';
    }

    function decorateImportedPatient(patient) {
        if (!patient || !patient.cip) return patient;
        var origin = importedOrigin(patient);
        if (!patient.patient_id) {
            var originToken = origin === 'imported_nursing' ? 'nursing' : (origin === 'manual_fh_capture' ? 'pharmacy' : 'clinical');
            patient.patient_id = 'fhv4-import-' + originToken + '-' + token(patient.cip);
        }
        patient.v4InitialState = patient.v4InitialState || explicitInitialState(patient);
        patient.v4ImportBacked = true;
        patient.farmaco_solicitado = patient.farmaco_solicitado || patient.farmaco || patient.marcaComercial || '';
        patient.farmaco = patient.farmaco || patient.farmaco_solicitado || patient.marcaComercial || '';
        return patient;
    }

    function decorateList(items) {
        return (Array.isArray(items) ? items : []).map(decorateImportedPatient);
    }

    function clearFixturePatients(demo) {
        Object.keys(demo && demo.patients || {}).forEach(function (cip) {
            delete demo.patients[cip];
        });
    }

    function wrapList(demo, name) {
        var original = demo && demo[name];
        if (typeof original !== 'function') return;
        demo[name] = function () {
            return decorateList(original.apply(demo, arguments));
        };
    }

    function patchDemo(demo, useFixtures) {
        if (!demo || demo.__v4ImportModeApplied) return demo;
        demo.__v4ImportModeApplied = true;
        demo.__v4DataMode = useFixtures ? 'qa_fixtures' : 'real_import';

        if (!useFixtures) clearFixturePatients(demo);

        ['getAvailablePatients', 'getPendingValidationPatients', 'getEnfermeriaVisiblePatients'].forEach(function (name) {
            wrapList(demo, name);
        });

        var originalFind = demo.findPatientByCip;
        if (typeof originalFind === 'function') {
            demo.findPatientByCip = function (cip) {
                return decorateImportedPatient(originalFind.call(demo, cip));
            };
        }

        var originalContext = demo.getQueryContext;
        if (typeof originalContext === 'function') {
            demo.getQueryContext = function () {
                var context = originalContext.call(demo);
                if (context && context.patient) decorateImportedPatient(context.patient);
                return context;
            };
        }

        return demo;
    }

    function updateSourceCopy(useFixtures) {
        if (!root.document) return;
        var intro = root.document.querySelector('#pendingValidationBoard .validation-module__intro');
        if (intro) {
            intro.textContent = useFixtures
                ? 'Modo QA explícito: escenarios sintéticos S01–S12.'
                : 'Bandeja alimentada únicamente por los Excel locales cargados en esta sesión. No hay pacientes demo de fallback.';
        }
    }

    var descriptor = Object.getOwnPropertyDescriptor(root, 'FarmaciaDemo');
    if (!descriptor || typeof descriptor.set !== 'function' || typeof descriptor.get !== 'function') return;

    Object.defineProperty(root, 'FarmaciaDemo', {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set: function (value) {
            descriptor.set.call(root, value);
            var demo = descriptor.get.call(root);
            if (!demo) return;

            var useFixtures = fixtureMode();
            var originalReady = demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve(demo);
            var gatedReady = originalReady.then(function () {
                patchDemo(demo, useFixtures);
                updateSourceCopy(useFixtures);
                return demo;
            });
            demo.ready = gatedReady;
            demo.whenReady = function (init) {
                return gatedReady.then(init).catch(function () {
                    var status = root.document && root.document.getElementById('farmaciaDataSourceError');
                    if (status) status.textContent = 'No se pudo preparar la fuente de datos V4.';
                });
            };
        }
    });

    root.FarmaciaV4DataMode = {
        isFixtureMode: fixtureMode,
        decorateImportedPatient: decorateImportedPatient
    };
})(typeof window !== 'undefined' ? window : globalThis);
