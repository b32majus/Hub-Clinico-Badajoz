'use strict';

(function () {
    var coreSource = 'scripts/farmacia_data_source_v4_core.js?v=20260725-canonical-export-truth';
    var pathname = window.location.pathname || '';
    var isValidationPage = /(?:^|\/)farmacia_validacion\.html$/i.test(pathname);

    function writeScript(src) {
        document.write('<script src="' + src + '"></' + 'script>');
    }

    writeScript(coreSource);
    writeScript('scripts/farmacia_index_v4_state_guard.js?v=20260725-canonical-export-truth');
    writeScript('scripts/farmacia_import_mode_v4.js?v=20260725-canonical-export-truth');
    if (isValidationPage) {
        writeScript('scripts/farmacia_multitreatment_core.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_state_v4_model.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_import_validation_bridge_v4.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_export_truth_v4_helpers.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_export_truth_v4_state.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_export_truth_v4_outputs.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_export_truth_v4_ui.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_state_v4_ui.js?v=20260725-canonical-export-truth');
        writeScript('scripts/farmacia_validation_state_v4_safety.js?v=20260725-canonical-export-truth');
    }
})();
