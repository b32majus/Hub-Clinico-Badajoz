(function (root) {
    'use strict';

    function explicitNursingState(patient) {
        var raw = String(patient && patient.estado_prebiologico_enfermeria || '').trim().toLowerCase();
        if (!raw) return '';
        if (raw.indexOf('ok') !== -1) return 'ok_farmacia';
        if (raw.indexOf('bloque') !== -1) return 'bloqueado';
        if (raw.indexOf('vigil') !== -1) return 'en_vigilancia';
        return '';
    }

    function addLegacyAliases(patient) {
        if (!patient) return patient;
        var drugName = patient.farmaco_solicitado || patient.farmaco || patient.marcaComercial || '';
        if (drugName) {
            patient.farmaco = patient.farmaco || drugName;
            patient.farmaco_solicitado = patient.farmaco_solicitado || drugName;
        }
        return patient;
    }

    function patchDemo(demo) {
        if (!demo || demo.__v4PatientCompatibilityGuard) return demo;
        demo.__v4PatientCompatibilityGuard = true;

        Object.keys(demo.patients || {}).forEach(function (cip) {
            addLegacyAliases(demo.patients[cip]);
        });

        var originalFind = demo.findPatientByCip;
        if (typeof originalFind === 'function') {
            demo.findPatientByCip = function (cip) {
                return addLegacyAliases(originalFind.call(demo, cip));
            };
        }

        var originalNursing = demo.getEnfermeriaVisiblePatients;
        if (typeof originalNursing === 'function') {
            demo.getEnfermeriaVisiblePatients = function () {
                return originalNursing.call(demo).map(function (patient) {
                    addLegacyAliases(patient);
                    var state = explicitNursingState(patient);
                    if (!state) return patient;
                    var adapted = Object.assign({}, patient);
                    adapted.estado = state;
                    return adapted;
                });
            };
        }
        return demo;
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
            var originalReady = demo.ready && typeof demo.ready.then === 'function' ? demo.ready : Promise.resolve(demo);
            demo.ready = originalReady.then(function () { return patchDemo(demo); });
        }
    });
})(typeof window !== 'undefined' ? window : globalThis);
