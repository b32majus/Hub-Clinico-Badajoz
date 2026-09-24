# Registro vivo de deuda — PROMueve Nexus

**Última actualización:** 2026-09-24
**Estado:** `LIVE / OPERATIVE`
**Ámbito:** deuda transversal de plataforma, Foundation, tooling, deployment y seams Nexus
**Issue origen inicial:** #389

Este documento es el inventario rápido de deuda **aceptada** de PROMueve Nexus. Resume estado, riesgo, condición de cierre y destino; la evidencia detallada permanece en los issues/PRs enlazados. No es backlog de ideas, no convierte findings informacionales en trabajo aprobado y no autoriza implementación por sí mismo.

La deuda específica de Farmacia continúa en [`FARMACIA_DEBT_REGISTER.md`](./FARMACIA_DEBT_REGISTER.md). Cuando una deuda Nexus pase a una WO concreta, se conserva aquí como `OPEN`, `TRANSFERRED` o `RESOLVED` con su referencia.

## Deuda registrada

| ID | Estado | Timing / destino | Origen / evidencia | Riesgo concreto | Criterio de cierre | WO / PR |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXUS-DEBT-001` | OPEN | F1.2 tooling hardening | #389 D1; Promotion Review PR #388 | Los hashes de provenance del manifest se calculan sobre bytes crudos; LF/CRLF puede cambiar el hash del mismo contenido lógico y degradar reproducibilidad entre checkouts. | Canonicalizar el contenido que entra al hash o adoptar/documentar una semántica de bytes demostrablemente reproducible; añadir verificación cruzada. | Pendiente |
| `NEXUS-DEBT-002` | OPEN | Antes de promover manifest/readiness a consumo runtime F3 | #389 D2; Promotion Review PR #388 | Los checkers validan módulos presentes, pero un artefacto manual podría omitir un módulo esperado y pasar la semántica actual. | Manifest debe demostrar completitud respecto al profile y readiness respecto al manifest; negativos plantados prueban omisiones. | Pendiente |
| `NEXUS-DEBT-003` | RESOLVED | Cerrada post Bootstrap 01 | #389 D3 | INDEX/WOS podían quedar stale tras merge de #388. | Estado publicado reconciliado con candidate y merge separados. | #390 / PR #391 → merge `e6309173...` |
| `NEXUS-DEBT-004` | OPEN | F2 hardening / F3 integration cuando el release map sea frontera consumida | #389 D4 | `module-releases.json` no tiene schema propio y `readiness: demonstrated` no transporta evidencia explícita; riesgo de inconsistencia al evolucionar la familia de contratos. | Decidir bajo presión real si necesita schema/evidence pointer y verificarlo; no inventar jerarquía antes de uso. | Pendiente |
| `NEXUS-DEBT-005` | OPEN | Distribuir por WOs futuras; no cleanup amplio | #389 D5 + reviews de #388 | Cobertura/mantenibilidad menor: baseline tooling desactualizado respecto a `ajv`, falta caso booleano `false` en corpus Reuma, comentario de orden incoherente, helper muerto, ROOT inconsistente, newline package, timeout/cuota VM y consola lossy. | Cada subhallazgo queda resuelto, transferido a WO específica o descartado con rationale; no cerrar por barrido oportunista. | Pendiente |

## Reglas de uso

- Todo finding material aceptado de Promotion Review/RDD que deba sobrevivir al cierre de una PR entra aquí o en el registro de módulo correspondiente.
- El issue origen conserva el detalle; este registro mantiene la vista operativa y estable.
- `OPEN` no equivale a prioridad inmediata. El timing se decide por riesgo y dependencia real.
- `BEFORE_PILOT`, `BEFORE_F3` u otra condición de fase significa que no puede olvidarse antes de cruzar esa frontera.
- Una deuda solo pasa a `RESOLVED` con evidencia publicada; si se mueve a otro issue/WO se marca `TRANSFERRED` y se enlaza.
- No mezclar deudas heterogéneas en una WO solo para vaciar el registro.

## Próximo consumo

El siguiente Foundation train debe considerar al menos `NEXUS-DEBT-001` en F1.2 y `NEXUS-DEBT-002` antes de que PlatformContext/Home consuman los contratos de deployment/readiness. `NEXUS-DEBT-004` y los subhallazgos de `NEXUS-DEBT-005` permanecen abiertos salvo que una WO futura los adopte explícitamente.
