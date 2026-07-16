'use strict';

(function () {
    var DATASET_URL = 'data/demo/farmacia/farmacia_wo8_runtime_v1.json';
    var ERROR_MESSAGE = 'No se pudo cargar el dataset sintético de Farmacia.';
    var EXPECTED_METADATA = {
        schema: 'farmacia_wo8_runtime_v1',
        source: 'templates/farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx',
        hash: 'ef743757c43f36cf6209133f49a12705e67cba489f4ce5586acd146ea4046e6e',
        synthetic: true
    };
    var emptyDataset = {
        persons: [], acts: [], validations: [], treatment_lines: [], visits: [], followups: [], adverse_events: []
    };
    var dataset = emptyDataset;

    function fail() {
        dataset = emptyDataset;
        if (typeof document !== 'undefined' && document.body) {
            var status = document.getElementById('farmaciaDataSourceError');
            if (!status) {
                status = document.createElement('p');
                status.id = 'farmaciaDataSourceError';
                status.setAttribute('role', 'alert');
                document.body.insertBefore(status, document.body.firstChild);
            }
            status.textContent = ERROR_MESSAGE;
        }
        throw new Error(ERROR_MESSAGE);
    }

    function validate(payload) {
        if (!payload || !payload.metadata) fail();
        var keys = Object.keys(EXPECTED_METADATA);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (payload.metadata[key] !== EXPECTED_METADATA[key]) fail();
        }
        var arrays = Object.keys(emptyDataset);
        for (var j = 0; j < arrays.length; j++) {
            if (!Array.isArray(payload[arrays[j]])) fail();
        }
        return payload;
    }

    function byPatientId(collection, patientId) {
        return collection.filter(function (item) { return item.patient_id === patientId; });
    }

    function getLongitudinalDataset() {
        return { pacientes: dataset.persons.map(function (person) {
            var acts = byPatientId(dataset.acts, person.patient_id);
            var lines = byPatientId(dataset.treatment_lines, person.patient_id);
            var followups = byPatientId(dataset.followups, person.patient_id);
            var events = byPatientId(dataset.adverse_events, person.patient_id);
            var proms = [];
            followups.forEach(function (item) {
                [['HAQ', 'haq'], ['EVA dolor', 'eva_dolor'], ['DLQI', 'dlqi']].forEach(function (field) {
                    if (item[field[1]] !== null) proms.push({ id: null, cip: person.cip, fecha: item.fecha_acto, tipo_prom: field[0], valor: item[field[1]], interpretacion: null, fuente: null });
                });
            });
            return {
                cip: person.cip, nombre_demo: person.patient_id, sexo: person.sex, edad: person.birth_or_age,
                servicios_origen: person.service ? [person.service] : [], patologias: person.pathology ? [person.pathology] : [], comorbilidades_relevantes: [],
                episodios_asistenciales: acts.map(function (item) { return { tipo: item.tipo_acto_fh, fecha: item.fecha_acto, servicio: person.service, estado: item.estado_registro, nota: item.observaciones_generales }; }),
                tratamientos: lines.map(function (item) { return { id: item.linea_id, cip: person.cip, nombre_comercial: item.marca_comercial, principio_activo: item.principio_activo, presentacion_dosis: item.dosis_presentacion, via: item.via, pauta: item.pauta_label || item.pauta_otro_texto, fecha_inicio: item.fecha_inicio, fecha_fin: item.fecha_fin, activo: item.estado_linea === 'activo' || item.estado_linea === 'anadido', motivo_inicio: item.motivo_inicio_cambio_suspension, motivo_suspension: item.motivo_inicio_cambio_suspension, estado_validacion_farmacia: null }; }),
                cambios_pauta: lines.filter(function (item) { return item.tipo_movimiento; }).map(function (item) { return { id: item.linea_id, cip: person.cip, fecha: item.fecha_inicio, tipo: item.tipo_movimiento, motivo: item.motivo_inicio_cambio_suspension, descripcion: null, estado_validacion_farmacia: null, fuente: null }; }),
                proms: proms, actividad_clinica: [],
                eventos_adversos: events.map(function (item) { return { id: item.ea_id, cip: person.cip, fecha: item.fecha_acto, tipo: item.ea_descripcion, gravedad: item.ea_gravedad, relacion_tratamiento: item.causalidad_naranjo || item.causalidad_karch, accion_tomada: item.accion_ea, descripcion_corta: item.ea_descripcion, resuelto: null }; }),
                adherencia: followups.filter(function (item) { return item.adherencia_morisky !== null; }).map(function (item) { return { id: null, cip: person.cip, fecha: item.fecha_acto, escala: null, resultado: null, interpretacion: item.adherencia_morisky, fuente: null }; })
            };
        }) };
    }

    var ready = fetch(DATASET_URL, { cache: 'no-store' })
        .then(function (response) {
            if (!response.ok) fail();
            return response.json();
        })
        .then(function (payload) {
            dataset = validate(payload);
            return api;
        })
        .catch(function () { return fail(); });

    var api = {
        ready: ready,
        errorMessage: ERROR_MESSAGE,
        getPersons: function () { return dataset.persons.slice(); },
        findPersonByCip: function (cip) {
            var target = String(cip || '').trim().toUpperCase();
            if (!target) return null;
            return dataset.persons.find(function (person) {
                return String(person.cip || '').trim().toUpperCase() === target;
            }) || null;
        },
        findPersonById: function (patientId) {
            return dataset.persons.find(function (person) { return person.patient_id === patientId; }) || null;
        },
        getActsByPatientId: function (patientId) { return byPatientId(dataset.acts, patientId); },
        getValidationsByPatientId: function (patientId) { return byPatientId(dataset.validations, patientId); },
        getTreatmentLinesByPatientId: function (patientId) { return byPatientId(dataset.treatment_lines, patientId); },
        getVisitsByPatientId: function (patientId) { return byPatientId(dataset.visits, patientId); },
        getFollowupsByPatientId: function (patientId) { return byPatientId(dataset.followups, patientId); },
        getAdverseEventsByPatientId: function (patientId) { return byPatientId(dataset.adverse_events, patientId); },
        getLongitudinalDataset: getLongitudinalDataset
    };

    window.FarmaciaDataSource = api;
})();
