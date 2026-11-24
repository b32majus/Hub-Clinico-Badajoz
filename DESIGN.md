# DESIGN.md — Sistema de diseño de PROMueve Nexus

**Estado:** tramo 4 de #956 (2026-11-21): variables y base en las 19 páginas; catálogo de piezas y página de muestra (`muestra/nexus_piezas.html`), que ninguna pantalla usa todavía. Se completa por tramos.
**Decisiones de fondo:** `docs/architecture/adr/ADR-009` (entorno) y `ADR-010` (sistema de diseño y arquitectura de interfaz).

Quien implemente una pantalla no inventa colores, medidas ni piezas: usa lo que hay aquí. Si falta algo, **para y avisa**. La pieza nueva la diseña el modelo fuerte, Sil la aprueba y entra en este catálogo (ADR-010 §4).

## 1. Paleta (aprobada por Sil, 19-11)

Sale de los colores del logo. El contraste está calculado con texto blanco encima; el mínimo para texto normal es 4,5.

| Uso | Color | Contraste | Regla |
|---|---|---|---|
| Principal: botón principal, enlaces, foco | `#3c107c` (morado del logo) | 13,5 | — |
| Verde Extremadura | `#429a37` | 3,6 | **Solo marca** (logo, «EX», detalles). **Nunca en botones**: en la app el verde se lee como «correcto» |
| Acento Farmacia | `#008777`; texto `#006b5e` | 4,4 / 6,3 | Cabecera, icono y borde del módulo; no en botones principales |
| Acento Reuma | `#dc0182`; texto `#b0016a` | 4,8 / 6,9 | Ídem |
| Acento Derma | `#f04e37` (aprox.); texto `#c2361f` | 3,6 / 5,5 | Ídem |
| Estados | verde, ámbar, rojo y azul fijos | — | Solo para OK, aviso, error e información |
| Neutros | fondo `#f6f7f9`, texto `#1f2430` | — | — |

Los valores exactos están en `css/nexus_tokens.css` (tramo 1, 21-11). Estados, con su contraste sobre blanco:

| Estado | Texto e icono | Fondo |
|---|---|---|
| Correcto | `--nx-color-ok` `#1b7a3e` (5,4) | `--nx-color-ok-fondo` `#e8f5ec` |
| Aviso | `--nx-color-aviso` `#8a5300` (6,3) | `--nx-color-aviso-fondo` `#fdf3e1` |
| Error | `--nx-color-error` `#a4262c` (7,3) | `--nx-color-error-fondo` `#fbeaea` |
| Información | `--nx-color-info` `#1d5fa8` (6,5) | `--nx-color-info-fondo` `#e8f0fb` |

Grises: `--nx-color-texto-suave` `#5a6272` (6,1) para texto secundario; `--nx-color-tenue` `#8a93a5` (3,1) solo para iconos y bordes, nunca para texto; `--nx-color-borde` `#d6dae2`; `--nx-color-superficie-suave` `#eef0f4`. Son los mismos valores que ya usaba la Home, cuyas variables `--nexus-home-*` apuntan ahora a estas.

**Colores de gráficos (24-11, Sil: «de revista médica», comunes a todas las patologías).** Los colores de estado (`ok`, `aviso`, `error`, `info`) son de la aplicación, no de los gráficos. Categorías: `--nx-color-serie-1` a `-6`, paleta tipo Nature ajustada (azul marino, rojo coral, verde azulado, mostaza, violeta, azul cielo), por orden y sin rotar; una sola serie va en un solo color (nunca degradado por puesto). Actividad (Remisión → Baja → Moderada → Alta): `--nx-color-actividad-1` a `-4` (viridis sin el amarillo), se lee impresa en gris. Homúnculo: `--nx-color-nad` (naranja, texto oscuro encima), `--nx-color-nat` (azul), `--nx-color-dactilitis`; «ambas» = rayas de los dos. Validado con el comprobador de daltonismo y contraste de la skill dataviz. El ámbar `--nx-color-aviso` es color de texto: nunca relleno de botón o pestaña (como fondo, `--nx-color-aviso-fondo`). «No registrado» siempre `--nx-color-serie-sin-dato` (gris): ausente no es «bien». Desde JS se escriben como `var(--nx-color-serie-N)`, sin hex.

### Aplicar la paleta a las pantallas antiguas (tramo 6, aprobado por Sil con capturas, 21-11)

Las 7 hojas antiguas (`style.css`, `farmacia_style.css`, `style_primera_visita.css`, `style_seguimiento.css`, `style_dashboard.css`, `style_estadisticas.css`, `style_manage.css`, quitada en el tramo 7 porque quedó vacía) y los `<style>` de `farmacia_primera_visita.html` y `farmacia_seguimiento.html` ya no escriben colores: cada uno pasó a la variable de su papel (unos 2.200 cambios, con la herramienta `bin/paleta_mapear.py` de la carpeta de trabajo). Reglas:

| Antes | Ahora |
|---|---|
| Grises (escala slate/bootstrap) | Por papel y claridad: `texto`, `texto-suave`, `superficie`, `fondo`, `superficie-suave`, `borde`; el borde de los campos de formulario, `tenue` (como el catálogo). El gris claro como texto pasa a `texto-suave` (`tenue` no es para texto). Cambian ligeramente de tono |
| Verde `#008777` y familia (`--primary-blue`, `--ses-green*`) | Botones, foco y elegido → `principal` (morado); éxito → `ok`; el resto → acento del módulo de la página |
| Rojo, ámbar, verde y azul de estado | Oscuro → el estado; claro → su `-fondo`; intermedio en bordes → su `-borde` |
| Morados | `principal` / `principal-suave` |
| Transparencias y sombras | `color-mix(in srgb, var(--nx-color-…) N%, transparent)` |

**Acento del módulo:** `--nx-color-modulo`, `-texto`, `-suave` y `-borde` valen el de Farmacia, Reuma o Derma según el `<nx-shell modulo>` de la página (`:root:has(...)` en `nexus_tokens.css`); sin barra, el principal. Por eso Reuma pasa del verde a su rosa. Variables nuevas: `--nx-color-{ok,aviso,error,info}-borde` y `--nx-color-{farmacia,reuma,derma}-suave`. El check `nexus_paleta_check` (CI) impide volver a escribir colores a mano en esas hojas.

Fuera de este tramo (tramo 7): los colores que pone el JS (gráficos de Chart.js, escalas de actividad de `scoreCalculators.js`, chips de EA de `farmacia_seguimiento.js`), porque tienen significado clínico; las sombras siguen siendo las de cada hoja hasta migrar a `--nx-sombra-*`.

## 2. Capas CSS

`@layer nx.tokens, nx.base, nx.piezas, modulo;`

| Capa | Fichero | Contiene |
|---|---|---|
| `nx.tokens` | `css/nexus_tokens.css` | Variables `--nx-*`: color, tipografía, redondeo, espaciado, sombra |
| `nx.base` | `css/nexus_base.css` | Reset, tipografía, foco visible, movimiento reducido, impresión |
| `nx.piezas` | `css/nexus_piezas.css` | Estilos del catálogo (BEM `nx-*`) |
| `modulo` | CSS de cada módulo | Solo lo propio del módulo; no redefine piezas |

## 3. Reglas

- Ningún color ni medida escrita a mano: solo `var(--nx-*)`. Lo comprueba un check.
- Clases de piezas: BEM con prefijo `nx-` (`nx-boton`, `nx-boton--principal`, `nx-tabla__fila`).
- **Escritorio primero** (ADR-009 R4; Sil, 21-11): se diseña y se pule el escritorio. Tres puntos de cambio, siempre `max-width` y en `em`: **64em** (1024 px), **40em** (640 px; la barra lateral pasa arriba solo por debajo, así la tableta a 768 px la conserva a la izquierda) y **36em** (576 px). Solo recolocan al estrechar (columnas que se apilan, botones uno bajo otro); la tableta se comprueba y el móvil solo no se rompe (sin desplazamiento lateral). Las variables no valen dentro de `@media`, por eso los valores se escriben ahí y en ningún otro sitio.
- Sin estilos en línea. Nunca `innerHTML`.
- Solo lo que Edge y Chrome actualizados traen de serie, sin compilar (ADR-009 R3).
- Accesibilidad WCAG 2.1 AA: foco visible, teclado, contraste y nunca solo color (R8).
- Nada se carga desde fuera: letra, iconos y gráficos van en `vendor/` (R2).
- Ningún script clásico en `<head>`: van al final del `<body>`, en su orden (en `<head>` bloquean el pintado de toda la página, barra incluida; Reuma Inicio tardaba 1,5 s frente a 0,45 s de Farmacia, Sil 21-11). Lo comprueba `nexus_shell_paginas_check` P9.
- **Todo `<script src>` lleva `defer` (o `type="module"`), sin excepción** (24-11). La política de seguridad va en `<meta http-equiv="Content-Security-Policy">` y, con ella, Chrome deja de pedir los scripts por adelantado: sin `defer` se bajan de uno en uno y con red lenta la carga pasó de ~2 s a 6-10 s en casi todas las pantallas (entró con #959 el 21-11 y nadie lo midió). Nada de scripts escritos en el HTML salvo el que solo espera a `DOMContentLoaded`: llévalo a un fichero con `defer`. Con `defer`, `DOMContentLoaded` puede llegar antes de que `<nx-shell>` pinte la barra: el código que toca elementos de la barra escucha en el documento (`closest`) o espera a `customElements.whenDefined('nx-shell')`, nunca `querySelectorAll` al cargar. Lo comprueba `nexus_scripts_paralelo_check` (en `verify:nexus`). Cualquier cambio en cómo se cargan las páginas se mide antes de subir con red lenta (150 ms) contra la versión anterior.

## 4. Catálogo de piezas

Estilos en `css/nexus_piezas.css` (capa `nx.piezas`); ejemplo vivo de cada pieza en `muestra/nexus_piezas.html` (Pages: `/muestra/nexus_piezas.html`). Lo comprueban `tools/nexus_piezas_check.mjs` (CI) y `tools/nexus_piezas_browser_check.mjs` (local: axe-core WCAG 2.1 AA, teclado, foco y anchos).

**Al migrar una pantalla (tramo 7):** las reglas sin capa de los CSS antiguos ganan a las del catálogo, aunque sean tan generales como `button {}`. La pantalla que adopta una pieza quita antes sus reglas viejas para esos elementos.

**Receta para migrar una pantalla (piloto: Profesionales y Fármacos de Farmacia, aprobado por Sil con capturas, 21-11):** `<body class="nx-pagina">`; aviso de demo con `nx-aviso`, cabecera con `nx-cabecera`, bloques con `nx-tarjeta`, tablas con `nx-tabla-marco` + `nx-tabla` (`<caption>` y `<th scope="col">`), pares dato-valor con `nx-datos`, estados con `nx-etiqueta`; ni clases viejas ni `style=`. Se mantiene `main.main-content` (H-02). Se añade la pantalla a `MIGRADAS` en `nexus_piezas_check` y se sube el `?v=` de lo que cambie. Si un script viejo pinta dentro de la pantalla, se le da una salida explícita (p. ej. `data-catalog-solo-texto`: `farmacia_common.js` escribe el estado del catálogo sin darle el aspecto de la barra). Capturas antes y después de la pantalla, en escritorio y móvil. Desde el 22-11, `bin/migrar_pantalla.py <worktree> <pagina> --version <tag> --marcar` aplica la parte mecánica y lista lo que queda a mano. El `style="display:none"` inicial que maneja el JS se conserva.

| Pieza | Marcado | Variantes y estados | Reglas |
|---|---|---|---|
| Página | `<body class="nx-pagina">` | — | Letra Inter, fondo y texto comunes. La llevan las pantallas ya migradas (lista `MIGRADAS` de `nexus_piezas_check`, S13). `nx-solo-lector`: texto solo para lector de pantalla |
| Botón | `<button type="button" class="nx-boton nx-boton--principal">` | `--principal` (una acción por zona), `--secundario`, `--discreto` (enlace con aspecto de botón), `--peligro` (borrar, descartar), `--pequeno`, `--icono` (lleva `aria-label`); `disabled`; cargando con `aria-busy="true"` y texto «Guardando…» | Morado para actuar; rojo solo para peligro; nunca verde ni color de módulo. Alto mínimo 2,5rem. Grupo de botones: `nx-acciones` (`--final` los alinea a la derecha) |
| Campo | `.nx-campo` › `label.nx-campo__etiqueta` + `.nx-campo__control` (input, select, textarea) + `p.nx-campo__ayuda` / `p.nx-campo__error` | obligatorio con `<span class="nx-campo__obligatorio">(obligatorio)</span>`; error con `aria-invalid="true"` y `aria-describedby` hacia el texto de error; `disabled` | El error empieza por «Error:» (no solo borde rojo; si lo escribe un script, `nx-campo__error--prefijo` lo pone por CSS). Rejilla de campos: `nx-formulario` (`--alinear-abajo` cuando las etiquetas de una fila tienen distinto largo y los controles deben quedar a la misma altura). `--estirar` cuando hay pocos campos por fila y deben repartirse todo el ancho. Fila de botones: `nx-acciones`. Selector nativo `<select>`, sin desplegables hechos a mano. Campo de solo lectura (`readonly`): fondo suave, sin otro cambio |
| Casilla | `<label class="nx-casilla"><input type="checkbox"> Texto</label>` | — | Casilla nativa en morado |
| Buscador | `<form class="nx-buscador" role="search">` con un `nx-campo` (`type="search"`) y un botón | — | La etiqueta se ve siempre; el `placeholder` es solo un ejemplo |
| Tabla | `<div class="nx-tabla-marco" role="region" aria-labelledby="…" tabindex="0">` › `<table class="nx-tabla">` con `<caption>` y `<th scope="col">` | `--compacta`; marco `nx-tabla-marco--alto` (cabecera fija y desplazamiento vertical); números en `td.nx-tabla__num` (a la derecha, cifras alineadas) | Sin rayado: separadores finos y fila resaltada al pasar el ratón. En pantallas estrechas el marco se desplaza de lado; la página no |
| Pestañas | `<nx-pestanas>` (`modules/nexus/piezas/nx-pestanas.js`) con `.nx-pestanas__lista[role=tablist]`, `button.nx-pestanas__pestana[role=tab]` y `.nx-pestanas__panel[role=tabpanel]` | elegida: `aria-selected="true"`; el resto `tabindex="-1"` y su panel `hidden`, ya escrito en el HTML | Flechas, Inicio y Fin; la selección sigue al foco; evento `nx-cambio`. La elegida lleva raya, no solo color. Para vistas dentro de una página, nunca para navegar entre páginas |
| Cabecera de pantalla | `<header class="nx-cabecera">` › `<div>` con `p.nx-cabecera__ruta` («Farmacia Hospitalaria · Gestión»), `h1.nx-cabecera__titulo` y `p.nx-cabecera__texto`; a la derecha, opcional, `p.nx-cabecera__estado` con `nx-etiqueta` (tramo 7) | — | Una por pantalla, con el único `h1`. Sobre el fondo de la página, sin tarjeta ni icono grande; la ruta en el color del módulo y una línea fina debajo. El nombre del módulo no se repite (ya está en la barra). El aviso de demo encima es `<nx-aviso tipo="aviso" role="note" titulo="…">` (nota fija: no se anuncia como alerta) |
| Tarjeta | `<article class="nx-tarjeta">` › `header.nx-tarjeta__cabecera` (`h3.nx-tarjeta__titulo`, `p.nx-tarjeta__subtitulo`) + `.nx-tarjeta__cuerpo` + `footer.nx-tarjeta__pie` | — | Blanca con borde fino, sin franja ni borde de color (Sil, 21-11: aspecto «IA»). El color de módulo va solo en la ruta de la cabecera. Rejilla: `nx-rejilla`. Pares dato–valor: `<dl class="nx-datos">`. Gráficos: no hay pieza propia; cada gráfico va dentro de una `nx-tarjeta` (Estadísticas de Reuma y de Farmacia) |
| Cifra | `<div class="nx-cifras">` › `div.nx-cifra` con `p.nx-cifra__etiqueta` + `p.nx-cifra__valor` (tramo 7) | — | Un recuento con su nombre: nombre pequeño arriba, número grande. Sin icono ni color: si una cifra pide atención, lo dice una `nx-etiqueta`, no la tarjeta. Caben en una fila (`--nx-ancho-cifra-min`) |
| Solicitud pendiente | `<div class="nx-solicitudes">` › `article.nx-solicitud` con `.nx-solicitud__cabecera` (`h3.nx-solicitud__titulo`, `p.nx-solicitud__subtitulo`, `nx-etiqueta` de estado), `.nx-solicitud__datos` (`.nx-solicitud__dato`), `.nx-solicitud__nota`, `.nx-solicitud__prebio` (`.nx-solicitud__prebio-titulo` + `.nx-solicitud__chips` con `nx-etiqueta`) y `.nx-solicitud__acciones` (tramo 7, H-20) | prebio `--ok`, `--aviso`, `--error` (colorea solo el título) | Fila de una cola de trabajo dentro de una `nx-tarjeta`: separadas por una línea, nunca caja dentro de caja. Primera pantalla: Actividad del servicio (las clases viejas `pending-validation-card*`, `prebio-chip`, `status-*` quedan solo como enganche de los checks, sin estilo propio salvo el color de los chips) |
| Etiqueta | `<span class="nx-etiqueta nx-etiqueta--ok">Validado</span>` | `--ok`, `--aviso`, `--error`, `--info`; sin variante, neutra («Sin dato») | El texto dice el estado; el color lo acompaña. Siempre los cuatro colores de estado, nunca colores sueltos. Es la pieza de estado de todo el sistema (no hay `nx-estado`): las insignias que pinta el JS llevan `nx-etiqueta` + variante y conservan su clase vieja solo como enganche (H-04/H-20, 24-11) |
| Aviso | `<nx-aviso tipo="error">` o `avisar(texto, { tipo })` (§5) | `error`, `aviso`, `ok`, `info`; `titulo`; `cerrable` | Etiqueta en texto («Error», «Atención», «Hecho», «Información») fondo suave y borde fino del color de estado; sin franja gruesa a un lado (Sil, 21-11). Los de `avisar()` van en la zona `nx-avisos`, abajo a la derecha, y no se cierran solos |
| Ventana emergente | `<dialog class="nx-dialogo" aria-labelledby="…">` con `h2.nx-dialogo__titulo`, `p.nx-dialogo__texto` y `form[method=dialog].nx-dialogo__acciones`; para confirmar, `confirmar()` (§5) | peligrosa: botón `--peligro` y foco inicial en «Cancelar» | Siempre `showModal()`. Sin `role`, `aria-modal`, trampa de foco ni manejo de Esc propios: los da el navegador. Ancho máximo 32rem; en móvil los botones se apilan |
| Vacío | `<div class="nx-vacio">` › `p.nx-vacio__titulo` + `p.nx-vacio__texto` (+ botón opcional) | — | Dice qué falta y qué hacer, nunca una zona en blanco |
| Barra lateral | `<div class="nx-marco">` › `<nx-shell modulo="farmacia" raiz="">` (bloques propios del módulo dentro, opcional) + `<main class="nx-marco__contenido">` (`modules/nexus/piezas/nx-shell.js`, tramo 5) | `modulo`: `farmacia`, `reuma` (menú en `modules/nexus/menus.js`); sin `modulo`, solo la lista de módulos (Home). Página actual con `aria-current="page"` | Genera marca (vuelve al inicio), menú del módulo, «Otros módulos» y pie con entorno, versión (R10, `version.js`) y «Terminar» (R5). El color del módulo solo en su nombre; la página actual con fondo suave morado, sin franja lateral. 16rem en escritorio, 14,5rem por debajo de 64em; por debajo de 40em va arriba y deja de estar fija |
| Profesional en la barra | `<p class="nx-profesional"><i class="fas fa-user-circle" aria-hidden="true"></i> <span id="currentProfessional">…</span></p>` dentro de `<nx-shell>` (tramo 5) | — | Icono y nombre del profesional elegido; lo rellena `script.js` desde `hubSelectedProfessional` |

**Barra lateral, detalle (tramo 5).** Muestras: `muestra/nexus_shell_farmacia.html` y `muestra/nexus_shell_reuma.html`; navegador: `tools/nexus_shell_browser_check.mjs`.
- *Qué módulos se ven* lo decide el perfil del hospital: `data/platform/home/deployment-manifest.json` (el mismo de la Home), solo los `enabled` y `available`. Si no se puede leer, no se enseña ninguno (como la Home, que falla cerrada). El menú interno de cada módulo está en `menus.js`, porque el manifiesto no lo trae.
- *Bloques propios* (profesional, buscador de paciente, estado de los datos, catálogo CIMA): la página los escribe dentro de `<nx-shell>` y la barra los conserva con sus `id` en `.nx-shell__extra`, debajo de la marca.
- *«Terminar»* (R5): lanza `nx-terminar` (cancelable: la pantalla lo impide si hay cambios sin guardar), pide confirmación, olvida el profesional elegido (`hubSelectedProfessional`) y vuelve al inicio de Nexus. Hasta que #713 decida qué más se borra, no borra nada más (ADR-009).
- *Versión* (R10): `VERSION_SITIO` en `version.js`; hoy igual que `release` de `module-readiness.json` (lo comprueba CI) hasta que exista la versión única del sitio.
- *La Home no lleva barra (decisión de Sil, 23-11). Colocada en las 17 páginas (tramo 5, 21-11):* cada página lleva `<div class="nx-marco">` (el `<body>` NO lleva `nx-pagina`: esa clase cambia el `box-sizing`, la tipografía y el fondo de todo el contenido, y solo la usan las pantallas nuevas y las muestras), `<nx-shell modulo=… raiz="" pagina=…>` con dentro, en este orden, el profesional (`nx-profesional`), el buscador (`nx-buscador`, sin `<form>`: el Enter lo gestiona el JS), el estado de BD (`.db-status-indicator`) y, en Farmacia, el bloque del catálogo CIMA; y `<main class="main-content nx-marco__contenido">` (se conserva `main-content` porque lo leen 9 scripts de Farmacia y 4 checks). Cargan `css/nexus_piezas.css` y `modules/nexus/piezas/nx-shell.js`; este, para que el menú no espere a los ~25 scripts de cada página (salía ~2 s tarde, Sil 21-11), con `<link rel="modulepreload">` de él y sus dependencias en `<head>` y `<script type="module" async>` justo tras `</nx-shell>`; quien lea los enlaces de la barra espera a `customElements.whenDefined('nx-shell')`. La Home no lleva barra. Los enlaces con `data-nav-link` siguen pasando por el aviso de cambios sin guardar de `script.js`; `farmacia_evaluation_ledger.js` guarda como `app_context` el texto de `.nx-shell__version`; `farmacia_seguimiento.js` reescribe el enlace al panel del paciente en `a.nx-shell__enlace`. Comprobación: `tools/nexus_shell_paginas_check.mjs`. Lo que queda por limpiar al migrar cada pantalla (tramo 7) está en `docs/deuda-tecnica/nexus-estandarizacion-hallazgos.md`.

Pendiente para cuando lo pida una pantalla (se diseña aquí antes de usarlo): ordenar columnas de tabla, paginación, ayuda emergente y menú. Sin modo oscuro: la app es clara (como la Home).

## 5. Biblioteca común (`modules/nexus/`, tramo 3)

Módulos ES con rutas relativas (funcionan bajo subruta, R1). Se importan desde `modules/nexus/index.js`. Ninguna pantalla los usa todavía; cada una los adopta al migrarse (tramo 7) y entonces se borran sus funciones repetidas.

- **Texto** (`texto.js`): `escaparHtml(valor)` (los cinco caracteres; `null` → vacío), `normalizarTexto(valor)` (sin tildes, minúsculas, espacios colapsados) y `claveBusqueda(valor)` (solo `a-z0-9`, para comparar identificadores y nombres).
- **Fechas** (`fechas.js`): `leerFecha(valor)` acepta `AAAA-MM-DD` (con o sin hora; vale el día escrito), `DD/MM/AAAA`, `Date` y número de serie de Excel; devuelve el día local o `null`, nunca una fecha desbordada (`31/02` no es marzo). `fechaIso`, `fechaCorta` (`05/01/2024`) y `fechaLarga` (`5 de enero de 2024`) devuelven vacío si no hay fecha.
- **Avisos** (`avisos.js`, R6): `avisar(texto, { tipo, titulo })` con `tipo` = `error`, `aviso`, `ok` o `info`. Pone un `<nx-aviso>` en una zona única «Avisos» de la página. El aviso lleva su etiqueta en texto («Error», «Atención», «Hecho», «Información»: nunca solo color), se anuncia al lector de pantalla y no se cierra solo; «Cerrar» pasa el foco al siguiente aviso.
- **Confirmación** (`avisos.js`): `await confirmar({ titulo, texto, aceptar, cancelar, peligro })` → `true`/`false`. Abre un `<dialog>` modal; con `peligro` el foco empieza en «Cancelar». Sustituye a `confirm()`.
- **Barra lateral** (`piezas/nx-shell.js`, `menus.js`, `version.js`, tramo 5): `<nx-shell>`; ver §4. Es lo único de la biblioteca que lee la red (el manifiesto del perfil) y el almacenamiento (olvidar el profesional), y el check lo limita a esas dos líneas.
- Nada de `alert()`, `confirm()`, `innerHTML`, estilos ni colores dentro de la biblioteca: el aspecto llega con el catálogo (tramo 4). Lo comprueban `tools/nexus_modulos_check.mjs` (CI) y `tools/nexus_modulos_browser_check.mjs`.

## 6. Cómo se trabaja

Norma de trabajo visual (Sil, 21-11):

- El trabajo mecánico lo hace el modelo barato.
- Lo que es diseño (una pantalla nueva o una redistribución) lleva maqueta del modelo fuerte, aprobada por Sil.
- En el trabajo mixto, el modelo barato hace la función y coloca piezas del catálogo.
- Siempre hay capturas de antes y después: lo que no se tocaba debe salir idéntico.
