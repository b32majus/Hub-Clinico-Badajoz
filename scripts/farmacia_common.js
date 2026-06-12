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
                serologiasVhb: 'Negativo',
                serologiasVhc: 'Negativo',
                serologiasVih: 'Negativo',
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
        },
        'CIP-DEMO-FH-004': {
            nombre: 'Paciente Demo FH-004', cip: 'CIP-DEMO-FH-004', edad: '44', sexo: 'Mujer', servicio: 'Reumatología', servicioSlug: 'reumatologia',
            patologia: 'LES / Síndrome de Sjögren', farmaco: 'Belimumab + Rituximab (demo multibiológico)', dosis: 'Belimumab 200 mg SC semanal + Rituximab 1 g IV semestral', pauta: 'L2 semanal + L3 semestral', via: 'SC / IV',
            estado: 'followup', estadoLabel: 'En seguimiento', fechaSolicitud: '2026-02-14', ultimaSolicitud: '2026-05-28',
            analitica: 'Seguimiento analítico activo. Caso sintético multibiológico para validación exploratoria.', scores: 'SLEDAI demo: 12 → 6; EVA dolor 6 → 3',
            ultimaVisita: '2026-06-09', adherencia: 'Alta (Morisky-Green: 4/4)', efectosAdversos: 'Infección respiratoria leve-moderada en evaluación causal', proms: 'HAQ 0.9; EVA dolor 3/10', primeraVisita: '2026-02-20', seguimiento: 'Seguimiento multibiológico abierto',
            principioActivo: 'Belimumab + Rituximab',
            biologicos: [
                {
                    linea_id: 'BIO-FH-004-L1',
                    orden: 1,
                    nombre_linea: 'Abatacept',
                    nombre_comercial: 'Orencia',
                    principio_activo: 'Abatacept',
                    dosis: '125 mg',
                    via: 'SC',
                    pauta: 'Semanal',
                    fecha_inicio: '2025-09-01',
                    fecha_fin: '2026-02-10',
                    estado_linea: 'historico',
                    tipo_relacion: 'cambio_terapeutico',
                    es_principal: false,
                    tratamiento_id_principal: 'TRAT-FH-004-A'
                },
                {
                    linea_id: 'BIO-FH-004-L2',
                    orden: 2,
                    nombre_linea: 'Belimumab',
                    nombre_comercial: 'Benlysta',
                    principio_activo: 'Belimumab',
                    dosis: '200 mg',
                    via: 'SC',
                    pauta: 'Semanal',
                    fecha_inicio: '2026-02-20',
                    fecha_fin: '',
                    estado_linea: 'activo',
                    tipo_relacion: 'base',
                    es_principal: true,
                    tratamiento_id_principal: 'TRAT-FH-004-B'
                },
                {
                    linea_id: 'BIO-FH-004-L3',
                    orden: 3,
                    nombre_linea: 'Rituximab',
                    nombre_comercial: 'Rixathon',
                    principio_activo: 'Rituximab',
                    dosis: '1 g',
                    via: 'IV',
                    pauta: 'Dias 1 y 15 cada 6 meses',
                    fecha_inicio: '2026-05-28',
                    fecha_fin: '',
                    estado_linea: 'añadido',
                    tipo_relacion: 'tratamiento_añadido',
                    es_principal: false,
                    tratamiento_id_principal: 'TRAT-FH-004-C'
                }
            ]
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


    const IMPORT_STORAGE_KEYS = {
        enfermeria: 'farmaciaDemo.enfermeriaImport',
        farmacia: 'farmaciaDemo.farmaciaImport'
    };

    const IMPORT_FIELD_ALIASES = {
        cip: ['cip', 'codigo paciente', 'codigo_paciente', 'id paciente', 'id_paciente', 'paciente id', 'patient id', 'patient_id'],
        nombre: ['nombre', 'nombre paciente', 'paciente', 'patient', 'apellidos y nombre'],
        servicio: ['servicio', 'unidad', 'especialidad', 'servicio origen', 'origen'],
        patologia: ['patologia', 'patología', 'diagnostico', 'diagnóstico', 'indicacion', 'indicación', 'proceso'],
        farmaco: ['farmaco', 'fármaco', 'medicamento', 'tratamiento', 'biologico', 'biológico', 'nombre comercial'],
        principioActivo: ['principio activo', 'principio_activo', 'molecula', 'molécula', 'pa'],
        dosis: ['dosis', 'dose'],
        via: ['via', 'vía', 'route'],
        pauta: ['pauta', 'intervalo', 'frecuencia', 'posologia', 'posología'],
        fecha: ['fecha', 'fecha visita', 'fecha_visita', 'fecha solicitud', 'fecha_solicitud', 'fecha seguimiento', 'fecha_seguimiento']
    };

    function safeGetLocalStorage(key) {
        try { return window.localStorage.getItem(key); } catch (err) { return null; }
    }

    function safeSetLocalStorage(key, value) {
        try { window.localStorage.setItem(key, value); return true; } catch (err) { return false; }
    }

    function safeParseJson(raw) {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (err) { return null; }
    }

    function normalizeHeaderToken(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function slugifyService(value) {
        var token = normalizeHeaderToken(value);
        if (!token) return '';
        if (token.indexOf('dermat') !== -1) return 'dermatologia';
        if (token.indexOf('reumat') !== -1) return 'reumatologia';
        if (token.indexOf('digest') !== -1) return 'digestivo';
        if (token.indexOf('onco') !== -1 || token.indexOf('hemato') !== -1) return 'oncologia';
        return token.replace(/\s+/g, '_');
    }

    function inferFieldMapping(headers) {
        var mapping = {};
        var matchedHeaders = {};
        var headerList = Array.isArray(headers) ? headers.slice() : [];

        Object.keys(IMPORT_FIELD_ALIASES).forEach(function (field) {
            var aliases = IMPORT_FIELD_ALIASES[field];
            var matchedHeader = '';
            for (var i = 0; i < headerList.length; i++) {
                var header = headerList[i];
                var normalized = normalizeHeaderToken(header);
                for (var j = 0; j < aliases.length; j++) {
                    var alias = normalizeHeaderToken(aliases[j]);
                    if (normalized === alias || normalized.indexOf(alias) !== -1 || alias.indexOf(normalized) !== -1) {
                        matchedHeader = header;
                        break;
                    }
                }
                if (matchedHeader) break;
            }
            mapping[field] = matchedHeader;
            if (matchedHeader) matchedHeaders[matchedHeader] = true;
        });

        return {
            mapping: mapping,
            unrecognizedHeaders: headerList.filter(function (header) { return !matchedHeaders[header]; })
        };
    }

    function buildImportedPatientCandidate(row, mapping, sourceLabel, rowIndex) {
        if (!row || !mapping || !mapping.cip) return null;
        var cip = String(row[mapping.cip] || '').trim();
        if (!cip) return null;
        var servicioRaw = mapping.servicio ? String(row[mapping.servicio] || '').trim() : '';
        var servicioSlug = slugifyService(servicioRaw);
        return {
            nombre: mapping.nombre ? String(row[mapping.nombre] || '').trim() || ('Paciente importado ' + cip) : ('Paciente importado ' + cip),
            cip: cip,
            edad: '',
            sexo: '',
            servicio: servicioRaw || sourceLabel,
            servicioSlug: servicioSlug,
            patologia: mapping.patologia ? String(row[mapping.patologia] || '').trim() : '',
            farmaco: mapping.farmaco ? String(row[mapping.farmaco] || '').trim() : '',
            dosis: mapping.dosis ? String(row[mapping.dosis] || '').trim() : '',
            pauta: mapping.pauta ? String(row[mapping.pauta] || '').trim() : '',
            via: mapping.via ? String(row[mapping.via] || '').trim() : '',
            estado: 'pending',
            estadoLabel: 'Pendiente',
            fechaSolicitud: mapping.fecha ? String(row[mapping.fecha] || '').trim() : '',
            ultimaSolicitud: mapping.fecha ? String(row[mapping.fecha] || '').trim() : '',
            analitica: 'Datos importados desde Excel ' + sourceLabel + '. Pendiente de mapeo clínico detallado.',
            scores: 'Pendiente de mapeo desde Excel importado.',
            ultimaVisita: '—',
            adherencia: 'Sin registro',
            efectosAdversos: 'Sin registro',
            proms: 'Sin registro',
            primeraVisita: '',
            seguimiento: 'Pendiente de revisión',
            motivoClinico: mapping.patologia ? String(row[mapping.patologia] || '').trim() : '',
            principioActivo: mapping.principioActivo ? String(row[mapping.principioActivo] || '').trim() : '',
            importSource: sourceLabel === 'Enfermería' ? 'Excel Enfermería' : (sourceLabel === 'Farmacia' ? 'Excel Farmacia' : sourceLabel),
            importRowIndex: rowIndex
        };
    }

    function readImportedDataset(kind) {
        return safeParseJson(safeGetLocalStorage(IMPORT_STORAGE_KEYS[kind]));
    }

    function getImportedPatientByCip(cip) {
        if (!cip) return null;
        var normalizedTarget = String(cip).trim().toUpperCase();
        var kinds = Object.keys(IMPORT_STORAGE_KEYS);
        for (var i = 0; i < kinds.length; i++) {
            var dataset = readImportedDataset(kinds[i]);
            if (!dataset || !Array.isArray(dataset.rows)) continue;
            for (var j = 0; j < dataset.rows.length; j++) {
                var candidate = buildImportedPatientCandidate(dataset.rows[j], dataset.mappedFields || {}, dataset.sourceLabel || kinds[i], j);
                if (candidate && String(candidate.cip).trim().toUpperCase() === normalizedTarget) return candidate;
            }
        }
        return null;
    }


    function patientSourcePriority(patient) {
        var source = String((patient && patient.importSource) || 'demo').toLowerCase();
        if (source.indexOf('farmacia') !== -1) return 3;
        if (source.indexOf('enfermer') !== -1) return 2;
        return 1;
    }

    function isBlankValue(value) {
        return value === null || value === undefined || String(value).trim() === '' || String(value).trim() == '—';
    }

    function mergePatientRecord(basePatient, overlayPatient) {
        var merged = Object.assign({}, basePatient || {});
        Object.keys(overlayPatient || {}).forEach(function (key) {
            var overlayValue = overlayPatient[key];
            if (!isBlankValue(overlayValue)) {
                merged[key] = overlayValue;
            } else if (!(key in merged)) {
                merged[key] = overlayValue;
            }
        });
        if (!merged.importSource) merged.importSource = 'demo';
        if (!merged.estado) merged.estado = 'pending';
        if (!merged.estadoLabel) {
            merged.estadoLabel = merged.estado === 'pending' ? 'Pendiente' : (merged.estado === 'validated' ? 'Validado' : (merged.estado === 'followup' ? 'En seguimiento' : 'Pendiente'));
        }
        return merged;
    }

    function getAvailablePatients() {
        var mergedByCip = {};
        var ordered = [];

        Object.keys(patients).forEach(function (cip) {
            var base = mergePatientRecord({}, Object.assign({ importSource: 'demo' }, patients[cip]));
            mergedByCip[cip] = base;
            ordered.push(base);
        });

        var importedPatients = [];
        if (window.FarmaciaDataImports && window.FarmaciaDataImports.getImportedPatients) {
            importedPatients = window.FarmaciaDataImports.getImportedPatients();
        }

        importedPatients.forEach(function (patient) {
            if (!patient || !patient.cip) return;
            var cip = String(patient.cip).trim();
            var normalized = mergePatientRecord({}, patient);
            var existing = mergedByCip[cip];
            if (!existing) {
                mergedByCip[cip] = normalized;
                ordered.push(normalized);
                return;
            }
            if (patientSourcePriority(normalized) >= patientSourcePriority(existing)) {
                mergedByCip[cip] = mergePatientRecord(existing, normalized);
            } else {
                mergedByCip[cip] = mergePatientRecord(normalized, existing);
            }
        });

        return ordered.map(function (patient) {
            return mergedByCip[String(patient.cip).trim()] || patient;
        }).filter(function (patient, index, list) {
            return patient && patient.cip && list.findIndex(function (candidate) {
                return candidate && String(candidate.cip).trim() === String(patient.cip).trim();
            }) === index;
        });
    }

    function isPendingValidationPatient(patient) {
        if (!patient) return false;
        var estado = String(patient.estado || '').trim().toLowerCase();
        var estadoLabel = String(patient.estadoLabel || '').trim().toLowerCase();
        var validacion = String(patient.estado_validacion_farmacia || '').trim().toLowerCase();
        if (estado === 'pending') return true;
        if (estadoLabel.indexOf('pend') !== -1) return true;
        if (validacion === 'pendiente') return true;
        return false;
    }

    function getPendingValidationPatients() {
        return getAvailablePatients().filter(isPendingValidationPatient);
    }

    function getQueryContext() {
        const params = new URLSearchParams(window.location.search);
        const cip = (params.get('cip') || params.get('id') || '').trim();
        let patient = null;
        if (cip) {
            const availablePatients = getAvailablePatients();
            const target = String(cip).trim().toUpperCase();
            for (let i = 0; i < availablePatients.length; i += 1) {
                const candidate = availablePatients[i];
                if (String((candidate && candidate.cip) || '').trim().toUpperCase() === target) {
                    patient = candidate;
                    break;
                }
            }
        }
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
        var loading = false;
        var totalCount = 0;
        var cimaCount = 0;
        var localCount = 0;
        var selectedSnapshot = null;
        var FARMACIA_DRUG_SNAPSHOT_KEY = 'farmacia_drug_snapshot';
        var CATALOG_XLSX_PATH = 'data/catalogos/farmacia/hub_catalogo_farmacologico_dual_HOSPITALARIO_2hojas_20260606.xlsx';
        var catalogStatus = { state: 'idle', message: 'Catálogo farmacológico: pendiente de carga automática' };

        function updateCatalogStatusUi() {
            var statusNodes = document.querySelectorAll('[data-catalog-status]');
            statusNodes.forEach(function (node) {
                node.textContent = catalogStatus.message;
                node.className = 'catalog-sidebar-status';
                if (catalogStatus.state === 'loaded') {
                    node.classList.add('catalog-status--loaded');
                } else if (catalogStatus.state === 'missing') {
                    node.classList.add('catalog-status--manual');
                } else if (catalogStatus.state === 'error') {
                    node.classList.add('catalog-status--error');
                }
            });
        }

        function setCatalogStatus(state, message) {
            catalogStatus = { state: state, message: message };
            updateCatalogStatusUi();
        }

        function isTruthyRobust(value) {
            if (value === true || value === 1 || value === '1') return true;
            if (value === false || value === 0 || value === '0') return false;
            if (value === null || value === undefined || value === '') return false;
            var s = String(value).trim().toUpperCase();
            return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1';
        }

        function buildSearchableText(drug) {
            return [
                drug.nombre_comercial || '',
                drug.principio_activo || '',
                drug.nombre_presentacion || '',
                drug.display_name || '',
                drug.codigo_nacional || '',
                drug.nregistro || '',
                drug.drug_id || ''
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
                throw new Error('SheetJS (XLSX) no está disponible. Cargue vendor/sheetjs/xlsx.full.min.js antes.');
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
                drug_id: drug.drug_id || '',
                selected_drug_id: drug.drug_id || '',
                source_type: drug.source_type || '',
                nombre_snapshot: drug.nombre_comercial || drug.display_name || '',
                principio_activo_snapshot: drug.principio_activo || '',
                presentacion_snapshot: drug.nombre_presentacion || '',
                via_snapshot: drug.via || '',
                codigo_nacional_snapshot: drug.codigo_nacional || '',
                nregistro_snapshot: drug.nregistro || '',
                nombre_comercial: drug.nombre_comercial || '',
                dosis_presentacion: drug.dosis || '',
                etiquetas: {
                    es_hospitalario: isTruthyRobust(drug.es_hospitalario),
                    biosimilar: isTruthyRobust(drug.biosimilar)
                },
                selected_at: new Date().toISOString()
            };
            try {
                sessionStorage.setItem(FARMACIA_DRUG_SNAPSHOT_KEY, JSON.stringify(selectedSnapshot));
            } catch (e) { /* sessionStorage unavailable */ }
            return selectedSnapshot;
        }

        function getSnapshot() {
            if (selectedSnapshot) return selectedSnapshot;
            try {
                var raw = sessionStorage.getItem(FARMACIA_DRUG_SNAPSHOT_KEY);
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                        selectedSnapshot = parsed;
                        return selectedSnapshot;
                    }
                }
            } catch (e) { /* sessionStorage unavailable or parse error */ }
            return null;
        }

        function clearSnapshot() {
            selectedSnapshot = null;
            try {
                sessionStorage.removeItem(FARMACIA_DRUG_SNAPSHOT_KEY);
            } catch (e) { /* sessionStorage unavailable */ }
        }

        function getStatusText() {
            if (!loaded) return 'Catálogo no cargado';
            return totalCount + ' fármacos (CIMA: ' + cimaCount + ' + Locales: ' + localCount + ')';
        }

        function ensureXLSX(callback, onError) {
            if (typeof XLSX !== 'undefined') { callback(); return; }
            var script = document.createElement('script');
            script.src = 'vendor/sheetjs/xlsx.full.min.js';
            script.onload = callback;
            script.onerror = function () {
                if (typeof onError === 'function') onError('No se pudo cargar la librería SheetJS desde vendor/sheetjs/xlsx.full.min.js.');
            };
            document.head.appendChild(script);
        }

        function autoLoad() {
            if (loaded || loading) return;
            loading = true;
            setCatalogStatus('loading', 'Catálogo farmacológico: cargando automáticamente...');
            ensureXLSX(function () {
                fetch(CATALOG_XLSX_PATH)
                    .then(function (response) {
                        if (response.ok) return response.arrayBuffer();
                        throw new Error('fetch_failed');
                    })
                    .then(function (arrayBuffer) {
                        var result = loadFromExcel(arrayBuffer);
                        setCatalogStatus('loaded', 'Catálogo CIMA cargado: ' + getStatusText());
                        loading = false;
                        document.dispatchEvent(new CustomEvent('farmacia:catalog-loaded', { detail: result }));
                    })
                    .catch(function (error) {
                        loading = false;
                        setCatalogStatus('missing', 'Catálogo farmacológico: no disponible en esta demo. CIMA pendiente de integración automática real.');
                        document.dispatchEvent(new CustomEvent('farmacia:catalog-missing', { detail: { error: error ? error.message || String(error) : 'missing' } }));
                    });
            }, function (errMsg) {
                loading = false;
                setCatalogStatus('error', errMsg);
            });
        }

        function initSidebarCatalog() {
            autoLoad();
            var btnLoad = document.getElementById('sidebarLoadCatalog');
            if (btnLoad) btnLoad.classList.add('hidden');
            var fileInput = document.getElementById('sidebarFileCatalog');
            if (fileInput) fileInput.classList.add('hidden');
            updateCatalogStatusUi();
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
            clearSnapshot: clearSnapshot,
            getStatusText: getStatusText,
            autoLoad: autoLoad,
            getStatus: function () { return Object.assign({}, catalogStatus); },
            ensureXLSX: ensureXLSX
        };
    })();

    window.FarmaciaDataImports = (function () {
        var importStates = {
            enfermeria: readImportedDataset('enfermeria'),
            farmacia: readImportedDataset('farmacia')
        };

        function emitImportEvent(kind, detail) {
            document.dispatchEvent(new CustomEvent('farmacia:data-imported', {
                detail: Object.assign({ kind: kind }, detail || {})
            }));
        }

        function getKindLabel(kind) {
            return kind === 'enfermeria' ? 'Enfermería' : 'Farmacia';
        }

        function formatImportStatus(kind) {
            var state = importStates[kind];
            if (!state || !Array.isArray(state.rows) || !state.rows.length) {
                return 'No se ha cargado Excel de ' + getKindLabel(kind);
            }
            return 'Excel de ' + getKindLabel(kind) + ' cargado: ' + state.rows.length + ' registros';
        }

        function summarizeMappedFields(mappedFields) {
            var fields = [];
            Object.keys(mappedFields || {}).forEach(function (key) {
                if (mappedFields[key]) fields.push(mappedFields[key]);
            });
            return fields.length ? fields.join(' · ') : 'Sin columnas reconocidas';
        }

        function updateImportUi(kind) {
            var statusEl = document.getElementById(kind === 'enfermeria' ? 'estadoCargaEnfermeria' : 'estadoCargaFarmacia');
            var detailsEl = document.getElementById(kind === 'enfermeria' ? 'detalleCargaEnfermeria' : 'detalleCargaFarmacia');
            var state = importStates[kind];
            if (statusEl) statusEl.textContent = formatImportStatus(kind);
            if (!detailsEl) return;
            if (!state || !Array.isArray(state.rows) || !state.rows.length) {
                detailsEl.textContent = 'Sin importación local almacenada.';
                return;
            }
            var parts = [
                'Hoja: ' + (state.sheetName || 'Primera hoja'),
                'Columnas detectadas: ' + summarizeMappedFields(state.mappedFields || {})
            ];
            if (Array.isArray(state.unrecognizedHeaders) && state.unrecognizedHeaders.length) {
                parts.push('Columnas no reconocidas: ' + state.unrecognizedHeaders.join(', '));
            }
            detailsEl.textContent = parts.join(' | ');
        }

        function updateAllImportUi() {
            updateImportUi('enfermeria');
            updateImportUi('farmacia');
        }

        function parseWorkbook(kind, workbook, fileName) {
            var firstSheetName = workbook.SheetNames[0];
            var sheet = workbook.Sheets[firstSheetName];
            var rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            var headers = rows.length ? Object.keys(rows[0]) : [];
            var inferred = inferFieldMapping(headers);
            var state = {
                kind: kind,
                sourceLabel: getKindLabel(kind),
                fileName: fileName || '',
                importedAt: new Date().toISOString(),
                sheetName: firstSheetName || '',
                rowCount: rows.length,
                headers: headers,
                mappedFields: inferred.mapping,
                unrecognizedHeaders: inferred.unrecognizedHeaders,
                rows: rows
            };
            importStates[kind] = state;
            if (!safeSetLocalStorage(IMPORT_STORAGE_KEYS[kind], JSON.stringify(state))) {
                state.storage = 'memory_only';
            }
            updateAllImportUi();
            emitImportEvent(kind, { state: state });
            return state;
        }

        function importFile(kind, file) {
            return new Promise(function (resolve, reject) {
                if (!file) {
                    reject(new Error('No se ha seleccionado archivo.'));
                    return;
                }
                var catalog = window.FarmaciaCatalog;
                catalog.ensureXLSX(function () {
                    var reader = new FileReader();
                    reader.onload = function (event) {
                        try {
                            var workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                            resolve(parseWorkbook(kind, workbook, file.name));
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = function () {
                        reject(new Error('Error al leer el archivo.'));
                    };
                    reader.readAsArrayBuffer(file);
                }, function (errMsg) {
                    reject(new Error(errMsg));
                });
            });
        }

        function initImportPanel() {
            var wiring = [
                { kind: 'enfermeria', buttonId: 'btnCargarExcelEnfermeria', inputId: 'inputExcelEnfermeria' },
                { kind: 'farmacia', buttonId: 'btnCargarExcelFarmacia', inputId: 'inputExcelFarmacia' }
            ];
            wiring.forEach(function (item) {
                var button = document.getElementById(item.buttonId);
                var input = document.getElementById(item.inputId);
                if (!button || !input) return;
                button.addEventListener('click', function () {
                    input.click();
                });
                input.addEventListener('change', function (event) {
                    var file = event.target.files && event.target.files[0];
                    if (!file) return;
                    importFile(item.kind, file)
                        .then(function () {
                            input.value = '';
                        })
                        .catch(function (err) {
                            var statusEl = document.getElementById(item.kind === 'enfermeria' ? 'estadoCargaEnfermeria' : 'estadoCargaFarmacia');
                            if (statusEl) statusEl.textContent = 'Error al cargar Excel de ' + getKindLabel(item.kind) + ': ' + (err.message || err);
                            input.value = '';
                        });
                });
            });
            updateAllImportUi();
        }

        function getImportedPatients() {
            var items = [];
            Object.keys(importStates).forEach(function (kind) {
                var state = importStates[kind];
                if (!state || !Array.isArray(state.rows)) return;
                state.rows.forEach(function (row, index) {
                    var candidate = buildImportedPatientCandidate(row, state.mappedFields || {}, state.sourceLabel || getKindLabel(kind), index);
                    if (candidate) items.push(candidate);
                });
            });
            return items;
        }

        function findImportedPatientByCip(cip) {
            var patients = getImportedPatients();
            var target = String(cip || '').trim().toUpperCase();
            for (var i = 0; i < patients.length; i++) {
                if (String(patients[i].cip || '').trim().toUpperCase() === target) return patients[i];
            }
            return null;
        }

        document.addEventListener('DOMContentLoaded', function () {
            initImportPanel();
        });

        return {
            getState: function (kind) { return importStates[kind] || null; },
            getImportedPatients: getImportedPatients,
            findImportedPatientByCip: findImportedPatientByCip,
            importFile: importFile,
            formatImportStatus: formatImportStatus
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
        insertNoCipBanner,
        getAvailablePatients,
        getPendingValidationPatients,
        findPatientByCip: function (cip) {
            var available = getAvailablePatients();
            var target = String(cip || '').trim().toUpperCase();
            for (var i = 0; i < available.length; i++) {
                if (String(available[i].cip || '').trim().toUpperCase() === target) return available[i];
            }
            return null;
        }
    };
})();
