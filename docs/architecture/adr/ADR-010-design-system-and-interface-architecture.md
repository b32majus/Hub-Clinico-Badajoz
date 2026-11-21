# ADR-010 — Sistema de diseño y arquitectura de interfaz

**Estado:** `ACCEPTED` (decidido por Sil, 2026-11-21)
**Fecha:** 2026-11-21
**Issue:** #956 · depende de ADR-009

## Contexto

Nexus son en realidad tres aplicaciones que conviven, cada una hecha en una época y con un agente distinto.

| | Home (sep-oct 2026) | Reuma | Farmacia |
|---|---|---|---|
| Página | HTML vacío; el JS la dibuja desde la configuración | HTML con todo escrito | HTML con todo escrito |
| Barra lateral | no tiene | copiada en 7 HTML (3 variantes) | copiada en 10 HTML (5 variantes) |
| CSS | `nexus_home.css`, BEM, variables `--nexus-home-*` | `style.css` + un CSS por página, casi sin variables | `style.css` + `farmacia_style.css` (6.923 líneas) |
| JS | scripts clásicos, namespace propio, `createElement` | globales; `innerHTML` (53) y `createElement` (41) | namespaces; `createElement` (444) |

Hay mucho repetido:
- **CSS:** 16.300 líneas en 8 ficheros, tres sistemas de botones, dos de ventanas emergentes, y pestañas, tablas y tarjetas copiadas en 2-3 ficheros. Unos 17 puntos distintos de cambio a móvil, 252 clases sin uso y 170 definidas en varios ficheros.
- **JS:** funciones repetidas para escapar texto (3), formatear fechas (6+) y normalizar texto (3). Reuma avisa con `alert()`/`confirm()`.
- **Versiones:** las `?v=` están puestas a mano y son distintas en cada página.

Hay cinco mecanismos de publicación en paralelo:
- Pages por rama;
- release de la Home (10 ficheros);
- manifiesto de despliegue;
- snapshot congelado de Cáceres;
- versiones por módulo.

ADR-009 retira `file://` y fija navegadores modernos. Con eso, el navegador ya trae de serie lo que antes exigía un framework o un compilador.

## Decisión

### 1. Modernización nativa, sin instalar ni compilar

- **Módulos ES nativos** (`import`/`export`). Cada pantalla importa lo que necesita y se acaban los globales y el orden manual de `<script>`.
- **Componentes web nativos** (custom elements) para el catálogo de piezas, por ejemplo `<nx-shell>`, `<nx-dialogo>`, `<nx-aviso>` y `<nx-tabla>`. Una pieza aprobada es una etiqueta.
- **Capas CSS** (`@layer nx.tokens, nx.base, nx.piezas, modulo`). El orden lo impone el navegador, no el orden de carga.
- **Se mantiene una URL por pantalla**: no es una app de una sola página. Los enlaces y marcadores siguen valiendo y se migra pantalla a pantalla.
- **Sin React, Vue, Tailwind ni empaquetador** (el Freeze los rechazó y esto no los necesita). Las herramientas (versión, checks) corren en CI, nunca en el puesto (ADR-007).
- **Siempre `createElement`/`textContent`**, nunca `innerHTML`.

### 2. Estilos en capas, un solo sistema para las 19 páginas (Home incluida)

En `css/`:

1. `nexus_tokens.css` — variables `--nx-*`: paleta aprobada el 19-11 (comentario de #956), neutros, estados, tipografía (Inter guardada dentro de la app), escalas de redondeo, espaciado y sombra. Lleva prefijo propio porque hoy hay nombres iguales con valores distintos (p. ej. `--radius-lg` vale 26 px y 12 px).
2. `nexus_base.css` — reset, tipografía, foco visible, movimiento reducido e impresión (R9).
3. `nexus_piezas.css` — estilos del catálogo (BEM `nx-*`).
4. CSS de cada módulo, solo con lo suyo. No redefine piezas del catálogo.

Además:
- Tres puntos de cambio a móvil.
- Ningún color ni medida fuera de las variables; lo comprueba un check.
- Las variables antiguas (`--ses-green`, `--nexus-home-*`…) quedan como alias mientras se migra.
- Los CSS antiguos se vacían pantalla a pantalla y se borran cuando quedan vacíos.

### 3. Piezas comunes y shell

- **Catálogo** (`DESIGN.md` + página de muestra): botones, campo y buscador, tabla, pestañas, tarjeta, aviso y notificación, ventana emergente, etiqueta y shell. Cada pieza es un componente web con su CSS.
- **`<nx-shell>`**: la barra lateral común, generada a partir de la lista de módulos y el perfil del hospital (los JSON que ya usa la Home). Muestra la versión del sitio (R10) y el botón «Terminar» (R5). Sustituye a las 17 copias.
- **Biblioteca común** `modules/nexus/`: avisos, ventana emergente, confirmación, fechas y escapar texto. Sustituye a `alert()`/`confirm()` y a las funciones repetidas (R6).
- La Home deja de ser una isla: usa los mismos estilos, piezas y shell.

### 4. Cómo se trabaja lo visual

Norma de Sil del 21-11, común a todos los proyectos (`KairOS_Protocol/PROTOCOLOS.md`, «Trabajo visual»):

- El modelo fuerte diseña: maqueta y piezas del catálogo, que Sil aprueba con capturas.
- El modelo barato solo hace trabajo mecánico o coloca piezas aprobadas. Si falta una pieza, primero se diseña y entra en el catálogo.
- Siempre hay capturas de antes y después (lo que no se tocaba debe salir idéntico) y el modelo fuerte revisa la captura de lo nuevo.

### 5. Publicación

- **Pages** sigue siendo la demo viva de `promueve/nexus-v4`.
- **Una versión del sitio entero**, que amplía la herramienta de release de la Home: un manifiesto con la huella de todos los ficheros y un identificador único que se usa en todas las `?v=` (R10).
- **Un perfil por hospital** decide qué módulos se ven (Freeze: hospital fijo por despliegue). El paquete de Cáceres pasa a ser «versión X + perfil Cáceres», hecho con la misma herramienta.
- El mismo paquete sirve para Pages y para el servidor del hospital (R1).
- Cómo publicar varios hospitales a la vez en Pages se decide en ese bloque. Cambiar el origen de Pages requiere el GO de Sil.

## Orden de trabajo

Cada tramo es una PR con capturas de antes y después. El detalle y las casillas están en #956.

| Tramo | Qué | ¿Cambia el aspecto? |
|---|---|---|
| 0 | Este ADR, ADR-009 y el esqueleto de `DESIGN.md` | No |
| 1 | `nexus_tokens.css` + `nexus_base.css` en las 19 páginas (la Home incluida, regenerando su release a propósito); variables antiguas como alias | No |
| 2 | Sin dependencias externas: iconos, gráficos y letra dentro; CSP; check de recursos externos (R2, #715) | No |
| 3 | Base de módulos ES: `modules/nexus/` y primeros componentes web, sin usarlos aún; check de subruta (R1) | No |
| 4 | Catálogo de piezas + página de muestra (diseño del modelo fuerte, aprobación de Sil) | Solo la página de muestra |
| 5 | `<nx-shell>` en las 19 páginas | Poco |
| 6 | Aplicar la paleta: los colores escritos a mano pasan a la variable que les toca según su papel | Sí |
| 7… | Pantalla a pantalla: piezas del catálogo, paso a módulos ES, móvil de Farmacia, CSS sin uso | Sí |
| Aparte | Versión única del sitio + perfiles por hospital | No |

Los colores escritos a mano no se sustituyen antes del tramo 6. Sustituirlos obliga a decidir el papel de cada color (principal o acento de módulo), y esa es la decisión de aplicar la paleta.

## Alternativas rechazadas

- **Mantener los tres sistemas y solo añadir variables:** no resuelve las piezas ni la barra lateral repetidas.
- **React, Vue u otro framework, o Tailwind con compilación:** exigen herramientas y una reescritura (Freeze); lo nativo basta.
- **Una app de una sola página:** rompe enlaces y obliga a reescribir la navegación de golpe.
- **Copiar la maquinaria de la Home** (validadores generados, release de 10 ficheros) en cada pantalla: demasiado coste. Se adoptan sus patrones, no su maquinaria.

## Consecuencias

- `AGENTS.md`: la regla «ES5 en los scripts de página» queda para los scripts existentes hasta que se migre su pantalla. El código nuevo de `modules/nexus/` y de las piezas usa módulos ES.
- Los checks de presentación de la Home (`nexus_home_ux01_presentation_check`, release y hash) se adaptan cuando la Home adopte los estilos comunes (tramo 1).
- `docs/DECISIONES.md` registra este ADR y ADR-009, y marca como sustituidas las reglas de `file://` y CDN del plan de Reuma v2.

## Reabrir si

- Un navegador del SES no soporta lo nativo usado (ADR-009, «Reabrir si»).
- El tamaño o el rendimiento exigen un paso de compilación (ADR-007, «Reabrir si»).
