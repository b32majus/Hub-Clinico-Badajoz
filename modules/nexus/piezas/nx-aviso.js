// #956 tramo 3 (ADR-010): componente <nx-aviso> para los mensajes del sistema,
// sin Shadow DOM. El aspecto de las clases nx-aviso__* se diseña en el tramo 4.

export const ETIQUETAS_AVISO = { error: 'Error', aviso: 'Atención', ok: 'Hecho', info: 'Información' };

export class NxAviso extends HTMLElement {
    #armado = false;

    connectedCallback() {
        if (this.#armado) return;
        const tipoAtributo = this.getAttribute('tipo');
        const tipo = Object.prototype.hasOwnProperty.call(ETIQUETAS_AVISO, tipoAtributo) ? tipoAtributo : 'info';
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', tipo === 'error' || tipo === 'aviso' ? 'alert' : 'status');
        }
        const texto = document.createElement('span');
        texto.className = 'nx-aviso__texto';
        while (this.firstChild) texto.append(this.firstChild);
        const etiqueta = document.createElement('span');
        etiqueta.className = 'nx-aviso__etiqueta';
        etiqueta.textContent = ETIQUETAS_AVISO[tipo];
        this.append(etiqueta);
        const titulo = this.getAttribute('titulo');
        if (titulo !== null) {
            const fuerte = document.createElement('strong');
            fuerte.className = 'nx-aviso__titulo';
            fuerte.textContent = titulo;
            this.append(fuerte);
        }
        this.append(texto);
        if (this.hasAttribute('cerrable')) {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'nx-aviso__cerrar';
            boton.setAttribute('aria-label', 'Cerrar aviso');
            boton.textContent = 'Cerrar';
            boton.addEventListener('click', () => this.#cerrar(boton));
            this.append(boton);
        }
        this.#armado = true;
    }

    #cerrar(boton) {
        const teniaFoco = document.activeElement === boton;
        this.dispatchEvent(new CustomEvent('nx-cerrar', { bubbles: true }));
        const vecino = this.#avisoVecinoConCierre();
        this.remove();
        if (teniaFoco && vecino) vecino.querySelector('button.nx-aviso__cerrar').focus();
    }

    #avisoVecinoConCierre() {
        for (let el = this.nextElementSibling; el; el = el.nextElementSibling) {
            if (el.matches('nx-aviso') && el.querySelector('button.nx-aviso__cerrar')) return el;
        }
        for (let el = this.previousElementSibling; el; el = el.previousElementSibling) {
            if (el.matches('nx-aviso') && el.querySelector('button.nx-aviso__cerrar')) return el;
        }
        return null;
    }
}

if (!customElements.get('nx-aviso')) customElements.define('nx-aviso', NxAviso);
