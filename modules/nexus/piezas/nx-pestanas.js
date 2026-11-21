// #956 tramo 4 (ADR-010 §3): <nx-pestanas>, pestañas accesibles en el DOM de la página.
// El HTML trae ya el estado inicial (aria-selected y hidden), así que se ve bien
// antes de que cargue el script. Esto solo añade el teclado (flechas, Inicio, Fin;
// la selección sigue al foco) y el clic. No es para navegar entre páginas.
//
// <nx-pestanas>
//   <div class="nx-pestanas__lista" role="tablist" aria-label="…">
//     <button type="button" role="tab" class="nx-pestanas__pestana" id="p1" aria-selected="true">…</button>
//     <button type="button" role="tab" class="nx-pestanas__pestana" id="p2" aria-selected="false" tabindex="-1">…</button>
//   </div>
//   <div role="tabpanel" class="nx-pestanas__panel" aria-labelledby="p1" tabindex="0">…</div>
//   <div role="tabpanel" class="nx-pestanas__panel" aria-labelledby="p2" tabindex="0" hidden>…</div>
// </nx-pestanas>
//
// Evento «nx-cambio» (detail.pestana) al elegir otra pestaña.

export class NxPestanas extends HTMLElement {
    #armado = false;

    connectedCallback() {
        if (this.#armado) return;
        this.#armado = true;
        const pestanas = this.#pestanas();
        const elegida = pestanas.find((p) => p.getAttribute('aria-selected') === 'true') || pestanas[0];
        if (elegida) this.#elegir(elegida, false);
        this.addEventListener('click', (evento) => {
            const pestana = evento.target.closest('[role="tab"]');
            if (pestana && this.#pestanas().includes(pestana)) this.#elegir(pestana, true);
        });
        this.addEventListener('keydown', (evento) => this.#teclado(evento));
    }

    #pestanas() {
        const lista = this.querySelector('[role="tablist"]');
        return lista ? [...lista.querySelectorAll('[role="tab"]')].filter((p) => p.closest('nx-pestanas') === this) : [];
    }

    #panel(pestana) {
        return [...this.querySelectorAll('[role="tabpanel"]')].find(
            (panel) => panel.closest('nx-pestanas') === this && panel.getAttribute('aria-labelledby') === pestana.id);
    }

    #elegir(pestana, avisar) {
        const antes = this.#pestanas().find((p) => p.getAttribute('aria-selected') === 'true');
        for (const p of this.#pestanas()) {
            const es = p === pestana;
            p.setAttribute('aria-selected', es ? 'true' : 'false');
            p.tabIndex = es ? 0 : -1;
            const panel = this.#panel(p);
            if (panel) panel.hidden = !es;
        }
        if (avisar && antes !== pestana) {
            this.dispatchEvent(new CustomEvent('nx-cambio', { bubbles: true, detail: { pestana } }));
        }
    }

    #teclado(evento) {
        const pestanas = this.#pestanas();
        const actual = pestanas.indexOf(evento.target);
        if (actual < 0) return;
        const destinos = {
            ArrowRight: (actual + 1) % pestanas.length,
            ArrowLeft: (actual - 1 + pestanas.length) % pestanas.length,
            Home: 0,
            End: pestanas.length - 1,
        };
        if (!(evento.key in destinos)) return;
        evento.preventDefault();
        const destino = pestanas[destinos[evento.key]];
        this.#elegir(destino, true);
        destino.focus();
    }
}

if (!customElements.get('nx-pestanas')) customElements.define('nx-pestanas', NxPestanas);
