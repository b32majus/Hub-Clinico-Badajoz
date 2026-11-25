// Ayuda emergente <nx-ayuda>: un botón con el icono estándar de información (círculo con «i») que explica un campo al pasar el ratón, al enfocarlo con el
// teclado o al tocarlo en el móvil. Sin Shadow DOM. El texto es el contenido del elemento; si el módulo no
// carga, ese texto queda visible junto a la etiqueta (no se pierde la información).
// Atributo `etiqueta`: nombre accesible del botón (por defecto «Más información»).
// Se cierra con Escape (el texto no tapa nada que no se pueda quitar) y al tocar fuera.

let contador = 0;

export class NxAyuda extends HTMLElement {
    #armado = false;

    connectedCallback() {
        if (this.#armado) return;
        contador += 1;
        const id = `nx-ayuda-${contador}`;
        const texto = document.createElement('span');
        texto.className = 'nx-ayuda__texto';
        texto.id = id;
        texto.setAttribute('role', 'tooltip');
        while (this.firstChild) texto.append(this.firstChild);
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'nx-ayuda__boton';
        boton.setAttribute('aria-label', this.getAttribute('etiqueta') || 'Más información');
        boton.setAttribute('aria-describedby', id);
        boton.setAttribute('aria-expanded', 'false');
        const icono = document.createElement('i');
        icono.className = 'fas fa-info-circle';
        icono.setAttribute('aria-hidden', 'true');
        boton.append(icono);
        boton.addEventListener('click', () => this.#alternar(boton));
        const ajustar = () => this.#ajustar(boton, texto);
        this.addEventListener('pointerenter', ajustar);
        this.addEventListener('focusin', ajustar);
        boton.addEventListener('click', ajustar);
        window.addEventListener('scroll', ajustar, { capture: true, passive: true });
        window.addEventListener('resize', ajustar);
        this.addEventListener('pointerleave', () => this.removeAttribute('data-oculta'));
        this.addEventListener('focusout', () => this.removeAttribute('data-oculta'));
        this.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape') this.#cerrar(boton, true);
        });
        document.addEventListener('pointerdown', (evento) => {
            if (!this.contains(evento.target)) this.#cerrar(boton, false);
        });
        this.append(boton, texto);
        this.#armado = true;
    }

    // El texto es de posición fija (no lo recorta ninguna tarjeta): se coloca bajo el botón y, si así se
    // saldría de la pantalla, se desplaza lo justo
    #ajustar(boton, texto) {
        const margen = 8;
        const origen = boton.getBoundingClientRect();
        const ancho = texto.offsetWidth;
        const izquierda = Math.max(margen, Math.min(origen.left, window.innerWidth - margen - ancho));
        texto.style.left = `${Math.round(izquierda)}px`;
        texto.style.top = `${Math.round(origen.bottom + margen)}px`;
    }

    #alternar(boton) {
        const abrir = !this.hasAttribute('data-abierta');
        this.toggleAttribute('data-abierta', abrir);
        this.removeAttribute('data-oculta');
        boton.setAttribute('aria-expanded', String(abrir));
    }

    #cerrar(boton, ocultarAunqueHayaRaton) {
        this.removeAttribute('data-abierta');
        boton.setAttribute('aria-expanded', 'false');
        if (ocultarAunqueHayaRaton) this.setAttribute('data-oculta', '');
    }
}

if (!customElements.get('nx-ayuda')) customElements.define('nx-ayuda', NxAyuda);
