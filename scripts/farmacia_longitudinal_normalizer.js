'use strict';

(function (root) {
    function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj || {}, key); }
    function explicit(value) { return value !== undefined && value !== null && value !== ''; }
    function clone(value) {
        if (Array.isArray(value)) return value.map(clone);
        if (value && typeof value === 'object') {
            var copy = {};
            Object.keys(value).forEach(function (key) { copy[key] = clone(value[key]); });
            return copy;
        }
        return value;
    }
    function normalizePatient(patient) {
        var normalized = clone(patient || {});
        var rows = Array.isArray(patient && patient.filas_fh) ? patient.filas_fh : [];
        var visits = [], visitById = {}, promKeys = {}, topPromKeys = {}, topProms = {};
        var aeIds = {}, groupedAeIds = {};
        var sourceProms = Array.isArray(normalized.proms) ? normalized.proms : [];
        var sourceEvents = Array.isArray(normalized.eventos_adversos) ? normalized.eventos_adversos : [];
        var proms = [], adverseEvents = [];
        sourceProms.forEach(function (prom) {
            var canDedupe = explicit(prom.visit_id) && explicit(prom.tipo_prom);
            var key = canDedupe ? prom.visit_id + '\u0000' + prom.tipo_prom : '';
            if (canDedupe && promKeys[key]) return;
            if (!canDedupe || !promKeys[key]) proms.push(prom);
            if (canDedupe) {
                promKeys[key] = topPromKeys[key] = true;
                (topProms[prom.visit_id] || (topProms[prom.visit_id] = [])).push(prom);
            }
        });
        sourceEvents.forEach(function (event) {
            var canDedupe = explicit(event.ea_id);
            if (!canDedupe || !aeIds[event.ea_id]) adverseEvents.push(event);
            if (canDedupe) aeIds[event.ea_id] = true;
        });
        rows.forEach(function (source, index) {
            var row = clone(source || {});
            var hasVisitId = explicit(row.visit_id);
            var visit = hasVisitId ? visitById[row.visit_id] : null;
            if (!visit) {
                visit = { fecha: own(row, 'fecha') ? row.fecha : undefined, lineas: [], proms: [], eventos_adversos: [] };
                if (hasVisitId) {
                    visit.visit_id = row.visit_id;
                    visitById[row.visit_id] = visit;
                }
                Object.defineProperty(visit, '_inputOrder', { value: index, enumerable: false });
                Object.defineProperty(visit, '_linesById', { value: {}, enumerable: false });
                Object.defineProperty(visit, '_promKeys', { value: {}, enumerable: false });
                visits.push(visit);
            }
            if (!explicit(visit.fecha) && own(row, 'fecha')) visit.fecha = row.fecha;
            var hasLineId = explicit(row.line_id);
            var line = hasLineId ? visit._linesById[row.line_id] : null;
            if (!line) {
                line = {};
                visit.lineas.push(line);
                if (hasLineId) visit._linesById[row.line_id] = line;
            }
            ['line_id', 'evaluated', 'dispensed', 'tratamiento', 'estado', 'estado_linea', 'nombre_linea', 'nombre_comercial', 'principio_activo'].forEach(function (key) {
                if (own(row, key) && explicit(row[key]) && !own(line, key)) line[key] = clone(row[key]);
            });
            var rowProms = Array.isArray(row.proms) ? row.proms : (row.prom ? [row.prom] : []);
            rowProms.forEach(function (item) {
                var prom = clone(item);
                var canDedupe = hasVisitId && explicit(prom.tipo_prom);
                var key = canDedupe ? row.visit_id + '\u0000' + prom.tipo_prom : '';
                if (canDedupe && (topPromKeys[key] || visit._promKeys[key])) return;
                if (hasVisitId && !own(prom, 'visit_id')) prom.visit_id = row.visit_id;
                visit.proms.push(prom);
                if (canDedupe) visit._promKeys[key] = true;
                if (!canDedupe || !promKeys[key]) {
                    proms.push(clone(prom));
                    if (canDedupe) promKeys[key] = true;
                }
            });
            var rowEvents = Array.isArray(row.eventos_adversos) ? row.eventos_adversos : (row.evento_adverso ? [row.evento_adverso] : []);
            rowEvents.forEach(function (item) {
                var event = clone(item);
                var canDedupe = explicit(event.ea_id);
                if (canDedupe && groupedAeIds[event.ea_id]) return;
                visit.eventos_adversos.push(event);
                if (canDedupe) groupedAeIds[event.ea_id] = true;
                if (!canDedupe || !aeIds[event.ea_id]) adverseEvents.push(clone(event));
                if (canDedupe) aeIds[event.ea_id] = true;
            });
        });
        visits.forEach(function (visit) {
            if (visit.visit_id && topProms[visit.visit_id]) visit.proms = topProms[visit.visit_id].map(clone).concat(visit.proms);
        });
        visits.sort(function (a, b) {
            var aHasDate = explicit(a.fecha);
            var bHasDate = explicit(b.fecha);
            if (aHasDate && bHasDate && a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
            if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
            return a._inputOrder - b._inputOrder;
        });
        normalized.visitas_fh = visits;
        normalized.proms = proms;
        normalized.eventos_adversos = adverseEvents;
        return normalized;
    }
    root.FarmaciaLongitudinal = { normalizePatient: normalizePatient };
})(typeof window !== 'undefined' ? window : globalThis);
