# WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01 — reporte de implementación

## Resultado implementado

- Adaptador puro de Validación v2 `1.0.0-draft.1` sobre el core `2.0.0-draft.1`.
- Evento y proyección de una fila, sin generación de contexto técnico y con solicitud/validación separadas.
- Reglas de resultado, relación terapéutica, estado de línea y metadatos exactos.
- Builder DOM interno, sin cutover, botón ni descarga v2.
- Acción explícita y confirmada para copiar exactamente solicitado a validado.
- Motivos pendiente/denegación separados e inducciones inicialmente no informadas.
- Observaciones estructuradas de Dermatología y tratamientos relacionados 1:N.
- Checker contractual focal y actualización de checks afectados.

## Corrección contractual Cora del candidate congelado

Sobre el candidate previo `DIFF_SHA256 072abdd093437a77cbef65d15b78ac0cc579c09192a8b6224dcdb406e0740b64` se incorporó la corrección solicitada para cerrar la matriz `result × validatedTreatmentRelation × validatedTreatment × IDs × lineCreationStatus`:

- Solo `drugName|activeIngredient` no vacíos identifican un tratamiento; dosis, pauta o metadatos aislados no bastan.
- `validated` queda limitado a `same_as_requested|modified_from_requested`, con ambos snapshots identificables; `same` exige igualdad contractual completa y `modified` una diferencia explícita.
- `denied` exige `no_treatment_validated`; `pending`, `null` y `not_recorded` solo admiten relación ausente/`not_recorded`. Todos esos estados prohíben tratamiento validado, IDs validados y creación/actualización de línea.
- `created|updated`, solo bajo `validated`, exigen ambos IDs; los estados sin creación siguen permitidos sin IDs.
- El checker cubre explícitamente combinaciones válidas e inválidas de cada fila de la matriz, incluida la no-identificación por dosis/metadatos.

Esta sección registra una **corrección derivada de la revisión Cora**. No afirma revisión final, conformidad `APTO` ni promoción del candidate; quedan pendientes de la evidencia de ejecución y de la revisión final correspondiente.

## Límites deliberados

- No se modifica el core, schemas, contrato de 152 columnas ni Excel v1 de 61 columnas.
- No se persiste ni publica una exportación v2; la integración solo expone builders internos.
- No se generan IDs, timestamps, estados de línea ni códigos terminológicos.
- No se crean estructuras clínicas para Reumatología o Digestivo.
- No se incluyen datos reales; fixtures y ejemplos son sintéticos.

## QA

Los comandos y resultados exactos se registran en el reporte de cierre de la ejecución. Este documento describe la implementación y no sustituye la evidencia de ejecución.

## Rollback funcional

La unidad puede retirarse eliminando el adaptador/check/contrato, sus dos `<script>` internos y los builders/controles v2 añadidos a `farmacia_validacion.js` y `farmacia_validacion.html`, sin tocar el core ni las salidas públicas v1.
