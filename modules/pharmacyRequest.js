/**
 * pharmacyRequest.js - Módulo de Solicitud a Farmacia Hospitalaria
 *
 * Genera texto plano de solicitud FH listo para copiar y pegar en orden clínica.
 * Incluye bloques por patología (AR, EspA, APs, LES, Sjögren) y
 * estado prebiológico desde HubTools.prebiologic.
 *
 * Namespace: HubTools.pharmacy
 * Dependencias: HubTools.prebiologic, HubTools.normalizer, HubTools.form (modal fallback)
 */

(function () {
    'use strict';

    // ── Constantes ────────────────────────────────────────────────
    var SEPARATOR = '═══════════════════════════════════════════════════';

    // ── Helpers ───────────────────────────────────────────────────

    /**
     * Obtiene el CIP del paciente desde los datos.
     * Prefiere datos.cip, luego datos.idPaciente.
     */
    function getCIP(datos) {
        if (!datos) return '';
        return (datos.cip || datos.idPaciente || '').toString().trim();
    }

    /**
     * Normaliza la patología usando el normalizer si está disponible.
     */
    function normalizePath(datos) {
        var path = (datos.diagnosticoPrimario || datos.pathology || '').toString().trim();
        if (typeof HubTools !== 'undefined' && HubTools.normalizer && typeof HubTools.normalizer.normalizePathology === 'function') {
            return HubTools.normalizer.normalizePathology(path);
        }
        return path.toLowerCase();
    }

    /**
     * Formatea una fecha ISO o string a DD/MM/YYYY.
     */
    function formatDateES(dateString) {
        if (!dateString) return '';
        try {
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            var dd = String(date.getDate()).padStart(2, '0');
            var mm = String(date.getMonth() + 1).padStart(2, '0');
            var yyyy = date.getFullYear();
            return dd + '/' + mm + '/' + yyyy;
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Devuelve la fecha actual en formato DD/MM/YYYY.
     */
    function todayES() {
        return formatDateES(new Date().toISOString());
    }

    /**
     * Obtiene el valor de un campo del objeto datos, probando múltiples nombres.
     */
    function getField(datos, names, fallback) {
        if (!datos) return fallback !== undefined ? fallback : '';
        for (var i = 0; i < names.length; i++) {
            if (datos[names[i]] !== undefined && datos[names[i]] !== null && datos[names[i]] !== '') {
                return datos[names[i]];
            }
        }
        return fallback !== undefined ? fallback : '';
    }

    // ── Bloques de texto ──────────────────────────────────────────

    /**
     * Genera el bloque de cabecera de la solicitud.
     */
    function getHeaderBlock(datos) {
        var cip = getCIP(datos);
        var nombre = getField(datos, ['nombrePaciente', 'nombre', 'Nombre_Paciente'], 'N/A');
        var profesional = getField(datos, ['profesional', 'Profesional'], '');
        var fecha = datos.fechaVisita ? formatDateES(datos.fechaVisita) : todayES();

        var text = SEPARATOR + '\n';
        text += '        SOLICITUD A FARMACIA HOSPITALARIA\n';
        text += SEPARATOR + '\n';
        text += 'Fecha solicitud: ' + fecha + '\n';
        if (profesional) text += 'Profesional: ' + profesional + '\n';
        text += 'CIP: ' + cip + '\n';
        text += 'Paciente: ' + nombre + '\n\n';
        return text;
    }

    /**
     * Genera el bloque de diagnóstico.
     */
    function getDiagnosisBlock(datos) {
        var primario = getField(datos, ['diagnosticoPrimario', 'Diagnostico_Principal', 'pathology'], 'No especificado');
        var secundario = getField(datos, ['diagnosticoSecundario', 'Diagnostico_Secundario'], '');

        var text = 'DIAGNÓSTICO\n';
        text += 'Diagnóstico Primario: ' + primario + '\n';
        text += 'Diagnóstico Secundario: ' + (secundario || 'Ninguno') + '\n\n';
        return text;
    }

    /**
     * Genera el bloque de evaluación de actividad según patología.
     */
    function getActivityBlock(datos) {
        var pathology = normalizePath(datos);
        var text = 'EVALUACIÓN DE ACTIVIDAD\n';

        if (pathology === 'ar') {
            // Artritis Reumatoide
            var das28Crp = getField(datos, ['das28CrpResult', 'das28Crp', 'DAS28_CRP_Result'], '');
            var das28Esr = getField(datos, ['das28EsrResult', 'das28Esr', 'DAS28_ESR_Result'], '');
            var cdai = getField(datos, ['cdaiResult', 'cdai', 'CDAI_Result'], '');
            var sdai = getField(datos, ['sdaiResult', 'sdai', 'SDAI_Result'], '');
            var rapid3 = getField(datos, ['rapid3Total', 'rapid3Score', 'rapid3Result', 'RAPID3'], '');
            var rapid3Cat = getField(datos, ['rapid3Categoria', 'RAPID3_Categoria'], '');
            var pcr = getField(datos, ['pcr', 'PCR', 'pcrValue'], '');
            var vsg = getField(datos, ['vsg', 'VSG', 'vsgValue'], '');
            var evaMedico = getField(datos, ['evaMedico', 'EVA_Medico'], '');

            if (das28Crp) text += '- DAS28-CRP: ' + das28Crp + '\n';
            if (das28Esr) text += '- DAS28-VSG: ' + das28Esr + '\n';
            if (cdai) text += '- CDAI: ' + cdai + '\n';
            if (sdai) text += '- SDAI: ' + sdai + '\n';
            if (rapid3) {
                text += '- RAPID3: ' + rapid3;
                if (rapid3Cat) text += ' (' + rapid3Cat + ')';
                text += '\n';
            }
            if (pcr) text += '- PCR: ' + pcr + ' mg/L\n';
            if (vsg) text += '- VSG: ' + vsg + ' mm/h\n';
            if (evaMedico) text += '- EVA Médico: ' + evaMedico + '\n';

            if (!das28Crp && !das28Esr && !cdai && !sdai && !rapid3 && !pcr && !vsg && !evaMedico) {
                text += '(Sin datos de actividad registrados)\n';
            }

        } else if (pathology === 'espa') {
            // Espondiloartritis Axial
            var basdaiResult = getField(datos, ['basdaiResult', 'basdai', 'BASDAI'], '');
            var asdasCrp = getField(datos, ['asdasCrpResult', 'asdasCrp', 'ASDAS_CRP'], '');
            var asdasEsr = getField(datos, ['asdasEsrResult', 'asdasEsr', 'ASDAS_ESR'], '');
            var evaGlobal = getField(datos, ['evaGlobal', 'EVA_Global'], '');
            var evaDolor = getField(datos, ['evaDolor', 'EVA_Dolor'], '');
            var pcr = getField(datos, ['pcr', 'PCR', 'pcrValue'], '');
            var vsg = getField(datos, ['vsg', 'VSG', 'vsgValue'], '');

            if (basdaiResult) text += '- BASDAI: ' + basdaiResult + '\n';
            if (asdasCrp) text += '- ASDAS-CRP: ' + asdasCrp + '\n';
            if (asdasEsr) text += '- ASDAS-VSG: ' + asdasEsr + '\n';
            if (evaGlobal) text += '- EVA Global: ' + evaGlobal + '\n';
            if (evaDolor) text += '- EVA Dolor: ' + evaDolor + '\n';
            if (pcr) text += '- PCR: ' + pcr + ' mg/L\n';
            if (vsg) text += '- VSG: ' + vsg + ' mm/h\n';

            if (!basdaiResult && !asdasCrp && !asdasEsr && !evaGlobal && !evaDolor && !pcr && !vsg) {
                text += '(Sin datos de actividad registrados)\n';
            }

        } else if (pathology === 'aps') {
            // Artritis Psoriásica
            var pcr = getField(datos, ['pcr', 'PCR', 'pcrValue'], '');
            var vsg = getField(datos, ['vsg', 'VSG', 'vsgValue'], '');
            text += '- Evaluación de actividad según criterios CASPAR y manifestaciones clínicas.\n';
            if (pcr) text += '- PCR: ' + pcr + ' mg/L\n';
            if (vsg) text += '- VSG: ' + vsg + ' mm/h\n';

        } else if (pathology === 'les') {
            // Lupus Eritematoso Sistémico (placeholder)
            var pcr = getField(datos, ['pcr', 'PCR', 'pcrValue'], '');
            var vsg = getField(datos, ['vsg', 'VSG', 'vsgValue'], '');
            text += '- SLEDAI / SLEDAI-2K: pendiente de implementación formulario\n';
            text += '- Dosis prednisona: pendiente de implementación\n';
            text += '- Manifestaciones activas: pendiente de implementación\n';
            if (pcr) text += '- PCR: ' + pcr + ' mg/L\n';
            if (vsg) text += '- VSG: ' + vsg + ' mm/h\n';

        } else if (pathology === 'sjogren') {
            // Síndrome de Sjögren (placeholder)
            var pcr = getField(datos, ['pcr', 'PCR', 'pcrValue'], '');
            var vsg = getField(datos, ['vsg', 'VSG', 'vsgValue'], '');
            text += '- ESSPRI / ESSDAI: pendiente de implementación formulario\n';
            text += '- EVA sequedad: pendiente de implementación\n';
            if (pcr) text += '- PCR: ' + pcr + ' mg/L\n';
            if (vsg) text += '- VSG: ' + vsg + ' mm/h\n';

        } else {
            // Otra patología - texto genérico
            var pcr = getField(datos, ['pcr', 'PCR', 'pcrValue'], '');
            var vsg = getField(datos, ['vsg', 'VSG', 'vsgValue'], '');
            var evaGlobal = getField(datos, ['evaGlobal', 'EVA_Global'], '');
            if (pcr) text += '- PCR: ' + pcr + ' mg/L\n';
            if (vsg) text += '- VSG: ' + vsg + ' mm/h\n';
            if (evaGlobal) text += '- EVA Global: ' + evaGlobal + '\n';
            if (!pcr && !vsg && !evaGlobal) {
                text += '(Sin datos de actividad registrados)\n';
            }
        }

        return text + '\n';
    }

    /**
     * Genera el bloque de tratamiento actual.
     * Recorre plan*Entries y hace fallback a *Select/*Dose.
     */
    function getTreatmentBlock(datos) {
        var items = [];

        // Recolectar de plan entries (arrays {farmaco, dosis})
        var addEntries = function(entries) {
            if (Array.isArray(entries)) {
                entries.forEach(function(entry) {
                    if (entry && entry.farmaco) {
                        var farmaco = entry.farmaco.toString().trim();
                        if (farmaco && farmaco.toLowerCase() !== 'no') {
                            items.push({ farmaco: farmaco, dosis: (entry.dosis || '').toString().trim() });
                        }
                    }
                });
            }
        };

        addEntries(datos.planSistemicosEntries);
        addEntries(datos.planFamesEntries);
        addEntries(datos.planBiologicosEntries);

        // Fallback a campos individuales si no hay entries
        var addFallback = function(select, dose) {
            if (items.length === 0) {
                var farmaco = (select || '').toString().trim();
                if (farmaco && farmaco.toLowerCase() !== 'no') {
                    items.push({ farmaco: farmaco, dosis: (dose || '').toString().trim() });
                }
            }
        };

        // También revisar cambio*Entries (formulario seguimiento)
        if (items.length === 0) {
            addEntries(datos.cambioSistemicosEntries);
            addEntries(datos.cambioFamesEntries);
            addEntries(datos.cambioBiologicosEntries);
        }

        // Fallback desde datos individuales
        if (items.length === 0) {
            addFallback(getField(datos, ['sistemicoSelect', 'Sistemico'], ''), getField(datos, ['sistemicoDose', 'Sistemico_Dosis'], ''));
            addFallback(getField(datos, ['fameSelect', 'FAME'], ''), getField(datos, ['fameDose', 'FAME_Dosis'], ''));
            addFallback(getField(datos, ['biologicoSelect', 'Biologico'], ''), getField(datos, ['biologicoDose', 'Biologico_Dosis'], ''));
        }

        // También intentar desde tratamientoData.cambio (formulario seguimiento)
        if (items.length === 0 && datos.tratamientoData && datos.tratamientoData.cambio) {
            var cambio = datos.tratamientoData.cambio;
            addFallback(
                getField(cambio.sistemicos || {}, ['farmaco'], ''),
                getField(cambio.sistemicos || {}, ['dosis'], '')
            );
            addFallback(
                getField(cambio.fames || {}, ['farmaco'], ''),
                getField(cambio.fames || {}, ['dosis'], '')
            );
            addFallback(
                getField(cambio.biologicos || {}, ['farmaco'], ''),
                getField(cambio.biologicos || {}, ['dosis'], '')
            );
        }

        // Si todavía no hay items, intentar parsear tratamientoActual como texto
        if (items.length === 0 && datos.tratamientoActual) {
            var ta = datos.tratamientoActual.toString().trim();
            if (ta && ta.toLowerCase() !== 'no') {
                items.push({ farmaco: ta, dosis: '' });
            }
        }

        // Si items sigue vacío, usar los fallback individuales (incluso "No")
        if (items.length === 0) {
            addFallback(getField(datos, ['sistemicoSelect', 'Sistemico'], ''), getField(datos, ['sistemicoDose', 'Sistemico_Dosis'], ''));
            addFallback(getField(datos, ['fameSelect', 'FAME'], ''), getField(datos, ['fameDose', 'FAME_Dosis'], ''));
            addFallback(getField(datos, ['biologicoSelect', 'Biologico'], ''), getField(datos, ['biologicoDose', 'Biologico_Dosis'], ''));
        }

        var text = 'TRATAMIENTO ACTUAL\n';
        if (items.length === 0) {
            text += '(Sin tratamiento activo registrado)\n';
        } else {
            items.forEach(function(item) {
                text += '- ' + item.farmaco;
                if (item.dosis) text += ' ' + item.dosis;
                text += '\n';
            });
        }
        return text + '\n';
    }

    /**
     * Genera el bloque de decisión terapéutica.
     */
    function getDecisionBlock(datos) {
        var decision = getField(datos, ['decisionTerapeutica', 'Decision_Terapeutica'], '');
        if (!decision) return '';

        var text = 'DECISIÓN TERAPÉUTICA\n';
        text += '- Tipo: ';

        switch (decision.toLowerCase()) {
            case 'mantener':
            case 'continuar':
                text += 'Mantener tratamiento actual\n';
                break;
            case 'cambiar':
                text += 'Cambio de tratamiento\n';
                var cambioData = datos.tratamientoData && datos.tratamientoData.cambio ? datos.tratamientoData.cambio : {};

                function agregarCambio(label, slot) {
                    if (slot && slot.farmaco && slot.farmaco.toString().trim().toLowerCase() !== 'no') {
                        text += '  · ' + label + ': ' + slot.farmaco;
                        if (slot.dosis) text += ' ' + slot.dosis;
                        text += '\n';
                    }
                }

                agregarCambio('Biológico', cambioData.biologicos);
                agregarCambio('FAME', cambioData.fames);
                agregarCambio('Sistémico', cambioData.sistemicos);
                break;
            case 'suspender':
                text += 'Suspender tratamiento\n';
                break;
            case 'iniciar':
                text += 'Inicio de nuevo tratamiento\n';
                break;
            default:
                text += decision + '\n';
        }
        return text + '\n';
    }

    /**
     * Genera el bloque prebiológico / vacunación.
     */
    function getPrebiologicBlock(datos) {
        var cip = getCIP(datos);
        var status = null;
        var estado = 'NO_EVALUADO';
        var fechaValidacion = '';
        var notasClinico = '';

        if (typeof HubTools !== 'undefined' && HubTools.prebiologic && typeof HubTools.prebiologic.getStatus === 'function') {
            status = HubTools.prebiologic.getStatus(cip);
        }

        if (status) {
            estado = status.estado || 'NO_EVALUADO';
            fechaValidacion = status.fechaValidacion || '';
            notasClinico = status.notasClinico || '';
        }

        var text = 'ESTADO PREBIOLÓGICO / VACUNACIÓN\n';
        text += '- Estado prebiológico: ' + estado.replace(/_/g, ' ');
        if (fechaValidacion) {
            text += ' (fecha validación: ' + formatDateES(fechaValidacion) + ')';
        }
        text += '\n';
        if (notasClinico) {
            text += '- Notas clínico: ' + notasClinico + '\n';
        }

        // Vacunación (placeholder - no hay datos todavía)
        text += '- Vacuna gripe: <no registrado>\n';
        text += '- Vacuna neumococo: <no registrado>\n';
        text += '- Vacuna COVID: <no registrado>\n';
        text += '- Vacuna VHB: <no registrado>\n';

        return text + '\n';
    }

    /**
     * Genera el bloque de comorbilidades activas / factores relevantes.
     * Detecta comorbilidades desde múltiples nombres de campo posibles.
     */
    function getComorbiditiesBlock(datos) {
        var ACTIVE_VALUES = ['si', 'sí', 'true', '1', 'activa'];
        var COMORBIDITY_MAP = {
            hta: 'HTA',
            dm: 'Diabetes Mellitus',
            dlp: 'Dislipidemia',
            ecv: 'Enfermedad cardiovascular',
            gastritis: 'Gastritis/úlcera péptica',
            obesidad: 'Obesidad',
            osteoporosis: 'Osteoporosis',
            gota: 'Gota/hiperuricemia'
        };

        var active = [];

        /**
         * Comprueba si un valor indica comorbilidad activa.
         */
        function isActive(val) {
            if (val === undefined || val === null || val === '') return false;
            if (val === true) return true;
            var s = val.toString().trim().toLowerCase();
            return ACTIVE_VALUES.indexOf(s) !== -1;
        }

        /**
         * Intenta extraer comorbilidades de un array o string.
         */
        function collectFromSource(source) {
            if (!source) return;

            // Si es un string, intentar split por coma o ;
            if (typeof source === 'string') {
                var parts = source.split(/[,;]+/);
                parts.forEach(function(p) {
                    var key = p.trim().toLowerCase();
                    if (key === 'activa') return; // descartar palabra suelta
                    if (COMORBIDITY_MAP[key]) {
                        active.push(key);
                    }
                });
                return;
            }

            // Si es array de strings
            if (Array.isArray(source)) {
                source.forEach(function(item) {
                    if (typeof item === 'string') {
                        var key = item.trim().toLowerCase();
                        if (key === 'activa') return;
                        if (COMORBIDITY_MAP[key]) {
                            active.push(key);
                        }
                    } else if (typeof item === 'object' && item !== null) {
                        // Array de objetos: {nombre: 'HTA', activa: true}
                        var name = (item.nombre || item.name || item.comorbilidad || '').toString().trim().toLowerCase();
                        if (name === 'activa') return;
                        if (COMORBIDITY_MAP[name]) {
                            if (isActive(item.activa || item.activo || item.valor || true)) {
                                active.push(name);
                            }
                        }
                    }
                });
                return;
            }
        }

        // 1. Intentar fuentes agregadas: comorbilidades, comorbilidadesActivas, Comorbilidades
        collectFromSource(datos.comorbilidades);
        collectFromSource(datos.comorbilidadesActivas);
        collectFromSource(datos.Comorbilidades);

        // 2. Intentar campos booleanos/string individuales
        Object.keys(COMORBIDITY_MAP).forEach(function(key) {
            // Probar múltiples variantes de nombre: Comorbilidad_HTA, comorbilidadHTA, hta, etc.
            var variants = [
                'Comorbilidad_' + key.toUpperCase(),
                'comorbilidad' + key.charAt(0).toUpperCase() + key.slice(1),
                key
            ];

            for (var i = 0; i < variants.length; i++) {
                if (isActive(datos[variants[i]])) {
                    if (active.indexOf(key) === -1) {
                        active.push(key);
                    }
                    break;
                }
            }
        });

        // Construir texto
        var text = '▓▓▓ COMORBILIDADES ACTIVAS / FACTORES RELEVANTES ▓▓▓\n';
        if (active.length === 0) {
            text += '- Sin comorbilidades activas registradas\n';
        } else {
            // Desduplicar manteniendo orden
            var seen = {};
            var unique = [];
            active.forEach(function(k) {
                if (!seen[k]) {
                    seen[k] = true;
                    unique.push(k);
                }
            });
            unique.forEach(function(k) {
                text += '- ' + (COMORBIDITY_MAP[k] || k) + '\n';
            });
        }
        return text + '\n';
    }

    /**
     * Genera el pie de la solicitud.
     */
    function getFooterBlock() {
        var text = SEPARATOR + '\n';
        text += 'Solicitud generada desde Hub Clínico Reumatología v2\n';
        text += SEPARATOR + '\n';
        return text;
    }

    // ── API Principal ─────────────────────────────────────────────

    /**
     * Genera el texto completo de Solicitud a Farmacia Hospitalaria.
     *
     * @param {Object} datos - Datos del paciente y visita.
     * @returns {string} - Texto formateado de la solicitud FH.
     */
    function generateRequestText(datos) {
        if (!datos || typeof datos !== 'object') {
            return 'Error: Datos de paciente no disponibles para generar la solicitud FH.';
        }

        var text = '';
        text += getHeaderBlock(datos);
        text += getDiagnosisBlock(datos);
        text += getActivityBlock(datos);
        text += getComorbiditiesBlock(datos);
        text += getTreatmentBlock(datos);
        text += getDecisionBlock(datos);
        text += getPrebiologicBlock(datos);
        text += getFooterBlock();

        return text;
    }

    /**
     * Muestra el texto en un modal para copia manual.
     * Usa HubTools.form.mostrarModalTexto como fallback.
     */
    function renderRequestModal(datos) {
        var texto = generateRequestText(datos);
        var titulo = 'Solicitud a Farmacia Hospitalaria - Copia Manual';
        var mensaje = 'No se pudo copiar automáticamente. Copie el texto manualmente:';

        if (typeof HubTools !== 'undefined' && HubTools.form && typeof HubTools.form.mostrarModalTexto === 'function') {
            HubTools.form.mostrarModalTexto(texto, titulo, mensaje);
            return true;
        }

        // Fallback: descargar como archivo .txt
        try {
            var timestamp = new Date().getTime();
            var cip = getCIP(datos);
            var filename = 'solicitud_FH_' + (cip || 'paciente') + '_' + timestamp + '.txt';
            var blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(function() { URL.revokeObjectURL(url); }, 100);
            return true;
        } catch (e) {
            console.error('[pharmacyRequest] Error en fallback de descarga:', e);
            return false;
        }
    }

    /**
     * Copia el texto de solicitud FH al portapapeles.
     * Fallback: modal de copia manual o descarga .txt.
     *
     * @param {Object} datos - Datos del paciente y visita.
     * @returns {Promise} - Promise que se resuelve al copiar o mostrar modal.
     */
    function copyRequestToClipboard(datos) {
        var texto = generateRequestText(datos);

        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            renderRequestModal(datos);
            return Promise.resolve(false);
        }

        return navigator.clipboard.writeText(texto).then(function() {
            console.log('[pharmacyRequest] Solicitud FH copiada al portapapeles.');
            if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion('Solicitud FH copiada al portapapeles.', 'success');
            }
            return true;
        }).catch(function(err) {
            console.warn('[pharmacyRequest] Fallo al copiar automáticamente:', err);
            renderRequestModal(datos);
            if (typeof HubTools !== 'undefined' && HubTools.utils && typeof HubTools.utils.mostrarNotificacion === 'function') {
                HubTools.utils.mostrarNotificacion('No se pudo copiar automáticamente. Se ha abierto el modal de copia manual.', 'info');
            }
            return false;
        });
    }

    // ── Exponer en HubTools ───────────────────────────────────────

    window.HubTools = window.HubTools || {};
    window.HubTools.pharmacy = window.HubTools.pharmacy || {};

    window.HubTools.pharmacy.generateRequestText = generateRequestText;
    window.HubTools.pharmacy.copyRequestToClipboard = copyRequestToClipboard;
    window.HubTools.pharmacy.renderRequestModal = renderRequestModal;

    console.log('[pharmacyRequest] Módulo de solicitud FH inicializado. HubTools.pharmacy disponible.');
})();
