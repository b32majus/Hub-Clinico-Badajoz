# DESIGN.md — Sistema de diseño de PROMueve Nexus

**Estado:** tramo 1 de #956 (2026-11-21): variables y base cargadas en las 19 páginas, sin uso todavía. Se completa por tramos.
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
- Tres puntos de cambio a móvil (valores en el tramo 4). El diseño principal es de escritorio (ADR-009 R4).
- Sin estilos en línea. Nunca `innerHTML`.
- Solo lo que Edge y Chrome actualizados traen de serie, sin compilar (ADR-009 R3).
- Accesibilidad WCAG 2.1 AA: foco visible, teclado, contraste y nunca solo color (R8).
- Nada se carga desde fuera: letra, iconos y gráficos van en `vendor/` (R2).

## 4. Catálogo de piezas

*Pendiente del tramo 4.* Cada pieza tendrá aquí su nombre, para qué se usa, sus variantes, sus estados (normal, foco, desactivado, cargando, error, vacío) y su ejemplo en la página de muestra.

Lista prevista:
- `<nx-shell>`
- botón
- campo y buscador
- tabla
- pestañas
- tarjeta
- `<nx-aviso>`: aviso y notificación
- ventana emergente y confirmación: `<dialog class="nx-dialogo">` nativo, sin componente propio (el navegador ya da el modo modal, el foco, Esc y la vuelta del foco)
- etiqueta

## 5. Biblioteca común (`modules/nexus/`, tramo 3)

Módulos ES con rutas relativas (funcionan bajo subruta, R1). Se importan desde `modules/nexus/index.js`. Ninguna pantalla los usa todavía; cada una los adopta al migrarse (tramo 7) y entonces se borran sus funciones repetidas.

- **Texto** (`texto.js`): `escaparHtml(valor)` (los cinco caracteres; `null` → vacío), `normalizarTexto(valor)` (sin tildes, minúsculas, espacios colapsados) y `claveBusqueda(valor)` (solo `a-z0-9`, para comparar identificadores y nombres).
- **Fechas** (`fechas.js`): `leerFecha(valor)` acepta `AAAA-MM-DD` (con o sin hora; vale el día escrito), `DD/MM/AAAA`, `Date` y número de serie de Excel; devuelve el día local o `null`, nunca una fecha desbordada (`31/02` no es marzo). `fechaIso`, `fechaCorta` (`05/01/2024`) y `fechaLarga` (`5 de enero de 2024`) devuelven vacío si no hay fecha.
- **Avisos** (`avisos.js`, R6): `avisar(texto, { tipo, titulo })` con `tipo` = `error`, `aviso`, `ok` o `info`. Pone un `<nx-aviso>` en una zona única «Avisos» de la página. El aviso lleva su etiqueta en texto («Error», «Atención», «Hecho», «Información»: nunca solo color), se anuncia al lector de pantalla y no se cierra solo; «Cerrar» pasa el foco al siguiente aviso.
- **Confirmación** (`avisos.js`): `await confirmar({ titulo, texto, aceptar, cancelar, peligro })` → `true`/`false`. Abre un `<dialog>` modal; con `peligro` el foco empieza en «Cancelar». Sustituye a `confirm()`.
- Nada de `alert()`, `confirm()`, `innerHTML`, estilos ni colores dentro de la biblioteca: el aspecto llega con el catálogo (tramo 4). Lo comprueban `tools/nexus_modulos_check.mjs` (CI) y `tools/nexus_modulos_browser_check.mjs`.

## 6. Cómo se trabaja

Norma de trabajo visual (Sil, 21-11):

- El trabajo mecánico lo hace el modelo barato.
- Lo que es diseño (una pantalla nueva o una redistribución) lleva maqueta del modelo fuerte, aprobada por Sil.
- En el trabajo mixto, el modelo barato hace la función y coloca piezas del catálogo.
- Siempre hay capturas de antes y después: lo que no se tocaba debe salir idéntico.
