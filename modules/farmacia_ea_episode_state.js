/**
 * Estado registrado por episodio de Acontecimientos Adversos 0..N
 * (FH-EA v1 demo).
 *
 * Ownership: este módulo de lectura resume, por episodio ya proyectado, cuál es
 * la ÚLTIMA OBSERVACIÓN REGISTRADA de ese episodio y en qué acto se registró.
 * No introduce datos, no lee DOM, Excel, catálogo, historia importada,
 * almacenamiento ni estado global, no cablea ninguna pantalla, no persiste y no
 * decide evolución clínica: sólo lee lo que la proyección ya declara.
 *
 * Superficie única: `HubTools.farmaciaEaEpisodeState.derive(projection, actDates)`.
 * No reimplementa las reglas de `farmaciaEaPatientProjection.project` ni las del
 * validador de invariantes: consume su resultado.
 *
 * Entrada:
 *   - `projection` es el resultado `ok:true` publicado por `project()`:
 *     `{ ok:true, patientRef, episodes:[{ episode_id, relatedEpisodeId?,
 *     observations:[...] }], ... }`. Un resultado `ok:false` de la proyección se
 *     propaga TAL CUAL (sin envolver y sin resultado parcial): su código y su
 *     mensaje son la autoridad del fallo.
 *   - `actDates` es un objeto plano `{ [actId]: string no vacío }` con la fecha
 *     ya registrada de cada acto. Es transporte puro: aquí no se parsea, no se
 *     compara ni se infiere ninguna fecha. Un acto sin entrada en `actDates`
 *     queda «sin fecha» (`lastDate: null`).
 *
 * Regla (decidida por Sil, 27-10-2026):
 *   - La «última» observación de un episodio NO es la última del array ni la de
 *     fecha mayor: es la observación del episodio que NINGUNA otra observación
 *     DEL MISMO episodio usa como `basis` (se compara `basis.observation_id`).
 *     Una referencia a una observación de otro episodio no desplaza nada.
 *   - Si hay exactamente una candidata, se exponen su `observation_id`, su
 *     `actId`, su `evolution` literal y la fecha de ese acto. Si no hay
 *     exactamente una (varias ramas del mismo episodio, o una cadena sin final
 *     acreditado), el episodio es `ambiguous:true` y no se elige ninguna.
 *   - `closed` es true SÓLO si esa última observación declara
 *     `evolution:'resolution'`. Un acto posterior con `No` / `No consta`, el
 *     silencio o una recurrencia no cierran ni reabren nada.
 *
 * Éxito: `{ ok:true, patientRef, episodes, uniqueEpisodeCount, observationCount,
 * closedEpisodeCount, patientHasDocumentedEa }`, con `episodes` en el orden de
 * transporte de la proyección y cada elemento con las claves exactas
 * `episode_id, observationCount, lastObservationId, lastActId, lastDate,
 * lastEvolution, closed, ambiguous` (más `relatedEpisodeId` sólo si la
 * proyección lo declara).
 *
 * Fallo: `{ ok:false, error:{ code, message } }` con `INVALID_PROJECTION` (la
 * entrada no es un resultado de proyección utilizable) o `INVALID_ACT_DATES`
 * (no es un objeto plano de strings no vacíos), sin resultado parcial.
 *
 * No decide: evolución clínica, gravedad, causalidad, cronología, qué acto es
 * anterior, ni si un episodio sigue en curso. `derive` no muta sus dos entradas
 * y no devuelve referencias a ellas: las salidas son objetos nuevos.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.HubTools) {
        console.error('❌ Error: HubTools namespace no encontrado. Asegúrate de cargar hubTools.js antes de farmacia_ea_episode_state.js.');
        return;
    }

    var HubTools = window.HubTools;

    function isRecord(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    // Objeto plano de verdad: prototipo `null` o un prototipo cuyo propio
    // prototipo es `null`. La prueba es agnóstica de realm (no compara contra
    // `Object.prototype` de ESTE contexto ni usa `instanceof`), porque
    // `actDates` puede llegar de otro contexto de ejecución. Un `Date`, un
    // `Map`, un array o una instancia de clase no son un mapa plano de fechas.
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

    // Los tokens que el módulo copia literales: nunca objetos, nunca fechas.
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
    // la propiedad no existe, está heredada o es un accessor; un getter nunca se
    // invoca. Toda lectura estructural de la proyección (resultado, episodios,
    // observaciones y `basis`) y de las fechas de acto pasa por aquí: ni la
    // proyección ni las fechas de acto pueden cambiar entre lecturas ni aportar
    // valores por la cadena de prototipos.
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

    // ¿La clave está declarada, propia o heredada? Sirve para distinguir «no
    // declarada» de «declarada pero ilegible»: un campo opcional declarado como
    // accessor o por la cadena de prototipos falla cerrado en lugar de fingir
    // que no existe.
    function isDeclared(object, key) {
        return key in object;
    }

    function invalidStructure(message) {
        return { error: fail('INVALID_PROJECTION', message) };
    }

    // Inspecciona sólo la estructura que este módulo necesita consumir y, de
    // paso, la copia a objetos propios: `derive` trabaja después sobre esa copia
    // y no vuelve a leer el objeto del llamador. Del resultado de `project()` se
    // exige lo ya publicado: identidad de paciente, episodios con identidad
    // explícita y observaciones con `actId` y `observation_id`. No se valida de
    // nuevo la integridad de referencias (es de la proyección publicada).
    function inspectObservation(observation) {
        if (!isRecord(observation)) {
            return invalidStructure('Cada observación de la proyección debe ser un objeto explícito.');
        }
        var observationId = ownDataProperty(observation, 'observation_id');
        if (observationId === null || !isNonEmptyString(observationId.value)) {
            return invalidStructure('Cada observación de la proyección debe traer observation_id explícito no vacío propio de datos.');
        }
        var actId = ownDataProperty(observation, 'actId');
        if (actId === null || !isNonEmptyString(actId.value)) {
            return invalidStructure('Cada observación de la proyección debe traer actId explícito no vacío propio de datos.');
        }
        // `evolution` se copia literal (sólo primitivo); si no se declara o no es
        // primitivo, no acredita ninguna evolución y nunca se inventa. Un
        // accessor no puede decidir el cierre.
        var evolution = null;
        if (isDeclared(observation, 'evolution')) {
            var evolutionProperty = ownDataProperty(observation, 'evolution');
            if (evolutionProperty === null) {
                return invalidStructure('evolution no puede ser un accessor ni llegar por la cadena de prototipos.');
            }
            if (isOpaquePrimitive(evolutionProperty.value)) {
                evolution = evolutionProperty.value;
            }
        }
        // `basis` identifica la observación previa dentro del episodio. Si no se
        // declara —o su contenido no es utilizable— no desplaza a ninguna otra:
        // la validez de las referencias no se revalida aquí.
        var basisObservationId = null;
        if (isDeclared(observation, 'basis')) {
            var basisProperty = ownDataProperty(observation, 'basis');
            if (basisProperty === null) {
                return invalidStructure('basis no puede ser un accessor ni llegar por la cadena de prototipos.');
            }
            if (isRecord(basisProperty.value) && isDeclared(basisProperty.value, 'observation_id')) {
                var basisIdProperty = ownDataProperty(basisProperty.value, 'observation_id');
                if (basisIdProperty === null) {
                    return invalidStructure('basis.observation_id no puede ser un accessor ni llegar por la cadena de prototipos.');
                }
                if (isNonEmptyString(basisIdProperty.value)) {
                    basisObservationId = basisIdProperty.value;
                }
            }
        }
        return {
            observation: {
                observation_id: observationId.value,
                actId: actId.value,
                evolution: evolution,
                basisObservationId: basisObservationId
            }
        };
    }

    function inspectEpisode(episode) {
        if (!isRecord(episode)) {
            return invalidStructure('Cada episodio de la proyección debe ser un objeto explícito.');
        }
        var episodeId = ownDataProperty(episode, 'episode_id');
        if (episodeId === null || !isNonEmptyString(episodeId.value)) {
            return invalidStructure('Cada episodio de la proyección debe traer episode_id explícito no vacío propio de datos.');
        }
        var observations = ownDataProperty(episode, 'observations');
        if (observations === null || !Array.isArray(observations.value)) {
            return invalidStructure('Cada episodio de la proyección debe traer observations como array explícito propio de datos.');
        }
        var inspected = { episode_id: episodeId.value, observations: [] };
        if (isDeclared(episode, 'relatedEpisodeId')) {
            var relatedEpisodeId = ownDataProperty(episode, 'relatedEpisodeId');
            if (relatedEpisodeId === null || !isNonEmptyString(relatedEpisodeId.value)) {
                return invalidStructure('relatedEpisodeId, si se declara, debe ser un string no vacío propio de datos.');
            }
            inspected.relatedEpisodeId = relatedEpisodeId.value;
        }
        var sourceObservations = observations.value;
        for (var index = 0; index < sourceObservations.length; index += 1) {
            var checked = inspectObservation(sourceObservations[index]);
            if (checked.error) {
                return checked;
            }
            inspected.observations.push(checked.observation);
        }
        return { episode: inspected };
    }

    function inspectProjection(projection) {
        if (!isRecord(projection)) {
            return invalidStructure('La proyección debe ser un objeto explícito.');
        }
        var ok = ownDataProperty(projection, 'ok');
        if (ok === null || (ok.value !== true && ok.value !== false)) {
            return invalidStructure('La proyección debe declarar ok:true o ok:false como dato propio.');
        }
        var patientRef = ownDataProperty(projection, 'patientRef');
        if (patientRef === null || !isNonEmptyString(patientRef.value)) {
            return invalidStructure('La proyección debe traer patientRef explícito no vacío propio de datos.');
        }
        var episodes = ownDataProperty(projection, 'episodes');
        if (episodes === null || !Array.isArray(episodes.value)) {
            return invalidStructure('La proyección debe traer episodes como array explícito propio de datos.');
        }
        var inspected = { ok: ok.value, patientRef: patientRef.value, episodes: [] };
        var sourceEpisodes = episodes.value;
        for (var index = 0; index < sourceEpisodes.length; index += 1) {
            var checked = inspectEpisode(sourceEpisodes[index]);
            if (checked.error) {
                return checked;
            }
            inspected.episodes.push(checked.episode);
        }
        return { projection: inspected };
    }

    // `actDates` es un mapa plano de fecha ya registrada por acto. Se exige
    // objeto plano (no `Date`, no `Map`, no instancia de clase) y descriptor
    // propio de datos con string no vacío: una fecha numérica, vacía, nula o un
    // accessor falla cerrado en lugar de convertirse en una fecha inventada.
    function inspectActDates(actDates) {
        if (!isPlainRecord(actDates)) {
            return fail('INVALID_ACT_DATES', 'actDates debe ser un objeto plano de actId a fecha registrada.');
        }
        var actIds = Object.keys(actDates);
        for (var index = 0; index < actIds.length; index += 1) {
            var actId = actIds[index];
            var property = ownDataProperty(actDates, actId);
            if (property === null || !isNonEmptyString(property.value)) {
                return fail('INVALID_ACT_DATES', 'Cada fecha de acto debe ser un string no vacío propio de datos.');
            }
        }
        return null;
    }

    // ¿Otra observación DEL MISMO episodio usa a ésta como `basis`? Se compara
    // la identidad ya normalizada (`basis.observation_id`); una referencia a una
    // observación de otro episodio no desplaza nada.
    function isUsedAsBasisBySameEpisode(observations, index) {
        var observationId = observations[index].observation_id;
        for (var otherIndex = 0; otherIndex < observations.length; otherIndex += 1) {
            if (otherIndex === index) {
                continue;
            }
            if (observations[otherIndex].basisObservationId === observationId) {
                return true;
            }
        }
        return false;
    }

    // `episode` es la copia normalizada por `inspectEpisode`: objetos propios del
    // módulo, sin accessors ni prototipos del llamador.
    function deriveEpisode(episode, actDates) {
        var observations = episode.observations;
        var candidates = [];
        for (var index = 0; index < observations.length; index += 1) {
            if (!isUsedAsBasisBySameEpisode(observations, index)) {
                candidates.push(observations[index]);
            }
        }

        var derived = { episode_id: episode.episode_id };
        if (hasOwn(episode, 'relatedEpisodeId')) {
            derived.relatedEpisodeId = episode.relatedEpisodeId;
        }
        derived.observationCount = observations.length;

        // Sin exactamente una candidata no hay último estado acreditado: no se
        // elige ninguna y no se afirma cierre.
        if (candidates.length !== 1) {
            derived.lastObservationId = null;
            derived.lastActId = null;
            derived.lastDate = null;
            derived.lastEvolution = null;
            derived.closed = false;
            derived.ambiguous = true;
            return derived;
        }

        var last = candidates[0];
        var lastActId = last.actId;
        // La fecha es la ya registrada de ese acto o «sin fecha»; nunca se
        // infiere ni se toma de otro acto.
        var dateProperty = ownDataProperty(actDates, lastActId);
        var lastDate = dateProperty !== null && isNonEmptyString(dateProperty.value)
            ? dateProperty.value
            : null;
        var lastEvolution = last.evolution;

        derived.lastObservationId = last.observation_id;
        derived.lastActId = lastActId;
        derived.lastDate = lastDate;
        derived.lastEvolution = lastEvolution;
        derived.closed = lastEvolution === 'resolution';
        derived.ambiguous = false;
        return derived;
    }

    function derive(projection, actDates) {
        try {
            // Un fallo de la proyección es autoridad de la proyección: se
            // propaga sin envolver y sin inventar un resultado parcial. Se lee
            // `ok` como dato propio para no invocar un getter.
            if (isRecord(projection)) {
                var declaredOk = ownDataProperty(projection, 'ok');
                if (declaredOk !== null && declaredOk.value === false) {
                    return projection;
                }
            }

            var inspected = inspectProjection(projection);
            if (inspected.error) {
                return inspected.error;
            }
            var datesError = inspectActDates(actDates);
            if (datesError !== null) {
                return datesError;
            }

            var source = inspected.projection;
            var episodes = [];
            var observationCount = 0;
            var closedEpisodeCount = 0;
            for (var index = 0; index < source.episodes.length; index += 1) {
                var derived = deriveEpisode(source.episodes[index], actDates);
                observationCount += derived.observationCount;
                if (derived.closed === true) {
                    closedEpisodeCount += 1;
                }
                episodes.push(derived);
            }

            return {
                ok: true,
                patientRef: source.patientRef,
                episodes: episodes,
                uniqueEpisodeCount: episodes.length,
                observationCount: observationCount,
                closedEpisodeCount: closedEpisodeCount,
                patientHasDocumentedEa: observationCount > 0
            };
        } catch (problem) {
            return fail('INVALID_PROJECTION', 'El estado por episodio no se pudo derivar.');
        }
    }

    HubTools.farmaciaEaEpisodeState = {
        derive: derive
    };

    if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log('✅ Módulo farmacia_ea_episode_state cargado');
    }
})();
