# Deuda Técnica — Farmacia Hospitalaria v0.1
**Fecha:** 2026-06-06  
**Rama:** `work/hermes/nightly-farmacia-v0-1-20260606`  
**Estado:** pre-demo. Revisión post-demo pendiente.

---

## 1. Deuda corregida en esta iteración (WO-029 / WO-030 / WO-031)

### WO-029 — Pulido pre-demo
- `H-01`: Botón de cierre de overlay visible en mobile (36×36 px, círculo gris)
- `H-02`: Contador de fármacos en estadísticas corregido (4 → 3)
- `TD-02`: Dashboard propaga CIP en botones de acción
- `UX-01`: Campos condicionales en Seguimiento ocultos hasta activarse
- `UX-03`: Fecha de seguimiento se rellena con la fecha actual
- `WCAG-04`: Focus visible en botones (`:focus-visible` outline verde SES)
- `WCAG-06`: `aria-hidden="true"` en icono del botón de cierre
- Campos `readonly` con estilo teal suave (precargados visibles)
- Overlay scrollable en mobile con padding-bottom

### WO-030 — Robustez pre-demo
- `Fix 1`: `renderPatientView()` migrado de `innerHTML` a DOM seguro (`createElement`/`textContent`)
- `Fix 2`: Guard "sin paciente" en Primera Visita y Seguimiento (banner orientativo con enlace)
- `Fix 3`: Nota patología no-HS usa clase CSS `.pathology-demo-note` en lugar de `style.cssText`
- `Fix 4`: Badge "En seguimiento" (followup) diferenciado de "Validado" — `.status-badge--followup` teal

### WO-031 — Deuda técnica pre-demo
- `Fix A`: `createOverlay()` en `farmacia_index.js` migrado de `innerHTML` estático a DOM puro. **0 `innerHTML` en scripts Farmacia.**
- `Fix B`: `insertNoCipBanner()` extraída a `farmacia_common.js` como `F.insertNoCipBanner()`. Eliminada duplicación en primera_visita.js y seguimiento.js.
- `Fix C`: Constante `F.DEMO_SESSION_NOTE` centralizada en common.js. Unifica las variantes de los 3 formularios.
- `Fix D`: Función `downloadFile()` extraída a `F.downloadFile()` en common.js. Disponible para futuros formularios.
- `Fix E`: Constante `F.STATES` en common.js, usada en `statusClass()`. Define los 4 estados del sistema.
- `Fix F`: Sección de comentario en `farmacia_style.css` para bloques WO-029/030.

---

## 2. Deuda técnica pendiente (post-demo)

### Alta prioridad (afecta mantenibilidad)

| ID | Descripción | Archivos afectados |
|----|-------------|-------------------|
| TD-01 | Sidebar HTML duplicado en 8 páginas | `farmacia_*.html` |
| TD-05 | Estado demo hardcodeado en `farmacia_common.js` (patients object) | `farmacia_common.js` |
| TD-06 | URLs de navegación hardcoded en `farmacia_index.js` y `farmacia_dashboard_paciente.js` | `farmacia_index.js`, `farmacia_dashboard_paciente.js` |
| TD-07 | `window.alert()` para validación en formularios | `farmacia_validacion.js` |

### Media prioridad (WCAG / accesibilidad)

| ID | Descripción | Archivos afectados |
|----|-------------|-------------------|
| WCAG-01 | Skip link al contenido principal ausente | Todos los HTMLs |
| WCAG-02 | Morisky-Green sin `<fieldset>/<legend>` para grupos radio | `farmacia_seguimiento.html` |
| WCAG-03 | Contraste marginal en textos `#64748B` sobre fondo blanco (ratio ~4.5:1 justo) | `farmacia_style.css` |
| WCAG-05 | Focus trap en Quick View overlay (Tab sale del panel) | `farmacia_index.js` |

### Baja prioridad (técnica / tooling)

| ID | Descripción | Archivos afectados |
|----|-------------|-------------------|
| TD-03 | Líneas HTML muy largas en algunos formularios | `farmacia_seguimiento.html`, `farmacia_primera_visita.html` |
| TD-04 | Font Awesome 6.0.0-beta3 (versión antigua) | Todos los HTMLs |
| TD-08 | `F.STATES` no usado en scripts fuera de common.js | `farmacia_validacion.js`, `farmacia_index.js`, etc. |

---

## 3. Lo que NO debe intentarse antes de la demo

- **Persistencia real**: No integrar con JARA, SES, Pharmatool ni ningún sistema externo.
- **Lectura de CSV real**: Los datos demo están hardcodeados en `farmacia_common.js`. No reemplazar.
- **Escritura a Excel/CSV**: El export TXT/CSV actual es solo de sesión. No añadir persistencia.
- **Refactor de sidebar**: Deduplicar el HTML del sidebar (TD-01) requiere templating o componentes. No hacerlo ahora.
- **Migración React/TypeScript**: Fuera de alcance hasta decisión arquitectural.
- **Seguridad productiva**: No añadir autenticación ni autorización reales.
- **Formateo masivo de HTML**: Los archivos HTML tienen líneas largas intencionales para minimizar tamaño. No reformatear.

---

## 4. Propuesta post-demo por fases

### Fase 1 — Fuente de datos real (CSV / backend básico)
- Reemplazar `patients` en `farmacia_common.js` por lectura de CSV o API REST mínima.
- Implementar persistencia de formularios (guardar seguimiento, validación, primera visita).
- Explorar Supabase o Google Sheets como backend de demo.

### Fase 2 — Componentes compartidos
- Extraer sidebar a un componente incluido (Web Components o include server-side).
- Crear sistema de routing simple (hash-based o query params centralizados).
- Consolidar `farmacia_common.js` en un módulo ES más estructurado.

### Fase 3 — Integración SES / JARA
- Definir contrato de API con sistemas hospitalarios.
- Implementar autenticación.
- Migrar datos de pacientes demo a estructura de datos real.

### Fase 4 — Accesibilidad avanzada
- Completar WCAG 2.1 AA: skip links, focus trap, contraste exacto.
- Revisar con lectores de pantalla.
- Añadir soporte teclado completo.

### Fase 5 — Testing automatizado
- Tests de integración con Playwright para flujos demo críticos.
- Tests unitarios para `farmacia_common.js` (statusClass, makeContextUrl, etc.).
- CI/CD para rama de staging.

---

## 5. Riesgos técnicos asumidos para la demo

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| **XSS residual** | `createOverlay()` ya migrado a DOM. No quedan `innerHTML` con datos de usuario. | ✅ Eliminado en WO-031 |
| **Datos hardcoded** | Todos los pacientes en `farmacia_common.js`. Si se añaden/modifican, requiere commit. | Aceptado para demo v0.1 |
| **Sin autenticación** | La app es totalmente abierta. No debe exponerse públicamente. | GitHub Pages con acceso controlado |
| **Sin validación servidor** | Toda la validación es client-side. Los datos se pierden al cerrar el navegador. | Explicitado en banner demo |
| **Font Awesome beta** | 6.0.0-beta3 tiene algunos iconos distintos de la versión final. | Bajo riesgo: iconos usados son estables |
| **Exportación básica** | TXT/CSV se genera solo en cliente sin firma ni trazabilidad. | Solo para demo visual, no uso clínico |

---

*Documento generado: WO-031, 2026-06-06. Builder: Claude Code / Sonnet 4.6.*
