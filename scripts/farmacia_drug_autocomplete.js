'use strict';

/* Widget común de búsqueda de fármaco (catálogo) para los formularios de
   Farmacia. Tramo 2a: Seguimiento (primer fármaco y otros fármacos);
   Validación y Primera visita lo adoptarán en el 2b con el mismo widget.
   Publica `window.FarmaciaDrugAutocomplete = { attach, hasWrittenData,
   replacementDecision, confirmReplacement, MESSAGES }`. El DOM se construye con
   createElement/textContent. Sin estilos en línea. */

(function () {
    function isTruthyRobust(value) {
        if (value === true || value === 1 || value === '1') return true;
        if (value === false || value === 0 || value === '0') return false;
        if (value === null || value === undefined || value === '') return false;
        var s = String(value).trim().toUpperCase();
        return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'YES' || s === '1';
    }

    /* Política común al elegir OTRO fármaco sobre uno ya elegido, por este
       orden: sospechoso en ficha EA → dispensado en esta visita → datos
       escritos a mano (pide confirmación) → reescribir directamente. */
    var MESSAGES = {
        blocked_ea: 'Este medicamento está marcado como sospechoso en una ficha EA. Desvincúlelo antes de cambiar su identidad o seleccionar otro medicamento.',
        blocked_dispensed: 'Este medicamento consta como dispensado en esta visita. Quite la dispensación antes de seleccionar otro medicamento.',
        confirm: 'Este medicamento tiene datos escritos (dosis, vía, pauta o datos de la visita). Si selecciona otro medicamento, se borrarán. ¿Continuar?'
    };

    function replacementDecision(state) {
        state = state || {};
        if (state.eaSuspect) return 'blocked_ea';
        if (state.dispensed) return 'blocked_dispensed';
        if (state.writtenData) return 'confirm';
        return 'replace';
    }

    /* Al reemplazar un fármaco ya elegido: ¿ha escrito el profesional dosis,
       vía o pauta? Lo que propuso el
       catálogo (previousSnapshot.proposal_values) no cuenta como escrito:
       la misma regla que conserva el campo editado a mano al reconciliar. */
    function hasWrittenData(current, previousSnapshot) {
        current = current || {};
        /* Sin selección previa del catálogo no hay fármaco que reemplazar: la
           primera elección conserva lo que el profesional ya hubiera escrito. */
        if (!previousSnapshot) return false;
        var previous = previousSnapshot && previousSnapshot.proposal_values &&
            typeof previousSnapshot.proposal_values === 'object'
            ? previousSnapshot.proposal_values : {};
        function clean(value) { return String(value == null ? '' : value).trim(); }
        if (clean(current.pauta)) return true;
        var fields = ['dosis_texto', 'via'];
        for (var i = 0; i < fields.length; i++) {
            var value = clean(current[fields[i]]);
            if (value && value !== clean(previous[fields[i]])) return true;
        }
        return false;
    }

    function confirmReplacement(state) {
        var decision = replacementDecision(state);
        if (decision === 'blocked_ea') {
            window.alert(MESSAGES.blocked_ea);
            return false;
        }
        if (decision === 'blocked_dispensed') {
            window.alert(MESSAGES.blocked_dispensed);
            return false;
        }
        if (decision === 'confirm') return window.confirm(MESSAGES.confirm);
        return true;
    }

    function emptyNode(node) {
        while (node && node.firstChild) node.removeChild(node.firstChild);
    }

    /* Ítem de resultado idéntico al que pintaba el buscador de Seguimiento. */
    function paintDrugItem(drug) {
        var item = document.createElement('div');
        item.className = 'autocomplete-item';

        var mainRow = document.createElement('div');
        mainRow.className = 'autocomplete-item-main';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'autocomplete-item-name';
        nameSpan.textContent = drug.display_name || drug.nombre_comercial || '\u2014';
        mainRow.appendChild(nameSpan);

        if (isTruthyRobust(drug.es_hospitalario)) {
            var hospTag = document.createElement('span');
            hospTag.className = 'drug-tag drug-tag--hosp';
            hospTag.textContent = 'HOSP';
            mainRow.appendChild(hospTag);
        }
        if (isTruthyRobust(drug.biosimilar)) {
            var bioTag = document.createElement('span');
            bioTag.className = 'drug-tag drug-tag--bio';
            bioTag.textContent = 'BIO';
            mainRow.appendChild(bioTag);
        }
        var sourceType = (drug.source_type || '').toLowerCase();
        var sourceTag = document.createElement('span');
        sourceTag.className = 'drug-source-tag drug-source-tag--' + (sourceType === 'cima' ? 'cima' : 'local');
        sourceTag.textContent = drug.source_type || '\u2014';
        mainRow.appendChild(sourceTag);

        item.appendChild(mainRow);

        var detailRow = document.createElement('div');
        detailRow.className = 'autocomplete-item-detail';
        var parts = [];
        if (drug.principio_activo) parts.push(drug.principio_activo);
        if (drug.dosis) parts.push(drug.dosis);
        if (drug.via) parts.push(drug.via);
        if (drug.codigo_nacional) parts.push('CN ' + drug.codigo_nacional);
        detailRow.textContent = parts.join(' \u00B7 ');
        item.appendChild(detailRow);

        return item;
    }

    /* attach(options) → { clear }. options: input y dropdown (nodos),
       getCatalog (devuelve el catálogo), onSelect(drug) y maxResults
       (por defecto 15). Con input o dropdown ausentes no engancha nada. */
    function attach(options) {
        options = options || {};
        var input = options.input;
        var dropdown = options.dropdown;
        var getCatalog = typeof options.getCatalog === 'function' ? options.getCatalog : null;
        var onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
        var maxResults = typeof options.maxResults === 'number' && options.maxResults > 0 ? options.maxResults : 15;
        if (!input || !dropdown) return { clear: function () {} };

        var activeIndex = -1;

        function clear() {
            emptyNode(dropdown);
            dropdown.classList.add('hidden');
            activeIndex = -1;
        }

        function paintActive(items) {
            for (var i = 0; i < items.length; i++) {
                if (items[i].classList && typeof items[i].classList.toggle === 'function') {
                    items[i].classList.toggle('autocomplete-item--active', i === activeIndex);
                }
            }
        }

        function paint(results) {
            emptyNode(dropdown);
            activeIndex = -1;
            if (!results || !results.length) {
                dropdown.classList.add('hidden');
                return;
            }
            var max = Math.min(results.length, maxResults);
            for (var i = 0; i < max; i++) {
                var item = paintDrugItem(results[i]);
                (function (drug) {
                    item.addEventListener('click', function () {
                        clear();
                        if (onSelect) onSelect(drug);
                    });
                })(results[i]);
                dropdown.appendChild(item);
            }
            dropdown.classList.remove('hidden');
        }

        /* El clic en un ítem hacía perder el foco y el blur cerraba el
           desplegable antes del clic: cancelar el mousedown conserva el
           foco en el campo y el clic llega. */
        if (typeof dropdown.addEventListener === 'function') {
            dropdown.addEventListener('mousedown', function (event) { event.preventDefault(); });
        }

        input.addEventListener('input', function () {
            var catalog = getCatalog ? getCatalog() : null;
            if (!catalog || !catalog.loaded) {
                clear();
                return;
            }
            var query = String(input.value == null ? '' : input.value).trim();
            if (query.length < 2) {
                clear();
                return;
            }
            var results = typeof catalog.search === 'function' ? catalog.search(query) : [];
            paint(results || []);
        });

        input.addEventListener('keydown', function (event) {
            if (dropdown.classList.contains('hidden')) return;
            var items = dropdown.querySelectorAll('.autocomplete-item');
            if (!items || !items.length) return;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                paintActive(items);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                activeIndex = Math.max(activeIndex - 1, -1);
                paintActive(items);
            } else if (event.key === 'Enter') {
                if (activeIndex >= 0 && activeIndex < items.length) {
                    event.preventDefault();
                    items[activeIndex].click();
                }
            } else if (event.key === 'Escape') {
                clear();
            }
        });

        input.addEventListener('blur', function () {
            window.setTimeout(function () {
                var focus = document.activeElement;
                if (!focus || !dropdown.contains(focus)) clear();
            }, 150);
        });

        return { clear: clear };
    }

    window.FarmaciaDrugAutocomplete = {
        attach: attach,
        hasWrittenData: hasWrittenData,
        replacementDecision: replacementDecision,
        confirmReplacement: confirmReplacement,
        MESSAGES: MESSAGES
    };
})();
