// #956 tramo 3 (ADR-010): leer y formatear fechas locales (siempre día, la hora
// se descarta). Funciones puras: sin document ni window.

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function construirDia(anio, mes, dia) {
    const d = new Date(anio, mes - 1, dia);
    if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
    return d;
}

export function leerFecha(valor) {
    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) return null;
        return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    }
    if (typeof valor === 'number') {
        if (!Number.isFinite(valor)) return null;
        const n = Math.floor(valor);
        if (n < 61) return null;
        const d = new Date(1899, 11, 30 + n);
        const anio = d.getFullYear();
        if (anio < 1900 || anio > 2100) return null;
        return new Date(anio, d.getMonth(), d.getDate());
    }
    if (typeof valor === 'string') {
        const texto = valor.trim();
        let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
        if (m) return construirDia(Number(m[1]), Number(m[2]), Number(m[3]));
        m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return construirDia(Number(m[3]), Number(m[2]), Number(m[1]));
        return null;
    }
    return null;
}

export function fechaIso(valor) {
    const d = leerFecha(valor);
    if (!d) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${String(d.getFullYear()).padStart(4, '0')}-${mes}-${dia}`;
}

export function fechaCorta(valor) {
    const d = leerFecha(valor);
    if (!d) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()}`;
}

export function fechaLarga(valor) {
    const d = leerFecha(valor);
    if (!d) return '';
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
