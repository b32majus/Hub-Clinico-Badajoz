# Checklist de evaluación funcional PROMueve Farmacia — autónoma

> **ENTORNO DE EVALUACIÓN CON DATOS SINTÉTICOS. NO PILOTO. NO PRODUCCIÓN.**
>
> No escriba datos identificativos ni ejemplos de pacientes reales.

## Cómo rellenarla

Marque cada punto con una opción: **OK**, **INCIDENCIA**, **DUDA** o **NO APLICA**.

Si marca **INCIDENCIA**, indique severidad: **BLOQUEANTE**, **IMPORTANTE**, **MENOR** o **SUGERENCIA**.

| Evaluación | Fecha | Navegador | Comentario general |
|---|---|---|---|
| Datos sintéticos |  |  |  |

## A. Acceso autónomo

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| La URL pública estable abre la Farmacia (Chrome/Chromium) |  |  |  |
| Se ve la identidad de entorno **CÁCERES-REVIEW-0.4** |  |  |  |
| Se ve el aviso permanente **«Datos exclusivamente sintéticos»** (no usar para asistencia real) |  |  |  |
| Las ventanas emergentes para Estadísticas están permitidas |  |  |  |
| La navegación visible inicia desde **Inicio de Farmacia** (superficie canónica) |  |  |  |

## B. Una única fuente de Farmacia

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se carga **un único** workbook (`PROMueve_FH_EVALUATION_FARMACIA.xlsx`) |  |  |  |
| Se reconocen **55 pacientes** al cargar |  |  |  |
| No se pide otro workbook de Farmacia al navegar entre módulos |  |  |  |
| Inicio, Quick View, Dashboard, Longitudinal, Validación, Primera Visita, Seguimiento, Estadísticas y CSV usan la misma cohorte |  |  |  |
| La cohorte cargada llega a Estadísticas |  |  |  |

## C. Enfermería complementaria

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| El loader de Enfermería es visible y separado del de Farmacia |  |  |  |
| El workbook sintético de Enfermería carga |  |  |  |
| Se muestran las solicitudes de Enfermería / Inicio biológico |  |  |  |
| El workbook de Enfermería **no sustituye** los datos explícitos de Farmacia |  |  |  |

## D. Quick View

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Resume lo necesario antes de entrar al paciente |  |  |  |
| Solicitado, validado y tratamiento registrado se distinguen |  |  |  |
| PROMs, `0`, `false` y **No registrado** se muestran con claridad |  |  |  |
| Las acciones de navegación son comprensibles |  |  |  |

## E. Dashboard Paciente

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| El contexto del paciente permanece claro |  |  |  |
| El resumen prioriza información útil |  |  |  |
| Tratamientos, PROMs, adherencia y EA se comprenden |  |  |  |
| Se localiza fácilmente **Vista completa** |  |  |  |

## F. Patient Longitudinal

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Los actos y el acto multifila se comprenden |  |  |  |
| Activo, no activo y no registrado se diferencian |  |  |  |
| Cambios de dosis, pauta y suspensión explícita son claros |  |  |  |
| PROMs y adherencia se entienden en el tiempo |  |  |  |
| EA, actualizaciones y causalidad explícita son claros |  |  |  |
| Las ausencias no parecen hechos negativos confirmados |  |  |  |

## G. Validación

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se distingue tratamiento solicitado de tratamiento validado |  |  |  |
| Los campos y su orden siguen el trabajo real |  |  |  |
| Los estados pendientes o no registrados son claros |  |  |  |
| La navegación de entrada y salida es coherente |  |  |  |

## H. Primera Visita

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se distingue tratamiento previo de nuevo inicio |  |  |  |
| La información necesaria está visible y ordenada |  |  |  |
| No parece inferirse dosis, vía o pauta por el fármaco |  |  |  |
| La navegación sigue el flujo esperado |  |  |  |

## I. Seguimiento

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Las líneas y el contexto de seguimiento son claros |  |  |  |
| PROMs, adherencia y EA se recogen sin ambigüedad |  |  |  |
| Cambios y suspensión requieren información explícita |  |  |  |
| Los campos de inserción siguen el trabajo real |  |  |  |

## J. Cambio de paciente

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| La secuencia **A → B → A** mantiene el paciente correcto |  |  |  |
| No aparece información del paciente anterior |  |  |  |

## K. Estadísticas

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| La cohorte de **55 pacientes** cargada llega desde Inicio (misma fuente) |  |  |  |
| Filtros y selección de población son comprensibles |  |  |  |
| KPIs y gráficos son claros y no generan conclusiones no registradas |  |  |  |
| Tabla y paginación permiten revisar la cohorte |  |  |  |
| Se entiende que no es una base poblacional persistida ni un segundo workbook |  |  |  |

## L. CSV

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| La acción de exportación se localiza y se entiende |  |  |  |
| Sin filtros, el CSV contiene 55 pacientes y 37 columnas |  |  |  |
| Con filtros, exporta la cohorte filtrada completa |  |  |  |

## M. Seguridad clínica / interpretación

| Pregunta crítica | Resultado | Severidad | Comentario |
|---|---|---|---|
| ¿Algún dato parece asumido sin estar registrado? |  |  |  |
| ¿Solicitado parece confundirse con validado? |  |  |  |
| ¿Tratamiento previo parece confundirse con nuevo tratamiento? |  |  |  |
| ¿Ausencia parece confundirse con “no”? |  |  |  |
| ¿Un movimiento se interpreta sin estar registrado? |  |  |  |
| ¿Una fecha parece inventada? |  |  |  |
| ¿Un EA parece resuelto sin resolución explícita? |  |  |  |
| ¿Hay umbrales clínicos o interpretaciones que no deberían aplicarse? |  |  |  |
| ¿Se entiende cuándo algo está **No registrado**? |  |  |  |

## N. Utilidad global y demo

| Pregunta de producto | Respuesta |
|---|---|
| ¿Hay pasos innecesarios? |  |
| ¿Falta un dato indispensable? |  |
| ¿Hay información repetida? |  |
| ¿La navegación sigue el flujo real? |  |
| ¿Qué pantalla eliminarías o cambiarías? |  |
| ¿Qué parte aporta más valor? |  |
| ¿Qué parte aporta menos valor? |  |

> **Actividad del servicio permanece demo** y no forma parte de la evaluación de la población raw.

## Registro de incidencias

| Pantalla | Qué intentaba | Qué esperaba | Qué ocurrió | Severidad | ¿Bloquea? | Captura opcional / comentario |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
