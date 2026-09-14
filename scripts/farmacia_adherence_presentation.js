'use strict';

/*
 * FarmaciaAdherencePresentation — WO-FH-ADHERENCIA-HUMAN-READABLE-R2-20260914 (issue #355).
 *
 * Presentation-only rendering of structured adherence values that may otherwise
 * leak raw JSON / technical object representations into dashboard surfaces.
 *
 * Contract:
 * - Shows only fields explicitly present in the source record: date, scale /
 *   instrument, result, stored interpretation, source. Technical identifiers
 *   (id, cip, ...) are never rendered as property names or JSON.
 * - No calculation, no reconstruction of missing values, no clinical inference.
 *   Missing fields stay absent; the caller decides the neutral fallback
 *   ('No registrado' or equivalent).
 * - Object/array field values without a supported human form stay neutral
 *   (rendered as missing); raw JSON is never emitted.
 * - Legacy human strings and scalar values (string/number/boolean) pass
 *   through unchanged.
 * - The source value is never mutated.
 */

(function (root) {
    var FIELD_ALIASES = {
        date: ['fecha', 'visit_date'],
        instrument: ['escala', 'instrument'],
        result: ['resultado', 'result'],
        interpretation: ['interpretacion', 'interpretaci\u00f3n'],
        source: ['fuente']
    };

    function isRecord(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    function fieldText(record, label) {
        var aliases = FIELD_ALIASES[label];
        for (var i = 0; i < aliases.length; i++) {
            var value = record[aliases[i]];
            if (value === undefined || value === null || value === '') { continue; }
            // Structured sub-values without a supported human form stay neutral;
            // they are never stringified, keyed or flattened here.
            if (typeof value === 'object') { continue; }
            return String(value);
        }
        return null;
    }

    var FIELD_LABELS = {
        date: 'Fecha',
        instrument: 'Escala',
        result: 'Resultado',
        interpretation: 'Interpretaci\u00f3n',
        source: 'Fuente'
    };

    function recordParts(record) {
        var parts = [];
        var labels = ['date', 'instrument', 'result', 'interpretation', 'source'];
        for (var i = 0; i < labels.length; i++) {
            var text = fieldText(record, labels[i]);
            if (text !== null) { parts.push(FIELD_LABELS[labels[i]] + ': ' + text); }
        }
        return parts;
    }

    /*
     * Renders one adherence value for a dashboard summary field.
     * Returns a human string, or null when the value is absent/unknown or has
     * no supported human form (caller keeps its existing neutral fallback).
     */
    function adherenceDisplayText(adherence) {
        if (adherence === undefined || adherence === null || adherence === '') { return null; }
        if (typeof adherence !== 'object') { return String(adherence); }
        var records = Array.isArray(adherence) ? adherence : [adherence];
        var rendered = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            if (isRecord(record)) {
                var parts = recordParts(record);
                if (parts.length > 0) { rendered.push(parts.join(' · ')); }
            } else if (record !== undefined && record !== null && record !== '') {
                rendered.push(String(record));
            }
        }
        return rendered.length > 0 ? rendered.join(' | ') : null;
    }

    /*
     * Renders a single explicit adherence record field (instrument, result...)
     * for historical lists. Returns a human string or null; never raw JSON.
     */
    function adherenceFieldText(value) {
        if (value === undefined || value === null || value === '') { return null; }
        if (typeof value === 'object') { return null; }
        return String(value);
    }

    root.FarmaciaAdherencePresentation = Object.freeze({
        adherenceDisplayText: adherenceDisplayText,
        adherenceFieldText: adherenceFieldText
    });
})(typeof window !== 'undefined' ? window : globalThis);
