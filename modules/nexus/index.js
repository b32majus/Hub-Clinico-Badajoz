// #956 tramo 3 (ADR-010): punto de entrada de la biblioteca común modules/nexus/.
// Reexporta toda la API pública: texto, fechas, avisos y los componentes <nx-aviso> y <nx-pestanas> (tramo 4), y <nx-shell> con sus menús y la versión del sitio (tramo 5).

export { escaparHtml, normalizarTexto, claveBusqueda } from './texto.js';
export { leerFecha, fechaIso, fechaCorta, fechaLarga } from './fechas.js';
export { TIPOS_AVISO, avisar, confirmar } from './avisos.js';
export { NxAviso, ETIQUETAS_AVISO } from './piezas/nx-aviso.js';
export { NxPestanas } from './piezas/nx-pestanas.js';
export { NxShell, CLAVE_PROFESIONAL, RUTA_MANIFIESTO } from './piezas/nx-shell.js';
export { MENUS } from './menus.js';
export { VERSION_SITIO } from './version.js';
