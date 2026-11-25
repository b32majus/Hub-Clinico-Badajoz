/**
 * paletaGraficos.js - Paleta de los gráficos de Estadísticas (#1028)
 *
 * Valorado con Sil el 24-11 y 25-11: cuatro paletas ya validadas, recordada en cada ordenador,
 * la misma en todas las patologías y en Farmacia, sin elegir color por serie. La paleta por defecto (Nature) son los tokens de
 * css/nexus_tokens.css; las otras (okabe, apagada, viridis) las redefine css/nexus_paletas.css
 * cuando <html> lleva data-nx-paleta. Solo la cargan las dos pantallas de Estadísticas.
 *
 * Al cambiar de paleta se avisa con el evento «nexus:paleta» en document (Reuma lo usa
 * para volver a dibujar Chart.js, que guarda el color al construir el gráfico; los
 * gráficos de Farmacia usan var(--nx-color-…) y cambian solos).
 *
 * Namespace: window.NexusPaleta (congelado). Clave guardada: nexus.paletaGraficos.v1
 */
(function () {
    'use strict';

    var KEY = 'nexus.paletaGraficos.v1';
    var DEFECTO = 'nature';
    var PALETAS = ['nature', 'okabe', 'apagada', 'viridis'];

    function valida(valor) {
        return PALETAS.indexOf(valor) !== -1 ? valor : DEFECTO;
    }

    // Lo guardado puede faltar, estar roto o no poder leerse (ventana privada): se usa la de por defecto.
    function leer() {
        try {
            return valida(window.localStorage.getItem(KEY));
        } catch (e) {
            return DEFECTO;
        }
    }

    function aplicar(paleta) {
        var raiz = document.documentElement;
        if (paleta === DEFECTO) raiz.removeAttribute('data-nx-paleta');
        else raiz.setAttribute('data-nx-paleta', paleta);
    }

    function get() {
        return valida(document.documentElement.getAttribute('data-nx-paleta') || DEFECTO);
    }

    function set(paleta) {
        var elegida = valida(paleta);
        aplicar(elegida);
        try {
            if (elegida === DEFECTO) window.localStorage.removeItem(KEY);
            else window.localStorage.setItem(KEY, elegida);
        } catch (e) {}
        document.dispatchEvent(new CustomEvent('nexus:paleta', { detail: { paleta: elegida } }));
        return elegida;
    }

    // Antes de pintar nada: así no se ve un instante la paleta equivocada.
    aplicar(leer());

    function conectar() {
        var selector = document.getElementById('selectorPaleta');
        if (!selector) return;
        selector.value = get();
        selector.addEventListener('change', function () {
            selector.value = set(selector.value);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectar);
    else conectar();

    window.NexusPaleta = Object.freeze({ KEY: KEY, DEFECTO: DEFECTO, PALETAS: Object.freeze(PALETAS.slice()), get: get, set: set });
})();
