/* Cargador perezoso de la librería de Excel (#956, decisión de Sil 25-11):
 * la librería (vendor/sheetjs/xlsx.full.min.js, ~900 KB) solo se baja al usarla.
 * `NexusExcel.cargar()` la descarga una sola vez por página y resuelve con `window.XLSX`. */
(function () {
    'use strict';

    var promesa = null;

    function cargar() {
        if (typeof window.XLSX !== 'undefined') return Promise.resolve(window.XLSX);
        if (promesa) return promesa;
        promesa = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = 'vendor/sheetjs/xlsx.full.min.js';
            function fallar() {
                if (script.parentNode) script.parentNode.removeChild(script);
                promesa = null;
                reject(new Error('No se pudo cargar la librería de Excel (vendor/sheetjs/xlsx.full.min.js).'));
            }
            script.onload = function () {
                if (typeof window.XLSX !== 'undefined') resolve(window.XLSX);
                else fallar();
            };
            script.onerror = fallar;
            document.head.appendChild(script);
        });
        return promesa;
    }

    window.NexusExcel = Object.freeze({ cargar: cargar });
})();
