/* FH Bridge raw EA v1 demo · C3a · lector del libro tipado (166 columnas).
 *
 * Regla de esta unidad:
 *  - Lee SÓLO filas tipadas (mismo número de columnas que publica el core) de
 *    UN paciente explícito. Una fila heredada de 152 columnas no se lee ni se
 *    atribuye a nadie: sólo se cuenta en `legacyRowCount`. Ausente ≠ «sin EA»:
 *    si no queda ninguna fila tipada del paciente, el resultado es error
 *    `PATIENT_NOT_FOUND`, no un paciente sin episodios.
 *  - Agrupa por `source_event_id`, ordena cada grupo por `row_index` y
 *    decodifica el acto con el core publicado. El orden del libro y el orden
 *    físico de las filas no cambian el resultado.
 *  - No se deduplica nada: una fila repetida (mismo `row_id`) la rechaza el
 *    core como `DUPLICATE_ROW_ID`, de modo que ninguna contradicción de libro
 *    se silencia.
 *  - `history` de un acto = EXACTAMENTE las observaciones de OTROS actos del
 *    mismo paciente citadas por los `basis` de sus observaciones, comparando
 *    `{ patientRef, actId, episode_id, observation_id }` completos, sin
 *    duplicados y en el orden en que se citan. No hay cadena transitiva ni
 *    «todo lo anterior»: sin cita acreditada el acto no ve nada. Un `basis`
 *    que no coincide con ninguna observación leída no se corrige ni se ignora
 *    aquí: lo rechaza la proyección publicada (`UNKNOWN_BASIS`).
 *  - `selections` no se inventa: siempre `[]`. La fecha de un acto es sólo su
 *    `visit_date` literal; si no es un string no vacío no se pone la clave y
 *    nunca se infiere, se ordena por fecha ni se deduce.
 *  - No mezcla pacientes, no expone líneas de tratamiento, no escribe, no
 *    persiste, no lee DOM, red, almacenamiento ni estado global. Todo fallo es
 *    cerrado: `{ ok:false, error:{ code, message } }`, sin resultado parcial
 *    y sin mutar la entrada.
 *
 * Superficie única: `FarmaciaBridgeRawEaV21Reader.readPatient({ patientRef, rows })`.
 */
(function (root) {
    'use strict';

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    function isRecord(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // Objeto simple de verdad, agnóstico de realm: prototipo `null` o un
    // prototipo cuyo propio prototipo es `null`.
    function isPlainRecord(value) {
        if (!isRecord(value)) {
            return false;
        }
        var prototype = Object.getPrototypeOf(value);
        if (prototype === null) {
            return true;
        }
        return Object.getPrototypeOf(prototype) === null;
    }

    function isText(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    // Copia profunda de árboles planos/arrays/escalares. No completa campos ni
    // convierte centinelas: la salida nunca comparte referencias con la entrada.
    function clonePlain(value) {
        var index;
        if (Array.isArray(value)) {
            var list = new Array(value.length);
            for (index = 0; index < value.length; index += 1) {
                list[index] = clonePlain(value[index]);
            }
            return list;
        }
        if (isPlainRecord(value)) {
            var copy = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
            var keys = Object.keys(value);
            for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
                var key = keys[keyIndex];
                Object.defineProperty(copy, key, {
                    value: clonePlain(value[key]),
                    enumerable: true,
                    writable: true,
                    configurable: true
                });
            }
            return copy;
        }
        return value;
    }

    // Dependencias publicadas, comprobadas en CADA llamada: el core tipado, la
    // proyección por paciente y el estado por episodio. Si falta cualquiera, la
    // lectura falla cerrada; no se reimplementa ninguna de sus reglas.
    function dependencies() {
        var core = root.FarmaciaBridgeRawEaV21Core;
        if (!core || typeof core.decodeFollowupRows !== 'function' || !Array.isArray(core.ROW_COLUMNS)) {
            return null;
        }
        var tools = root.HubTools;
        var projection = tools && tools.farmaciaEaPatientProjection;
        var state = tools && tools.farmaciaEaEpisodeState;
        if (!projection || typeof projection.project !== 'function') {
            return null;
        }
        if (!state || typeof state.derive !== 'function') {
            return null;
        }
        return { core: core, projection: projection, state: state };
    }

    function problemCode(problem) {
        if (problem && typeof problem.code === 'string' && problem.code.length > 0) {
            return problem.code;
        }
        return 'ERROR';
    }

    // `row_index` es orden de transporte: se usa sólo para restituir el orden
    // publicado de cada acto, nunca como dato clínico ni como fecha.
    function compareRowIndex(left, right) {
        var leftIndex = typeof left.row_index === 'number' && isFinite(left.row_index) ? left.row_index : Infinity;
        var rightIndex = typeof right.row_index === 'number' && isFinite(right.row_index) ? right.row_index : Infinity;
        if (leftIndex === rightIndex) {
            return 0;
        }
        return leftIndex < rightIndex ? -1 : 1;
    }

    function compareActId(left, right) {
        if (left.actId === right.actId) {
            return 0;
        }
        return left.actId < right.actId ? -1 : 1;
    }

    // Identidad completa de una observación: los cuatro campos, no sólo el id.
    function referenceKey(reference) {
        return JSON.stringify([
            reference.patientRef,
            reference.actId,
            reference.episode_id,
            reference.observation_id
        ]);
    }

    // Historia acreditada del acto: sólo las observaciones de OTROS actos del
    // paciente citadas expresamente por los `basis` del acto, sin duplicados.
    function historyOf(record, referenceIndex) {
        var history = [];
        var cited = [];
        for (var index = 0; index < record.observations.length; index += 1) {
            var observation = record.observations[index];
            if (!isRecord(observation) || !hasOwn(observation, 'basis')) {
                continue;
            }
            var basis = observation.basis;
            // Un `basis` mal formado no se repara: la proyección publicada lo
            // rechaza y su error se devuelve tal cual.
            if (!isRecord(basis)) {
                continue;
            }
            var key = referenceKey(basis);
            if (cited.indexOf(key) !== -1) {
                continue;
            }
            var referenced = referenceIndex.get(key);
            // Una cita que no corresponde a ninguna observación leída se deja
            // intacta: sin historia que la respalde, la proyección falla con
            // `UNKNOWN_BASIS` en lugar de inventar el vínculo.
            if (!referenced) {
                continue;
            }
            // La historia es de actos anteriores, nunca del acto actual.
            if (referenced.actId === record.actId) {
                continue;
            }
            cited.push(key);
            history.push(clonePlain(referenced));
        }
        return history;
    }

    function readPatient(request) {
        try {
            if (!isRecord(request)) {
                return fail('INVALID_REQUEST', 'La petición debe ser un objeto explícito.');
            }
            var patientRef = request.patientRef;
            var rows = request.rows;
            if (!isText(patientRef) || !Array.isArray(rows)) {
                return fail('INVALID_REQUEST', 'Se exige patientRef no vacío y rows como array explícito.');
            }

            var deps = dependencies();
            if (deps === null) {
                return fail('MISSING_DEPENDENCY', 'Faltan el core EA tipado, la proyección por paciente o el estado por episodio.');
            }

            var typedColumnCount = deps.core.ROW_COLUMNS.length;
            var legacyRowCount = 0;
            var buckets = [];
            var bucketBySource = new Map();

            for (var rowPosition = 0; rowPosition < rows.length; rowPosition += 1) {
                var row = rows[rowPosition];
                if (!isPlainRecord(row)) {
                    return fail('INVALID_REQUEST', 'Cada fila del libro debe ser un objeto simple.');
                }
                // Una fila con otro número de columnas es heredada: no se lee
                // como EA ni se atribuye a ningún paciente.
                if (Object.keys(row).length !== typedColumnCount) {
                    legacyRowCount += 1;
                    continue;
                }
                if (row.fh_patient_ref !== patientRef) {
                    continue;
                }
                var sourceKey = row.source_event_id;
                var bucket = bucketBySource.get(sourceKey);
                if (!bucket) {
                    bucket = [];
                    bucketBySource.set(sourceKey, bucket);
                    buckets.push(bucket);
                }
                bucket.push(row);
            }

            if (buckets.length === 0) {
                return fail('PATIENT_NOT_FOUND', 'El libro no contiene filas tipadas de este paciente.');
            }

            var actIds = [];
            var records = [];
            var referenceIndex = new Map();

            for (var bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
                var group = buckets[bucketIndex].slice().sort(compareRowIndex);
                var decoded;
                try {
                    decoded = deps.core.decodeFollowupRows(group);
                } catch (problem) {
                    return fail('INVALID_ROW_SET', 'No se pudo decodificar un acto tipado: ' + problemCode(problem) + '.');
                }
                if (!isRecord(decoded)) {
                    return fail('INVALID_ROW_SET', 'El core no devolvió un acto tipado utilizable.');
                }
                if (actIds.indexOf(decoded.actId) !== -1) {
                    return fail('DUPLICATE_ACT_ID', 'Dos actos distintos del libro comparten actId.');
                }
                actIds.push(decoded.actId);

                var observations = Array.isArray(decoded.adverse_events) ? decoded.adverse_events : [];
                for (var observationIndex = 0; observationIndex < observations.length; observationIndex += 1) {
                    var observation = observations[observationIndex];
                    if (!isRecord(observation)) {
                        continue;
                    }
                    var observationKey = referenceKey(observation);
                    if (!referenceIndex.has(observationKey)) {
                        referenceIndex.set(observationKey, observation);
                    }
                }

                records.push({
                    actId: decoded.actId,
                    present: decoded.present,
                    observations: observations,
                    event: decoded.event
                });
            }

            var actDates = Object.create(null);
            for (var dateIndex = 0; dateIndex < records.length; dateIndex += 1) {
                var dateRecord = records[dateIndex];
                if (isRecord(dateRecord.event) && isText(dateRecord.event.visit_date)) {
                    actDates[dateRecord.actId] = dateRecord.event.visit_date;
                }
            }

            var acts = [];
            for (var actIndex = 0; actIndex < records.length; actIndex += 1) {
                var record = records[actIndex];
                acts.push({
                    actId: record.actId,
                    present: record.present,
                    adverse_events: record.observations,
                    history: historyOf(record, referenceIndex),
                    selections: []
                });
            }
            acts.sort(compareActId);

            var projection = deps.projection.project({ patientRef: patientRef, acts: acts });
            if (isRecord(projection) && projection.ok === false) {
                return projection;
            }
            if (!isRecord(projection) || projection.ok !== true) {
                return fail('INVALID_PROJECTION', 'La proyección no devolvió un resultado utilizable.');
            }

            var state = deps.state.derive(projection, actDates);
            if (isRecord(state) && state.ok === false) {
                return state;
            }
            if (!isRecord(state) || state.ok !== true) {
                return fail('INVALID_STATE', 'El estado por episodio no devolvió un resultado utilizable.');
            }

            return {
                ok: true,
                patientRef: patientRef,
                actCount: acts.length,
                acts: acts,
                actDates: actDates,
                projection: projection,
                state: state,
                legacyRowCount: legacyRowCount
            };
        } catch (problem) {
            return fail('INVALID_READ', 'La lectura del libro no se pudo completar.');
        }
    }

    root.FarmaciaBridgeRawEaV21Reader = Object.freeze({
        readPatient: readPatient
    });
})(typeof window !== 'undefined' ? window : globalThis);
