# Hallazgos de la estandarización de interfaz (#956)

Cosas que han salido al colocar las piezas comunes en las pantallas existentes y que necesitarán una limpieza o refactorización posterior. Se añaden según se encuentran. Origen: Sil, 21-11 («déjalo recogido, probablemente necesitará corrección posterior»).

## Tramo 5 (colocar `<nx-shell>`)

- **H-01 · Versión del sitio.** `modules/nexus/version.js` vale `0.6.0` por ser el `release` de `module-readiness.json`, que se ha usado como versión de la plataforma entera aunque en origen fue la versión de Farmacia en Cáceres. Sil (21-11): enrasar todo a una versión basal «Nexus 4» y partir de ahí. Falta decidir la numeración y cambiar `module-readiness.json`, `version.js` y el check S12 a la vez.
- **H-02 · `main.main-content`.** Nueve scripts de Farmacia (borrador de página, ledger, modo informes) y cuatro checks buscan `main.main-content`. Se conserva la clase en `<main>` junto a `nx-marco__contenido`. Refactor: un selector estable propio (`[data-nx-contenido]`) y quitar `main-content`.
- **H-03 · `style.css` por capas.** Las reglas sin capa (`.main-content` con su relleno 48px 56px, fondo degradado y `min-height: 100vh`, y la regla de `body`) ganan a `@layer nx.piezas`. Son restos del CSS viejo; al migrar cada pantalla (tramo 7) hay que pasarlas a piezas del catálogo o a la capa `modulo`.
- **H-04 · Colores sueltos.** *(Colores resueltos en el tramo 6: ya son `var(--nx-*)`; queda decidir si pasan a una pieza `nx-estado`.)* `.db-status-indicator*` (style.css) y `.catalog-sidebar-*` (farmacia_style.css) usan colores en hexadecimal, no `var(--nx-*)`. Funcionan sobre la barra clara pero hay que pasarlos a tokens y, quizá, a una pieza `nx-estado`.
- **H-05 · Variables y reglas sin uso.** *(Las cuatro citadas se quitaron en el tramo 6; el resto del CSS sin uso, en el tramo 7.)* `--sidebar-bg`, `--sidebar-bg-gradient`, `--sidebar-width` en `style.css` ya no se usan; `.profile-badge` en `farmacia_style.css` tampoco; `.search-*`, `.nav-*` ya se quitaron. `bin/css_sin_uso.py` puede ayudar a una pasada general.
- **H-06 · Buscador de paciente.** El buscador de la barra sale en 17 páginas pero solo hace algo en Reuma (autocompletado) y en Farmacia (Enter → `farmacia_index.html?cip=`). La auditoría visual de Farmacia (06-06) ya anotó que el de Inicio «no hace nada visible». Decidir si es un buscador único del sistema (pieza con contrato) o se quita donde no sirve.
- **H-07 · Estado de BD y catálogo dentro de la barra.** Son bloques de la pantalla colocados en la barra por ser lo que había. El clic del indicador abre el selector de Excel (script.js); a medio plazo, la carga de datos pertenece a la pantalla, no a la barra.
- **H-08 · `previews/caceres-fh/`.** Copia de despliegue generada por `tools/build_caceres_fh_review_snapshot.mjs`; sigue con la barra vieja y la regex del pie ya no aplica. Hay que regenerarla cuando toque publicar Cáceres y adaptar el script.
- **H-09 · Terminar.** Antes, el botón de Reuma (`#logoutBtn`) llevaba a `reuma_index.html`; «Terminar» lleva a la Home y, hasta #713, solo olvida `hubSelectedProfessional`. Farmacia no tenía botón.
- **H-10 · `index.html` y `nexus_home.html`.** Son idénticos byte a byte a propósito (lo exige `nexus_home_root_equivalence_check`). La entrada antigua de Reuma es `reuma_index.html`. Pendiente de decidir si `nexus_home.html` sigue haciendo falta.
- **H-11 · Sangrías.** Las 17 páginas tienen el bloque `<nx-shell>` con sangría irregular (generado por script); se arregla en la pasada de limpieza del tramo 7.
- **H-12 · `nx-pagina` en pantallas antiguas.** Al probarlo en el `<body>` de las 17 páginas cambió 4 px la altura de un campo de fecha de Primera Visita (`box-sizing: border-box` global) y rompió dos checks. Se quitó. Cada pantalla adoptará `nx-pagina` cuando se migre (tramo 7), con sus capturas antes/después.
- **H-13 · Desborde horizontal en móvil de Profesionales de Reuma.** `manage_professionals.html` a 360 px se sale 184 px por su propia tarjeta (`management-card`); con la barra vieja eran 204 px. No es de la barra; a corregir al migrar esa pantalla.
- **H-14 · Estadísticas de Reuma sin datos escribe `console.error`.** «No hay datos cargados» es un estado normal, no un error; al migrar, pasar a un aviso (`avisar`) y no a la consola.

## Tramo 6 (aplicar la paleta)

- **H-15 · Colores en el JS.** Chart.js (`script_dashboard.js`, `script_estadisticas.js`, `treatmentEventsManager.js`), las escalas de actividad de `scoreCalculators.js` (`#28a745`, `#ffc107`, `#dc3545`…), `formController.js` y los chips de EA de `farmacia_seguimiento.js` (`#008777`/`#E6F4F1`, que fija `farmacia_ea_suspect_identity_browser_check`) siguen con hex propios. Llevan significado clínico: decidir su paleta en el tramo 7.
- **H-16 · Sombras.** Pasaron a `color-mix(var(--nx-color-texto) N%)` conservando cada sombra; unificarlas con `--nx-sombra-sm/md/lg` al migrar cada pantalla.
- **H-17 · `style="…"` en el HTML.** Quedan 4 atributos `style` con color en las páginas; pasarlos a clases al migrar.

## Tramo 7 (pantalla a pantalla)

- **H-18 · Estado del catálogo dentro de la pantalla.** `farmacia_common.js` da a todo `[data-catalog-status]` el aspecto de la barra (`catalog-sidebar-status`), también al que está en el contenido (Inicio de Farmacia). En las pantallas migradas se marca con `data-catalog-solo-texto` y solo se escribe el texto; al migrar Inicio, hacer lo mismo.
- **H-19 · Degradado de fondo del contenido.** Las pantallas migradas siguen con el fondo degradado de `.main-content` (regla sin capa de `style.css`, H-03), porque los scripts de Farmacia buscan `main.main-content` (H-02). Se quita al resolver H-02/H-03.

**H-20 (tanda 2a, 21-11).** Actividad del servicio e Inicio de Farmacia pintan sus tarjetas desde JS con clases viejas (`pending-validation-card`, `dashboard-card`, `prebio-chip`, `status-badge`), compartidas y con 7 checks atados. Marco migrado; las tarjetas piden una pieza «solicitud pendiente» y migrar JS y checks a la vez (tanda 3).
