'use strict';

(function () {
    var coreSource = 'scripts/farmacia_data_source_v4_core.js?v=20260724-validation-state';
    var isValidationPage = /(?:^|\/)farmacia_validacion\.html$/i.test(window.location.pathname || '');

    function writeScript(src) {
        document.write('<script src="' + src + '"></' + 'script>');
    }

    writeScript(coreSource);
    if (isValidationPage) {
        writeScript('scripts/farmacia_multitreatment_core.js?v=20260724-validation-state');
        writeScript('scripts/farmacia_validation_state_v4_model.js?v=20260724-validation-state');
        writeScript('scripts/farmacia_validation_state_v4_ui.js?v=20260724-validation-state');
        writeScript('scripts/farmacia_validation_state_v4_safety.js?v=20260724-validation-state');
    }
})();
