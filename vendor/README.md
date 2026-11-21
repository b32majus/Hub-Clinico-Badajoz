# vendor/ — dependencias guardadas dentro de la app

Nexus no carga nada desde fuera para funcionar (ADR-009 R2, #715). Lo que antes venía de un CDN está aquí, con la **misma versión** que se usaba, para que el aspecto no cambie.

El inventario que se puede comprobar está en `MANIFEST.json`: versión, origen, licencia y huella sha256 de cada fichero. Lo verifica `tools/nexus_sin_externos_browser_check.mjs`.

| Carpeta | Qué es | Versión | Licencia | Quién la usa |
|---|---|---|---|---|
| `fontawesome/` | Iconos Font Awesome Free | 6.0.0-beta3 | Iconos CC BY 4.0, fuentes SIL OFL 1.1, código MIT | 17 páginas de Reuma y Farmacia |
| `chartjs/` | Chart.js, plugin de anotaciones y adaptador de fechas (con date-fns) | 4.4.0 / 3.0.1 / 3.0.0 | MIT | `dashboard_paciente.html`, `estadisticas.html` |
| `inter/` | Letra Inter, subconjuntos latin y latin-ext | Google Fonts v20 | SIL OFL 1.1 | `style.css` |
| `sheetjs/` | Lectura y exportación de Excel | 0.18.5 | Apache 2.0 | Reuma y Farmacia |

## Procedencia (21-11-2026)

- Font Awesome: descargada de cdnjs. La hoja coincide con la huella SRI que llevaban las páginas y las fuentes coinciden byte a byte con el paquete de npm `@fortawesome/fontawesome-free@6.0.0-beta3`.
- Chart.js y sus dos complementos: descargados de jsDelivr. Coinciden con las huellas SRI que llevaban las páginas.
- Inter: los mismos ficheros que Google Fonts sirve a Chrome. Solo se guardan los subconjuntos latin y latin-ext, que cubren el español. Licencia del proyecto Inter (github.com/rsms/inter).

## Cómo se actualiza

Nunca automáticamente (#715, «NO TOCA»). Para cambiar una versión:

1. Una PR propia.
2. Descargar y contrastar con una segunda fuente (SRI publicado o npm).
3. Regenerar `MANIFEST.json`.
4. Capturas de antes y después de las páginas que la usan.

`previews/caceres-fh/` es una copia congelada y sigue usando los CDN: no se toca.
