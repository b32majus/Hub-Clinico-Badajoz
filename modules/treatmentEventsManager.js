/**
 * treatmentEventsManager.js — Eventos terapéuticos en dashboard
 *
 * Módulo de derivación de eventos terapéuticos desde el historial de visitas.
 * Principio rector: derivar eventos desde datos existentes, sin modelo paralelo.
 *
 * Namespace: HubTools.events
 * Versión: 20260503
 */

(function () {
    'use strict';

    // ── Constantes ────────────────────────────────────────────────────

    /**
     * Tipos de eventos terapéuticos detectables.
     * @enum {string}
     */
    var EVENT_TYPES = {
        TREATMENT_START: 'treatment_start',
        TREATMENT_CHANGE: 'treatment_change',
        TREATMENT_SUSPEND: 'treatment_suspend',
        BIOLOGIC_START: 'biologic_start',
        BIOLOGIC_CHANGE: 'biologic_change',
        ADVERSE_EVENT: 'adverse_event',
        FLARE: 'flare',
        REMISSION: 'remission',
        PREBIOLOGIC_APTO: 'prebiologic_apto',
        FH_REQUEST: 'fh_request'
    };

    /**
     * Colores para anotaciones en gráficos.
     * Verde = inicio/remisión, Ámbar = cambio/apto, Rojo = suspensión/flare/adverse, Gris = prebiológico/fh.
     */
    var EVENT_COLORS = {
        treatment_start: 'rgba(40,167,69,0.85)',
        treatment_change: 'rgba(255,193,7,0.85)',
        treatment_suspend: 'rgba(220,53,69,0.85)',
        biologic_start: 'rgba(40,167,69,0.85)',
        biologic_change: 'rgba(255,193,7,0.85)',
        adverse_event: 'rgba(220,53,69,0.85)',
        flare: 'rgba(220,53,69,0.85)',
        remission: 'rgba(40,167,69,0.85)',
        prebiologic_apto: 'rgba(255,193,7,0.85)',
        fh_request: 'rgba(108,117,125,0.85)'
    };

    // ── Helpers privados ──────────────────────────────────────────────

    /**
     * Normaliza texto de tratamiento para comparación robusta.
     * @param {string|null|undefined} text
     * @returns {string} Texto normalizado (trim, lowercase, espacios dobles colapsados)
     */
    function normalizeTreatmentText(text) {
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') return '';
        return text.trim().toLowerCase().replace(/\s{2,}/g, ' ');
    }

    /**
     * Parseo robusto de fechas del hub (formatos DD/MM/YYYY, YYYY-MM-DD, ISO, etc.).
     * @param {string} dateStr
     * @returns {Date|null} Objeto Date o null si no parseable.
     */
    function parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;

        // Intentar d/m/y español (13/01/2024)
        var dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmyMatch) {
            var d = parseInt(dmyMatch[1], 10);
            var m = parseInt(dmyMatch[2], 10) - 1;
            var y = parseInt(dmyMatch[3], 10);
            var date = new Date(y, m, d);
            if (!isNaN(date.getTime())) return date;
        }

        // Intentar ISO (2024-01-13 o 2024-01-13T...)
        var date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;

        return null;
    }

    /**
     * Genera un ID simple para eventos.
     * @param {string} type - Tipo de evento
     * @param {string} date - Fecha ISO
     * @param {number} index - Índice para desambiguar
     * @returns {string} ID del evento
     */
    function generateEventId(type, date, index) {
        return type + '_' + (date || 'nodate') + '_' + index;
    }

    /**
     * Convierte una fecha a string ISO (YYYY-MM-DD).
     * @param {string|Date} value
     * @returns {string} Fecha ISO o string vacío
     */
    function toISODate(value) {
        if (!value) return '';
        var d = value instanceof Date ? value : parseDate(value);
        if (!d) return '';
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
    }

    /**
     * Obtiene la fecha de una visita de forma robusta.
     * @param {Object} visit
     * @returns {string} Fecha ISO
     */
    function getVisitDate(visit) {
        var d = visit.Fecha || visit.Fecha_Visita || visit.fecha || '';
        return toISODate(d);
    }

    /**
     * Extrae el tratamiento actual de una visita (normalizado).
     * @param {Object} visit
     * @returns {string}
     */
    function getTreatmentCurrent(visit) {
        if (!visit) return '';
        return normalizeTreatmentText(
            visit.Tratamiento_Actual !== undefined ? visit.Tratamiento_Actual : ''
        );
    }

    /**
     * Obtiene la decisión terapéutica de una visita (normalizada).
     * @param {Object} visit
     * @returns {string} 'continuar'|'cambiar'|'suspender'|'iniciar'|''
     */
    function getDecisionTerapeutica(visit) {
        if (!visit) return '';
        return normalizeTreatmentText(visit.Decision_Terapeutica || '');
    }

    /**
     * Extrae array de nombres de biológicos de una visita.
     * Prioriza planBiologicoEntries, fallback a biologicoSelect.
     * @param {Object} visit
     * @returns {string[]} Array de nombres de fármacos biológicos
     */
    function getBiologics(visit) {
        if (!visit) return [];
        var list = [];

        if (visit.planBiologicoEntries && Array.isArray(visit.planBiologicoEntries)) {
            for (var i = 0; i < visit.planBiologicoEntries.length; i++) {
                var entry = visit.planBiologicoEntries[i];
                if (entry && entry.farmaco) {
                    list.push(normalizeTreatmentText(entry.farmaco));
                }
            }
        }

        if (list.length === 0 && visit.biologicoSelect) {
            var sel = visit.biologicoSelect;
            if (Array.isArray(sel)) {
                for (var j = 0; j < sel.length; j++) {
                    if (sel[j]) list.push(normalizeTreatmentText(String(sel[j])));
                }
            } else if (typeof sel === 'string' && sel.trim() !== '') {
                list.push(normalizeTreatmentText(sel));
            }
        }

        return list;
    }

    /**
     * Comprueba si hay efectos adversos en la visita.
     * @param {Object} visit
     * @returns {boolean}
     */
    function hasAdverseEffects(visit) {
        if (!visit) return false;

        // Fuente 1: tratamientoData.cambio.efectosAdversos
        if (visit.tratamientoData && visit.tratamientoData.cambio && visit.tratamientoData.cambio.efectosAdversos === true) {
            return true;
        }

        // Fuente 2: Cambio_Efectos_Adversos
        var cae = visit.Cambio_Efectos_Adversos;
        if (cae === 'Sí' || cae === 'SI' || cae === 'si' || cae === true || cae === 'true' || cae === 1 || cae === '1') {
            return true;
        }

        return false;
    }

    /**
     * Obtiene descripción de los efectos adversos.
     * @param {Object} visit
     * @returns {string}
     */
    function getAdverseDescription(visit) {
        if (!visit) return '';
        if (visit.tratamientoData && visit.tratamientoData.cambio && visit.tratamientoData.cambio.descripcionEfectos) {
            return String(visit.tratamientoData.cambio.descripcionEfectos);
        }
        if (visit.Cambio_Descripcion_Efectos) {
            return String(visit.Cambio_Descripcion_Efectos);
        }
        return '';
    }

    /**
     * Determina severidad del evento adverso basado en descripción.
     * @param {string} description
     * @returns {string} 'leve'|'moderado'|'grave'
     */
    function classifyAdverseSeverity(description) {
        if (!description || description.trim().length <= 3) return 'leve';
        var lower = normalizeTreatmentText(description);
        if (lower.indexOf('grave') !== -1 || lower.indexOf('serio') !== -1 ||
            lower.indexOf('sever') !== -1 || lower.indexOf('hospital') !== -1 ||
            lower.indexOf('urgencia') !== -1 || lower.indexOf('anafil') !== -1) {
            return 'grave';
        }
        if (description.trim().length >= 20) return 'moderado';
        return 'leve';
    }

    // ── Funciones de detección ────────────────────────────────────────

    /**
     * Detecta inicio de tratamiento entre visita actual y previa.
     * @param {Object} currentVisit - Visita actual
     * @param {Object|null} previousVisit - Visita anterior (puede ser null)
     * @returns {Object|null} Evento o null
     */
    function detectTreatmentStart(currentVisit, previousVisit) {
        var currentTx = getTreatmentCurrent(currentVisit);

        // Sin tratamiento actual → no hay inicio
        if (currentTx === '') return null;

        // Caso 1: primera visita (no hay visita previa)
        if (!previousVisit) {
            return {
                type: EVENT_TYPES.TREATMENT_START,
                description: 'Inicio de tratamiento: ' + currentTx,
                previousValue: null,
                currentValue: currentTx
            };
        }

        // Caso 2: visita previa sin tratamiento
        var prevTx = getTreatmentCurrent(previousVisit);
        if (prevTx === '') {
            return {
                type: EVENT_TYPES.TREATMENT_START,
                description: 'Inicio de tratamiento: ' + currentTx,
                previousValue: null,
                currentValue: currentTx
            };
        }

        return null;
    }

    /**
     * Detecta cambio de tratamiento entre visitas.
     * @param {Object} currentVisit
     * @param {Object|null} previousVisit
     * @returns {Object|null} Evento o null
     */
    function detectTreatmentChange(currentVisit, previousVisit) {
        if (!previousVisit) return null;

        var currentTx = getTreatmentCurrent(currentVisit);
        var prevTx = getTreatmentCurrent(previousVisit);

        // Ambos deben tener tratamiento no vacío
        if (currentTx === '' || prevTx === '') return null;

        // Diferente → cambio
        if (currentTx !== prevTx) {
            return {
                type: EVENT_TYPES.TREATMENT_CHANGE,
                description: 'Cambio de tratamiento: "' + prevTx + '" → "' + currentTx + '"',
                previousValue: prevTx,
                currentValue: currentTx
            };
        }

        // Mismo tratamiento pero Decision_Terapeutica indica cambio
        var decision = getDecisionTerapeutica(currentVisit);
        if (decision === 'cambiar') {
            return {
                type: EVENT_TYPES.TREATMENT_CHANGE,
                description: 'Decisión terapéutica de cambio de tratamiento',
                previousValue: prevTx,
                currentValue: currentTx,
                notes: 'Decision_Terapeutica = cambiar'
            };
        }

        return null;
    }

    /**
     * Detecta suspensión de tratamiento entre visitas.
     * @param {Object} currentVisit
     * @param {Object|null} previousVisit
     * @returns {Object|null} Evento o null
     */
    function detectTreatmentSuspend(currentVisit, previousVisit) {
        // Caso 1: se suspende explícitamente por decision
        var decision = getDecisionTerapeutica(currentVisit);
        if (decision === 'suspender') {
            var prevTx = getTreatmentCurrent(previousVisit);
            return {
                type: EVENT_TYPES.TREATMENT_SUSPEND,
                description: 'Suspensión de tratamiento' + (prevTx ? ': ' + prevTx : ''),
                previousValue: prevTx || null,
                currentValue: null,
                notes: 'Decision_Terapeutica = suspender'
            };
        }

        // Caso 2: visita previa tenía tratamiento y actual no
        if (!previousVisit) return null;
        var currentTx = getTreatmentCurrent(currentVisit);
        var prevTxForSuspend = getTreatmentCurrent(previousVisit);

        if (prevTxForSuspend !== '' && currentTx === '') {
            return {
                type: EVENT_TYPES.TREATMENT_SUSPEND,
                description: 'Suspensión de tratamiento: ' + prevTxForSuspend,
                previousValue: prevTxForSuspend,
                currentValue: null
            };
        }

        return null;
    }

    /**
     * Detecta eventos de biológicos (inicio, cambio, suspensión).
     * @param {Object} currentVisit
     * @param {Object|null} previousVisit
     * @returns {Object[]} Array de eventos detectados (puede ser múltiple)
     */
    function detectBiologicEvent(currentVisit, previousVisit) {
        var events = [];
        var currentBio = getBiologics(currentVisit);
        var prevBio = getBiologics(previousVisit);

        // Si no hay biológicos ni ahora ni antes → nada
        if (currentBio.length === 0 && prevBio.length === 0) return events;

        // Biológicos nuevos que no estaban antes → biologic_start
        for (var i = 0; i < currentBio.length; i++) {
            if (prevBio.indexOf(currentBio[i]) === -1) {
                events.push({
                    type: EVENT_TYPES.BIOLOGIC_START,
                    description: 'Inicio de biológico: ' + currentBio[i],
                    previousValue: null,
                    currentValue: currentBio[i]
                });
            }
        }

        // Biológicos que desaparecieron → treatment_suspend
        for (var j = 0; j < prevBio.length; j++) {
            if (currentBio.indexOf(prevBio[j]) === -1) {
                events.push({
                    type: EVENT_TYPES.TREATMENT_SUSPEND,
                    description: 'Suspensión de biológico: ' + prevBio[j],
                    previousValue: prevBio[j],
                    currentValue: null
                });
            }
        }

        // Si mismo número de biológicos pero distintos → biologic_change (por simplificación)
        if (currentBio.length > 0 && prevBio.length > 0 &&
            currentBio.length === prevBio.length) {
            var same = true;
            for (var k = 0; k < currentBio.length; k++) {
                if (prevBio.indexOf(currentBio[k]) === -1) {
                    same = false;
                    break;
                }
            }
            if (!same) {
                events.push({
                    type: EVENT_TYPES.BIOLOGIC_CHANGE,
                    description: 'Cambio de biológico: [' + prevBio.join(', ') + '] → [' + currentBio.join(', ') + ']',
                    previousValue: prevBio.join(', '),
                    currentValue: currentBio.join(', ')
                });
            }
        }

        return events;
    }

    /**
     * Detecta eventos adversos en una visita.
     * @param {Object} currentVisit
     * @returns {Object|null} Evento o null
     */
    function detectAdverseEvent(currentVisit) {
        if (!hasAdverseEffects(currentVisit)) return null;

        var description = getAdverseDescription(currentVisit);
        var severity = classifyAdverseSeverity(description);

        return {
            type: EVENT_TYPES.ADVERSE_EVENT,
            description: 'Efecto adverso' + (description ? ': ' + description : ''),
            severity: severity,
            currentValue: description || null
        };
    }

    /**
     * Detecta evento prebiológico (9B.4 — completo).
     *
     * Tipos de evento según estado:
     *   APTO       → prebiologic_apto  "Validación prebiológica: APTO"
     *   EN_CURSO   → prebiologic_apto  "Validación prebiológica: EN CURSO"
     *   NO_APTO    → prebiologic_apto  "Validación prebiológica: NO APTO"
     *   NO_EVALUADO → no genera evento (default)
     *
     * Fecha del evento: prebiologicStatus.fechaValidacion o fechaRegistro.
     *
     * @param {string} cip - CIP del paciente
     * @param {Object|null} prebiologicStatus - Estado prebiológico desde sessionStorage
     * @returns {Object|null} Detection result compatible con buildEvent, o null
     */
    function detectPrebiologicEvent(cip, prebiologicStatus) {
        if (!prebiologicStatus || !prebiologicStatus.estado) return null;

        var estado = prebiologicStatus.estado;

        // NO_EVALUADO es el default — no genera evento
        if (estado === 'NO_EVALUADO') return null;

        // Estados que generan evento: APTO, EN_CURSO, NO_APTO
        var esValido = (estado === 'APTO' || estado === 'EN_CURSO' || estado === 'NO_APTO');
        if (!esValido) return null;

        var fechaStr = toISODate(prebiologicStatus.fechaValidacion || prebiologicStatus.fechaRegistro || '');

        return {
            type: EVENT_TYPES.PREBIOLOGIC_APTO,
            description: 'Validaci\u00f3n prebiol\u00f3gica: ' + estado +
                (fechaStr ? ' (' + fechaStr + ')' : ''),
            currentValue: estado,
            notes: 'CIP: ' + (cip || 'desconocido')
        };
    }

    /**
     * Detecta flare o remisión comparando scores entre visitas (9B.3).
     *
     * Umbrales por patología:
     *   AR:      DAS28      > 5.1 + delta > 1.2 = flare    | < 2.6 + delta < -1.2 = remission
     *   EspA:    BASDAI     > 4.0 + delta > 1.0 = flare    | < 2.0 + delta < -1.0 = remission
     *   APS:     DAPSA      > 14  + delta > 5   = flare    | ≤ 5   + delta < -5   = remission
     *   LES:     SLEDAI-2K  > 6   + delta > 3   = flare    | ≤ 2   + delta < -3   = remission
     *   Sjögren: ESSDAI     > 13  + delta > 4   = flare    | < 5   + delta < -4   = remission
     *
     * @param {Object} currentVisit
     * @param {Object|null} previousVisit
     * @param {string} pathology - Código de patología normalizado (ar|espa|aps|les|sjogren)
     * @returns {Object|null} Detection result compatible con buildEvent, o null
     */
    function detectFlareRemission(currentVisit, previousVisit, pathology) {
        if (!currentVisit || !previousVisit || !pathology) return null;

        var normalizedPathology;
        if (typeof HubTools !== 'undefined' && HubTools.normalizer &&
            typeof HubTools.normalizer.normalizePathology === 'function') {
            normalizedPathology = HubTools.normalizer.normalizePathology(pathology);
        } else {
            normalizedPathology = (pathology || '').toString().toLowerCase().trim();
        }

        var currentScore, previousScore, scoreName;

        switch (normalizedPathology) {
            case 'ar':
                currentScore = parseFloat(currentVisit.DAS28 || currentVisit.das28);
                previousScore = parseFloat(previousVisit.DAS28 || previousVisit.das28);
                scoreName = 'DAS28';
                break;
            case 'espa':
                currentScore = parseFloat(currentVisit.BASDAI || currentVisit.basdai);
                previousScore = parseFloat(previousVisit.BASDAI || previousVisit.basdai);
                scoreName = 'BASDAI';
                break;
            case 'aps':
                currentScore = parseFloat(currentVisit.DAPSA || currentVisit.dapsa);
                previousScore = parseFloat(previousVisit.DAPSA || previousVisit.dapsa);
                scoreName = 'DAPSA';
                break;
            case 'les':
                currentScore = parseFloat(currentVisit.SLEDAI_2K_Result || currentVisit.sledai2k || currentVisit.SLEDAI_Result);
                previousScore = parseFloat(previousVisit.SLEDAI_2K_Result || previousVisit.sledai2k || previousVisit.SLEDAI_Result);
                scoreName = 'SLEDAI-2K';
                break;
            case 'sjogren':
                currentScore = parseFloat(currentVisit.ESSDAI_Result || currentVisit.essdai);
                previousScore = parseFloat(previousVisit.ESSDAI_Result || previousVisit.essdai);
                scoreName = 'ESSDAI';
                break;
            default:
                return null;
        }

        if (isNaN(currentScore) || isNaN(previousScore)) return null;

        var delta = currentScore - previousScore;

        // ── Umbrales por patología ──────────────────────────────────
        var flareThreshold, remissionThreshold, minDeltaFlare, minDeltaRemission;

        switch (normalizedPathology) {
            case 'ar':
                flareThreshold = 5.1; remissionThreshold = 2.6;
                minDeltaFlare = 1.2; minDeltaRemission = -1.2; break;
            case 'espa':
                flareThreshold = 4.0; remissionThreshold = 2.0;
                minDeltaFlare = 1.0; minDeltaRemission = -1.0; break;
            case 'aps':
                flareThreshold = 14; remissionThreshold = 5;
                minDeltaFlare = 5; minDeltaRemission = -5; break;
            case 'les':
                flareThreshold = 6; remissionThreshold = 2;
                minDeltaFlare = 3; minDeltaRemission = -3; break;
            case 'sjogren':
                flareThreshold = 13; remissionThreshold = 5;
                minDeltaFlare = 4; minDeltaRemission = -4; break;
            default:
                return null;
        }

        var eventType = null;
        var description = '';

        if (currentScore > flareThreshold && delta > minDeltaFlare) {
            eventType = EVENT_TYPES.FLARE;
            description = 'Brote de actividad: ' + scoreName + ' ' +
                previousScore + ' \u2192 ' + currentScore;
        } else if (currentScore < remissionThreshold && delta < minDeltaRemission) {
            eventType = EVENT_TYPES.REMISSION;
            description = 'Remisi\u00f3n: ' + scoreName + ' ' +
                previousScore + ' \u2192 ' + currentScore;
        }

        if (!eventType) return null;

        return {
            type: eventType,
            description: description,
            previousValue: previousScore,
            currentValue: currentScore,
            notes: 'scoreName=' + scoreName + ' | delta=' +
                delta.toFixed(2) + ' | pathology=' + normalizedPathology
        };
    }

    /**
     * Construye anotaciones para Chart.js desde eventos (ESQUELETO — 9B.6).
     * @param {Object[]} events - Array de eventos
     * @param {string[]} chartLabels - Labels del eje X del gráfico
     * @returns {Object[]} Array de objetos de anotación para chartjs-plugin-annotation
     */
    function buildChartAnnotationsFromEvents(events, chartLabels) {
        // Implementación pendiente en 9B.6
        // Debe generar objetos { type: 'line', xMin, xMax, borderColor, borderWidth, ... }
        // Con límite de 5 anotaciones visibles
        return [];
    }

    /**
     * Renderiza timeline de eventos en contenedor (ESQUELETO — 9B.5).
     * @param {Object[]} events - Array de eventos
     * @param {string} containerId - ID del elemento DOM contenedor
     */
    function renderTreatmentTimeline(events, containerId) {
        // Implementación pendiente en 9B.5
        // Debe renderizar lista cronológica con iconos, fecha y descripción
        // en el elemento #keyEventsTimeline
    }

    // ── Función principal de extracción ───────────────────────────────

    /**
     * Extrae todos los eventos terapéuticos del historial completo del paciente.
     *
     * @param {Object} patientHistory - Objeto con propiedad `allVisits` (array ordenado cronológicamente)
     * @param {Object|null} prebiologicStatus - Estado prebiológico desde sessionStorage (opcional)
     * @returns {Object[]} Array de eventos ordenados por fecha.
     */
    function extractTreatmentEvents(patientHistory, prebiologicStatus) {
        var events = [];

        if (!patientHistory || !patientHistory.allVisits || !Array.isArray(patientHistory.allVisits)) {
            return events;
        }

        var visits = patientHistory.allVisits;

        // ── Inferir patología ──────────────────────────────────────
        // Fuente 1: patientHistory.pathology (establecido por el dashboard)
        // Fuente 2: primera visita con Diagnostico_Primario / diagnosticoPrimario
        var pathology = patientHistory.pathology || '';
        if (!pathology && visits.length > 0) {
            pathology = visits[0].Diagnostico_Primario || visits[0].diagnosticoPrimario || '';
        }
        if (typeof HubTools !== 'undefined' && HubTools.normalizer &&
            typeof HubTools.normalizer.normalizePathology === 'function') {
            pathology = HubTools.normalizer.normalizePathology(pathology);
        } else {
            pathology = (pathology || '').toString().toLowerCase().trim();
        }

        for (var i = 0; i < visits.length; i++) {
            var currentVisit = visits[i];
            var previousVisit = i > 0 ? visits[i - 1] : null;

            // 1. Inicio de tratamiento
            var startEvt = detectTreatmentStart(currentVisit, previousVisit);
            if (startEvt) {
                events.push(buildEvent(startEvt, currentVisit, i));
            }

            // 2. Cambio de tratamiento
            var changeEvt = detectTreatmentChange(currentVisit, previousVisit);
            if (changeEvt) {
                events.push(buildEvent(changeEvt, currentVisit, i));
            }

            // 3. Suspensión de tratamiento
            var suspendEvt = detectTreatmentSuspend(currentVisit, previousVisit);
            if (suspendEvt) {
                events.push(buildEvent(suspendEvt, currentVisit, i));
            }

            // 4. Biológicos
            var bioEvents = detectBiologicEvent(currentVisit, previousVisit);
            for (var b = 0; b < bioEvents.length; b++) {
                events.push(buildEvent(bioEvents[b], currentVisit, i));
            }

            // 5. Efectos adversos
            var adverseEvt = detectAdverseEvent(currentVisit);
            if (adverseEvt) {
                events.push(buildEvent(adverseEvt, currentVisit, i));
            }

            // 6. Flare/remission — 9B.3: multipatología con umbrales por score
            if (previousVisit && pathology) {
                var flareEvt = detectFlareRemission(currentVisit, previousVisit, pathology);
                if (flareEvt) {
                    events.push(buildEvent(flareEvt, currentVisit, i));
                }
            }
        }

        // 7. Eventos prebiológicos — 9B.4: APTO, EN_CURSO, NO_APTO
        // CIP puede venir de patientHistory o de la primera visita
        var cip = patientHistory.cip || patientHistory.ID_Paciente ||
            (visits.length > 0 ? (visits[0].CIP || visits[0].ID_Paciente || visits[0].cip || '') : '');
        var prebioEvt = detectPrebiologicEvent(cip, prebiologicStatus);
        if (prebioEvt) {
            var prebioDate = (prebiologicStatus && prebiologicStatus.fechaValidacion) ?
                toISODate(prebiologicStatus.fechaValidacion) : '';
            events.push({
                id: generateEventId(prebioEvt.type, prebioDate, events.length),
                date: prebioDate,
                type: prebioEvt.type,
                description: prebioEvt.description,
                source: 'prebiologic',
                visitIndex: null,
                metadata: {
                    currentValue: prebioEvt.currentValue,
                    notes: prebioEvt.notes || ''
                }
            });
        }

        // 8. Placeholder FH request — 9B.4
        // fh_request no es trazable desde visitas actualmente.
        // Requiere campo trazable específico (Solicitud_FH) en futura versión del Excel.
        // Por ahora no se generan eventos falsos ni vacíos.
        // Cuando el campo esté disponible, añadir:
        //   if (visit.Solicitud_FH) events.push(buildEvent({ type: EVENT_TYPES.FH_REQUEST, ... }, visit, i));

        // Ordenar por fecha
        events.sort(function (a, b) {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        });

        return events;
    }

    /**
     * Construye el objeto de evento inmutable según el modelo de datos del PLAN.
     * @param {Object} detectionResult - Resultado de la función de detección
     * @param {Object} visit - Visita fuente
     * @param {number} visitIndex - Índice en allVisits
     * @returns {Object} Evento inmutable
     */
    function buildEvent(detectionResult, visit, visitIndex) {
        var date = getVisitDate(visit);
        var type = detectionResult.type;
        var eventIndex = visitIndex; // puede sobrescribirse si hay múltiples por visita

        var metadata = {};
        if (detectionResult.previousValue !== undefined) metadata.previousValue = detectionResult.previousValue;
        if (detectionResult.currentValue !== undefined) metadata.currentValue = detectionResult.currentValue;
        if (detectionResult.severity) metadata.severity = detectionResult.severity;
        if (detectionResult.notes) metadata.notes = detectionResult.notes;

        return {
            id: generateEventId(type, date, visitIndex),
            date: date,
            type: type,
            description: detectionResult.description || '',
            source: 'visit',
            visitIndex: visitIndex,
            metadata: metadata
        };
    }

    // ── Exposición pública ────────────────────────────────────────────

    var api = {
        // Constantes
        EVENT_TYPES: EVENT_TYPES,
        EVENT_COLORS: EVENT_COLORS,

        // Extracción principal
        extractTreatmentEvents: extractTreatmentEvents,

        // Detectores individuales
        detectTreatmentStart: detectTreatmentStart,
        detectTreatmentChange: detectTreatmentChange,
        detectTreatmentSuspend: detectTreatmentSuspend,
        detectBiologicEvent: detectBiologicEvent,
        detectAdverseEvent: detectAdverseEvent,
        detectPrebiologicEvent: detectPrebiologicEvent,
        detectFlareRemission: detectFlareRemission,

        // Renderizado y anotaciones (esqueletos)
        buildChartAnnotationsFromEvents: buildChartAnnotationsFromEvents,
        renderTreatmentTimeline: renderTreatmentTimeline,

        // Helpers exportados para testing
        _normalizeTreatmentText: normalizeTreatmentText,
        _parseDate: parseDate,
        _generateEventId: generateEventId
    };

    // Asignar al namespace existente
    window.HubTools.events = window.HubTools.events || {};
    Object.assign(window.HubTools.events, api);

    console.log('✅ HubTools.events: treatmentEventsManager inicializado');

})();
