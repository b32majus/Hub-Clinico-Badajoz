# Farmacia Hospitalaria v0.3 — Refinamiento dashboard longitudinal

**Fecha:** 2026-06-07
Status: pending_review
**Tipo:** Documento de refinamiento exploratorio

> ⚠️ Refinamiento sobre el dashboard exploratorio v0.3 implementado en la rama `work/farmacia-v0-3-post-demo-exploratory-20260607`. Datos sintéticos, sin backend, sin validez clínica/productiva. No implica cambios en el modelo conceptual.

---

## 1. Alcance

Dashboard exploratorio v0.3 con datos sintéticos (`farmacia_longitudinal_demo_v0_3.json`), sin backend, sin integración clínica, sin datos reales. Refinamiento sobre el commit inicial `d1082be`.

---

## 2. Cambios implementados

| # | Cambio | Descripción |
|---|---|---|
| T2 | Alineación clases JS/CSS | Consistencia en nomenclatura de clases entre JS y CSS para thresholds, eventos adversos, bandas y leyenda. |
| T3 | Selectores dinámicos | Los `<select>` se poblaban con opciones fijas hardcoded. Ahora se poblan dinámicamente desde los datos del paciente (`populatePromSelect()`, `populateClinicalSelect()`). Si un paciente no tiene datos de una dimensión, el selector muestra aviso y el panel de gráfico muestra "Sin datos disponibles". |
| T4 | Thresholds/leyenda | Panel estructurado con umbrales documentados por escala: DLQI, EVA dolor, EVA prurito, IHS4, Hurley, DAS28, HAQ. Cada escala con sus rangos demo y nota de validez exploratoria. Cada barra de PROM/actividad clínica muestra etiqueta textual del nivel de severidad. |
| T5 | Inline styles → clases CSS | Barras PROM y actividad clínica usan clases (`.threshold-low`, `.threshold-moderate`, `.threshold-high`, `.threshold-severe`, `.threshold-no-data`) en vez de `style.backgroundColor` inline. Íconos de eventos adversos igual (`.event-low`, `.event-moderate`, `.event-high`, `.event-serious`). |
| T6 | Timeline bandas + marcadores | Timeline de tratamientos rediseñada como bandas posicionadas por fecha con estados (activo, suspendido, previo) más marcadores de cambios de pauta y eventos adversos. Incluye tooltips con metadatos. |
| T7 | Eventos adversos | Tarjetas de eventos adversos con bordes izquierdos coloreados por gravedad, badge de severidad y tooltip expandido con todos los campos. |
| T8 | Aviso exploratorio | Banner superior "Farmacia v0.3 exploratoria — datos sintéticos — Status: pending_review" con icono de matraz. Nota en leyenda y en todas las secciones. |
| T10 | Cache busting (postdemo-b) | Assets propios (`farmacia_style.css`, `scripts/farmacia_common.js`, `scripts/farmacia_dashboard_longitudinal.js`) referenciados con query param `v=20260607-postdemo-b` para invalidar caché del navegador tras cambios. |

---

## 3. Archivos tocados

| Archivo | Cambio |
|---|---|
| `farmacia_dashboard_longitudinal.html` | Selectores PROM y actividad clínica pasan de `<option>` fijas a vacíos (poblado dinámico por JS) |
| `farmacia_style.css` | +700 líneas: clases de threshold, eventos adversos, timeline de bandas, leyenda, marcadores, responsive, badges de severidad |
| `scripts/farmacia_dashboard_longitudinal.js` | +300 líneas netas: `parseDate()`, `getSeverityInfo()`, `buildReverseMap()`, `populatePromSelect()`, `populateClinicalSelect()`, timeline de bandas con marcadores, severidad en barras, tooltips expandidos, estados vacíos |
| `docs/ops/FARMACIA_V0_3_MODELO_LONGITUDINAL_20260607.md` | Sin cambios (el modelo conceptual no se modificó) |

---

## 4. Umbrales demo documentados

| Escala | Bajo | Moderado | Alto | Severo |
|--------|------|----------|------|--------|
| DLQI | 0-5 (sin efecto / pequeño) | 6-10 (moderado) | 11-20 (muy importante) | 21-30 (extremadamente importante) |
| EVA dolor | 0-3 | 4-6 | 7-10 | — |
| EVA prurito | 0-3 | 4-6 | 7-10 | — |
| IHS4 | 0-3 (leve) | 4-10 (moderado) | ≥11 (severo) | — |
| Hurley | Estadio I | Estadio II | Estadio III | — (categórico) |
| DAS28 | <2.6 (remisión) | 2.6-3.2 (baja) | >3.2-5.1 (moderada) | >5.1 (alta) |
| HAQ | 0-0.5 | >0.5-1.5 | >1.5 | — |

> Los umbrales son demo/exploratorios. No validados clínicamente. No substituyen criterio facultativo.

---

## 5. Limitaciones y riesgos residuales

- **Sin persistencia de datos:** El dataset JSON se carga vía fetch del JSON demo en cada inicialización. No hay persistencia en `sessionStorage` ni `localStorage`. En una recarga del navegador se pierde el estado.
- **Sin validación de datos:** Los valores JSON se asumen correctos. No hay barreras contra datos malformados o fuera de rango.
- **Sin testing automatizado:** El JS no tiene tests. La refactorización de clases CSS se verificó visualmente.
- **Sin manejo de errores de carga:** Si el JSON no se carga o está mal formado, la UI se queda en estado indeterminado.
- **Hurley como escala numérica:** El modelo trata Hurley como valor numérico (1, 2, 3) para las barras, pero clínicamente es categórico. La interpretación lo refleja en etiqueta.
- **Un solo paciente a la vez:** No hay vista comparativa ni agregada multi-paciente.
- **Sin manejo de solapamiento de tratamientos:** Si dos tratamientos solapan en fechas, las bandas se superponen.
- **Escalas PROM sin tabla de referencia externa:** Las interpretaciones en el JSON demo son texto libre; el dashboard no normaliza contra tablas de referencia.

---

## 6. Validaciones esperadas

| Validación | Estado |
|---|---|
| Smoke test visual (carga de página, selección de paciente, renderizado de secciones) | Pendiente de navegador |
| Sin errores JS en consola del navegador | Pendiente de navegador |
| Sin uso de `innerHTML` (solo `textContent` + DOM API) | ✅ Confirmado |
| Sin CDNs nuevos (solo Font Awesome 6.0.0-beta3 ya presente) | ✅ Confirmado |
| Sin datos reales de pacientes (CIPs demo `CIP-DEMO-FH-*`) | ✅ Confirmado |
| Sin cambios en `main` ni ramas protegidas | ✅ Confirmado |
| Sin tocar JS/HTML/CSS de Reuma | ✅ Confirmado |
| Sin modificar dataset JSON (el demo permanece idéntico) | ✅ Confirmado |

---

## 7. Resumen de arquitectura del refinamiento

```
farmacia_dashboard_longitudinal.html
  └── <select id="longitudinalPromSelect">      ← poblado dinámicamente (T8)
  └── <select id="longitudinalClinicalSelect">   ← poblado dinámicamente (T8)
  └── <div id="longitudinalTreatmentTimeline">   ← bandas temporales (T6a) + marcadores (T6b)
  └── <div id="longitudinalAdverseEvents">       ← tarjetas con severidad visual (T7)
  └── <div id="longitudinalLegend">              ← panel umbrales refinado (T4b)

farmacia_style.css
  └── .threshold-low/moderate/high/severe/no-data   ← clases para barras (T4a)
  └── .event-low/moderate/high/serious               ← clases para AE icons/markers (T4a)
  └── .longitudinal-ae-card--low/moderate/high/serious ← bordes de tarjetas AE (T7)
  └── .longitudinal-treatment-band--active/suspended/previous ← bandas temporales (T6a)
  └── .longitudinal-timeline-change-marker / .longitudinal-timeline-ae-marker (T6b)
  └── .longitudinal-legend-panel / .longitudinal-legend-row (T4b)

scripts/farmacia_dashboard_longitudinal.js
  └── parseDate()                                  ← parser fecha robusto (T6a)
  └── getSeverityInfo()                             ← severidad con label + cssClass (T5)
  └── buildReverseMap() / PROM_REVERSE / CLINICAL_REVERSE  ← lookup bidireccional (T8)
  └── populatePromSelect() / populateClinicalSelect()      ← selectores dinámicos (T8)
  └── renderTreatmentTimeline()                     ← refactor completo a bandas (T6a)
  └── renderAdverseEvents()                         ← tooltip expandido + severidad (T7)
  └── renderPromChart() / renderClinicalChart()     ← severidad textual en barras (T5)
  └── renderLegend()                    ← panel de umbrales (T4b)
```

---

*Documento generado: T9 — Refinamiento dashboard longitudinal, 2026-06-07. Builder: DeepSeek v4 Flash.*
