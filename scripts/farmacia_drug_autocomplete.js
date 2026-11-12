'use strict';

/* Widget común de búsqueda de fármaco (catálogo) para los formularios de
   Farmacia. Tramo 2a: Seguimiento (primer fármaco y otros fármacos);
   Validación y Primera visita lo adoptan desde el 2b con el mismo widget.
   Tramo 3 (decisión de Sil 12-11): si el buscador común de la AEMPS está
   disponible (`HubTools.cimaSearch.searchPresentations`), el widget busca en
   directo en la AEMPS (a la AEMPS solo va el texto buscado); debajo de los
   resultados de la AEMPS salen los fármacos dados de alta a mano (LOCAL) del
   catálogo de Farmacia, y si la AEMPS no responde el respaldo es el catálogo
   de Farmacia entero con un aviso en pantalla. Sin el módulo común (p. ej.
   checks de Node con DOM de mentira), el comportamiento síncrono de catálogo
   no cambia.
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

    /* Buscador común (tramo 3): aviso literal del respaldo y debounce de la
       búsqueda en directo en la AEMPS. */
    var AEMPS_FALLBACK_NOTICE = 'Sin respuesta de la AEMPS: resultados del catálogo de Farmacia.';
    var CIMA_DEBOUNCE_MS = 250;

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

    /* ¿Está disponible el buscador común de la AEMPS (tramo 3)? */
    function commonSearchAvailable() {
        return Boolean(window.HubTools && window.HubTools.cimaSearch
            && typeof window.HubTools.cimaSearch.searchPresentations === 'function');
    }

    /* Convierte una fila de la AEMPS (HubTools.cimaSearch.searchPresentations)
       en el fármaco que las páginas de Farmacia ya consumen: identidad
       comercial únicamente — sin principio activo, sin código nacional y sin
       ningún dato terapéutico inventado; dosis y vía solo si el propio
       registro de la AEMPS las aporta (la vía, solo si es única). */
    function fromAempsRow(row) {
        if (!row || typeof row !== 'object') return null;
        var name = String(row.name == null ? '' : row.name).trim();
        var id = String(row.id == null ? '' : row.id).trim();
        if (!name || !id) return null;
        return {
            nombre_comercial: name,
            display_name: name,
            nombre_presentacion: name,
            principio_activo: '',
            codigo_nacional: '',
            nregistro: String(row.nregistro == null ? '' : row.nregistro).trim(),
            dosis: String(row.dosis == null ? '' : row.dosis).trim(),
            via: String(row.via == null ? '' : row.via).trim(),
            es_hospitalario: '',
            biosimilar: '',
            drug_id: id,
            source_type: 'CIMA',
            forma_farmaceutica: ''
        };
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
        var debounceTimer = null;
        var requestSeq = 0;

        /* Vaciar/cerrar el desplegable también cancela la búsqueda con
           debounce pendiente e invalida la respuesta en curso (sube
           `requestSeq`): tras elegir un fármaco el desplegable no se reabre
           solo, y ninguna respuesta vieja vuelve a pintar. */
        function clear() {
            if (debounceTimer !== null) {
                window.clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            requestSeq += 1;
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

        /* `notice`: aviso no seleccionable (`autocomplete-notice`, nunca
           `autocomplete-item`), primer hijo del desplegable; la navegación
           con teclado sigue usando solo los ítems. Con aviso y 0 resultados
           el desplegable se muestra solo con el aviso; sin aviso y 0
           resultados, oculto. */
        function paint(results, notice) {
            emptyNode(dropdown);
            activeIndex = -1;
            var hasNotice = typeof notice === 'string' && notice.length > 0;
            if (hasNotice) {
                var noticeNode = document.createElement('div');
                noticeNode.className = 'autocomplete-notice';
                noticeNode.textContent = notice;
                dropdown.appendChild(noticeNode);
            }
            if (!results || !results.length) {
                if (hasNotice) {
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.classList.add('hidden');
                }
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

        /* Resultados del catálogo de Farmacia para una consulta. */
        function catalogResults(catalog, query) {
            var results = catalog && typeof catalog.search === 'function' ? catalog.search(query) : [];
            return results || [];
        }

        /* Respaldo cuando la AEMPS no responde: catálogo de Farmacia entero
           (CIMA + locales) con aviso en pantalla, como hasta ahora. */
        function paintCatalogFallback(catalog, query) {
            paint(catalogResults(catalog, query), AEMPS_FALLBACK_NOTICE);
        }

        /* Tramo 3: con respuesta de la AEMPS, primero sus filas convertidas y
           debajo solo los fármacos dados de alta a mano (LOCAL) del catálogo;
           el resto del catálogo (CIMA) no sale. Los locales nunca se recortan
           por la AEMPS. Sin respuesta ('none'), respaldo con aviso. */
        function paintCommonResults(catalog, query, outcome) {
            var source = outcome && outcome.source ? outcome.source : 'none';
            var rows = outcome && Array.isArray(outcome.results) ? outcome.results : [];
            if (source !== 'aemps') {
                paintCatalogFallback(catalog, query);
                return;
            }
            var aemps = [];
            for (var i = 0; i < rows.length; i++) {
                var drug = fromAempsRow(rows[i]);
                if (drug) aemps.push(drug);
            }
            var all = catalogResults(catalog, query);
            var locales = [];
            for (var j = 0; j < all.length; j++) {
                if (all[j] && all[j].source_type === 'LOCAL') locales.push(all[j]);
            }
            paint(aemps.slice(0, Math.max(0, maxResults - locales.length)).concat(locales).slice(0, maxResults), '');
        }

        /* Búsqueda común (tramo 3), igual que `modules/drugAutocomplete.js`:
           vaciado inmediato, debounce y nº de petición — una respuesta vieja,
           o con el texto del campo ya distinto, se ignora. La petición nunca
           rechaza y `paintCommonResults` no inventa opciones. */
        function searchCommon(catalog, query) {
            clear();
            debounceTimer = window.setTimeout(function () {
                debounceTimer = null;
                var token = ++requestSeq;
                window.HubTools.cimaSearch.searchPresentations(query).then(function (outcome) {
                    if (token !== requestSeq) return;
                    if (String(input.value == null ? '' : input.value).trim() !== query) return;
                    paintCommonResults(catalog, query, outcome);
                });
            }, CIMA_DEBOUNCE_MS);
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
            if (commonSearchAvailable()) {
                searchCommon(catalog, query);
                return;
            }
            paint(catalogResults(catalog, query));
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
                /* Si el foco ya volvió al campo, el cierre pendiente es de un blur viejo. */
                if (focus === input) return;
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
