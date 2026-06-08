'use strict';

(function () {
    var allPatients = [];
    var filteredPatients = [];
    var currentFilters = {};
    var currentQuickFilters = {};
    var PAGE_SIZE = 50;
    var currentPage = 1;
    var ITEMS_PER_PAGE = 50;

    var CLINICAL_THRESHOLDS = {
        IHS4: { mildMax: 3, moderateMax: 10, severeMin: 11, labels: ['remision', 'baja', 'moderada', 'alta'] },
        DAS28: { remissionMax: 2.6, lowMax: 3.2, moderateMax: 5.1, highMin: 5.1, labels: ['remision', 'baja', 'moderada', 'alta'] },
        HAQ: { mildMax: 1, moderateMax: 2, severeMin: 2, labels: ['baja', 'moderada', 'alta'] },
        Hurley: { labels: ['I', 'II', 'III'] }
    };

    var PROM_THRESHOLDS = {
        DLQI: { bajoMax: 5, moderadoMax: 10, altoMin: 11 },
        'EVA dolor': { bajoMax: 3, moderadoMax: 7, altoMin: 8 },
        'EVA prurito': { bajoMax: 3, moderadoMax: 7, altoMin: 8 },
        HAQ: { bajoMax: 1, moderadoMax: 2, altoMin: 2 }
    };

    function classifyClinical(tipoIndice, val) {
        var num = parseFloat(val);
        if (isNaN(num)) return 'sin_datos';
        if (tipoIndice === 'IHS4') {
            if (num <= 3) return 'baja';
            if (num <= 10) return 'moderada';
            return 'alta';
        }
        if (tipoIndice === 'DAS28') {
            if (num < 2.6) return 'remision';
            if (num <= 3.2) return 'baja';
            if (num <= 5.1) return 'moderada';
            return 'alta';
        }
        if (tipoIndice === 'HAQ') {
            if (num <= 1) return 'baja';
            if (num <= 2) return 'moderada';
            return 'alta';
        }
        if (tipoIndice === 'Hurley') {
            return String(val);
        }
        return 'sin_datos';
    }

    function classifyPROMCategory(tipoProm, val) {
        var num = parseFloat(val);
        if (isNaN(num)) return 'sin_datos';
        var thresholds = PROM_THRESHOLDS[tipoProm];
        if (!thresholds) return 'sin_datos';
        if (num <= thresholds.bajoMax) return 'bajo';
        if (num <= thresholds.moderadoMax) return 'moderado';
        return 'alto';
    }

    function derivePatientProfile(p) {
        var profile = {
            cip: p.cip,
            nombre_demo: p.nombre_demo,
            sexo: p.sexo,
            edad: p.edad,
            servicios_origen: p.servicios_origen || [],
            patologias: p.patologias || [],
            comorbilidades: (p.comorbilidades_relevantes || []).map(function (c) { return c.nombre; }),
            estado_seguimiento: deriveEstadoSeguimiento(p),
            tiene_tratamiento_activo: false,
            principios_activos: [],
            estados_tratamiento: [],
            tiene_cambio_pauta: false,
            cambio_pauta_estados: [],
            prom_tipos: [],
            ultimo_prom: null,
            actividad_tipos: [],
            ultima_actividad: null,
            tiene_eventos_adversos: false,
            gravedad_eventos: [],
            adherencia_nivel: 'no_registrada',
            estado_validacion: 'pendiente',
            farmacos_nombres: [],
            dosis: [],
            pautas: [],
            vias: [],
            prom_fuentes: [],
            tipos_eventos_adversos: [],
            acciones_tomadas: [],
            intensificacion: 'no_determinable',
            desintensificacion: 'no_determinable'
        };

        (p.tratamientos || []).forEach(function (t) {
            if (t.principio_activo) {
                profile.principios_activos.push(t.principio_activo);
                profile.farmacos_nombres.push(t.principio_activo);
            }
            if (t.activo) {
                profile.tiene_tratamiento_activo = true;
                profile.estados_tratamiento.push('activo');
            } else {
                profile.estados_tratamiento.push('suspendido');
            }
            if (t.estado_validacion_farmacia) {
                profile.estado_validacion = t.estado_validacion_farmacia;
            }
            if (t.nombre_comercial) {
                profile.farmacos_nombres.push(t.nombre_comercial);
            }
            if (t.presentacion_dosis && profile.dosis.indexOf(t.presentacion_dosis) === -1) {
                profile.dosis.push(t.presentacion_dosis);
            }
            if (t.pauta && profile.pautas.indexOf(t.pauta) === -1) {
                profile.pautas.push(t.pauta);
            }
            if (t.via && profile.vias.indexOf(t.via) === -1) {
                profile.vias.push(t.via);
            }
        });

        if ((p.cambios_pauta || []).length > 0) {
            profile.tiene_cambio_pauta = true;
            p.cambios_pauta.forEach(function (cp) {
                if (cp.tipo) profile.cambio_pauta_estados.push(cp.tipo);
                if (cp.tipo === 'intensificacion') profile.intensificacion = 'si';
                if (cp.tipo === 'desintensificacion') profile.desintensificacion = 'si';
            });
        }

        var sortedProms = (p.proms || []).slice().sort(function (a, b) {
            return new Date(b.fecha) - new Date(a.fecha);
        });
        sortedProms.forEach(function (pr) {
            if (pr.tipo_prom && profile.prom_tipos.indexOf(pr.tipo_prom) === -1) {
                profile.prom_tipos.push(pr.tipo_prom);
            }
            if (pr.fuente && profile.prom_fuentes.indexOf(pr.fuente) === -1) {
                profile.prom_fuentes.push(pr.fuente);
            }
        });
        if (sortedProms.length > 0) {
            var latestP = sortedProms[0];
            profile.ultimo_prom = {
                tipo: latestP.tipo_prom,
                valor: parseFloat(latestP.valor),
                categoria: classifyPROMCategory(latestP.tipo_prom, latestP.valor),
                interpretacion: latestP.interpretacion
            };
        }

        var sortedClin = (p.actividad_clinica || []).slice().sort(function (a, b) {
            return new Date(b.fecha) - new Date(a.fecha);
        });
        sortedClin.forEach(function (ac) {
            if (ac.tipo_indice && profile.actividad_tipos.indexOf(ac.tipo_indice) === -1) {
                profile.actividad_tipos.push(ac.tipo_indice);
            }
        });
        if (sortedClin.length > 0) {
            var latestC = sortedClin[0];
            profile.ultima_actividad = {
                tipo_indice: latestC.tipo_indice,
                valor: parseFloat(latestC.valor),
                categoria: classifyClinical(latestC.tipo_indice, latestC.valor),
                interpretacion: latestC.interpretacion
            };
        }

        if ((p.eventos_adversos || []).length > 0) {
            profile.tiene_eventos_adversos = true;
            p.eventos_adversos.forEach(function (ea) {
                if (ea.gravedad && profile.gravedad_eventos.indexOf(ea.gravedad) === -1) {
                    profile.gravedad_eventos.push(ea.gravedad);
                }
                if (ea.tipo && profile.tipos_eventos_adversos.indexOf(ea.tipo) === -1) {
                    profile.tipos_eventos_adversos.push(ea.tipo);
                }
                if (ea.accion_tomada && profile.acciones_tomadas.indexOf(ea.accion_tomada) === -1) {
                    profile.acciones_tomadas.push(ea.accion_tomada);
                }
            });
        }

        if ((p.adherencia || []).length > 0) {
            var sortedAdh = p.adherencia.slice().sort(function (a, b) {
                return new Date(b.fecha) - new Date(a.fecha);
            });
            var interp = (sortedAdh[0].interpretacion || '').toLowerCase();
            if (interp.indexOf('alta') !== -1) profile.adherencia_nivel = 'alta';
            else if (interp.indexOf('media') !== -1) profile.adherencia_nivel = 'media';
            else if (interp.indexOf('baja') !== -1) profile.adherencia_nivel = 'baja';
        }

        return profile;
    }

    function deriveEstadoSeguimiento(p) {
        var episodios = p.episodios_asistenciales || [];
        var states = { 'Seguimiento Farmacia': false, 'Primera visita Farmacia': false, 'Validacion Farmacia': false, 'Alta': false };
        episodios.forEach(function (ep) {
            if (ep.tipo === 'Seguimiento Farmacia') states['Seguimiento Farmacia'] = true;
            if (ep.tipo === 'Primera visita Farmacia') states['Primera visita Farmacia'] = true;
            if (ep.tipo === 'Validacion Farmacia') states['Validacion Farmacia'] = true;
            if (ep.tipo === 'Alta') states['Alta'] = true;
        });
        if (states['Alta']) return 'alta';
        if (states['Seguimiento Farmacia']) return 'en_seguimiento';
        if (states['Primera visita Farmacia']) return 'pendiente';
        if (states['Validacion Farmacia']) return 'validado';
        return 'pendiente';
    }

    function seededRandom(seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    var seed = 20260607;
    function random() {
        seed++;
        return seededRandom(seed);
    }

    function generateSyntheticPatients(basePatients) {
        var synthetic = [];
        var idx = 10;
        var sexes = ['Mujer', 'Hombre'];
        var services = ['Dermatologia', 'Reumatologia'];
        var pathologies = ['Hidradenitis supurativa', 'Artritis Reumatoide (AR)', 'Psoriasis', 'Artritis Psoriasica (APs)'];
        var comorbidityOptions = [
            { nombre: 'Obesidad grado I', tipo: 'metabolica', nota: 'IMC 30-35' },
            { nombre: 'Exfumador', tipo: 'habito toxico', nota: 'Abandono +5 anos' },
            { nombre: 'Hipertension arterial controlada', tipo: 'cardiovascular', nota: 'TA controlada' },
            { nombre: 'Dislipemia', tipo: 'metabolica', nota: 'En tratamiento con estatina' },
            { nombre: 'Osteopenia lumbar', tipo: 'osteoarticular', nota: 'DXA lumbar T-score -1.7' },
            { nombre: 'Diabetes tipo 2', tipo: 'metabolica', nota: 'HbA1c controlada' },
            { nombre: 'Tabaquismo activo', tipo: 'habito toxico', nota: '10-20 cig/dia' },
            { nombre: 'Sindrome metabolico', tipo: 'metabolica', nota: 'Criterios ATP-III' },
            { nombre: 'Depresion', tipo: 'psiquiatrica', nota: 'En tratamiento' },
            { nombre: 'Ansiedad', tipo: 'psiquiatrica', nota: 'En seguimiento' },
            { nombre: 'Enfermedad cardiovascular', tipo: 'cardiovascular', nota: 'Cardiopatia isquemica' },
            { nombre: 'Hepatopatia', tipo: 'hepatica', nota: 'Esteatosis hepatica' }
        ];
        var activeDrugs = [
            { principio: 'Adalimumab', nombre: 'Humira', dosis: '40 mg', via: 'SC', pauta: 'Cada 2 semanas' },
            { principio: 'Adalimumab', nombre: 'Amgevita', dosis: '40 mg', via: 'SC', pauta: 'Cada 2 semanas' },
            { principio: 'Secukinumab', nombre: 'Cosentyx', dosis: '300 mg', via: 'SC', pauta: 'Cada 4 semanas' },
            { principio: 'Etanercept', nombre: 'Enbrel', dosis: '50 mg', via: 'SC', pauta: 'Semanal' },
            { principio: 'Ustekinumab', nombre: 'Stelara', dosis: '45 mg', via: 'SC', pauta: 'Cada 12 semanas' },
            { principio: 'Infliximab', nombre: 'Remicade', dosis: '5 mg/kg', via: 'IV', pauta: 'Cada 8 semanas' },
            { principio: 'Tocilizumab', nombre: 'RoActemra', dosis: '8 mg/kg', via: 'IV', pauta: 'Cada 4 semanas' },
            { principio: 'Golimumab', nombre: 'Simponi', dosis: '50 mg', via: 'SC', pauta: 'Mensual' },
            { principio: 'Certolizumab', nombre: 'Cimzia', dosis: '200 mg', via: 'SC', pauta: 'Cada 2 semanas' },
            { principio: 'Apremilast', nombre: 'Otezla', dosis: '30 mg', via: 'Oral', pauta: 'Diario' }
        ];
        var prevDrugs = [
            { principio: 'Adalimumab', nombre: 'Humira', dosis: '40 mg', via: 'SC', pauta: 'Cada 2 semanas' },
            { principio: 'Metotrexato', nombre: 'Metotrexato', dosis: '15 mg', via: 'Oral', pauta: 'Semanal' },
            { principio: 'Leflunomida', nombre: 'Leflunomida', dosis: '20 mg', via: 'Oral', pauta: 'Diario' },
            { principio: 'Ciclosporina', nombre: 'Ciclosporina', dosis: '3 mg/kg', via: 'Oral', pauta: 'Diario' }
        ];
        var promTypes = ['DLQI', 'EVA dolor', 'EVA prurito', 'HAQ'];
        var clinIndexes = ['IHS4', 'Hurley', 'DAS28', 'HAQ'];
        var adherencias = ['Alta adherencia', 'Alta adherencia', 'Alta adherencia', 'Media adherencia', 'Baja adherencia', 'Media adherencia'];
        var validaciones = ['validado', 'validado', 'validado', 'en_seguimiento', 'pendiente'];

        for (var i = 0; i < 28; i++) {
            idx++;
            var svc = services[Math.floor(random() * services.length)];
            var pathOptions = svc === 'Dermatologia' ? ['Hidradenitis supurativa', 'Psoriasis'] : ['Artritis Reumatoide (AR)', 'Artritis Psoriasica (APs)'];
            var pat = pathOptions[Math.floor(random() * pathOptions.length)];
            var sex = sexes[Math.floor(random() * sexes.length)];
            var age = 25 + Math.floor(random() * 45);

            var numComorb = Math.floor(random() * 4);
            var shuffledComorb = comorbidityOptions.slice().sort(function () { return random() - 0.5; });
            var selComorb = shuffledComorb.slice(0, numComorb);

            var activeDrugIdx = Math.floor(random() * activeDrugs.length);
            var activeDrug = activeDrugs[activeDrugIdx];
            var hasPrev = random() > 0.5;
            var prevDrugIdx = Math.floor(random() * prevDrugs.length);

            var selectedPromType = promTypes[Math.floor(random() * promTypes.length)];
            var promVal;
            if (selectedPromType === 'DLQI') promVal = Math.floor(random() * 25);
            else if (selectedPromType === 'HAQ') promVal = (random() * 2.5).toFixed(1);
            else promVal = Math.floor(random() * 10);
            var promCat = classifyPROMCategory(selectedPromType, promVal);

            var selectedClinIdx = pat.indexOf('HS') !== -1 ? clinIndexes[Math.floor(random() * 2)] : clinIndexes[2 + Math.floor(random() * 2)];
            var clinVal;
            if (selectedClinIdx === 'IHS4') clinVal = Math.floor(random() * 20);
            else if (selectedClinIdx === 'DAS28') clinVal = (random() * 6 + 0.5).toFixed(1);
            else if (selectedClinIdx === 'HAQ') clinVal = (random() * 2.5).toFixed(1);
            else clinVal = String(Math.floor(random() * 3) + 1);
            var clinCat = classifyClinical(selectedClinIdx, clinVal);

            var hasAE = random() > 0.6;
            var aeGrav = hasAE ? ['leve', 'moderado', 'grave'][Math.floor(random() * 3)] : null;

            var adh = adherencias[Math.floor(random() * adherencias.length)];
            var adhLevel = adh.toLowerCase().indexOf('alta') !== -1 ? 'alta' : (adh.toLowerCase().indexOf('media') !== -1 ? 'media' : 'baja');

            var valState = validaciones[Math.floor(random() * validaciones.length)];

            var es = 'en_seguimiento';
            if (valState === 'pendiente') es = 'pendiente';
            else if (random() > 0.8) es = 'validado';
            if (random() > 0.9) es = 'alta';

            var tratamientos = [];
            if (hasPrev) {
                var pd = prevDrugs[prevDrugIdx];
                tratamientos.push({
                    id: 'TRAT-SYN-' + idx + '-prev',
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    drug_id: 'FAR-SYN-' + idx,
                    nombre_comercial: pd.nombre,
                    principio_activo: pd.principio,
                    presentacion_dosis: pd.dosis + ' ' + pd.via,
                    via: pd.via,
                    pauta: pd.pauta,
                    fecha_inicio: '2025-01-15',
                    fecha_fin: '2026-01-15',
                    activo: false,
                    motivo_inicio: 'Tratamiento previo',
                    motivo_suspension: 'Cambio de tratamiento',
                    servicio_clinico_origen: svc,
                    estado_validacion_farmacia: 'validado'
                });
                tratamientos.push({
                    id: 'TRAT-SYN-' + idx + '-cambio',
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    drug_id: 'FAR-SYN-' + idx + '-curr',
                    nombre_comercial: activeDrug.nombre,
                    principio_activo: activeDrug.principio,
                    presentacion_dosis: activeDrug.dosis + ' ' + activeDrug.via,
                    via: activeDrug.via,
                    pauta: activeDrug.pauta,
                    fecha_inicio: '2026-02-01',
                    fecha_fin: null,
                    activo: true,
                    motivo_inicio: 'Inicio nuevo tratamiento',
                    motivo_cambio: 'Cambio de ' + pd.principio + ' a ' + activeDrug.principio,
                    servicio_clinico_origen: svc,
                    estado_validacion_farmacia: valState
                });
            } else {
                tratamientos.push({
                    id: 'TRAT-SYN-' + idx,
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    drug_id: 'FAR-SYN-' + idx,
                    nombre_comercial: activeDrug.nombre,
                    principio_activo: activeDrug.principio,
                    presentacion_dosis: activeDrug.dosis + ' ' + activeDrug.via,
                    via: activeDrug.via,
                    pauta: activeDrug.pauta,
                    fecha_inicio: '2026-03-01',
                    fecha_fin: null,
                    activo: true,
                    motivo_inicio: 'Inicio de tratamiento biologico',
                    servicio_clinico_origen: svc,
                    estado_validacion_farmacia: valState
                });
            }

            var cambios = [];
            if (hasPrev) {
                cambios.push({
                    id: 'CAM-SYN-' + idx,
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    fecha: '2026-02-01',
                    tipo: 'cambio_farmaco',
                    tratamiento_anterior_id: 'TRAT-SYN-' + idx + '-prev',
                    tratamiento_nuevo_id: 'TRAT-SYN-' + idx + '-cambio',
                    motivo: 'Cambio terapeutico',
                    descripcion: 'Cambio a ' + activeDrug.principio,
                    servicio_solicitante: svc,
                    estado_validacion_farmacia: valState,
                    fuente: 'Servicio clinico'
                });
            }
            var rndInt = random();
            if (rndInt < 0.25) {
                cambios.push({
                    id: 'CAM-SYN-' + idx + '-int',
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    fecha: '2026-04-01',
                    tipo: 'intensificacion',
                    motivo: 'Respuesta insuficiente',
                    descripcion: 'Intensificacion de pauta por actividad moderada-alta',
                    servicio_solicitante: svc,
                    estado_validacion_farmacia: valState,
                    fuente: 'Servicio clinico'
                });
            } else if (rndInt < 0.45) {
                cambios.push({
                    id: 'CAM-SYN-' + idx + '-des',
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    fecha: '2026-04-01',
                    tipo: 'desintensificacion',
                    motivo: 'Remision sostenida',
                    descripcion: 'Desintensificacion de pauta por buena respuesta',
                    servicio_solicitante: svc,
                    estado_validacion_farmacia: valState,
                    fuente: 'Farmacia'
                });
            }

            var episodios = [
                { tipo: 'Validacion Farmacia', fecha: '2026-02-01', servicio: 'Farmacia', estado: 'completado', nota: 'Validacion completada.' },
                { tipo: 'Primera visita Farmacia', fecha: '2026-03-05', servicio: 'Farmacia', estado: 'completado', nota: 'Inicio de tratamiento sin incidencias.' }
            ];
            if (es === 'en_seguimiento') {
                episodios.push({ tipo: 'Seguimiento Farmacia', fecha: '2026-05-20', servicio: 'Farmacia', estado: 'completado', nota: 'Seguimiento rutinario. Buena tolerancia.' });
            }
            if (es === 'alta') {
                episodios.push({ tipo: 'Alta', fecha: '2026-06-01', servicio: 'Farmacia', estado: 'completado', nota: 'Alta del servicio.' });
            }

            var promFuente = ['Farmacia', 'Servicio clinico', 'Farmacia'];
            var proms = [
                { id: 'PROM-SYN-' + idx, cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'), fecha: '2026-05-20', tipo_prom: selectedPromType, valor: String(promVal), interpretacion: 'PROM de seguimiento', fuente: promFuente[Math.floor(random() * promFuente.length)] }
            ];
            if (random() > 0.5) {
                proms.push({ id: 'PROM-SYN-' + idx + '-b', cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'), fecha: '2026-06-05', tipo_prom: 'EVA dolor', valor: String(Math.floor(random() * 10)), interpretacion: 'EVA dolor seguimiento', fuente: 'Paciente remoto' });
            }

            var actividades = [
                { id: 'ACT-SYN-' + idx, cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'), fecha: '2026-05-20', tipo_indice: selectedClinIdx, valor: String(clinVal), interpretacion: 'Actividad clinica seguimiento', servicio_origen: svc, fuente: svc }
            ];

            var eventos = [];
            if (hasAE) {
                var eaTipos = ['Reaccion adversa', 'Infeccion', 'Reaccion en punto de inyeccion', 'Alteracion analitica'];
                var eaAcciones = ['Observacion', 'Suspension', 'Cambio dosis', 'Tratamiento sintomatico'];
                var eaTipo = eaTipos[Math.floor(random() * eaTipos.length)];
                var eaAccion = eaAcciones[Math.floor(random() * eaAcciones.length)];
                eventos.push({
                    id: 'EA-SYN-' + idx,
                    cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                    fecha: '2026-05-15',
                    tipo: eaTipo,
                    gravedad: aeGrav,
                    relacion_tratamiento: 'Posible',
                    accion_tomada: eaAccion,
                    descripcion_corta: 'Evento adverso ' + aeGrav + ' reportado.',
                    resuelto: random() > 0.5
                });
            }

            var adhData = [
                { id: 'ADH-SYN-' + idx, cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'), fecha: '2026-05-20', escala: 'Morisky-Green', resultado: adhLevel === 'alta' ? '4/4' : (adhLevel === 'media' ? '2/4' : '1/4'), interpretacion: adh, fuente: 'Farmacia' }
            ];

            synthetic.push({
                cip: 'CIP-DEMO-FH-' + String(idx).padStart(3, '0'),
                nombre_demo: 'Paciente Demo FH-' + String(idx).padStart(3, '0'),
                sexo: sex,
                edad: age,
                servicios_origen: [svc, 'Farmacia'],
                patologias: [pat],
                comorbilidades_relevantes: selComorb,
                episodios_asistenciales: episodios,
                tratamientos: tratamientos,
                cambios_pauta: cambios,
                proms: proms,
                actividad_clinica: actividades,
                eventos_adversos: eventos,
                adherencia: adhData
            });
        }
        return synthetic;
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined && text !== null) e.textContent = text;
        return e;
    }

    function icon(cls) {
        var i = document.createElement('i');
        i.className = 'fas ' + cls;
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    function clearChildren(parent) {
        while (parent && parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    function buildFilterBlock(title, iconClass, contentEl) {
        var block = el('div', 'filter-block');
        var header = el('div', 'filter-block__header');
        var ic = icon(iconClass);
        var h3 = el('h3', 'filter-block__title', title);
        header.appendChild(ic);
        header.appendChild(h3);
        block.appendChild(header);
        block.appendChild(contentEl);
        return block;
    }

    function buildCheckboxGroup(name, options, selectedValues) {
        var container = el('div', 'checklist-visual');
        options.forEach(function (opt) {
            var label = el('label', 'checklist-chip');
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.name = name;
            input.value = opt.value;
            input.dataset.filterGroup = name;
            if (selectedValues && selectedValues.indexOf(opt.value) !== -1) {
                input.checked = true;
            }
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + opt.label));
            container.appendChild(label);
        });
        return container;
    }

    function buildRadioGroup(name, options, selectedValue) {
        var container = el('div', 'checklist-visual');
        options.forEach(function (opt) {
            var label = el('label', 'checklist-chip');
            var input = document.createElement('input');
            input.type = 'radio';
            input.name = name;
            input.value = opt.value;
            input.dataset.filterGroup = name;
            if (selectedValue === opt.value) {
                input.checked = true;
            }
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + opt.label));
            container.appendChild(label);
        });
        return container;
    }

    function buildSelectGroup(name, options, selectedValue) {
        var select = document.createElement('select');
        select.className = 'form-select';
        select.name = name;
        select.dataset.filterGroup = name;
        var placeholder = el('option', '');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar...';
        select.appendChild(placeholder);
        options.forEach(function (opt) {
            var o = el('option', '');
            o.value = opt.value;
            o.textContent = opt.label;
            if (selectedValue === opt.value) o.selected = true;
            select.appendChild(o);
        });
        return select;
    }

    function buildRangeGroup(name, minLabel, maxLabel) {
        var container = el('div', 'filter-range-row');
        var minWrap = el('div', 'filter-range-item');
        var minLbl = el('label', 'form-label', minLabel);
        var minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'form-control filter-range-input';
        minInput.name = name + '_min';
        minInput.dataset.filterGroup = name;
        minInput.placeholder = 'Min';
        minInput.step = 'any';
        minWrap.appendChild(minLbl);
        minWrap.appendChild(minInput);

        var maxWrap = el('div', 'filter-range-item');
        var maxLbl = el('label', 'form-label', maxLabel);
        var maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'form-control filter-range-input';
        maxInput.name = name + '_max';
        maxInput.dataset.filterGroup = name;
        maxInput.placeholder = 'Max';
        maxInput.step = 'any';
        maxWrap.appendChild(maxLbl);
        maxWrap.appendChild(maxInput);

        container.appendChild(minWrap);
        container.appendChild(maxWrap);
        return container;
    }

    function buildAgeGroupFilter() {
        var groups = [
            { value: 'lt30', label: '< 30' },
            { value: '30-44', label: '30-44' },
            { value: '45-64', label: '45-64' },
            { value: 'gte65', label: '>= 65' }
        ];
        return buildRadioGroup('edad_grupo', groups, '');
    }

    function deriveFilterOptions() {
        var options = {
            servicios: [],
            patologias: [],
            estados_seguimiento: [],
            sexos: [],
            principios_activos: [],
            estados_tratamiento: ['activo', 'suspendido'],
            prom_tipos: [],
            actividad_tipos: [],
            comorbilidades: [],
            adherencia_niveles: ['alta', 'media', 'baja', 'no_registrada'],
            validacion_estados: ['pendiente', 'validado', 'en_seguimiento', 'denegado'],
            farmacos_nombres: [],
            dosis: [],
            pautas: [],
            vias: [],
            prom_fuentes: [],
            tipos_ea: [],
            acciones_tomadas: []
        };

        var svcSet = {};
        var patSet = {};
        var esSet = {};
        var sexSet = {};
        var paSet = {};
        var promSet = {};
        var actSet = {};
        var comSet = {};
        var fnSet = {};
        var dosisSet = {};
        var pautaSet = {};
        var viaSet = {};
        var pfSet = {};
        var teaSet = {};
        var atSet = {};

        allPatients.forEach(function (p) {
            var prof = p._profile;
            if (!prof) return;
            prof.servicios_origen.forEach(function (s) { svcSet[s] = true; });
            prof.patologias.forEach(function (pt) { patSet[pt] = true; });
            esSet[prof.estado_seguimiento] = true;
            sexSet[prof.sexo] = true;
            prof.principios_activos.forEach(function (pa) { paSet[pa] = true; });
            prof.prom_tipos.forEach(function (pt) { promSet[pt] = true; });
            prof.actividad_tipos.forEach(function (at) { actSet[at] = true; });
            prof.comorbilidades.forEach(function (c) { comSet[c] = true; });
            prof.farmacos_nombres.forEach(function (fn) { fnSet[fn] = true; });
            prof.dosis.forEach(function (d) { dosisSet[d] = true; });
            prof.pautas.forEach(function (pa) { pautaSet[pa] = true; });
            prof.vias.forEach(function (v) { viaSet[v] = true; });
            prof.prom_fuentes.forEach(function (pf) { pfSet[pf] = true; });
            prof.tipos_eventos_adversos.forEach(function (t) { teaSet[t] = true; });
            prof.acciones_tomadas.forEach(function (a) { atSet[a] = true; });
        });

        options.servicios = Object.keys(svcSet).sort().map(function (s) { return { value: s, label: s }; });
        options.patologias = Object.keys(patSet).sort().map(function (p) { return { value: p, label: p }; });
        options.estados_seguimiento = Object.keys(esSet).sort().map(function (e) {
            var labels = { en_seguimiento: 'En seguimiento', pendiente: 'Pendiente', alta: 'Alta', validado: 'Validado' };
            return { value: e, label: labels[e] || e };
        });
        options.sexos = Object.keys(sexSet).sort().map(function (s) { return { value: s, label: s }; });
        options.principios_activos = Object.keys(paSet).sort().map(function (p) { return { value: p, label: p }; });
        options.prom_tipos = Object.keys(promSet).sort().map(function (p) { return { value: p, label: p }; });
        options.actividad_tipos = Object.keys(actSet).sort().map(function (a) { return { value: a, label: a }; });
        options.comorbilidades = Object.keys(comSet).sort().map(function (c) { return { value: c, label: c }; });
        options.farmacos_nombres = Object.keys(fnSet).sort().map(function (f) { return { value: f, label: f }; });
        options.dosis = Object.keys(dosisSet).sort().map(function (d) { return { value: d, label: d }; });
        options.pautas = Object.keys(pautaSet).sort().map(function (p) { return { value: p, label: p }; });
        options.vias = Object.keys(viaSet).sort().map(function (v) { return { value: v, label: v }; });
        options.prom_fuentes = Object.keys(pfSet).sort().map(function (f) { return { value: f, label: f }; });
        options.tipos_ea = Object.keys(teaSet).sort().map(function (t) { return { value: t, label: t }; });
        options.acciones_tomadas = Object.keys(atSet).sort().map(function (a) { return { value: a, label: a }; });

        return options;
    }

    function buildFiltersUI() {
        var container = document.getElementById('filters-container');
        if (!container) return;
        clearChildren(container);
        var opts = deriveFilterOptions();

        var col1 = el('div', 'filters-column');
        var col2 = el('div', 'filters-column');
        var col3 = el('div', 'filters-column');

        col1.appendChild(buildFilterBlock('Identidad / Origen', 'fa-hospital-user', (function () {
            var wrap = el('div', '');
            var h4a = el('h4', 'filter-block__subtitle', 'Servicio de origen');
            wrap.appendChild(h4a);
            wrap.appendChild(buildCheckboxGroup('servicio', opts.servicios, []));
            var h4b = el('h4', 'filter-block__subtitle', 'Patología');
            wrap.appendChild(h4b);
            wrap.appendChild(buildCheckboxGroup('patologia', opts.patologias, []));
            var h4c = el('h4', 'filter-block__subtitle', 'Estado seguimiento');
            wrap.appendChild(h4c);
            wrap.appendChild(buildCheckboxGroup('estado_seguimiento', opts.estados_seguimiento, []));
            return wrap;
        })()));

        col1.appendChild(buildFilterBlock('Demográfico', 'fa-users', (function () {
            var wrap = el('div', '');
            var h4a = el('h4', 'filter-block__subtitle', 'Sexo');
            wrap.appendChild(h4a);
            wrap.appendChild(buildCheckboxGroup('sexo', opts.sexos, []));
            var h4b = el('h4', 'filter-block__subtitle', 'Grupo de edad');
            wrap.appendChild(h4b);
            wrap.appendChild(buildAgeGroupFilter());
            return wrap;
        })()));

        col2.appendChild(buildFilterBlock('Clínico', 'fa-heartbeat', (function () {
            var wrap = el('div', '');
            var h4a = el('h4', 'filter-block__subtitle', 'Variable clínica');
            wrap.appendChild(h4a);
            wrap.appendChild(buildSelectGroup('actividad_tipo', opts.actividad_tipos, ''));
            var h4b = el('h4', 'filter-block__subtitle', 'Categoría clínica');
            wrap.appendChild(h4b);
            var catOpts = [
                { value: 'remision', label: 'Remisión' },
                { value: 'baja', label: 'Baja actividad' },
                { value: 'moderada', label: 'Moderada' },
                { value: 'alta', label: 'Alta' }
            ];
            wrap.appendChild(buildCheckboxGroup('actividad_categoria', catOpts, []));
            var h4c = el('h4', 'filter-block__subtitle', 'Rango valor');
            wrap.appendChild(h4c);
            wrap.appendChild(buildRangeGroup('actividad_valor', 'Valor mínimo', 'Valor máximo'));
            return wrap;
        })()));

        col2.appendChild(buildFilterBlock('Tratamiento', 'fa-pills', (function () {
            var wrap = el('div', '');
            var h4a = el('h4', 'filter-block__subtitle', 'Principio activo');
            wrap.appendChild(h4a);
            wrap.appendChild(buildSelectGroup('principio_activo', opts.principios_activos, ''));
            var h4b = el('h4', 'filter-block__subtitle', 'Nombre comercial / fármaco');
            wrap.appendChild(h4b);
            wrap.appendChild(buildCheckboxGroup('farmaco_nombre', opts.farmacos_nombres, []));
            var h4c = el('h4', 'filter-block__subtitle', 'Estado tratamiento');
            wrap.appendChild(h4c);
            var etOpts = [
                { value: 'activo', label: 'Activo' },
                { value: 'suspendido', label: 'Suspendido' }
            ];
            wrap.appendChild(buildCheckboxGroup('estado_tratamiento', etOpts, []));
            var h4d = el('h4', 'filter-block__subtitle', 'Dosis');
            wrap.appendChild(h4d);
            wrap.appendChild(buildSelectGroup('dosis', opts.dosis, ''));
            var h4e = el('h4', 'filter-block__subtitle', 'Pauta / intervalo');
            wrap.appendChild(h4e);
            wrap.appendChild(buildCheckboxGroup('pauta', opts.pautas, []));
            var h4f = el('h4', 'filter-block__subtitle', 'Vía');
            wrap.appendChild(h4f);
            wrap.appendChild(buildCheckboxGroup('via', opts.vias, []));
            var h4g = el('h4', 'filter-block__subtitle', 'Cambio de pauta');
            wrap.appendChild(h4g);
            var cpOpts = [
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' }
            ];
            wrap.appendChild(buildRadioGroup('cambio_pauta', cpOpts, ''));
            var h4h = el('h4', 'filter-block__subtitle', 'Intensificación');
            wrap.appendChild(h4h);
            var infoInt = el('span', 'stats-filter-info-icon', '\u24D8');
            infoInt.title = 'Aumento de dosis, frecuencia o acortamiento del intervalo';
            wrap.appendChild(infoInt);
            var intOpts = [
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' },
                { value: 'no_determinable', label: 'No determinable' }
            ];
            wrap.appendChild(buildRadioGroup('intensificacion', intOpts, ''));
            var h4i = el('h4', 'filter-block__subtitle', 'Desintensificación');
            wrap.appendChild(h4i);
            var infoDes = el('span', 'stats-filter-info-icon', '\u24D8');
            infoDes.title = 'Reducción de dosis, frecuencia o espaciamiento del intervalo';
            wrap.appendChild(infoDes);
            var desOpts = [
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' },
                { value: 'no_determinable', label: 'No determinable' }
            ];
            wrap.appendChild(buildRadioGroup('desintensificacion', desOpts, ''));
            return wrap;
        })()));

        col3.appendChild(buildFilterBlock('PROMs', 'fa-file-medical-alt', (function () {
            var wrap = el('div', '');
            var h4a = el('h4', 'filter-block__subtitle', 'Tipo PROM');
            wrap.appendChild(h4a);
            wrap.appendChild(buildSelectGroup('prom_tipo', opts.prom_tipos, ''));
            var h4b = el('h4', 'filter-block__subtitle', 'Categoría PROM');
            wrap.appendChild(h4b);
            var promCatOpts = [
                { value: 'bajo', label: 'Bajo' },
                { value: 'moderado', label: 'Moderado' },
                { value: 'alto', label: 'Alto' }
            ];
            wrap.appendChild(buildCheckboxGroup('prom_categoria', promCatOpts, []));
            var h4c = el('h4', 'filter-block__subtitle', 'Rango valor PROM');
            wrap.appendChild(h4c);
            wrap.appendChild(buildRangeGroup('prom_valor', 'Valor mínimo', 'Valor máximo'));
            var h4d = el('h4', 'filter-block__subtitle', 'Fuente del PROM');
            wrap.appendChild(h4d);
            wrap.appendChild(buildCheckboxGroup('prom_fuente', opts.prom_fuentes, []));
            return wrap;
        })()));

        col3.appendChild(buildFilterBlock('Comorbilidades', 'fa-notes-medical', (function () {
            var wrap = el('div', '');
            wrap.appendChild(buildCheckboxGroup('comorbilidad', opts.comorbilidades, []));
            return wrap;
        })()));

        var col4 = el('div', 'filters-column');

        col4.appendChild(buildFilterBlock('Seguridad', 'fa-shield-alt', (function () {
            var wrap = el('div', '');
            var h4a = el('h4', 'filter-block__subtitle', 'Efectos adversos');
            wrap.appendChild(h4a);
            var eaOpts = [
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' }
            ];
            wrap.appendChild(buildRadioGroup('eventos_adversos', eaOpts, ''));
            var h4b = el('h4', 'filter-block__subtitle', 'Gravedad');
            wrap.appendChild(h4b);
            var gravOpts = [
                { value: 'leve', label: 'Leve' },
                { value: 'moderado', label: 'Moderado' },
                { value: 'grave', label: 'Grave' }
            ];
            wrap.appendChild(buildCheckboxGroup('gravedad_ea', gravOpts, []));
            var h4c = el('h4', 'filter-block__subtitle', 'Tipo de efecto adverso');
            wrap.appendChild(h4c);
            wrap.appendChild(buildCheckboxGroup('tipo_ea', opts.tipos_ea, []));
            var h4d = el('h4', 'filter-block__subtitle', 'Acción tomada');
            wrap.appendChild(h4d);
            wrap.appendChild(buildCheckboxGroup('accion_tomada', opts.acciones_tomadas, []));
            return wrap;
        })()));

        col4.appendChild(buildFilterBlock('Adherencia', 'fa-hand-holding-heart', (function () {
            var wrap = el('div', '');
            var adhOpts = [
                { value: 'alta', label: 'Alta' },
                { value: 'media', label: 'Media' },
                { value: 'baja', label: 'Baja' },
                { value: 'no_registrada', label: 'No registrada' }
            ];
            wrap.appendChild(buildCheckboxGroup('adherencia', adhOpts, []));
            return wrap;
        })()));

        col4.appendChild(buildFilterBlock('Validación Farmacia', 'fa-check-double', (function () {
            var wrap = el('div', '');
            var valOpts = [
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'validado', label: 'Validado' },
                { value: 'en_seguimiento', label: 'En seguimiento' },
                { value: 'denegado', label: 'Denegado' }
            ];
            wrap.appendChild(buildCheckboxGroup('validacion', valOpts, []));
            return wrap;
        })()));

        container.appendChild(col1);
        container.appendChild(col2);
        container.appendChild(col3);
        container.appendChild(col4);
    }

    function readFilters() {
        var filters = {};
        var inputs = document.querySelectorAll('#advanced-filters-body input, #advanced-filters-body select');
        inputs.forEach(function (input) {
            var group = input.dataset.filterGroup;
            if (!group) return;
            if (!filters[group]) filters[group] = { type: input.type === 'checkbox' ? 'checkbox' : (input.type === 'radio' ? 'radio' : input.tagName === 'SELECT' ? 'select' : 'range') };
            if (input.type === 'checkbox') {
                if (!filters[group].values) filters[group].values = [];
                if (input.checked) filters[group].values.push(input.value);
            } else if (input.type === 'radio') {
                if (input.checked) filters[group].value = input.value;
            } else if (input.tagName === 'SELECT') {
                filters[group].value = input.value;
            } else if (input.type === 'number') {
                if (input.name.indexOf('_min') !== -1) {
                    filters[group].min = input.value === "" ? null : parseFloat(input.value);
                } else if (input.name.indexOf('_max') !== -1) {
                    filters[group].max = input.value === "" ? null : parseFloat(input.value);
                }
            }
        });
        return filters;
    }

    function applyFilters() {
        var advFilters = readFilters();
        var qf = readQuickFilters();
        currentFilters = advFilters;
        currentQuickFilters = qf;

        var hasActiveFilter = false;
        Object.keys(advFilters).forEach(function (key) {
            var f = advFilters[key];
            if (f.type === 'checkbox' && f.values && f.values.length > 0) hasActiveFilter = true;
            if (f.type === 'radio' && f.value) hasActiveFilter = true;
            if (f.type === 'select' && f.value) hasActiveFilter = true;
            if (f.type === 'range' && (f.min !== null || f.max !== null)) hasActiveFilter = true;
        });
        Object.keys(qf).forEach(function (key) {
            if (qf[key]) hasActiveFilter = true;
        });

        if (!hasActiveFilter) {
            filteredPatients = allPatients.slice();
        } else {
            filteredPatients = allPatients.filter(function (p) {
                return matchesAllFilters(p._profile, advFilters) && matchesQuickFilters(p._profile, qf);
            });
        }

        currentPage = 1;
        renderAll();
    }

    function matchesAllFilters(prof, filters) {
        for (var key in filters) {
            if (!filters.hasOwnProperty(key)) continue;
            var f = filters[key];
            if (f.type === 'checkbox') {
                if (f.values && f.values.length > 0) {
                    if (!checkboxFilterMatches(prof, key, f.values)) return false;
                }
            } else if (f.type === 'radio') {
                if (f.value) {
                    if (!radioFilterMatches(prof, key, f.value)) return false;
                }
            } else if (f.type === 'select') {
                if (f.value) {
                    if (!selectFilterMatches(prof, key, f.value)) return false;
                }
            } else if (f.type === 'range') {
                if (f.min !== null || f.max !== null) {
                    if (!rangeFilterMatches(prof, key, f.min, f.max)) return false;
                }
            }
        }
        return true;
    }

    function checkboxFilterMatches(prof, group, selectedValues) {
        if (!prof) return false;
        var profValues;
        switch (group) {
            case 'servicio': profValues = prof.servicios_origen; break;
            case 'patologia': profValues = prof.patologias; break;
            case 'estado_seguimiento': return selectedValues.indexOf(prof.estado_seguimiento) !== -1;
            case 'sexo': return selectedValues.indexOf(prof.sexo) !== -1;
            case 'estado_tratamiento': profValues = prof.estados_tratamiento; break;
            case 'actividad_categoria': return prof.ultima_actividad && selectedValues.indexOf(prof.ultima_actividad.categoria) !== -1;
            case 'prom_categoria': return prof.ultimo_prom && selectedValues.indexOf(prof.ultimo_prom.categoria) !== -1;
            case 'comorbilidad': profValues = prof.comorbilidades; break;
            case 'gravedad_ea': profValues = prof.gravedad_eventos; break;
            case 'adherencia': return selectedValues.indexOf(prof.adherencia_nivel) !== -1;
            case 'validacion': return selectedValues.indexOf(prof.estado_validacion) !== -1;
            case 'farmaco_nombre': profValues = prof.farmacos_nombres; break;
            case 'pauta': profValues = prof.pautas; break;
            case 'via': profValues = prof.vias; break;
            case 'prom_fuente': profValues = prof.prom_fuentes; break;
            case 'tipo_ea': profValues = prof.tipos_eventos_adversos; break;
            case 'accion_tomada': profValues = prof.acciones_tomadas; break;
            default: return true;
        }
        if (!profValues || profValues.length === 0) return false;
        for (var i = 0; i < selectedValues.length; i++) {
            if (profValues.indexOf(selectedValues[i]) !== -1) return true;
        }
        return false;
    }

    function radioFilterMatches(prof, group, value) {
        if (!prof) return false;
        switch (group) {
            case 'cambio_pauta':
                if (value === 'si') return prof.tiene_cambio_pauta === true;
                if (value === 'no') return prof.tiene_cambio_pauta === false;
                return true;
            case 'eventos_adversos':
                if (value === 'si') return prof.tiene_eventos_adversos === true;
                if (value === 'no') return prof.tiene_eventos_adversos === false;
                return true;
            case 'edad_grupo':
                if (value === 'lt30') return prof.edad < 30;
                if (value === '30-44') return prof.edad >= 30 && prof.edad <= 44;
                if (value === '45-64') return prof.edad >= 45 && prof.edad <= 64;
                if (value === 'gte65') return prof.edad >= 65;
                return true;
            case 'intensificacion':
                return prof.intensificacion === value;
            case 'desintensificacion':
                return prof.desintensificacion === value;
            default: return true;
        }
    }

    function selectFilterMatches(prof, group, value) {
        if (!prof) return false;
        switch (group) {
            case 'principio_activo':
                return prof.principios_activos.indexOf(value) !== -1;
            case 'actividad_tipo':
                return prof.actividad_tipos.indexOf(value) !== -1;
            case 'prom_tipo':
                return prof.prom_tipos.indexOf(value) !== -1;
            case 'dosis':
                return prof.dosis.indexOf(value) !== -1;
            default: return true;
        }
    }

    function rangeFilterMatches(prof, group, min, max) {
        if (!prof) return false;
        var val = null;
        if (group === 'actividad_valor' && prof.ultima_actividad) {
            val = prof.ultima_actividad.valor;
        } else if (group === 'prom_valor' && prof.ultimo_prom) {
            val = prof.ultimo_prom.valor;
        }
        if (val === null || isNaN(val)) return false;
        if (min !== null && val < min) return false;
        if (max !== null && val > max) return false;
        return true;
    }

    function clearFilters() {
        var inputs = document.querySelectorAll('#advanced-filters-body input, #advanced-filters-body select');
        inputs.forEach(function (input) {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else if (input.type === 'number') {
                input.value = '';
            }
        });
        clearQuickFilters();
        currentFilters = {};
        currentQuickFilters = {};
        filteredPatients = allPatients.slice();
        currentPage = 1;
        renderAll();
    }

    function populateQuickFilters() {
        var opts = deriveFilterOptions();
        var sServ = document.getElementById('qf-servicio');
        var sPat = document.getElementById('qf-patologia');
        var sFar = document.getElementById('qf-farmaco');
        var sEst = document.getElementById('qf-estado');

        function fill(select, options, label) {
            if (!select) return;
            var cur = select.value;
            while (select.options.length > 1) select.remove(1);
            options.forEach(function (opt) {
                var o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                select.appendChild(o);
            });
            select.value = cur;
        }

        fill(sServ, opts.servicios, 'Todos');
        fill(sPat, opts.patologias, 'Todas');
        fill(sFar, opts.principios_activos, 'Todos');
        if (sEst) {
            var cur = sEst.value;
            while (sEst.options.length > 1) sEst.remove(1);
            var estOpts = [
                { value: 'en_seguimiento', label: 'En seguimiento' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'alta', label: 'Alta' },
                { value: 'validado', label: 'Validado' }
            ];
            estOpts.forEach(function (opt) {
                var o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                sEst.appendChild(o);
            });
            sEst.value = cur;
        }
    }

    function readQuickFilters() {
        var qf = {};
        var selects = document.querySelectorAll('.stats-quick-filter-select');
        selects.forEach(function (sel) {
            var key = sel.dataset.quickFilter;
            if (key && sel.value) qf[key] = sel.value;
        });
        return qf;
    }

    function matchesQuickFilters(prof, qf) {
        if (!qf || Object.keys(qf).length === 0) return true;
        if (!prof) return false;
        if (qf.servicio) {
            if (prof.servicios_origen.indexOf(qf.servicio) === -1) return false;
        }
        if (qf.patologia) {
            if (prof.patologias.indexOf(qf.patologia) === -1) return false;
        }
        if (qf.farmaco) {
            if (prof.principios_activos.indexOf(qf.farmaco) === -1 && prof.farmacos_nombres.indexOf(qf.farmaco) === -1) return false;
        }
        if (qf.estado) {
            if (prof.estado_seguimiento !== qf.estado) return false;
        }
        if (qf.ea) {
            if (qf.ea === 'si' && !prof.tiene_eventos_adversos) return false;
            if (qf.ea === 'no' && prof.tiene_eventos_adversos) return false;
        }
        if (qf.adherencia) {
            if (prof.adherencia_nivel !== qf.adherencia) return false;
        }
        return true;
    }

    function clearQuickFilters() {
        var selects = document.querySelectorAll('.stats-quick-filter-select');
        selects.forEach(function (sel) {
            sel.value = '';
        });
    }

    function renderExecutiveSummary() {
        var total = filteredPatients.length;
        var svcSet = {};
        var patSet = {};
        var farmSet = {};
        var eaCount = 0;
        filteredPatients.forEach(function (p) {
            var prof = p._profile;
            if (!prof) return;
            prof.servicios_origen.forEach(function (s) { if (s !== 'Farmacia') svcSet[s] = true; });
            prof.patologias.forEach(function (pt) { patSet[pt] = true; });
            prof.principios_activos.forEach(function (f) { farmSet[f] = true; });
            if (prof.tiene_eventos_adversos) eaCount++;
        });
        var elPac = document.getElementById('summary-pacientes');
        var elSvc = document.getElementById('summary-servicios');
        var elPat = document.getElementById('summary-patologias');
        var elFar = document.getElementById('summary-farmacos');
        var elEa = document.getElementById('summary-ea');
        if (elPac) elPac.textContent = total;
        if (elSvc) elSvc.textContent = Object.keys(svcSet).length;
        if (elPat) elPat.textContent = Object.keys(patSet).length;
        if (elFar) elFar.textContent = Object.keys(farmSet).length;
        if (elEa) elEa.textContent = eaCount;
    }

    function renderKpiCards() {
        var container = document.getElementById('kpi-grid');
        if (!container) return;
        clearChildren(container);

        var count = filteredPatients.length;
        var activeRx = 0;
        var highPROM = 0;
        var lowAdh = 0;
        var hasAE = 0;
        var pendingVal = 0;

        filteredPatients.forEach(function (p) {
            var prof = p._profile;
            if (!prof) return;
            if (prof.tiene_tratamiento_activo) activeRx++;
            if (prof.ultimo_prom && prof.ultimo_prom.categoria === 'alto') highPROM++;
            if (prof.adherencia_nivel === 'baja') lowAdh++;
            if (prof.tiene_eventos_adversos) hasAE++;
            if (prof.estado_validacion === 'pendiente' || prof.estado_validacion === 'en_seguimiento') pendingVal++;
        });

        var cards = [
            { cls: 'stats-kpi-card--green', icon: 'fa-users', label: 'Pacientes incluidos', value: count },
            { cls: 'stats-kpi-card--green', icon: 'fa-syringe', label: 'Tratamiento activo', value: activeRx },
            { cls: 'stats-kpi-card--orange', icon: 'fa-exclamation-triangle', label: 'PROM alto', value: highPROM },
            { cls: 'stats-kpi-card--red', icon: 'fa-arrow-down', label: 'Baja adherencia', value: lowAdh },
            { cls: 'stats-kpi-card--yellow', icon: 'fa-exclamation-circle', label: 'Eventos adversos', value: hasAE },
            { cls: 'stats-kpi-card--purple', icon: 'fa-clock', label: 'Validación pendiente', value: pendingVal }
        ];

        cards.forEach(function (c) {
            var card = el('div', 'stats-kpi-card ' + c.cls);
            var iconWrap = el('div', 'stats-kpi-icon');
            iconWrap.appendChild(icon(c.icon));
            card.appendChild(iconWrap);
            card.appendChild(el('div', 'stats-kpi-label', c.label));
            card.appendChild(el('div', 'stats-kpi-value', String(c.value)));
            container.appendChild(card);
        });
    }

    function renderCohortPills() {
        var container = document.getElementById('cohort-pills');
        if (!container) return;
        clearChildren(container);

        var parts = [];
        var qf = currentQuickFilters;
        if (qf.servicio) parts.push(qf.servicio);
        if (qf.patologia) parts.push(qf.patologia);
        if (qf.farmaco) parts.push(qf.farmaco);
        if (qf.estado) parts.push(qf.estado);
        if (qf.ea) parts.push('EA: ' + qf.ea);
        if (qf.adherencia) parts.push('Adherencia: ' + qf.adherencia);

        var labelMap = {
            servicio: 'Servicio', patologia: 'Patología', estado_seguimiento: 'Seguimiento',
            sexo: 'Sexo', estado_tratamiento: 'Tratamiento', actividad_categoria: 'Actividad',
            prom_categoria: 'PROM', comorbilidad: 'Comorbilidad', gravedad_ea: 'Gravedad EA',
            adherencia: 'Adherencia', validacion: 'Validación',
            farmaco_nombre: 'Fármaco', pauta: 'Pauta', via: 'Vía',
            prom_fuente: 'Fuente PROM', tipo_ea: 'Tipo EA', accion_tomada: 'Acción'
        };
        var labelMapRadio = { cambio_pauta: 'Cambio pauta', eventos_adversos: 'EA', edad_grupo: 'Edad', intensificacion: 'Intensificación', desintensificacion: 'Desintensificación' };
        var labelMapSelect = { principio_activo: 'Fármaco', actividad_tipo: 'Índice', prom_tipo: 'PROM', dosis: 'Dosis' };
        var labelMapRange = { actividad_valor: 'Valor clín.', prom_valor: 'Valor PROM' };

        for (var key in currentFilters) {
            if (!currentFilters.hasOwnProperty(key)) continue;
            var f = currentFilters[key];
            if (f.type === 'checkbox' && f.values && f.values.length > 0) {
                f.values.forEach(function (v) {
                    parts.push((labelMap[key] || key) + ': ' + v);
                });
            } else if (f.type === 'radio' && f.value) {
                parts.push((labelMapRadio[key] || key) + ': ' + f.value);
            } else if (f.type === 'select' && f.value) {
                parts.push((labelMapSelect[key] || key) + ': ' + f.value);
            } else if (f.type === 'range' && (f.min !== null || f.max !== null)) {
                var rangeParts = [];
                if (f.min !== null) rangeParts.push('min ' + f.min);
                if (f.max !== null) rangeParts.push('max ' + f.max);
                parts.push((labelMapRange[key] || key) + ': ' + rangeParts.join(', '));
            }
        }

        if (parts.length === 0) {
            var pill = el('span', 'stats-cohort-pill', 'Sin filtros activos');
            container.appendChild(pill);
            return;
        }

        var pill = el('span', 'stats-cohort-pill', parts.join(' \u00B7 '));
        container.appendChild(pill);
    }

    function renderFilterChips() {
        var container = document.getElementById('active-filters-chips');
        if (!container) return;
        clearChildren(container);

        var hasActive = false;
        for (var key in currentFilters) {
            if (!currentFilters.hasOwnProperty(key)) continue;
            var f = currentFilters[key];
            if (f.type === 'checkbox' && f.values && f.values.length > 0) {
                f.values.forEach(function (v) {
                    var chip = el('span', 'filter-chip');
                    var labelMap = {
                        servicio: 'Servicio', patologia: 'Patología', estado_seguimiento: 'Seguimiento',
                        sexo: 'Sexo', estado_tratamiento: 'Tratamiento', actividad_categoria: 'Actividad',
                        prom_categoria: 'PROM', comorbilidad: 'Comorbilidad', gravedad_ea: 'Gravedad EA',
                        adherencia: 'Adherencia', validacion: 'Validación',
                        farmaco_nombre: 'Fármaco', pauta: 'Pauta', via: 'Vía',
                        prom_fuente: 'Fuente PROM', tipo_ea: 'Tipo EA', accion_tomada: 'Acción'
                    };
                    chip.textContent = (labelMap[key] || key) + ': ' + v;
                    container.appendChild(chip);
                    hasActive = true;
                });
            } else if (f.type === 'radio' && f.value) {
                var chip = el('span', 'filter-chip');
                var labelMap = { cambio_pauta: 'Cambio pauta', eventos_adversos: 'EA', edad_grupo: 'Edad', intensificacion: 'Intensificación', desintensificacion: 'Desintensificación' };
                chip.textContent = (labelMap[key] || key) + ': ' + f.value;
                container.appendChild(chip);
                hasActive = true;
            } else if (f.type === 'select' && f.value) {
                var chip2 = el('span', 'filter-chip');
                var labelMap2 = { principio_activo: 'Fármaco', actividad_tipo: 'Índice', prom_tipo: 'PROM', dosis: 'Dosis' };
                chip2.textContent = (labelMap2[key] || key) + ': ' + f.value;
                container.appendChild(chip2);
                hasActive = true;
            } else if (f.type === 'range' && (f.min !== null || f.max !== null)) {
                var chip3 = el('span', 'filter-chip');
                var labelMap3 = { actividad_valor: 'Valor clín.', prom_valor: 'Valor PROM' };
                var parts = [];
                if (f.min !== null) parts.push('min ' + f.min);
                if (f.max !== null) parts.push('max ' + f.max);
                chip3.textContent = (labelMap3[key] || key) + ': ' + parts.join(', ');
                container.appendChild(chip3);
                hasActive = true;
            }
        }

        if (!hasActive) {
            var empty = el('span', 'filter-chip filter-chip--empty', 'Sin filtros activos');
            container.appendChild(empty);
        }
    }

    function renderResultCount() {
        var el = document.getElementById('filter-result-count');
        if (!el) return;
        var total = allPatients.length;
        var filtered = filteredPatients.length;
        if (filtered === total) {
            el.textContent = 'Mostrando todos los pacientes (' + total + ')';
        } else {
            el.textContent = filtered + ' de ' + total + ' pacientes';
        }
    }

    function countByLabel(filtered, fn) {
        var map = {};
        filtered.forEach(function (p) {
            var labels = fn(p);
            if (!Array.isArray(labels)) labels = [labels];
            labels.forEach(function (l) {
                if (l) map[l] = (map[l] || 0) + 1;
            });
        });
        return map;
    }

    function sortAndTake(map, n) {
        var entries = Object.keys(map).map(function (k) { return { label: k, value: map[k] }; });
        entries.sort(function (a, b) { return b.value - a.value; });
        if (n) entries = entries.slice(0, n);
        return entries;
    }

    function renderMiniBarChart(container, data, maxVal) {
        clearChildren(container);
        if (!data || data.length === 0) {
            container.appendChild(el('p', 'chart-empty', 'Sin datos'));
            return;
        }
        var max = maxVal || 0;
        if (!maxVal) {
            data.forEach(function (d) { if (d.value > max) max = d.value; });
        }
        if (max === 0) max = 1;
        var list = el('div', 'stats-mini-bars');
        data.forEach(function (d) {
            var row = el('div', 'stats-mini-bar-row');
            var label = el('span', 'stats-mini-bar-label', d.label);
            var track = el('div', 'stats-mini-bar-track');
            var fill = el('div', 'stats-mini-bar-fill');
            var pct = Math.round((d.value / max) * 100);
            fill.style.width = pct + '%';
            track.appendChild(fill);
            var val = el('span', 'stats-mini-bar-value', String(d.value));
            row.appendChild(label);
            row.appendChild(track);
            row.appendChild(val);
            list.appendChild(row);
        });
        container.appendChild(list);
    }

    function renderDonut(container, data, totalLabel) {
        clearChildren(container);
        if (!data || data.length === 0) {
            container.appendChild(el('p', 'chart-empty', 'Sin datos'));
            return;
        }
        var total = 0;
        data.forEach(function (d) { total += d.value; });
        var colors = ['#22C55E', '#F97316', '#EF4444', '#EAB308', '#A855F7', '#3B82F6', '#64748B'];
        var wrap = el('div', 'stats-donut-wrap');
        var ring = el('div', 'stats-donut-ring');
        var conicParts = [];
        var currentDeg = 0;
        data.forEach(function (d, idx) {
            var pct = total > 0 ? (d.value / total) * 100 : 0;
            var color = colors[idx % colors.length];
            conicParts.push(color + ' ' + currentDeg + '% ' + (currentDeg + pct) + '%');
            currentDeg += pct;
        });
        ring.style.background = 'conic-gradient(' + conicParts.join(', ') + ')';
        var inner = el('div', 'stats-donut-inner');
        inner.appendChild(el('div', 'stats-donut-value', String(total)));
        inner.appendChild(el('div', 'stats-donut-unit', totalLabel || 'pacientes'));
        ring.appendChild(inner);
        wrap.appendChild(ring);

        var legend = el('div', 'stats-donut-legend');
        data.forEach(function (d, idx) {
            var item = el('div', 'stats-donut-legend-item');
            var dot = el('span', 'stats-donut-legend-dot');
            dot.style.backgroundColor = colors[idx % colors.length];
            item.appendChild(dot);
            var labelText = d.label + ' ';
            var count = el('span', 'stats-donut-legend-count', d.value + ' (' + (total > 0 ? Math.round((d.value / total) * 100) : 0) + '%)');
            item.appendChild(document.createTextNode(labelText));
            item.appendChild(count);
            legend.appendChild(item);
        });
        wrap.appendChild(legend);
        container.appendChild(wrap);
    }

    function renderCharts() {
        var f = filteredPatients;

        // Bloque 1: ¿Quiénes son?
        var b1 = document.getElementById('chart-quienes-content');
        if (b1) {
            clearChildren(b1);
            var svcData = sortAndTake(countByLabel(f, function (p) {
                return (p._profile && p._profile.servicios_origen) ? p._profile.servicios_origen.filter(function (s) { return s !== 'Farmacia'; }) : [];
            }));
            var patData = sortAndTake(countByLabel(f, function (p) {
                return p._profile ? p._profile.patologias : [];
            }));
            var sub1 = el('div', '');
            var sub1a = el('div', 'stats-chart-block-subgroup');
            var h4a = el('h4', 'stats-chart-block-subtitle', 'Por servicio');
            sub1a.appendChild(h4a);
            var svcContainer = el('div', '');
            renderMiniBarChart(svcContainer, svcData);
            sub1a.appendChild(svcContainer);
            sub1.appendChild(sub1a);

            var sub1b = el('div', 'stats-chart-block-subgroup');
            var h4b = el('h4', 'stats-chart-block-subtitle', 'Por patología');
            sub1b.appendChild(h4b);
            var patContainer = el('div', '');
            renderMiniBarChart(patContainer, patData);
            sub1b.appendChild(patContainer);
            sub1.appendChild(sub1b);

            var link1 = el('button', 'stats-chart-link', 'Ver detalle');
            link1.type = 'button';
            link1.disabled = true;
            link1.title = 'Próximamente';
            sub1.appendChild(link1);
            b1.appendChild(sub1);
        }

        // Bloque 2: ¿Qué tratamiento reciben?
        var b2 = document.getElementById('chart-tratamiento-content');
        if (b2) {
            clearChildren(b2);
            var paMap = {};
            f.forEach(function (p) {
                if (!p._profile) return;
                var seen = {};
                p._profile.principios_activos.forEach(function (pa) {
                    if (!seen[pa]) { seen[pa] = true; paMap[pa] = (paMap[pa] || 0) + 1; }
                });
            });
            var paData = sortAndTake(paMap, 10);
            var sub2 = el('div', '');
            var sub2group = el('div', 'stats-chart-block-subgroup');
            var h4c = el('h4', 'stats-chart-block-subtitle', 'Principios activos (tratamiento activo)');
            sub2group.appendChild(h4c);
            var paContainer = el('div', '');
            renderMiniBarChart(paContainer, paData);
            sub2group.appendChild(paContainer);

            var h4opt = el('h4', 'stats-chart-block-subtitle', 'Optimización farmacoterapéutica');
            sub2group.appendChild(h4opt);
            var optContainer = el('div', '');
            var optData = [
                { label: 'Sin cambios', value: f.filter(function (p) { var prof = p._profile; return prof && !prof.tiene_cambio_pauta && prof.intensificacion === 'no_determinable' && prof.desintensificacion === 'no_determinable'; }).length },
                { label: 'Intensificación', value: f.filter(function (p) { var prof = p._profile; return prof && prof.intensificacion === 'si'; }).length },
                { label: 'Desintensificación', value: f.filter(function (p) { var prof = p._profile; return prof && prof.desintensificacion === 'si'; }).length },
                { label: 'Cambio de tratamiento', value: f.filter(function (p) { var prof = p._profile; return prof && prof.tiene_cambio_pauta === true; }).length },
                { label: 'Suspensión', value: f.filter(function (p) { var prof = p._profile; return prof && prof.estados_tratamiento.indexOf('suspendido') !== -1; }).length }
            ];
            renderMiniBarChart(optContainer, optData);
            sub2group.appendChild(optContainer);
            sub2.appendChild(sub2group);

            var link2 = el('button', 'stats-chart-link', 'Ver detalle');
            link2.type = 'button';
            link2.disabled = true;
            link2.title = 'Próximamente';
            sub2.appendChild(link2);
            b2.appendChild(sub2);
        }

        // Bloque 3: ¿Cómo evolucionan?
        var b3 = document.getElementById('chart-evolucion-content');
        if (b3) {
            clearChildren(b3);
            var promCatMap = countByLabel(f, function (p) {
                return p._profile && p._profile.ultimo_prom ? p._profile.ultimo_prom.categoria : null;
            });
            var adhMap = countByLabel(f, function (p) {
                return p._profile ? p._profile.adherencia_nivel : null;
            });
            var promEntries = sortAndTake(promCatMap);
            var adhEntries = sortAndTake(adhMap);
            var grid = el('div', 'stats-donut-grid');
            var wrapProm = el('div', 'stats-donut-wrap');
            var h4d = el('h4', 'stats-donut-label', 'Nivel de PROM (DLQI)');
            wrapProm.appendChild(h4d);
            var promContainer = el('div', '');
            renderDonut(promContainer, promEntries, 'pacientes');
            wrapProm.appendChild(promContainer);
            grid.appendChild(wrapProm);

            var wrapAdh = el('div', 'stats-donut-wrap');
            var h4e = el('h4', 'stats-donut-label', 'Adherencia al tratamiento');
            wrapAdh.appendChild(h4e);
            var adhContainer = el('div', '');
            renderDonut(adhContainer, adhEntries, 'pacientes');
            wrapAdh.appendChild(adhContainer);
            grid.appendChild(wrapAdh);
            b3.appendChild(grid);
        }

        // Bloque 4: ¿Qué riesgos aparecen?
        var b4 = document.getElementById('chart-riesgos-content');
        if (b4) {
            clearChildren(b4);
            var eaMap = {};
            f.forEach(function (p) {
                if (!p._profile) return;
                eaMap[p._profile.tiene_eventos_adversos ? 'Con EA' : 'Sin EA'] = (eaMap[p._profile.tiene_eventos_adversos ? 'Con EA' : 'Sin EA'] || 0) + 1;
            });
            var valMap = countByLabel(f, function (p) {
                return p._profile ? p._profile.estado_validacion : null;
            });
            var eaEntries = sortAndTake(eaMap);
            var valEntries = sortAndTake(valMap);
            var grid2 = el('div', 'stats-donut-grid');
            var wrapEa = el('div', 'stats-donut-wrap');
            var h4f = el('h4', 'stats-donut-label', 'Eventos adversos');
            wrapEa.appendChild(h4f);
            var eaContainer = el('div', '');
            renderDonut(eaContainer, eaEntries, 'pacientes');
            wrapEa.appendChild(eaContainer);
            grid2.appendChild(wrapEa);

            var wrapVal = el('div', 'stats-donut-wrap');
            var h4g = el('h4', 'stats-donut-label', 'Estado de validación');
            wrapVal.appendChild(h4g);
            var valContainer = el('div', '');
            renderDonut(valContainer, valEntries, 'pacientes');
            wrapVal.appendChild(valContainer);
            grid2.appendChild(wrapVal);
            b4.appendChild(grid2);
        }
    }

    function renderPatientsTable() {
        var thead = document.querySelector('#patients-table thead');
        var tbody = document.querySelector('#patients-table tbody');
        if (!thead || !tbody) return;
        clearChildren(thead);
        clearChildren(tbody);

        var columns = [
            'CIP demo', 'Servicio / patología', 'Tratamiento activo',
            'Último PROM', 'Actividad clínica', 'Adherencia',
            'EA', 'Validación', 'Última visita'
        ];

        var headerRow = document.createElement('tr');
        columns.forEach(function (col) {
            var th = el('th', '', col);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        var start = (currentPage - 1) * ITEMS_PER_PAGE;
        var end = Math.min(start + ITEMS_PER_PAGE, filteredPatients.length);
        var pagePatients = filteredPatients.slice(start, end);

        pagePatients.forEach(function (p) {
            var prof = p._profile;
            if (!prof) return;
            var row = document.createElement('tr');

            var activeTx = null;
            if (p.tratamientos) {
                for (var i = 0; i < p.tratamientos.length; i++) {
                    if (p.tratamientos[i].activo) { activeTx = p.tratamientos[i]; break; }
                }
            }
            if (!activeTx && p.tratamientos && p.tratamientos.length > 0) {
                activeTx = p.tratamientos[p.tratamientos.length - 1];
            }

            // CIP
            row.appendChild(el('td', '', p.cip));

            // Servicio / patología
            var svcPat = prof.servicios_origen.filter(function (s) { return s !== 'Farmacia'; }).join(', ') +
                ' / ' + prof.patologias.join(', ');
            row.appendChild(el('td', '', svcPat));

            // Tratamiento activo
            var txText = activeTx ? (activeTx.principio_activo + ' ' + activeTx.presentacion_dosis + ' ' + activeTx.pauta) : '—';
            // Nota: presentacion_dosis ya incluye dosis + vía en los datos sintéticos.
            // No se reescribe lógica compleja de dosis/pauta por separado.
            row.appendChild(el('td', '', txText));

            // Último PROM
            var promCell = el('td', '');
            if (prof.ultimo_prom) {
                promCell.textContent = prof.ultimo_prom.tipo + ' ' + prof.ultimo_prom.valor;
                var promClass = 'stats-cell-risk-neutral';
                if (prof.ultimo_prom.categoria === 'alto') promClass = 'stats-cell-risk-high';
                else if (prof.ultimo_prom.categoria === 'moderado') promClass = 'stats-cell-risk-moderate';
                else if (prof.ultimo_prom.categoria === 'bajo') promClass = 'stats-cell-risk-low';
                promCell.className = promClass;
            } else {
                promCell.textContent = '—';
            }
            row.appendChild(promCell);

            // Actividad clínica
            var clinCell = el('td', '');
            if (prof.ultima_actividad) {
                clinCell.textContent = prof.ultima_actividad.tipo_indice + ' ' + prof.ultima_actividad.valor;
                var clinClass = 'stats-cell-risk-neutral';
                if (prof.ultima_actividad.categoria === 'alta') clinClass = 'stats-cell-risk-high';
                else if (prof.ultima_actividad.categoria === 'moderada') clinClass = 'stats-cell-risk-moderate';
                else if (prof.ultima_actividad.categoria === 'baja' || prof.ultima_actividad.categoria === 'remision') clinClass = 'stats-cell-risk-ok';
                clinCell.className = clinClass;
            } else {
                clinCell.textContent = '—';
            }
            row.appendChild(clinCell);

            // Adherencia
            var adhCell = el('td', '');
            var adhBadge = el('span', 'stats-badge');
            if (prof.adherencia_nivel === 'alta') {
                adhBadge.className = 'stats-badge stats-badge--bajo';
                adhBadge.textContent = 'Alta';
            } else if (prof.adherencia_nivel === 'media') {
                adhBadge.className = 'stats-badge stats-badge--moderado';
                adhBadge.textContent = 'Media';
            } else if (prof.adherencia_nivel === 'baja') {
                adhBadge.className = 'stats-badge stats-badge--alto';
                adhBadge.textContent = 'Baja';
            } else {
                adhBadge.className = 'stats-badge stats-badge--pendiente';
                adhBadge.textContent = 'No registrada';
            }
            adhCell.appendChild(adhBadge);
            row.appendChild(adhCell);

            // EA
            var eaCell = el('td', '');
            var eaBadge = el('span', 'stats-badge');
            if (prof.tiene_eventos_adversos) {
                eaBadge.className = 'stats-badge stats-badge--alto';
                eaBadge.textContent = 'Sí';
            } else {
                eaBadge.className = 'stats-badge stats-badge--no';
                eaBadge.textContent = 'No';
            }
            eaCell.appendChild(eaBadge);
            row.appendChild(eaCell);

            // Validación
            var valCell = el('td', '');
            var valBadge = el('span', 'stats-badge');
            if (prof.estado_validacion === 'validado') {
                valBadge.className = 'stats-badge stats-badge--validado';
                valBadge.textContent = 'Validado';
            } else if (prof.estado_validacion === 'pendiente') {
                valBadge.className = 'stats-badge stats-badge--pendiente';
                valBadge.textContent = 'Pendiente';
            } else if (prof.estado_validacion === 'en_seguimiento') {
                valBadge.className = 'stats-badge stats-badge--bajo';
                valBadge.textContent = 'En seguimiento';
            } else {
                valBadge.className = 'stats-badge stats-badge--no';
                valBadge.textContent = prof.estado_validacion;
            }
            valCell.appendChild(valBadge);
            row.appendChild(valCell);

            // Última visita
            var lastVisit = '—';
            var episodios = p.episodios_asistenciales || [];
            if (episodios.length > 0) {
                var sortedEp = episodios.slice().sort(function (a, b) {
                    return new Date(b.fecha) - new Date(a.fecha);
                });
                lastVisit = sortedEp[0].fecha;
            }
            row.appendChild(el('td', '', lastVisit));

            tbody.appendChild(row);
        });

        renderPagination();
    }

    function renderPagination() {
        var container = document.getElementById('table-pagination');
        if (!container) return;
        clearChildren(container);

        var totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
        if (totalPages <= 1) return;

        var info = el('span', 'pagination-info', 'Página ' + currentPage + ' de ' + totalPages + ' (' + filteredPatients.length + ' pacientes)');
        container.appendChild(info);

        var btnGroup = el('div', 'pagination-buttons');

        var prevBtn = el('button', 'btn btn-sm btn-outline', 'Anterior');
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) { currentPage--; renderPatientsTable(); }
        });
        btnGroup.appendChild(prevBtn);

        var nextBtn = el('button', 'btn btn-sm btn-outline', 'Siguiente');
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', function () {
            if (currentPage < totalPages) { currentPage++; renderPatientsTable(); }
        });
        btnGroup.appendChild(nextBtn);

        container.appendChild(btnGroup);
    }

    function renderAll() {
        var noResults = document.getElementById('no-results-message');
        var kpiSection = document.getElementById('kpi-section');
        var chartsSection = document.getElementById('charts-section');
        var tableSection = document.getElementById('patients-table-section');
        var cohortSection = document.getElementById('cohort-section');

        renderExecutiveSummary();
        renderKpiCards();
        renderCohortPills();
        renderFilterChips();
        renderResultCount();

        if (filteredPatients.length === 0) {
            if (noResults) noResults.classList.remove('hidden');
            if (kpiSection) kpiSection.classList.add('hidden');
            if (chartsSection) chartsSection.classList.add('hidden');
            if (tableSection) tableSection.classList.add('hidden');
            if (cohortSection) cohortSection.classList.add('hidden');
        } else {
            if (noResults) noResults.classList.add('hidden');
            if (kpiSection) kpiSection.classList.remove('hidden');
            if (chartsSection) chartsSection.classList.remove('hidden');
            if (tableSection) tableSection.classList.remove('hidden');
            if (cohortSection) cohortSection.classList.remove('hidden');
            renderCharts();
            renderPatientsTable();
        }
    }

    function bindEvents() {
        var applyBtn = document.getElementById('apply-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', function () {
                applyFilters();
            });
        }

        var clearBtn = document.getElementById('clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                clearFilters();
            });
        }

        var clearQuickBtn = document.getElementById('clear-quick-filters');
        if (clearQuickBtn) {
            clearQuickBtn.addEventListener('click', function () {
                clearFilters();
            });
        }

        var emptyClearBtn = document.getElementById('empty-clear-filters');
        if (emptyClearBtn) {
            emptyClearBtn.addEventListener('click', function () {
                clearFilters();
            });
        }

        var quickSelects = document.querySelectorAll('.stats-quick-filter-select');
        quickSelects.forEach(function (sel) {
            sel.addEventListener('change', function () {
                applyFilters();
            });
        });

        var accordionToggle = document.getElementById('advancedFiltersToggle');
        var accordionBody = document.getElementById('advanced-filters-body');
        if (accordionToggle && accordionBody) {
            accordionToggle.addEventListener('click', function () {
                var expanded = accordionToggle.getAttribute('aria-expanded') === 'true';
                accordionToggle.setAttribute('aria-expanded', String(!expanded));
                if (expanded) {
                    accordionBody.classList.add('hidden');
                } else {
                    accordionBody.classList.remove('hidden');
                }
            });
        }

        var funnelBtn = document.getElementById('quickFilterFunnel');
        if (funnelBtn && accordionToggle && accordionBody) {
            funnelBtn.addEventListener('click', function () {
                var expanded = accordionToggle.getAttribute('aria-expanded') === 'true';
                accordionToggle.setAttribute('aria-expanded', 'true');
                accordionBody.classList.remove('hidden');
                accordionBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        var exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                alert('Exportar informe: funcionalidad en desarrollo.');
            });
        }
    }

    function loadDataset() {
        var statusTime = document.querySelector('#dbStatusTime');
        fetch('data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json')
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to load dataset');
                return response.json();
            })
            .then(function (data) {
                var basePatients = data.pacientes || [];
                var syntheticPatients = generateSyntheticPatients(basePatients);
                allPatients = basePatients.concat(syntheticPatients);
                allPatients.forEach(function (p) {
                    p._profile = derivePatientProfile(p);
                });
                filteredPatients = allPatients.slice();
                if (statusTime) statusTime.textContent = allPatients.length + ' pacientes (sintéticos)';
                populateQuickFilters();
                buildFiltersUI();
                bindEvents();
                renderAll();
            })
            .catch(function (err) {
                if (statusTime) statusTime.textContent = 'Error al cargar datos';
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadDataset();
    });
})();
