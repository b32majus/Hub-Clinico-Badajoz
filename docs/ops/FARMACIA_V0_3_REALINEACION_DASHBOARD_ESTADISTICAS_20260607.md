# Farmacia V0.3 — Realineación dashboard estadísticas

**Fecha:** 2026-06-07
**Status:** pending_review
**Tipo:** Documento de decisión y realineación
**Referencia:** Demo 2026-06-07, post-exploratorio longitudinal

---

## 1. Error conceptual detectado

Durante el desarrollo exploratorio v0.3 se identificó un error de diseño en la organización de los dashboards de Farmacia:

| Problema | Descripción |
|----------|-------------|
| **Longitudinal como página independiente** | Se creó `farmacia_dashboard_longitudinal.html` como página separada con su propio selector de paciente y carga de datos, duplicando lógica y rompiendo la navegación del hub. |
| **Estadísticas como pantalla operativa** | `farmacia_estadisticas.html` se diseñó originalmente con indicadores de actividad (pendientes, realizadas) solapándose con `farmacia_actividad_servicio.html`. |
| **Duplicación de carga de datos** | El JS de `farmacia_dashboard_longitudinal.js` cargaba su propio JSON (`farmacia_longitudinal_demo_v0_3.json`) en vez de consumir los datos ya disponibles desde `farmacia_dashboard_paciente.html`. |

---

## 2. Decisión corregida

| Ámbito | Decisión |
|--------|----------|
| **Evolución longitudinal** | Se integra DENTRO de `farmacia_dashboard_paciente.html` como sección adicional ("Evolución longitudinal del paciente"), no como página independiente. El dashboard paciente pasa de 3 a 4 secciones: Resumen, Timeline, Actividad clínica/Índices, PROMs. |
| **Actividad del servicio** = operativa | `farmacia_actividad_servicio.html` muestra tareas pendientes, validaciones recientes, seguimientos del día, fármacos frecuentes. Es la vista operativa del servicio. |
| **Estadísticas del servicio** = análisis poblacional | `farmacia_estadisticas.html` se realinea como dashboard analítico poblacional: filtros, distribuciones (edad, sexo, patología, fármaco, adherencia), tabla de pacientes filtrados, indicadores agregados. No incluye tareas operativas. |
| **Carga de datos** | Toda la carga recae en `farmacia_common.js` (vía `initFarmaciaData()`). Los JS específicos de cada página consultan datos ya cargados. `farmacia_dashboard_longitudinal.html` se elimina como punto de entrada independiente. |
| **Sidebar** | Se elimina el enlace a "Dashboard Longitudinal" como página separada. La sección longitudinal vive dentro del dashboard paciente. |

---

## 3. Filtros implementados en estadísticas del servicio

Los siguientes filtros poblacionales se implementaron en `farmacia_estadisticas.html`:

| # | Filtro | Tipo | Fuente de datos |
|---|--------|------|-----------------|
| 1 | Servicio de origen | Select múltiple | `servicios_origen[]` |
| 2 | Patología | Select múltiple | `patologias[]` |
| 3 | Sexo | Select | `sexo` |
| 4 | Rango de edad | Rango dual (min-max) | `edad` |
| 5 | Estado de adherencia | Select | `adherencia[].interpretacion` |
| 6 | Estado de seguimiento | Select | `tratamientos[].activo` |
| 7 | Estado de validación | Select | `tratamientos[].estado_validacion_farmacia` |
| 8 | Fármaco | Select múltiple | `tratamientos[].nombre_comercial` |
| 9 | PROM | Select múltiple | `proms[].tipo_prom` |
| 10 | Rango/valor PROM | Rango dual | `proms[].valor` |
| 11 | Comorbilidades | Select múltiple | `comorbilidades_relevantes[].nombre` |
| 12 | Eventos adversos | Select múltiple | `eventos_adversos[].tipo` |

Los filtros se aplican en el lado cliente sobre `farmacia_longitudinal_demo_v0_3.json`. Cada combinación de filtros actualiza el conteo de pacientes, la tabla y los gráficos.

---

## 4. Gráficos implementados (10)

| # | Gráfico | Tipo | Descripción |
|---|---------|------|-------------|
| 1 | Distribución por sexo | Doughnut | Proporción hombres/mujeres en la cohorte filtrada |
| 2 | Distribución por grupo de edad | Barra vertical | Grupos: <30, 30-45, 46-60, 61-75, >75 |
| 3 | Distribución por patología | Barra horizontal | Pacientes por patología (top 10) |
| 4 | Distribución por servicio de origen | Barra horizontal | Pacientes por servicio derivador |
| 5 | Distribución por estado de adherencia | Doughnut | Alta / Media / Baja / Sin dato |
| 6 | Distribución por estado de validación | Doughnut | Validado / Pendiente / Denegado / Sin dato |
| 7 | Top 10 fármacos prescritos | Barra horizontal | Fármacos más frecuentes en la cohorte |
| 8 | Distribución por estado de seguimiento | Doughnut | Activo / Suspendido |
| 9 | Distribución de PROMs (DLQI) | Barra vertical | Mediana + distribución por rango de severidad |
| 10 | Distribución de PROMs (EVA dolor) | Barra vertical | Mediana + distribución por rango de severidad |

---

## 5. Limitaciones

- **Datos sintéticos:** Todos los indicadores se basan en `farmacia_longitudinal_demo_v0_3.json`. Sin validez clínica.
- **Sin backend:** Los filtros y cálculos son 100% cliente-side. No hay persistencia de selecciones.
- **Rendimiento:** Sin paginación virtual ni lazy loading. Cohorte demo pequeña (<100 pacientes), no testeado con cargas reales (>1000).
- **PROMs limitados:** Solo DLQI y EVA dolor/prurito tienen representación gráfica. Otros PROMs del dataset (ej. DAS28, HAQ) no tienen gráfico específico.
- **Sin cruce de filtros avanzado:** Las combinaciones de filtros pueden producir resultados vacíos sin sugerencias de ajuste.
- **Sin exportación de gráficos:** Los gráficos Chart.js no tienen botón de exportación a PNG/CSV.
- **Comorbilidades y eventos adversos como texto libre parcial:** Algunos valores están normalizados, otros no. El filtro puede no capturar todas las variantes.
- **Sin integración Reuma:** Los datos de la cohorte de Reumatología no están disponibles en el contexto de Farmacia.

---

## 6. Próximos pasos

| # | Acción | Prioridad | Estado |
|---|--------|-----------|--------|
| 1 | Cerrar `farmacia_dashboard_longitudinal.html` como punto de entrada (redirigir o eliminar) | Alta | Pendiente |
| 2 | Unificar carga de datos longitudinales desde `farmacia_common.js` | Alta | Pendiente |
| 3 | Eliminar dependencia de carga JSON propia en `farmacia_dashboard_longitudinal.js` | Alta | Pendiente |
| 4 | Agregar exportación CSV de datos filtrados en estadísticas | Media | Pendiente |
| 5 | Agregar exportación PNG de gráficos | Media | Pendiente |
| 6 | Evaluar rendimiento con dataset de 500+ pacientes | Media | Pendiente |
| 7 | Documentar contrato de datos para estadísticas poblacionales | Media | Pendiente |
| 8 | Implementar persistencia de filtros en sessionStorage | Baja | Pendiente |
| 9 | Integrar catálogo de principios activos como filtro | Baja | Pendiente |
| 10 | Evaluar Chart.js plugin para tooltips avanzados | Baja | Pendiente |

---

*Documento generado: Realineación dashboard estadísticas v0.3, 2026-06-07. Builder: DeepSeek v4 Flash.*
