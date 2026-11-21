// #956 tramo 3 (ADR-010): punto de entrada de la biblioteca común modules/nexus/.
// Reexporta toda la API pública: texto, fechas, avisos y el componente <nx-aviso>.

export { escaparHtml, normalizarTexto, claveBusqueda } from './texto.js';
export { leerFecha, fechaIso, fechaCorta, fechaLarga } from './fechas.js';
export { TIPOS_AVISO, avisar, confirmar } from './avisos.js';
export { NxAviso, ETIQUETAS_AVISO } from './piezas/nx-aviso.js';
