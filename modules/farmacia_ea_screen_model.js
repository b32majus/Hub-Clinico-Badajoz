/**
 * Modelo de pantalla de Acontecimientos Adversos 0..N (FH-EA v1 demo, Tramo C).
 *
 * Ownership: este módulo traduce el resultado `ok:true` ya publicado del lector
 * C3a (`FarmaciaBridgeRawEaV21Reader.readPatient`) a la forma que consumen
 * Dashboard del paciente, Quick View y Estadísticas. Es una función PURA de ese
 * resultado: no lee libro, DOM, Excel, catálogo, historia importada, red ni
 * almacenamiento, no cablea ninguna pantalla, no persiste, no ordena por fecha
 * y no decide nada clínico. Los datos clínicos son los que la proyección y el
 * estado por episodio YA declaran.
 *
 * Superficie única: `HubTools.farmaciaEaScreenModel.build`,
 * `HubTools.farmaciaEaScreenModel.quickView`,
 * `HubTools.farmaciaEaScreenModel.dashboardView`,
 * `HubTools.farmaciaEaScreenModel.cohort` y
 * `HubTools.farmaciaEaScreenModel.fromEnvelope`.
 *
 * `fromEnvelope(envelope)`:
 *   - Traduce un envelope V2 `{ outcome, value? }` a `{ status, model? }` con la
 *     regla única del lector: `ok` sólo si `build` publica un modelo utilizable,
 *     y un modelo no construible es `error`, nunca un dato parcial.
 *
 * `build(readResult)`:
 *   - Entrada: resultado `ok:true` del lector
 *     `{ ok, patientRef, acts, actDates, projection, state, ... }`.
 *   - Por cada episodio de `projection.episodes`, en su orden de transporte, se
 *     une con su entrada de `state.episodes` por `episode_id`. Si falta la
 *     entrada de estado, la entrada no es utilizable.
 *   - Campos del episodio: `episode_id`, `relatedEpisodeId` (sólo si la
 *     proyección lo declara), `closed`, `ambiguous`, `observationCount`,
 *     `statusText`, `description`, `suspects`, `methods`, `observations`.
 *   - `statusText` (regla de «arrastre» de Sil, 27-10-2026): si el episodio es
 *     ambiguo → «Último estado no determinable». Si no, «Último estado
 *     registrado: <etiqueta>, el <fecha>» o «..., sin fecha» cuando la fecha no
 *     está registrada. Etiquetas por `lastEvolution`: continuation→«continúa»,
 *     resolution→«resuelto», recurrence→«recurrencia», sin evolución
 *     indicada→«sin evolución indicada». Registrado ≠ en curso: la palabra
 *     «activo» no aparece en ninguna clave ni valor de salida.
 *   - `description` es la de la observación cuyo `observation_id` es el último
 *     acreditado; string vacío si no hay ninguno o el episodio es ambiguo.
 *   - `suspects` del episodio = unión sin duplicados, en orden de primera
 *     aparición, de los `medicationRef` de las sospechas de TODAS sus
 *     observaciones; `methods` = unión de los `method` de sus evaluaciones.
 *   - Cada observación de salida: `{ observation_id, actId, date, evolution,
 *     description, suspects, evaluations }`, con `date` tomada literalmente de
 *     `actDates[actId]` o `null` (nunca inferida), `evolution` la declarada o
 *     `null`, `suspects` los `medicationRef` de esa observación y `evaluations`
 *     una copia profunda.
 *   - Éxito: `{ ok:true, patientRef, patientHasDocumentedEa, counts:{ episodes,
 *     observations }, episodes }`. `patientHasDocumentedEa` viene de la
 *     proyección; los contadores se calculan de los episodios y observaciones
 *     publicados.
 *
 * `cohort(models, filters)`:
 *   - `models` es un array de salidas `ok:true` de `build`. `filters` ausente o
 *     `undefined` equivale a `{}`; en otro caso debe ser un objeto plano con
 *     SÓLO `suspect` y/o `method`, ambos strings no vacíos.
 *   - El filtro se aplica a nivel de EPISODIO: `suspect` sólo → el episodio lo
 *     declara entre sus sospechosos; `method` sólo → alguna evaluación del
 *     episodio usa ese método; ambos → existe una evaluación con ese método
 *     PARA ese sospechoso.
 *   - Éxito: `{ ok:true, patientsTotal, patients, episodes, observations }` con
 *     tres denominadores: modelos recibidos, modelos con ≥1 episodio que
 *     cumple, episodios que cumplen y la suma de TODAS las observaciones de los
 *     episodios que cumplen.
 *
 * `quickView(model)`:
 *   - Entrada: una salida `ok:true` de `build`.
 *   - Sin episodios: `{ ok:true, title:'Efectos adversos',
 *     lines:['Sin efectos adversos registrados'] }`.
 *   - Si no: `title:'Efectos adversos sin cierre registrado'` y una línea por
 *     episodio con `closed !== true`, en el orden del modelo (sin reordenar):
 *     ambiguo → `<descripción o 'Efecto adverso'> · último estado no
 *     determinable`; si no → `<descripción o 'Efecto adverso'> · último
 *     registro: <stateLabel>, <lastDate o 'sin fecha'>`. Sin episodios sin
 *     cierre → `lines:['Ninguno']`.
 *
 * `dashboardView(model)`:
 *   - Entrada: una salida `ok:true` de `build`. Sin episodios:
 *     `{ ok:true, title:'Efectos adversos', empty:'Sin efectos adversos
 *     registrados', cards:[] }`.
 *   - Si no: `empty:null` y una card por episodio (TODOS, también cerrados), en el
 *     orden del modelo, con `episode_id`, `title` (su `description` o 'Efecto
 *     adverso'), `statusText` literal, `rows` (Sospechosos y Métodos de
 *     causalidad, unidos con ' | ' o 'No registrado') y `observations`
 *     (`<fecha o 'sin fecha'> · <etiqueta> · <descripción o 'Efecto adverso'>`).
 *     No reordena, no infiere, no muta el modelo y nunca dice «activo».
 *
 * Fallo: `{ ok:false, error:{ code, message } }` con `INVALID_READ_RESULT`
 * (entrada no utilizable), `INVALID_MODEL` (modelo de cohorte, de Quick View o
 * de Dashboard no utilizable) o
 * `INVALID_FILTER` (filtros no utilizables), sin resultado parcial. Un
 * `readResult.ok === false` se propaga TAL CUAL, como copia.
 *
 * Ni `build` ni `cohort` mutan sus entradas ni devuelven referencias a ellas:
 * las salidas son objetos nuevos. No hay estado global.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de farmacia_ea_screen_model.js.');
        return;
    }

    var HubTools = window.HubTools;

    var EVOLUTION_LABELS = {
        continuation: 'continúa',
        resolution: 'resuelto',
        recurrence: 'recurrencia'
    };
    var NO_EVOLUTION_LABEL = 'sin evolución indicada';
    var UNDETERMINED_STATUS_TEXT = 'Último estado no determinable';
    var STATUS_PREFIX = 'Último estado registrado: ';
    var FILTER_KEYS = ['suspect', 'method'];

    function isRecord(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    // Objeto plano agnóstico de realm: prototipo `null` o un prototipo cuyo
    // propio prototipo es `null`. Un `Date`, un `Map`, un array o una instancia
    // de clase no son un objeto plano.
    function isPlainRecord(value) {
        if (!isRecord(value)) {
            return false;
        }
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || Object.getPrototypeOf(prototype) === null;
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.length > 0;
    }

    function isOpaquePrimitive(value) {
        var kind = typeof value;
        return kind === 'string' || kind === 'number' || kind === 'boolean';
    }

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function fail(code, message) {
        return { ok: false, error: { code: code, message: message } };
    }

    // Lee una propiedad PROPIA que sea descriptor de DATOS. Devuelve `null` si
    // no existe, está heredada o es un accessor: un getter nunca se invoca y
    // toda lectura estructural pasa por aquí.
    function ownDataProperty(object, key) {
        var descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (!descriptor) {
            return null;
        }
        if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
            return null;
        }
        return { value: descriptor.value };
    }

    function declaredDataValue(object, key) {
        var property = ownDataProperty(object, key);
        return property === null ? undefined : property.value;
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
        if (isRecord(value)) {
            var copy = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
            var keys = Object.keys(value);
            for (index = 0; index < keys.length; index += 1) {
                var key = keys[index];
                var property = ownDataProperty(value, key);
                if (property === null) {
                    continue;
                }
                Object.defineProperty(copy, key, {
                    value: clonePlain(property.value),
                    enumerable: true,
                    configurable: true,
                    writable: true
                });
            }
            return copy;
        }
        return value;
    }

    function pushUnique(list, value) {
        if (!isNonEmptyString(value)) {
            return;
        }
        if (list.indexOf(value) === -1) {
            list.push(value);
        }
    }

    // Etiqueta del último estado registrado del episodio, o `null` cuando el
    // estado no es determinable (ambiguo). La comparten `statusText` y Quick View.
    function stateLabelOf(entry) {
        if (entry.ambiguous) {
            return null;
        }
        if (typeof entry.lastEvolution === 'string' && hasOwn(EVOLUTION_LABELS, entry.lastEvolution)) {
            return EVOLUTION_LABELS[entry.lastEvolution];
        }
        return NO_EVOLUTION_LABEL;
    }

    function statusTextOf(entry) {
        if (entry.ambiguous) {
            return UNDETERMINED_STATUS_TEXT;
        }
        var dateText = isNonEmptyString(entry.lastDate) ? 'el ' + entry.lastDate : 'sin fecha';
        return STATUS_PREFIX + stateLabelOf(entry) + ', ' + dateText;
    }

    // Copia normalizada de una observación de la proyección: identidad
    // explícita, evolución literal, descripción literal y listas ya aplanadas.
    function inspectObservation(observation) {
        if (!isRecord(observation)) {
            return fail('INVALID_READ_RESULT', 'Cada observación proyectada debe ser un objeto explícito.');
        }
        var observationId = declaredDataValue(observation, 'observation_id');
        if (!isNonEmptyString(observationId)) {
            return fail('INVALID_READ_RESULT', 'Cada observación proyectada debe traer observation_id explícito no vacío.');
        }
        var actId = declaredDataValue(observation, 'actId');
        if (!isNonEmptyString(actId)) {
            return fail('INVALID_READ_RESULT', 'Cada observación proyectada debe traer actId explícito no vacío.');
        }
        var evolution = declaredDataValue(observation, 'evolution');
        var description = declaredDataValue(observation, 'description');

        var suspects = [];
        var suspicions = declaredDataValue(observation, 'suspicions');
        if (Array.isArray(suspicions)) {
            for (var suspicionIndex = 0; suspicionIndex < suspicions.length; suspicionIndex += 1) {
                var suspicion = suspicions[suspicionIndex];
                if (isRecord(suspicion)) {
                    pushUnique(suspects, declaredDataValue(suspicion, 'medicationRef'));
                }
            }
        }

        var methods = [];
        var evaluations = [];
        var declaredEvaluations = declaredDataValue(observation, 'evaluations');
        if (Array.isArray(declaredEvaluations)) {
            for (var evaluationIndex = 0; evaluationIndex < declaredEvaluations.length; evaluationIndex += 1) {
                var evaluation = declaredEvaluations[evaluationIndex];
                evaluations.push(clonePlain(evaluation));
                if (isRecord(evaluation)) {
                    pushUnique(methods, declaredDataValue(evaluation, 'method'));
                }
            }
        }

        return {
            observation: {
                observation_id: observationId,
                actId: actId,
                evolution: isOpaquePrimitive(evolution) ? evolution : null,
                description: isNonEmptyString(description) ? description : '',
                suspects: suspects,
                methods: methods,
                evaluations: evaluations
            }
        };
    }

    // Índice `episode_id` → entrada de estado. Duplicados no se normalizan: se
    // toma la primera entrada declarada para esa identidad.
    function indexStateEpisodes(stateEpisodes) {
        var index = Object.create(null);
        for (var position = 0; position < stateEpisodes.length; position += 1) {
            var entry = stateEpisodes[position];
            if (!isRecord(entry)) {
                continue;
            }
            var episodeId = declaredDataValue(entry, 'episode_id');
            if (!isNonEmptyString(episodeId)) {
                continue;
            }
            if (!hasOwn(index, episodeId)) {
                index[episodeId] = entry;
            }
        }
        return index;
    }

    function readStateEntry(stateIndex, episodeId) {
        if (!hasOwn(stateIndex, episodeId)) {
            return fail('INVALID_READ_RESULT', 'Falta la entrada de estado del episodio proyectado.');
        }
        var entry = stateIndex[episodeId];
        var observationCount = declaredDataValue(entry, 'observationCount');
        var closed = declaredDataValue(entry, 'closed');
        var ambiguous = declaredDataValue(entry, 'ambiguous');
        if (typeof observationCount !== 'number' || !isFinite(observationCount) || observationCount < 0) {
            return fail('INVALID_READ_RESULT', 'La entrada de estado debe declarar observationCount numérico.');
        }
        if (typeof closed !== 'boolean' || typeof ambiguous !== 'boolean') {
            return fail('INVALID_READ_RESULT', 'La entrada de estado debe declarar closed y ambiguous booleanos.');
        }
        var lastObservationId = declaredDataValue(entry, 'lastObservationId');
        var lastDate = declaredDataValue(entry, 'lastDate');
        var lastEvolution = declaredDataValue(entry, 'lastEvolution');
        return {
            state: {
                observationCount: observationCount,
                closed: closed,
                ambiguous: ambiguous,
                lastObservationId: isNonEmptyString(lastObservationId) ? lastObservationId : null,
                lastDate: isNonEmptyString(lastDate) ? lastDate : null,
                lastEvolution: isOpaquePrimitive(lastEvolution) ? lastEvolution : null
            }
        };
    }

    function dateOf(actDates, actId) {
        if (!isRecord(actDates) || !hasOwn(actDates, actId)) {
            return null;
        }
        var property = ownDataProperty(actDates, actId);
        if (property === null || !isNonEmptyString(property.value)) {
            return null;
        }
        return property.value;
    }

    function buildEpisode(episode, stateEntry, actDates) {
        var declaredObservations = declaredDataValue(episode, 'observations');
        if (!Array.isArray(declaredObservations)) {
            return fail('INVALID_READ_RESULT', 'Cada episodio proyectado debe traer observations como array.');
        }

        var episodeSuspects = [];
        var episodeMethods = [];
        var observations = [];
        var description = '';
        for (var index = 0; index < declaredObservations.length; index += 1) {
            var inspected = inspectObservation(declaredObservations[index]);
            if (inspected.error) {
                return inspected;
            }
            var source = inspected.observation;
            for (var suspectIndex = 0; suspectIndex < source.suspects.length; suspectIndex += 1) {
                pushUnique(episodeSuspects, source.suspects[suspectIndex]);
            }
            for (var methodIndex = 0; methodIndex < source.methods.length; methodIndex += 1) {
                pushUnique(episodeMethods, source.methods[methodIndex]);
            }
            if (!stateEntry.ambiguous && source.observation_id === stateEntry.lastObservationId) {
                description = source.description;
            }
            observations.push({
                observation_id: source.observation_id,
                actId: source.actId,
                date: dateOf(actDates, source.actId),
                evolution: source.evolution,
                description: source.description,
                suspects: source.suspects,
                evaluations: source.evaluations
            });
        }

        var built = { episode_id: declaredDataValue(episode, 'episode_id') };
        if (hasOwn(episode, 'relatedEpisodeId')) {
            var relatedEpisodeId = declaredDataValue(episode, 'relatedEpisodeId');
            if (isNonEmptyString(relatedEpisodeId)) {
                built.relatedEpisodeId = relatedEpisodeId;
            }
        }
        built.closed = stateEntry.closed;
        built.ambiguous = stateEntry.ambiguous;
        built.observationCount = stateEntry.observationCount;
        built.statusText = statusTextOf(stateEntry);
        built.stateLabel = stateLabelOf(stateEntry);
        built.lastDate = isNonEmptyString(stateEntry.lastDate) ? stateEntry.lastDate : null;
        built.description = stateEntry.ambiguous ? '' : description;
        built.suspects = episodeSuspects;
        built.methods = episodeMethods;
        built.observations = observations;
        return { episode: built };
    }

    function build(readResult) {
        try {
            if (!isRecord(readResult)) {
                return fail('INVALID_READ_RESULT', 'El resultado del lector debe ser un objeto explícito.');
            }
            var declaredOk = declaredDataValue(readResult, 'ok');
            if (declaredOk === false) {
                // Un fallo del lector es autoridad del lector: se propaga tal
                // cual, como copia, sin resultado parcial.
                if (hasOwn(readResult, 'error') && isRecord(declaredDataValue(readResult, 'error'))) {
                    return clonePlain(readResult);
                }
                return fail('INVALID_READ_RESULT', 'Un fallo del lector debe declarar error utilizable.');
            }
            if (declaredOk !== true) {
                return fail('INVALID_READ_RESULT', 'El resultado del lector debe declarar ok:true.');
            }
            var patientRef = declaredDataValue(readResult, 'patientRef');
            if (!isNonEmptyString(patientRef)) {
                return fail('INVALID_READ_RESULT', 'El resultado del lector debe traer patientRef explícito no vacío.');
            }
            var projection = declaredDataValue(readResult, 'projection');
            if (!isRecord(projection)) {
                return fail('INVALID_READ_RESULT', 'El resultado del lector debe traer projection utilizable.');
            }
            var state = declaredDataValue(readResult, 'state');
            if (!isRecord(state)) {
                return fail('INVALID_READ_RESULT', 'El resultado del lector debe traer state utilizable.');
            }
            var projectionEpisodes = declaredDataValue(projection, 'episodes');
            if (!Array.isArray(projectionEpisodes)) {
                return fail('INVALID_READ_RESULT', 'La proyección debe traer episodes como array.');
            }
            var stateEpisodes = declaredDataValue(state, 'episodes');
            if (!Array.isArray(stateEpisodes)) {
                return fail('INVALID_READ_RESULT', 'El estado por episodio debe traer episodes como array.');
            }
            var actDates = declaredDataValue(readResult, 'actDates');
            if (actDates !== undefined && actDates !== null && !isRecord(actDates)) {
                return fail('INVALID_READ_RESULT', 'actDates, si se declara, debe ser un mapa de fechas registradas.');
            }

            var stateIndex = indexStateEpisodes(stateEpisodes);
            var episodes = [];
            var observationCount = 0;
            for (var position = 0; position < projectionEpisodes.length; position += 1) {
                var episode = projectionEpisodes[position];
                if (!isRecord(episode)) {
                    return fail('INVALID_READ_RESULT', 'Cada episodio proyectado debe ser un objeto explícito.');
                }
                var episodeId = declaredDataValue(episode, 'episode_id');
                if (!isNonEmptyString(episodeId)) {
                    return fail('INVALID_READ_RESULT', 'Cada episodio proyectado debe traer episode_id explícito no vacío.');
                }
                var stateChecked = readStateEntry(stateIndex, episodeId);
                if (stateChecked.error) {
                    return stateChecked;
                }
                var built = buildEpisode(episode, stateChecked.state, actDates);
                if (built.error) {
                    return built;
                }
                observationCount += built.episode.observations.length;
                episodes.push(built.episode);
            }

            var declaredDocumented = declaredDataValue(projection, 'patientHasDocumentedEa');
            if (typeof declaredDocumented !== 'boolean') {
                return fail('INVALID_READ_RESULT', 'La proyección debe declarar patientHasDocumentedEa booleano; no se deduce.');
            }
            return {
                ok: true,
                patientRef: patientRef,
                patientHasDocumentedEa: declaredDocumented,
                counts: {
                    episodes: episodes.length,
                    observations: observationCount
                },
                episodes: episodes
            };
        } catch (problem) {
            return fail('INVALID_READ_RESULT', 'El modelo de pantalla no se pudo construir.');
        }
    }

    // Regla única envelope V2 → `{ status, model? }`: `ok` sólo cuando `build`
    // publica un modelo utilizable. Ausente ≠ no registrado: `not_found` y
    // `unavailable` se distinguen y un fallo o modelo roto es `error`.
    function fromEnvelope(envelope) {
        if (!isRecord(envelope)) {
            return { status: 'unavailable' };
        }
        var outcome = declaredDataValue(envelope, 'outcome');
        if (outcome === 'ok') {
            var model;
            try {
                model = build(Object.assign({ ok: true }, declaredDataValue(envelope, 'value')));
            } catch (problem) {
                return { status: 'error' };
            }
            return isRecord(model) && model.ok === true ? { status: 'ok', model: model } : { status: 'error' };
        }
        if (outcome === 'not_found') {
            return { status: 'not_found' };
        }
        if (outcome === 'unavailable') {
            return { status: 'unavailable' };
        }
        return { status: 'error' };
    }

    function modelEpisodeCount(model) {
        return hasOwn(model, 'episodes') && Array.isArray(declaredDataValue(model, 'episodes'))
            ? declaredDataValue(model, 'episodes').length
            : -1;
    }

    function isUsableModel(model) {
        if (!isRecord(model)) {
            return false;
        }
        if (declaredDataValue(model, 'ok') !== true) {
            return false;
        }
        if (!hasOwn(model, 'patientRef')) {
            return false;
        }
        return modelEpisodeCount(model) >= 0;
    }

    function readFilters(filters) {
        if (filters === undefined) {
            return { filters: {} };
        }
        if (!isPlainRecord(filters)) {
            return fail('INVALID_FILTER', 'Los filtros deben ser un objeto plano { suspect?, method? }.');
        }
        var keys = Object.keys(filters);
        for (var index = 0; index < keys.length; index += 1) {
            if (FILTER_KEYS.indexOf(keys[index]) === -1) {
                return fail('INVALID_FILTER', 'Los filtros sólo admiten suspect y method.');
            }
            var value = declaredDataValue(filters, keys[index]);
            if (!isNonEmptyString(value)) {
                return fail('INVALID_FILTER', 'Cada filtro declarado debe ser un string no vacío.');
            }
        }
        return { filters: filters };
    }

    function episodeHasEvaluationFor(episode, suspect, method) {
        var observations = declaredDataValue(episode, 'observations');
        if (!Array.isArray(observations)) {
            return false;
        }
        for (var observationIndex = 0; observationIndex < observations.length; observationIndex += 1) {
            var observation = observations[observationIndex];
            if (!isRecord(observation)) {
                continue;
            }
            var evaluations = declaredDataValue(observation, 'evaluations');
            if (!Array.isArray(evaluations)) {
                continue;
            }
            for (var evaluationIndex = 0; evaluationIndex < evaluations.length; evaluationIndex += 1) {
                var evaluation = evaluations[evaluationIndex];
                if (!isRecord(evaluation)) {
                    continue;
                }
                if (declaredDataValue(evaluation, 'method') === method
                    && declaredDataValue(evaluation, 'medicationRef') === suspect) {
                    return true;
                }
            }
        }
        return false;
    }

    function episodeMatches(episode, suspect, method) {
        if (!isRecord(episode)) {
            return false;
        }
        if (suspect === null && method === null) {
            // Sin filtros, todo episodio publicado cumple.
            return true;
        }
        if (suspect !== null && method !== null) {
            return episodeHasEvaluationFor(episode, suspect, method);
        }
        if (suspect !== null) {
            var suspects = declaredDataValue(episode, 'suspects');
            return Array.isArray(suspects) && suspects.indexOf(suspect) !== -1;
        }
        var methods = declaredDataValue(episode, 'methods');
        return Array.isArray(methods) && methods.indexOf(method) !== -1;
    }

    var QUICK_VIEW_TITLE = 'Efectos adversos sin cierre registrado';
    var QUICK_VIEW_EMPTY_TITLE = 'Efectos adversos';
    var QUICK_VIEW_EMPTY_LINE = 'Sin efectos adversos registrados';
    var QUICK_VIEW_NO_OPEN_LINE = 'Ninguno';
    var QUICK_VIEW_FALLBACK_DESCRIPTION = 'Efecto adverso';
    var UNDETERMINED_QUICK_VIEW_TEXT = 'último estado no determinable';

    // Bloque mínimo de Quick View (decisión de Sil, 29-10-2026): sólo los
    // episodios sin cierre registrado, en el orden del modelo, con la etiqueta y
    // la fecha del último registro ya publicadas. No reordena, no infiere fecha
    // ni descripción, no decide nada clínico y nunca dice «activo».
    function quickView(model) {
        try {
            if (!isRecord(model) || declaredDataValue(model, 'ok') !== true) {
                return fail('INVALID_MODEL', 'Quick View necesita una salida ok:true del modelo de pantalla.');
            }
            var episodes = declaredDataValue(model, 'episodes');
            if (!Array.isArray(episodes)) {
                return fail('INVALID_MODEL', 'El modelo de pantalla debe traer episodes como array.');
            }
            if (typeof declaredDataValue(model, 'patientHasDocumentedEa') !== 'boolean') {
                return fail('INVALID_MODEL', 'El modelo de pantalla debe declarar patientHasDocumentedEa booleano.');
            }
            if (episodes.length === 0) {
                return { ok: true, title: QUICK_VIEW_EMPTY_TITLE, lines: [QUICK_VIEW_EMPTY_LINE] };
            }
            var lines = [];
            for (var index = 0; index < episodes.length; index += 1) {
                var episode = episodes[index];
                if (!isRecord(episode)) {
                    return fail('INVALID_MODEL', 'Cada episodio del modelo debe ser un objeto explícito.');
                }
                if (declaredDataValue(episode, 'closed') === true) {
                    continue;
                }
                var description = declaredDataValue(episode, 'description');
                var subject = isNonEmptyString(description) ? description : QUICK_VIEW_FALLBACK_DESCRIPTION;
                if (declaredDataValue(episode, 'ambiguous') === true) {
                    lines.push(subject + ' · ' + UNDETERMINED_QUICK_VIEW_TEXT);
                    continue;
                }
                var stateLabel = declaredDataValue(episode, 'stateLabel');
                var lastDate = declaredDataValue(episode, 'lastDate');
                lines.push(subject + ' · último registro: '
                    + (isNonEmptyString(stateLabel) ? stateLabel : NO_EVOLUTION_LABEL) + ', '
                    + (isNonEmptyString(lastDate) ? lastDate : 'sin fecha'));
            }
            if (lines.length === 0) {
                lines.push(QUICK_VIEW_NO_OPEN_LINE);
            }
            return { ok: true, title: QUICK_VIEW_TITLE, lines: lines };
        } catch (problem) {
            return fail('INVALID_MODEL', 'Quick View no se pudo construir.');
        }
    }

    var DASHBOARD_TITLE = 'Efectos adversos';
    var DASHBOARD_EMPTY_TEXT = 'Sin efectos adversos registrados';
    var DASHBOARD_FALLBACK_DESCRIPTION = 'Efecto adverso';
    var DASHBOARD_NO_DATE = 'sin fecha';
    var DASHBOARD_NO_RECORD = 'No registrado';
    var DASHBOARD_SEPARATOR = ' | ';
    var DASHBOARD_OBSERVATION_SEPARATOR = ' · ';

    // Valores ya publicados por `build`, unidos tal cual: ni se completan ni se
    // reinterpretan. Una lista vacía se declara como «No registrado».
    function joinedDeclaredValues(values) {
        var parts = [];
        if (Array.isArray(values)) {
            for (var index = 0; index < values.length; index += 1) {
                if (isNonEmptyString(values[index])) {
                    parts.push(values[index]);
                }
            }
        }
        return parts.length === 0 ? DASHBOARD_NO_RECORD : parts.join(DASHBOARD_SEPARATOR);
    }

    function dashboardObservationText(observation) {
        var date = declaredDataValue(observation, 'date');
        var evolution = declaredDataValue(observation, 'evolution');
        var description = declaredDataValue(observation, 'description');
        var label = typeof evolution === 'string' && hasOwn(EVOLUTION_LABELS, evolution)
            ? EVOLUTION_LABELS[evolution]
            : NO_EVOLUTION_LABEL;
        return (isNonEmptyString(date) ? date : DASHBOARD_NO_DATE) + DASHBOARD_OBSERVATION_SEPARATOR
            + label + DASHBOARD_OBSERVATION_SEPARATOR
            + (isNonEmptyString(description) ? description : DASHBOARD_FALLBACK_DESCRIPTION);
    }

    function dashboardCardOf(episode) {
        var description = declaredDataValue(episode, 'description');
        var declaredObservations = declaredDataValue(episode, 'observations');
        var observations = [];
        if (Array.isArray(declaredObservations)) {
            for (var index = 0; index < declaredObservations.length; index += 1) {
                var observation = declaredObservations[index];
                if (!isRecord(observation)) {
                    return fail('INVALID_MODEL', 'Cada observación del episodio debe ser un objeto explícito.');
                }
                observations.push(dashboardObservationText(observation));
            }
        }
        return {
            card: {
                episode_id: declaredDataValue(episode, 'episode_id'),
                title: isNonEmptyString(description) ? description : DASHBOARD_FALLBACK_DESCRIPTION,
                statusText: declaredDataValue(episode, 'statusText'),
                rows: [
                    { label: 'Sospechosos', value: joinedDeclaredValues(declaredDataValue(episode, 'suspects')) },
                    { label: 'Métodos de causalidad', value: joinedDeclaredValues(declaredDataValue(episode, 'methods')) }
                ],
                observations: observations
            }
        };
    }

    // Vista del Dashboard (decisión de Sil, 29-10-2026): la historia completa,
    // incluidos los episodios cerrados, tal como los publica el modelo. La
    // palabra «activo» no aparece en ninguna clave ni valor de salida.
    function dashboardView(model) {
        try {
            if (!isRecord(model) || declaredDataValue(model, 'ok') !== true) {
                return fail('INVALID_MODEL', 'El Dashboard necesita una salida ok:true del modelo de pantalla.');
            }
            var episodes = declaredDataValue(model, 'episodes');
            if (!Array.isArray(episodes)) {
                return fail('INVALID_MODEL', 'El modelo de pantalla debe traer episodes como array.');
            }
            if (typeof declaredDataValue(model, 'patientHasDocumentedEa') !== 'boolean') {
                return fail('INVALID_MODEL', 'El modelo de pantalla debe declarar patientHasDocumentedEa booleano.');
            }
            if (episodes.length === 0) {
                return { ok: true, title: DASHBOARD_TITLE, empty: DASHBOARD_EMPTY_TEXT, cards: [] };
            }
            var cards = [];
            for (var index = 0; index < episodes.length; index += 1) {
                if (!isRecord(episodes[index])) {
                    return fail('INVALID_MODEL', 'Cada episodio del modelo debe ser un objeto explícito.');
                }
                var built = dashboardCardOf(episodes[index]);
                if (built.error) {
                    return built;
                }
                cards.push(built.card);
            }
            return { ok: true, title: DASHBOARD_TITLE, empty: null, cards: cards };
        } catch (problem) {
            return fail('INVALID_MODEL', 'El Dashboard no se pudo construir.');
        }
    }

    function cohort(models, filters) {
        try {
            if (!Array.isArray(models)) {
                return fail('INVALID_MODEL', 'La cohorte debe recibir un array de modelos de pantalla.');
            }
            for (var index = 0; index < models.length; index += 1) {
                if (!isUsableModel(models[index])) {
                    return fail('INVALID_MODEL', 'Cada modelo de la cohorte debe ser una salida ok:true de build.');
                }
            }
            var inspectedFilters = readFilters(filters);
            if (inspectedFilters.error) {
                return inspectedFilters;
            }
            var declaredFilters = inspectedFilters.filters;
            var suspect = hasOwn(declaredFilters, 'suspect') ? declaredFilters.suspect : null;
            var method = hasOwn(declaredFilters, 'method') ? declaredFilters.method : null;

            var patients = 0;
            var episodes = 0;
            var observations = 0;
            for (var modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
                var modelEpisodes = declaredDataValue(models[modelIndex], 'episodes');
                var patientMatched = false;
                for (var episodeIndex = 0; episodeIndex < modelEpisodes.length; episodeIndex += 1) {
                    var episode = modelEpisodes[episodeIndex];
                    if (!episodeMatches(episode, suspect, method)) {
                        continue;
                    }
                    patientMatched = true;
                    episodes += 1;
                    var declaredObservations = isRecord(episode)
                        ? declaredDataValue(episode, 'observations')
                        : null;
                    if (Array.isArray(declaredObservations)) {
                        observations += declaredObservations.length;
                    }
                }
                if (patientMatched) {
                    patients += 1;
                }
            }

            return {
                ok: true,
                patientsTotal: models.length,
                patients: patients,
                episodes: episodes,
                observations: observations
            };
        } catch (problem) {
            return fail('INVALID_MODEL', 'La cohorte no se pudo calcular.');
        }
    }

    HubTools.farmaciaEaScreenModel = {
        build: build,
        fromEnvelope: fromEnvelope,
        quickView: quickView,
        dashboardView: dashboardView,
        cohort: cohort
    };

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('✅ Módulo farmacia_ea_screen_model cargado');
    }
})();
