(function () {
    'use strict';

    const PATIENT_ID_REGEX = /^(ESP|APS|AR)-\d{4}-\d{3}$/i;
    const searchIndex = [];

    function normalize(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    function getElements() {
        return {
            input: document.getElementById('dashboardSearchInput'),
            button: document.getElementById('dashboardSearchButton'),
            error: document.getElementById('searchErrorMsg'),
            datalist: document.getElementById('patientIds')
        };
    }

    function showError(message, elements) {
        if (elements.error) {
            elements.error.textContent = message;
            elements.error.classList.add('visible');
        }
    }

    function clearError(elements) {
        if (elements.error) {
            elements.error.textContent = '';
            elements.error.classList.remove('visible');
        }
    }

    function addPatientToIndex(candidate) {
        const normalizedId = normalize(candidate.id);
        if (!normalizedId) {
            return;
        }
        if (searchIndex.some(entry => normalize(entry.id) === normalizedId)) {
            return;
        }
        searchIndex.push({
            id: candidate.id,
            nombre: candidate.nombre || 'Paciente sin nombre',
            patologia: (candidate.patologia || candidate.diagnostico || '').toLowerCase() || null
        });
    }

    function hydrateIndexFromHubTools() {
        try {
            if (typeof HubTools.data.getAllPatients === 'function' && HubTools.data.getAllPatients().length) {
                const patients = HubTools.data.getAllPatients();
                patients.forEach(p => {
                    const id = p.ID_Paciente || p.idPaciente || p.ID || p.id;
                    const nombre = p.Nombre_Paciente || p.nombrePaciente || p.Nombre || p.nombre;
                    const diagnostico = p.Diagnostico_Principal || p.diagnosticoPrimario || p.Diagnostico || p.pathology;
                    if (id && nombre) {
                        addPatientToIndex({ id, nombre, patologia: diagnostico });
                    }
                });
            }
        } catch (error) {
            console.warn('dashboard_search: no se pudo hidratar índice desde HubTools', error);
        }
    }

    function hydrateIndexFromMocks() {
        if (typeof window.MockPatients.list === 'function') {
            const mockSummaries = window.MockPatients.list();
            mockSummaries.forEach(summary => {
                addPatientToIndex({
                    id: summary.idPaciente,
                    nombre: summary.nombre,
                    patologia: summary.pathology || summary.diagnosticoPrimario
                });
            });
        }
    }

    function populateDatalist(datalist) {
        if (!datalist) return;
        datalist.innerHTML = '';
        searchIndex
            .slice()
            .sort((a, b) => a.id.localeCompare(b.id))
            .forEach(entry => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.label = `${entry.id} · ${entry.nombre}`;
                datalist.appendChild(option);
            });
    }

    function resolvePatient(term) {
        const normalizedTerm = normalize(term);
        if (!normalizedTerm) {
            return { error: 'Introduce un identificador o nombre de paciente.' };
        }

        const exactMatch = searchIndex.find(entry => normalize(entry.id) === normalizedTerm);
        if (exactMatch) {
            return { patient: exactMatch };
        }

        const matchingByName = searchIndex.filter(entry => normalize(entry.nombre).includes(normalizedTerm));
        if (matchingByName.length === 1) {
            return { patient: matchingByName[0] };
        }

        if (matchingByName.length > 1) {
            const options = matchingByName.slice(0, 3).map(p => `${p.id} · ${p.nombre}`).join(', ');
            return {
                error: `Se encontraron ${matchingByName.length} pacientes. Especifica el ID. Ejemplos: ${options}`
            };
        }

        if (PATIENT_ID_REGEX.test(term)) {
            return { error: `No se encontró el paciente ${term}. Verifica el ID.` };
        }

        return { error: 'No hay coincidencias. Usa el formato ESP/APS/AR-AAAA-### o el nombre completo.' };
    }

    function navigateToDashboard(patient) {
        const params = new URLSearchParams({ id: patient.id });
        if (patient.patologia) {
            params.set('patologia', patient.patologia);
        }
        window.location.href = `dashboard_paciente.html${params.toString()}`;
    }

    function handleSearch() {
        const { input, error } = getElements();
        if (!input) return;

        const rawValue = (input.value || '').trim();
        clearError({ error });

        if (!rawValue) {
            showError('Introduce un ID o nombre de paciente.', { error });
            input.focus();
            return;
        }

        const { patient, error: resolutionError } = resolvePatient(rawValue);
        if (patient) {
            navigateToDashboard(patient);
            return;
        }

        showError(resolutionError || 'No se pudo resolver el paciente solicitado.', { error });
        input.focus();
        input.select();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const { input, button, error, datalist } = getElements();
        if (!input || !button) {
            console.error('dashboard_search: elementos del formulario no encontrados.');
            return;
        }

        hydrateIndexFromHubTools();
        hydrateIndexFromMocks();
        populateDatalist(datalist);

        button.addEventListener('click', handleSearch);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
            }
        });

        clearError({ error });
        input.focus();
    });
})();



