'use strict';

/* Detalle de la evaluación de causalidad de un episodio de EA, en SOLO
   LECTURA (HANDOFF punto 3, decisión de Sil 08-11). Un bloque común para la
   tarjeta EA del Dashboard del paciente y para cada episodio anterior de la
   Historia de EA de Seguimiento. Pinta SOLO lo declarado en la evaluación del
   modelo: nunca calcula ni infiere puntuación, categoría ni valoración final
   (aquí no hay calculateNaranjoScore); lo no declarado sale «No registrado»
   y sin puntuación (una clave `result` u otra ajena NO es una puntuación).
   Las respuestas van pregunta a pregunta, PLEGADAS bajo «Ver respuestas», en
   el orden del cuestionario (las claves llegan del libro en orden alfabético:
   `q10` antes de `q2`). El DOM se construye con createElement/textContent,
   como en el resto de la aplicación. Sin estilos en línea. Publica
   `window.FarmaciaEaCausalityDetail = { items, render }`. */

(function () {

    var SEP = ' · ';

    // Catálogo de preguntas: textos literales de los cuestionarios de
    // farmacia_seguimiento.html (Naranjo y Karch-Lasagna), en el orden en que
    // se presentan al clínico. El de Naranjo solo se aplica si el método
    // declarado es `naranjo`; el de Karch-Lasagna, solo si es
    // `karch_lasagna`.
    var NARANJO_QUESTIONS = {
        q1: '1. Reacción previamente descrita',
        q2: '2. Evento aparece después de administrar el fármaco',
        q3: '3. Mejora tras retirar fármaco o administrar antagonista',
        q4: '4. Reaparición tras readministración',
        q5: '5. Existen causas alternativas',
        q6: '6. Reaparición con placebo',
        q7: '7. Concentraciones tóxicas detectadas',
        q8: '8. Relación dosis-respuesta',
        q9: '9. Reacción similar previa',
        q10: '10. Evidencia objetiva'
    };
    var KARCH_LASAGNA_QUESTIONS = {
        temporal: '1. Intervalo temporal compatible',
        conocido: '2. Evento conocido para medicamento/clase',
        alternativa: '3. Existe explicación alternativa',
        suspendido: '4. Se suspendió el medicamento',
        mejoraRetirada: '5. Mejoró tras suspensión',
        readministracion: '6. Hubo readministración',
        reaparece: '7. Reapareció tras readministración'
    };
    var ANSWER_LABELS = {
        si: 'Sí',
        no: 'No',
        desconocido: 'Desconocido',
        no_se_sabe: 'No se sabe',
        no_aplica: 'No aplica'
    };

    function isRecord(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value !== '';
    }

    function declaresOwn(object, key) {
        return isRecord(object) && Object.prototype.hasOwnProperty.call(object, key);
    }

    function catalogFor(method) {
        if (method === 'naranjo') return NARANJO_QUESTIONS;
        if (method === 'karch_lasagna') return KARCH_LASAGNA_QUESTIONS;
        return null;
    }

    function methodLabelOf(method) {
        if (method === 'naranjo') return 'Naranjo';
        if (method === 'karch_lasagna') return 'Karch-Lasagna';
        if (isNonEmptyString(method)) return method;
        return 'No registrado';
    }

    function answerText(value) {
        if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(ANSWER_LABELS, value)) {
            return ANSWER_LABELS[value];
        }
        return String(value);
    }

    // Respuestas de una evaluación, en el orden del cuestionario declarado
    // para su método; claves fuera del catálogo al final, en el orden del
    // objeto, con la clave literal como pregunta.
    function answersOf(evaluation, catalog) {
        var declared = evaluation && isRecord(evaluation.answers) ? evaluation.answers : null;
        if (!declared) return [];
        var ordered = [];
        var used = {};
        var catalogKeys = catalog ? Object.keys(catalog) : [];
        var index;
        for (index = 0; index < catalogKeys.length; index += 1) {
            var key = catalogKeys[index];
            if (!Object.prototype.hasOwnProperty.call(declared, key)) continue;
            used[key] = true;
            ordered.push({ question: catalog[key], answer: answerText(declared[key]) });
        }
        var declaredKeys = Object.keys(declared);
        for (index = 0; index < declaredKeys.length; index += 1) {
            var extraKey = declaredKeys[index];
            if (used[extraKey]) continue;
            used[extraKey] = true;
            ordered.push({ question: extraKey, answer: answerText(declared[extraKey]) });
        }
        return ordered;
    }

    // items(episode) → array plano, uno por evaluación declarada en
    // `episode.observations[].evaluations[]`, en el orden del modelo. Nunca
    // lanza: entrada no utilizable → [].
    function items(episode) {
        try {
            if (!isRecord(episode) || !Array.isArray(episode.observations)) return [];
            var result = [];
            for (var observationIndex = 0; observationIndex < episode.observations.length; observationIndex += 1) {
                var observation = episode.observations[observationIndex];
                if (!isRecord(observation) || !Array.isArray(observation.evaluations)) continue;
                var date = isNonEmptyString(observation.date) ? observation.date : 'sin fecha';
                for (var evaluationIndex = 0; evaluationIndex < observation.evaluations.length; evaluationIndex += 1) {
                    var evaluation = observation.evaluations[evaluationIndex];
                    if (!isRecord(evaluation)) continue;
                    var method = isNonEmptyString(evaluation.method) ? evaluation.method : '';
                    result.push({
                        date: date,
                        suspect: isNonEmptyString(evaluation.medicationRef) ? evaluation.medicationRef : 'No registrado',
                        method: method,
                        methodLabel: methodLabelOf(method),
                        // Solo la puntuación declarada como número: `result` u
                        // otra clave no cuenta.
                        score: typeof evaluation.score === 'number' ? evaluation.score : null,
                        category: isNonEmptyString(evaluation.category) ? evaluation.category : null,
                        final_assessment: isNonEmptyString(evaluation.final_assessment) ? evaluation.final_assessment : null,
                        answers: answersOf(evaluation, catalogFor(method))
                    });
                }
            }
            return result;
        } catch (problem) {
            return [];
        }
    }

    function renderItem(item) {
        var itemEl = document.createElement('div');
        itemEl.className = 'ea-causality-detail__item';
        itemEl.setAttribute('data-method', item.method);
        itemEl.setAttribute('data-suspect', item.suspect);

        var summaryEl = document.createElement('p');
        summaryEl.className = 'ea-causality-detail__summary';
        var summaryText = item.date + SEP + item.suspect + SEP + item.methodLabel;
        if (item.score !== null) summaryText += SEP + 'Puntuación ' + item.score;
        summaryText += SEP + (item.category !== null ? item.category : 'Categoría no registrada');
        summaryEl.textContent = summaryText;
        itemEl.appendChild(summaryEl);

        var finalEl = document.createElement('p');
        finalEl.className = 'ea-causality-detail__final';
        finalEl.textContent = 'Valoración final: ' + (item.final_assessment !== null ? item.final_assessment : 'No registrada');
        itemEl.appendChild(finalEl);

        if (item.answers.length > 0) {
            var answersEl = document.createElement('details');
            answersEl.className = 'ea-causality-detail__answers';
            var toggleEl = document.createElement('summary');
            toggleEl.textContent = 'Ver respuestas';
            answersEl.appendChild(toggleEl);
            var answersListEl = document.createElement('ul');
            for (var answerIndex = 0; answerIndex < item.answers.length; answerIndex += 1) {
                var answerEl = document.createElement('li');
                answerEl.textContent = item.answers[answerIndex].question + ': ' + item.answers[answerIndex].answer;
                answersListEl.appendChild(answerEl);
            }
            answersEl.appendChild(answersListEl);
            itemEl.appendChild(answersEl);
        }
        return itemEl;
    }

    // render(episode) → nodo div.ea-causality-detail. Sin evaluaciones
    // declaradas: un único aviso vacío. Nunca lanza.
    function render(episode) {
        var rootEl = document.createElement('div');
        rootEl.className = 'ea-causality-detail';
        var list = items(episode);
        if (!list.length) {
            var emptyEl = document.createElement('p');
            emptyEl.className = 'ea-causality-detail__empty';
            emptyEl.textContent = 'Sin evaluación de causalidad registrada';
            rootEl.appendChild(emptyEl);
            return rootEl;
        }
        for (var index = 0; index < list.length; index += 1) {
            rootEl.appendChild(renderItem(list[index]));
        }
        return rootEl;
    }

    window.FarmaciaEaCausalityDetail = {
        items: items,
        render: render
    };
})();
