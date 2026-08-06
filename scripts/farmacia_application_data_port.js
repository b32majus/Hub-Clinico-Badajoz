/* Versioned application-facing patient data contract. */
(function (root) {
    'use strict';

    var PORT_VERSION = '1.0.0';
    var METHODS = [
        'listPatients',
        'findByIdentifier',
        'findByPatientId',
        'getPatientProjection',
        'getPatientEvents',
        'getLatestRequestValidation',
        'getVisitsAndLines',
        'getProms',
        'getAdherence',
        'getAdverseEventsAndCausality',
        'getPopulationProjection'
    ];

    function create(implementation) {
        if (!implementation || typeof implementation !== 'object') {
            throw new TypeError('DATA_PORT_IMPLEMENTATION_REQUIRED');
        }
        METHODS.forEach(function (method) {
            if (typeof implementation[method] !== 'function') {
                throw new TypeError('DATA_PORT_METHOD_REQUIRED: ' + method);
            }
        });

        var port = { port_version: PORT_VERSION };
        METHODS.forEach(function (method) {
            port[method] = function () {
                return implementation[method].apply(implementation, arguments);
            };
        });
        return Object.freeze(port);
    }

    root.FarmaciaApplicationDataPort = Object.freeze({
        PORT_VERSION: PORT_VERSION,
        METHODS: Object.freeze(METHODS.slice()),
        create: create
    });
})(typeof window !== 'undefined' ? window : globalThis);
