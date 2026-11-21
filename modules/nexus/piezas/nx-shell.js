// #956 tramo 5 (ADR-010 §3, ADR-009 R5 y R10): <nx-shell>, la barra lateral común.
// Va en el DOM de la página (sin sombra), dentro del marco:
//
// <div class="nx-marco">
//   <nx-shell modulo="farmacia" raiz="">
//     …bloques propios del módulo (profesional, buscador, estado de datos), opcional…
//   </nx-shell>
//   <main class="nx-marco__contenido">…</main>
// </div>
//
// modulo: clave de MENUS (menus.js); sin él, solo se listan los módulos (la Home).
// raiz: ruta de la página a la raíz del sitio ("" en la raíz, "../" un nivel más abajo).
// pagina: página actual; por defecto, el último tramo de la URL. Marca el enlace con aria-current="page".
//
// Los bloques propios del módulo se conservan tal cual (mismos id) en .nx-shell__extra.
// «Otros módulos» sale del perfil del hospital (deployment-manifest.json de la Home): solo los
// activos y disponibles; si no se puede leer, no se enseña ninguno.
// «Terminar» (R5): lanza «nx-terminar» (cancelable: la página puede impedirlo si hay cambios sin
// guardar), pide confirmación, olvida el profesional elegido y vuelve al inicio de Nexus. Hasta que
// #713 decida qué más se borra, no borra nada más (ADR-009).

import { MENUS } from '../menus.js';
import { VERSION_SITIO } from '../version.js';
import { confirmar } from '../avisos.js';

export const CLAVE_PROFESIONAL = 'hubSelectedProfessional';
export const RUTA_MANIFIESTO = 'data/platform/home/deployment-manifest.json';
const INICIO = 'index.html';
const PAGINA_VALIDA = /^[a-z0-9_]+\.html$/;

function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

function icono(clase) {
    const i = document.createElement('i');
    i.className = `fas ${clase} nx-shell__icono`;
    i.setAttribute('aria-hidden', 'true');
    return i;
}

export class NxShell extends HTMLElement {
    #armado = false;

    connectedCallback() {
        if (this.#armado) return;
        this.#armado = true;
        const raiz = this.getAttribute('raiz') || '';
        const modulo = MENUS[this.getAttribute('modulo')] ? this.getAttribute('modulo') : '';
        const menu = modulo ? MENUS[modulo] : null;
        const pagina = this.getAttribute('pagina') || location.pathname.split('/').pop() || INICIO;
        const propios = [...this.childNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE);

        const marca = crear('a', 'nx-shell__marca');
        marca.href = raiz + INICIO;
        marca.append(crear('span', 'nx-shell__producto', menu ? menu.producto : 'NEXus'), crear('span', 'nx-shell__modulo', menu ? menu.titulo : 'Inicio'));

        const nav = crear('nav', 'nx-shell__nav');
        nav.setAttribute('aria-label', menu ? `Menú de ${menu.titulo}` : 'Módulos');
        for (const seccion of menu ? menu.secciones : []) {
            nav.append(this.#seccion(seccion.titulo, seccion.enlaces.map((e) => ({ ...e, href: raiz + e.href, actual: e.href === pagina }))));
        }

        const version = crear('p', 'nx-shell__version');
        version.append(crear('span', '', `Versión ${VERSION_SITIO}`));
        const terminar = crear('button', 'nx-boton nx-boton--secundario nx-shell__terminar');
        terminar.type = 'button';
        terminar.append(icono('fa-sign-out-alt'), document.createTextNode('Terminar'));
        terminar.addEventListener('click', () => this.#terminar(raiz));
        const pie = crear('div', 'nx-shell__pie');
        pie.append(version, terminar);

        const partes = [marca];
        if (propios.length) {
            const extra = crear('div', 'nx-shell__extra');
            extra.append(...propios);
            partes.push(extra);
        }
        partes.push(nav, pie);
        this.replaceChildren(...partes);
        this.#otrosModulos(raiz, modulo, nav, version);
    }

    #seccion(titulo, enlaces) {
        const id = `nx-shell-${titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
        const seccion = crear('div', 'nx-shell__seccion');
        const cabecera = crear('h2', 'nx-shell__titulo', titulo);
        cabecera.id = id;
        const lista = crear('ul', 'nx-shell__lista');
        lista.setAttribute('aria-labelledby', id);
        for (const e of enlaces) {
            const a = crear('a', 'nx-shell__enlace');
            a.href = e.href;
            a.setAttribute('data-nav-link', '');
            if (e.actual) a.setAttribute('aria-current', 'page');
            a.append(icono(e.icono), crear('span', '', e.texto));
            const li = document.createElement('li');
            li.append(a);
            lista.append(li);
        }
        seccion.append(cabecera, lista);
        return seccion;
    }

    async #otrosModulos(raiz, modulo, nav, version) {
        let manifiesto;
        try {
            const respuesta = await fetch(raiz + RUTA_MANIFIESTO, { cache: 'no-cache' });
            if (!respuesta.ok) return;
            manifiesto = await respuesta.json();
        } catch {
            return;
        }
        const sitio = manifiesto && manifiesto.display && typeof manifiesto.display.siteName === 'string' ? manifiesto.display.siteName : '';
        if (sitio) version.prepend(crear('span', '', sitio));
        const modulos = Array.isArray(manifiesto && manifiesto.modules) ? manifiesto.modules : [];
        const enlaces = modulos
            .filter((m) => m && m.enabled === true && m.available === true && m.moduleId !== modulo
                && typeof m.entryPath === 'string' && PAGINA_VALIDA.test(m.entryPath))
            .map((m) => {
                const propio = MENUS[m.moduleId];
                const texto = propio ? propio.titulo : String(m.label || m.moduleId);
                return { texto, href: raiz + m.entryPath, icono: propio ? propio.icono : 'fa-th-large', actual: false };
            });
        if (enlaces.length) nav.append(this.#seccion(modulo ? 'Otros módulos' : 'Módulos', enlaces));
    }

    async #terminar(raiz) {
        const seguir = this.dispatchEvent(new CustomEvent('nx-terminar', { bubbles: true, cancelable: true }));
        if (!seguir) return;
        const si = await confirmar({
            titulo: '¿Terminar en este ordenador?',
            texto: 'Se olvida el profesional elegido y se vuelve al inicio de Nexus. Lo que no haya guardado o exportado se pierde.',
            aceptar: 'Terminar',
            cancelar: 'Seguir aquí',
        });
        if (!si) return;
        try {
            localStorage.removeItem(CLAVE_PROFESIONAL);
        } catch {
            // Sin acceso al almacenamiento: no hay nada que olvidar.
        }
        location.assign(raiz + INICIO);
    }
}

if (!customElements.get('nx-shell')) customElements.define('nx-shell', NxShell);
