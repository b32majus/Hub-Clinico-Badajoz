(function () {
    'use strict';

    window.HubTools = window.HubTools || {};
    HubTools.ui = HubTools.ui || {};

    const SELECTOR = [
        'select.select-modern',
        '#gateProfessionalSelect',
        '#sexoPaciente',
        '#diagnosticoPrimario',
        '#dolorAxial',
        '#rigidezMatutina',
        '#irradiacionNalgas',
        '#clinicaAxialPresente',
        '#maniobrasSacroiliacas',
        '#adherencia',
        'select.criterio-acr-select',
        'select.haq-score',
        'select.mdhaq-select',
        'select.treatment-select',
        'select.treatment-select-improved',
        'select.tratamiento-dropdown'
    ].join(', ');

    const registry = new Map();

    function shouldEnhance(select) {
        if (!(select instanceof HTMLSelectElement)) return false;
        if (select.multiple || select.size > 1) return false;
        if (select.dataset.noCustomSelect === 'true') return false;
        return select.matches(SELECTOR);
    }

    function getSelectedLabel(select) {
        const selected = select.options[select.selectedIndex];
        if (selected) return selected.textContent || '';
        return select.options.length ? (select.options[0].textContent || '') : '';
    }

    function getOptionSignature(select) {
        return Array.from(select.options).map((option) => [
            option.value,
            option.textContent,
            option.disabled,
            option.selected
        ].join('::')).join('||');
    }

    function closeAll(exceptSelect) {
        registry.forEach((state, select) => {
            if (select !== exceptSelect) {
                state.root.classList.remove('is-open');
                state.root.classList.remove('open-upward');
                state.menu.style.display = 'none';
                state.trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function positionMenu(state) {
        const { root, trigger, menu } = state;
        root.classList.remove('open-upward');

        if (!root.classList.contains('is-open')) {
            menu.style.display = 'none';
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const margin = 12;
        const gap = 6;
        const spaceBelow = viewportHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;
        const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(120, Math.min(224, openUpward ? spaceAbove : spaceBelow));
        const menuWidth = Math.min(rect.width, viewportWidth - (margin * 2));
        const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - menuWidth - margin));

        menu.style.display = 'grid';
        menu.style.width = `${menuWidth}px`;
        menu.style.left = `${left}px`;
        menu.style.right = 'auto';
        menu.style.maxHeight = `${maxHeight}px`;

        if (openUpward) {
            root.classList.add('open-upward');
            menu.style.top = 'auto';
            menu.style.bottom = `${Math.max(margin, viewportHeight - rect.top + gap)}px`;
        } else {
            menu.style.top = `${Math.max(margin, rect.bottom + gap)}px`;
            menu.style.bottom = 'auto';
        }
    }

    function buildOptions(state) {
        const { select, menu } = state;
        menu.innerHTML = '';

        Array.from(select.options).forEach((option, index) => {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'custom-select__option';
            optionButton.setAttribute('role', 'option');
            optionButton.dataset.index = String(index);
            optionButton.dataset.value = option.value;
            optionButton.textContent = option.textContent || '';

            if (option.disabled) {
                optionButton.disabled = true;
                optionButton.classList.add('is-disabled');
            }

            if (option.selected) {
                optionButton.classList.add('is-selected');
                optionButton.setAttribute('aria-selected', 'true');
            } else {
                optionButton.setAttribute('aria-selected', 'false');
            }

            optionButton.addEventListener('click', () => {
                if (option.disabled) return;
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
                syncSelect(state);
                closeAll();
                state.trigger.focus();
            });

            menu.appendChild(optionButton);
        });

        state.signature = getOptionSignature(select);
    }

    function syncSelect(state) {
        const { select, root, trigger, label } = state;
        const selectedLabel = getSelectedLabel(select);

        if (state.signature !== getOptionSignature(select)) {
            buildOptions(state);
        }

        label.textContent = selectedLabel;
        label.classList.toggle('is-placeholder', !select.value);
        root.classList.toggle('is-disabled', !!select.disabled);
        root.classList.toggle('hidden', !!select.hidden || select.classList.contains('hidden'));
        trigger.disabled = !!select.disabled;
        trigger.setAttribute('aria-expanded', root.classList.contains('is-open') ? 'true' : 'false');
        positionMenu(state);

        Array.from(state.menu.children).forEach((node, index) => {
            const option = select.options[index];
            if (!option) return;
            node.classList.toggle('is-selected', option.selected);
            node.setAttribute('aria-selected', option.selected ? 'true' : 'false');
        });
    }

    function createCustomSelect(select) {
        if (registry.has(select) || !shouldEnhance(select)) return;

        const root = document.createElement('div');
        root.className = 'custom-select';
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select__trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const label = document.createElement('span');
        label.className = 'custom-select__label';

        const icon = document.createElement('span');
        icon.className = 'custom-select__icon';
        icon.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i>';

        const menu = document.createElement('div');
        menu.className = 'custom-select__menu';
        menu.setAttribute('role', 'listbox');

        select.parentNode.insertBefore(root, select);
        root.appendChild(select);
        root.appendChild(trigger);
        trigger.appendChild(label);
        trigger.appendChild(icon);
        document.body.appendChild(menu);

        select.classList.add('custom-select__native');

        const state = { select, root, trigger, label, menu, signature: '' };
        registry.set(select, state);

        trigger.addEventListener('click', () => {
            if (select.disabled) return;
            const willOpen = !root.classList.contains('is-open');
            closeAll(select);
            root.classList.toggle('is-open', willOpen);
            trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            positionMenu(state);
        });

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                trigger.click();
                const firstEnabled = menu.querySelector('.custom-select__option:not(.is-disabled)');
                firstEnabled?.focus();
            }
        });

        select.addEventListener('change', () => syncSelect(state));

        const observer = new MutationObserver(() => syncSelect(state));
        observer.observe(select, { childList: true, subtree: true, attributes: true });

        buildOptions(state);
        syncSelect(state);
    }

    function initCustomSelects(root) {
        const scope = root instanceof Element || root instanceof Document ? root : document;
        scope.querySelectorAll(SELECTOR).forEach(createCustomSelect);
    }

    function syncAllCustomSelects() {
        registry.forEach((state) => syncSelect(state));
    }

    document.addEventListener('click', (event) => {
        registry.forEach((state) => {
            if (!state.root.contains(event.target) && !state.menu.contains(event.target)) {
                state.root.classList.remove('is-open');
                state.root.classList.remove('open-upward');
                state.menu.style.display = 'none';
                state.trigger.setAttribute('aria-expanded', 'false');
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAll();
    });

    window.addEventListener('resize', syncAllCustomSelects);
    window.addEventListener('scroll', syncAllCustomSelects, true);

    const globalObserver = new MutationObserver(() => initCustomSelects(document));
    globalObserver.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('DOMContentLoaded', () => {
        initCustomSelects(document);
        window.setInterval(syncAllCustomSelects, 300);
    });

    HubTools.ui.initCustomSelects = initCustomSelects;
    HubTools.ui.syncCustomSelects = syncAllCustomSelects;
})();
