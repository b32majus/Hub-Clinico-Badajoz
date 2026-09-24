# ADR-005 — Contratos de escritura y semántica del acto

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Contexto

Export v2 separa parte del transporte, pero el `event` actual no contiene siempre todo el acto y algunas invariantes viven en adapters. `commit(event)` como API pública consolidaría ambigüedades.

## Decisión

La UI invoca **casos de uso específicos** por intención profesional. Validación, Primera Visita y Seguimiento son independientes; no existe una cadena automática entre ellas.

El caso de uso:

```text
entrada
→ estructura válida
→ contexto/autoridad válidos
→ invariantes clínicas válidas
→ acto completo conforme al contrato y autorizado para la operación
→ delivery compartido
→ resultado verificable
```

No usar `Validated PharmacyAct` para conformidad técnica.

## Acto completo

El envelope técnico puede compartir campos mínimos (`contractVersion`, `actId/revision`, `kind`, `siteId`, `patientRef`, tiempos, actor/assurance, provenance, amendment). El payload pertenece al dominio/tipo de acto e incluye líneas cuando correspondan.

La fila 152/497 es proyección posterior, no dominio.

## Resultado de operación

Vocabulario conceptual inicial:

- `prepared_for_transfer`;
- `persisted`;
- `already_recorded`;
- `conflict`;
- `rejected`;
- `outcome_unknown`.

`persisted` siempre especifica destino y garantía. Correcciones crean revisión explícita con referencia/motivo; no sobrescriben silenciosamente.

## Idempotencia

Identidad del acto y clave de intento/reintento son conceptos distintos. El caso de uso conserva identidad; cada destino aplica garantías compatibles con su capability.

## Alternativas rechazadas

- `commit(event)` público genérico;
- `guardarFilaExcel()` como intención de aplicación;
- evento clínico universal entre módulos;
- doble escritura a varios destinos durante migración.

## No decide

DTO/schema/firma exactos ni flujo UI de amendments: `CONTRACT_PENDING`.

## Reabrir si

Un segundo destino o un nuevo tipo de acto demuestra que la separación intención→acto→delivery no es suficiente.
