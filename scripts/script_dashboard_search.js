(function () {
    'use strict';

    const PATIENT_ID_REGEX = /^(ESP|APS|AR)-\d{4}-\d{3}$/i;

    // Frozen observable copies (PART 5). Pending text lives only in #searchStatusMsg;
    // every outcome message keeps using #searchErrorMsg with its `visible` class.
    const PENDING_LISTING = 'Cargando pacientes…';
    const PENDING_SUBMIT = 'Buscando paciente…';
    const FAIL_CLOSED_UNAVAILABLE = 'No hay datos cargados. Carga el Excel para consultar pacientes.';
    const FAIL_CLOSED_ERROR = 'No se pudo consultar los pacientes. Inténtalo de nuevo.';
    const EMPTY_TERM = 'Introduce un ID o nombre de paciente.';
    const NO_MATCH = 'No hay coincidencias. Usa el formato ESP/APS/AR-AAAA-### o el nombre completo.';

    // Monotonically increasing guards. The submit token is bumped on every submit and
    // on every edit, so a superseded or late response renders nothing and never navigates.
    let listingToken = 0;
    let submitToken = 0;

    function getElements() {
        return {
            input: document.getElementById('dashboardSearchInput'),
            button: document.getElementById('dashboardSearchButton'),
            error: document.getElementById('searchErrorMsg'),
            status: document.getElementById('searchStatusMsg'),
            datalist: document.getElementById('patientIds')
        };
    }

    function getPort() {
        if (typeof window.ReumaPatientReadPort?.getPort === 'function') {
            return window.ReumaPatientReadPort.getPort();
        }
        return null;
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

    function setStatus(message, elements) {
        if (elements.status) {
            elements.status.textContent = message || '';
        }
    }

    function setBusy(busy, elements) {
        if (elements.button) {
            elements.button.disabled = busy;
        }
    }

    function foldId(value) {
        return (value || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    function renderDatalist(patients, datalist) {
        if (!datalist) return;
        const seen = new Set();
        const unique = [];
        patients.forEach(entry => {
            const key = foldId(entry && entry.id);
            if (!key || seen.has(key)) return;
            seen.add(key);
            unique.push(entry);
        });
        datalist.innerHTML = '';
        unique
            .slice()
            .sort((a, b) => a.id.localeCompare(b.id))
            .forEach(entry => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.label = `${entry.id} · ${entry.nombre}`;
                datalist.appendChild(option);
            });
    }

    async function hydrateDatalist(elements) {
        const token = ++listingToken;
        setStatus(PENDING_LISTING, elements);
        setBusy(true, elements);

        const port = getPort();
        let patients = [];
        if (port) {
            try {
                const result = await port.listPatients();
                if (result && result.status === 'ok' && Array.isArray(result.patients)) {
                    patients = result.patients;
                }
            } catch (error) {
                patients = [];
            }
        }

        if (token !== listingToken) return;
        renderDatalist(patients, elements.datalist);
        setStatus('', elements);
        setBusy(false, elements);
    }

    function resolveNotFoundCopy(term, reason) {
        if (reason === 'id_not_found' || (reason !== 'no_match' && PATIENT_ID_REGEX.test(term))) {
            return `No se encontró el paciente ${term}. Verifica el ID.`;
        }
        return NO_MATCH;
    }

    function resolveAmbiguousCopy(total, candidates) {
        const list = Array.isArray(candidates) ? candidates : [];
        const options = list.slice(0, 3).map(patient => `${patient.id} · ${patient.nombre}`).join(', ');
        // The port's `total` is the true match count; candidates stay capped at 3 examples.
        const count = Number.isFinite(total) ? total : list.length;
        return `Se encontraron ${count} pacientes. Especifica el ID. Ejemplos: ${options}`;
    }

    function navigateToDashboard(patient) {
        const params = new URLSearchParams({ id: patient.id });
        if (patient.patologia) {
            params.set('patologia', patient.patologia);
        }
        window.location.href = `dashboard_paciente.html?${params.toString()}`;
    }

    function focusAndSelect(input) {
        input.focus();
        input.select();
    }

    async function handleSearch() {
        const elements = getElements();
        const { input } = elements;
        if (!input) return;

        const rawValue = (input.value || '').trim();
        clearError(elements);

        if (!rawValue) {
            showError(EMPTY_TERM, elements);
            input.focus();
            return;
        }

        const token = ++submitToken;
        setStatus(PENDING_SUBMIT, elements);
        setBusy(true, elements);

        const port = getPort();
        let result;
        if (!port) {
            result = { status: 'unavailable' };
        } else {
            try {
                result = await port.resolvePatient(rawValue);
            } catch (error) {
                result = { status: 'error' };
            }
        }

        if (token !== submitToken) return;

        setStatus('', elements);
        setBusy(false, elements);

        const status = result && result.status;

        if (status === 'ok' && result.patient) {
            navigateToDashboard(result.patient);
            return;
        }

        if (status === 'ambiguous') {
            showError(resolveAmbiguousCopy(result.total, result.candidates), elements);
            focusAndSelect(input);
            return;
        }

        if (status === 'not_found') {
            showError(resolveNotFoundCopy(rawValue, result.reason), elements);
            focusAndSelect(input);
            return;
        }

        if (status === 'error' && result.error_code === 'empty_term') {
            showError(EMPTY_TERM, elements);
            input.focus();
            return;
        }

        showError(status === 'error' ? FAIL_CLOSED_ERROR : FAIL_CLOSED_UNAVAILABLE, elements);
        focusAndSelect(input);
    }

    function invalidatePending(elements) {
        // Any edit supersedes an in-flight resolution.
        submitToken += 1;
        clearError(elements);
        setStatus('', elements);
        setBusy(false, elements);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const elements = getElements();
        const { input, button, datalist } = elements;
        if (!input || !button) {
            console.error('dashboard_search: elementos del formulario no encontrados.');
            return;
        }

        hydrateDatalist(elements);
        renderDatalist([], datalist);

        button.addEventListener('click', handleSearch);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
            }
        });
        input.addEventListener('input', () => invalidatePending(elements));

        clearError(elements);
        input.focus();
    });
})();
