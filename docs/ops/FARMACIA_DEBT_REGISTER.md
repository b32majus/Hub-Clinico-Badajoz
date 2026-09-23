# Registro vivo de deuda — PROMueve Farmacia

**Última actualización:** 2026-09-24
**Estado:** vivo / operativo
**Autoridad de producto:** `recovery/farmacia-pr-replay-20260727`
**Último HEAD de producto al crear este registro:** `e058f0d25a1856ace4a8bec63dfca53584e8a9cb` (PR #370)

Este documento registra únicamente **deuda real aceptada y pendiente**, con evidencia concreta. No es un backlog de ideas, no convierte propuestas futuras en decisiones y no sustituye `WORK_ORDER_STATUS.md`. Cuando una deuda se programe, debe tener WO atómica propia; cuando se cierre, se conserva aquí como `RESOLVED` con referencia a la WO/PR.

El documento histórico `DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md` conserva valor histórico, pero no se migra automáticamente: cualquier elemento antiguo debe revalidarse contra el producto vivo antes de incorporarse aquí.

## Deuda abierta

| ID | Estado | Severidad / timing | Origen / evidencia | Riesgo concreto | Criterio de cierre | WO |
| --- | --- | --- | --- | --- | --- | --- |
| `FH-DEBT-001` / R1 `session-storage-imported-clinical-data` | OPEN | P1 antes de piloto; no bloquea demo sintética | RDD PR #370 `review-5a1234b2407e6904`; `scripts/farmacia_common.js` alrededor de `persistImportedDataset` | El Excel importado se serializa en `sessionStorage` para permitir navegación Inicio→Validación. Con datos clínicos reales, el navegador/origen se convierte en una superficie de persistencia que aún no tiene una política de seguridad, retención y borrado aprobada para piloto. | Antes de piloto: definir y aprobar la frontera de persistencia; demostrar ciclo de vida/borrado y mínima exposición. Idealmente el payload clínico no queda en Web Storage, o existe una decisión explícita de seguridad que lo autorice con controles y QA. | Pendiente |
| `FH-DEBT-002` / R2 `v6-sheet-lookup-split-brain` | IMPLEMENTED_IN_CANDIDATE / PENDING_PROMOTION | P2 robustez | RDD PR #370; `scripts/farmacia_common.js` detección v6 normalizada vs lookup físico en `parseWorkbook` | `isEnfermeriaV6Workbook()` reconoce nombres mediante normalización, pero `parseWorkbook()` recupera después las hojas con nombres canónicos exactos (`workbook.Sheets["DERMATOLOGÍA"]`, etc.). Un nombre físico equivalente para el detector puede no ser recuperable por el loader y producir rechazo incoherente. | Resolver una sola vez los nombres físicos reales a las 3 definiciones canónicas y reutilizar ese mapa en detección+parseo; test con variantes soportadas. | Candidate `work/fh-v6-sheet-resolution-native-gentle-20260921` @ `2015897...`; frozen oracle `6dfd365...`; pendiente de PR/promoción |
| `FH-DEBT-003` / R3 `v6-sheet-name-normalization` | IMPLEMENTED_IN_CANDIDATE / PENDING_PROMOTION | P2 robustez | RDD PR #370; `enfermeriaV6Token()` + lookup v6 | La normalización elimina acentos, espacios y puntuación. Es útil, pero puede aceptar aliases demasiado permisivos o hacer ambiguas dos hojas físicas que colapsen al mismo token si no se valida unicidad. | Definir política cerrada de nombres/aliases; exigir exactamente una hoja física por servicio y rechazar aliases duplicados/ambiguos. Añadir tests de acentos, espacios, puntuación y doble alias. | Candidate `work/fh-v6-sheet-resolution-native-gentle-20260921` @ `2015897...`; frozen oracle `6dfd365...`; pendiente de PR/promoción |

## Reglas de uso

- `P0/P1` clínico o de seguridad demostrado se prioriza antes que limpieza estética.
- `BEFORE_PILOT` no significa “arreglar ahora” si el producto sigue en demo; significa que no puede olvidarse antes de cambiar de fase.
- Una finding informacional de RDD solo entra aquí si Cora/Sil la aceptan como deuda material; los comentarios cosméticos se descartan.
- No cerrar una entrada por tests verdes si el criterio funcional/operativo de cierre no está demostrado.
- No mezclar en una misma WO seguridad de datos, robustez del parser y arquitectura futura salvo que una causa única lo justifique.

## Siguiente lote recomendado

El siguiente paso para `FH-DEBT-002` + `FH-DEBT-003` es revisar/promover el candidate ya implementado `2015897...`; no reimplementar la misma solución desde cero. `FH-DEBT-001` requiere una decisión de persistencia/seguridad alineada con el entorno real de piloto y debe cerrarse antes de declarar el producto apto para piloto.
