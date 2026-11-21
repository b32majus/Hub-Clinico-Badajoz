// #956 tramo 3 (ADR-010): avisos en zona #nx-avisos y confirmaciones con
// <dialog> nativo, para sustituir alert() y confirm() del navegador en tramos posteriores.

import './piezas/nx-aviso.js';

export const TIPOS_AVISO = ['error', 'aviso', 'ok', 'info'];

let contadorDialogos = 0;

export function avisar(texto, { tipo = 'info', titulo } = {}) {
    if (!TIPOS_AVISO.includes(tipo)) {
        throw new TypeError(`Tipo de aviso desconocido: ${String(tipo)}`);
    }
    let zona = document.getElementById('nx-avisos');
    if (!zona) {
        zona = document.createElement('div');
        zona.id = 'nx-avisos';
        zona.className = 'nx-avisos';
        zona.setAttribute('role', 'region');
        zona.setAttribute('aria-label', 'Avisos');
        document.body.append(zona);
    }
    const aviso = document.createElement('nx-aviso');
    aviso.setAttribute('tipo', tipo);
    aviso.setAttribute('cerrable', '');
    if (titulo) aviso.setAttribute('titulo', String(titulo));
    aviso.textContent = String(texto ?? '');
    zona.append(aviso);
    return aviso;
}

export function confirmar({ titulo, texto, aceptar = 'Aceptar', cancelar = 'Cancelar', peligro = false } = {}) {
    if (typeof titulo !== 'string' || titulo === '') {
        return Promise.reject(new TypeError('confirmar() necesita un titulo'));
    }
    return new Promise((resolver) => {
        contadorDialogos += 1;
        const dialogo = document.createElement('dialog');
        dialogo.className = 'nx-dialogo';
        const idTitulo = `nx-dialogo-titulo-${contadorDialogos}`;
        const encabezado = document.createElement('h2');
        encabezado.className = 'nx-dialogo__titulo';
        encabezado.id = idTitulo;
        encabezado.textContent = titulo;
        dialogo.setAttribute('aria-labelledby', idTitulo);
        dialogo.append(encabezado);
        if (texto) {
            const parrafo = document.createElement('p');
            parrafo.className = 'nx-dialogo__texto';
            parrafo.textContent = texto;
            dialogo.append(parrafo);
        }
        const acciones = document.createElement('form');
        acciones.method = 'dialog';
        acciones.className = 'nx-dialogo__acciones';
        const botonCancelar = document.createElement('button');
        botonCancelar.value = 'cancelar';
        botonCancelar.className = 'nx-boton nx-boton--secundario';
        botonCancelar.textContent = cancelar;
        const botonAceptar = document.createElement('button');
        botonAceptar.value = 'aceptar';
        botonAceptar.className = peligro ? 'nx-boton nx-boton--peligro' : 'nx-boton nx-boton--principal';
        botonAceptar.textContent = aceptar;
        if (peligro) botonCancelar.setAttribute('autofocus', '');
        else botonAceptar.setAttribute('autofocus', '');
        acciones.append(botonCancelar, botonAceptar);
        dialogo.append(acciones);
        dialogo.addEventListener('close', () => {
            const ok = dialogo.returnValue === 'aceptar';
            dialogo.remove();
            resolver(ok);
        });
        document.body.append(dialogo);
        dialogo.showModal();
    });
}
