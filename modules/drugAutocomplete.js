/**
 * drugAutocomplete.js — searchable combobox for the Reuma medicine fields,
 * backed by the common live searcher `HubTools.cimaSearch` (AEMPS CIMA REST
 * API) with the read-only published catalogue (`HubTools.catalog`) as
 * fallback when the AEMPS does not answer (decisión de Sil, 12-11).
 *
 * The native <select> stays in the DOM as the single value holder, so the
 * existing collection/export path (`collectTreatmentEntries`, export manager)
 * keeps working unchanged. Selecting a result writes ONLY the medicine name to
 * that select; it never writes dose, route, schedule, presentation, induction,
 * duration, therapeutic line, switch/add-on, renewal or validation outcome.
 *
 * Sin filtro por categoría: any medicine can be offered in any field. The
 * `data-drug-category` attribute may remain in the HTML but is no longer
 * read. A visible notice (`.drug-autocomplete__notice`) reports when the
 * answer came from the local catalogue fallback or when no source is
 * available; an empty AEMPS response shows no notice and offers no options.
 *
 * When the searcher module is missing the input stays disabled and no option
 * is invented.
 *
 * Namespace: HubTools.ui.initDrugAutocomplete
 */
(function () {
    'use strict';

    if (typeof HubTools === 'undefined') {
        console.error('drugAutocomplete.js: HubTools namespace no encontrado.');
        return;
    }

    HubTools.ui = HubTools.ui || {};

    var SELECTOR = '[data-drug-autocomplete="true"]';
    var WRAPPER_CLASS = 'drug-autocomplete';
    var READY_FLAG = 'drugAutocompleteReady';
    var CLEAR_LABEL = 'Sin fármaco';
    var SEARCH_DEBOUNCE_MS = 250;
    var SEARCH_MIN_QUERY_FALLBACK = 2;

    /**
     * Sin filtro por categoría (decisión de Sil, 12-11): a control is usable
     * whenever the common live searcher module is available. The published
     * catalogue remains the fallback inside `HubTools.cimaSearch.search`, and
     * `data-drug-category` is no longer read.
     */
    function isUsable(state) {
        return !!(HubTools.cimaSearch && typeof HubTools.cimaSearch.search === 'function');
    }

    function statusText() {
        return 'Buscador de fármacos no disponible';
    }

    function statusTextFor(state) {
        if (isUsable(state)) return '';
        return statusText();
    }

    function currentLabel(state) {
        var select = state.select;
        var selected = select.options[select.selectedIndex];
        if (selected && selected.value && selected.value !== 'No') {
            return selected.textContent || selected.value;
        }
        return 'No';
    }

    /**
     * Projects the authoritative selected medicine into the visible input.
     * A field that is initialized/restored with an existing selection must show
     * its label immediately, without waiting for an incidental blur.
     */
    function syncInputToSelection(state) {
        var label = currentLabel(state);
        var shown = label === 'No' ? '' : label;
        if (state.input.value.trim() !== shown) state.input.value = shown;
    }

    /**
     * Replaces the native select value keeping exactly one option for the
     * selected medicine (plus the neutral "No"), so re-selecting or
     * re-initialising never duplicates options.
     */
    function setSelectValue(select, value) {
        var name = value === undefined || value === null ? '' : String(value).trim();
        var keep = (!name || name === 'No') ? 'No' : name;

        while (select.firstChild) select.removeChild(select.firstChild);

        var no = document.createElement('option');
        no.value = 'No';
        no.textContent = 'No';
        select.appendChild(no);

        if (keep !== 'No') {
            var opt = document.createElement('option');
            opt.value = keep;
            opt.textContent = keep;
            select.appendChild(opt);
        }

        select.value = keep;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function ensureDefaultOption(select) {
        if (select.options.length > 0) return;
        var no = document.createElement('option');
        no.value = 'No';
        no.textContent = 'No';
        select.appendChild(no);
        select.value = 'No';
    }

    function closeList(state) {
        state.list.textContent = '';
        state.list.hidden = true;
        state.input.setAttribute('aria-expanded', 'false');
        state.results = [];
        state.activeIndex = -1;
    }

    /**
     * The notice reports the answer source of the LAST completed search.
     * `closeList` never hides it: a new valid query updates it when it
     * resolves, and emptying the field hides it.
     */
    function hideNotice(state) {
        state.notice.hidden = true;
        state.notice.textContent = '';
    }

    function showNoticeForSource(state, source) {
        if (source === 'local') {
            state.notice.hidden = false;
            state.notice.textContent = 'Sin respuesta de la AEMPS: resultados del catálogo local.';
        } else if (source === 'none') {
            state.notice.hidden = false;
            state.notice.textContent = 'Sin respuesta de la AEMPS y catálogo local no disponible.';
        } else {
            hideNotice(state);
        }
    }

    function highlight(state) {
        var items = state.list.querySelectorAll('.drug-autocomplete__item');
        Array.prototype.forEach.call(items, function (item, index) {
            item.classList.toggle('is-active', index === state.activeIndex);
        });
    }

    function renderResults(state, results) {
        closeList(state);
        if (!results || results.length === 0) return;
        state.results = results.slice();
        results.forEach(function (drug, index) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'drug-autocomplete__item';
            item.setAttribute('role', 'option');
            item.dataset.index = String(index);
            item.dataset.drugId = drug.id;
            var name = document.createElement('span');
            name.className = 'drug-autocomplete__name';
            name.textContent = drug.name;
            item.appendChild(name);
            item.addEventListener('mousedown', function (event) { event.preventDefault(); });
            item.addEventListener('click', function () { applySelection(state, drug); });
            state.list.appendChild(item);
        });
        state.list.hidden = false;
        state.input.setAttribute('aria-expanded', 'true');
    }

    function renderClear(state) {
        closeList(state);
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'drug-autocomplete__item drug-autocomplete__item--clear';
        item.setAttribute('role', 'option');
        item.textContent = CLEAR_LABEL;
        item.addEventListener('mousedown', function (event) { event.preventDefault(); });
        item.addEventListener('click', function () { clearSelection(state); });
        state.list.appendChild(item);
        state.list.hidden = false;
        state.input.setAttribute('aria-expanded', 'true');
    }

    function applySelection(state, drug) {
        if (!drug || !drug.name) return;
        setSelectValue(state.select, drug.name);
        state.input.value = drug.name;
        closeList(state);
        state.input.focus();
    }

    function clearSelection(state) {
        setSelectValue(state.select, 'No');
        state.input.value = '';
        closeList(state);
        state.input.focus();
    }

    function bindEvents(state) {
        state.input.addEventListener('input', function () {
            if (!isUsable(state)) return;
            var query = state.input.value.trim();
            var minQuery = (HubTools.cimaSearch && HubTools.cimaSearch.MIN_QUERY) || SEARCH_MIN_QUERY_FALLBACK;
            if (query.length < minQuery) {
                if (state.debounceTimer !== null) {
                    clearTimeout(state.debounceTimer);
                    state.debounceTimer = null;
                }
                if (!query && state.select.value && state.select.value !== 'No') {
                    renderClear(state);
                } else {
                    closeList(state);
                }
                hideNotice(state);
                return;
            }
            // Una consulta nueva válida cierra la lista de inmediato: ningún
            // ítem obsoleto (p. ej. «Sin fármaco») queda pulsable mientras
            // llega la respuesta.
            closeList(state);
            if (state.debounceTimer !== null) clearTimeout(state.debounceTimer);
            state.debounceTimer = window.setTimeout(function () {
                state.debounceTimer = null;
                var token = ++state.requestSeq;
                HubTools.cimaSearch.search(query).then(function (outcome) {
                    // Una respuesta vieja y lenta no pisa la consulta actual.
                    if (token !== state.requestSeq) return;
                    if (state.input.value.trim() !== query) return;
                    showNoticeForSource(state, outcome && outcome.source);
                    renderResults(state, (outcome && outcome.results) || []);
                });
            }, SEARCH_DEBOUNCE_MS);
        });

        state.input.addEventListener('focus', function () {
            if (!isUsable(state)) return;
            if (!state.input.value.trim() && state.select.value && state.select.value !== 'No') {
                renderClear(state);
            }
        });

        state.input.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeList(state);
                return;
            }
            if (state.list.hidden) return;
            var items = state.list.querySelectorAll('.drug-autocomplete__item');
            if (items.length === 0) return;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                state.activeIndex = Math.min(state.activeIndex + 1, items.length - 1);
                highlight(state);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                state.activeIndex = Math.max(state.activeIndex - 1, -1);
                highlight(state);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                items[state.activeIndex >= 0 ? state.activeIndex : 0].click();
            }
        });

        state.input.addEventListener('blur', function () {
            window.setTimeout(function () {
                if (document.activeElement && state.list.contains(document.activeElement)) return;
                closeList(state);
                syncInputToSelection(state);
            }, 150);
        });
    }

    /**
     * Refreshes a field's availability and status. Initialization (no options)
     * always hydrates the visible input from the authoritative selection. A
     * catalogue state change (`refreshAll`) refreshes every field but must not
     * clobber the field the user is editing: while the visible input holds
     * focus the in-progress query is left untouched, and the authoritative
     * label is projected again once the field is left (the blur handler).
     * Fields that are not being edited are synchronised, so a selection
     * restored/initialised before the catalogue became ready still hydrates
     * without an incidental blur.
     */
    function refreshOne(state, options) {
        var ready = isUsable(state);
        state.input.disabled = !ready;
        if (ready) {
            state.input.placeholder = 'Buscar fármaco…';
            state.input.title = '';
        } else {
            var status = statusTextFor(state);
            state.input.placeholder = status;
            state.input.title = status;
            closeList(state);
        }
        var editing = !!(options && options.preserveActiveQuery) && document.activeElement === state.input;
        if (!editing) syncInputToSelection(state);
    }

    function refreshAll() {
        if (typeof document === 'undefined') return;
        var selects = document.querySelectorAll(SELECTOR);
        Array.prototype.forEach.call(selects, function (select) {
            if (select.__drugAutocompleteState) refreshOne(select.__drugAutocompleteState, { preserveActiveQuery: true });
        });
    }

    function enhance(select) {
        if (!select || select.dataset[READY_FLAG] === 'true') return null;
        select.dataset[READY_FLAG] = 'true';
        select.setAttribute('data-no-custom-select', 'true');
        select.hidden = true;

        var wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'drug-autocomplete__input';
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('autocomplete', 'off');

        var list = document.createElement('div');
        list.className = 'drug-autocomplete__list';
        list.setAttribute('role', 'listbox');
        list.hidden = true;

        // Aviso del origen de los resultados (AEMPS en directo o respaldo
        // local): pequeño, role=status, oculto hasta la primera respuesta.
        var notice = document.createElement('p');
        notice.className = 'drug-autocomplete__notice';
        notice.setAttribute('role', 'status');
        notice.hidden = true;

        if (select.parentNode) select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(input);
        wrapper.appendChild(list);
        wrapper.appendChild(notice);
        wrapper.appendChild(select);

        var state = { select: select, input: input, list: list, notice: notice, results: [], activeIndex: -1, requestSeq: 0, debounceTimer: null };
        select.__drugAutocompleteState = state;

        ensureDefaultOption(select);
        bindEvents(state);
        refreshOne(state);
        return state;
    }

    function initDrugAutocomplete(root) {
        if (typeof document === 'undefined') return 0;
        var scope = root && typeof root.querySelectorAll === 'function' ? root : document;
        var selects = scope.querySelectorAll(SELECTOR);
        Array.prototype.forEach.call(selects, enhance);
        return selects.length;
    }

    document.addEventListener('hubcatalog:changed', refreshAll);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { initDrugAutocomplete(document); });
    } else {
        initDrugAutocomplete(document);
    }

    HubTools.ui.initDrugAutocomplete = initDrugAutocomplete;
})();
