# Seguimiento de implementación Farmacia post-PR50

Status: current_delta_followup

## 1. Propósito y fuente

Este documento registra únicamente el delta publicado después de la reconciliación técnica + criterio Sil conservada en [`FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md). No repite la auditoría ni reabre hallazgos ya concluyentes.

- Rama publicada: `preview/demo-lunes-wo4-20260614`.
- HEAD verificado: `7f7b7331bb89a3a7e70e450c5ee2621ed2cdb762`.
- Baseline documental anterior: PR #47, merge `2286029ad731fb80cc77222d841f4d11483d5542`.
- Cambio funcional posterior: PR #49, merge `e1e1b77c4d3c631600dd349e84a33eb009e655f8`.
- Cobertura posterior: PR #50, merge `7f7b7331bb89a3a7e70e450c5ee2621ed2cdb762`.
- Issue de cobertura #41: cerrado como completado el 2026-07-19.

## 2. Delta funcional publicado

### FH-R08 — Inicio y bandejas

Estado: `resuelto en alcance mínimo de demo` por PR #49.

La pantalla de Inicio dispone de dos bandejas persistentes y excluyentes:

1. `Solicitudes Enfermería / Inicio biológico`, agrupada únicamente por estados prebiológicos explícitos: lista para validación, vigilancia, bloqueo o pendiente de clasificación.
2. `Solicitudes generales pendientes de validación`, limitada a solicitudes pendientes que no proceden de Enfermería.

PR #49 incorpora contadores, estados vacíos, clasificación neutral de valores desconocidos y guardas frente a duplicación por rerender/importación. Solo el estado explícito listo para Farmacia ofrece acceso a Validación.

Una bandeja general vacía no constituye por sí sola un defecto: es el resultado esperado cuando el dataset importado no contiene solicitudes no-Enfermería pendientes explícitas. Esta corrección no acredita persistencia, integración institucional ni piloto real.

### FH-R06 — Frontera Validación / Seguimiento

Estado funcional: se mantiene `resuelto en alcance mínimo de demo` por PR #40.

PR #50 no modifica producción. Añade un harness conductual que cubre la compatibilidad histórica del payload y verifica que:

- registrar una línea previa o existente no crea solicitud, validación, switch ni add-on;
- los movimientos históricos siguen siendo legibles sin transformarse;
- el catálogo no sobrescribe dosis, presentación, vía o pauta manuales;
- histórico, concomitante y exposición siguen disponibles para el selector de sospechoso;
- la lectura no crea registros clínicos nuevos.

La cobertura usa VM con DOM simulado. No equivale a QA manual visible en navegador, validación clínica, persistencia real ni aptitud para piloto.

## 3. Estado actual de los hallazgos prioritarios

| Hallazgo | Estado publicado post-PR50 | Evidencia | Límite vigente |
|---|---|---|---|
| FH-R05 multifármaco/líneas | `pendiente` | Ningún PR hasta #50 introduce un contrato estructurado y gobernado por línea para Validación y Seguimiento. | No modelar switch, add-on, renovación, estado o salida por línea sin contrato humano explícito. |
| FH-R06 frontera Validación/Seguimiento | `resuelto en alcance mínimo de demo`, con cobertura histórica añadida | PR #40 + PR #50. | No equivale a contrato clínico definitivo ni piloto. |
| FH-R07 ordenación dashboard | `resuelto defensivamente` | PR #38. | No cierra el contrato longitudinal ni acredita QA visual completa. |
| FH-R08 bandejas Inicio | `resuelto en alcance mínimo de demo` | PR #49, harness 21/21 y smoke 48/48. | Dos bandejas demo, sin persistencia ni integración real. |
| FH-R09–FH-R11 | `parcialmente resueltos` | Estado conservado de la auditoría previa; PR #49 solo añade claridad semántica acotada en Inicio. | Copy transversal, contratos de opciones e identidades gobernadas siguen fuera de cierre. |
| FH-R12–FH-R14 | `diferidos / no implementados` | Sin cambio funcional por PR #49 o #50. | Backend, permisos, PROMs dinámicos, Lifecycle y producto futuro requieren decisiones separadas. |

## 4. Siguiente bloque funcional

El siguiente bloque funcional relevante es FH-R05: `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01`.

Antes de implementar deben cerrarse explícitamente, como mínimo:

- identidad estable de cada línea;
- diferencia entre acto, tratamiento y movimiento;
- campos mínimos por línea;
- estados admitidos y quién los declara;
- semántica de tratamiento previo, switch y add-on;
- representación y exportación sin inferencias;
- persistencia/restauración esperada en demo frente a piloto.

## 5. Límites y no autorización

La preview continúa siendo una superficie de demo supervisada. Este seguimiento no autoriza piloto, producción, datos reales, backend, Supabase, JARA automático, Control Plane, nuevas reglas clínicas, inferencia terapéutica ni ejecución automática de FH-R05.
