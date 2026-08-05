/* Ephemeral same-origin handoff between Farmacia Bridge windows. */
(function (root) {
    'use strict';

    var PROTOCOL_VERSION = '1.0.0';
    var PAYLOAD_VERSION = '1.0.0';
    var FRAGMENT_KEY = 'bridge-handoff';
    var READY = 'FARMACIA_BRIDGE_V2_READY';
    var PAYLOAD = 'FARMACIA_BRIDGE_V2_PAYLOAD';

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function cloneSerializable(value) {
        var seen = [];
        JSON.stringify(value, function (key, item) {
            if (typeof item === 'function') throw new TypeError('HANDOFF_NON_SERIALIZABLE');
            if (item && typeof item === 'object') {
                if (seen.indexOf(item) !== -1) throw new TypeError('HANDOFF_NON_SERIALIZABLE');
                seen.push(item);
            }
            return item;
        });
        return JSON.parse(JSON.stringify(value));
    }

    function randomNonce() {
        var bytes = new Uint8Array(18);
        if (!root.crypto || typeof root.crypto.getRandomValues !== 'function') throw new Error('HANDOFF_CRYPTO_UNAVAILABLE');
        root.crypto.getRandomValues(bytes);
        var value = '';
        for (var i = 0; i < bytes.length; i++) value += bytes[i].toString(16).padStart(2, '0');
        return value;
    }

    function buildFragment(nonce) {
        if (typeof nonce !== 'string' || !nonce) throw new TypeError('HANDOFF_NONCE_REQUIRED');
        return '#' + FRAGMENT_KEY + '=' + encodeURIComponent(nonce);
    }

    function parseFragment(hash) {
        var raw = typeof hash === 'string' && hash.charAt(0) === '#' ? hash.slice(1) : '';
        var params = new URLSearchParams(raw);
        var nonce = params.get(FRAGMENT_KEY);
        return nonce ? nonce : null;
    }

    function hasFragmentMarker(hash) {
        var raw = typeof hash === 'string' && hash.charAt(0) === '#' ? hash.slice(1) : '';
        return new URLSearchParams(raw).has(FRAGMENT_KEY);
    }

    function envelope(type, nonce, payload) {
        if (typeof nonce !== 'string' || !nonce) throw new TypeError('HANDOFF_NONCE_REQUIRED');
        var result = { type: type, protocol_version: PROTOCOL_VERSION, nonce: nonce };
        if (payload !== undefined) result.payload_version = PAYLOAD_VERSION, result.payload = payload;
        return result;
    }

    function validateEnvelope(message, type, nonce) {
        return isObject(message) && message.type === type && message.protocol_version === PROTOCOL_VERSION
            && typeof message.nonce === 'string' && message.nonce === nonce
            && (type !== PAYLOAD || message.payload_version === PAYLOAD_VERSION);
    }

    function validatePayload(payload) {
        if (!isObject(payload) || !isObject(payload.search_context) || !isObject(payload.quick_view)) throw new TypeError('HANDOFF_PAYLOAD_REQUIRED');
        var context = payload.search_context;
        if (typeof context.identifier_system !== 'string' || !context.identifier_system.trim()
            || typeof context.identifier_value !== 'string' || !context.identifier_value.trim()) throw new TypeError('HANDOFF_SEARCH_CONTEXT_INVALID');
        var view = payload.quick_view;
        if (typeof view.patient_id !== 'string' || !view.patient_id.trim()) throw new TypeError('HANDOFF_PATIENT_ID_INVALID');
        ['identifiers', 'timeline', 'lines'].forEach(function (key) {
            if (!Array.isArray(view[key])) throw new TypeError('HANDOFF_' + key.toUpperCase() + '_INVALID');
        });
        if (!isObject(view.workbook) || view.workbook.read_model_version !== PAYLOAD_VERSION) throw new TypeError('HANDOFF_WORKBOOK_INVALID');
        if (view.workbook.storage !== 'runtime_memory' || (view.workbook.file_name !== null && typeof view.workbook.file_name !== 'string')) throw new TypeError('HANDOFF_WORKBOOK_INVALID');
        view.identifiers.forEach(function (identifier) {
            if (!isObject(identifier) || typeof identifier.identifier_system !== 'string' || typeof identifier.identifier_value !== 'string') throw new TypeError('HANDOFF_IDENTIFIERS_INVALID');
        });
        view.timeline.forEach(function (event) {
            if (!isObject(event) || typeof event.source_event_id !== 'string' || typeof event.event_id !== 'string' || !Array.isArray(event.rows) || !event.rows.length) throw new TypeError('HANDOFF_TIMELINE_INVALID');
            event.rows.forEach(function (row) {
                if (!isObject(row) || !isObject(row.canonical_row)) throw new TypeError('HANDOFF_TIMELINE_INVALID');
            });
        });
        view.lines.forEach(function (line) {
            if (!isObject(line) || typeof line.line_id !== 'string' || !isObject(line.snapshot)) throw new TypeError('HANDOFF_LINES_INVALID');
        });
        ['warnings', 'structured_proms', 'adherence', 'adverse_events', 'causality_assessments'].forEach(function (key) {
            if (!Array.isArray(view[key])) throw new TypeError('HANDOFF_' + key.toUpperCase() + '_INVALID');
        });
        var found = view.identifiers.some(function (identifier) {
            return isObject(identifier) && identifier.identifier_system === context.identifier_system.trim()
                && identifier.identifier_value === context.identifier_value.trim();
        });
        if (!found) throw new TypeError('HANDOFF_IDENTIFIER_NOT_DECLARED');
        return cloneSerializable(payload);
    }

    root.FarmaciaBridgeV2DashboardHandoff = Object.freeze({
        protocolVersion: PROTOCOL_VERSION,
        payloadVersion: PAYLOAD_VERSION,
        readyType: READY,
        payloadType: PAYLOAD,
        fragmentKey: FRAGMENT_KEY,
        generateNonce: randomNonce,
        buildFragment: buildFragment,
        parseFragment: parseFragment,
        hasFragmentMarker: hasFragmentMarker,
        createReady: function (nonce) { return envelope(READY, nonce); },
        createPayload: function (nonce, payload) { return envelope(PAYLOAD, nonce, validatePayload(payload)); },
        validateEnvelope: validateEnvelope,
        validatePayload: validatePayload,
        cloneSerializable: cloneSerializable
    });
})(typeof window !== 'undefined' ? window : globalThis);
