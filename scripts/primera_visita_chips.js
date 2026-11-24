// Chips de Primera visita (dolor axial, rigidez, irradiación, maniobras).
// Antes iba escrito en primera_visita.html; está aquí para cargarse con `defer`
// en el mismo orden que el resto (tools/nexus_scripts_paralelo_check.mjs).
(function () {
    'use strict';

    var CHIP_FIELD_IDS = ['dolorAxial', 'rigidezMatutina', 'irradiacionNalgas', 'maniobrasSacroiliacas'];

    function buildChips(select) {
        if (select.dataset.chipDecorated === 'true') return;
        if (document.querySelector('[data-chip-group-for="' + select.id + '"]')) return;
        select.dataset.chipDecorated = 'true';

        var label = document.querySelector('label[for="' + select.id + '"]');
        var group = document.createElement('div');
        group.className = 'pv-chips';
        group.setAttribute('role', 'group');
        group.setAttribute('data-chip-group-for', select.id);
        if (label) {
            if (!label.id) label.id = select.id + 'Label';
            group.setAttribute('aria-labelledby', label.id);
        }

        function sync() {
            var disabled = !!select.disabled;
            Array.prototype.forEach.call(group.querySelectorAll('.pv-chip'), function (chip) {
                var pressed = select.value === chip.dataset.value;
                chip.setAttribute('aria-pressed', pressed ? 'true' : 'false');
                chip.disabled = disabled || chip.dataset.optionDisabled === 'true';
            });
        }

        Array.prototype.forEach.call(select.options, function (option) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'pv-chip';
            chip.dataset.value = option.value;
            chip.dataset.optionDisabled = option.disabled ? 'true' : 'false';
            chip.setAttribute('aria-pressed', 'false');
            var mark = document.createElement('span');
            mark.className = 'pv-chip__mark';
            mark.setAttribute('aria-hidden', 'true');
            var text = document.createElement('span');
            text.className = 'pv-chip__label';
            text.textContent = option.textContent || '';
            chip.appendChild(mark);
            chip.appendChild(text);
            chip.addEventListener('click', function () {
                if (select.disabled || option.disabled) return;
                // Same supported path the product already uses for programmatic
                // selection (see modules/customSelect.js): write the authority
                // first, then publish input/change so every existing listener runs.
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
                sync();
            });
            group.appendChild(chip);
        });

        select.parentNode.insertBefore(group, select.nextSibling);
        select.classList.add('pv-chip-native');

        // Hydration / restore / programmatic assignment: the product writes
        // select.value directly (e.g. prefillSeguimientoForm). Shadow the
        // accessor per element so the view re-derives from the single stored
        // value, with no polling loop and no second state store.
        var descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if (descriptor && typeof descriptor.set === 'function') {
            Object.defineProperty(select, 'value', {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: function () { return descriptor.get.call(this); },
                set: function (next) { descriptor.set.call(this, next); sync(); }
            });
        }

        select.addEventListener('change', sync);
        select.addEventListener('input', sync);
        window.addEventListener('pageshow', function () {
            window.requestAnimationFrame(sync);
        });
        new MutationObserver(sync).observe(select, { attributes: true, attributeFilter: ['disabled'] });

        sync();
    }

    function init() {
        CHIP_FIELD_IDS.forEach(function (id) {
            var select = document.getElementById(id);
            if (select) buildChips(select);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
