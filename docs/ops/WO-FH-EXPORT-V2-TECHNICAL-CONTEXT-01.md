# WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01

## Estado

Implementada en BUILD mode sobre `work/fh-export-v2-technical-context-01-20260804`, con base/HEAD verificado `dfbbf76b8cf97be976e35c5df4c765b7db0a60dd`.

## Entrega

- Proveedor aislado de contexto técnico v2 con registro sintético cerrado y API mínima versionada.
- Contextos estables para Validation, First Visit y Follow-up (FH-001 y FH-004).
- Ámbitos de identidad explícitos: `patientId` estable entre actos del mismo paciente; `treatmentId` y `lineId` estables entre eventos de la misma línea; `rowKey` e IDs de acto específicos de cada evento. First Visit y Follow-up FH-001 comparten `treatment-syn-v2-fh001-l1` y `BIO-FH-001-L1`.
- Wrappers internos fail-closed sobre los bridges existentes.
- Errores tipados `V2_CONTEXT_PROVIDER_UNAVAILABLE`, `V2_CONTEXT_UNAVAILABLE`, `V2_CONTEXT_INCOMPLETE`, `V2_CONTEXT_STALE` y `V2_ADAPTER_UNAVAILABLE`; el bridge directo de Follow-up conserva `BRIDGE_ADAPTER_UNAVAILABLE` y sus errores de CIP/línea.
- Checker contractual Node y QA conjunta Chromium con servidor efímero.
- Sin botón, descarga o salida pública v2; JARA, CSV y Excel v1 permanecen fuera del proveedor.

## Límites respetados

No se modifican core, schemas, adapters, ledger, storage, catálogos, CIMA, dashboard, JARA, CSV ni Excel v1. No se añaden dependencias ni rutas de navegación. Los únicos cambios pertenecen al manifest exacto de la WO.

## Reversión

Eliminar `scripts/farmacia_export_v2_context.js`, los wrappers añadidos a los tres controladores, los tres tags del proveedor, los dos checks y la documentación de esta WO. Restaurar también las dos líneas preexistentes de invocación/guard de adapter: el `throw new Error("FarmaciaExportV2ValidationAdapter no disponible")` de Validation y la invocación directa `window.FarmaciaExportV2FirstVisitAdapter.buildFirstVisitProjection(...)` de First Visit. No requiere cambios en adapters/core/v1 y deja intacto el `BRIDGE_ADAPTER_UNAVAILABLE` preexistente de Follow-up.
