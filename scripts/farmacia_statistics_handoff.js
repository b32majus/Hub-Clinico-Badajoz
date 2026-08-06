/* Same-origin, one-shot population handoff from Inicio to Estadisticas. */
(function (root) {
    'use strict';

    var VERSION = 'farmacia_statistics_handoff_v1';
    var MARKER = 'fh_stats_handoff';
    var DEFAULT_TTL_MS = 15000;
    var MAX_TTL_MS = 45000;
    var MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
    var MAX_PAYLOAD_DEPTH = 32;
    var MAX_PAYLOAD_NODES = 250000;
    var ALLOWED_PAYLOAD_KEYS = [
        'contract_version', 'source_mode', 'source_file_name', 'imported_at',
        'patient_count', 'event_count', 'cohort'
    ];
    var FORBIDDEN_KEYS = {
        workbook: true,
        bytes: true,
        arraybuffer: true,
        readmodel: true,
        bridgereadmodel: true,
        dataport: true,
        currentpatientsession: true,
        drafts: true,
        sessionstorage: true,
        localstorage: true,
        indexeddb: true
    };

    function own(value, key) {
        return Object.prototype.hasOwnProperty.call(value || {}, key);
    }

    function canonical(value) {
        if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
        if (value && typeof value === 'object') {
            return '{' + Object.keys(value).sort().map(function (key) {
                return JSON.stringify(key) + ':' + canonical(value[key]);
            }).join(',') + '}';
        }
        return JSON.stringify(value);
    }

    function payloadDigest(payload) {
        var text = canonical(payload);
        var hash = 2166136261;
        for (var index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return 'fnv1a32-' + (hash >>> 0).toString(16).padStart(8, '0') + '-' + text.length;
    }

    function utf8ByteLength(value) {
        var text = String(value);
        if (typeof root.TextEncoder === 'function') return new root.TextEncoder().encode(text).length;
        return unescape(encodeURIComponent(text)).length;
    }

    function forbiddenKey(key) {
        return FORBIDDEN_KEYS[String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '')] === true;
    }

    function assertSafeTree(value, path, depth, state) {
        if (depth > MAX_PAYLOAD_DEPTH) throw new TypeError('HANDOFF_PAYLOAD_DEPTH_EXCEEDED');
        state.nodes += 1;
        if (state.nodes > MAX_PAYLOAD_NODES) throw new TypeError('HANDOFF_PAYLOAD_NODES_EXCEEDED');
        if (typeof value === 'function') throw new TypeError('HANDOFF_FUNCTION_REJECTED: ' + path);
        if (!value || typeof value !== 'object') return;
        if (typeof ArrayBuffer !== 'undefined' && (value instanceof ArrayBuffer || ArrayBuffer.isView(value))) {
            throw new TypeError('HANDOFF_BINARY_REJECTED: ' + path);
        }
        Object.keys(value).forEach(function (key) {
            if (forbiddenKey(key)) throw new TypeError('HANDOFF_FORBIDDEN_KEY: ' + path + '.' + key);
            assertSafeTree(value[key], path + '.' + key, depth + 1, state);
        });
    }

    function validatePayload(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new TypeError('HANDOFF_PAYLOAD_INVALID');
        }
        Object.keys(payload).forEach(function (key) {
            if (ALLOWED_PAYLOAD_KEYS.indexOf(key) === -1) throw new TypeError('HANDOFF_PAYLOAD_KEY_INVALID: ' + key);
        });
        ALLOWED_PAYLOAD_KEYS.forEach(function (key) {
            if (!own(payload, key)) throw new TypeError('HANDOFF_PAYLOAD_KEY_MISSING: ' + key);
        });
        var cohortModule = root.FarmaciaStatisticsCohort;
        if (!cohortModule || payload.contract_version !== cohortModule.VERSION) {
            throw new TypeError('HANDOFF_CONTRACT_VERSION_INVALID');
        }
        if (payload.source_mode !== 'raw' || !Array.isArray(payload.cohort)) {
            throw new TypeError('HANDOFF_SOURCE_MODE_INVALID');
        }
        if (!Number.isInteger(payload.patient_count) || payload.patient_count !== payload.cohort.length
            || !Number.isInteger(payload.event_count) || payload.event_count < 0) {
            throw new TypeError('HANDOFF_COUNTS_INVALID');
        }
        var patientIds = Object.create(null);
        payload.cohort.forEach(function (patient, index) {
            if (!patient || typeof patient !== 'object' || Array.isArray(patient)
                || patient.stats_schema_version !== payload.contract_version || patient.source_mode !== 'raw') {
                throw new TypeError('HANDOFF_COHORT_RECORD_INVALID: ' + index);
            }
            if (typeof patient.patient_id !== 'string' || !patient.patient_id.trim() || patientIds[patient.patient_id]) {
                throw new TypeError('HANDOFF_PATIENT_ID_INVALID: ' + index);
            }
            patientIds[patient.patient_id] = true;
            if (!Array.isArray(patient.identifiers) || !Array.isArray(patient.services) || !Array.isArray(patient.pathologies)
                || !Array.isArray(patient.lines) || !Array.isArray(patient.proms)
                || patient.source_file_name !== payload.source_file_name
                || (patient.name !== '' && patient.name !== null && patient.name !== undefined)
                || (patient.age !== '' && patient.age !== null && patient.age !== undefined)
                || (patient.sex !== '' && patient.sex !== null && patient.sex !== undefined)) {
                throw new TypeError('HANDOFF_COHORT_RECORD_INVALID: ' + index);
            }
        });
        assertSafeTree(payload, 'payload', 0, { nodes: 0 });
        if (utf8ByteLength(canonical(payload)) > MAX_PAYLOAD_BYTES) throw new TypeError('HANDOFF_PAYLOAD_TOO_LARGE');
        return payload;
    }

    function nonce(cryptoObject) {
        var source = cryptoObject || root.crypto;
        if (source && typeof source.randomUUID === 'function') return source.randomUUID();
        if (source && typeof source.getRandomValues === 'function') {
            var values = new Uint32Array(4);
            source.getRandomValues(values);
            return Array.prototype.map.call(values, function (value) {
                return value.toString(16).padStart(8, '0');
            }).join('-');
        }
        throw new Error('HANDOFF_NONCE_UNAVAILABLE');
    }

    function ttl(value) {
        var requested = Number(value || DEFAULT_TTL_MS);
        return Math.max(1, Math.min(requested, MAX_TTL_MS));
    }

    function createSender(options) {
        var settings = options || {};
        var parentWindow = settings.windowObject || root;
        var childWindow = settings.childWindow;
        var expectedOrigin = settings.origin || parentWindow.location.origin;
        var payload = validatePayload(settings.payload);
        var timerApi = settings.timerApi || parentWindow;
        var active = true;
        var timer = null;

        function cleanup() {
            if (!active) return;
            active = false;
            parentWindow.removeEventListener('message', onMessage);
            if (timer !== null) timerApi.clearTimeout(timer);
            timer = null;
            childWindow = null;
            payload = null;
        }

        function fail(code) {
            cleanup();
            if (typeof settings.onError === 'function') settings.onError(code);
        }

        function onMessage(event) {
            if (!active || event.origin !== expectedOrigin || event.source !== childWindow) return;
            var message = event.data || {};
            if (message.type !== 'FARMACIA_STATISTICS_READY') return;
            if (message.protocol_version !== VERSION) {
                fail('HANDOFF_PROTOCOL_VERSION_INVALID');
                return;
            }
            if (typeof message.child_nonce !== 'string' || message.child_nonce.length < 16) {
                fail('HANDOFF_NONCE_INVALID');
                return;
            }
            var target = childWindow;
            var cohortPayload = payload;
            target.postMessage({
                type: 'FARMACIA_STATISTICS_COHORT',
                protocol_version: VERSION,
                child_nonce: message.child_nonce,
                payload: cohortPayload,
                payload_digest: payloadDigest(cohortPayload)
            }, expectedOrigin);
            cleanup();
            if (typeof settings.onComplete === 'function') settings.onComplete();
        }

        parentWindow.addEventListener('message', onMessage);
        timer = timerApi.setTimeout(function () { fail('HANDOFF_TIMEOUT'); }, ttl(settings.ttlMs));
        return Object.freeze({
            cancel: function () { fail('HANDOFF_CANCELLED'); },
            isActive: function () { return active; }
        });
    }

    function receiverExpected(windowObject) {
        var target = windowObject || root;
        try {
            return new URLSearchParams(target.location.search || '').get(MARKER) === '1';
        } catch (error) {
            return false;
        }
    }

    function removeMarker(windowObject) {
        var target = windowObject || root;
        if (!target.history || typeof target.history.replaceState !== 'function') return;
        var params = new URLSearchParams(target.location.search || '');
        params.delete(MARKER);
        var query = params.toString();
        target.history.replaceState(null, '', (target.location.pathname || '') + (query ? '?' + query : '') + (target.location.hash || ''));
    }

    function receive(options) {
        var settings = options || {};
        var childWindow = settings.windowObject || root;
        if (!receiverExpected(childWindow)) return Promise.resolve(null);
        removeMarker(childWindow);
        var expectedOrigin = settings.origin || childWindow.location.origin;
        var openerWindow = settings.openerWindow || childWindow.opener;
        var timerApi = settings.timerApi || childWindow;
        if (!openerWindow || typeof openerWindow.postMessage !== 'function') {
            return Promise.reject(new Error('HANDOFF_OPENER_UNAVAILABLE'));
        }
        var childNonce;
        try { childNonce = nonce(settings.crypto); } catch (error) { return Promise.reject(error); }

        return new Promise(function (resolve, reject) {
            var settled = false;
            var timer = null;

            function cleanup() {
                childWindow.removeEventListener('message', onMessage);
                if (timer !== null) timerApi.clearTimeout(timer);
                timer = null;
                openerWindow = null;
            }

            function fail(code) {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error(code));
            }

            function onMessage(event) {
                if (settled || event.source !== openerWindow) return;
                if (event.origin !== expectedOrigin) {
                    fail('HANDOFF_ORIGIN_INVALID');
                    return;
                }
                var message = event.data || {};
                if (message.type !== 'FARMACIA_STATISTICS_COHORT') return;
                if (message.protocol_version !== VERSION) {
                    fail('HANDOFF_PROTOCOL_VERSION_INVALID');
                    return;
                }
                if (message.child_nonce !== childNonce) {
                    fail('HANDOFF_NONCE_INVALID');
                    return;
                }
                try {
                    validatePayload(message.payload);
                    if (message.payload_digest !== payloadDigest(message.payload)) throw new TypeError('HANDOFF_PAYLOAD_INTEGRITY_INVALID');
                } catch (error) {
                    fail(error.message || 'HANDOFF_PAYLOAD_INVALID');
                    return;
                }
                settled = true;
                var accepted = message.payload;
                cleanup();
                resolve(accepted);
            }

            childWindow.addEventListener('message', onMessage);
            timer = timerApi.setTimeout(function () { fail('HANDOFF_TIMEOUT'); }, ttl(settings.ttlMs));
            openerWindow.postMessage({
                type: 'FARMACIA_STATISTICS_READY',
                protocol_version: VERSION,
                child_nonce: childNonce
            }, expectedOrigin);
        });
    }

    function senderErrorMessage(code) {
        if (code === 'HANDOFF_POPUP_BLOCKED') return 'No se pudo abrir Estadísticas: el navegador bloqueó la ventana emergente.';
        if (code === 'HANDOFF_TIMEOUT') return 'Estadísticas no confirmó la recepción a tiempo. Vuelva a intentarlo.';
        return 'No se pudo transferir la cohorte a Estadísticas. No se ha enviado una cohorte parcial.';
    }

    function showSenderError(code, documentObject) {
        var doc = documentObject || root.document;
        var message = senderErrorMessage(code);
        var detail = doc && doc.getElementById('detalleCargaFarmacia');
        var status = doc && doc.getElementById('estadoCargaFarmacia');
        if (detail) detail.textContent = message;
        else if (status) status.textContent = message;
        return message;
    }

    function startRawHandoff(link, state, options) {
        var settings = options || {};
        var parentWindow = settings.windowObject || root;
        var cohortModule = settings.cohortModule || parentWindow.FarmaciaStatisticsCohort;
        var targetUrl = new URL(link.href, parentWindow.location.href);
        targetUrl.searchParams.set(MARKER, '1');
        var child = parentWindow.open('', '_blank');
        if (!child) {
            showSenderError('HANDOFF_POPUP_BLOCKED', settings.documentObject || parentWindow.document);
            return { status: 'popup_blocked' };
        }
        var sender;
        try {
            var cohort = cohortModule.buildRawCohort(state.dataPort, {
                fileName: state.fileName || '',
                importedAt: state.importedAt || ''
            });
            var payload = {
                contract_version: cohortModule.VERSION,
                source_mode: 'raw',
                source_file_name: state.fileName || '',
                imported_at: state.importedAt || '',
                patient_count: cohort.length,
                event_count: Number(state.eventCount || cohort.reduce(function (sum, patient) { return sum + Number(patient.valid_event_count || 0); }, 0)),
                cohort: cohort
            };
            sender = createSender({
                windowObject: parentWindow,
                childWindow: child,
                origin: parentWindow.location.origin,
                payload: payload,
                ttlMs: settings.ttlMs,
                timerApi: settings.timerApi,
                onError: function (code) { showSenderError(code, settings.documentObject || parentWindow.document); }
            });
            child.location.replace(targetUrl.href);
            return { status: 'waiting', sender: sender, child: child };
        } catch (error) {
            try { child.close(); } catch (ignore) { /* best effort */ }
            showSenderError(error.message || 'HANDOFF_BUILD_FAILED', settings.documentObject || parentWindow.document);
            return { status: 'error', error: error };
        }
    }

    function isStatisticsLink(link, windowObject) {
        if (!link || !link.href) return false;
        var target = windowObject || root;
        try {
            var url = new URL(link.href, target.location.href);
            var finalPart = url.pathname.split('/').pop();
            return url.origin === target.location.origin && finalPart === 'farmacia_estadisticas.html';
        } catch (error) {
            return false;
        }
    }

    function initSenderLinks(options) {
        var settings = options || {};
        var parentWindow = settings.windowObject || root;
        var doc = settings.documentObject || parentWindow.document;
        if (!doc || typeof doc.addEventListener !== 'function') return false;
        doc.addEventListener('click', function (event) {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
            if (!isStatisticsLink(link, parentWindow)) return;
            var imports = parentWindow.FarmaciaDataImports;
            var state = imports && typeof imports.getState === 'function' ? imports.getState('farmacia') : null;
            if (!state || state.format !== 'farmacia_bridge_v2_raw' || !state.dataPort) return;
            event.preventDefault();
            startRawHandoff(link, state, settings);
        }, true);
        return true;
    }

    root.FarmaciaStatisticsHandoff = Object.freeze({
        VERSION: VERSION,
        MARKER: MARKER,
        MAX_TTL_MS: MAX_TTL_MS,
        MAX_PAYLOAD_BYTES: MAX_PAYLOAD_BYTES,
        receive: receive,
        receiverExpected: receiverExpected,
        initSenderLinks: initSenderLinks,
        createSender: createSender,
        startRawHandoff: startRawHandoff,
        _test: Object.freeze({
            payloadDigest: payloadDigest,
            validatePayload: validatePayload,
            isStatisticsLink: isStatisticsLink,
            showSenderError: showSenderError
        })
    });

    if (root.document && root.location && root.location.pathname.split('/').pop() === 'farmacia_index.html') {
        initSenderLinks();
    }
})(typeof window !== 'undefined' ? window : globalThis);
