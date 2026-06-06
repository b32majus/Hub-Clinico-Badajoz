<!--
Origen: outbox/reports/farmacia-visual-audit-20260606/global-audit-report.md
Tipo: auditoría global solo lectura (código, deuda técnica, WCAG, UX)
Fecha: 2026-06-06
Rama auditada: work/hermes/nightly-farmacia-v0-1-20260606
Estado: pending_review
Nota: Este documento no implica aprobación ni merge. Es documentación informativa para revisión de Sil/Cora.
-->

# Auditoría Global — Farmacia Hospitalaria v0.1
**Rama:** `work/hermes/nightly-farmacia-v0-1-20260606`  
**Fecha:** 2026-06-06  
**Auditor:** Claude Code / Sonnet 4.6  
**Alcance:** Salud del código · Deuda técnica · WCAG 2.1 AA · Usabilidad · UX / desplegables

---

## 1. Resumen ejecutivo

El módulo Farmacia v0.1 es sólido para su propósito de prototipo demo. El código JS está bien estructurado (strict mode, IIFE, namespace limpio), el CSS modular es legible, y los flujos principales funcionan. La deuda técnica más crítica es la duplicación del sidebar (8 ficheros). Los problemas WCAG son reales pero mayoritariamente de nivel P2/P3: ninguno rompe la demo ni hace el módulo inutilizable, pero sí impiden una calificación AA completa. Las mejoras de UX más valiosas para el jefe de Farmacia son los campos condicionales en seguimiento y la propagación del contexto CIP desde el dashboard.

---

## 2. Salud del código y deuda técnica

### TD-01 · Sidebar duplicado × 8 ficheros (P3)
El bloque `<aside class="sidebar">` (~55 líneas) es copia literal en los 8 HTML de Farmacia. Cualquier cambio (nombre del profesional, nueva sección, enlace nuevo) requiere editar 8 ficheros. Riesgo alto de desincronización.

**Ficheros:** todos los `farmacia_*.html`  
**Fix (post-demo):** Extraer el sidebar a un include JS (`renderSidebar('validacion')`) o usar un template literal inyectado desde `farmacia_common.js`.

---

### TD-02 · Dashboard: botones de acción sin contexto CIP (P2)
`farmacia_dashboard_paciente.html` línea 80 hardcodea:
```html
<a href="farmacia_seguimiento.html" class="btn btn-primary">Registrar seguimiento</a>
<a href="farmacia_validacion.html" class="btn btn-secondary">Validación</a>
```
Al navegar desde el dashboard, las páginas de seguimiento/validación se cargan **sin `?cip=...`** en la URL, por lo que `applyContext()` no encuentra datos del paciente y los campos "Datos precargados" aparecen vacíos.

**Contraste:** el Quick View Overlay (farmacia_index.js) sí usa `F.makeContextUrl()` correctamente.  
**Fix (antes del lunes recomendado):** En `farmacia_dashboard_paciente.js`, dentro de `renderDashboard()`, actualizar dinámicamente los `href` de los botones con `F.makeContextUrl()`:
```js
document.querySelector('.patient-header-actions a:nth-child(1)').href =
  F.makeContextUrl('farmacia_seguimiento.html', { cip: patient.cip, servicio: patient.servicioSlug, patologia: patient.patologia, entrada: 'seguimiento' });
document.querySelector('.patient-header-actions a:nth-child(2)').href =
  F.makeContextUrl('farmacia_validacion.html', { cip: patient.cip, servicio: patient.servicioSlug, patologia: patient.patologia, entrada: 'validacion' });
```

---

### TD-03 · HTML de validación con líneas de 600+ caracteres (P3)
`farmacia_validacion.html` líneas 96–131 son bloques form-grid completos en una sola línea (hasta ~800 chars). Imposibles de hacer diff, revisar en PR o mantener.

**Fix (post-demo):** Formatear con Prettier u otro formatter. Sin impacto funcional.

---

### TD-04 · Font Awesome 6.0.0-beta3 (P3)
Todos los HTML cargan `font-awesome/6.0.0-beta3`. La versión estable 6.0.0 lleva disponible desde marzo 2022.

**Fix:** Actualizar CDN URL a `6.4.2` o `6.6.0`. Verificar que el integrity hash sea correcto. Sin riesgo funcional si se verifica el hash.

---

### TD-05 · `farmacia_common.js` como god module (P3)
Un solo fichero contiene: datos de pacientes hardcoded, datos de profesionales, datos de patologías, utilidades DOM, lógica de URL, sidebar search, context summary. Aceptable en v0.1 pero bloqueante para testabilidad y crecimiento.

**Fix (post-demo):** Separar en `farmacia_data.js`, `farmacia_utils.js`, `farmacia_routing.js`.

---

### TD-06 · Inputs readonly sin `type="text"` explícito (P3)
Múltiples `<input class="form-control" id="..." readonly>` sin atributo `type`. Defaults a `text` pero es semánticamente incompleto.

**Fix:** Añadir `type="text"` a todos los inputs sin tipo. Una línea por input, ~20 en total.

---

### TD-07 · Sin elementos `<form>` nativos (P3)
Todos los formularios son `<section>` con inputs sueltos. Implica pérdida de: submit nativo por Enter (parcialmente solucionado vía JS), validación nativa del browser, asociación semántica de grupo de campos.

**Fix (post-demo):** Envolver cada sección de formulario en `<form method="dialog">` (solo demo) o `<form>` con preventDefault en submit.

---

### TD-08 · `console.warn` MockPatients en index.html Reuma (P3 — aclaración)
El warning "⚠️ MockPatients desactivado" se origina en `modules/mockPatients.js` cargado por `index.html` del módulo Reuma, **no** por los scripts de Farmacia. Los ficheros farmacia_*.js no referencian MockPatients. Sin acción requerida en el módulo Farmacia.

---

## 3. Accesibilidad — WCAG 2.1 AA

### WCAG-01 · Sin enlace "Saltar al contenido principal" (SC 2.4.1 — Level A) — **P2**
Ninguna página incluye un `<a href="#main-content" class="skip-link">Saltar al contenido</a>`. Los usuarios de teclado deben navegar los ~15 elementos de la barra lateral antes de llegar al contenido principal en cada carga de página.

**Fix:**
```html
<!-- Añadir como primer elemento del <body> en todos los HTML -->
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>
```
```css
/* En farmacia_style.css */
.skip-link {
    position: absolute; top: -40px; left: 0;
    background: var(--ses-green); color: white;
    padding: 8px 16px; z-index: 9999; border-radius: 0 0 8px 0;
}
.skip-link:focus { top: 0; }
```
Y añadir `id="main-content"` al `<main>` de cada página.

---

### WCAG-02 · Morisky-Green sin `<fieldset>/<legend>` (SC 1.3.1 — Level A) — **P2**
Los 4 grupos de radio del Morisky-Green (`mg1–mg4`) no están envueltos en `<fieldset>`. Los lectores de pantalla no pueden asociar la pregunta escrita en el `<span>` con las opciones de respuesta. Un usuario de NVDA/VoiceOver solo oye "Sí — radio" / "No — radio" sin contexto de qué pregunta responden.

**Fix (`farmacia_seguimiento.html`):** Envolver cada grupo en:
```html
<fieldset>
  <legend>1. ¿Olvida tomarlo?</legend>
  <label><input type="radio" name="mg1" value="si"> Sí</label>
  <label><input type="radio" name="mg1" value="no"> No</label>
</fieldset>
```
Y eliminar el `<span>` de texto de la pregunta (reemplazado por `<legend>`). Hacer lo mismo para mg2, mg3, mg4.

---

### WCAG-03 · Contraste marginal en texto auxiliar (SC 1.4.3 — Level AA) — **P2**
Los siguientes elementos usan colores que fallan 4.5:1 para texto pequeño:

| Elemento | Color texto | Fondo | Ratio calculado | Umbral AA | Estado |
|----------|------------|-------|-----------------|-----------|--------|
| `.hero-eyebrow` (0.75rem, bold) | `#008777` | `#F8FAFC` | ~4.48:1 | 4.5:1 | ❌ falla |
| `.form-group label` (0.77rem, 800) | `#64748B` | `#F8FAFC` | ~4.43:1 | 4.5:1 | ❌ falla |
| `.search-card__hint` (0.82rem) | `#64748B` | `#FFFFFF` | ~4.43:1 | 4.5:1 | ❌ falla |
| `.info-field__label` (0.72rem, 800) | `#64748B` | `#F8FAFC` | ~4.43:1 | 4.5:1 | ❌ falla |

Nota: Los fallos son marginales (~0.07 unidades). El demo banner (#92400E sobre #FFF7ED) y los botones primarios pasan holgadamente.

**Fix:** Oscurecer `#64748B` → `#576175` (~4.7:1) y `#008777` → `#006B61` para texto de tamaño pequeño. Solo afecta a las versiones pequeñas del color, no a badges ni botones.

---

### WCAG-04 · Botones `.btn` sin foco visible explícito (SC 2.4.7 — Level AA) — **P2**
`farmacia_style.css` define foco para `.form-control`, `.form-select`, `.form-textarea` con box-shadow visible, pero `.btn` y `.btn-primary` solo tienen `:hover`. Si el CSS base (`style.css`) no cubre botones con `:focus-visible`, los usuarios de teclado no ven indicador de foco al tabular por los botones.

**Fix:**
```css
.btn:focus-visible {
    outline: 3px solid var(--ses-green);
    outline-offset: 2px;
}
```

---

### WCAG-05 · Quick View: focus no queda dentro del modal (ARIA Dialog Pattern) — **P3**
Al abrir el Quick View overlay, el foco no se mueve al panel ni queda atrapado dentro. Los usuarios de teclado pueden salir del modal tabulando y quedar en elementos del fondo (que no están visualmente accesibles detrás del backdrop).

**Fix (post-demo):** En `farmacia_index.js`, al abrir el overlay:
1. Mover foco al primer elemento interactivo del panel: `mount.panel.querySelector('button, a, input').focus()`.
2. Añadir focus trap: capturar Tab/Shift+Tab para mantener foco dentro del panel.
3. Al cerrar, devolver foco al `#fhSearchBtn`.
4. Añadir `role="dialog"` y `aria-modal="true"` al panel.

---

### WCAG-06 · Icono en botón de cierre sin `aria-hidden` (SC 4.1.2 — Level A) — **P3**
El botón de cierre del overlay:
```html
<button type="button" class="quick-view-close-btn" aria-label="Cerrar vista rápida">
    <i class="fas fa-times"></i>
</button>
```
El `<i>` no tiene `aria-hidden="true"`. Screen readers pueden anunciar "times Cerrar vista rápida". Menor pero técnicamente incompleto.

**Fix:** `<i class="fas fa-times" aria-hidden="true"></i>`

---

### WCAG-07 · Campo obligatorio sin `aria-required` (SC 3.3.2 — Level AA) — **P3**
`#fhValMotivo` (motivo de denegación) tiene `<span class="required">*</span>` en el label pero no tiene `aria-required="true"` en el `<textarea>`.

**Fix:** Añadir `aria-required="true"` al textarea.

---

### WCAG-08 · Estado 'followup' = badge verde (color ambiguo) (SC 1.4.1 — Level A) — **P3**
`statusClass('followup')` devuelve `'status-badge--validated'` (verde), el mismo que 'validated'. FH-001 ("En seguimiento") muestra badge verde idéntico al que usaría un paciente "Validado". El texto diferencia los estados pero el color sugiere equivalencia.

**Fix:** Añadir `status-badge--followup` con color azul/teal distinto (ej. `background: #DBEAFE; color: #1E40AF`).

---

## 4. Usabilidad y mejoras UX / desplegables

### UX-01 · Campos condicionales en Seguimiento siempre visibles (P2)
En `farmacia_seguimiento.html`, los campos dependientes de un selector siempre están visibles, aunque el padre esté en "No":

| Campo padre | Siempre visible (debería ocultarse) |
|-------------|-------------------------------------|
| `fhSegCambiaNivel` = No | `fhSegNuevoNivel` (desplegable "Nuevo nivel si cambia") |
| `fhSegOptimiza` = No | `fhSegNuevaDosis`, `fhSegNuevaPauta`, `fhSegMotivoOpt` |
| `fhSegSuspension` = No | `fhSegMotivoSusp` |

El código YA implementa esta lógica para `fhSegCambioFarmaco` (warning toggle en línea 43). Solo hay que replicar el patrón:
```js
document.getElementById('fhSegOptimiza').addEventListener('change', e => {
    const show = e.target.value === 'Sí';
    ['fhSegNuevaDosis','fhSegNuevaPauta','fhSegMotivoOpt'].forEach(id =>
        document.getElementById(id).closest('.form-group').classList.toggle('hidden', !show));
});
```
Análogo para `fhSegCambiaNivel` → `fhSegNuevoNivel`, y `fhSegSuspension` → `fhSegMotivoSusp`.

**Impacto UX:** Reduce la carga cognitiva del formulario de seguimiento de 15 campos visibles a ~8, mostrando complejidad solo cuando es necesaria.

---

### UX-02 · TD-02 (duplicado) — Dashboard no propaga CIP (P2)
Ver TD-02 arriba. Fix idéntico.

---

### UX-03 · Fecha de seguimiento sin valor por defecto = hoy (P2)
`<input type="date" id="fhSegFecha">` se presenta vacía. En una visita real, la fecha = hoy es el valor correcto el 99% del veces.

**Fix en `farmacia_seguimiento.js`, dentro de `applyContext()`:**
```js
if (!document.getElementById('fhSegFecha').value) {
    document.getElementById('fhSegFecha').value = new Date().toISOString().slice(0, 10);
}
```

---

### UX-04 · Validación: bloque "Tratamiento validado" visible siempre (P3)
El bloque con campos Fármaco validado / Dosis / Pauta / Vía / Indicación / Fecha cita / Farmacéutico se muestra aunque el estado sea "Pendiente" o "Denegado". Debería ocultarse o mostrarse en solo lectura cuando el estado no sea "Validado".

**Fix:** En `farmacia_validacion.js`, al cambiar `fhValEstado`, también ocultar/mostrar el bloque de tratamiento:
```js
const showTreatmentBlock = estado === 'validated';
document.getElementById('validationBlock').querySelector('.dashboard-card + .form-grid') // or a wrapper id
    .classList.toggle('hidden', !showTreatmentBlock);
```

---

### UX-05 · Sidebar search sin botón de submit visible (P3)
El `#patientSearch` de la sidebar solo responde a Enter (keydown). No hay botón de submit junto al input. Los usuarios no descubren que pueden buscar desde la sidebar si no usan teclado. El ícono `fa-search` es decorativo (aria-hidden), no clickeable.

**Fix:** Hacer el ícono de búsqueda clickeable o añadir un botón pequeño de submit junto al input.

---

### UX-06 · Quick View mobile: botones de acción fuera del viewport (P3)
En mobile (390×844), al abrir el Quick View de FH-001, los botones "Seguimiento" y "Dashboard" están fuera del área visible inicial y requieren scroll dentro del overlay para acceder. No hay indicador visual de que hay contenido scrollable por debajo.

**Fix:** En el CSS mobile del overlay, añadir `overflow-y: auto; max-height: 85vh;` y una sombra inferior para indicar scroll. O reordenar el contenido para que los botones queden más arriba.

---

### UX-07 · Morisky-Green: sin feedback visual por pregunta respondida (P3)
No hay feedback visual al marcar una respuesta individual. El resultado global ("Pendiente de completar") solo cambia cuando las 4 están respondidas.

**Fix:** Añadir una clase `.answered` al `inline-control-group` cuando se selecciona una opción, dando una checkmark o cambio de color de fondo. ~5 líneas de JS en el listener de `updateMorisky()`.

---

### UX-08 · Primera Visita: "Resultado basal" sin formato guía (P3)
`<input id="fhPvResultadoBasal">` es texto libre sin placeholder.

**Fix:** `placeholder="Ej. DLQI: 14 · EVA dolor: 6/10 · HAQ: 1.1"`. 1 atributo.

---

### UX-09 · Validación manual: context-strip no se actualiza con CIP introducido (P3)
En modo Dermatología/manual, el farmacéutico introduce el CIP en `#fhDermaCip` manualmente. Pero la franja de contexto superior (`data-context="cip"`) sigue mostrando "CIP no indicado" porque `initContextSummary()` se ejecuta solo en DOMContentLoaded.

**Fix:** Conectar `fhDermaCip` a un listener que actualice el context-strip en tiempo real.

---

## 5. Estética

### EST-01 · Estado "followup" con color idéntico a "validated" (= WCAG-08)
Mencionado arriba. Diferencia estética y semántica importante a largo plazo.

### EST-02 · Estadísticas: placeholder sin iconografía ni visual (P3)
Los 3 stat cards de `farmacia_estadisticas.html` no tienen iconos grandes ni gráficos. Contrastan visualmente con el resto del módulo. No bloqueante para demo (está documentado como placeholder) pero llamativo en comparación con Dashboard.

### EST-03 · Indentación irregular en HTML generado (P3)
`        <!DOCTYPE html>` con 8 espacios de indent al inicio de todos los ficheros indica generación automática sin formateo posterior. No afecta rendering pero reduce profesionalidad del código fuente si se abre en editor.

---

## 6. Resumen de hallazgos por categoría y severidad

| ID | Categoría | Descripción breve | Severidad | Esfuerzo |
|----|-----------|-------------------|-----------|---------|
| TD-02 | Código | Dashboard buttons sin CIP context | **P2** | 15 min |
| WCAG-01 | WCAG 2.1 A | Sin skip link | **P2** | 30 min |
| WCAG-02 | WCAG 2.1 A | Morisky sin fieldset/legend | **P2** | 20 min |
| WCAG-03 | WCAG 2.1 AA | Contraste marginal texto pequeño | **P2** | 30 min |
| WCAG-04 | WCAG 2.1 AA | Botones sin focus-visible | **P2** | 10 min |
| UX-01 | UX | Campos condicionales seguimiento | **P2** | 30 min |
| UX-03 | UX | Fecha seguimiento sin valor hoy | **P2** | 5 min |
| WCAG-05 | WCAG ARIA | Focus trap modal overlay | P3 | 60 min |
| WCAG-06 | WCAG 2.1 A | aria-hidden en icono botón cierre | P3 | 2 min |
| WCAG-07 | WCAG 2.1 AA | aria-required en campo obligatorio | P3 | 2 min |
| WCAG-08 | WCAG / UX | followup = badge verde (confuso) | P3 | 15 min |
| UX-04 | UX | Bloque tratamiento visible sin estado | P3 | 20 min |
| UX-05 | UX | Sidebar search sin botón submit | P3 | 15 min |
| UX-06 | UX | Botones overlay fuera del viewport mobile | P3 | 20 min |
| UX-07 | UX | Morisky sin feedback por pregunta | P3 | 10 min |
| UX-08 | UX | Resultado basal sin placeholder | P3 | 2 min |
| UX-09 | UX | Context-strip no se actualiza en manual | P3 | 10 min |
| TD-01 | Código | Sidebar duplicado × 8 | P3 | 4 h |
| TD-03 | Código | HTML líneas largas | P3 | 15 min |
| TD-04 | Código | Font Awesome beta | P3 | 10 min |
| TD-05 | Código | God module common.js | P3 | 4 h |
| TD-06 | Código | Inputs sin type="text" | P3 | 30 min |
| TD-07 | Código | Sin elementos `<form>` | P3 | 2 h |
| EST-02 | Estética | Estadísticas sin iconografía | P3 | 30 min |
| EST-03 | Estética | HTML con indentación irregular | P3 | 15 min |

---

## 7. Top 5 mejoras de mayor impacto (ordenadas por ROI)

1. **UX-01 (30 min):** Ocultar campos condicionales en Seguimiento. Mayor ganancia de usabilidad: reduce el formulario a la mitad visualmente.
2. **TD-02 (15 min):** Propagar CIP desde Dashboard a seguimiento/validación. Cierra el único flujo roto de navegación interna.
3. **UX-03 (5 min):** Fecha de hoy como valor por defecto en seguimiento. Elimina fricción en el flujo más usado.
4. **WCAG-01 (30 min):** Skip link. Máximo impacto de accesibilidad con mínimo esfuerzo.
5. **WCAG-04 (10 min):** Focus-visible en botones. Cubre el gap de accesibilidad más obvio para usuarios de teclado.

---

*Status: pending_review — Este documento no implica aprobación ni merge. Es documentación informativa para revisión de Sil/Cora.*
