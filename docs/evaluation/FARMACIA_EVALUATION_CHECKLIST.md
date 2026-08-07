# Checklist de evaluación funcional PROMueve Farmacia

> **ENTORNO DE EVALUACIÓN CON DATOS SINTÉTICOS. NO PILOTO. NO PRODUCCIÓN.**
>
> No escriba datos identificativos ni ejemplos de pacientes reales.

## Cómo rellenarla

Marque cada punto con una opción: **OK**, **INCIDENCIA**, **DUDA** o **NO APLICA**.

Si marca **INCIDENCIA**, indique severidad: **BLOQUEANTE**, **IMPORTANTE**, **MENOR** o **SUGERENCIA**.

| Evaluación | Fecha | Navegador | Comentario general |
|---|---|---|---|
| Datos sintéticos |  |  |  |

## A. Inicio / carga Excel / búsqueda CIP

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se entiende qué Excel cargar y dónde |  |  |  |
| La confirmación de carga es clara |  |  |  |
| La búsqueda por CIP resulta sencilla |  |  |  |
| El paciente encontrado queda identificado sin ambigüedad |  |  |  |

## B. Quick View

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Resume lo necesario antes de entrar al paciente |  |  |  |
| Solicitado, validado y tratamiento registrado se distinguen |  |  |  |
| PROMs, `0`, `false` y **No registrado** se muestran con claridad |  |  |  |
| Las acciones de navegación son comprensibles |  |  |  |

## C. Dashboard Paciente

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| El contexto del paciente permanece claro |  |  |  |
| El resumen prioriza información útil |  |  |  |
| Tratamientos, PROMs, adherencia y EA se comprenden |  |  |  |
| Se localiza fácilmente **Vista completa** |  |  |  |

## D. Patient Longitudinal

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Los actos y el acto multifila se comprenden |  |  |  |
| Activo, no activo y no registrado se distinguen |  |  |  |
| Cambios de dosis, pauta y suspensión explícita son claros |  |  |  |
| PROMs y adherencia se entienden en el tiempo |  |  |  |
| EA, actualizaciones y causalidad explícita son claros |  |  |  |
| Las ausencias no parecen hechos negativos confirmados |  |  |  |

## E. Validación

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se distingue tratamiento solicitado de tratamiento validado |  |  |  |
| Los campos y su orden siguen el trabajo real |  |  |  |
| Los estados pendientes o no registrados son claros |  |  |  |
| La navegación de entrada y salida es coherente |  |  |  |

## F. Primera Visita

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se distingue tratamiento previo de nuevo inicio |  |  |  |
| La información necesaria está visible y bien ordenada |  |  |  |
| No parece inferirse dosis, vía o pauta por el fármaco |  |  |  |
| La navegación sigue el flujo esperado |  |  |  |

## G. Seguimiento

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Las líneas y el contexto de seguimiento son claros |  |  |  |
| PROMs, adherencia y EA se recogen sin ambigüedad |  |  |  |
| Cambios y suspensión requieren información explícita |  |  |  |
| Los campos y su orden siguen el trabajo real |  |  |  |

## H. Cambio de paciente

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| La secuencia A → B → A mantiene el paciente correcto |  |  |  |
| No aparecen datos del paciente anterior |  |  |  |
| El cambio y cualquier aviso sobre borradores se entienden |  |  |  |

## I. Estadísticas

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| Se reconoce la cohorte de 55 pacientes sintéticos cargada desde Excel |  |  |  |
| Filtros y selección de población son comprensibles |  |  |  |
| KPIs y gráficos son claros y no inducen conclusiones no registradas |  |  |  |
| Tabla y paginación permiten revisar la cohorte |  |  |  |
| Se entiende que no es una base poblacional persistida |  |  |  |

## J. CSV

| Comprobación | Resultado | Severidad | Comentario |
|---|---|---|---|
| La acción de exportación se localiza y se entiende |  |  |  |
| Sin filtros, el CSV contiene 55 pacientes y 37 columnas |  |  |  |
| Con filtros, exporta toda la cohorte filtrada y no solo la página |  |  |  |

## K. Seguridad clínica / interpretación

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

## L. Utilidad global

| Pregunta de producto | Respuesta |
|---|---|
| ¿Hay pasos innecesarios? |  |
| ¿Falta un dato imprescindible? |  |
| ¿Hay información repetida? |  |
| ¿La navegación sigue el flujo real? |  |
| ¿Qué pantalla eliminarías o cambiarías? |  |
| ¿Qué parte aporta más valor? |  |
| ¿Qué parte aporta menos valor? |  |
| ¿Qué necesitarías antes de piloto? |  |

## Registro de incidencias

| Pantalla | Qué intentaba hacer | Qué esperaba | Qué ocurrió | Severidad | ¿Bloquea? | Captura opcional / comentario |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
