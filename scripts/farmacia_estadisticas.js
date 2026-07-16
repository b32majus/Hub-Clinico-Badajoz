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







    function applyFilters() {
        var qf = readQuickFilters();
        currentFilters = {};
        currentQuickFilters = qf;

        var hasActiveFilter = false;
        Object.keys(qf).forEach(function (key) {
            if (qf[key]) hasActiveFilter = true;
        });

        if (!hasActiveFilter) {
            filteredPatients = allPatients.slice();
        } else {
            filteredPatients = allPatients.filter(function (p) {
                return matchesQuickFilters(p._profile, qf);
            });
        }

        currentPage = 1;
        renderAll();
    }



    function clearFilters() {
        var quickSelects = document.querySelectorAll('.stats-quick-filter-select');
        quickSelects.forEach(function (sel) { sel.value = ''; });
        currentFilters = {};
        currentQuickFilters = {};
        applyFilters();
    }

    function deriveFilterOptions() {
        var options = {
            servicios: [], patologias: [], estados_seguimiento: [], sexos: [],
            principios_activos: [], farmacos_nombres: [], dosis: [], pautas: [], vias: []
        };
        var svcSet = {}, patSet = {}, esSet = {}, sexSet = {}, paSet = {}, fnSet = {}, dosisSet = {}, pautaSet = {}, viaSet = {};
        allPatients.forEach(function (p) {
            var prof = p._profile;
            if (!prof) return;
            prof.servicios_origen.forEach(function (s) { svcSet[s] = true; });
            prof.patologias.forEach(function (pt) { patSet[pt] = true; });
            esSet[prof.estado_seguimiento] = true;
            sexSet[prof.sexo] = true;
            prof.principios_activos.forEach(function (pa) { paSet[pa] = true; });
            prof.farmacos_nombres.forEach(function (fn) { fnSet[fn] = true; });
            prof.dosis.forEach(function (d) { dosisSet[d] = true; });
            prof.pautas.forEach(function (pa) { pautaSet[pa] = true; });
            prof.vias.forEach(function (v) { viaSet[v] = true; });
        });
        options.servicios = Object.keys(svcSet).sort().map(function (s) { return { value: s, label: s }; });
        options.patologias = Object.keys(patSet).sort().map(function (p) { return { value: p, label: p }; });
        options.estados_seguimiento = Object.keys(esSet).sort().map(function (e) {
            var labels = { en_seguimiento: 'En seguimiento', pendiente: 'Pendiente', alta: 'Alta', validado: 'Validado' };
            return { value: e, label: labels[e] || e };
        });
        options.sexos = Object.keys(sexSet).sort().map(function (s) { return { value: s, label: s }; });
        options.principios_activos = Object.keys(paSet).sort().map(function (p) { return { value: p, label: p }; });
        options.farmacos_nombres = Object.keys(fnSet).sort().map(function (f) { return { value: f, label: f }; });
        options.dosis = Object.keys(dosisSet).sort().map(function (d) { return { value: d, label: d }; });
        options.pautas = Object.keys(pautaSet).sort().map(function (p) { return { value: p, label: p }; });
        options.vias = Object.keys(viaSet).sort().map(function (v) { return { value: v, label: v }; });
        return options;
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
        if (qf.servicio) parts.push({key: 'servicio', label: qf.servicio});
        if (qf.patologia) parts.push({key: 'patologia', label: qf.patologia});
        if (qf.farmaco) parts.push({key: 'farmaco', label: qf.farmaco});
        if (qf.estado) parts.push({key: 'estado', label: qf.estado});
        if (qf.ea) parts.push({key: 'ea', label: 'EA: ' + qf.ea});
        if (qf.adherencia) parts.push({key: 'adherencia', label: 'Adherencia: ' + qf.adherencia});

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
                    parts.push({key: key, label: (labelMap[key] || key) + ': ' + v});
                });
            } else if (f.type === 'radio' && f.value) {
                parts.push({key: key, label: (labelMapRadio[key] || key) + ': ' + f.value});
            } else if (f.type === 'select' && f.value) {
                parts.push({key: key, label: (labelMapSelect[key] || key) + ': ' + f.value});
            } else if (f.type === 'range' && (f.min !== null || f.max !== null)) {
                var rangeParts = [];
                if (f.min !== null) rangeParts.push('min ' + f.min);
                if (f.max !== null) rangeParts.push('max ' + f.max);
                parts.push({key: key, label: (labelMapRange[key] || key) + ': ' + rangeParts.join(', ')});
            }
        }

        if (parts.length === 0) {
            var emptyEl = document.createElement('span');
            emptyEl.className = 'stats-cohort-empty';
            emptyEl.textContent = 'Sin filtros activos';
            container.appendChild(emptyEl);
            return;
        }

        parts.forEach(function (p) {
            var chip = document.createElement('span');
            chip.className = 'stats-cohort-chip';

            var textSpan = document.createElement('span');
            textSpan.textContent = p.label;
            chip.appendChild(textSpan);

            var removeBtn = document.createElement('span');
            removeBtn.className = 'stats-cohort-chip-remove';
            removeBtn.textContent = '\u00D7';
            removeBtn.setAttribute('data-filter-key', p.key);
            removeBtn.addEventListener('click', function (key) {
                return function () {
                    var selectEl = document.getElementById('qf-' + key);
                    if (selectEl) selectEl.value = '';
                    applyFilters();
                };
            }(p.key));

            chip.appendChild(removeBtn);
            container.appendChild(chip);
        });
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
            if (d.tooltip) { item.title = d.tooltip; }
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
            var sub1 = el('div', 'stats-who-grid');
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
            var sub2 = el('div', 'stats-treatment-grid');
            var sub2group = el('div', 'stats-chart-block-subgroup');
            var h4c = el('h4', 'stats-chart-block-subtitle', 'Principios activos (tratamiento activo)');
            sub2group.appendChild(h4c);
            var paContainer = el('div', '');
            renderMiniBarChart(paContainer, paData);
            sub2group.appendChild(paContainer);
            sub2.appendChild(sub2group);

            var sub2opt = el('div', 'stats-chart-block-subgroup');
            var h4opt = el('h4', 'stats-chart-block-subtitle', 'Optimización farmacoterapéutica');
            sub2opt.appendChild(h4opt);
            var optContainer = el('div', '');
            var optData = [
                { label: 'Sin cambios', value: f.filter(function (p) { var prof = p._profile; return prof && !prof.tiene_cambio_pauta && prof.intensificacion === 'no_determinable' && prof.desintensificacion === 'no_determinable'; }).length, tooltip: 'Sin cambios de dosis ni fármaco en el período' },
                { label: 'Intensificación', value: f.filter(function (p) { var prof = p._profile; return prof && prof.intensificacion === 'si'; }).length, tooltip: 'Aumento de dosis, frecuencia o acortamiento del intervalo' },
                { label: 'Desintensificación', value: f.filter(function (p) { var prof = p._profile; return prof && prof.desintensificacion === 'si'; }).length, tooltip: 'Reducción de dosis, frecuencia o espaciamiento del intervalo' },
                { label: 'Cambio de tratamiento', value: f.filter(function (p) { var prof = p._profile; return prof && prof.tiene_cambio_pauta === true; }).length, tooltip: 'Sustitución por un fármaco diferente' },
                { label: 'Suspensión', value: f.filter(function (p) { var prof = p._profile; return prof && prof.estados_tratamiento.indexOf('suspendido') !== -1; }).length, tooltip: 'Retirada del tratamiento activo' }
            ];
            renderDonut(optContainer, optData, 'pacientes');
            sub2opt.appendChild(optContainer);
            sub2.appendChild(sub2opt);

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
            var eaEntries = sortAndTake(eaMap);
            var wrapEa = el('div', 'stats-donut-wrap');
            var h4f = el('h4', 'stats-donut-label', 'Eventos adversos');
            wrapEa.appendChild(h4f);
            var eaContainer = el('div', '');
            renderDonut(eaContainer, eaEntries, 'pacientes');
            wrapEa.appendChild(eaContainer);
            b4.appendChild(wrapEa);
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

        var exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                alert('Exportar informe: funcionalidad en desarrollo.');
            });
        }
    }

    function loadDataset() {
        var statusTime = document.querySelector('#dbStatusTime');
        window.FarmaciaDemo.ready
            .then(function () {
                allPatients = window.FarmaciaDemo.getAvailablePatients().map(function (patient) {
                    return {
                        cip: patient.cip,
                        nombre_demo: patient.nombre,
                        sexo: patient.sexo,
                        edad: patient.edad,
                        servicios_origen: [patient.servicio],
                        patologias: [patient.patologia],
                        comorbilidades_relevantes: [],
                        episodios_asistenciales: (patient.rawActs || []).map(function (act) {
                            return { tipo: act.tipo_acto_fh, fecha: act.fecha_acto, servicio: patient.servicio, estado: act.estado_registro, nota: act.observaciones_generales };
                        }),
                        tratamientos: (patient.biologicos || []).map(function (line) {
                            return {
                                id: line.linea_id,
                                cip: patient.cip,
                                nombre_comercial: line.nombre_comercial,
                                principio_activo: line.principio_activo,
                                presentacion_dosis: line.dosis,
                                via: line.via,
                                pauta: line.pauta,
                                activo: line.estado_linea === 'activo' || line.estado_linea === 'anadido',
                                estado_validacion_farmacia: patient.estado
                            };
                        }),
                        cambios_pauta: [],
                        proms: [],
                        actividad_clinica: [],
                        eventos_adversos: (patient.rawAdverseEvents || []).filter(function (event) { return event.ea_id; }).map(function (event) {
                            return { id: event.ea_id, cip: patient.cip, fecha: event.fecha_acto, tipo: event.ea_descripcion, gravedad: event.ea_gravedad, accion_tomada: event.accion_ea };
                        }),
                        adherencia: (patient.rawFollowups || []).filter(function (followup) { return followup.adherencia_morisky; }).map(function (followup) {
                            return { cip: patient.cip, fecha: followup.fecha_acto, interpretacion: followup.adherencia_morisky };
                        })
                    };
                });
                allPatients.forEach(function (p) {
                    p._profile = derivePatientProfile(p);
                });
                filteredPatients = allPatients.slice();
                if (statusTime) statusTime.textContent = allPatients.length + ' pacientes (sintéticos)';
                populateQuickFilters();
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
