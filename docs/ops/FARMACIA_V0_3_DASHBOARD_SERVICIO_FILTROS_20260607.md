# Farmacia V0.3 — Dashboard de servicio con filtros analíticos

**Fecha:** 2026-06-07
Status: pending_review
**Scope:** Documentación exploratoria únicamente. No implementa filtros en el dashboard ni modifica código de la aplicación. Consulte `docs/ops/FARMACIA_V0_3_MODELO_LONGITUDINAL_20260607.md` para el modelo de datos subyacente.

---

## 1. Objetivo

Definir el catálogo completo de filtros para un futuro dashboard analítico del servicio de Farmacia Hospitalaria, basado en el modelo longitudinal del paciente. Este documento sirve de referencia para una work order de implementación posterior.

---

## 2. Catálogo completo de filtros

| # | Filtro | Fuente (campo) | Disponibilidad actual/demo/futura | Prioridad | Dependencias |
|---|--------|----------------|----------------------------------|-----------|--------------|
| 1 | Servicio de origen | `servicios_origen[]` | ✅ demo (dataset v0.3) | Alta | — |
| 2 | Patología | `patologias[]` | ✅ demo (dataset v0.3) | Alta | — |
| 3 | Estado clínico | `actividad_clinica[].interpretacion` (derivado) | ✅ demo (clasificación por patología) | Alta | Catálogo de estados por patología |
| 4 | Fármaco | `tratamientos[].nombre_comercial` | ✅ demo (dataset v0.3) | Alta | — |
| 5 | Principio activo | `tratamientos[].principio_activo` | ⚠️ futuro (derivable de `farmaco` vía catálogo) | Alta | Catálogo principio activo → fármaco |
| 6 | Dosis | `tratamientos[].presentacion_dosis` | ✅ demo (dataset v0.3) | Media | — |
| 7 | Pauta | `tratamientos[].pauta` | ✅ demo (dataset v0.3) | Media | — |
| 8 | PROM | `proms[].tipo_prom` | ✅ demo (dataset v0.3) | Alta | — |
| 9 | Rango/valor PROM | `proms[].valor` | ✅ demo (dataset v0.3) | Alta | Filtro PROM seleccionado |
| 10 | Comorbilidades | `comorbilidades_relevantes[].nombre` | ⚠️ demo (dataset v0.3, lista estructurada con nombre/tipo/nota) | Media | Normalización de comorbilidades |
| 11 | Eventos adversos | `eventos_adversos[].tipo` | ⚠️ demo (dataset v0.3, lista estructurada con tipo/gravedad/fecha) | Media | Normalización de eventos adversos |
| 12 | Adherencia | `adherencia[].interpretacion` | ✅ demo (dataset v0.3, valores: `Alta`, `Media`, `Baja`) | Alta | — |
| 13 | Sexo | `sexo` | ✅ demo (dataset v0.3) | Alta | — |
| 14 | Edad | `edad` (numérico) | ✅ demo (dataset v0.3) | Alta | — |
| 15 | Estado de validación | `tratamientos[].estado_validacion_farmacia` | ✅ demo (dataset v0.3, ej: `validado`, `pendiente`) | Media | — |
| 16 | Estado de seguimiento | `tratamientos[].activo` o derivación (activo/suspendido según fecha_fin) | ✅ demo (dataset v0.3, ej: `Activo`, `Suspendido`) | Alta | — |

---

## 3. Layout e interacción propuestos

### 3.1 Panel de filtros (sidebar colapsable)

- Columna izquierda (~320px), colapsable mediante botón toggle.
- Secciones agrupadas por categoría:
  - **Paciente:** sexo, edad, estado de validación, estado de seguimiento.
  - **Clínico:** servicio de origen, patología, estado clínico.
  - **Farmacológico:** fármaco, principio activo, dosis, pauta.
  - **Resultados reportados (PROMs):** PROM, rango/valor.
  - **Evolución:** comorbilidades, eventos adversos, adherencia.

### 3.2 Tipo de control por filtro

| Tipo de control | Filtros |
|----------------|---------|
| Select desplegable (single) | Servicio de origen, patología, estado clínico, fármaco, PROM, sexo, estado validación, estado seguimiento, adherencia |
| Select múltiple (tags/chips) | Comorbilidades, eventos adversos |
| Rango (slider numérico dual) | Edad, dosis |
| Autocompletado con búsqueda | Principio activo (futuro) |
| Rango cualitativo | Rango/valor PROM |

### 3.3 Interacción

- Los filtros se aplican en el lado cliente (JS) sobre los datos cargados en memoria.
- Cada cambio en un filtro actualiza inmediatamente:
  - Conteo de pacientes visibles (`N / total`).
  - Tabla de resultados.
  - Resúmenes agregados (mediana edad, distribución por estado, etc.).
- Botón **"Limpiar filtros"** visible solo si hay algún filtro activo.
- Indicador de filtros activos en el header del panel (ej: "3 filtros activos").
- Estado del panel de filtros (colapsado/expandido, valores seleccionados) preservado en sessionStorage para evitar pérdida al recargar.

---

## 4. Riesgos y edge cases

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| Rendimiento con muchos pacientes | Si el dataset crece (>5000 registros), el filtrado cliente puede degradarse | Paginación + filtro combinado; evaluar virtual scrolling |
| Filtros contradictorios | Combinaciones imposibles (ej. mujer + patología prostática) que devuelven 0 resultados | Mostrar mensaje claro "Sin resultados. Revise los filtros aplicados" |
| Valores ausentes (null/undefined) | Algunos registros pueden carecer de ciertos campos | Indicar "No informado" / "Sin dato" como opción de filtro; no excluir registros con null automáticamente |
| Principio activo inconsistente | El dataset no incluye campo separado; requiere catálogo | No implementar hasta tener catálogo cargado |
| Estados clínicos específicos de patología | Un mismo estado puede significar cosas distintas según patología | Prefix visual: `Patología > Estado` |
| Cambio de contexto entre servicios (Reuma ↔ Farmacia) | Los filtros de Farmacia no son intercambiables 1:1 con Reuma | Mantener instancias de filtro independientes por servicio |

---

## 5. Qué NO está implementado en esta WO

- ❌ Código HTML, CSS, JS del panel de filtros.
- ❌ Modificaciones a `farmacia_estadisticas.html` o `scripts/farmacia_estadisticas.js`.
- ❌ Catálogo de principios activos.
- ❌ Normalización de comorbilidades o eventos adversos como listas estructuradas.
- ❌ Integración con el módulo de Reuma.
- ❌ Persistencia de selección de filtros en backend.
- ❌ Filtros por rango de fecha (no contemplado en modelo longitudinal actual).
- ❌ Exportación de datos filtrados.

---

## 6. Próxima WO sugerida

**Título:** Implementar panel de filtros mock/demo para Farmacia
**Descripción:** Sobre `farmacia_estadisticas.html`, añadir panel lateral colapsable con los filtros de prioridad Alta (servicio, patología, estado clínico, fármaco, PROM, rango PROM, adherencia, sexo, edad, estado seguimiento), con lógica cliente-side sobre `farmacia_longitudinal_demo_v0_3.json`. Implementar en rama `work/farmacia-v0-3-post-demo-filtros-mock-YYYYMMDD-HHMM`.
**Criterios de aceptación:**
1. Panel colapsable presente.
2. Los 10 filtros de alta prioridad funcionales en cliente.
3. Conteo de resultados visibles y actualizado en tiempo real.
4. Botón "Limpiar filtros".
5. Sin dependencias externas ni catálogos.
6. Mensaje "Sin resultados" para combinaciones vacías.
7. Estado de filtros preservado en sessionStorage.
