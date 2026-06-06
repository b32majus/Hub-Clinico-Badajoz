<!--
Origen: outbox/reports/farmacia-visual-audit-20260606/visual-audit-report.md
Tipo: auditoría visual solo lectura
Fecha: 2026-06-06
Rama auditada: work/hermes/nightly-farmacia-v0-1-20260606
Estado: pending_review
Nota: Este documento no implica aprobación ni merge. Es documentación informativa para revisión de Sil/Cora.
-->

# Auditoría Visual — Farmacia Hospitalaria v0.1
**WO-028 | Fecha:** 2026-06-06  
**Auditor:** Claude Code / Sonnet 4.6 (WO-028, operado por KairOS)  
**Rama auditada:** `work/hermes/nightly-farmacia-v0-1-20260606`  
**Entorno:** Servidor local `http://localhost:8765` · rama clean · sin modificaciones

---

## 1. Resumen ejecutivo

El módulo Farmacia Hospitalaria v0.1 es visualmente coherente con el Hub Clínico Reuma, funciona correctamente en los flujos demo principales y no presenta errores JS ni 404. Los cinco flujos demo verificados (FH-001, FH-002, FH-003, TEST y alta guiada) responden exactamente según la especificación. El único hallazgo P1 (botón de cierre del overlay casi invisible en mobile) es corregible en menos de 10 minutos. No se detectó ningún P0.

---

## 2. Veredicto

```
ready_with_minor_fixes
```

La demo del lunes es viable. Con el fix P1 aplicado y opcionalmente los P2 de mayor impacto, el módulo puede calificarse como **ready_for_demo**.

---

## 3. Tabla de hallazgos priorizados

| ID | Pantalla | Descripción | Severidad | Riesgo corrección | Archivos probables | Recomendación |
|----|----------|-------------|-----------|-------------------|--------------------|---------------|
| H-01 | `farmacia_index.html` (mobile/tablet) | Botón de cierre del Quick View overlay aparece como un punto gris minúsculo, sin texto ni tamaño táctil adecuado. Dificulta o impide cerrar el overlay en mobile. | **P1** | Bajo | `farmacia_style.css`, `farmacia_index.js` | Corregir antes del lunes |
| H-02 | `farmacia_estadisticas.html` | Contador "Fármacos demo: 4" pero `farmacia_farmacos.html` muestra 3 fármacos. Inconsistencia numérica llamativa. | **P2** | Bajo | `farmacia_estadisticas.html` | Corregir antes del lunes |
| H-03 | `farmacia_index.html` | Sidebar contiene input de búsqueda (`patientSearch`) no conectado a la lógica del buscador CIP (`fhCipInput`). Usuario puede intentar buscar en sidebar y no obtener resultado. | **P2** | Bajo | `farmacia_index.html` | Corregir antes del lunes |
| H-04 | `farmacia_seguimiento.html`, `farmacia_primera_visita.html` | Acceso directo sin CIP context muestra sección "Datos precargados" con etiquetas vacías, que parece formulario roto. | **P2** | Bajo | Ambas páginas HTML | Corregir antes del lunes |
| H-05 | Sidebar global | Enlace "← Reumatología" lleva a pantalla de carga XLSX sin estado previo. En demo comparativa entre módulos puede confundir. | **P2** | Bajo | Sidebar parcial en todos los HTML | Dejar post-demo |
| H-06 | Tablet (1024×768) | Sidebar se convierte en dropdown overlay al hacer clic en logo, solapándose al contenido. Funcional pero diferente del patrón desktop. | **P3** | Medio | `style.css` | Dejar post-demo |
| H-07 | `farmacia_validacion.html` (sin context) | Tabs muestran "CIP no indicado / Servicio no indicado / Patología no indicada". Esperado pero podría tener un placeholder más amigable. | **P3** | Bajo | `farmacia_validacion.html`, JS | Dejar post-demo |
| H-08 | `farmacia_estadisticas.html` | Placeholder muy básico (3 cards). Comunicado como out-of-scope, pero contrasta con el resto del módulo. | **P3** | Bajo | `farmacia_estadisticas.html` | Dejar post-demo |
| H-09 | `farmacia_dashboard_paciente.html` | Sin CIP context carga FH-001 como paciente por defecto en lugar de mostrar estado "sin paciente seleccionado". | **P3** | Bajo | `scripts/farmacia_dashboard_paciente.js` | Dejar post-demo |
| H-10 | Todas las páginas (consola) | `console.warn` "MockPatients desactivado" en todas las páginas. No es error JS, no visible al usuario, pero aparece en devtools abiertos. | **P3** | Bajo | `scripts/farmacia_common.js` | Dejar post-demo |

---

## 4. Top 5 fixes recomendados antes del lunes

### Fix 1 — H-01: Botón cierre Quick View en mobile (P1, riesgo BAJO)
**Problema:** El botón `.quick-view-close-btn` en mobile tiene estilo que lo hace casi invisible (fondo sin contraste, tamaño sin min-width táctil).  
**Solución:** En `farmacia_style.css`, añadir al `.quick-view-close-btn`:
```css
min-width: 36px;
min-height: 36px;
background: #E2E8F0;
color: #1E293B;
border-radius: 50%;
```
O simplemente añadir `aria-label="Cerrar"` visible y font-size 1.1rem.

### Fix 2 — H-02: Inconsistencia Fármacos 4 vs 3 (P2, riesgo BAJO)
**Problema:** `farmacia_estadisticas.html` hardcodea "4", `farmacia_farmacos.html` tiene 3 fármacos.  
**Solución:** Cambiar "4" a "3" en el stat card de Fármacos en `farmacia_estadisticas.html`. 1 línea.

### Fix 3 — H-03: Sidebar search no funcional en index (P2, riesgo BAJO)
**Problema:** Input `#patientSearch` en sidebar en `farmacia_index.html` no hace nada.  
**Solución A:** Ocultar el input de sidebar solo en `farmacia_index.html` (override CSS). Riesgo mínimo.  
**Solución B:** Conectar su evento `input` para copiar el valor a `#fhCipInput`. 3 líneas de JS.

### Fix 4 — H-04: "Datos precargados" vacíos en seguimiento/primera visita (P2, riesgo BAJO)
**Problema:** Sin contexto URL, los campos del bloque "Datos precargados" aparecen con etiquetas pero sin valores.  
**Solución:** Añadir un mensaje condicional: si no hay CIP context, mostrar nota "Navega desde el buscador CIP para cargar datos del paciente." y ocultar el bloque de campos. 5 líneas de JS.

### Fix 5 — H-05: Enlace Reumatología lleva a pantalla vacía (P2, riesgo BAJO)
**Acción mínima:** Añadir tooltip/title al enlace `← Reumatología` en la sidebar: `title="Módulo Reumatología (requiere carga de datos)"`. 1 atributo HTML, riesgo cero.

---

## 5. Fixes que NO recomienda tocar antes del lunes

- **H-06 (tablet nav dropdown):** Funciona correctamente, no es un bloqueador visual.
- **H-07 (validacion sin context):** Flujo esperado; el acceso correcto es via Quick View.
- **H-08 (estadísticas placeholder):** Está documentado y declarado como out-of-scope en la propia página.
- **H-09 (dashboard default FH-001):** FH-001 es el paciente de seguimiento principal del flujo demo. Que aparezca como default es aceptable para la demo.
- **H-10 (console.warn MockPatients):** No visible al usuario, no es error. No tocar.

---

## 6. Checklist de flujos probados

| Flujo | Resolución | Estado overlay | Badge estado | Botones acción | Resultado |
|-------|-----------|----------------|-------------|----------------|-----------|
| Buscar CIP-DEMO-FH-001 | 1440×900 | ✅ visible | ✅ En seguimiento | ✅ Seguimiento + Dashboard | PASS |
| Buscar CIP-DEMO-FH-001 | 390×844 | ✅ visible | ✅ En seguimiento | ✅ Seguimiento + Dashboard | PASS |
| Buscar CIP-DEMO-FH-001 | 1024×768 | ✅ visible | ✅ En seguimiento | ✅ Seguimiento + Dashboard | PASS |
| Buscar CIP-DEMO-FH-002 | 1440×900 | ✅ visible | ✅ Pendiente | ✅ Validación + Dashboard | PASS |
| Buscar CIP-DEMO-FH-002 | 390×844 | ✅ visible | ✅ Pendiente | ✅ Validación + Dashboard | PASS |
| Buscar CIP-DEMO-FH-003 | 1440×900 | ✅ visible | ✅ Validado | ✅ Primera Visita + Dashboard | PASS |
| Buscar CIP-DEMO-TEST | 1440×900 | ❌ no aplica | —  | Panel alta guiada visible | PASS |
| Denegado sin motivo (JS) | — | — | — | ✅ alert obliga motivo (JS línea 159) | PASS |
| Cambio fármaco warning (JS) | — | — | — | ✅ warning toggle activo (JS línea 43) | PASS |
| Guardar seguimiento (JS) | — | — | — | ✅ success box con Morisky resultado | PASS |
| Export TXT validación | — | — | — | ✅ botón visible y funcional | PASS |

---

## 7. Checklist visual/UX

### A. Coherencia con Hub Reuma
- Barra lateral: ✅ coherente con patrón FH (logo, nav, user block, DB indicator)
- Quick View overlay: ✅ patrón card + backdrop, parecido al search panel Reuma
- Botones, cards, badges, formularios: ✅ lenguaje visual consistente
- Paleta verde SES (#008777): ✅ bien aplicada en header accents, botones primary, badges
- Elementos "pegados" o ajenos: ⚠️ ninguno grave, pero la pantalla de Reuma (index.html) es completamente diferente (splash de carga XLSX vs shell sidebar)

### B. Jerarquía visual
- Punto de inicio claro: ✅ buscador CIP domina correctamente el index
- Demo banners: ✅ visibles pero no excesivos (una línea amber/naranja, no intrusivo)
- Títulos por página: ✅ todos identifican claramente la acción
- Info precargada vs editable: ✅ campos readonly visualmente distintos (fondo tenue)

### C. Formularios
- Validación FH: ✅ se entiende como circuito farmacéutico
- Bloque HS: ✅ aparece cuando se selecciona Hidradenitis en Dermatología
- Campos readonly: ✅ aspecto "precargado" claro
- Desplegables: ✅ comprensibles
- Labels claros: ✅
- Scroll: aceptable (validación con contexto es largo, pero justificado por complejidad)

### D. Quick View / buscador
- Ver tabla de flujos probados arriba: todos PASS

### E. Seguimiento
- Morisky-Green: ✅ visible y con radio buttons intuitivos
- Optimización/suspensión: ✅ presentes en el formulario
- Efectos adversos: ✅ campo visible
- Cambio fármaco warning: ✅ se activa al escribir nuevo fármaco
- Mensaje guardado demo: ✅ success box con Morisky resultado

### F. Validación
- Selector Derma/Reuma: ✅ tabs claros y activos
- Patologías selector: ✅ 5 opciones Derma + 5 Reuma (via JS)
- HS específico: ✅ bloque aparece correctamente
- Estados Pendiente/Validado/Denegado: ✅
- Denegado sin motivo bloquea: ✅ alert obligatorio
- Export TXT: ✅ visible
- Sin sugerencia JARA: ✅ disclaimer explícito en demo banner

### G. Dashboard paciente
- Timeline: ✅ 3 entradas (Solicitud FH, Primera visita, Seguimiento)
- Tratamiento, adherencia, EA, PROMs: ✅ en Resumen Farmacia
- No dashboard poblacional: ✅ claramente individual
- Vista individual comprensible: ✅

### H. Accesibilidad básica
- Contraste: ✅ suficiente. Verde SES sobre blanco supera WCAG AA
- Tamaño de fuente: ✅ legible en todas las resoluciones
- Botones distinguibles: ✅ variantes primary/secondary/outline claras
- aria-hidden en iconos decorativos: ✅
- Focus/inputs: ✅ razonable
- Responsive usable: ✅ mobile/tablet funcional salvo H-01 (botón cierre)

### I. Errores técnicos
- Consola JS: ✅ cero errores (solo 1 warning informativo por página)
- Fuentes: ✅ cargan (Font Awesome 6 CDN + system fonts)
- Iconos: ✅ cargan correctamente
- 404: ✅ ninguno detectado
- Recursos bloqueados: ✅ ninguno
- Scroll horizontal: ✅ no detectado
- Elementos tapados: ✅ ninguno

---

## 8. Capturas generadas

**Directorio:** `/srv/kairos-lab/outbox/reports/farmacia-visual-audit-20260606/screenshots/`  
**Total:** 49 capturas + 12 capturas de flujos demo = 61 archivos PNG

| Categoría | Archivos |
|-----------|---------|
| Páginas base × 4 viewports (9 páginas) | 36 PNG |
| Flujos demo overlay (3 viewports × 4 CIPs) | 12 PNG |
| Páginas con parámetro paciente (desktop) | 4 PNG |
| Páginas con parámetro paciente (mobile) | 2 PNG |
| Capturas adicionales | 7 PNG |

**Capturas más relevantes para Sil/Cora:**
- `flow_fh001_desktop.png` — Quick View FH-001 "En seguimiento"
- `flow_fh002_desktop.png` — Quick View FH-002 "Pendiente"
- `flow_fh003_desktop.png` — Quick View FH-003 "Validado"
- `flow_test_desktop.png` — Alta guiada CIP nuevo
- `validacion_fh002_desktop.png` — Formulario validación con bloque HS cargado
- `seguimiento_fh001_desktop.png` — Seguimiento con datos FH-001 precargados
- `flow_fh001_mobile.png` — Quick View en mobile (ver H-01)
- `farmacia_index_mobile.png` — Index en mobile

---

## 9. Resumen de hallazgos por severidad

| Severidad | Cantidad | IDs |
|-----------|---------|-----|
| P0 bloqueante demo | 0 | — |
| P1 corregir antes del lunes | 1 | H-01 |
| P2 recomendable si da tiempo | 4 | H-02, H-03, H-04, H-05 |
| P3 deuda técnica post-demo | 5 | H-06, H-07, H-08, H-09, H-10 |

---

## 10. Recomendación final para Sil/Cora

**El módulo Farmacia v0.1 está listo para la demo del lunes con un fix.**

Los flujos principales funcionan exactamente según la especificación. El Quick View overlay es claro y profesional. El bloque HS aparece correctamente. La validación bloquea denegado sin motivo. Los datos precargados se distinguen visualmente. La paleta SES es consistente. No hay errores JS ni 404.

**Fix obligatorio antes del lunes:** H-01 (botón cierre overlay invisible en mobile). Riesgo bajo, tiempo estimado: 10 minutos.

**Fixes recomendados si hay tiempo:** H-02 (conteo fármacos, 1 línea) y H-04 (campos vacíos en acceso directo, 5 líneas). Mejoran la percepción sin riesgo.

**No tocar bajo ningún concepto antes del lunes:** H-06, H-07, H-08, H-09, H-10. Ninguno bloquea la demo.

La demo puede centrarse en: buscador CIP → Quick View → acciones por estado → validación con bloque HS → seguimiento con Morisky-Green → dashboard individual. Todos estos flujos pasan perfectamente.

---

*Status: pending_review — Este documento no implica aprobación ni merge. Es documentación informativa para revisión de Sil/Cora.*
