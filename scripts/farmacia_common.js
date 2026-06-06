'use strict';

(function () {
    const qs = (selector, scope = document) => scope.querySelector(selector);
    const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    const patients = {
        'CIP-DEMO-FH-001': {
            nombre: 'Paciente Demo FH-001', cip: 'CIP-DEMO-FH-001', edad: '48', sexo: 'Mujer', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Secukinumab 300 mg', dosis: '300 mg', pauta: 'SC / cada 4 semanas', via: 'SC',
            estado: 'followup', estadoLabel: 'En seguimiento', fechaSolicitud: '2026-05-10', ultimaSolicitud: '2026-05-10',
            analitica: 'Analítica y vacunación completas según protocolo prebiológico demo.', scores: 'IHS4 demo: 9 → 5 (mejoría); DLQI demo: 14 → 8',
            ultimaVisita: '2026-06-01', adherencia: 'Alta (Morisky-Green: 4/4)', efectosAdversos: 'Reacción cutánea leve (2026-05-25, resuelta)', proms: 'DLQI 8; EVA picor 3/10', primeraVisita: '2026-05-12', seguimiento: 'Seguimiento abierto',
            ihs4: 9,
            hurley: 'Hurley II',
            dlqi: 14,
            localizacion: 'Axilar bilateral',
            tiempoEvolucion: '3 años',
            tratamientosPreviosHS: {
                doxiciclinaClindamicina: true,
                rifampicinaClindamicina: true,
                otrosAtb: true,
                otrosAtbTexto: 'Minociclina 6 meses'
            },
            biologicosPrevios: {
                adalimumab: true,
                adalimumabDuracion: '6 meses',
                adalimumabMotivo: 'Fallo secundario',
                otrosBiologicos: false,
                otrosBiologicosFarmaco: '',
                otrosBiologicosMotivo: ''
            },
            analiticaEstruct: {
                fecha: '2026-05-01',
                reciente: 'si',
                hemograma: true,
                bioquimica: true,
                mantoux: 'Negativo',
                serologias: 'Negativo',
                vacunacion: 'si',
                observaciones: 'Vacunas al día antes del inicio.'
            },
            comorbilidades: {
                imc: '30.2',
                tabaquismo: 'Exfumador',
                paquetesAno: '',
                diabetes: 'no',
                hba1c: '',
                sindromeMetabolico: 'si',
                otras: 'Obesidad grado I.'
            },
            motivoClinico: 'HS Hurley II refractaria a antibioterapia oral, candidata a biológico.',
            principioActivo: 'Secukinumab'
        },
        'CIP-DEMO-FH-002': {
            nombre: 'Paciente Demo FH-002', cip: 'CIP-DEMO-FH-002', edad: '35', sexo: 'Hombre', servicio: 'Dermatología', servicioSlug: 'dermatologia',
            patologia: 'Hidradenitis supurativa', farmaco: 'Adalimumab 80/40 mg', dosis: '80 mg inducción; 40 mg mantenimiento', pauta: 'SC / semanal según fase', via: 'SC',
            estado: 'pending', estadoLabel: 'Pendiente', fechaSolicitud: '2026-06-06', ultimaSolicitud: '2026-06-06',
            analitica: 'Analítica y cribado infeccioso pendientes de cierre.', scores: 'IHS4 demo: 12; DLQI demo: 16',
            ultimaVisita: '—', adherencia: 'Sin registro', efectosAdversos: 'No registrados', proms: 'Basal pendiente', primeraVisita: 'Pendiente', seguimiento: 'No iniciado',
            ihs4: 12,
            hurley: 'Hurley III',
            dlqi: 16,
            localizacion: 'Inguinal bilateral y axilar',
            tiempoEvolucion: '5 años',
            tratamientosPreviosHS: {
                doxiciclinaClindamicina: true,
                rifampicinaClindamicina: true,
                otrosAtb: false,
                otrosAtbTexto: ''
            },
            biologicosPrevios: {
                adalimumab: false,
                adalimumabDuracion: '',
                adalimumabMotivo: '',
                otrosBiologicos: false,
                otrosBiologicosFarmaco: '',
                otrosBiologicosMotivo: ''
            },
            analiticaEstruct: {
                fecha: '2026-06-01',
                reciente: 'si',
                hemograma: true,
                bioquimica: true,
                mantoux: 'Pendiente',
                serologias: 'Pendiente',
                vacunacion: 'pendiente',
                observaciones: ''
            },
            comorbilidades: {
                imc: '28.5',
                tabaquismo: 'Activo',
                paquetesAno: '15',
                diabetes: 'no',
                hba1c: '',
                sindromeMetabolico: 'no',
                otras: ''
            },
            motivoClinico: 'HS Hurley III refractaria a múltiples líneas de antibióticos. Candidata a adalimumab.',
            principioActivo: 'Adalimumab'
        },
        'CIP-DEMO-FH-003': {
            nombre: 'Paciente Demo FH-003', cip: 'CIP-DEMO-FH-003', edad: '52', sexo: 'Mujer', servicio: 'Reumatología', servicioSlug: 'reumatologia',
            patologia: 'Artritis Reumatoide (AR)', farmaco: 'Adalimumab 40 mg', dosis: '40 mg', pauta: 'SC / cada 2 semanas', via: 'SC',
            estado: 'validated', estadoLabel: 'Validado', fechaSolicitud: '2026-03-15', ultimaSolicitud: '2026-03-15',
            analitica: 'Prebiológico demo apto. Vacunación VHB y antineumocócica completa.', scores: 'DAS28 demo: 3.2; HAQ demo: 1.1',
            ultimaVisita: '—', adherencia: 'Sin registro (primera visita pendiente)', efectosAdversos: 'No registrados', proms: 'HAQ 1.1 (basal); EVA dolor 4/10', primeraVisita: 'Pendiente', seguimiento: 'No iniciado'
        }
    };

    const profesionales = [
        { id: 'PRO-FH-01', nombre: 'Profesional FH-01', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Dermatología; Reumatología', estado: 'Activo' },
        { id: 'PRO-FH-02', nombre: 'Profesional FH-02', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Digestivo; Oncología', estado: 'Activo' },
        { id: 'PRO-FH-03', nombre: 'Profesional FH-03', rol: 'Residente Farmacia', especialidad: 'Rotación Farmacia Hospitalaria', estado: 'Activo' },
        { id: 'PRO-FH-04', nombre: 'Profesional FH-04', rol: 'Farmacéutico/a Hospitalario/a', especialidad: 'Hematología; soporte demo', estado: 'Activo' }
    ];

    const patologiaPorServicio = {
        dermatologia: ['Hidradenitis supurativa', 'Psoriasis', 'Dermatitis atópica', 'Vitíligo', 'Alopecia areata'],
        reumatologia: ['Artritis Reumatoide (AR)', 'Espondiloartritis (EspA)', 'Artritis Psoriásica (APs)', 'LES', 'Síndrome de Sjögren'],
        digestivo: ['Enfermedad de Crohn', 'Colitis ulcerosa', 'Otro'],
        oncologia: ['Indicación oncológica demo', 'Otro'],
        otro: ['Especificar en observaciones']
    };

    function getQueryContext() {
        const params = new URLSearchParams(window.location.search);
        const cip = (params.get('cip') || params.get('id') || '').trim();
        const patient = patients[cip] || null;
        return {
            cip,
            servicio: params.get('servicio') || patient?.servicio || '',
            servicioSlug: params.get('servicio') || patient?.servicioSlug || '',
            patologia: params.get('patologia') || patient?.patologia || '',
            entrada: params.get('entrada') || '',
            patient
        };
    }

    function makeContextUrl(base, context = {}) {
        const params = new URLSearchParams();
        if (context.cip) params.set('cip', context.cip);
        if (context.servicio) params.set('servicio', context.servicio);
        if (context.patologia) params.set('patologia', context.patologia);
        if (context.entrada) params.set('entrada', context.entrada);
        const query = params.toString();
        return query ? `${base}?${query}` : base;
    }

    function setText(id, value) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.textContent = value || '—';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null && value !== '') el.value = value;
    }

    function clearChildren(el) {
        while (el && el.firstChild) el.removeChild(el.firstChild);
    }

    function createField(label, value) {
        const field = document.createElement('div');
        field.className = 'info-field';
        const labelEl = document.createElement('span');
        labelEl.className = 'info-field__label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'info-field__value';
        valueEl.textContent = value || '—';
        field.append(labelEl, valueEl);
        return field;
    }

    function renderFields(container, fields) {
        clearChildren(container);
        fields.forEach(field => container.appendChild(createField(field.label, field.value)));
    }

    function appendIconText(parent, iconClass, text) {
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        icon.setAttribute('aria-hidden', 'true');
        parent.appendChild(icon);
        parent.appendChild(document.createTextNode(` ${text}`));
    }

    function populateSelect(select, options, placeholder) {
        clearChildren(select);
        const first = document.createElement('option');
        first.value = '';
        first.textContent = placeholder || 'Seleccionar...';
        select.appendChild(first);
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }

    const STATES = {
        PENDING: 'pending',
        VALIDATED: 'validated',
        FOLLOWUP: 'followup',
        DENIED: 'denied'
    };

    const DEMO_SESSION_NOTE = 'Demo — los datos se almacenan en memoria de sesión.';

    function statusClass(status) {
        if (status === STATES.VALIDATED) return 'status-badge status-badge--validated';
        if (status === STATES.FOLLOWUP) return 'status-badge status-badge--followup';
        if (status === STATES.DENIED) return 'status-badge status-badge--denied';
        return 'status-badge status-badge--pending';
    }

    function downloadFile(name, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function insertNoCipBanner(bannerId) {
        if (document.getElementById(bannerId)) return;
        var banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'no-cip-banner';
        var icon = document.createElement('i');
        icon.className = 'fas fa-info-circle';
        icon.setAttribute('aria-hidden', 'true');
        var msg = document.createElement('span');
        msg.textContent = ' Busca primero un paciente por CIP o accede desde el Quick View para precargar datos.';
        var link = document.createElement('a');
        link.href = 'farmacia_index.html';
        link.className = 'btn btn-secondary no-cip-banner__link';
        var linkIcon = document.createElement('i');
        linkIcon.className = 'fas fa-search';
        linkIcon.setAttribute('aria-hidden', 'true');
        link.appendChild(linkIcon);
        link.appendChild(document.createTextNode(' Ir al buscador de Farmacia'));
        banner.append(icon, msg, link);
        var firstCard = document.querySelector('section.dashboard-card');
        if (firstCard) firstCard.parentNode.insertBefore(banner, firstCard);
    }

    function initSidebarSearch() {
        const input = qs('#patientSearch');
        if (!input) return;
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            const cip = input.value.trim();
            if (cip) window.location.href = makeContextUrl('farmacia_index.html', { cip });
        });
        const clearBtn = qs('#clearPatientSearch');
        if (clearBtn) {
            input.addEventListener('input', () => clearBtn.classList.toggle('hidden', !input.value));
            clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.classList.add('hidden'); input.focus(); });
        }
    }

    function initContextSummary() {
        const context = getQueryContext();
        qsa('[data-context="cip"]').forEach(el => { el.textContent = context.cip || 'CIP no indicado'; });
        qsa('[data-context="servicio"]').forEach(el => { el.textContent = context.servicio || 'Servicio no indicado'; });
        qsa('[data-context="patologia"]').forEach(el => { el.textContent = context.patologia || 'Patología no indicada'; });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSidebarSearch();
        initContextSummary();
    });

    window.FarmaciaCatalog = (function () {
        var drugs = [];
        var loaded = false;
        var totalCount = 0;
        var cimaCount = 0;
        var localCount = 0;
        var selectedSnapshot = null;

        function isTruthyRobust(value) {
            if (value === true || value === 1 || value === '1') return true;
            if (value === false || value === 0 || value === '0') return false;
            if (value === null || value === undefined || value === '') return false;
            var s = String(value).trim().toUpperCase();
            return s === 'TRUE' || s === 'SI' || s === 'S\u00CD' || s === 'YES' || s === '1';
        }

        function buildSearchableText(drug) {
            return [
                drug.nombre_comercial || '',
                drug.principio_activo || '',
                drug.nombre_presentacion || '',
                drug.display_name || '',
                drug.codigo_nacional || ''
            ].join(' ').toLowerCase();
        }

        function normalizeCIMA(row) {
            var cn = row.codigo_nacional != null ? String(row.codigo_nacional) : '';
            var nr = row.nregistro != null ? String(row.nregistro) : '';
            var nc = row.nombre_comercial || '';
            var pa = row.principio_activo || '';
            var np = row.nombre_presentacion || '';
            return {
                nombre_comercial: nc,
                principio_activo: pa,
                nombre_presentacion: np,
                codigo_nacional: cn,
                nregistro: nr,
                dosis: row.dosis_presentacion || '',
                via: row.via || '',
                es_hospitalario: row.es_hospitalario_derivado || '',
                biosimilar: row.biosimilar || '',
                drug_id: row.drug_source_id != null ? String(row.drug_source_id) : '',
                source_type: 'CIMA',
                display_name: nc || np || '',
                forma_farmaceutica: row.forma_farmaceutica || '',
                _searchable: ''
            };
        }

        function normalizeLOCAL(row) {
            var dn = row.display_name || '';
            var ncs = row.nombre_comercial_si_existe || '';
            var pam = row.principio_activo_o_molecula || '';
            var pt = row.presentacion_texto || '';
            return {
                nombre_comercial: ncs || dn || '',
                principio_activo: pam,
                nombre_presentacion: pt,
                codigo_nacional: '',
                nregistro: '',
                dosis: row.dosis_texto || '',
                via: row.via || '',
                es_hospitalario: 'SI',
                biosimilar: '',
                drug_id: row.local_drug_id != null ? String(row.local_drug_id) : '',
                source_type: 'LOCAL',
                display_name: dn || '',
                forma_farmaceutica: row.forma_farmaceutica || '',
                tipo_situacion: row.tipo_situacion || '',
                activo_en_catalogo: row.activo_en_catalogo || '',
                _searchable: ''
            };
        }

        function loadFromExcel(arrayBuffer) {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS (XLSX) no est\u00E1 disponible. Cargue vendor/sheetjs/xlsx.full.min.js antes.');
            }
            var workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            var cimaSheet = workbook.Sheets['CATALOGO_CIMA'];
            var localSheet = workbook.Sheets['CATALOGO_LOCAL_ESPECIAL'];
            if (!cimaSheet || !localSheet) {
                throw new Error('El Excel no contiene las hojas esperadas: CATALOGO_CIMA y CATALOGO_LOCAL_ESPECIAL.');
            }
            var cimaData = XLSX.utils.sheet_to_json(cimaSheet, { defval: '' });
            var localData = XLSX.utils.sheet_to_json(localSheet, { defval: '' });
            var cimaNormalized = cimaData.map(normalizeCIMA);
            var localNormalized = localData.map(normalizeLOCAL);
            drugs = cimaNormalized.concat(localNormalized);
            for (var i = 0; i < drugs.length; i++) {
                drugs[i]._searchable = buildSearchableText(drugs[i]);
            }
            cimaCount = cimaNormalized.length;
            localCount = localNormalized.length;
            totalCount = drugs.length;
            loaded = true;
            selectedSnapshot = null;
            return { totalCount: totalCount, cimaCount: cimaCount, localCount: localCount, loaded: loaded };
        }

        function search(query) {
            if (!loaded || !query || String(query).trim().length < 2) return [];
            var q = String(query).trim().toLowerCase();
            var results = [];
            for (var i = 0; i < drugs.length; i++) {
                if (drugs[i]._searchable && drugs[i]._searchable.indexOf(q) !== -1) {
                    results.push(drugs[i]);
                    if (results.length >= 15) break;
                }
            }
            return results;
        }

        function selectDrug(drug) {
            selectedSnapshot = {
                nombre_snapshot: drug.nombre_comercial || drug.display_name || '',
                principio_activo_snapshot: drug.principio_activo || '',
                presentacion_snapshot: drug.nombre_presentacion || '',
                via_snapshot: drug.via || '',
                codigo_nacional_snapshot: drug.codigo_nacional || '',
                nregistro_snapshot: drug.nregistro || '',
                source_type: drug.source_type || '',
                selected_drug_id: drug.drug_id || '',
                etiquetas: {
                    es_hospitalario: isTruthyRobust(drug.es_hospitalario),
                    biosimilar: isTruthyRobust(drug.biosimilar)
                }
            };
            return selectedSnapshot;
        }

        function getSnapshot() {
            return selectedSnapshot;
        }

        function getStatusText() {
            if (!loaded) return 'Cat\u00E1logo no cargado';
            return totalCount + ' f\u00E1rmacos (CIMA: ' + cimaCount + ' + Locales: ' + localCount + ')';
        }

        function ensureXLSX(callback, onError) {
            if (typeof XLSX !== 'undefined') { callback(); return; }
            var script = document.createElement('script');
            script.src = 'vendor/sheetjs/xlsx.full.min.js';
            script.onload = callback;
            script.onerror = function () {
                if (typeof onError === 'function') onError('No se pudo cargar la librer\u00EDa SheetJS desde vendor/sheetjs/xlsx.full.min.js.');
            };
            document.head.appendChild(script);
        }

        function initSidebarCatalog() {
            var btnLoad = document.getElementById('sidebarLoadCatalog');
            if (!btnLoad) return;

            var fileInput = document.getElementById('sidebarFileCatalog');
            var statusEl = document.getElementById('catalogSidebarStatus');

            btnLoad.addEventListener('click', function () {
                if (loaded) {
                    if (statusEl) {
                        statusEl.textContent = getStatusText();
                        statusEl.className = 'catalog-status catalog-status--loaded';
                    }
                    document.dispatchEvent(new CustomEvent('farmacia:catalog-loaded', { detail: { totalCount: totalCount, cimaCount: cimaCount, localCount: localCount, loaded: loaded } }));
                    return;
                }
                ensureXLSX(function () {
                    if (statusEl) {
                        statusEl.textContent = 'Cargando...';
                        statusEl.className = 'catalog-status';
                    }
                    fetch('data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx')
                        .then(function (response) {
                            if (response.ok) return response.arrayBuffer();
                            throw new Error('fetch_failed');
                        })
                        .then(function (arrayBuffer) {
                            var result = loadFromExcel(arrayBuffer);
                            if (statusEl) {
                                statusEl.textContent = getStatusText();
                                statusEl.className = 'catalog-status catalog-status--loaded';
                            }
                            document.dispatchEvent(new CustomEvent('farmacia:catalog-loaded', { detail: result }));
                        })
                        .catch(function () {
                            if (statusEl) {
                                statusEl.textContent = 'Seleccione el archivo Excel manualmente';
                                statusEl.className = 'catalog-status catalog-status--manual';
                            }
                            if (fileInput) {
                                fileInput.classList.remove('hidden');
                                fileInput.click();
                            }
                        });
                }, function (errMsg) {
                    if (statusEl) {
                        statusEl.textContent = errMsg;
                        statusEl.className = 'catalog-status catalog-status--error';
                    }
                });
            });

            if (fileInput) {
                fileInput.addEventListener('change', function (event) {
                    var file = event.target.files[0];
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        try {
                            var result = loadFromExcel(e.target.result);
                            if (statusEl) {
                                statusEl.textContent = getStatusText();
                                statusEl.className = 'catalog-status catalog-status--loaded';
                            }
                            document.dispatchEvent(new CustomEvent('farmacia:catalog-loaded', { detail: result }));
                        } catch (err) {
                            window.alert('Error al procesar el Excel: ' + (err.message || err));
                        }
                    };
                    reader.onerror = function () {
                        window.alert('Error al leer el archivo.');
                    };
                    reader.readAsArrayBuffer(file);
                });
            }
        }

        document.addEventListener('DOMContentLoaded', function () {
            initSidebarCatalog();
        });

        return {
            get drugs() { return drugs; },
            get loaded() { return loaded; },
            get totalCount() { return totalCount; },
            get cimaCount() { return cimaCount; },
            get localCount() { return localCount; },
            get selectedSnapshot() { return selectedSnapshot; },
            loadFromExcel: loadFromExcel,
            search: search,
            selectDrug: selectDrug,
            getSnapshot: getSnapshot,
            getStatusText: getStatusText
        };
    })();

    window.FarmaciaDemo = {
        patients,
        profesionales,
        patologiaPorServicio,
        qs,
        qsa,
        getQueryContext,
        makeContextUrl,
        setText,
        setValue,
        clearChildren,
        createField,
        renderFields,
        appendIconText,
        populateSelect,
        statusClass,
        STATES,
        DEMO_SESSION_NOTE,
        downloadFile,
        insertNoCipBanner
    };
})();
