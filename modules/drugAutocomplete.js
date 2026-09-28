/**
 * drugAutocomplete.js — searchable combobox for the Reuma medicine fields,
 * backed by the read-only published catalogue (`HubTools.catalog`).
 *
 * The native <select> stays in the DOM as the single value holder, so the
 * existing collection/export path (`collectTreatmentEntries`, export manager)
 * keeps working unchanged. Selecting a result writes ONLY the medicine name to
 * that select; it never writes dose, route, schedule, presentation, induction,
 * duration, therapeutic line, switch/add-on, renewal or validation outcome.
 *
 * When the catalogue is not loaded the input stays disabled and no option is
 * invented.
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

    function catalog() {
        return HubTools && HubTools.catalog;
    }

    function isReady() {
        var c = catalog();
        return !!(c && typeof c.isLoaded === 'function' && c.isLoaded());
    }

    function statusText() {
        var c = catalog();
        var state = c && typeof c.getState === 'function' ? c.getState() : { state: 'idle' };
        if (state.state === 'loaded') return '';
        if (state.state === 'missing' || state.state === 'error') {
            return 'Catálogo de fármacos no disponible';
        }
        return 'Cargando catálogo de fármacos…';
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
            if (!isReady()) return;
            var query = state.input.value.trim();
            if (query.length < (catalog().MIN_QUERY || 2)) {
                if (!query && state.select.value && state.select.value !== 'No') {
                    renderClear(state);
                } else {
                    closeList(state);
                }
                return;
            }
            renderResults(state, catalog().search(query));
        });

        state.input.addEventListener('focus', function () {
            if (!isReady()) return;
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
                var label = currentLabel(state);
                var shown = label === 'No' ? '' : label;
                if (state.input.value.trim() !== shown) state.input.value = shown;
            }, 150);
        });
    }

    function refreshOne(state) {
        var ready = isReady();
        state.input.disabled = !ready;
        if (ready) {
            state.input.placeholder = 'Buscar fármaco…';
            state.input.title = '';
        } else {
            var status = statusText();
            state.input.placeholder = status;
            state.input.title = status;
            closeList(state);
        }
    }

    function refreshAll() {
        if (typeof document === 'undefined') return;
        var selects = document.querySelectorAll(SELECTOR);
        Array.prototype.forEach.call(selects, function (select) {
            if (select.__drugAutocompleteState) refreshOne(select.__drugAutocompleteState);
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

        if (select.parentNode) select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(input);
        wrapper.appendChild(list);
        wrapper.appendChild(select);

        var state = { select: select, input: input, list: list, results: [], activeIndex: -1 };
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
