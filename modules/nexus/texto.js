// #956 tramo 3 (ADR-010): utilidades de texto compartidas (escape de HTML,
// normalización y claves de búsqueda). Funciones puras: sin document ni window.

export function escaparHtml(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function normalizarTexto(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function claveBusqueda(valor) {
    return normalizarTexto(valor).replace(/[^a-z0-9]/g, '');
}
